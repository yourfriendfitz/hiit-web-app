# Milestone 4 Spec: PWA And GitHub Pages Deployment

Status: Accepted

Owner: Fitz

Created: 2026-05-30T05:58:35-05:00

Accepted: 2026-05-30T09:02:39-05:00

Related RFC: [`RFC 0001`](../rfcs/0001-spec-driven-refactor-plan.md)

Related ADRs:

- [`ADR 0001`](../adr/0001-stack-selection.md)
- [`ADR 0002`](../adr/0002-branch-release-flow.md)
- [`ADR 0003`](../adr/0003-indexeddb-preservation.md)

## Summary

Replace the retained hand-written service worker with generated Workbox precaching through `vite-plugin-pwa` and bundle browser runtime dependencies into the Vite build. Keep a migration-only compatibility worker at the legacy URL during the v4 rollout so installed `v3.0.4` clients can release their stale cache-first shell.

The generated service worker must make the app shell, workout data, exercise metadata, and device-local weight workflows available offline after the first visit. Updates must be discovered automatically, but applying an update must be deferred while a user has unsaved weight input.

GitHub Actions deployment setup was explicitly deferred until after the runtime portion of Milestone 4 was reviewed and accepted. The accepted runtime review is complete, so the remaining workflow and release-guidance follow-up is included before Milestone 4 closes.

## Goals

- Generate a hashed precache manifest from the Vite production build.
- Remove the hard-coded cache version and obsolete static cache list.
- Make the app shell, workout data, directory, and history available offline after the first visit.
- Preserve IndexedDB reads and writes while offline.
- Bundle Tailwind CSS and Toastify instead of loading them from public CDNs at runtime.
- Remove the remote font dependency so core UI rendering does not require the network.
- Detect new service-worker versions automatically.
- Apply updates on a clean app load or when no unsaved weight input is present.
- Remove the manual cache-refresh button once automated update behavior is covered.
- Deploy a checked `main` build to GitHub Pages using the repository base path.
- Document the release and manual verification workflow.

## Non-Goals

- Do not redesign the UI.
- Do not change workout data or exercise metadata.
- Do not change the IndexedDB database, version, store, indexes, or record shape.
- Do not add cloud sync, accounts, import, or export.
- Do not persist set completion checkboxes.
- Do not change the remote default branch or repository Pages settings without explicit owner approval.
- Do not require YouTube embeds to work offline.

## Scope

- Add `vite-plugin-pwa` `1.3.x` and use its Workbox `generateSW` strategy.
- Configure Vite PWA assets and a generated web app manifest from the existing app metadata and icon files.
- Precache generated HTML, hashed JavaScript, hashed CSS, workout JSON, exercise JSON, manifest, and local icon assets.
- Replace the custom cache-first `public/service-worker.js` with a migration-only bridge during the v4 rollout. The generated Workbox worker remains `/sw.js`.
- Remove obsolete legacy runtime modules from `public/` after confirming the generated build does not reference them.
- Replace manual service-worker registration with an explicit registration module using `virtual:pwa-register`.
- Check for service-worker updates on app load and when the document becomes visible.
- Track whether any weight input contains unsaved text.
- If an updated service worker is waiting while weight input is dirty, defer activation until a later clean load or until the dirty state clears.
- If an updated service worker is waiting while the app is clean, activate it and reload once.
- Remove the header cache-refresh button after the automated path is verified.
- Add local Tailwind CSS `4.x` with `@tailwindcss/vite` and move the existing runtime theme values into CSS-first configuration.
- Add the `toastify-js` package and import its CSS through the Vite build while preserving the saved-weight confirmation.
- Use the system font stack rather than fetching Inter at runtime.
- Verify the generated build with `VITE_BASE_PATH=/hiit-web-app/` so the deferred Pages workflow can deploy the same artifact shape.
- Extend `.github/workflows/ci.yml` with a Pages artifact build and deployment path:
  - Run only for pushes to `main` or manual dispatches targeting `main`.
  - Require the existing `checks` job to pass first.
  - Build with `VITE_BASE_PATH=/hiit-web-app/`.
  - Configure Pages with `actions/configure-pages@v6`.
  - Upload `dist/` with `actions/upload-pages-artifact@v5`.
  - Deploy with `actions/deploy-pages@v5`.
  - Grant `pages: write` and `id-token: write` only to the deployment job.
