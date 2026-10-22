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

/** Fired on window after every write, so mounted screens can re-query (see useDbQuery). */
export const DB_CHANGE = 'db-change';

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

async function send<T>(req: DistributiveOmit<Request, 'id'>, writes: boolean): Promise<T> {
  const id = nextId++;
  const result = await new Promise<T>((resolve, reject) => {
    pending.set(id, { resolve: resolve as (v: unknown) => void, reject });
    worker.postMessage({ ...req, id });
  });
  if (writes) window.dispatchEvent(new Event(DB_CHANGE));
  return result;
}

const isRead = (sql: string) => /^\s*(SELECT|WITH|PRAGMA)\b/i.test(sql);

export function query<T = Row>(sql: string, bind?: SqlParam[]): Promise<T[]> {
  return send<T[]>({ type: 'query', sql, bind }, !isRead(sql));
}

/** Runs all statements in one transaction; returns each statement's rows. */
export function batch(statements: Statement[]): Promise<Row[][]> {
  return send<Row[][]>({ type: 'batch', statements }, true);
}

export function exportDb(): Promise<Uint8Array> {
  return send<Uint8Array>({ type: 'export' }, false);
}

/** Replaces the whole database (validated, then migrated forward in the worker). */
export function importDb(bytes: Uint8Array): Promise<void> {
  return send<void>({ type: 'import', bytes }, true);
}
