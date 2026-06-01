# Milestone 8 Spec: Stabilization And v4 Release

Status: Accepted

Owner: Fitz

Created: 2026-05-30T19:48:47-05:00

Accepted: 2026-05-30T20:03:40-05:00

Related RFC: [`RFC 0001`](../rfcs/0001-spec-driven-refactor-plan.md)

Related ADRs:

- [`ADR 0001`](../adr/0001-stack-selection.md)
- [`ADR 0002`](../adr/0002-branch-release-flow.md)
- [`ADR 0003`](../adr/0003-indexeddb-preservation.md)

## Summary

Stabilize the completed refactor, document the production cutover, and release the checked application as the new GitHub Pages baseline. This milestone does not introduce a product feature. It closes remaining release-readiness gaps, performs the full automated and manual regression pass, verifies IndexedDB upgrade safety, and executes a controlled Pages transition only after explicit owner approval.

The remote repository currently keeps `staging` as its default branch and publishes GitHub Pages from the legacy `main` branch root. Milestone 4 added the checked GitHub Actions Pages workflow but intentionally left the repository settings unchanged. This milestone completes that deferred cutover, verifies production, changes the default branch to `main` after Pages is stable, and publishes the approved release.

## Goals

- Prove the replayed Milestones 1 through 7 behave as one stable release candidate.
- Preserve existing device-local weight history through the production upgrade.
- Confirm Home, Directory, History, Easy Scroll, Multi Workout, PWA installability, offline use, and deferred update behavior on supported phone browsers.
- Normalize release documentation and version surfaces for `v4.0.0`.
- Keep production rollback straightforward and documented.
- Switch GitHub Pages from legacy branch-root publishing to the reviewed GitHub Actions workflow only after explicit owner approval.
- Move the remote default branch from `staging` to `main` only after the production Pages deployment is verified.
- Publish the approved Git tag and GitHub Release after production verification.

## Non-Goals

- Do not add new workout features.
- Do not redesign the mobile UI.
- Do not change workout programming, exercise metadata, or exercise IDs.
- Do not change the IndexedDB schema, database name, store name, indexes, or saved record shape.
- Do not add accounts, cloud sync, or a backend.
- Do not retire or delete remote branches automatically.
- Do not mutate GitHub repository settings, merge into `main`, create tags, or publish a GitHub Release without explicit owner approval for the release step.

## Scope

### Release Candidate Audit

- Treat `refactor/milestone-8-stabilization` as the release-candidate branch.
- Keep its ancestry deterministic:
  - Start from the current `origin/main` production baseline.
  - Replay accepted Milestones 1 through 7 in order.
  - Add only stabilization fixes and release documentation after this spec is accepted.
- Run the full containerized check suite from a clean Docker image.
- Run the GitHub Pages repository-path build from the clean image.
- Run `actionlint` against the deployment workflow.
- Confirm `git diff --check` remains clean.
- Confirm the production preview returns `200` for `/`, `/sw.js`, and `/manifest.webmanifest`.
- Confirm the generated Pages artifact references `/hiit-web-app/` paths and includes the generated manifest and service worker.
- Confirm workout data and exercise metadata contract tests still pass without source-content edits.
- Fix only release-blocking regressions discovered during this audit.
- Keep historical records visible and searchable by raw exercise ID when current exercise metadata no longer contains that ID.
- Persist `N/A` rather than `undefined` when optional RPE context is absent from a newly saved weight.

### Version And Release Documentation

- Use `v4.0.0` consistently for the visible footer, package metadata, Git tag, release notes, and GitHub Release title. This preserves monotonic product numbering after the live `v3.0.4` baseline.
- Add a concise release note document covering:
  - User-visible changes.
  - IndexedDB compatibility statement.
  - PWA update notes.
  - Manual production verification record.
  - Known issues, or an explicit `None known`.
  - Rollback reference.
- Update contributor and deployment documentation so the final branch, Pages source, verification sequence, and release procedure are current.
- Record the pre-refactor production baseline commit `2ef93c0cc5db8b4cad6ced6311434a62bad0e75a` in the rollback instructions.

### Manual Upgrade Verification

- Verify on a device or browser profile with legacy-compatible IndexedDB records:
  - Seed or retain records shaped exactly as `{ id, weight, date }`.
  - Load the release candidate.
  - Confirm Last Weight and History still display the retained records.
  - Save a new free-text weight.
  - Reload and confirm old and new records remain available.
- Verify the primary mobile workflows:
  - Home loads the correct scheduled workout.
  - Directory positions near the current week and remains freely scrollable.
  - History search and grouped entries remain usable.
  - Multi Workout shows eligible prior-day options on a scheduled weekday.
  - A missed workout can be added, used for weight entry, and removed.