- Add release notes workflow guidance for milestone tags and GitHub Releases.

## Out Of Scope

- Remote repository setting mutations during branch implementation.
- Merging the milestone branch into `main`.
- Triggering a production Pages deployment before owner approval.
- A new visual design system.
- Offline caching for third-party video embeds.
- Background sync or cross-device storage.

## User Impact

After one successful online visit, users can open the app shell, browse workouts, search history, and save weight entries while offline. A new app version is picked up automatically on a clean load without requiring a cache-refresh control. Unsaved weight text must not be discarded by an update reload.

The visual surface should remain materially unchanged. The only intentional visible removal is the manual cache-refresh button.

## Architecture Impact

Vite owns the application asset graph. `vite-plugin-pwa` generates the service worker and precache manifest from the build output, removing the manually maintained list of repository-path URLs.

The window owns update timing. A small registration module observes service-worker update readiness and app dirty state, then explicitly applies a waiting update only when a reload will not discard entered weight text.

Tailwind and Toastify become build-time dependencies. The production app should not require a CSS CDN, a Toastify CDN, or Google Fonts for core rendering.

## Data And Storage Impact

No persisted storage changes are allowed.

Offline verification must prove that:

- Existing IndexedDB records remain readable.
- New weight records can be saved without a network connection.
- Newly saved offline records still appear in Last Weight and History.
- Records remain exactly `{ id, weight, date }`.

## Offline And PWA Impact

Required offline resources:

- App shell.
- Generated hashed JavaScript and CSS.
- `data.json`.
- `exercises.json`.
- Web app manifest.
- Local icons.

Allowed offline failure:

- YouTube embeds and other third-party video requests.

Update policy:

- Detect new versions automatically.
- Do not force a reload while weight input contains unsaved text.
- Apply a waiting version on the next clean load or once the app becomes clean.
- Avoid an update loop by reloading at most once after a successful activation.
- Keep `/service-worker.js` free of fetch interception; it exists only to clear `hiit-app-cache-v*` caches for legacy installed clients without touching IndexedDB.

## Files Likely Touched

- `vite.config.ts`
- `src/main.tsx`
- `src/App.tsx`
- `src/**`
- `index.html`
- `public/**`
- `tests/unit/**`
- `tests/e2e/**`
- `package.json`
- `package-lock.json`
- `README.md`
- `AGENTS.md`

## Acceptance Criteria

- `npm run build` generates a Workbox-backed service worker with a hashed precache manifest.
- The generated Pages build uses `/hiit-web-app/` as its base path.
- The production HTML has no Tailwind CDN, Toastify CDN, or Google Fonts dependency.
- Obsolete legacy runtime files are removed when no longer referenced. `/service-worker.js` remains temporarily as a migration-only bridge.
- After one online visit, the app shell loads offline.
- Today's workout, directory, workout detail, and history routes load offline.
- Existing IndexedDB weight records remain readable offline.
- A weight saved offline appears in Last Weight and History.
- A waiting update activates automatically when the app is clean.
- A waiting update does not reload the page while weight input contains unsaved text.
- The manual cache-refresh button is removed.
- The manifest is generated with the existing app name, theme color, icons, and GitHub Pages-compatible start URL.
- GitHub Actions contains a `main`-only Pages artifact and deployment path gated by the full check job.
- Release guidance documents milestone tags, GitHub Releases, and the manual iPhone Safari install/update check.
- Full containerized checks pass.

## Regression Tests

