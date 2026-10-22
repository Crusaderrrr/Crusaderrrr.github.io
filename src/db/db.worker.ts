import sqlite3InitModule, { type BindingSpec, type Database, type SAHPoolUtil } from '@sqlite.org/sqlite-wasm';
import { migrations } from './migrations';
import type { Request, Response, Statement } from './protocol';

// Pool name and file name are bound to stored data — never rename (SPEC §2).
const DB_FILE = '/ttp.sqlite3';

let pool: SAHPoolUtil;
let db: Database;

function open() {
  db = new pool.OpfsSAHPoolDb(DB_FILE);
  db.exec('PRAGMA foreign_keys = ON');
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

/** Rejects anything that isn't a SQLite file from this app, at this or an older schema version. */
function validateBackup(bytes: Uint8Array) {
  const header = new TextDecoder().decode(bytes.subarray(0, 16));
  if (header !== 'SQLite format 3\0') throw new Error('Not a SQLite database file.');
  const version = new DataView(bytes.buffer, bytes.byteOffset).getUint32(60); // user_version
  if (version < 1) throw new Error('This file is not a TTP backup.');
  if (version > migrations.length) throw new Error('Backup is from a newer app version — update the app first.');
}

async function importDb(bytes: Uint8Array) {
  validateBackup(bytes);
  db.close();
  try {
    await pool.importDb(DB_FILE, bytes);
  } finally {
    open(); // reopen (and migrate forward) whatever is on disk now
  }
}

// preserveOnInitFailure is critical: by default a failed install (e.g. the app still open
// elsewhere, or an old instance still shutting down) calls removeVfs(), which DELETES the
// whole pool directory — i.e. all data. forceReinitIfPreviouslyFailed lets us retry, since
// sqlite-wasm otherwise caches the failure. (A plain variable, as the typings lack that key.)
const POOL_OPTIONS = { name: 'ttp', preserveOnInitFailure: true, forceReinitIfPreviouslyFailed: true };
const INSTALL_ATTEMPTS = 6;

const ready = (async () => {
  const sqlite3 = await sqlite3InitModule();
  // A previous instance (e.g. after iOS relaunches the app) may still hold the file handles
  // for a moment; retry before reporting "open elsewhere".
  for (let attempt = 1; ; attempt++) {
    try {
      pool = await sqlite3.installOpfsSAHPoolVfs(POOL_OPTIONS);
      break;
    } catch (e) {
      if (attempt === INSTALL_ATTEMPTS) throw e;
      await new Promise((r) => setTimeout(r, 300 * attempt));
    }
  }
  open();
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
      case 'export':
        res = { id: req.id, ok: true, result: pool.exportFile(DB_FILE) };
        break;
      case 'import':
        await importDb(req.bytes);
        res = { id: req.id, ok: true };
        break;
    }
  } catch (e) {
    res = { id: req.id, ok: false, error: e instanceof Error ? e.message : String(e) };
  }
  postMessage(res);
};
