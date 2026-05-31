# Repo Instructions

## Container Workflow

- Use containers for dependency installation and project checks by default.
- Use the Playwright base image pinned to the project Playwright version: `mcr.microsoft.com/playwright:v1.60.0-noble`.
- Build the check image with `docker build -t hiit-web-app-checks .`.
- Run all checks with `docker run --rm hiit-web-app-checks`.
- GitHub Pages hosting remains static; the container is only for local and CI tooling.

## Project Commands

- Local Vite app: `npm run serve`
- Production build: `npm run build`
- GitHub Pages-compatible build: `npm run build:pages`
- Production preview: `npm run preview`
- Build and serve production preview: `npm run serve:preview`
- Lint: `npm run lint`
- Format check: `npm run format:check`
- Typecheck: `npm run typecheck`
- Unit tests: `npm run test`
- E2E tests: `npm run test:e2e`
- PWA offline tests: `npm run test:pwa`
- Full check: `npm run check`

## PWA Review

- Use `npm run serve:preview` for authoritative offline and service-worker review.
- Reload once after the first online visit so the installed service worker controls the page.
- `npm run serve` remains the fast development path, not the production PWA verification path.

## UI Ownership

- `src/App.tsx` coordinates routes and data loading.
- `src/components/app-frame.tsx` owns the route header and fixed bottom navigation.
- `src/components/home-workout.tsx` owns Home-only current and missed-workout composition.
- `src/components/workout.tsx` owns exercise cards and weight entry.
- `src/components/directory.tsx` and `src/components/history.tsx` own their route surfaces.
- `src/program-schedule.ts` owns calendar-safe current-week and recent-workout calculations.
- `src/styles.css` owns shared design tokens and stable component classes.
- Preserve the `44px` minimum touch targets and iPhone safe-area padding when changing navigation or workout controls.
