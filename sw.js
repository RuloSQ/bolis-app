const CACHE = 'bolis-v2';
const APP_FILES = [
  '/bolis-app/',
  '/bolis-app/index.html',
  '/bolis-app/manifest.json',
  '/bolis-app/icon-192.png',
  '/bolis-app/icon-512.png'
];

// Instalar: cachear todos los archivos de la app
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => {
      return cache.addAll(APP_FILES).catch(err => {
        console.warn('Cache parcial:', err);
      });
    })
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

// Fetch: app shell siempre desde caché, Firebase siempre desde red
self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Firebase, Google APIs: solo red, sin cachear
  if (url.includes('firebase') || url.includes('googleapis') ||
      url.includes('gstatic') || url.includes('firestore')) {
    e.respondWith(fetch(e.request).catch(() => new Response('', {status: 503})));
    return;
  }

  // App shell: caché primero, actualizar en background
  e.respondWith(
    caches.match(e.request).then(cached => {
      const networkFetch = fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => null);

      return cached || networkFetch;
    })
  );
});
