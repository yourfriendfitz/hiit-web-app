# Milestone 2 Spec: Modern Build Foundation

Status: Accepted

Owner: Fitz

Created: 2026-05-29T17:28:13-05:00

Accepted: 2026-05-29T19:24:40-05:00

Related RFC: [`RFC 0001`](../rfcs/0001-spec-driven-refactor-plan.md)

Related ADRs:

- [`ADR 0001`](../adr/0001-stack-selection.md)
- [`ADR 0002`](../adr/0002-branch-release-flow.md)
- [`ADR 0003`](../adr/0003-indexeddb-preservation.md)

## Summary

Introduce the production build foundation for the refactor: Vite, TypeScript, and React. The app should become buildable into static assets for GitHub Pages while preserving the current product surface and existing IndexedDB storage contract.

This milestone is allowed to use a bridge implementation. React should own the app entry point, routing shell, and typed data boundaries, but existing Web Components may remain temporarily where keeping them reduces storage and behavior risk. Full storage adapter work and full React parity for Last Weight and History remain Milestone 3 scope.

## Goals

- Add a Vite-powered static build.
- Add TypeScript compilation and type checking.
- Add a React app shell that preserves the current routes and core screens.
- Keep current hash routes working for GitHub Pages compatibility.
- Keep `data.json` and `exercises.json` content unchanged.
- Preserve the existing IndexedDB database name, object store name, and record shape.
- Keep the Milestone 1 regression tests meaningful during the migration.

## Non-Goals

- Do not redesign the UI.
- Do not replace all Web Components if that widens the milestone.
- Do not introduce an IndexedDB storage adapter yet.
- Do not change the IndexedDB schema or require a migration.
- Do not rewrite service worker/update behavior yet.
- Do not configure GitHub Pages deployment yet.
- Do not implement Easy Scroll or Multi Workout.

## Scope

- Add Vite, React, TypeScript, and related configuration.
- Add `npm run build` and `npm run typecheck`.
- Update `npm run check` so typecheck and build are part of the standard gate.
- Move or reference static assets in a Vite-compatible layout.
- Add typed loading/validation boundaries for workout and exercise data.
- Preserve hash routes:
  - `#/`
  - `#/directory`
  - `#/history`
  - `#/workout?week=<index>&day=<index>`
- Preserve current workout launch behavior, including rest-day behavior.
- Preserve directory browsing and selected workout rendering.
- Preserve free-text weight save behavior against `hiit-app-db` and `Weights`.
- Keep Playwright mobile Chromium and WebKit smoke coverage passing.
- Update README and repo instructions for the new build commands.

## Out Of Scope

- Workbox or Vite PWA integration.
- Service worker cache strategy changes.
- GitHub Pages deployment workflow.
- Runtime dependency bundling beyond what is necessary for the Vite app to build.
- Full UI component system.
- Storage adapter tests beyond preserving existing smoke coverage.

## User Impact

Users should see no intentional product behavior change. The app should still open to today's workout or rest-day state, allow directory browsing, allow weight entry, and show saved weight history.

Developers will see new Vite commands and a generated static build output.

## Architecture Impact

The application will move from direct browser script loading to a bundled app entry point. Expected new boundaries:

- `src/main.tsx` or equivalent React entry.
- `src/App.tsx` or equivalent app shell.
- Typed workout/exercise data modules.
- Small route helpers for the existing hash route contract.
- Build output under Vite's configured output directory.

Existing custom elements may be imported or retained during this bridge milestone if they preserve behavior with less risk. Any retained legacy pieces should be explicitly marked for Milestone 3 replacement.

## Data And Storage Impact

`data.json` and `exercises.json` must remain content-equivalent to the current files. If either file moves, tests must verify the source content hash or parsed shape remains unchanged.

IndexedDB compatibility remains mandatory:

- Database name: `hiit-app-db`
- Object store: `Weights`
- Record shape: `{ id, weight, date }`
- `id` remains the exercise identifier.
- `weight` remains free text with the current appended set/reps/RPE details where applicable.
- `date` remains parseable as a date.

This milestone may reorganize code that calls IndexedDB, but it must not introduce a schema migration or rename the database/store.

## Offline And PWA Impact

No intentional offline or service worker behavior change is included. If the Vite entry changes how the service worker is loaded, the behavior must be documented and the migration must avoid weakening the current app shell behavior.

The generated build may temporarily retain existing service worker files until Milestone 4 replaces the cache strategy.

## Files Likely Touched

- `package.json`
- `package-lock.json`
- `index.html`
- `tsconfig.json`
- `vite.config.ts`
- `src/**`
- `public/**`
- `tests/**`
- `.github/workflows/ci.yml`
- `Dockerfile`
- `AGENTS.md`
- `README.md`

## Acceptance Criteria

- `npm run typecheck` exists and passes.
- `npm run build` emits static assets deployable to GitHub Pages.
- `npm run check` runs lint, format check, typecheck, unit tests, build, and Playwright tests.
- The built app can be served locally and loaded in a browser.
- The current workout or rest-day route still renders on `#/`.
- The directory route still renders all weeks and workout links.
- A selected workout route still renders exercise details.
- Weight input still writes records to `hiit-app-db` / `Weights`.
- History access remains available and can show a saved weight.
- `data.json` content is unchanged.
- `exercises.json` content is unchanged.
- Existing Milestone 1 Playwright smoke tests pass or are updated only to account for equivalent Vite-served selectors/structure.
- CI runs the expanded check suite in the pinned Playwright container image.

## Regression Tests

- Unit test that workout data and exercise metadata remain content-equivalent.
- Unit test typed data loading rejects malformed required fields where practical.
- Playwright launch test for current workout/rest-day route.
- Playwright directory navigation test.
- Playwright selected workout route test.
- Playwright weight save and history visibility test.
- Build-output smoke test by serving the built app rather than only the dev/static source.

## Manual QA Checklist

- Run the full containerized check path.
- Serve the production build locally.
- Open the app at the local build URL.
- Confirm today's route shows a workout or rest-day state.
- Navigate to Directory.
- Open a specific workout.
- Save a free-text weight.
- Navigate to History and confirm the saved entry appears.
- Refresh the browser on a hash route and confirm the route still loads.

## Rollback Plan

Revert the Vite/React/TypeScript migration files and restore the Milestone 1 static app harness. Because this milestone must not change IndexedDB schema or workout data content, rollback should not require user data migration.

## Open Questions

- None.

## Decision Log

- Vite `8.0.14`, React `19.2.6`, and TypeScript `6.0.3` are pinned through `package-lock.json`.
- Vite uses a relative base path so the generated static assets work from the GitHub Pages repository path and from local preview.
- Workout data, exercise metadata, icons, manifest, and the existing service worker are preserved under `public/` so Vite copies them into the static build unchanged.
- Service worker modernization and runtime CDN removal remain Milestone 4 scope.
