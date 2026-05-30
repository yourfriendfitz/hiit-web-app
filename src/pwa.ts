import { registerSW } from "virtual:pwa-register";

import { pwaUpdatePolicy } from "./update-policy";

const UPDATE_INTERVAL_MS = 60 * 60 * 1000;

export function registerPwa() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  let registration: ServiceWorkerRegistration | undefined;
  const updateServiceWorker = registerSW({
    immediate: true,
    onNeedRefresh: () => pwaUpdatePolicy.markUpdateWaiting(),
    onNeedReload: () => pwaUpdatePolicy.markReloadWaiting(),
    onRegisteredSW: (_serviceWorkerUrl, nextRegistration) => {
      registration = nextRegistration;
      void registration?.update();
    },
    onRegisterError: (error: unknown) => {
      console.error("Service Worker registration failed:", error);
    },
  });

  pwaUpdatePolicy.configure({
    applyUpdate: () => void updateServiceWorker(),
    reload: () => window.location.reload(),
  });

  const checkForUpdate = () => {
    if (document.visibilityState === "visible") {
      void registration?.update();
    }
  };

  document.addEventListener("visibilitychange", checkForUpdate);
  window.setInterval(checkForUpdate, UPDATE_INTERVAL_MS);
}
