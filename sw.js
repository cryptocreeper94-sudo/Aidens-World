// Service Worker — Cache-first for offline play
const CACHE_NAME = 'hero-hq-v2';
const ASSETS = [
  '/',
  '/index.html',
  '/src/config.js',
  '/src/systems/SoundFX.js',
  '/src/systems/SaveSystem.js',
  '/src/systems/LevelData.js',
  '/src/scenes/BootScene.js',
  '/src/scenes/HubScene.js',
  '/src/scenes/StoryScene.js',
  '/src/scenes/LevelScene.js',
  '/assets/characters/hero_red.png',
  '/assets/characters/hero_black.png',
  '/assets/characters/jedi_kid.png',
  '/assets/backgrounds/hub_bg.png',
  '/assets/backgrounds/nyc_skyline.png',
  '/assets/backgrounds/space_station.png',
  '/assets/backgrounds/desert.png',
  '/assets/backgrounds/rift.png',
  '/assets/enemies/thug.png',
  '/assets/enemies/trooper.png',
  '/assets/ui/hud_elements.png',
  '/assets/ui/icon-192.png',
  '/assets/ui/icon-512.png',
  '/assets/ui/splash.png',
  '/assets/story/intro_panel.png',
  '/assets/story/world1_complete.png',
  '/assets/story/world2_intro.png',
  '/assets/story/world3_intro.png',
  '/assets/story/world4_intro.png',
  '/assets/story/victory.png',
];

// Install — cache all assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching app shell');
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — cache first, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip Phaser CDN — always fetch from network
  if (event.request.url.includes('cdn.jsdelivr.net')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        const fetched = fetch(event.request).then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        });
        return cached || fetched;
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).then((fetchResponse) => {
        // Cache new resources dynamically
        if (fetchResponse.status === 200) {
          const clone = fetchResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return fetchResponse;
      });
    }).catch(() => {
      // Offline fallback
      if (event.request.destination === 'document') {
        return caches.match('/');
      }
    })
  );
});
