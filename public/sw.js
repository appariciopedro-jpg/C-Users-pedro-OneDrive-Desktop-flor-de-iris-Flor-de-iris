// SW kill-switch: remove old service worker + caches so updates appear.
// This project does not need offline caching.

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    } catch {
      // ignore
    }

    try {
      await self.registration.unregister();
    } catch {
      // ignore
    }

    try {
      await self.clients.claim();
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach((client) => {
        try {
          client.navigate(client.url);
        } catch {
          // ignore
        }
      });
    } catch {
      // ignore
    }
  })());
});

// No fetch handler: do not cache anything.
