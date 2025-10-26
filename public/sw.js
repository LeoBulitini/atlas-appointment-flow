// Service Worker com suporte a Push Notifications
const CACHE_NAME = 'atlasbook-v1';

// Instalação
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  self.skipWaiting();
});

// Ativação
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(clients.claim());
});

// Listener de Push
self.addEventListener('push', (event) => {
  console.log('[SW] Push received:', event);
  
  if (!event.data) {
    console.warn('[SW] Push without data');
    return;
  }

  const data = event.data.json();
  const { title, body, icon, badge, data: notificationData } = data;

  const options = {
    body: body || '',
    icon: icon || '/android-chrome-192x192.png',
    badge: badge || '/favicon-32x32.png',
    data: notificationData || {},
    vibrate: [200, 100, 200],
    requireInteraction: false,
    actions: notificationData?.actions || [],
    tag: notificationData?.tag || 'default'
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Click na notificação
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event);
  
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Se já tem uma janela aberta, foca nela
        for (const client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // Senão, abre uma nova
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});
