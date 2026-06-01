# Release Checklist

Use this checklist for the `v4.0.0` refactor production cutover.

## Approval Gates

Do not perform any remote write unless the owner explicitly approves that step.

- [x] Release-candidate branch reviewed.
- [x] Release version selected: `v4.0.0`.
- [x] Rollback reference strategy selected: immutable tag and rollback branch.
- [x] Remote rollback references approved for creation.
- [x] Pull request into `main` approved for creation.
- [ ] GitHub Pages source switch approved.
- [ ] Merge into `main` approved.
- [ ] Default-branch switch from `staging` to `main` approved.
- [ ] Tag and GitHub Release publication approved.

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
- [ ] Serve the production preview and confirm `/`, `/sw.js`, and `/manifest.webmanifest` return `200`.
- [ ] Confirm Home, Directory, History, direct workout, rest-day, and not-found states.
- [ ] Confirm Easy Scroll positions Directory near the current week once and still allows manual browsing.
- [ ] Confirm Multi Workout add, save, History, and remove behavior on an eligible mocked weekday.
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

## Controlled Cutover

- [x] Confirm the current production baseline is `2ef93c0cc5db8b4cad6ced6311434a62bad0e75a`.
- [x] Create tag `pre-refactor-3.0.4` and branch `rollback/pre-refactor-3.0.4` from the approved baseline.
- [x] Push the reviewed release-candidate branch.
- [x] Open the approved pull request into `main`.
- [ ] Confirm pull-request checks pass.
- [ ] Change **Settings > Pages > Build and deployment > Source** to **GitHub Actions**.
- [ ] Merge the approved pull request into `main`.
- [ ] Confirm the `CI` checks, Pages artifact build, and `github-pages` deployment succeed.
- [ ] Verify `https://yourfriendfitz.github.io/hiit-web-app/`.
- [ ] Repeat the production storage-upgrade and PWA smoke checks.
- [ ] Change the repository default branch from `staging` to `main`.
- [ ] Publish the approved `v4.0.0` tag and GitHub Release.
- [ ] Keep `staging` available until a later owner-approved cleanup.

## Release Notes

- [ ] Record user-visible changes.
- [ ] State that IndexedDB remains compatible.
- [ ] Record manual production checks.
- [ ] Record known issues, or state `None known`.
- [ ] Link [`ROLLBACK.md`](./ROLLBACK.md).
