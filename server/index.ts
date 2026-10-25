import path from 'node:path';
import { serve } from '@hono/node-server';
import { createApp } from './app.js';
import { connect, migrate } from './db.js';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required');

const sql = connect(databaseUrl);
const applied = await migrate(sql);
if (applied.length) console.log(`migrations applied: ${applied.join(', ')}`);

const port = Number(process.env.PORT ?? 3000);
const staticDir = path.resolve(process.env.STATIC_DIR ?? 'dist');
const server = serve({ fetch: createApp(sql, staticDir).fetch, port, hostname: process.env.HOST ?? '0.0.0.0' });
console.log(`listening on :${port}, serving ${staticDir}`);

// Docker sends SIGTERM on stop/restart; let in-flight requests and queries finish.
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, () => {
    server.close(() => void sql.end().then(() => process.exit(0)));
  });
}
