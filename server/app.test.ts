import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from './app.js';
import { migrate, type Sql } from './db.js';
import { tempSchema } from './test-db.js';

let sql: Sql;
let drop: () => Promise<void>;
let app: ReturnType<typeof createApp>;

beforeAll(async () => {
  ({ sql, drop } = await tempSchema());
  await migrate(sql);
  const dir = await mkdtemp(path.join(os.tmpdir(), 'ttp-static-'));
  await mkdir(path.join(dir, 'assets'));
  await writeFile(path.join(dir, 'index.html'), '<h1>ttp</h1>');
  await writeFile(path.join(dir, 'assets', 'app-abc123.js'), 'x');
  app = createApp(sql, dir);
});
afterAll(() => drop());

describe('app', () => {
  it('reports health from the database', async () => {
    const res = await app.request('/api/health');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it('returns JSON 404 for unknown API paths instead of the SPA', async () => {
    const res = await app.request('/api/nope');
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'not_found' });
  });

  it('serves index.html revalidating and hashed assets immutable', async () => {
    const index = await app.request('/index.html');
    expect(await index.text()).toBe('<h1>ttp</h1>');
    expect(index.headers.get('cache-control')).toBe('no-cache');
    const asset = await app.request('/assets/app-abc123.js');
    expect(asset.headers.get('cache-control')).toContain('immutable');
  });

  it('sets security headers', async () => {
    const res = await app.request('/api/health');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('x-frame-options')).toBe('DENY');
  });
});
