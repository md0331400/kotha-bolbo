// ============================================================
//  Kotha Bolbo — Service Worker
//  Strategy:
//    • Static assets  → Cache-First  (fonts, icons, CDN libs)
//    • Firebase / API → Network-First (always fresh data)
//    • HTML (app shell) → Stale-While-Revalidate
// ============================================================

const CACHE_NAME = 'kothabolbo-v1';
const OFFLINE_URL = './index.html';

// Assets to pre-cache on install (app shell)
const PRECACHE_URLS = [
  './index.html',
  './manifest.json'
];

// Domains that must ALWAYS go to network (Firebase, API)
const NETWORK_ONLY_PATTERNS = [
  'firebaseio.com',
  'firestore.googleapis.com',
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com',
  'firebase.googleapis.com',
  'cloudfunctions.net',
  'imagekit.io',
  'vercel.app',
  'kothabolbo.vercel.app'
];

// CDN assets we want to cache
const CACHE_FIRST_PATTERNS = [
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'cdnjs.cloudflare.com',
  'cdn.jsdelivr.net'
];

// ── Install ────────────────────────────────────────────────
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(PRECACHE_URLS);
    }).then(function () {
      return self.skipWaiting(); // activate new SW immediately
    })
  );
});

// ── Activate ───────────────────────────────────────────────
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (cacheNames) {
      return Promise.all(
        cacheNames
          .filter(function (name) { return name !== CACHE_NAME; })
          .map(function (name) { return caches.delete(name); })
      );
    }).then(function () {
      return self.clients.claim(); // take control of all tabs
    })
  );
});

// ── Fetch ──────────────────────────────────────────────────
self.addEventListener('fetch', function (event) {
  const url = event.request.url;

  // Skip non-GET requests entirely
  if (event.request.method !== 'GET') return;

  // Skip chrome-extension or other non-http schemes
  if (!url.startsWith('http')) return;

  // 1. Network-Only — Firebase & live APIs
  if (NETWORK_ONLY_PATTERNS.some(function (p) { return url.includes(p); })) {
    event.respondWith(fetch(event.request));
    return;
  }

  // 2. Cache-First — CDN fonts & libraries
  if (CACHE_FIRST_PATTERNS.some(function (p) { return url.includes(p); })) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  // 3. Stale-While-Revalidate — app shell (HTML, JS, CSS)
  event.respondWith(staleWhileRevalidate(event.request));
});

// ── Strategies ─────────────────────────────────────────────

function cacheFirst(request) {
  return caches.match(request).then(function (cached) {
    if (cached) return cached;
    return fetchAndCache(request);
  }).catch(function () {
    return offlineFallback(request);
  });
}

function staleWhileRevalidate(request) {
  return caches.open(CACHE_NAME).then(function (cache) {
    return cache.match(request).then(function (cached) {
      var networkFetch = fetch(request).then(function (response) {
        if (response && response.status === 200 && response.type !== 'opaque') {
          cache.put(request, response.clone());
        }
        return response;
      }).catch(function () {
        return null;
      });

      return cached || networkFetch || offlineFallback(request);
    });
  });
}

function fetchAndCache(request) {
  return fetch(request).then(function (response) {
    if (!response || response.status !== 200 || response.type === 'opaque') {
      return response;
    }
    return caches.open(CACHE_NAME).then(function (cache) {
      cache.put(request, response.clone());
      return response;
    });
  });
}

function offlineFallback(request) {
  // For navigation requests, return the app shell
  if (request.mode === 'navigate') {
    return caches.match(OFFLINE_URL);
  }
  return new Response('', { status: 503, statusText: 'Offline' });
}
