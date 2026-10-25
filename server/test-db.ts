import { randomBytes } from 'node:crypto';
import { connect, type Sql } from './db.js';

// Start with `npm run db:dev`; CI provides a Postgres service and sets TEST_DATABASE_URL.
const URL = process.env.TEST_DATABASE_URL ?? 'postgres://ttp:ttp@127.0.0.1:5433/ttp';

/** A connection confined to a throwaway schema, so tests never touch real data and can run in parallel. */
export async function tempSchema(): Promise<{ sql: Sql; drop: () => Promise<void> }> {
  const schema = `test_${randomBytes(6).toString('hex')}`;
  const admin = connect(URL, { max: 1 });
  await admin.unsafe(`CREATE SCHEMA ${schema}`);
  const sql = connect(URL, { connection: { search_path: schema } });
  return {
    sql,
    drop: async () => {
      await sql.end();
      await admin.unsafe(`DROP SCHEMA ${schema} CASCADE`);
      await admin.end();
    },
  };
}
