/* Kotha Bolbo PWA + Firebase Cloud Messaging Service Worker */
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

const CACHE_NAME = 'kotha-bolbo-pwa-v1.0.5';
const APP_SHELL = [
  '/',
  '/manifest.json'
];

firebase.initializeApp({
  apiKey: 'AIzaSyBa2bIHkBNK_oajNeFxgKpz4VrIx1aR5Fo',
  authDomain: 'kotha-bolbo-aso.firebaseapp.com',
  projectId: 'kotha-bolbo-aso',
  storageBucket: 'kotha-bolbo-aso.firebasestorage.app',
  messagingSenderId: '343828860232',
  appId: '1:343828860232:web:b566c74f630f8a2532b77d',
  databaseURL: 'https://kotha-bolbo-aso-default-rtdb.asia-southeast1.firebasedatabase.app'
});

const messaging = firebase.messaging();

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL).catch(() => null))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    Promise.all([
      clients.claim(),
      caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
    ])
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request).then(cached => cached || caches.match('/')))
  );
});

messaging.onBackgroundMessage(payload => {
  const title = payload.notification?.title || payload.data?.title || 'Kotha Bolbo';
  const body = payload.notification?.body || payload.data?.body || 'You have a new message';
  const icon = payload.notification?.icon || payload.data?.icon || '/icons/icon-192.png';
  const image = payload.notification?.image || payload.data?.image || undefined;
  const clickUrl = payload.data?.url || payload.fcmOptions?.link || '/';

  return self.registration.showNotification(title, {
    body,
    icon,
    image,
    badge: '/icons/icon-192.png',
    tag: payload.data?.tag || 'kb-message',
    renotify: true,
    silent: false,
    requireInteraction: false,
    data: { url: clickUrl }
  });
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});
