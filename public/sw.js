// Service Worker de Spinkiu
// Estrategia CONSERVADORA: solo cachea assets estáticos e inmutables.
// Las navegaciones, RSC y llamadas a API NO se interceptan (van directo a la red),
// para evitar servir HTML viejo tras un despliegue o colgar la carga.

const CACHE = 'spinkiu-static-v2';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Borra cachés antiguas (incluida la v1 que cacheaba navegaciones)
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

  const isStaticAsset =
    url.pathname.startsWith('/_next/static/') ||
    /\.(?:js|css|woff2?|ttf|png|jpe?g|svg|ico|webp|gif)$/.test(url.pathname);

  // Solo interceptamos assets estáticos (cache-first). El resto pasa sin tocar.
  if (!isStaticAsset) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(req);
      if (cached) return cached;
      try {
        const fresh = await fetch(req);
        if (fresh && fresh.ok) cache.put(req, fresh.clone());
        return fresh;
      } catch {
        return cached || Response.error();
      }
    })()
  );
});
