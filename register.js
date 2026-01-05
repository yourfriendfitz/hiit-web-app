if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register(
        "/hiit-web-app/service-worker.js"
      );
      console.log(
        "Service Worker registered successfully with scope:",
        registration.scope
      );

      // Listen for refresh completion.
      navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data?.type === "REFRESH_APP_DONE") {
          // Reload after cache refresh so the new assets are used.
          window.location.reload();
        }
      });

      // Expose a global for the refresh button.
      window.triggerUpdateCache = async () => {
        const sw =
          registration.active || registration.waiting || registration.installing;
        if (!sw) {
          // Ensure there is a controller on first install.
          window.location.reload();
          return;
        }

        // Ask the SW to refresh its precache from network.
        sw.postMessage({ type: "REFRESH_APP" });
      };

      // Optional: check for a new SW in the background.
      registration.update();
    } catch (error) {
      console.error("Service Worker registration failed:", error);
    }
  });
} else {
  console.warn("Service Worker not supported in this browser.");
}