- Unit test: dirty-state tracking identifies unsaved weight input.
- Unit test: clean state allows a waiting service-worker update to apply.
- Unit test: dirty state defers a waiting service-worker update until the state clears.
- Build assertion: generated `dist/` contains the service worker, web manifest, workout data, exercise metadata, icons, and hashed asset references.
- Build assertion: `dist/service-worker.js` remains a migration-only bridge with no fetch handler.
- Build assertion: generated HTML has no Tailwind CDN, Toastify CDN, or Google Fonts URL.
- Playwright Chromium PWA test: visit online, wait for service-worker control, switch offline, reload, and verify the home route renders.
- Playwright Chromium PWA test: navigate to directory, workout detail, and history while offline.
- Playwright Chromium PWA test: save a weight offline and confirm Last Weight and History update.
- Playwright Chromium PWA test: confirm unsaved weight input is preserved while an update is waiting.
- Existing mobile Chromium and WebKit route, storage, and listener-cleanup tests continue passing.

## Manual QA Checklist

- Build and serve the production preview from Docker.
- Open the app online and confirm the service worker controls the page.
- Reload offline and confirm the home route renders.
- Browse Directory, a workout detail, and History while offline.
- Save a free-text weight while offline and confirm it appears in Last Weight and History.
- Return online and confirm a newly built version is detected.
- Leave weight text unsaved and confirm an update does not reload the page.
- Clear or save the text and confirm the waiting update applies.
- Confirm the refresh button is gone.
- Confirm the installed app manifest uses the expected icon and theme metadata.
- After owner-approved merge and Pages setup, confirm the production URL loads and install/update behavior works in iPhone Safari.

## Rollback Plan

Revert the generated-PWA integration, bundled runtime dependencies, and Pages workflow changes together. Restore the previous service-worker registration and retained static files only if a rollback is required before a corrected generated build is available.

No IndexedDB rollback or migration should be needed because this milestone must not change the persisted storage contract.

## Open Questions

- Runtime implementation is approved.
- GitHub Actions Pages deployment setup and release guidance are now implemented locally for review.
- Enabling GitHub Pages Actions as the repository publishing source remains an explicit owner-approved remote setting change after the workflow is reviewed and merged.

## Research Notes

Research checked at `2026-05-30T12:14:33-05:00`.

- [`vite-plugin-pwa` releases](https://github.com/vite-pwa/vite-plugin-pwa/releases) list `v1.3.0` as the current release from May 5, 2026, including Vite 8 peer support.
- [`vite-plugin-pwa` auto-update guidance](https://github.com/vite-pwa/vite-plugin-pwa/blob/main/docs/guide/auto-update.md) warns that immediate automatic reload can discard in-progress form data. This spec uses explicit deferred activation because the app has weight-entry fields.
- [Tailwind CSS v4 Vite guidance](https://tailwindcss.com/docs/installation/using-vite) uses `@tailwindcss/vite` and local CSS imports instead of the browser CDN runtime.
- [GitHub Pages custom workflow guidance](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) documents Pages artifact uploads and a deployment job with `pages: write`, `id-token: write`, and the `github-pages` environment.
- Official GitHub release APIs reported `actions/checkout` `v6.0.2`, `actions/setup-node` `v6.4.0`, `actions/configure-pages` `v6.0.0`, `actions/upload-pages-artifact` `v5.0.0`, and `actions/deploy-pages` `v5.0.0` as the latest releases. The workflow follows those current major lines.

## Decision Log

- Use generated Workbox precaching through `vite-plugin-pwa` instead of maintaining a service worker cache list manually.
- Retain a migration-only `/service-worker.js` bridge until a later owner-approved cleanup so installed `v3.0.4` registrations can advance to the generated `/sw.js` worker without clearing IndexedDB.
- Use explicit update readiness callbacks and app dirty-state tracking instead of unconditional immediate reload behavior.
- Bundle Tailwind CSS and Toastify locally.
- Use the system font stack to eliminate a core-rendering network dependency without adding font artifacts.
- Add the Pages deployment workflow after runtime acceptance and keep the remote publishing-source switch as an explicit post-merge action.
