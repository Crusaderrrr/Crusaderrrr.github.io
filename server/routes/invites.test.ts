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

const json = (path: string, body: unknown, cookie?: string) =>
  app.request(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body),
  });
const signup = async (username: string, code: string) => {
  const res = await json('/api/auth/signup', { username, password: 'a-long-enough-password', invite: code });
  const token = res.headers.get('set-cookie')?.match(new RegExp(`${COOKIE}=([^;]*)`))?.[1];
  return { res, cookie: `${COOKIE}=${token}` };
};
const seedInvite = async () => {
  const code = newInviteCode();
  await sql`INSERT INTO invite (code) VALUES (${code})`;
  return code;
};

describe('POST /api/invites', () => {
  it('first account is the owner and can mint codes that others can sign up with; later accounts cannot', async () => {
    const owner = await signup('owner', await seedInvite());
    expect(((await owner.res.json()) as { user: { isAdmin: boolean } }).user.isAdmin).toBe(true);

    const minted = await json('/api/invites', {}, owner.cookie);
    expect(minted.status).toBe(201);
    const { code } = (await minted.json()) as { code: string };
    expect(code).toMatch(/^[A-HJKMNP-Z2-9]{12}$/);

    const friend = await signup('friend', code);
    expect(friend.res.status).toBe(201);
    expect(((await friend.res.json()) as { user: { isAdmin: boolean } }).user.isAdmin).toBe(false);

    expect((await json('/api/invites', {}, friend.cookie)).status).toBe(403);
  });

  it('requires login', async () => {
    expect((await json('/api/invites', {})).status).toBe(401);
  });
});
