import { createHash, randomBytes, randomInt } from 'node:crypto';
import type { HttpBindings } from '@hono/node-server';
import { hash, verify } from '@node-rs/argon2';
import type { Context, MiddlewareHandler } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import type { Sql } from './db.js';

export type User = { id: number; username: string };
export type AuthEnv = { Bindings: HttpBindings; Variables: { user: User } };

export const COOKIE = 'ttp_session';
const SESSION_DAYS = 30;

// ---- passwords (argon2id is the library default) ----

export const hashPassword = (password: string): Promise<string> => hash(password);

let dummyHash: Promise<string> | undefined;
/** Verifies against a throwaway hash for unknown users, so "no such user" costs the same as "wrong password". */
export async function verifyPassword(stored: string | undefined, password: string): Promise<boolean> {
  dummyHash ??= hash('timing-equaliser');
  const ok = await verify(stored ?? (await dummyHash), password).catch(() => false);
  return stored !== undefined && ok;
}

// ---- invite codes ----

// No I / L / O / 0 / 1, so a code read off a screen or message can't be mistyped.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function newInviteCode(): string {
  return Array.from({ length: 12 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');
}
/** Codes are stored as 12 bare characters; users may type them lower-case with dashes or spaces. */
export const normalizeInvite = (s: string): string => s.toUpperCase().replace(/[^A-Z0-9]/g, '');
export const formatInvite = (code: string): string => code.match(/.{4}/g)?.join('-') ?? code;

// ---- sessions ----

const sha256 = (s: string) => createHash('sha256').update(s).digest();

export async function createSession(sql: Sql, userId: number): Promise<string> {
  const token = randomBytes(32).toString('base64url');
  // Housekeeping here is enough; logins are rare and this keeps the table small without a timer.
  await sql`DELETE FROM session WHERE expires_at < now()`;
  await sql`INSERT INTO session (token_hash, user_id, expires_at)
            VALUES (${sha256(token)}, ${userId}, now() + make_interval(days => ${SESSION_DAYS}))`;
  return token;
}

export const deleteSession = (sql: Sql, token: string) => sql`DELETE FROM session WHERE token_hash = ${sha256(token)}`;

export function setSessionCookie(c: Context, token: string) {
  setCookie(c, COOKIE, token, { httpOnly: true, secure: true, sameSite: 'Lax', path: '/', maxAge: SESSION_DAYS * 86400 });
}
export const clearSessionCookie = (c: Context) => deleteCookie(c, COOKIE, { path: '/', secure: true });

/** Sets `user` when the cookie holds a live session; slides the 30-day expiry (at most once a day). */
export const sessionMiddleware = (sql: Sql): MiddlewareHandler<AuthEnv> => async (c, next) => {
  const token = getCookie(c, COOKIE);
  if (token) {
    const h = sha256(token);
    const rows = await sql<{ id: string; username: string }[]>`
      SELECT u.id, u.username FROM session s JOIN app_user u ON u.id = s.user_id
      WHERE s.token_hash = ${h} AND s.expires_at > now()`;
    const row = rows[0];
    if (row) {
      c.set('user', { id: Number(row.id), username: row.username });
      const slid = await sql`
        UPDATE session SET expires_at = now() + make_interval(days => ${SESSION_DAYS})
        WHERE token_hash = ${h} AND expires_at < now() + make_interval(days => ${SESSION_DAYS - 1})`;
      if (slid.count) setSessionCookie(c, token);
    }
  }
  await next();
};

export const requireUser: MiddlewareHandler<AuthEnv> = async (c, next) => {
  if (!c.get('user')) return c.json({ error: 'unauthorized', message: 'Please log in.' }, 401);
  await next();
};

// ---- rate limiting ----

/** In-memory sliding window. ponytail: resets on restart and isn't shared across processes; fine for one container. */
export function createLimiter(max: number, windowMs: number, now: () => number = Date.now) {
  const hits = new Map<string, number[]>();
  return {
    /** Records an attempt; false once `max` attempts fall inside the window. */
    attempt(key: string): boolean {
      const t = now();
      if (hits.size > 10_000) for (const k of hits.keys()) if (!hits.get(k)?.some((h) => h > t - windowMs)) hits.delete(k);
      const recent = (hits.get(key) ?? []).filter((h) => h > t - windowMs);
      if (recent.length >= max) {
        hits.set(key, recent);
        return false;
      }
      hits.set(key, [...recent, t]);
      return true;
    },
    reset: (key: string) => void hits.delete(key),
  };
}

/** Behind Tailscale Funnel every socket is the local proxy; its appended X-Forwarded-For entry is the real client. */
export function clientIp(c: Context<AuthEnv>): string {
  const xff = c.req.header('x-forwarded-for');
  if (xff) return xff.split(',').at(-1)?.trim() || 'unknown';
  return c.env?.incoming?.socket.remoteAddress ?? 'unknown';
}
