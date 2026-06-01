# RFC 0001: Spec-Driven Refactor Plan

Status: Accepted

Owner: Fitz

Created: 2026-05-29

Accepted: 2026-05-29T15:51:43-05:00

Research timestamp: 2026-05-29T15:33:49-05:00

Source questionnaire: [`docs/refactor-rfc-questionnaire.md`](../refactor-rfc-questionnaire.md)

## Summary

Refactor the current HIIT workout PWA into a maintainable, tested, mobile-first, client-only application hosted on GitHub Pages. The refactor must preserve the existing IndexedDB weight history contract, keep the expert-authored workout data as the source of truth, improve offline/update behavior, and introduce a spec-driven process where each milestone has acceptance criteria before implementation starts.

Recommended direction:

- Move from plain JavaScript to React, TypeScript, and Vite.
- Keep the app fully static and backend-free for GitHub Pages.
- Keep all user data local to the device through the existing IndexedDB database and object store.
- Replace CDN runtime dependencies with bundled assets where practical to improve offline reliability.
- Add unit tests, browser tests, linting, formatting, type checking, and GitHub Actions gates.
- Add GitHub Releases for milestone releases.
- Implement new features only after safety infrastructure and feature parity are proven.

## Current Baseline

The current repository baseline is `origin/main` at `2ef93c0` (`3.0.4 (#14)`). It is a static PWA with no package manifest, build system, type checking, or automated tests.

Important current files:

- `index.html` loads the app shell, Tailwind CDN configuration, Inter font CSS, Toastify, and local scripts.
- `app.js` owns routing, workout rendering, current workout calculation, and IndexedDB access.
- `Header.js`, `History.js`, and `LastWeight.js` are Web Components.
- `service-worker.js` owns asset caching and offline behavior.
- `data.json` contains 48 weeks, 240 workout days, and 1,632 exercise slots. It must not be changed.
- `exercises.json` contains 111 exercise metadata records.

Known baseline issues to account for:

- After the 48-week program ends, `app.js` currently falls through to the rest-day state. Required behavior is to continue showing the last available week.
- `service-worker.js` hard-codes `/hiit-web-app/` asset URLs; offline and local-build behavior need browser verification before relying on them during the refactor.
- `LastWeight` listener cleanup uses separate `bind(this)` calls, so disconnect cleanup does not remove the original listener.
- Runtime CDN dependencies weaken the offline guarantee.

## Goals

- Preserve current must-have behavior.
- Preserve existing IndexedDB user data.
- Keep the app backend-free and account-free.
- Host production on GitHub Pages.
- Use small, reviewable milestones.
- Use RFCs, milestone specs, and ADRs to control scope and prevent drift.
- Improve mobile UX for iPhone-first usage.
- Improve offline reliability without trapping users on stale versions.
- Add two planned features after refactor safety is in place:
  - Easy Scroll: auto-scroll the week directory to the current week.
  - Multi Workout: add one of the previous two scheduled workouts to today's workout screen.

## Non-Goals

- No backend.
- No cloud sync.
- No accounts.
- No user-created workout plans.
- No workout data editing.
- No IndexedDB schema migration in the initial refactor.
- No persistence for set completion checkboxes.
- No Glitch support.
- No accessibility certification project.
- No broad desktop-first redesign.

## Hard Constraints

- `data.json` is expert-authored source content and must not be modified.
- Existing IndexedDB data must remain usable.
- Existing IndexedDB database name, store name, and record shape are compatibility-sensitive.
- The app must remain deployable as static files.
- The app must remain simple to run locally.
- The unsuccessful outcome to avoid is affecting IndexedDB integration or user weight history.

## Recommended Stack

Use a conservative modern stack:

- React 19.x for UI.
- TypeScript for type safety.
- Vite 8.x for build/dev tooling.
- Vitest for unit tests.
- Playwright for end-to-end and mobile-browser regression coverage.
- Tailwind CSS 4.x plus CSS variables for a compact mobile-first design system.
- Vite PWA integration backed by Workbox for service worker generation and update behavior.
- GitHub Actions for CI and GitHub Pages deployment.

Rationale:

