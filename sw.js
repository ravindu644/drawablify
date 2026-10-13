// Offline-first: serve from cache, refresh the cache in the background.
const CACHE = 'svg2vd-v10';
const FILES = ['./', 'index.html', 'theme.js', 'app.js', 'convert.js', 'trace-worker.js', 'vendor/imagetracer.js', 'icon.svg'];
addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => skipWaiting())));
addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))));
addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || !e.request.url.startsWith(location.origin)) return;
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(e.request, { ignoreSearch: true });
    const net = fetch(e.request).then(r => (r.ok && c.put(e.request, r.clone()), r));
    return hit ? (net.catch(() => {}), hit) : net;
  }));
});
