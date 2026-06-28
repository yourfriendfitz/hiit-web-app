# Milestone 10 Spec: History Backup And Restore

Status: Accepted

Owner: Fitz

Created: 2026-06-26T20:32:30-05:00

Accepted: 2026-06-26T20:32:30-05:00

Related RFC: [`RFC 0002`](../rfcs/0002-ios-pwa-history-backup-restore.md)

Related ADRs:

- [`ADR 0003`](../adr/0003-indexeddb-preservation.md)

## Summary

Add a local History backup and restore feature for `v4.1.1`. The immediate
problem is an iPhone Home Screen re-install: the new install gets the refreshed
icon, but its storage starts empty while the older installed PWA still owns the
real IndexedDB history.

The feature lets the old install export saved weights to a JSON file and lets
the new install import that file into its own `Weights` store. It preserves the
existing local-only model and does not change the IndexedDB schema.

## Goals

- Export all saved weight records from the History route.
- Import a valid backup JSON file into an empty or existing install.
- Preserve existing local records during import.
- Skip exact duplicates on repeated import.
- Keep the database `hiit-app-db` at version `1`.
- Keep the object store `Weights` and record shape `{ id, weight, date }`.
- Work offline after the app is installed and service-worker controlled.
- Give concise success/error feedback in the app.
- Document that users must keep the old PWA until the new one shows imported
  history.

## Non-Goals

- Do not add cloud sync, accounts, or a backend.
- Do not force iOS to update an existing Home Screen icon.
- Do not delete or clear records during import.
- Do not add a destructive replace mode.
- Do not migrate IndexedDB to a new version.
- Do not change workout data or exercise metadata.

## Scope

- Add backup serialization, validation, and deduplication helpers.
- Add an IndexedDB bulk import method that writes the existing record shape.
- Add Export and Import controls to the History route.
- Add unit tests for backup format, parsing, validation, and duplicate handling.
- Add storage tests for merge-only bulk import.
- Add browser tests for export/import behavior.
- Add release documentation for `v4.1.1`.

## User Impact

Users can move local History from an old iPhone PWA install to a new one with
the updated icon. The old install remains the source of truth until the user
confirms the new install has the imported records.

History gains small Export and Import controls. Normal workout logging and
History browsing remain unchanged.

## Architecture Impact

The storage boundary stays in `src/storage.ts`. A new helper module owns backup
JSON concerns so UI and IndexedDB code do not duplicate validation logic.

Expected module split:

- `src/history-backup.ts`: backup format constants, serialization, parsing,
  validation, filename generation, and deduplication.
- `src/storage.ts`: existing IndexedDB adapter plus merge-only bulk import.
- `src/components/history.tsx`: user controls and feedback.

## Data And Storage Impact

No schema migration is allowed.

- Database: `hiit-app-db`
- Version: `1`
- Store: `Weights`
- Record shape: `{ id, weight, date }`

Imported records use normalized ISO date strings. Existing code already reads
Date objects and parseable date strings, so this remains inside the established
compatibility contract.

## Offline And PWA Impact

Export and import are local file and IndexedDB operations. They should work
after the app shell is cached and the browser is offline.

No service-worker strategy change is expected. The legacy
`public/service-worker.js` migration bridge stays unchanged.

## Files Touched

- `README.md`
- `docs/releases/v4.1.1.md`
- `docs/rfcs/0002-ios-pwa-history-backup-restore.md`
- `docs/specs/0010-history-backup-restore.md`
- `package.json`
- `package-lock.json`
- `src/components/history.tsx`
- `src/history-backup.ts`
- `src/storage.ts`
- `src/styles.css`
- `src/types.ts`
- `tests/e2e/current-app.spec.js`
- `tests/pwa/offline.spec.js`
- `tests/unit/history-backup.test.ts`
- `tests/unit/storage.test.ts`

## Acceptance Criteria

- Export creates a JSON backup with metadata and all saved weight records.
- Export never sends data over the network.
- Import rejects malformed, wrong-format, or invalid-date files without writing
  records.
- Import merges valid records into the current `Weights` store.
- Import preserves existing records.
- Importing the same backup twice skips duplicates.
- Imported records appear in History immediately and after reload.
- Existing Last Weight behavior still reads imported records.
- Offline export/import passes in the service-worker-controlled PWA test.
- App version surfaces report `v4.1.1`.

## Regression Tests

- Unit tests cover serialization, filename generation, parsing, validation, and
  duplicate planning.
- Storage tests cover merge-only bulk import and the unchanged version-1
  database contract.
- E2E tests cover browser export, import into a cleared database, duplicate
  import, and History display after reload.
- PWA tests cover offline import/export after first controlled load.

## Manual QA Checklist

- Open the old iPhone PWA and export History.
- Open the new iPhone PWA and import the backup.
- Confirm the new install shows expected History after reload.
- Confirm the old install still shows its original History.
- Import the same backup again and confirm entries are not duplicated.
- Try importing a non-backup JSON file and confirm no records are written.

## Rollback Plan

Revert the backup UI, helper module, storage bulk import, tests, and docs. No
database cleanup should be required because the feature does not migrate schema
or delete records.

## Open Questions

- None known.
