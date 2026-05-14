// ============================================================
// Kotha Bolbo - Service Worker v1.0
// Created by Sayem
// ============================================================

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// ⚠️ REPLACE WITH YOUR FIREBASE CONFIG
const firebaseConfig = {
  const firebaseConfig = {
  apiKey: "AIzaSyBa2bIHkBNK_oajNeFxgKpz4VrIx1aR5Fo",
  authDomain: "kotha-bolbo-aso.firebaseapp.com",
  databaseURL: "https://kotha-bolbo-aso-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "kotha-bolbo-aso",
  storageBucket: "kotha-bolbo-aso.firebasestorage.app",
  messagingSenderId: "343828860232",
  appId: "1:343828860232:web:b566c74f630f8a2532b77d"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

const CACHE_NAME = 'kotha-bolbo-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Install event
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - cache first strategy
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(response => {
      if (response) return response;
      return fetch(event.request).then(fetchResponse => {
        if (!fetchResponse || fetchResponse.status !== 200 || fetchResponse.type !== 'basic') {
          return fetchResponse;
        }
        const responseToCache = fetchResponse.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });
        return fetchResponse;
      }).catch(() => {
        return caches.match('/index.html');
      });
    })
  );
});

// FCM Background message handler
messaging.onBackgroundMessage(payload => {
  console.log('[SW] Background message:', payload);
  const { title, body, icon, data } = payload.notification || payload.data || {};
  const notificationTitle = title || 'Kotha Bolbo';
  const notificationOptions = {
    body: body || 'New message',
    icon: icon || 'https://api.dicebear.com/7.x/identicon/svg?seed=kothabolbo',
    badge: 'https://api.dicebear.com/7.x/identicon/svg?seed=kothabolbo',
    data: data || payload.data || {},
    vibrate: [200, 100, 200],
    tag: 'kotha-bolbo-msg',
    renotify: true,
    actions: [
      { action: 'open', title: 'Open Chat' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };
  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Notification click handler
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const data = event.notification.data;
  const chatUrl = data && data.senderId
    ? `/?chat=${data.senderId}`
    : '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.postMessage({ type: 'OPEN_CHAT', senderId: data && data.senderId });
          return client.focus();
        }
      }
      return clients.openWindow(chatUrl);
    })
  );
});