- Verify PWA behavior:
  - Install or open the app from iPhone Safari.
  - Load once online, reload under service-worker control, then open core routes offline.
  - Save and read weights offline.
  - Confirm a newly deployed version activates on a clean app load.
  - Confirm unsaved weight text defers a waiting-version reload until the form becomes clean.
- Verify Chrome mobile behavior for the same core routes and saved-weight flow.

### Controlled Production Cutover

Remote mutations are deferred until the local release candidate is reviewed and the owner explicitly approves the cutover.

After approval:

1. Push the release-candidate branch and open a pull request into `main`.
2. Confirm pull-request checks pass.
3. Preserve a rollback reference for the pre-refactor production baseline.
4. Change **Settings > Pages > Build and deployment > Source** from legacy branch publishing to **GitHub Actions**.
5. Merge the reviewed release candidate into `main`.
6. Confirm the `CI` workflow checks, Pages artifact build, and `github-pages` deployment succeed from `main`.
7. Verify the production URL: `https://yourfriendfitz.github.io/hiit-web-app/`.
8. Perform the production upgrade, IndexedDB, install, offline, and update checks.
9. Change the repository default branch from `staging` to `main`.
10. Publish the approved release tag and GitHub Release.

Do not delete `staging` during this milestone. Retire it only in a separate owner-approved cleanup after production has remained stable.

## Out Of Scope

- New product features.
- Workout data edits.
- IndexedDB migration.
- Cloud backup or export.
- Permanent preview or staging hosting.
- Automatic deletion of legacy branches.
- Dependency upgrades unrelated to a verified release blocker.
- Broad refactors discovered during stabilization.

## User Impact

Users receive the refactored mobile-first app at the existing GitHub Pages URL. Existing local weight history remains available. The release includes reliable offline behavior, safer PWA updates, the current-week Directory position, and the Home missed-workout quick-add workflow.

The cutover must not require users to clear browser data, reinstall the PWA, or recreate saved weight history.

## Architecture Impact

No architecture change is planned. The milestone may make narrowly scoped fixes if the release audit finds a blocker.

Expected documentation work:

- Add release notes and a rollback runbook.
- Update `README.md` deployment and release guidance to reflect the final production flow.
- Update `AGENTS.md` only if the verified container or release workflow changes.

Expected version work:

- Align `src/types.ts` `APP_VERSION`.
- Align `package.json` and `package-lock.json` package metadata where appropriate.
- Use the selected version for release notes, Git tag, and GitHub Release title.

## Data And Storage Impact

No persisted data changes are allowed.

- `public/data.json` remains unchanged.
- `public/exercises.json` remains unchanged.
- Database name remains `hiit-app-db`.
- Database version remains `1`.
- Object store remains `Weights`.
- Existing indexes remain unchanged.
- Record shape remains exactly `{ id, weight, date }`.
- `id` remains the authored exercise identifier.
- `weight` remains free text with the existing appended programming context.
- `date` remains parseable as a date.

The release must be verified against seeded or retained legacy-compatible records before production cutover.

## Offline And PWA Impact

No service-worker strategy change is planned. The milestone verifies the generated Workbox precache, repository-path Pages artifact, offline route behavior, offline IndexedDB saves, and deferred waiting-version activation policy.

If a release-blocking PWA defect is discovered, fix it narrowly and extend the existing PWA regression test before cutover.

## Files Likely Touched

- `docs/specs/0008-stabilization-and-v4-release.md`
- `docs/releases/**`
- `README.md`
- `AGENTS.md`
- `src/components/history.tsx`
- `src/components/workout.tsx`
- `src/types.ts`
- `package.json`
- `package-lock.json`
- `.github/workflows/ci.yml`
- `tests/**`

Only touch workflow, source, or test files when a version alignment or verified release blocker requires it.

## Acceptance Criteria

- The release version is explicitly selected and consistently applied to visible, package, tag, release-note, and GitHub Release surfaces.
- `public/data.json` and `public/exercises.json` remain unchanged from the accepted refactor branch.
- IndexedDB remains `hiit-app-db` version `1` with `Weights` records shaped exactly as `{ id, weight, date }`.
- Seeded or retained legacy-compatible records survive release-candidate upgrade verification.
- Historical records remain visible and searchable by raw exercise ID when their metadata entry is absent.
- Newly saved weights persist stable `N/A` fallback text when optional RPE context is absent.
- Newly saved weights remain readable after reload.
- Home, Directory, History, Easy Scroll, and Multi Workout manual checks pass.
- iPhone Safari install, online-first-load, offline, saved-weight, and update checks pass.
- Chrome mobile core-route and saved-weight checks pass.
- A clean Docker image passes lint, formatting, typecheck, unit tests, production build verification, mobile Chromium/WebKit E2E tests, and Chromium offline PWA tests.
- `npm run build:pages` passes from the clean image.
- `actionlint` passes for `.github/workflows/ci.yml`.
- `git diff --check` passes.
- The release candidate is reviewed before any production mutation.
- After explicit owner-approved cutover, GitHub Pages deploys from GitHub Actions on `main`.
- The production GitHub Pages URL passes smoke, IndexedDB upgrade, PWA install/offline, and update verification.
- The repository default branch changes from `staging` to `main` only after production verification.
- The approved release tag and GitHub Release are published after production verification.
- `staging` remains available until a later owner-approved cleanup.

