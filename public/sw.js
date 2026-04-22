const CACHE = 'clamason-oee-v5';
const STATIC_ASSETS = [
    '/css/style.css',
    '/manifest.json',
];

self.addEventListener('install', e => {
    e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC_ASSETS)));
    self.skipWaiting();
});

self.addEventListener('activate', e => {
    // Wipe every old cache unconditionally
    e.waitUntil(
        caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
            .then(() => caches.open(CACHE).then(c => c.addAll(STATIC_ASSETS)))
    );
    self.clients.claim();
});

self.addEventListener('fetch', e => {
    // Let the browser handle HTML navigation and JS normally (no SW interception)
    // so server Cache-Control headers are respected and updates are instant.
    if (e.request.mode === 'navigate') return;
    if (new URL(e.request.url).pathname.endsWith('.js')) return;
    if (e.request.url.includes('/api/')) return;

    // Cache-first only for CSS and images (stable assets)
    e.respondWith(
        caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
            return res;
        }))
    );
});
