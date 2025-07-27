// service-worker.js

const CACHE_NAME = 'ecommerce-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/modals.css',
  '/modals.js',
  '/icon.png'      // Add your actual icon file name and make sure it's in your project
];

// Install event - caching files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    }).catch(err => {
      console.error('Failed to cache during install:', err);
    })
  );
  self.skipWaiting(); // Activate service worker immediately
});

// Activate event - clean up old caches if needed
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(name => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    })
  );
  self.clients.claim(); // Claim control immediately
});

// Fetch event - serve cached or go to network
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      // Serve cached file or fetch from network
      return response || fetch(event.request);
    }).catch(err => {
      console.error('Fetch failed:', err);
    })
  );
});