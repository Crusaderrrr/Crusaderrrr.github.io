import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../app.js';
import { COOKIE, newInviteCode } from '../auth.js';
import { migrate, type Sql } from '../db.js';
import { tempSchema } from '../test-db.js';

let sql: Sql;
let drop: () => Promise<void>;
let app: ReturnType<typeof createApp>;
let ann: string;

beforeAll(async () => {
  ({ sql, drop } = await tempSchema());
  await migrate(sql);
  app = createApp(sql, '.');
  const code = newInviteCode();
  await sql`INSERT INTO invite (code) VALUES (${code})`;
  const res = await app.request('/api/auth/signup', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '10.2.2.2' },
    body: JSON.stringify({ username: 'ann', password: 'a-long-enough-password', invite: code }),
  });
  ann = `${COOKIE}=${res.headers.get('set-cookie')?.match(new RegExp(`${COOKIE}=([^;]*)`))?.[1]}`;
});
afterAll(() => drop());

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- test helper, JSON of any shape
type Json = any;
async function call(method: string, path: string, body?: unknown): Promise<{ status: number; json: Json }> {
  const res = await app.request(path, {
    method,
    headers: { 'content-type': 'application/json', cookie: ann },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, json: await res.json().catch(() => null) };
}

const backup = (over: Record<string, unknown> = {}) => ({
  defaultRestSeconds: 180,
  exercises: [
    { name: 'barbell bench press', muscleGroup: 'chest', equipment: 'barbell', isCustom: 0, archived: 0, restSeconds: 150, restCustom: 1, favorite: 1, image: null, hasGrip: 0, isCardio: 0 },
    { name: 'Zercher Squat', muscleGroup: 'legs', equipment: 'barbell', isCustom: 1, archived: 0, restSeconds: 120, restCustom: 0, favorite: 0, image: null, hasGrip: 0, isCardio: 0 },
  ],
  workouts: [
    {
      id: 7,
      title: 'Evening Workout',
      date: '2026-10-23',
      startedAt: '2026-10-23T16:57:54.439Z',
      finishedAt: '2026-10-23T17:34:56.537Z',
      notes: null,
      restEndsAt: null,
      exercises: [
        {
          id: 3,
          exerciseName: 'zercher squat', // matched case-insensitively
          position: 0,
          grip: null,
          note: null,
          sets: [{ id: 11, position: 0, setType: 'normal', weightKg: 60, reps: 5, speedKmh: null, inclinePct: null, completed: 1, autoFill: 0 }],
        },
      ],
    },
  ],
  plan: [{ effectiveFrom: '2026-10-22', weekdays: [1, 3, 5] }],
  skips: [{ date: '2026-10-22', reason: 'tired', note: null }],
  ...over,
});

describe('POST /api/import', () => {
  it('needs a login', async () => {
    const res = await app.request('/api/import', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
    expect(res.status).toBe(401);
  });

  it('imports settings, exercises, workouts, plan and skips', async () => {
    const { status, json } = await call('POST', '/api/import', backup());
    expect(status).toBe(200);
    expect(json).toMatchObject({ workouts: 1, exercisesCreated: 1, plans: 1, skips: 1, skippedActive: 0 });

    expect((await call('GET', '/api/settings')).json.defaultRestSeconds).toBe(180);
    const exercises = (await call('GET', '/api/exercises')).json;
    const bench = exercises.find((e: { name: string }) => e.name === 'Barbell Bench Press');
    expect(bench).toMatchObject({ favorite: 1, restSeconds: 150, restCustom: 1 });
    expect(exercises.find((e: { name: string }) => e.name === 'Zercher Squat')).toMatchObject({ isCustom: 1 });
    expect((await call('GET', '/api/history')).json).toHaveLength(1);
    expect((await call('GET', '/api/plan')).json).toEqual([{ effectiveFrom: '2026-10-22', weekdays: [1, 3, 5] }]);
    expect((await call('GET', '/api/skips?from=2026-10-01&to=2026-10-31')).json).toHaveLength(1);
  });

  it('importing the same file again replaces rather than duplicates', async () => {
    await call('POST', '/api/import', backup());
    expect((await call('GET', '/api/history')).json).toHaveLength(1);
    const sets = await sql`SELECT count(*)::int AS n FROM workout_set`;
    expect(sets[0]!.n).toBe(1);
  });

  it('rejects an exercise it cannot find, leaving nothing half imported', async () => {
    const bad = backup();
    (bad.workouts as { exercises: { exerciseName: string }[] }[])[0]!.exercises[0]!.exerciseName = 'No Such Lift';
    bad.defaultRestSeconds = 30;
    const { status } = await call('POST', '/api/import', bad);
    expect(status).toBe(400);
    expect((await call('GET', '/api/settings')).json.defaultRestSeconds).toBe(180);
  });

  it('keeps the account’s own unfinished workout and skips the backup’s', async () => {
    const mine = crypto.randomUUID();
    await call('PUT', `/api/workouts/${mine}`, {
      id: mine, title: 'Now', date: '2026-10-25', startedAt: '2026-10-25T10:00:00.000Z', finishedAt: null,
      notes: null, restEndsAt: null, exercises: [],
    });
    const b = backup();
    (b.workouts as Json[]).push({ ...(b.workouts as Json[])[0], id: 8, finishedAt: null });
    const { json } = await call('POST', '/api/import', b);
    expect(json).toMatchObject({ workouts: 1, skippedActive: 1 });
    expect((await call('GET', '/api/workouts/active')).json.workout.id).toBe(mine);
  });
});
