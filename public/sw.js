// Service Worker de Spinkiu — cache del "app shell" para funcionar sin conexión.
// Estrategia: network-first con respaldo en caché (para navegación y GET del mismo origen).

const CACHE = 'spinkiu-shell-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // solo mismo origen

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      try {
        const fresh = await fetch(req);
        if (fresh && fresh.ok) cache.put(req, fresh.clone());
        return fresh;
      } catch {
        const cached = await cache.match(req);
        if (cached) return cached;
        if (req.mode === 'navigate') {
          const shell =
            (await cache.match('/dashboard')) ||
            (await cache.match('/evidence')) ||
            (await cache.match('/'));
          if (shell) return shell;
        }
        throw new Error('Sin conexión y sin caché disponible');
      }
    })()
  );
});
