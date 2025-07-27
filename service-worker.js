// This is the "Offline page" service worker

importScripts('https://storage.googleapis.com/workbox-cdn/releases/5.1.2/workbox-sw.js');

const CACHE = "pwabuilder-page";

// Replace with your actual fallback page
const offlineFallbackPage = "index.html";

// Listen for the skip waiting message
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Precache the fallback page during install
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => {
      return cache.addAll([offlineFallbackPage]);
    })
  );
});

// Enable navigation preload if supported
if (workbox.navigationPreload.isSupported()) {
  workbox.navigationPreload.enable();
}

// Intercept fetch events for navigation
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          // Use the preload response if it's available
          const preloadResp = await event.preloadResponse;
          if (preloadResp) {
            return preloadResp;
          }

          // Try the network first
          const networkResp = await fetch(event.request);
          return networkResp;
        } catch (error) {
          // If both fail, show the fallback page
          const cache = await caches.open(CACHE);
          return await cache.match(offlineFallbackPage);
        }
      })()
    );
  }
});