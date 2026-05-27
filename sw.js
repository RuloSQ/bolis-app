const CACHE = 'bolis-v1';
const APP_SHELL = [
  '/bolis-app/',
  '/bolis-app/index.html'
];

// Instalar: cachear el shell de la app
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// Activar: limpiar cachés viejos
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: estrategia según el tipo de recurso
self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Firebase y CDNs externos: siempre intentar red primero
  if (url.includes('firebase') || url.includes('googleapis') ||
      url.includes('gstatic') || url.includes('firestore')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          // Cachear respuesta exitosa
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // App shell: caché primero, red como respaldo
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) {
        // Actualizar en segundo plano
        fetch(e.request).then(res => {
          caches.open(CACHE).then(c => c.put(e.request, res));
        }).catch(() => {});
        return cached;
      }
      return fetch(e.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      });
    })
  );
});
