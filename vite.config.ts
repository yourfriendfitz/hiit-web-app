import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: process.env.VITE_BASE_PATH || "./",
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      injectRegister: false,
      registerType: "prompt",
      manifest: {
        name: "PPL Gooners",
        short_name: "PPLG",
        description: "Track your PPL workout program with offline support",
        start_url: "./",
        scope: "./",
        display: "standalone",
        background_color: "#09090b",
        theme_color: "#10b981",
        orientation: "portrait",
        categories: ["fitness", "health", "sports"],
        icons: [
          {
            src: "android-chrome-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "android-chrome-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        globPatterns: ["**/*.{js,css,html,ico,png,json,webmanifest}"],
        navigateFallback: "index.html",
      },
    }),
  ],
  server: {
    host: "0.0.0.0",
  },
  preview: {
    host: "0.0.0.0",
  },
});
