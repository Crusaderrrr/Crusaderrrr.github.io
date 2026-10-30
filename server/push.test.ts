import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { migrate, type Sql } from './db.js';
import { createPush, isPushEndpoint, type Push, type Send } from './push.js';
import { tempSchema } from './test-db.js';

let sql: Sql;
let drop: () => Promise<void>;
let sent: { endpoint: string; payload: string }[];
let failWith: number | undefined;
let push: Push;
let uid: number;
const APPLE = 'https://web.push.apple.com/abc';

const send: Send = async (to, payload) => {
  if (failWith) throw Object.assign(new Error('gone'), { statusCode: failWith });
  sent.push({ endpoint: to.endpoint, payload });
};
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const inMs = (ms: number) => new Date(Date.now() + ms);

async function workout(restEndsAt: Date | null = null) {
  const id = randomUUID();
  await sql`INSERT INTO workout (id, user_id, title, date, started_at, rest_ends_at)
            VALUES (${id}, ${uid}, 'W', '2026-10-30', now(), ${restEndsAt})`;
  return id;
}

beforeEach(async () => {
  ({ sql, drop } = await tempSchema());
  await migrate(sql);
  const [user] = await sql<{ id: number }[]>`INSERT INTO app_user (username, password_hash) VALUES ('ann', 'x') RETURNING id`;
  uid = user!.id;
  await sql`INSERT INTO push_subscription (endpoint, user_id, p256dh, auth) VALUES (${APPLE}, ${uid}, 'k', 'a')`;
  sent = [];
  failWith = undefined;
  push = createPush(sql, send);
});
afterEach(() => drop());

describe('rest-timer push', () => {
  it("sends one \"Time's up\" push to the user's devices when the rest ends", async () => {
    const id = await workout(inMs(60));
    push.schedule(id, inMs(60));
    await wait(30);
    expect(sent).toHaveLength(0);
    await wait(150);
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ endpoint: APPLE });
    expect(JSON.parse(sent[0]!.payload)).toMatchObject({ title: "Time's up!" });
  });

  it('rescheduling replaces the earlier push; null cancels it', async () => {
    const id = await workout(inMs(60));
    push.schedule(id, inMs(60));
    push.schedule(id, inMs(200));
    await wait(120);
    expect(sent).toHaveLength(0);
    await wait(200);
    expect(sent).toHaveLength(1);

    push.schedule(id, inMs(40));
    push.schedule(id, null);
    await wait(120);
    expect(sent).toHaveLength(1);
  });

  it('stays quiet when the workout was finished or the rest cleared in the meantime', async () => {
    const id = await workout(inMs(50));
    push.schedule(id, inMs(50));
    await sql`UPDATE workout SET finished_at = now() WHERE id = ${id}`;
    await wait(150);
    expect(sent).toHaveLength(0);

    await sql`UPDATE workout SET finished_at = NULL, rest_ends_at = NULL WHERE id = ${id}`;
    push.schedule(id, inMs(50));
    await wait(150);
    expect(sent).toHaveLength(0);
  });

  it('ignores a rest that already ended, and removes subscriptions the push service reports gone', async () => {
    const id = await workout(inMs(-1000));
    push.schedule(id, inMs(-1000));
    await wait(50);
    expect(sent).toHaveLength(0);

    failWith = 410;
    push.schedule(id, inMs(30));
    await sql`UPDATE workout SET rest_ends_at = now() + interval '1 minute' WHERE id = ${id}`;
    await wait(150);
    expect(await sql`SELECT 1 FROM push_subscription`).toHaveLength(0);
  });

  it('rehydrate restores running rests after a restart', async () => {
    await workout(inMs(80));
    await push.rehydrate();
    await wait(250);
    expect(sent).toHaveLength(1);
  });

  it('only accepts real browser push services as endpoints', () => {
    expect(isPushEndpoint(APPLE)).toBe(true);
    expect(isPushEndpoint('https://fcm.googleapis.com/fcm/send/x')).toBe(true);
    expect(isPushEndpoint('https://updates.push.services.mozilla.com/wpush/v2/x')).toBe(true);
    expect(isPushEndpoint('https://127.0.0.1/x')).toBe(false);
    expect(isPushEndpoint('http://web.push.apple.com/x')).toBe(false);
    expect(isPushEndpoint('https://web.push.apple.com.evil.example/x')).toBe(false);
    expect(isPushEndpoint('not a url')).toBe(false);
  });

  it('generates the VAPID key pair once and keeps it', async () => {
    const key = await push.publicKey();
    expect(key.length).toBeGreaterThan(40);
    expect(await createPush(sql, send).publicKey()).toBe(key);
  });
});
