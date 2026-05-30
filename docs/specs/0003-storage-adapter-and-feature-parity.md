# Milestone 3 Spec: Storage Adapter And Feature Parity

Status: Accepted

Owner: Fitz

Created: 2026-05-29T20:42:03-05:00

Accepted: 2026-05-29T20:46:14-05:00

Related RFC: [`RFC 0001`](../rfcs/0001-spec-driven-refactor-plan.md)

Related ADRs:

- [`ADR 0003`](../adr/0003-indexeddb-preservation.md)

## Summary

Formalize the IndexedDB storage adapter introduced during the React/Vite migration and prove that the existing local weight-history contract remains intact. Add direct adapter tests for reading seeded legacy records, selecting the newest entry, writing new records, and listing history records.

Milestone 2 already moved Last Weight and History into React while preserving the public workflow. This milestone closes the storage-safety gap by making the adapter independently testable and expanding browser regression coverage around seeded existing records and history filtering.

## Goals

- Make IndexedDB access explicit behind one adapter boundary.
- Preserve the existing database name, object store name, database version, and record shape.
- Add direct tests for legacy-compatible reads and writes.
- Verify Last Weight displays the newest record by date.
- Verify History lists saved records and filters by exercise name.
- Keep free-text weight input behavior unchanged.
- Remove obsolete legacy runtime modules only when they are no longer needed by the bridge build.

## Non-Goals

- Do not change the IndexedDB schema.
- Do not add schema migrations.
- Do not add cloud sync, accounts, import, or export.
- Do not persist set completion checkboxes.
- Do not redesign the UI.
- Do not modernize the service worker or offline strategy.
- Do not configure GitHub Pages deployment.

## Scope

- Refactor `src/storage.ts` into an explicit adapter API with injectable browser dependencies where needed for tests.
- Keep the production adapter backed by `window.indexedDB`.
- Preserve the compatibility contract:
  - Database name: `hiit-app-db`
  - Database version: `1`
  - Object store: `Weights`
  - Indexes: `id`, `date`, `weight`
  - Record shape: `{ id, weight, date }`
- Add test-only database lifecycle helpers or adapter construction hooks so tests do not leak IndexedDB state across cases.
- Add direct tests for:
  - Opening an existing compatible database without migration.
  - Reading seeded records.
  - Returning the newest matching weight by `date`, independent of cursor order.
  - Writing a record with exactly `id`, `weight`, and `date`.
  - Listing all existing records.
- Expand Playwright coverage to seed an existing IndexedDB record before app load and verify it appears in Last Weight and History.
- Expand Playwright coverage to filter History by exercise name.
- Confirm React effect cleanup removes Last Weight and History update listeners when components unmount.
- Remove unused legacy UI modules from `public/` if service-worker bridge constraints allow it without entering Milestone 4 scope.

## Out Of Scope

- Changing how the current UI appends set, reps, and RPE context to a saved free-text weight.
- Service worker cache list redesign.
- Runtime CDN removal.
- PWA install/update behavior changes.
- Workout data edits.
- New product features.

## User Impact

Users should see no intentional workflow or UI change. Existing device-local weight history should continue to appear in Last Weight and History. Newly saved weights should remain available after navigation and refresh.

## Architecture Impact

`src/storage.ts` becomes the only IndexedDB ownership boundary. UI components should consume a storage interface rather than relying on module-level IndexedDB details.

Recommended adapter surface:

- `open()`
- `getLatestWeight(exerciseId)`
- `listWeights()`
- `saveWeight(exerciseId, weight)`
- `close()`

The production app may use a singleton adapter instance. Tests should construct isolated adapter instances with isolated IndexedDB state.

## Data And Storage Impact

IndexedDB data compatibility is the primary concern of this milestone. No migration is allowed.

Existing records must remain readable when:

- `date` is a `Date`.
- `date` is a parseable date string.
- Multiple records exist for the same exercise.
- Records were inserted in an order that differs from chronological order.

New writes must keep:

- `id` as the exercise identifier.
- `weight` as free text.
- `date` as a parseable `Date`.
- No extra persisted fields.

## Offline And PWA Impact

No intentional offline or service worker behavior change is included. IndexedDB reads and writes remain browser-local and must continue working without a network connection.

## Files Likely Touched

- `src/storage.ts`
- `src/types.ts`
- `src/App.tsx`
- `tests/unit/**`
- `tests/e2e/**`
- `package.json`
- `package-lock.json`
- `public/**`
- `README.md`
- `AGENTS.md`

## Acceptance Criteria

- IndexedDB access is owned by an explicit adapter interface.
- Production still opens `hiit-app-db` at version `1`.
- Production still uses the `Weights` object store and existing indexes.
- Opening an existing compatible database does not require a schema migration.
- Seeded legacy-compatible records remain readable.
- New records persist exactly `{ id, weight, date }`.
- Last Weight displays the newest record by date.
- History lists existing and newly saved records.
- History search filters records by exercise name.
- Navigating away from workout/history views does not leave duplicate storage-update listeners active.
- Weight input remains free text.
- `data.json` and `exercises.json` remain content-equivalent.
- Full containerized checks pass.

## Regression Tests

- Unit test: adapter opens a pre-seeded compatible `hiit-app-db`.
- Unit test: adapter reads a seeded legacy-compatible record.
- Unit test: adapter selects the newest date when insertion order differs.
- Unit test: adapter writes exactly `{ id, weight, date }`.
- Unit test: adapter lists all records.
- Playwright: seed a legacy-compatible weight record before route load and confirm Last Weight renders it.
- Playwright: navigate to History and confirm the seeded record renders.
- Playwright: enter a search query and confirm History filters by exercise name.
- Existing Playwright launch, directory, save, and history smoke tests continue passing in mobile Chromium and WebKit.

## Manual QA Checklist

- Start the Docker-served app.
- Open a workout route.
- Save a free-text weight.
- Refresh the page and confirm Last Weight still displays it.
- Navigate to History and confirm the saved record appears.
- Search History by the exercise name.
- Navigate repeatedly between Workout and History and confirm weights are not duplicated.
- Perform the seeded existing-data compatibility path before approving merge.

## Rollback Plan

Revert the adapter refactor and its tests. Because this milestone must not change IndexedDB schema or workout data content, rollback should not require a user-data migration.

## Open Questions

- None.

## Decision Log

- `fake-indexeddb` is a development-only dependency used for isolated adapter compatibility tests.
- The browser storage singleton is lazy so importing the adapter does not require a browser global and concurrent initial reads share one pending connection.
- React Last Weight ignores stale async read completions so an older empty result cannot overwrite a freshly saved weight.
- Legacy files under `public/` remain until Milestone 4 because the retained service worker still references them.
