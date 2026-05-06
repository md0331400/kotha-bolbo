/* =====================================================
   Kotha Bolbo – Service Worker (sw.js)
   Place this file at your website ROOT (same level as index.html)
   ===================================================== */

const CACHE_NAME = 'kotha-bolbo-v1';
const OFFLINE_URL = '/offline.html';

// Files to cache immediately on install
const PRE_CACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  'https://fonts.googleapis.com/css2?family=Exo+2:ital,wght@0,300;0,500;0,700;1,400&family=Inter:wght@300;400;500;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css'
];

// ── Install: pre-cache core assets ──────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(PRE_CACHE_ASSETS).catch(err => {
        console.warn('[SW] Pre-cache failed for some assets:', err);
      });
    })
  );
  self.skipWaiting();
});

// ── Activate: delete old caches ──────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch: Network-first for Firebase/API, Cache-first for assets ──
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Skip non-GET, Chrome extensions, and Firebase real-time requests
  if (
    event.request.method !== 'GET' ||
    url.protocol === 'chrome-extension:' ||
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('onesignal.com') ||
    url.hostname.includes('dicebear.com')
  ) {
    return;
  }

  // Network-first strategy (good for dynamic chat content)
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cache a clone of successful responses
        if (response && response.status === 200 && response.type === 'basic') {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, cloned));
        }
        return response;
      })
      .catch(() => {
        // Offline fallback: serve from cache
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          // If it's a navigation request and nothing cached, show offline page
          if (event.request.mode === 'navigate') {
            return caches.match(OFFLINE_URL) || new Response(
              `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline – Kotha Bolbo</title>
              <style>*{margin:0;padding:0;box-sizing:border-box}body{background:#0a0e1a;color:#e8f0fe;font-family:Inter,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;gap:16px;text-align:center;padding:20px}
              .icon{font-size:56px;margin-bottom:8px}.title{font-size:1.4rem;font-weight:700;color:#00d4ff}.sub{font-size:0.85rem;color:#8899bb;max-width:280px;line-height:1.5}
              .btn{margin-top:12px;padding:10px 24px;background:linear-gradient(135deg,#00d4ff,#0099cc);color:#000;border:none;border-radius:999px;font-size:0.9rem;font-weight:700;cursor:pointer}
              </style></head><body>
              <div class="icon">💬</div>
              <div class="title">You're Offline</div>
              <div class="sub">No internet connection. Please check your connection and try again.</div>
              <button class="btn" onclick="location.reload()">Try Again</button>
              </body></html>`,
              { headers: { 'Content-Type': 'text/html' } }
            );
          }
          return new Response('Offline', { status: 503 });
        });
      })
  );
});

// ── Push Notifications ────────────────────────────────
self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch(e) {}

  const title = data.title || 'Kotha Bolbo';
  const options = {
    body: data.body || 'You have a new message!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    image: data.image || null,
    vibrate: [200, 100, 200],
    tag: data.tag || 'kotha-bolbo-msg',
    renotify: true,
    requireInteraction: false,
    data: {
      url: data.url || '/',
      ...data
    },
    actions: [
      { action: 'open', title: '💬 Open Chat' },
      { action: 'dismiss', title: '✕ Dismiss' }
    ]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ── Notification Click ────────────────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // Focus existing tab if open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.postMessage({ type: 'NOTIFICATION_CLICK', url: targetUrl });
          return;
        }
      }
      // Open new tab
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});

// ── Background Sync (optional – queues messages when offline) ──
self.addEventListener('sync', event => {
  if (event.tag === 'sync-messages') {
    console.log('[SW] Background sync triggered');
  }
});
