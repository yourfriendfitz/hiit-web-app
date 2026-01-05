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

      // Prefer listening on the specific registration's active worker.
      // (Safer than a global navigator.serviceWorker 'message' listener if multiple SWs exist.)
      const onSwMessage = (event) => {
        if (event.data?.type === "REFRESH_APP_DONE") {
          // Refresh completion implies new assets are in cache.
          // Reloading immediately can be disruptive; show minimal feedback first.
          try {
            // If Toastify is loaded, use it; otherwise fall back to console.
            if (typeof Toastify === "function") {
              Toastify({
                text: "Update downloaded. Reloading…",
                duration: 1500,
                gravity: "bottom",
                position: "center",
                stopOnFocus: true,
                style: {
                  borderRadius: "5px",
                  background: "linear-gradient(to right, #2D3540, #A68160)",
                },
              }).showToast();
            } else {
              console.log("Update downloaded. Reloading…");
            }
          } finally {
            // Give the user a beat so the message is visible.
            setTimeout(() => window.location.reload(), 800);
          }
        }
      };

      // Attach listener to the active worker once available.
      if (registration.active) {
        registration.active.addEventListener("message", onSwMessage);
      }
      // Also listen via navigator.serviceWorker as a fallback if iOS swaps controllers.
      navigator.serviceWorker.addEventListener("message", onSwMessage);

      // Expose a global for the refresh button.
      // NOTE: Avoid immediate reload loops if SW is missing; retry a few times then stop.
      window.triggerUpdateCache = async () => {
        const MAX_CONTROLLER_RETRIES = 3;
        const RETRY_DELAY_MS = 750;

        for (let i = 0; i < MAX_CONTROLLER_RETRIES; i++) {
          const sw =
            registration.active || registration.waiting || registration.installing;

          // If there is no SW yet, attempt to update and wait a moment.
          if (!sw) {
            try {
              await registration.update();
            } catch (e) {
              console.warn("Service worker update check failed:", e);
            }

            await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
            continue;
          }

          // Ask the SW to refresh its precache from network.
          sw.postMessage({ type: "REFRESH_APP" });
          return;
        }

        console.warn(
          "No active service worker available to refresh the cache (giving up to avoid reload loop)."
        );
        if (typeof Toastify === "function") {
          Toastify({
            text: "Update failed (offline?). Try again in a moment.",
            duration: 3000,
            gravity: "bottom",
            position: "center",
            stopOnFocus: true,
            style: {
              borderRadius: "5px",
              background: "#6c757d",
            },
          }).showToast();
        }
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
