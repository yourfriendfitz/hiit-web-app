# Milestone 11 Spec: Previous-Cycle Reference And Quick Fill

Status: Proposed

Owner: Fitz

Created: 2026-07-03

Related RFC: [`RFC 0003`](../rfcs/0003-previous-cycle-reference-and-quick-fill.md)

Related ADRs:

- [`ADR 0003`](../adr/0003-indexeddb-preservation.md)

## Summary

Implement the `v4.1.2` previous-weight reference and quick-fill improvement for
workout cards. The feature should let users copy a prior logged value into the
current weight input with an explicit tap, while preserving the existing
IndexedDB schema and avoiding overconfident previous-cycle claims.

The implementation must keep the app local-only, offline-capable, and
compatible with existing `WeightRecord` data.

## Goals

- Show a useful prior-value reference on workout exercise cards.
- Add an explicit `Use` action that quick-fills the weight input.
- Extract only the user-entered value before the app-generated trailing
  bracketed details suffix when possible.
- Preserve legacy free-text fallback behavior.
- Use `Previous cycle` wording only when matching can be confidently derived.
- Keep ambiguous missed workout cases on neutral wording such as `Last logged`.
- Keep the database `hiit-app-db` at version `1`.
- Keep the object store `Weights` and record shape `{ id, weight, date }`.
- Preserve offline installed-PWA behavior.
- Add targeted unit and E2E coverage for quick fill and compatibility.

## Non-Goals

- Do not add cloud sync, accounts, or a backend.
- Do not change workout programming, exercise IDs, or exercise metadata.
- Do not migrate IndexedDB.
- Do not add hidden metadata to the free-text `weight` field.
- Do not guarantee exact previous-cycle matching from save-date-only records.
- Do not automatically fill or overwrite the input without a direct user tap.
- Do not change the normal saved History format that appends workout details.

## Scope

- Add a pure helper for reusable-weight extraction from saved `weight` strings.
- Update the workout card logging UI to render a direct quick-fill action.
- Add or adjust schedule helper logic only if previous-cycle candidate wording
  can be supported without schema changes.
- Add unit tests for extraction, candidate ambiguity, and unchanged storage
  contracts.
- Add E2E coverage for the quick-fill interaction.
- Update docs for `v4.1.2` behavior if a release note is created separately by
  the reviewer.

## User Impact

Users can tap `Use` on a prior value instead of manually retyping or selecting
text from the last logged badge. Current-format saved entries quick-fill only
the value they originally typed, not the appended `[Sets: ...]` details.

Users should not see misleading precision. If the app cannot prove a previous
cycle candidate because of missed workout or save-date ambiguity, it should
present the value as `Last logged` rather than `Previous cycle`.

## Architecture Impact

Expected modules:

- `src/storage.ts`: remain the IndexedDB boundary and keep existing reads and
  writes compatible.
- `src/components/workout.tsx`: render the last logged reference, `Use` action,
  and quick-fill state updates.
- `src/program-schedule.ts`: own cycle math or candidate helper behavior if
  previous-cycle wording is implemented.
- `tests/unit/storage.test.ts`: verify the unchanged database contract.
- `tests/unit/program-schedule.test.ts`: cover candidate matching or ambiguity
  rules if schedule helpers change.
- `tests/e2e/current-app.spec.js`: cover the browser quick-fill flow.

The value extraction helper can live near the workout component or in a small
utility module if tests need direct import. Keep the abstraction narrow.

## Data And Storage Impact

Hard data constraint:

- Database: `hiit-app-db`
- Version: `1`
- Store: `Weights`
- Record shape: `{ id, weight, date }`

No schema migration is allowed. The feature reads existing records and writes
only through the current user-initiated Save path. It must not append hidden
metadata to free-text weight values or depend on a new stored workout-week
field.

Because existing records store save dates, exact previous-cycle matching is not
derivable for all cases. A missed workout saved later can look like a different
scheduled workout if the implementation relies only on `date`.

## Offline And PWA Impact

Quick fill is local UI state plus existing IndexedDB reads. It should work in a
service-worker-controlled PWA while offline after the app has already cached
the shell.

No Workbox strategy, manifest, icon, or legacy `public/service-worker.js`
migration bridge change is expected.

## Files Likely Touched

- `src/storage.ts`
- `src/components/workout.tsx`
- `src/program-schedule.ts`
- `tests/unit/storage.test.ts`
- `tests/unit/program-schedule.test.ts`
- `tests/e2e/current-app.spec.js`

Optional if the implementation uses a separate helper:

- `src/weight-format.ts`
- `tests/unit/weight-format.test.ts`

## Acceptance Criteria

- Workout cards still show prior saved values for the same exercise ID.
- A direct `Use` action appears when a reusable prior value is available.
- Tapping `Use` populates the input with the reusable value.
- Current-format saved values copy only the text before the trailing
  `[Sets: ...]` details suffix.
- Legacy free-text values without a recognizable suffix copy as full trimmed
  text.
- Quick fill does not create or update a record until Save is tapped.
- Quick fill does not overwrite existing typed input without a direct tap.
- Ambiguous previous-cycle candidates use `Last logged` or another neutral
  label instead of `Previous cycle`.
- The database contract remains `hiit-app-db`, version `1`, store `Weights`,
  record shape `{ id, weight, date }`.
- Existing History, backup/restore, and last logged behavior remain compatible.

## Regression Tests

- Unit tests cover reusable-value extraction from strings with `[Sets:` details.
- Unit tests cover legacy free-text fallback, empty strings, and bracketed text
  that should not be trimmed.
- Storage tests cover `DB_VERSION === 1`, `DB_NAME === "hiit-app-db"`, store
  `Weights`, and `WeightRecord` compatibility.
- Program schedule tests cover any helper used for previous-cycle candidates,
  including missed workout ambiguity.
- E2E tests cover tapping `Use`, verifying the input value, saving afterward,
  and seeing the saved History entry retain details.
- E2E tests cover no automatic overwrite before the user taps `Use`.

## Manual QA

- Seed or create a saved value such as
  `185 [Sets: 3, Reps: 8, Early RPE: 8, Last RPE: 9]`.
- Open the same exercise and confirm the prior value appears.
- Tap `Use` and confirm the input contains `185`.
- Save and confirm History shows a normal details-appended value.
- Repeat with a legacy value such as `40s; RPE 9*` and confirm the full value
  copies.
- Type a different value first, tap `Use`, and confirm replacement only happens
  after the tap.
- Confirm ambiguous missed workout data does not show exact `Previous cycle`
  wording.
- Repeat while the installed PWA is offline after one controlled online load.

## Rollback

Revert the quick-fill UI, value extraction helper, optional schedule candidate
helper, and related tests. No database rollback should be required because the
feature keeps the same schema and only saves through the existing Save action.

## Open Questions

- What evidence is sufficient to label a value as `Previous cycle` in
  `v4.1.2`?
- Should quick fill be disabled when the input is non-empty, or is direct-tap
  replacement acceptable?
- Should the compact last logged badge and full training-log reference expose
  the same quick-fill control?

## Implementation STOP Gates

Stop implementation and return to RFC/spec review if any of these become true:

- Exact previous-cycle matching is required but not derivable from existing
  `{ id, weight, date }` records.
- A DB schema migration is required.
- Hidden metadata would need to be appended to the free-text `weight` value.
- Quick fill would overwrite typed input without a direct user tap.
