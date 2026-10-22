import sqlite3InitModule, { type BindingSpec, type Database } from '@sqlite.org/sqlite-wasm';
import { migrations } from './migrations';
import type { Request, Response, Statement } from './protocol';

let db: Database;

function migrate() {
  const version = Number(db.selectValue('PRAGMA user_version'));
  for (let v = version; v < migrations.length; v++) {
    db.transaction(() => {
      db.exec(migrations[v]!);
      db.exec(`PRAGMA user_version = ${v + 1}`);
    });
  }
}

function run({ sql, bind }: Statement) {
  return db.exec({ sql, bind: bind as BindingSpec, rowMode: 'object', returnValue: 'resultRows' });
}

const ready = (async () => {
  const sqlite3 = await sqlite3InitModule();
  // Pool name and file name are bound to stored data — never rename (SPEC §2).
  const pool = await sqlite3.installOpfsSAHPoolVfs({ name: 'ttp' });
  db = new pool.OpfsSAHPoolDb('/ttp.sqlite3');
  db.exec('PRAGMA foreign_keys = ON');
  migrate();
})();

ready.then(
  () => postMessage({ id: 0, ok: true } satisfies Response),
  (e: unknown) => postMessage({ id: 0, ok: false, error: String(e) } satisfies Response),
);

onmessage = async ({ data: req }: MessageEvent<Request>) => {
  let res: Response;
  try {
    await ready;
    switch (req.type) {
      case 'query':
        res = { id: req.id, ok: true, result: run(req) };
        break;
      case 'batch':
        res = { id: req.id, ok: true, result: db.transaction(() => req.statements.map(run)) };
        break;
    }
  } catch (e) {
    res = { id: req.id, ok: false, error: String(e) };
  }
  postMessage(res);
};