- React plus Vite is a mainstream static-app stack that fits GitHub Pages.
- TypeScript directly addresses the current lack of contracts around workout data, IndexedDB records, and route parameters.
- Vitest reuses Vite's transform pipeline, keeping tests aligned with the app build.
- Playwright can cover Chromium, WebKit, and mobile Safari-style profiles, which matches the stated Safari and Chrome requirement.
- Tailwind CSS 4 gives a current styling workflow while still allowing a real design system through tokens and component classes.
- Workbox reduces hand-rolled service worker risk and provides a better model for window-to-service-worker update communication.

Rejected or deferred:

- Next.js: unnecessary because the app is static, backend-free, and GitHub Pages-hosted.
- Backend-as-a-service: conflicts with local-only data and no accounts.
- IndexedDB schema redesign: explicitly deferred to protect existing user data.
- Component library by default: defer until a specific UI need justifies it. Prefer a small internal design system first.

## Branch And Release Recommendation

Recommended branch flow:

- Use `main` as the production branch and GitHub Pages deployment source.
- Use short-lived feature branches for each spec or milestone.
- Require pull requests into `main`.
- Require CI checks before merge.
- Use squash merge for feature work to keep history readable.
- Retire `staging` after the GitHub Pages workflow is stable, unless a specific preview need appears.

Recommended release flow:

- Create GitHub Releases for completed milestones.
- Tag milestone releases as `v0.1.0`, `v0.2.0`, and so on until the refactor is complete.
- Release the completed refactor as `v4.0.0` after feature parity, PWA update behavior, and the two planned features are done.
- Each release should include user-visible changes, migration notes, and known issues.

Decision:

- Use `main` as the long-term production branch and GitHub Pages deployment source.
- Do not change the remote default branch until the deployment workflow is implemented and verified in a later milestone.

## Spec-Driven Process

All implementation work should be driven by specs.

Required document types:

- RFCs live in `docs/rfcs/`.
- ADRs live in `docs/adr/`.
- Milestone specs live in `docs/specs/`.

RFC requirements:

- Problem statement.
- Goals and non-goals.
- User impact.
- Architecture impact.
- Data/storage impact.
- Offline/PWA impact.
- Acceptance criteria.
- Test plan.
- Rollback plan.
- Explicit owner approval before implementation.

ADR requirements:

- Decision.
- Context.
- Options considered.
- Consequences.
- Date.

Milestone spec requirements:

- Scope.
- Non-scope.
- Files likely touched.
- Acceptance criteria.
- Regression tests.
- Manual QA checklist.
- Rollback notes.

## Quality Gates

The target checks should block merges once introduced:

- TypeScript typecheck.
- Lint.
- Format check.
- Unit tests.
- Playwright smoke tests.
- Production build.
- Service worker/PWA manifest validation where feasible.

Minimum browser targets:

- Mobile Safari profile through Playwright WebKit.
- Mobile Chrome profile through Playwright Chromium.
- Manual iPhone Safari install/update verification before major releases.

Recommended local commands after the tooling milestone:

- `npm run typecheck`
- `npm run lint`
- `npm run format:check`
- `npm run test`
- `npm run test:e2e`
- `npm run build`

Container note:

- GitHub Pages does not run containers at runtime.
- A container can still be used for local development and CI parity.
- Add a minimal dev/test container only if it reduces setup friction; do not make hosting depend on it.

## IndexedDB Compatibility Contract

The refactor must treat IndexedDB as a compatibility contract.

Initial contract:

- Database name: `hiit-app-db`.
- Object store: `Weights`.
- Existing record shape: `{ id, weight, date }`.
- `id` remains the exercise identifier.
- `weight` remains free text.
- `date` remains parseable as a date.

Implementation rules:

- Do not change the database name in the initial refactor.
- Do not change the object store name in the initial refactor.
- Do not require a schema migration in the initial refactor.
- Introduce a thin storage adapter around the existing behavior.
- Add characterization tests before changing UI code that calls storage.
- Add a manual verification path with seeded local IndexedDB data.

Decision:

- Moving storage code behind an adapter is acceptable as long as the persisted database name, object store name, and record shape remain unchanged.

## Data Contract

The workout program is source content.

Rules:

- Do not change `data.json` content.
- Do not change exercise IDs.
- Do not change week/day ordering.
- Allow generated TypeScript types and validation around the data.
- Allow file relocation only if content is byte-for-byte equivalent or verified by snapshot tests.

Required behavior:

- On load, show today's workout based on the fixed program start date.
- If the calculated week is beyond available data, show the final available week.
- Allow users to browse all weeks and days.
- Keep YouTube embeds for exercise videos.
- Keep weight history searchable by exercise.

