import { api } from '../../api/client';

// iOS only shows Notification-API banners for home-screen PWAs via the service worker's
// showNotification (the plain `new Notification()` constructor isn't supported there), and
// permission must be requested from a user gesture — so this is called from the same tap that
// completes a set.
export function requestNotificationPermission() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') void Notification.requestPermission().then(syncPush);
  else void syncPush();
}

// While the app is closed iOS runs no timers, so the server sends the "time's up" as a Web Push.
// This registers the device with the server: once per page load, and only with permission.
let synced = false;

async function syncPush() {
  if (synced || Notification.permission !== 'granted' || !('PushManager' in window)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const { publicKey } = await api<{ publicKey: string }>('GET', '/push/key');
    let sub = await reg.pushManager.getSubscription();
    // A subscription made for another server key (database reset) can't be reused.
    if (sub && toBase64Url(sub.options.applicationServerKey) !== publicKey) {
      await sub.unsubscribe();
      sub = null;
    }
    sub ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: fromBase64Url(publicKey) });
    await api('POST', '/push/subscribe', sub.toJSON());
    synced = true;
  } catch (e) {
    console.error('push subscription failed', e);
  }
}

function toBase64Url(buf: ArrayBuffer | null): string {
  const bytes = new Uint8Array(buf ?? new ArrayBuffer(0));
  return btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function fromBase64Url(s: string): Uint8Array<ArrayBuffer> {
  const bin = atob(s.replaceAll('-', '+').replaceAll('_', '/'));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

export function notifyTimesUp() {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  if (!('serviceWorker' in navigator)) return;
  void navigator.serviceWorker.ready.then((reg) =>
    reg.showNotification("Time's up!", {
      body: 'Rest is over — back to it.',
      icon: '/icon-192.png',
      tag: 'ttp-rest-timer',
    }),
  );
}
