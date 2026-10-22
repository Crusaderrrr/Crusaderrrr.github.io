import { batch, query } from '../db/client';

/** Counts app launches; Phase 0's proof that writes survive a full app close. */
export async function recordLaunch(): Promise<void> {
  await batch([
    {
      sql: `INSERT INTO meta (key, value) VALUES ('first_launch_at', ?) ON CONFLICT DO NOTHING`,
      bind: [new Date().toISOString()],
    },
    {
      sql: `INSERT INTO meta (key, value) VALUES ('launch_count', '1')
            ON CONFLICT (key) DO UPDATE SET value = CAST(value AS INTEGER) + 1`,
    },
  ]);
}

export async function getMeta(): Promise<Record<string, string>> {
  const rows = await query<{ key: string; value: string }>('SELECT key, value FROM meta');
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

export async function countExercises(): Promise<number> {
  const [row] = await query<{ n: number }>('SELECT COUNT(*) AS n FROM exercise');
  return row?.n ?? 0;
}
