// SW sin Firebase Messaging SDK para tener control total de push y notificationclick
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

// Recibir push directamente sin Firebase SDK
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch (e) {
    return;
  }

  const notification = payload.notification || {};
  const data = payload.data || {};
  const title = notification.title || 'Nuevo aviso';
  const body = notification.body || '';
  const noticeId = data.noticeId || '';

  event.waitUntil(
    self.registration.showNotification(title, {
      body: body,
      icon: 'assets/gsti/icon.png',
      data: { noticeId: noticeId },
    }),
  );
});

// Click en notificación
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const noticeId = event.notification.data?.noticeId || '';
  const targetUrl = noticeId
    ? '/dashboard/notices/' + noticeId
    : '/dashboard/notices';
  const fullUrl = self.location.origin + targetUrl;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.startsWith(self.location.origin)) {
          return client.focus().then(() => {
            client.postMessage({
              type: 'NOTIFICATION_CLICK',
              noticeId: noticeId,
            });
          });
        }
      }
      return self.clients.openWindow(fullUrl);
    }),
  );
});
