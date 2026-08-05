// ============================================================
//  Service Worker SIPP-BMN (PWA).
//   - Membuat aplikasi installable (offline shell).
//   - Strategi: network-first untuk navigasi (HTML),
//     cache-first untuk aset statis (_next/static, ikon, font).
//   - TIDAK menyentuh panggilan API backend (beda origin).
// ============================================================

const CACHE = 'sipp-bmn-v1';
const OFFLINE_URL = '/offline.html';
const PRECACHE = ['/offline.html', '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Hanya tangani GET pada origin yang sama (jangan ganggu API :5000)
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  // Navigasi halaman → network-first, fallback cache/offline
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match(OFFLINE_URL)))
    );
    return;
  }

  // Aset statis → cache-first
  event.respondWith(
    caches.match(req).then(
      (cached) =>
        cached ||
        fetch(req).then((res) => {
          if (res.ok && (req.url.includes('/_next/static') || req.url.includes('/icons/'))) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
    )
  );
});
