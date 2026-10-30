import webpush from 'web-push';
import type { Sql } from './db.js';

// Rest-timer notifications that arrive while the app is closed or the phone is locked: the app can't
// run a timer in the background (iOS suspends it), so the server sends a Web Push at `rest_ends_at`.

type Vapid = { publicKey: string; privateKey: string };
type Target = { endpoint: string; p256dh: string; auth: string };
/** Delivers one payload; a rejection with statusCode 404/410 means the subscription is gone. */
export type Send = (to: Target, payload: string, vapid: Vapid) => Promise<unknown>;

const PAYLOAD = JSON.stringify({ title: "Time's up!", body: 'Rest is over — back to it.' });
/** A notification that arrives late is worse than none (phone was off); the push service drops it after this. */
const TTL_SECONDS = 120;
/** setTimeout holds a timer per active rest; nothing legitimate is scheduled further out than this. */
const MAX_DELAY_MS = 2 * 60 * 60_000;

const sendWebPush: Send = (to, payload, vapid) =>
  webpush.sendNotification({ endpoint: to.endpoint, keys: { p256dh: to.p256dh, auth: to.auth } }, payload, {
    // Apple's push service wants a real-looking contact; set VAPID_SUBJECT to your own (mailto: or https:).
    vapidDetails: { subject: process.env.VAPID_SUBJECT ?? 'mailto:ttp@example.com', ...vapid },
    TTL: TTL_SECONDS,
    urgency: 'high',
  });

/**
 * Only real browser push services. The endpoint comes from the client and the server POSTs to it,
 * so anything else would let an account make the server call arbitrary URLs.
 */
const PUSH_HOST = /(^|\.)(push\.apple\.com|googleapis\.com|push\.services\.mozilla\.com|notify\.windows\.com)$/;
export function isPushEndpoint(endpoint: string): boolean {
  try {
    const u = new URL(endpoint);
    return u.protocol === 'https:' && PUSH_HOST.test(u.hostname);
  } catch {
    return false;
  }
}

export type Push = ReturnType<typeof createPush>;

// ponytail: timers live in this process, so one server instance only; rehydrate() restores them after a restart.
export function createPush(sql: Sql, send: Send = sendWebPush) {
  let vapid: Promise<Vapid> | undefined;
  const timers = new Map<string, NodeJS.Timeout>();

  async function loadVapid(): Promise<Vapid> {
    const read = async () => {
      const [row] = await sql<{ public_key: string; private_key: string }[]>`
        SELECT public_key, private_key FROM push_key WHERE id = 1`;
      return row && { publicKey: row.public_key, privateKey: row.private_key };
    };
    const existing = await read();
    if (existing) return existing;
    const k = webpush.generateVAPIDKeys();
    // Two servers starting at once: the first insert wins, both then read the same pair.
    await sql`INSERT INTO push_key (id, public_key, private_key) VALUES (1, ${k.publicKey}, ${k.privateKey})
              ON CONFLICT (id) DO NOTHING`;
    return (await read())!;
  }
  const keys = () => (vapid ??= loadVapid().catch((e) => ((vapid = undefined), Promise.reject(e))));

  async function fire(workoutId: string) {
    timers.delete(workoutId);
    try {
      // The workout may have been finished or the rest cleared since this was scheduled.
      const [w] = await sql<{ user_id: string }[]>`
        SELECT user_id FROM workout WHERE id = ${workoutId} AND finished_at IS NULL AND rest_ends_at IS NOT NULL`;
      if (!w) return;
      const targets = await sql<Target[]>`
        SELECT endpoint, p256dh, auth FROM push_subscription WHERE user_id = ${w.user_id}`;
      const k = await keys();
      await Promise.all(
        targets.map(async (t) => {
          try {
            await send(t, PAYLOAD, k);
          } catch (e) {
            const status = (e as { statusCode?: number }).statusCode;
            if (status === 404 || status === 410) await sql`DELETE FROM push_subscription WHERE endpoint = ${t.endpoint}`;
            else console.error('push failed', status ?? e);
          }
        }),
      );
    } catch (e) {
      console.error('push failed', e);
    }
  }

  /** (Re)schedules the "time's up" push for a workout's rest; null (or a time already past) cancels it. */
  function schedule(workoutId: string, endsAt: Date | null) {
    clearTimeout(timers.get(workoutId));
    timers.delete(workoutId);
    const delay = endsAt ? endsAt.getTime() - Date.now() : 0;
    if (delay <= 0 || delay > MAX_DELAY_MS) return;
    timers.set(workoutId, setTimeout(() => void fire(workoutId), delay).unref());
  }

  return {
    publicKey: async () => (await keys()).publicKey,
    schedule,

    /** After a restart: picks up rests that are still running. */
    async rehydrate() {
      const rows = await sql<{ id: string; rest_ends_at: Date }[]>`
        SELECT id, rest_ends_at FROM workout WHERE finished_at IS NULL AND rest_ends_at > now()`;
      for (const r of rows) schedule(r.id, r.rest_ends_at);
    },
  };
}
