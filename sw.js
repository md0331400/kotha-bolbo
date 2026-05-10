// ============================================================
//  Kotha Bolbo — Service Worker (sw.js)
//  Created by Sayem
//  Handles: PWA caching, offline fallback, push notifications
// ============================================================

const APP_NAME   = 'kotha-bolbo';
const VERSION    = 'v1.0.2';
const CACHE_NAME = `${APP_NAME}-${VERSION}`;

// ---------- Assets to cache on install ----------
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// ---------- External origins to cache at runtime ----------
const CACHEABLE_ORIGINS = [
  'https://fonts.googleapis.com',
  'https://fonts.gstatic.com',
  'https://cdnjs.cloudflare.com',
];

// ---------- These origins are NEVER intercepted ----------
const BYPASS_ORIGINS = [
  'https://firestore.googleapis.com',
  'https://firebase.googleapis.com',
  'https://identitytoolkit.googleapis.com',
  'https://securetoken.googleapis.com',
  'https://firebasestorage.googleapis.com',
  'https://onesignal.com',
  'https://cdn.onesignal.com',
  'https://api.anthropic.com',
];

// ============================================================
//  INSTALL — pre-cache shell assets
// ============================================================
self.addEventListener('install', (event) => {
  console.log(`[SW] Installing ${CACHE_NAME}`);
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      try {
        await cache.addAll(PRECACHE_ASSETS);
        console.log('[SW] Pre-cached shell assets');
      } catch (err) {
        // Some assets might not exist yet; don't block install
        console.warn('[SW] Pre-cache partial failure (non-fatal):', err);
      }
    })
  );
  // Activate immediately without waiting for old SW to finish
  self.skipWaiting();
});

// ============================================================
//  ACTIVATE — delete old caches
// ============================================================
self.addEventListener('activate', (event) => {
  console.log(`[SW] Activating ${CACHE_NAME}`);
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith(APP_NAME) && key !== CACHE_NAME)
          .map((key) => {
            console.log(`[SW] Deleting old cache: ${key}`);
            return caches.delete(key);
          })
      )
    ).then(() => self.clients.claim())
  );
});

// ============================================================
//  FETCH — caching strategy
// ============================================================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // Skip chrome-extension and non-http schemes
  if (!url.protocol.startsWith('http')) return;

  // Skip Firebase, OneSignal and other live-data origins completely
  if (BYPASS_ORIGINS.some((origin) => request.url.startsWith(origin))) return;

  // Skip same-origin API calls (e.g. /api/notify)
  if (url.pathname.startsWith('/api/')) return;

  // ---------- Strategy: Cache-First for fonts & static CDN assets ----------
  if (CACHEABLE_ORIGINS.some((origin) => request.url.startsWith(origin))) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // ---------- Strategy: Network-First for same-origin pages ----------
  if (url.origin === self.location.origin) {
    event.respondWith(networkFirstWithOfflineFallback(request));
    return;
  }
});

// ---------- Cache-First ----------
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (err) {
    console.warn('[SW] Cache-first fetch failed:', err);
    return new Response('Offline', { status: 503 });
  }
}

// ---------- Network-First with offline fallback to cache or /index.html ----------
async function networkFirstWithOfflineFallback(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (err) {
    // Offline — try cache
    const cached = await caches.match(request);
    if (cached) return cached;

    // Navigation requests — return the app shell
    if (request.mode === 'navigate') {
      const shell = await caches.match('/index.html') || await caches.match('/');
      if (shell) return shell;
    }

    return new Response(
      JSON.stringify({ error: 'offline' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// ============================================================
//  PUSH — incoming push notification from OneSignal / server
// ============================================================
self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: 'Kotha Bolbo', body: event.data?.text() || 'New message' };
  }

  const title   = payload.title   || 'Kotha Bolbo 💬';
  const body    = payload.body    || payload.messageText || 'You have a new message';
  const icon    = payload.icon    || '/icons/icon-192x192.png';
  const badge   = payload.badge   || '/icons/icon-192x192.png';
  const tag     = payload.tag     || 'kotha-bolbo-msg';
  const url     = payload.url     || '/';
  const sender  = payload.senderName || '';

  const options = {
    body    : sender ? `${sender}: ${body}` : body,
    icon,
    badge,
    tag,
    renotify   : true,
    vibrate    : [200, 100, 200],
    timestamp  : Date.now(),
    data       : { url },
    actions    : [
      { action: 'open',    title: '💬 Open chat' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// ============================================================
//  NOTIFICATION CLICK — open or focus the app
// ============================================================
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If the app is already open, focus it
      for (const client of windowClients) {
        const clientUrl = new URL(client.url);
        if (clientUrl.origin === self.location.origin) {
          client.focus();
          client.postMessage({ type: 'NOTIFICATION_CLICK', url: targetUrl });
          return;
        }
      }
      // Otherwise open a new tab
      return clients.openWindow(targetUrl);
    })
  );
});

// ============================================================
//  NOTIFICATION CLOSE — optional analytics hook
// ============================================================
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed:', event.notification.tag);
});

// ============================================================
//  MESSAGE — from main thread (e.g. force-update request)
// ============================================================
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data?.type === 'CLEAR_CACHE') {
    caches.delete(CACHE_NAME).then(() => {
      console.log('[SW] Cache cleared on request');
    });
  }
});

console.log(`[SW] ${CACHE_NAME} loaded ✅`);
