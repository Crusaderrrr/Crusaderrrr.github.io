import { Hono } from 'hono';
import { newInviteCode, requireAdmin, requireUser, sessionMiddleware, type AuthEnv } from '../auth.js';
import type { Sql } from '../db.js';

export function inviteRoutes(sql: Sql): Hono<AuthEnv> {
  const app = new Hono<AuthEnv>();
  app.use(sessionMiddleware(sql), requireUser, requireAdmin);

  // Owner-only: mints one single-use code (shown to the owner as a sign-up link by the client).
  app.post('/', async (c) => {
    const code = newInviteCode();
    await sql`INSERT INTO invite (code) VALUES (${code})`;
    return c.json({ code }, 201);
  });

  return app;
}
