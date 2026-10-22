import type { Request, Response, Row, SqlParam, Statement } from './protocol';

export type { Row, SqlParam, Statement };

const worker = new Worker(new URL('./db.worker.ts', import.meta.url), { type: 'module' });
const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
let nextId = 1;

let resolveReady: () => void;
let rejectReady: (e: Error) => void;
/** Resolves once the DB is open and migrated; rejects if it can't be opened (e.g. open elsewhere). */
export const dbReady = new Promise<void>((res, rej) => {
  resolveReady = res;
  rejectReady = rej;
});

worker.onmessage = ({ data }: MessageEvent<Response>) => {
  if (data.id === 0) {
    if (data.ok) resolveReady();
    else rejectReady(new Error(data.error));
    return;
  }
  const p = pending.get(data.id);
  pending.delete(data.id);
  if (data.ok) p?.resolve(data.result);
  else p?.reject(new Error(data.error));
};

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

function send<T>(req: DistributiveOmit<Request, 'id'>): Promise<T> {
  const id = nextId++;
  return new Promise<T>((resolve, reject) => {
    pending.set(id, { resolve: resolve as (v: unknown) => void, reject });
    worker.postMessage({ ...req, id });
  });
}

export function query<T = Row>(sql: string, bind?: SqlParam[]): Promise<T[]> {
  return send<T[]>({ type: 'query', sql, bind });
}

/** Runs all statements in one transaction; returns each statement's rows. */
export function batch(statements: Statement[]): Promise<Row[][]> {
  return send<Row[][]>({ type: 'batch', statements });
}
