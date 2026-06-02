# Release Checklist

Use this checklist for the `v4.0.0` refactor production cutover.

## Approval Gates

Do not perform any remote write unless the owner explicitly approves that step.

- [x] Release-candidate branch reviewed.
- [x] Release version selected: `v4.0.0`.
- [x] Rollback reference strategy selected: immutable tag and rollback branch.
- [x] Remote rollback references approved for creation.
- [x] Pull request into `main` approved for creation.
- [x] GitHub Pages source switch approved and completed.
- [x] Merge into `main` approved and completed.
- [x] Remote default branch verified as `main`.
- [x] Tag and GitHub Release publication approved.

## Local Release Candidate

- [ ] Build a clean check image:

  ```bash
  docker build -t hiit-web-app-release-candidate .
  ```

- [ ] Run the full clean-image suite:

  ```bash
  docker run --rm hiit-web-app-release-candidate
  ```

- [ ] Verify the GitHub Pages artifact:

  ```bash
  docker run --rm hiit-web-app-release-candidate npm run build:pages
  ```

- [ ] Verify the workflow:

  ```bash
  docker run --rm -v "$PWD:/repo" -w /repo rhysd/actionlint:1.7.12
  ```

- [ ] Run `git diff --check`.
- [ ] Serve the production preview and confirm `/`, `/service-worker.js`, `/sw.js`, and `/manifest.webmanifest` return `200`.
- [ ] Confirm Home, Directory, History, direct workout, rest-day, and not-found states.
- [ ] Confirm Easy Scroll positions Directory near the current week once and still allows manual browsing.
- [ ] Confirm Multi Workout offers the previous two scheduled workouts across rest days and supports add, save, History, and remove behavior.
- [ ] Confirm no phone viewport has horizontal overflow or fixed-navigation overlap.

## Storage Upgrade

- [ ] Retain or seed legacy-compatible IndexedDB records shaped exactly as `{ id, weight, date }`.
- [ ] Load the release candidate and confirm Last Weight displays the retained value.
- [ ] Confirm History displays and filters the retained value.
- [ ] Confirm History displays and filters a retained record whose exercise ID is absent from current metadata.
- [ ] Save a new free-text weight.
- [ ] Confirm an exercise with absent optional RPE context stores `N/A`, not `undefined`.
- [ ] Reload and confirm both legacy and new entries remain readable.
- [ ] Confirm IndexedDB remains `hiit-app-db` version `1` with the `Weights` store.

## PWA And Devices

- [ ] Review the release candidate on iPhone Safari.
- [ ] Review the release candidate on Chrome mobile.
- [ ] Install or open the PWA from iPhone Safari.
- [ ] Confirm the iPhone install link uses `https://yourfriendfitz.github.io/hiit-web-app/`.
- [ ] Load online once and reload under service-worker control.
- [ ] Switch offline and verify core routes, Multi Workout, saves, and History.
- [ ] Verify a clean-load update activates.
- [ ] Verify unsaved weight text defers a waiting-version reload until the app becomes clean.
- [ ] Follow [`PWA-MIGRATION.md`](./PWA-MIGRATION.md) from a legacy-worker profile or installed `v3.0.4` PWA.
- [ ] Confirm the legacy bridge removes stale shell caches without deleting retained IndexedDB history.
- [x] Confirm the migrated app reports `v4.0.0` after opening online once, closing, and reopening.

## Controlled Cutover

- [x] Confirm the current production baseline is `2ef93c0cc5db8b4cad6ced6311434a62bad0e75a`.
- [x] Create tag `pre-refactor-3.0.4` and branch `rollback/pre-refactor-3.0.4` from the approved baseline.
- [x] Push the reviewed release-candidate branch.
- [x] Open the approved pull request into `main`.
- [x] Confirm pull-request checks pass.
- [x] Change **Settings > Pages > Build and deployment > Source** to **GitHub Actions**.
- [x] Merge the approved pull request into `main`.
- [x] Confirm the `CI` checks, Pages artifact build, and `github-pages` deployment succeed.
- [x] Verify `https://yourfriendfitz.github.io/hiit-web-app/`.
- [x] Merge and deploy the reviewed PWA migration bridge hotfix.
- [x] Confirm production `/hiit-web-app/service-worker.js` and `/hiit-web-app/sw.js` return `200`.
- [x] Repeat the production storage-upgrade and PWA smoke checks.
- [x] Confirm the repository default branch is `main`.
- [x] Publish the approved `v4.0.0` tag and GitHub Release.
- [ ] Keep `staging` available until a later owner-approved cleanup.

## Release Notes

- [x] Record user-visible changes.
- [x] State that IndexedDB remains compatible.
- [x] Record manual production checks.
- [x] Record known issues, or state `None known`.
- [x] Link [`PWA-MIGRATION.md`](./PWA-MIGRATION.md).
- [x] Link [`ROLLBACK.md`](./ROLLBACK.md).
