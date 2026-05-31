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
- **Mobile-First UI:** Use a reachable bottom navigation bar, compact workout rows, and phone-sized weight-entry controls during training.
- **Easy Scroll:** Open the workout directory near the current training week while keeping the full plan browsable.
- **Multi Workout:** Add one scheduled workout missed in the previous two calendar days to today's Home session.
- **Installable PWA:** Install the app on iOS and Android for quick access.
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
npm run test:pwa
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

Containerized production PWA preview:

```bash
docker build -t hiit-web-app-local .
docker run --rm -it -p 8080:8080 hiit-web-app-local npm run serve:preview
```

### Installing the PWA on iOS

To install the PWA on an iOS device:

1. Open the app in Safari: [Prod](https://wobbly-atom-periodical.glitch.me/).
2. Tap the **Share** button at the bottom of the screen.
3. Scroll down and select **Add to Home Screen**.
4. Tap **Add** in the top right corner.

The app will now be installed and accessible from your home screen like a native app.

### Service Worker and Offline Caching

Vite generates the service worker and Workbox precache manifest during `npm run build`. The precache includes the app shell, workout data, exercise metadata, manifest, icons, and hashed build assets. Tailwind CSS and Toastify are bundled locally so core UI rendering does not require a CDN.

Use the production preview when reviewing offline behavior:

```bash
npm run build
npm run preview
```

If you encounter issues, ensure that:

1. The service worker is correctly registered in the browser's DevTools under **Application > Service Workers**.
2. You are accessing the app over HTTP or HTTPS, as service workers only work on secure origins.
3. You reload once after the first online visit so the installed service worker controls the page.

### UI Structure

The mobile-first interface is organized under `src/components/`:

- `app-frame.tsx`: route header, version footer, and fixed bottom navigation.
- `home-workout.tsx`: Home-only current-workout and recent missed-workout composition.
- `workout.tsx`: exercise summaries, expanded programming details, set tracking, and free-text weight entry.
- `directory.tsx`: week and workout-day navigation with one-time current-week positioning.
- `history.tsx`: saved-weight search and grouped history.
- `states.tsx`: loading, rest-day, and not-found states.

Shared visual tokens and component classes live in `src/styles.css`. Calendar-safe current-week and recent-workout arithmetic lives in `src/program-schedule.ts`.

### GitHub Pages Deployment

The `CI` workflow keeps pull requests and `staging` pushes check-only. A push to `main` deploys the GitHub Pages artifact only after lint, formatting, typecheck, unit tests, production build verification, mobile end-to-end tests, and PWA offline tests pass.

The workflow builds the repository-path artifact with:

```bash
npm run build:pages
```

One repository setting must be changed manually after the workflow is reviewed and merged:

1. Open **Settings > Pages**.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.
3. Run the `CI` workflow from `main` or merge a reviewed change into `main`.
4. Confirm the `github-pages` environment deployment succeeds.

Until that source switch is made, the production site continues using the legacy `main` branch-root publishing configuration.

### Releases

Use the [release checklist](docs/releases/RELEASE-CHECKLIST.md) for the final refactor cutover. The [rollback runbook](docs/releases/ROLLBACK.md) records the protected pre-refactor production baseline and recovery steps.

- Release the completed refactor as `v4.0.0`.
- Include user-visible changes, migration notes, and known issues.
- Verify install and update behavior manually in iPhone Safari before publishing a release.
- Switch the GitHub Pages source, merge into `main`, verify production, and change the default branch in separate owner-approved steps.
- Keep `staging` available until a later owner-approved cleanup.