## PWA And Offline Strategy

Required offline behavior:

- App shell loads offline.
- Today's workout loads offline.
- Directory loads offline.
- Exercise metadata loads offline.
- Saving weight entries works offline through IndexedDB.
- Weight history works offline.
- YouTube videos are allowed to fail offline.

Required update behavior:

- Users should not need to manually refresh the cache.
- New app versions should activate automatically on load.
- The app should avoid forcing a reload while a user is actively entering a weight.
- Cache should use versioned, hashed build assets rather than timestamp-only cache names.
- Window-to-service-worker communication must be explicit and tested.

Recommended approach:

- Use Vite build output with hashed assets.
- Use Workbox or Vite PWA integration for precaching and service worker generation.
- Use an auto-update policy that checks on app load and page visibility changes.
- If an update is available during active use, defer reload until safe.

Decision:

- Prefer automatic update on the next clean app load rather than forcing an immediate reload while a user is mid-session.

## UX Direction

The app should become mobile-first, not merely responsive.

Principles:

- Optimize for iPhone Safari.
- Prioritize fast workout entry over decorative complexity.
- Keep touch targets comfortable.
- Keep navigation reachable one-handed.
- Make the current workout obvious on launch.
- Reduce scroll fatigue.
- Use clear hierarchy for exercises, sets, reps, rest, notes, and weight entry.
- Keep dark-friendly contrast if using a dark theme, or choose a strong modern palette with equivalent readability.

Accessibility note:

- The questionnaire says accessibility is not required for current users.
- This RFC still recommends baseline accessibility because semantic controls, labels, focus states, contrast, and touch targets are part of mobile UI best practices.
- Do not pursue a formal accessibility certification unless requested later.

## Milestone Plan

### Milestone 0: Planning Approval

Purpose:

Create the governance docs needed before implementation.

Scope:

- Approve RFC 0001.
- Create ADR 0001 for stack selection.
- Create ADR 0002 for branch and release flow.
- Create ADR 0003 for IndexedDB preservation.
- Create the spec template.

Acceptance criteria:

- Owner approves RFC.
- Open decisions in this RFC are resolved or explicitly deferred.
- Every future milestone has a spec before code changes.

### Milestone 1: Safety And Regression Harness

Purpose:

Capture current behavior before refactoring.

Scope:

- Add package tooling without changing app behavior.
- Add linting, formatting, and typecheck placeholders as appropriate.
- Add Playwright smoke tests against the current static app.
- Add tests for current launch route, directory route, history route, and weight save flow.
- Add a local static-server command.
- Add CI that runs the initial checks.

Acceptance criteria:

- Current app can be served locally from a scripted command.
- Playwright verifies current workout page loads.
- Playwright verifies a weight can be saved and last weight updates.
- Playwright verifies directory navigation works.
- CI runs on pull requests.
- No production behavior changes.

### Milestone 2: Modern Build Foundation

Purpose:

Introduce Vite, TypeScript, and React without changing the product surface.

Scope:

- Create Vite app structure.
- Move static assets into the Vite-compatible layout.
- Add React app shell.
- Preserve hash or static-compatible routing for GitHub Pages.
- Keep `data.json` content unchanged.
- Add typed data loading boundaries.
- Keep existing IndexedDB database and store untouched.

Acceptance criteria:

- `npm run build` emits static assets deployable to GitHub Pages.
- App loads locally from built output.
- Current workout still appears on load.
- Directory still works.
- Weight input still writes to the existing IndexedDB store.
- Existing Playwright smoke tests pass.

### Milestone 3: Storage Adapter And Feature Parity

Purpose:

Make IndexedDB access explicit and testable while preserving data.

Scope:

- Introduce a storage adapter around existing IndexedDB behavior.
- Add tests for reading and writing existing weight records.
- Port Last Weight and History behavior to React.
- Fix the `LastWeight` lifecycle listener issue during component replacement.
- Keep weight input free text.

Acceptance criteria:

- Existing `hiit-app-db` and `Weights` records remain readable.
- New saved records match the existing record shape.
- Last Weight displays the most recent entry.
- History search works by exercise.
- No IndexedDB schema migration is required.

### Milestone 4: PWA And GitHub Pages Deployment

Purpose:

Make offline behavior and updates reliable.