## Regression Tests

- Existing Vitest workout-data contract suite remains green.
- Existing Vitest IndexedDB adapter suite remains green.
- Existing Vitest deferred-update-policy suite remains green.
- Existing Vitest calendar-safe current-week and recent-workout suite remains green.
- Existing mobile Chromium and WebKit Home, Directory, History, Easy Scroll, Multi Workout, storage, toast, and listener-cleanup suites remain green.
- Existing Chromium service-worker-controlled offline route, Multi Workout, and saved-weight suite remains green.
- Mobile browser coverage verifies raw-ID History fallback for records missing current metadata.
- Mobile browser coverage verifies stable `N/A` text when optional RPE context is absent.
- Clean-image `npm run build:pages` verifies the GitHub Pages repository-path artifact.
- `actionlint` verifies the GitHub Actions workflow.
- Add a regression test only when a stabilization fix closes a discovered release blocker.

## Manual QA Checklist

### Local Release Candidate

- Build and serve the Docker production preview.
- Confirm `/`, `/sw.js`, and `/manifest.webmanifest` return `200`.
- Confirm the Home scheduled-day, Home rest-day, Directory, History, direct workout, not-found, and offline states.
- Confirm no phone viewport has horizontal overflow or bottom-navigation overlap.
- Confirm Easy Scroll lands near the current week once and does not prevent manual browsing.
- Confirm Multi Workout add, save, history, and remove behavior with eligible mocked weekday dates.
- Confirm a dirty weight input still defers a waiting update.
- Confirm seeded legacy-compatible IndexedDB records remain readable and new records remain writable.
- Confirm a retained record with an unknown exercise ID remains visible and searchable by raw ID.

### Device And Production

- Review the release candidate on iPhone Safari.
- Review the release candidate on Chrome mobile.
- Install or open the PWA from iPhone Safari.
- Verify core routes and weight saves after switching offline.
- Approve the production cutover explicitly.
- Confirm pull-request CI passes.
- Switch GitHub Pages source to GitHub Actions.
- Merge the approved release candidate into `main`.
- Confirm the GitHub Pages deployment succeeds.
- Reload the production URL and verify Home, Directory, History, Easy Scroll, Multi Workout, and weight history.
- Confirm existing device-local weight records remain readable after the production update.
- Confirm a clean-load update is applied without discarding unsaved weight text.
- Change the remote default branch to `main`.
- Publish the approved tag and GitHub Release.
- Retain `staging` until separate cleanup approval.

## Rollback Plan

Before cutover:

- Record the current production baseline commit: `2ef93c0cc5db8b4cad6ced6311434a62bad0e75a`.
- Preserve an owner-approved rollback reference before changing Pages settings or merging into `main`.
- Keep `staging` and the legacy production baseline available.

If production verification fails:

1. Stop the release before changing the default branch or publishing the release.
2. Revert the release-candidate merge on `main` with a normal revert commit or restore the approved baseline through the documented rollback reference.
3. Restore legacy Pages branch publishing if the Actions deployment path is implicated.
4. Verify the legacy production URL and existing IndexedDB history remain usable.
5. Fix the release blocker on a new reviewed branch.

Do not clear IndexedDB, ask users to clear site data, rewrite history destructively, delete remote branches, or force-push as part of rollback.

## Open Questions

- None.

## Decision Log

- Stabilization fixes must stay narrowly scoped to release blockers.
- Release the completed refactor as `v4.0.0`, preserving monotonic product numbering after `v3.0.4`.
- Preserve the pre-refactor baseline with both immutable tag `pre-refactor-3.0.4` and branch `rollback/pre-refactor-3.0.4`.
- Preserve unknown historical exercise IDs in History and store stable `N/A` fallback text for absent optional RPE context.
- Point iOS install guidance at the GitHub Pages production origin.
- No production or repository-setting mutations occur before explicit owner approval.
- Switch Pages to GitHub Actions before merging the approved release candidate into `main`.
- Verify production before changing the repository default branch from `staging` to `main`.
- Keep `staging` available until separate cleanup approval.
