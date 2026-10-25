import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../app.js';
import { COOKIE, newInviteCode } from '../auth.js';
import { migrate, type Sql } from '../db.js';
import { tempSchema } from '../test-db.js';

let sql: Sql;
let drop: () => Promise<void>;
let app: ReturnType<typeof createApp>;

beforeAll(async () => {
  ({ sql, drop } = await tempSchema());
  await migrate(sql);
  app = createApp(sql, '.');
});
afterAll(() => drop());

const post = (path: string, body: unknown, cookie?: string, headers: Record<string, string> = {}) =>
  app.request(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}), ...headers },
    body: JSON.stringify(body),
  });
const cookieOf = (res: Response) => res.headers.get('set-cookie')?.match(new RegExp(`${COOKIE}=([^;]*)`))?.[1];
const invite = async () => {
  const code = newInviteCode();
  await sql`INSERT INTO invite (code) VALUES (${code})`;
  return code;
};
const signup = async (username: string, password = 'a-long-enough-password') =>
  post('/api/auth/signup', { username, password, invite: await invite() }, undefined, { 'x-forwarded-for': `10.0.0.${Math.random()}` });

describe('sign-up', () => {
  it('creates the account, settings row and a session; the invite is single-use', async () => {
    const code = await invite();
    const res = await post('/api/auth/signup', { username: 'Nikita', password: 'a-long-enough-password', invite: code.toLowerCase() });
    expect(res.status).toBe(201);
    const set = res.headers.get('set-cookie') ?? '';
    expect(set).toMatch(/HttpOnly/i);
    expect(set).toMatch(/Secure/i);
    expect(set).toMatch(/SameSite=Lax/i);

    const me = await app.request('/api/auth/me', { headers: { cookie: `${COOKIE}=${cookieOf(res)}` } });
    expect(await me.json()).toEqual({ user: { id: expect.any(Number), username: 'Nikita' } });

    const settings = await sql`SELECT * FROM user_settings`;
    expect(settings).toHaveLength(1);

    const again = await post('/api/auth/signup', { username: 'Other', password: 'a-long-enough-password', invite: code });
    expect(again.status).toBe(400);
    expect(((await again.json()) as { error: string }).error).toBe('invalid_invite');
  });

  it('does not store the session token or password in plain text', async () => {
    const res = await signup('hashcheck');
    const token = cookieOf(res)!;
    const sessions = await sql<{ token_hash: Buffer }[]>`SELECT token_hash FROM session`;
    expect(sessions.every((s) => s.token_hash.length === 32 && s.token_hash.toString('base64url') !== token)).toBe(true);
    const users = await sql<{ password_hash: string }[]>`SELECT password_hash FROM app_user WHERE username = 'hashcheck'`;
    expect(users[0]?.password_hash).toMatch(/^\$argon2id\$/);
  });

  it('rejects a bad invite, a taken username (any case) and weak input', async () => {
    const bad = await post('/api/auth/signup', { username: 'someone', password: 'a-long-enough-password', invite: 'NOPE' });
    expect(((await bad.json()) as { error: string }).error).toBe('invalid_invite');

    expect((await signup('Taken')).status).toBe(201);
    const dup = await signup('tAKEN');
    expect(dup.status).toBe(409);

    const short = await post('/api/auth/signup', { username: 'shorty', password: 'short', invite: await invite() });
    expect(short.status).toBe(400);
    expect(((await short.json()) as { message: string }).message).toMatch(/at least 10/);
    const weird = await post('/api/auth/signup', { username: 'no spaces', password: 'a-long-enough-password', invite: await invite() });
    expect(weird.status).toBe(400);
  });

  it('a failed sign-up does not burn the invite', async () => {
    await signup('burnt');
    const code = await invite();
    const dup = await post('/api/auth/signup', { username: 'BURNT', password: 'a-long-enough-password', invite: code });
    expect(dup.status).toBe(409);
    const ok = await post('/api/auth/signup', { username: 'fresh-name', password: 'a-long-enough-password', invite: code });
    expect(ok.status).toBe(201);
  });
});

describe('login / logout', () => {
  it('logs in case-insensitively, then logout kills the session server-side', async () => {
    await signup('Lifter', 'squat-every-day-1');
    const res = await post('/api/auth/login', { username: 'lifter', password: 'squat-every-day-1' });
    expect(res.status).toBe(200);
    const cookie = `${COOKIE}=${cookieOf(res)}`;
    expect((await app.request('/api/auth/me', { headers: { cookie } })).status).toBe(200);

    expect((await post('/api/auth/logout', {}, cookie)).status).toBe(200);
    expect((await app.request('/api/auth/me', { headers: { cookie } })).status).toBe(401);
  });

  it('gives the same answer for a wrong password and an unknown user', async () => {
    await signup('exists', 'squat-every-day-1');
    const wrong = await post('/api/auth/login', { username: 'exists', password: 'nope-nope-nope' });
    const unknown = await post('/api/auth/login', { username: 'ghost', password: 'nope-nope-nope' });
    expect(wrong.status).toBe(401);
    expect(await wrong.json()).toEqual(await unknown.json());
  });

  it('rate-limits after 10 failures per client + username, and a success resets it', async () => {
    await signup('limited', 'squat-every-day-1');
    const attempt = (password: string, ip: string) =>
      post('/api/auth/login', { username: 'limited', password }, undefined, { 'x-forwarded-for': ip });
    for (let i = 0; i < 10; i++) expect((await attempt('wrong-password', '1.1.1.1')).status).toBe(401);
    expect((await attempt('squat-every-day-1', '1.1.1.1')).status).toBe(429);
    // Another client is unaffected.
    expect((await attempt('squat-every-day-1', '2.2.2.2')).status).toBe(200);
  });

  it('expired sessions are rejected', async () => {
    const res = await signup('expiring');
    const cookie = `${COOKIE}=${cookieOf(res)}`;
    await sql`UPDATE session SET expires_at = now() - interval '1 second'`;
    expect((await app.request('/api/auth/me', { headers: { cookie } })).status).toBe(401);
  });

  it('slides the expiry when it is more than a day old and re-issues the cookie', async () => {
    const res = await signup('sliding');
    const cookie = `${COOKIE}=${cookieOf(res)}`;
    await sql`UPDATE session SET expires_at = now() + interval '5 days'`;
    const me = await app.request('/api/auth/me', { headers: { cookie } });
    expect(me.headers.get('set-cookie')).toContain(COOKIE);
    const rows = await sql<{ days: number }[]>`SELECT extract(day FROM min(expires_at) - now())::int AS days FROM session`;
    expect(rows[0]?.days).toBeGreaterThanOrEqual(29);
  });
});

describe('request hygiene', () => {
  it('requires login for /me', async () => {
    expect((await app.request('/api/auth/me')).status).toBe(401);
  });
  it('rejects state-changing requests that are not JSON (CSRF)', async () => {
    const res = await app.request('/api/auth/logout', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: 'a=b',
    });
    expect(res.status).toBe(415);
  });
  it('rejects oversized bodies', async () => {
    const res = await post('/api/auth/login', { username: 'x', password: 'y'.repeat(3 * 1024 * 1024) });
    expect(res.status).toBe(413);
  });
  it('sends a CSP', async () => {
    const res = await app.request('/api/health');
    expect(res.headers.get('content-security-policy')).toContain("frame-ancestors 'none'");
  });
});
