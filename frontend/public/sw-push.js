/* Bloom Service Worker — Push Notifications */

self.addEventListener('push', function(event) {
  let data = { title: 'Bloom', body: 'Máte nové oznámení.', url: '/', type: 'message' };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch (e) {}

  const tagMap = {
    message: 'bloom-dm',
    service: 'bloom-service',
    news: 'bloom-news',
  };

  const options = {
    body: data.body,
    icon: '/icons/android-chrome-192x192.png',
    badge: '/icons/favicon-32x32.png',
    tag: tagMap[data.type] || 'bloom-notification',
    renotify: true,
    vibrate: [200, 100, 200],
    data: { url: data.url || '/' },
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
