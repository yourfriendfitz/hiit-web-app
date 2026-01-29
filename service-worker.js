// Cache version - should match the app version for proper cache invalidation
const CACHE_VERSION = "3.0.4";
const CACHE_NAME = `hiit-app-cache-v${CACHE_VERSION}`;

// List of resources to cache
const urlsToCache = [
  "/hiit-web-app/",
  "/hiit-web-app/index.html",
  "/hiit-web-app/app.js",
  "/hiit-web-app/Header.js",
  "/hiit-web-app/History.js",
  "/hiit-web-app/LastWeight.js",
  "/hiit-web-app/register.js",
  "/hiit-web-app/styles.css",
  "/hiit-web-app/manifest.json",
  "/hiit-web-app/exercises.json",
  "/hiit-web-app/data.json",
  "/hiit-web-app/android-chrome-192x192.png",
  "/hiit-web-app/android-chrome-512x512.png",
  "/hiit-web-app/apple-touch-icon.png",
  "/hiit-web-app/favicon.ico",
  "/hiit-web-app/favicon-16x16.png",
  "/hiit-web-app/favicon-32x32.png",
];

// Install event: Cache static assets
self.addEventListener("install", (event) => {
  console.log(`Service Worker installing for version ${CACHE_VERSION}...`);
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("Caching app shell and static assets");
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log("Service Worker installation complete");
        // Force the waiting service worker to become the active service worker
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error("Error during service worker installation:", error);
      })
  );
});

// Activate event: Clean up old caches and take control
self.addEventListener("activate", (event) => {
  console.log(`Service Worker activating for version ${CACHE_VERSION}...`);
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        // Delete old caches that don't match the current version
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log(`Deleting old cache: ${cacheName}`);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log("Service Worker activation complete");
        // Take control of all open clients immediately
        return self.clients.claim();
      })
  );
});

// Fetch event: Serve from cache with network fallback
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches
      .match(event.request)
      .then((response) => {
        // Return cached response if found
        if (response) {
          return response;
        }

        // Clone the request because it can only be used once
        const fetchRequest = event.request.clone();

        // Make network request and cache the response
        return fetch(fetchRequest)
          .then((response) => {
            // Check if valid response
            if (!response || response.status !== 200 || response.type !== "basic") {
              return response;
            }

            // Clone the response because it can only be used once
            const responseToCache = response.clone();

            // Cache the fetched response for future use
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });

            return response;
          })
          .catch((error) => {
            console.error("Fetch failed; returning offline page if available.", error);
            // Could return a custom offline page here if desired
            throw error;
          });
      })
  );
});
