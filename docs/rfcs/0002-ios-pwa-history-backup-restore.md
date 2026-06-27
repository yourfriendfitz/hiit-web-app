# RFC 0002: iOS PWA History Backup And Restore

Status: Accepted

Owner: Fitz

Created: 2026-06-26T15:25:29-05:00

Accepted: 2026-06-26T20:32:30-05:00

Target release: `v4.1.1`

## Summary

`v4.1.0` refreshed the app icon set. A new iPhone Home Screen install now shows
the updated icon, but it does not automatically share the saved weight history
from the older installed PWA. The older install still contains the real
device-local IndexedDB history, while the new install starts with an empty
`hiit-app-db` database.

Add an explicit, user-controlled backup and restore path for saved weight
history. The immediate `v4.1.1` goal is to let users export history from the old
PWA and import it into a new install without cloud sync, accounts, or an
IndexedDB schema migration.

## Problem Statement

Saved weight history is intentionally local-only:

- Database: `hiit-app-db`
- Version: `1`
- Store: `Weights`
- Record shape: `{ id, weight, date }`

That contract preserved existing records through the refactor and `v4.1.0`
release, but it does not solve a separate iOS behavior: installing the same web
app to the Home Screen again can create a separate app/storage container. In the
observed case, the second install got the new icon but did not inherit the old
install's IndexedDB records.

Without export/import, the user must choose between:

- Keeping the old icon install because it has history.
- Using the new icon install and losing visible history.

That is not acceptable for a workout tracker where local history is the primary
user-owned data.

## Goals

- Preserve the old PWA install as the source of truth until the user verifies a
  successful import elsewhere.
- Add a safe History backup export that serializes all `Weights` records to a
  portable JSON file.
- Add a restore/import path that reads a valid backup JSON file and writes
  records into the current install's `Weights` store.
- Keep the app backend-free, account-free, and offline-capable.
- Keep the IndexedDB database name, version, store name, indexes, and record
  shape unchanged.
- Make import idempotent enough that accidentally importing the same backup
  twice does not create obvious duplicate history entries.
- Provide clear in-app feedback for export success, import success, invalid
  files, empty backups, and partial failures.
- Add automated tests for serialization, validation, deduplication, and import
  persistence.
- Document the manual iPhone transfer workflow.

## Non-Goals

- Do not add cloud sync.
- Do not add accounts or authentication.
- Do not add a backend.
- Do not change workout programming or exercise metadata.
- Do not migrate IndexedDB to version `2`.
- Do not delete, replace, or clear existing local history during import by
  default.
- Do not attempt to force iOS to refresh an already-installed Home Screen icon.
- Do not rely on Safari remote debugging as the normal user recovery path.

## Proposed Direction

Add backup and restore controls to the History route because that is where users
already expect saved-weight management to live.

Export should:

- Read all records through the existing storage boundary.
- Normalize each record to `{ id, weight, date }`.
- Emit a JSON document with a small metadata wrapper, for example:

  ```json
  {
    "app": "hiit-web-app",
    "format": "weights-backup",
    "formatVersion": 1,
    "exportedAt": "2026-06-26T20:25:29.000Z",
    "recordCount": 2,
    "records": [
      {
        "id": "bench-press",
        "weight": "185 x 5",
        "date": "2026-06-25T18:30:00.000Z"
      }
    ]
  }
  ```

- Trigger a local file download with a predictable name such as
  `hiit-history-backup-YYYY-MM-DD.json`.
- Avoid sending data over the network.

Import should:

- Accept only JSON files.
- Validate the metadata wrapper and every record.
- Require `id`, `weight`, and `date`.
- Reject records with invalid dates or non-string values.
- Deduplicate against existing records before writing. The initial dedupe key
  should be exact `id`, exact `weight`, and normalized ISO `date`.
- Merge valid non-duplicate records into the existing store.
- Never clear existing records unless a future RFC explicitly adds a destructive
  replace mode.
- Show how many records were imported and how many were skipped as duplicates.

## User Workflow

Recommended recovery path for the current iPhone issue:

