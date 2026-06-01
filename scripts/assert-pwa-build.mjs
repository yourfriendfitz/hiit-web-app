import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const distPath = new URL("../dist/", import.meta.url);
const requiredFiles = [
  "android-chrome-192x192.png",
  "android-chrome-512x512.png",
  "apple-touch-icon.png",
  "data.json",
  "exercises.json",
  "favicon.ico",
  "index.html",
  "manifest.webmanifest",
  "sw.js",
];
const removedLegacyFiles = [
  "Header.js",
  "History.js",
  "LastWeight.js",
  "app.js",
  "manifest.json",
  "register.js",
  "service-worker.js",
  "styles.css",
];

const fail = (message) => {
  throw new Error(`PWA build verification failed: ${message}`);
};

for (const fileName of requiredFiles) {
  if (!existsSync(new URL(fileName, distPath))) {
    fail(`missing dist/${fileName}`);
  }
}

for (const fileName of removedLegacyFiles) {
  if (existsSync(new URL(fileName, distPath))) {
    fail(`obsolete dist/${fileName} is still emitted`);
  }
}

const html = readFileSync(new URL("index.html", distPath), "utf8");
const serviceWorker = readFileSync(new URL("sw.js", distPath), "utf8");
const assetNames = readdirSync(new URL("assets/", distPath));

if (
  /https:\/\/(?:cdn\.tailwindcss\.com|cdn\.jsdelivr\.net|fonts\.googleapis\.com|fonts\.gstatic\.com)/.test(
    html,
  )
) {
  fail("index.html still loads a runtime CDN dependency");
}

if (!/manifest\.webmanifest/.test(html)) {
  fail("index.html does not reference the generated web manifest");
}

if (!assetNames.some((fileName) => /^index-[\w-]+\.js$/.test(fileName))) {
  fail("hashed JavaScript bundle was not emitted");
}

if (!assetNames.some((fileName) => /^index-[\w-]+\.css$/.test(fileName))) {
  fail("hashed CSS bundle was not emitted");
}

for (const fileName of [
  "data.json",
  "exercises.json",
  "index.html",
  "manifest.webmanifest",
]) {
  if (!serviceWorker.includes(`url:"${fileName}"`)) {
    fail(`sw.js does not precache ${fileName}`);
  }
}

if (!serviceWorker.includes("SKIP_WAITING")) {
  fail("sw.js does not expose explicit update activation messaging");
}

console.log(`Verified generated PWA build in ${join(distPath.pathname, "")}`);
