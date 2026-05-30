# HIIT Web App

This is a web app meant to display HIIT workout program

## Links

- GitHub Pages production URL: https://yourfriendfitz.github.io/hiit-web-app/

## Refactor Planning

- RFCs live in `docs/rfcs/`.
- ADRs live in `docs/adr/`.
- Milestone specs live in `docs/specs/`.
- `main` is the accepted long-term production branch, but the remote default branch should not change until GitHub Pages deployment is implemented and verified.

### Features

- **Workout Directory:** Browse workouts by week and day.
- **Track Progress:** Log and view weights for each exercise.
- **Offline Support:** Use the app even without an internet connection.
- **Mobile-Friendly:** Installable as a PWA for easy access on iOS and Android.
- **Toast Notifications:** Get notifications when actions, like saving weights, are completed.

### Prerequisites

Make sure you have [Node.js](https://nodejs.org/) installed. If it’s not installed, follow these steps:

1. Install [nvm](https://github.com/nvm-sh/nvm#install--update-script).
2. Install Node.js using nvm:
   ```bash
   nvm install node
   nvm use node
   ```

### How to Test Locally

1. **Clone the repository:**

   ```bash
   git clone <repository-url>
   cd hiit-web-app
   ```

2. **Install dependencies:**

   ```bash
   npm ci
   ```

3. **Start the local Vite server:**

   ```bash
   npm run serve
   ```

4. **Access the app in your browser:**
   Open [http://localhost:8080](http://localhost:8080) in your browser.

### Checks

Run the full local check suite:

```bash
npm run check
```

Individual checks:

```bash
npm run lint
npm run format:check
npm run typecheck
npm run test
npm run build
npm run test:e2e
```

Containerized check path:

```bash
docker build -t hiit-web-app-checks .
docker run --rm hiit-web-app-checks
```

Containerized local app:

```bash
docker build -t hiit-web-app-local .
docker run --rm -it -p 8080:8080 hiit-web-app-local npm run serve
```

### Installing the PWA on iOS

To install the PWA on an iOS device:

1. Open the app in Safari: [Prod](https://wobbly-atom-periodical.glitch.me/).
2. Tap the **Share** button at the bottom of the screen.
3. Scroll down and select **Add to Home Screen**.
4. Tap **Add** in the top right corner.

The app will now be installed and accessible from your home screen like a native app.

### Service Worker and Offline Caching

The existing service worker is retained during the Vite migration and caches essential files and data. Service worker modernization and runtime CDN removal are scheduled for Milestone 4.

If you encounter issues, ensure that:

1. The service worker is correctly registered in the browser's DevTools under **Application > Service Workers**.
2. You are accessing the app over HTTP or HTTPS, as service workers only work on secure origins.
