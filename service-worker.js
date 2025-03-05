const utc = Date.now();
let currentCacheName = `workout-app-cache-${utc}`; // Default cache version

const urls = [
  "/",
  "/index.html",
  "/styles.css",
  "/app.js",
  "/Header.js",
  "/LastWeight.js",
  "/register.js",
  "/data.json",
  "/exercises.json",
  "/manifest.json",
  "/android-chrome-512x512.png",
  "/android-chrome-192x192.png",
  "/apple-touch-icon.png",
  "/favicon-32x32.png",
  "/favicon-16x16.png",
  "/favicon.ico",
  "/README.md",
  "https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css",
  "https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css",
  "https://cdn.jsdelivr.net/npm/toastify-js/src/toastify.min.css",
  "https://cdn.jsdelivr.net/npm/toastify-js",
];

// Install event: Cache essential assets
self.addEventListener("install", (event) => {
  console.log("Installing new service worker...");
  event.waitUntil(
    caches
      .open(currentCacheName)
      .then((cache) => {
        console.log("Caching assets...");
        return cache.addAll(urls);
      })
      .then(() => {
        self.skipWaiting(); // Force the new service worker to activate immediately
      })
  );
});

// Fetch event: Serve from cache or fetch from network
self.addEventListener("fetch", (event) => {
  const normalizedUrl = new URL(event.request.url);
  normalizedUrl.search = ""; // Strip query parameters

  event.respondWith(
    caches.match(normalizedUrl).then((cachedResponse) => {
      const fetchVersion = { CACHE_NAME: currentCacheName };

      const networkFetch = fetch(event.request, {
        mode: "cors",
        credentials: "omit", // Exclude credentials
      })
        .then(async (networkResponse) => {
          const cache = await caches.open(currentCacheName);
          cache.put(normalizedUrl, networkResponse.clone()); // Cache new response
          console.log(`Network fetch for ${normalizedUrl} succeeded.`);
          return networkResponse;
        })
        .catch((error) => {
          if (!navigator.onLine) {
            console.warn(
              `User is offline. Network fetch failed for ${normalizedUrl}: ${error}`
            );
          } else {
            console.warn(`Network fetch failed for ${normalizedUrl}: ${error}`);
          }
        });

      const freshResponse = Promise.all([fetchVersion, networkFetch]).then(
        ([, response]) => response
      );

      // Serve from cache or perform network fetch
      return cachedResponse || freshResponse;
    })
  );
});

// Function to update the cache with new assets
// eslint-disable-next-line no-unused-vars
async function updateCache(newCacheName) {
  const cache = await caches.open(newCacheName);
  await cache.addAll(urls);

  // Delete old caches
  const cacheNames = await caches.keys();
  cacheNames.forEach((cache) => {
    if (cache !== newCacheName) {
      caches.delete(cache);
    }
  });

  console.log(`Cache updated to ${newCacheName}`);
}

// Function to update the cache with new assets
async function updateCacheFresh(newCacheName) {
  const cache = await caches.open(newCacheName);
  // Fetch and cache each URL with no-cache header
  await Promise.all(
    urls.map(async (url) => {
      const response = await fetch(url, {
        cache: "no-cache",
        mode: "cors", // Added mode to handle CORS
      });
      await cache.put(url, response);
    })
  );

  // Delete old caches
  const cacheNames = await caches.keys();
  cacheNames.forEach((cache) => {
    if (cache !== newCacheName) {
      caches.delete(cache);
    }
  });

  console.log(`Cache updated to ${newCacheName}`);
}

// eslint-disable-next-line no-unused-vars
async function triggerUpdateCache() {
  const utc = Date.now();
  const newCacheName = `workout-app-cache-${utc}`;
  if (typeof caches !== "undefined") await updateCacheFresh(newCacheName);
}

// Activate event: Clean up old caches and take control of all clients
self.addEventListener("activate", (event) => {
  console.log("Service worker activating...");
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames.map((cache) => {
            if (cache !== currentCacheName) {
              console.log(`Deleting old cache: ${cache}`);
              return caches.delete(cache);
            }
          })
        )
      )
      .then(() => {
        return self.clients.claim(); // Take control of all open clients immediately
      })
  );
});
