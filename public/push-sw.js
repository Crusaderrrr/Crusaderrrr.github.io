// Loaded into the generated service worker (vite.config.ts → workbox.importScripts).
// iOS drops a push subscription whose pushes show nothing, so every push shows a notification.
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title || "Time's up!", {
      body: data.body || 'Rest is over — back to it.',
      icon: '/icon-192.png',
      // Same tag as the in-app notification, so the two never stack.
      tag: 'ttp-rest-timer',
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((open) =>
      open.length ? open[0].focus() : self.clients.openWindow('/#/workout'),
    ),
  );
});
