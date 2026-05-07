/* =====================================================
   Kotha Bolbo – Service Worker (sw.js)
   Version: v3 (Updated: 42h auto-delete + fixes)
   ===================================================== */

const CACHE_NAME = 'kotha-bolbo-v3';  // ← version বাড়ানো হয়েছে

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
  console.log('[SW] Installing v3...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Caching core assets');
      return cache.addAll(PRE_CACHE_ASSETS).catch(err => {
        console.warn('[SW] Pre-cache failed for some assets:', err);
      });
    })
  );
  // Force activate immediately — don't wait for old tabs to close
  self.skipWaiting();
});

// ── Activate: delete old caches ──────────────────────
self.addEventListener('activate', event => {
  console.log('[SW] Activating v3...');
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      );
    }).then(() => {
      console.log('[SW] v3 is now active!');
      // Take control of all clients immediately
      return self.clients.claim();
    })
  );
});

// ── Fetch: Network-first strategy with cache fallback ──
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip chrome-extension requests
  if (url.protocol === 'chrome-extension:') return;
  
  // Skip Firebase Realtime Database
  if (url.hostname.includes('firebaseio.com')) return;
  
  // Skip Google APIs & Firebase
  if (url.hostname.includes('googleapis.com') || url.hostname.includes('gstatic.com')) return;
  
  // Skip OneSignal
  if (url.hostname.includes('onesignal.com')) return;
  
  // Skip DiceBear avatars
  if (url.hostname.includes('dicebear.com')) return;

  // Network-first strategy for HTML and core assets
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cache successful responses
        if (response && response.status === 200 && response.type === 'basic') {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, cloned);
          });
        }
        return response;
      })
      .catch(() => {
        // Network failed — try cache
        return caches.match(event.request).then(cached => {
          if (cached) {
            console.log('[SW] Serving from cache:', url.pathname);
            return cached;
          }
          // If it's a navigation request, serve index.html
          if (event.request.mode === 'navigate') {
            console.log('[SW] Offline navigation — serving index.html');
            return caches.match('/index.html');
          }
          // Otherwise, return offline fallback
          console.warn('[SW] Offline — no cache for:', url.href);
          return new Response('You are offline. Please check your connection.', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain' }
          });
        });
      })
  );
});

// ── Push Notifications ────────────────────────────────
self.addEventListener('push', event => {
  console.log('[SW] Push notification received');
  let data = {};
  
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch(e) {
    console.warn('[SW] Failed to parse push data:', e);
  }

  const title = data.title || 'Kotha Bolbo 💬';
  const options = {
    body: data.body || 'You have a new message!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    vibrate: [200, 100, 200],
    tag: data.tag || 'kotha-bolbo-msg',
    renotify: true,
    requireInteraction: false,
    timestamp: Date.now(),
    data: {
      url: data.url || '/',
      ...data
    },
    actions: [
      { action: 'open', title: '💬 Open Chat' },
      { action: 'dismiss', title: '✕ Dismiss' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
      .then(() => console.log('[SW] Notification shown successfully'))
      .catch(err => console.error('[SW] Notification error:', err))
  );
});

// ── Notification Click ────────────────────────────────
self.addEventListener('notificationclick', event => {
  console.log('[SW] Notification clicked:', event.action);
  
  event.notification.close();

  // Handle dismiss action
  if (event.action === 'dismiss') {
    console.log('[SW] Notification dismissed');
    return;
  }

  // Default action: open the app
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // Try to focus an existing window
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            console.log('[SW] Focusing existing client');
            client.focus();
            // Post message to navigate
            client.postMessage({ 
              type: 'NOTIFICATION_CLICK', 
              url: targetUrl 
            });
            return;
          }
        }
        // No existing window — open new one
        if (clients.openWindow) {
          console.log('[SW] Opening new window:', targetUrl);
          return clients.openWindow(targetUrl);
        }
      })
  );
});

// ── Message from Clients ──────────────────────────────
self.addEventListener('message', event => {
  console.log('[SW] Message from client:', event.data);
  
  // Handle skip waiting request
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ── Background Sync ───────────────────────────────────
self.addEventListener('sync', event => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'sync-messages') {
    event.waitUntil(
      // You can add message sync logic here
      // For now, just notify all clients that sync happened
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'SYNC_COMPLETE' });
        });
      })
    );
  }
});

console.log('[SW] Service Worker v3 loaded and ready!');