Scope:

- Replace hand-rolled cache timestamping with generated precache assets.
- Configure service worker update behavior.
- Bundle runtime dependencies needed for offline use.
- Add GitHub Actions build and Pages deployment.
- Add release notes workflow guidance.

Acceptance criteria:

- App shell and workout data load offline after first visit.
- Weight saves work offline.
- New versions update automatically on clean app load.
- GitHub Pages deployment succeeds from the production branch.
- Manual cache refresh button is removed unless still justified by testing.

### Milestone 5: Mobile UI System

Purpose:

Improve the UI while preserving user workflows.

Scope:

- Introduce design tokens and a mobile-first component system.
- Replace CDN/style-dependent legacy UI with internal components.
- Improve navigation for iPhone.
- Improve exercise cards, accordions, and weight input ergonomics.
- Apply a current palette and typography direction.

Acceptance criteria:

- Current workout remains the default landing experience.
- Primary actions are reachable and obvious on mobile.
- Weight entry requires fewer awkward taps.
- Directory and History remain accessible.
- Playwright mobile profiles pass.

### Milestone 6: Easy Scroll Feature

Purpose:

Reduce friction in the week-by-week directory.

Scope:

- Auto-scroll the directory to the current week on load.
- Prefer smooth scrolling when supported.
- Optionally scroll to the current day if the layout supports it cleanly.

Acceptance criteria:

- Opening the directory lands near the current week.
- Behavior is deterministic in tests with a mocked current date.
- Users can still manually browse previous and future weeks.

### Milestone 7: Multi Workout Feature

Purpose:

Allow users who missed a workout to add a recent previous workout to today's workout screen.

Scope:

- Add a UX affordance on the current workout screen.
- Limit quick-add options to the previous two scheduled workouts, skipping rest days.
- Show both the current workout and selected target workout.
- Preserve independent weight entry per exercise.

Acceptance criteria:

- User can add an eligible previous workout to today's screen.
- Both workout sections render clearly.
- Weight save still associates entries with the correct exercise IDs.
- Feature works offline because it only uses bundled program data.

### Milestone 8: Stabilization And v4.0.0 Release

Purpose:

Finalize the refactor and release the app as the new production baseline.

Scope:

- Regression pass.
- Mobile Safari manual verification.
- Chrome manual verification.
- Offline/update manual verification.
- Documentation cleanup.
- GitHub Release.

Acceptance criteria:

- All automated checks pass.
- Manual verification passes on iPhone Safari.
- IndexedDB data survives upgrade testing.
- Both new features are implemented.
- GitHub Release `v4.0.0` is published.

## Rollback Strategy

Before the new GitHub Pages deployment becomes production:

- Keep the current static app available on the previous branch or tag.
- Tag the pre-refactor baseline.
- Do not delete the old implementation until the new app is verified.

For failed milestones:

- Revert the feature branch before merge.
- If already merged, use a normal revert commit.
- Do not run destructive remote operations.
- Do not alter IndexedDB compatibility to fix non-storage issues.

## Acceptance Decision Log

1. `main` is accepted as the long-term production/default branch, but the remote default branch will not be changed until GitHub Pages deployment is implemented and verified.
2. React, TypeScript, Vite, Tailwind CSS, Vitest, Playwright, and Vite PWA are accepted as the target stack.
3. An IndexedDB adapter is accepted if the database name, store name, and record shape remain unchanged.
4. Automatic updates should prefer next-clean-load activation rather than immediate mid-session reload.
5. File relocation for `data.json` is acceptable only if tests prove content and ordering are unchanged.
6. A minimal dev/test container is deferred; add it only if it materially improves setup or CI parity.
7. The completed refactor release is `v4.0.0`, preserving monotonic product numbering after the live `v3.0.4` baseline.

## References

- React versions: https://react.dev/versions
- Vite releases and supported versions: https://vite.dev/releases
- Vite static deploy guide: https://vite.dev/guide/static-deploy
- GitHub Pages publishing sources: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
- Vitest overview: https://vitest.dev/
- Playwright browser support: https://playwright.dev/docs/browsers
- Workbox PWA guidance: https://web.dev/learn/pwa/workbox/
- Vite PWA plugin: https://github.com/vite-pwa/vite-plugin-pwa
- Tailwind CSS v4 announcement: https://tailwindcss.com/blog/tailwindcss-v4
