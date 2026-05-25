self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => caches.delete(key)));
    })
  );
  self.registration.unregister();
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // Do nothing, bypass service worker completely
});
