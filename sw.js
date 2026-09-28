const VERSION = 'v15';
const CACHE = `volumora-${VERSION}`;
// Cross-origin exercise GIFs get their own bounded cache so the app shell cache stays small and predictable.
const MEDIA_CACHE = `volumora-media-${VERSION}`;
const MEDIA_LIMIT = 120;
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './manifest.json',
  './assets/data/exercises.js',
  './src/app.js',
  './src/backup.js',
  './src/charts.js',
  './src/icons.js',
  './src/library.js',
  './src/plans.js',
  './src/render.js',
  './src/state.js',
  './src/storage.js',
  './src/theme.js',
  './src/util.js',
  './src/workout.js',
  './src/views/analytics.js',
  './src/views/assistant.js',
  './src/views/body.js',
  './src/views/calendar.js',
  './src/views/editor.js',
  './src/views/home.js',
  './src/views/more.js',
  './src/views/plans.js',
  './src/views/shell.js',
  './src/views/workout.js',
  './assets/brand/volumora-mark.png',
  './assets/icons/favicon-32.png',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
];

self.addEventListener('install', (e) =>
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  )
);
self.addEventListener('activate', (e) =>
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE && k !== MEDIA_CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  )
);

const store = (e, cacheName, request, response) =>
  e.waitUntil(caches.open(cacheName).then((c) => c.put(request, response)));
async function trimMedia() {
  const c = await caches.open(MEDIA_CACHE),
    keys = await c.keys();
  if (keys.length <= MEDIA_LIMIT) return;
  await Promise.all(keys.slice(0, keys.length - MEDIA_LIMIT).map((k) => c.delete(k)));
}

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const sameOrigin = new URL(e.request.url).origin === self.location.origin;
  if (e.request.mode === 'navigate') {
    // Only a successful document may replace the offline start page; a 404 or error page must never be cached as index.html.
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          if (res.ok) store(e, CACHE, './index.html', res.clone());
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }
  if (sameOrigin) {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          if (res.ok) store(e, CACHE, e.request, res.clone());
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then(
      (cached) =>
        cached ||
        fetch(e.request).then((res) => {
          if (res.ok || res.type === 'opaque')
            e.waitUntil(
              caches
                .open(MEDIA_CACHE)
                .then((c) => c.put(e.request, res.clone()))
                .then(trimMedia)
            );
          return res;
        })
    )
  );
});
