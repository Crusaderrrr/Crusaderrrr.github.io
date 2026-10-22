// Messages between db/client.ts and db/db.worker.ts.
export type SqlParam = string | number | null;
export type Row = Record<string, SqlParam>;
export type Statement = { sql: string; bind?: SqlParam[] };

export type Request =
  | ({ id: number; type: 'query' } & Statement)
  | { id: number; type: 'batch'; statements: Statement[] }
  | { id: number; type: 'export' }
  | { id: number; type: 'import'; bytes: Uint8Array };

// id 0 is reserved for the worker's init result.
export type Response =
  | { id: number; ok: true; result?: unknown }
  | { id: number; ok: false; error: string };
