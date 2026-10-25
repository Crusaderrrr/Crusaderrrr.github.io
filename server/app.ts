import path from 'node:path';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { secureHeaders } from 'hono/secure-headers';
import type { Sql } from './db.js';

export function createApp(sql: Sql, staticDir: string): Hono {
  const app = new Hono();
  app.use(secureHeaders({ xFrameOptions: 'DENY' }));

  app.get('/api/health', async (c) => {
    try {
      await sql`SELECT 1`;
      return c.json({ ok: true });
    } catch {
      return c.json({ ok: false }, 503);
    }
  });
  app.all('/api/*', (c) => c.json({ error: 'not_found' }, 404));

  // Hashed build assets never change; everything else (index.html, sw.js, manifest) must revalidate
  // or the PWA update check would be served stale.
  app.use('*', async (c, next) => {
    await next();
    if (c.res.ok) {
      c.header('Cache-Control', c.req.path.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache');
    }
  });
  // serveStatic wants a root relative to the working directory.
  app.use('*', serveStatic({ root: path.relative(process.cwd(), staticDir) || '.' }));
  // HashRouter: every client route is "/", so there is no SPA fallback to configure.
  return app;
}
