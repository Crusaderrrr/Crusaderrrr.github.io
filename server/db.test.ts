import { mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { migrate, type Sql } from './db.js';
import { tempSchema } from './test-db.js';

let sql: Sql;
let drop: () => Promise<void>;
beforeEach(async () => ({ sql, drop } = await tempSchema()));
afterEach(() => drop());

describe('migrate', () => {
  it('applies the real migrations once and is idempotent', async () => {
    expect(await migrate(sql)).toEqual(['001_init.sql', '002_admin.sql', '003_data.sql', '004_grip_sets.sql']);
    expect(await migrate(sql)).toEqual([]);
    const rows = await sql<{ n: string }[]>`SELECT count(*) AS n FROM app_user`;
    expect(rows[0]?.n).toBe('0');
  });

  it('enforces case-insensitive usernames', async () => {
    await migrate(sql);
    await sql`INSERT INTO app_user (username, password_hash) VALUES ('Nikita', 'x')`;
    await expect(sql`INSERT INTO app_user (username, password_hash) VALUES ('nikita', 'x')`).rejects.toThrow();
  });

  it('applies new files in name order and rolls everything back on failure', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'ttp-mig-'));
    await writeFile(path.join(dir, '002_b.sql'), 'CREATE TABLE b (id int);');
    await writeFile(path.join(dir, '001_a.sql'), 'CREATE TABLE a (id int);');
    expect(await migrate(sql, dir)).toEqual(['001_a.sql', '002_b.sql']);

    await writeFile(path.join(dir, '003_c.sql'), 'CREATE TABLE c (id int); SELECT broken;');
    await expect(migrate(sql, dir)).rejects.toThrow();
    const rows = await sql`SELECT to_regclass('c') AS c`;
    expect(rows[0]?.c).toBeNull();
  });
});
