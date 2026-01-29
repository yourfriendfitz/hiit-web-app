const CACHE_VERSION = "3.0.3";
const CACHE_NAME = `hiit-web-app-${CACHE_VERSION}`;

// Install event: Cache essential assets
self.addEventListener("install", (event) => {
  console.log("Installing new service worker...");
});

// Activate event: Clean up old caches and take control of all clients
self.addEventListener("activate", (event) => {
  console.log("Service worker activating...");
  return self.clients.claim(); // Take control of all open clients immediately
});
