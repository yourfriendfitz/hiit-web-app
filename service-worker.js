// Service Worker for hiit-web-app
// - Default behavior: cache-first for same-origin GET requests (fast/offline)
// - Manual refresh: client posts message { type: 'REFRESH_APP' } to force a
//   network revalidation of precached assets and update the cache.

const CACHE_VERSION = "2.1.1";
const CACHE_NAME = `hiit-web-app-${CACHE_VERSION}`;

// Keep this list limited to same-origin assets you control.
// (Cross-origin CDNs may be opaque and can fail to cache on iOS.)
const PRECACHE_URLS = [
  "/hiit-web-app/",
  "/hiit-web-app/index.html",
  "/hiit-web-app/styles.css",
  "/hiit-web-app/app.js",
  "/hiit-web-app/Header.js",
  "/hiit-web-app/History.js",
  "/hiit-web-app/LastWeight.js",
  "/hiit-web-app/register.js",
  "/hiit-web-app/data.json",
  "/hiit-web-app/exercises.json",
  "/hiit-web-app/manifest.json",
  "/hiit-web-app/android-chrome-512x512.png",
  "/hiit-web-app/android-chrome-192x192.png",
  "/hiit-web-app/apple-touch-icon.png",
  "/hiit-web-app/favicon-32x32.png",
  "/hiit-web-app/favicon-16x16.png",
  "/hiit-web-app/favicon.ico",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(PRECACHE_URLS);
      // Activate on next navigation without needing the user to close the PWA.
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((k) => (k === CACHE_NAME ? null : caches.delete(k)))
      );
      await self.clients.claim();
    })()
  );
});

function isSameOrigin(url) {
  return url.origin === self.location.origin;
}

function isNavigationalRequest(request) {
  return request.mode === "navigate";
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request, { ignoreSearch: true });
  if (cached) return cached;

  const response = await fetch(request);
  // Only cache successful, basic (same-origin) responses.
  if (response && response.ok && response.type === "basic") {
    cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only handle GET.
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Don’t try to cache cross-origin requests (CDNs). Let the browser handle them.
  if (!isSameOrigin(url)) return;

  // For SPA navigations, respond with the app shell, but cache using the *actual request*.
  // This avoids hardcoding a single URL and keeps cache lookups consistent.
  if (isNavigationalRequest(request)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Default: cache-first for same-origin static assets / json.
  event.respondWith(cacheFirst(request));
});

async function refreshPrecache() {
  const cache = await caches.open(CACHE_NAME);

  // Force re-download of the app shell and core files.
  // Notes:
  // - We intentionally fetch with { cache: 'no-store' } to bypass HTTP cache.
  // - We store under a *clean* Request (or URL string) so future cache.match() calls
  //   keep working regardless of Request init options.
  await Promise.all(
    PRECACHE_URLS.map(async (url) => {
      try {
        const fetchReq = new Request(url, { cache: "no-store" });
        const res = await fetch(fetchReq);

        if (res && res.ok && res.type === "basic") {
          const cacheKey = new Request(url);
          await cache.put(cacheKey, res.clone());
        } else {
          console.warn("Precache refresh skipped (bad response):", url, {
            ok: res?.ok,
            status: res?.status,
            type: res?.type,
          });
        }
      } catch (err) {
        // Don't throw here; refresh is best-effort. Log for debugging.
        console.warn("Precache refresh failed:", url, err);
      }
    })
  );
}

self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || typeof data !== "object") return;

  // Expected message: same-origin client requesting a manual refresh.
  // This SW only listens for "REFRESH_APP" and ignores all other messages.
  if (data.type === "REFRESH_APP") {
    event.waitUntil(
      (async () => {
        await refreshPrecache();
        // Tell all clients refresh finished (they can reload).
        const clients = await self.clients.matchAll({ includeUncontrolled: true });
        clients.forEach((c) => c.postMessage({ type: "REFRESH_APP_DONE" }));
      })()
    );
  }
});
