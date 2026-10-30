import { z } from 'zod';
import type { Sql } from '../db.js';
import { isPushEndpoint, type Push } from '../push.js';
import { parseBody, privateRouter, userId } from './util.js';

const subscribeBody = z.object({
  endpoint: z.string().max(2048).refine(isPushEndpoint, 'Not a browser push service.'),
  keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
});

/** Push subscriptions of this device, and the public key it needs to subscribe. */
export function pushRoutes(sql: Sql, push: Push) {
  const app = privateRouter(sql);

  app.get('/key', async (c) => c.json({ publicKey: await push.publicKey() }));

  // A device belongs to whoever signed in last, so an existing endpoint moves to this account.
  app.post('/subscribe', async (c) => {
    const { data, error } = await parseBody(c, subscribeBody);
    if (error) return error;
    await sql`
      INSERT INTO push_subscription (endpoint, user_id, p256dh, auth)
      VALUES (${data.endpoint}, ${userId(c)}, ${data.keys.p256dh}, ${data.keys.auth})
      ON CONFLICT (endpoint) DO UPDATE SET user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth`;
    return c.json({ ok: true });
  });

  return app;
}