1. Open the old PWA that still has History.
2. Go to History and export a backup JSON file.
3. Keep the old PWA installed.
4. Open the new PWA with the updated icon.
5. Go to History and import the backup JSON file.
6. Confirm History shows the expected exercises and entries.
7. Only after verification, remove the old Home Screen install if desired.

## User Impact

Users gain an escape hatch for local-only data. The feature makes icon-refresh
reinstalls, device replacement, and manual backups safer without changing the
app's privacy model.

The History route will gain small backup/restore controls. Empty-history users
should not see noise beyond a concise import option.

## Architecture Impact

`src/storage.ts` remains the only IndexedDB ownership boundary. It likely needs
one narrow addition for bulk import, or a small wrapper module can compose the
existing `listWeights()` and a new `saveWeightRecord()` helper.

Preferred module split:

- `src/storage.ts`: IndexedDB reads/writes and transaction safety.
- `src/history-backup.ts`: JSON serialization, parsing, validation, and
  deduplication.
- `src/components/history.tsx`: backup/restore controls and user feedback.

The backup format should be versioned independently from IndexedDB so future
app versions can read `formatVersion: 1` without a database migration.

## Data And Storage Impact

No schema migration is planned.

- Database remains `hiit-app-db`.
- Version remains `1`.
- Store remains `Weights`.
- Record shape remains `{ id, weight, date }`.

Import writes the same record shape already produced by normal weight entry.
Existing records stay intact.

## Offline And PWA Impact

Backup and restore should work offline because both operations are local file
and IndexedDB operations. The generated Workbox service worker and legacy
`public/service-worker.js` bridge should not need changes.

The feature should be manually verified inside installed iPhone PWAs because the
original problem is specific to multiple Home Screen installs with separate
history containers.

## Security And Privacy

Backups contain personal workout history. The app should treat the backup as a
local user-owned file:

- Do not upload backups.
- Do not log backup contents.
- Do not include unrelated browser or device metadata.
- Keep the JSON human-readable so users can inspect it.
- Make import validation strict enough that malformed files cannot corrupt local
  history.

## Files Likely Touched

- `src/storage.ts`
- `src/history-backup.ts`
- `src/components/history.tsx`
- `src/styles.css`
- `tests/unit/storage.test.ts`
- `tests/unit/history-backup.test.ts`
- `tests/e2e/current-app.spec.js`
- `tests/pwa/offline.spec.js`
- `docs/releases/v4.1.1.md`
- `docs/specs/0010-history-backup-restore.md`
- `README.md`

## Acceptance Criteria

- A user can export all saved weight history from the old PWA as a JSON file.
- A user can import that JSON file into a separate empty PWA install.
- Imported records appear in History after import and after reload.
- Importing the same backup twice skips duplicates rather than doubling entries.
- Importing a malformed file shows an error and writes no records.
- Importing an empty valid backup shows a clear no-records message and writes no
  records.
- Existing local records are preserved during import.
- The IndexedDB database remains version `1` with the `Weights` store and
  `{ id, weight, date }` records.
- Export/import works while the app is service-worker controlled and offline.
- Documentation tells users not to delete the old PWA until the new PWA shows
  the imported History.

## Test Plan

- Unit test backup serialization with real `WeightRecord` inputs.
- Unit test backup parsing and validation for valid, malformed, empty, and
  wrong-app files.
- Unit test deduplication using exact `id` + `weight` + normalized ISO `date`.
- Unit test bulk import preserves existing records and writes only valid
  non-duplicates.
- E2E test exporting seeded history, importing into a cleared database, and
  seeing History entries after reload.
- PWA test export/import while service-worker controlled and offline.
- Manual iPhone test with two Home Screen installs:
  - Old icon install exports history.
  - New icon install imports history.
  - New icon install shows records after reload.
  - Old install remains intact until user deletes it manually.

## Rollback Plan

If the feature misbehaves before release, revert the backup/restore UI and
helper modules. Because the feature should not migrate IndexedDB or alter
existing records destructively, rollback should not require data cleanup.

If an import defect reaches production, advise users to keep the old PWA install
and avoid repeat imports until a fixed patch is deployed.

## Open Questions

- None known. The accepted `v4.1.1` direction is History-only controls, no
  `APP_VERSION` metadata, direct validated merge, and strict JSON validation
  without a checksum.
