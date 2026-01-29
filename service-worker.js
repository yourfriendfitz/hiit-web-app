// Activate event: Take control of all clients
self.addEventListener("activate", (event) => {
  console.log("Service worker activating...");
  event.waitUntil(self.clients.claim()); // Take control of all open clients immediately
});
