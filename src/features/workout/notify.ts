// iOS only shows Notification-API banners for home-screen PWAs via the service worker's
// showNotification (the plain `new Notification()` constructor isn't supported there), and
// permission must be requested from a user gesture — so this is called from the same tap that
// completes a set.
export function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    void Notification.requestPermission();
  }
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
