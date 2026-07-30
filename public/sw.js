// Service Worker de Spinkiu — soporte offline del "app shell".
//
// - Navegaciones / RSC / GET del mismo origen: network-first (siempre fresco en
//   línea) con respaldo en caché cuando no hay conexión.
// - Assets estáticos (_next/static, imágenes, fuentes): cache-first.
// - Peticiones a otros orígenes (Supabase, etc.): NO se interceptan (van a la red).
//
// Así, tras abrir la app UNA vez con conexión, puede abrirse sin datos.

const STATIC_CACHE = 'spinkiu-static-v3';
const PAGES_CACHE = 'spinkiu-pages-v3';
const PRECACHE_ROUTES = ['/', '/dashboard', '/evidence', '/providers', '/inventory', '/billing', '/settings'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(PAGES_CACHE);
      // Precachear rutas clave (si alguna falla, no aborta el resto)
      await Promise.all(
        PRECACHE_ROUTES.map(async (route) => {
          try {
            const res = await fetch(route, { credentials: 'same-origin' });
            if (res && res.ok) await cache.put(route, res.clone());
          } catch {
            /* sin conexión durante la instalación: se cacheará al navegar */
          }
        })
      );
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== STATIC_CACHE && k !== PAGES_CACHE).map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

async function cacheFirst(req) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(req);
  if (cached) return cached;
  try {
    const fresh = await fetch(req);
    if (fresh && fresh.ok) cache.put(req, fresh.clone());
    return fresh;
  } catch {
    return cached || Response.error();
  }
}

async function networkFirst(req) {
  const cache = await caches.open(PAGES_CACHE);
  try {
    const fresh = await fetch(req);
    if (fresh && fresh.ok) cache.put(req, fresh.clone());
    return fresh;
  } catch {
    const cached = await cache.match(req);
    if (cached) return cached;
    if (req.mode === 'navigate') {
      const fallback =
        (await cache.match('/dashboard')) ||
        (await cache.match('/evidence')) ||
        (await cache.match('/'));
      if (fallback) return fallback;
    }
    return Response.error();
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Supabase y externos: red directa

  const isStaticAsset =
    url.pathname.startsWith('/_next/static/') ||
    /\.(?:js|css|woff2?|ttf|png|jpe?g|svg|ico|webp|gif)$/.test(url.pathname);

  if (isStaticAsset) {
    event.respondWith(cacheFirst(req));
  } else {
    // Navegaciones, RSC y demás GET del mismo origen
    event.respondWith(networkFirst(req));
  }
});
