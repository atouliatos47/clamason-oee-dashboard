const CACHE = 'clamason-oee-v4';
const STATIC_ASSETS = [
    '/css/style.css',
    '/manifest.json',
    '/icons/icon-192.png',
    '/icons/icon-512.png',
];

self.addEventListener('install', e => {
    e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC_ASSETS)));
    self.skipWaiting();
});

self.addEventListener('activate', e => {
    e.waitUntil(caches.keys().then(keys =>
        Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ));
    self.clients.claim();
});

self.addEventListener('fetch', e => {
    // Never cache API calls
    if (e.request.url.includes('/api/')) return;

    const url = new URL(e.request.url);
    const isNavigation = e.request.mode === 'navigate';
    const isJS = url.pathname.endsWith('.js');

    // HTML and JS: network-first so updates are always picked up immediately
    if (isNavigation || isJS) {
        e.respondWith(
            fetch(e.request)
                .then(res => {
                    const clone = res.clone();
                    caches.open(CACHE).then(c => c.put(e.request, clone));
                    return res;
                })
                .catch(() => caches.match(e.request))
        );
        return;
    }

    // CSS / images: cache-first (stable assets)
    e.respondWith(
        caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
            return res;
        }))
    );
});
