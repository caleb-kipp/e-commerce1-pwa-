// Service worker with improved offline support and static asset caching

importScripts('https://storage.googleapis.com/workbox-cdn/releases/5.1.2/workbox-sw.js');

const CACHE = "pwabuilder-page-v1";
const OFFLINE_FALLBACK_PAGE = "index.html";

// Skip waiting and take control immediately
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Pre-cache offline fallback and static assets on install
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => {
      return cache.addAll([
        OFFLINE_FALLBACK_PAGE,
        "/styles.css",      // Replace with actual CSS
        "/app.js",          // Replace with actual JS
        "/logo.png",        // Replace with actual assets
        "/favicon.ico",
      ]);
    })
  );
  self.skipWaiting(); // Optional: immediately activate
});

// Claim clients on activation
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Enable navigation preload for faster loading
if (workbox.navigationPreload.isSupported()) {
  workbox.navigationPreload.enable();
}

// Route static assets with a cache-first strategy
workbox.routing.registerRoute(
  /\.(?:js|css|png|jpg|jpeg|svg|gif|ico)$/,
  new workbox.strategies.CacheFirst({
    cacheName: 'static-resources',
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
      }),
    ],
  })
);

// Handle navigation requests with a network-first strategy
self.addEventListener("fetch", (event) => {
  if (event.request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const preloadResp = await event.preloadResponse;
          if (preloadResp) return preloadResp;

          const networkResp = await fetch(event.request);
          return networkResp;
        } catch (error) {
          const cache = await caches.open(CACHE);
          return await cache.match(OFFLINE_FALLBACK_PAGE);
        }
      })()
    );
  }
});