# RFC 0003: Previous-Cycle Reference And Quick Fill

Status: Proposed

Owner: Fitz

Created: 2026-07-03

Target release: `v4.1.2`

## Summary

Add a conservative previous-weight reference and quick-fill improvement to the
workout logging flow. The feature should help users reuse a prior logged value
without retyping it, while keeping the existing local-only IndexedDB data
contract unchanged.

`v4.1.2` remains schema-compatible. It may show the previous logged value and
may use previous-cycle candidate wording only when the existing data supports
that level of confidence. Existing records do not contain the scheduled
workout week/day that produced the save, so exact previous-cycle matching is
not guaranteed from current storage alone.

## Problem Statement

Workout cards already show the latest saved weight for an exercise, but the
user must manually copy that value into the input before saving a new entry.
The saved value also includes a trailing bracketed details suffix added by the
app, for example:

```text
185 [Sets: 3, Reps: 8, Early RPE: 8, Last RPE: 9]
```

That suffix is useful in History, but it is noisy when the user wants to reuse
only the typed weight value.

The schedule now repeats in 12-week cycles, which makes a previous-cycle
reference useful. However, the current `WeightRecord` only stores `{ id, weight,
date }`. Because the `date` is the save timestamp, not the scheduled workout
date, missed workout logging can make save-date-derived previous cycle matches
ambiguous.

## Goals

- Add an explicit quick-fill action for prior logged values on workout cards.
- Copy only the user-entered value portion before a trailing bracketed details
  suffix when the value follows the current saved format.
- Preserve a sensible fallback for legacy free-text weight values that do not
  follow the bracketed suffix format.
- Keep the existing latest-weight behavior intact for exercise IDs.
- Allow previous-cycle candidate wording only when the app can explain the
  confidence from existing records.
- Keep the database `hiit-app-db` at version `1`.
- Keep the object store `Weights` and record shape `{ id, weight, date }`.
- Work offline in the installed PWA.
- Add tests for value extraction, user-initiated quick fill, ambiguous
  previous-cycle behavior, and unchanged storage compatibility.

## Non-Goals

- Do not add cloud sync, accounts, or a backend.
- Do not migrate IndexedDB or add a new object store.
- Do not append hidden metadata to the free-text `weight` field.
- Do not change the shape of `WeightRecord`.
- Do not promise exact previous-cycle matching when existing records cannot
  prove the scheduled workout that created them.
- Do not automatically populate or overwrite the input without a direct user
  tap.
- Do not change workout data, exercise IDs, or exercise metadata.
- Do not remove the bracketed details suffix from newly saved History records.

## Proposed Direction

Keep the feature inside the current workout logging flow:

- Continue reading the latest stored record for each exercise through the
  storage boundary.
- Show the existing last logged reference when a value exists.
- Add a compact `Use` action near the reference.
- On direct tap, copy the reusable value into the input.
- If the stored value ends with the app-generated bracketed details suffix,
  copy only the text before that suffix.
- If the stored value is legacy free text without a recognizable suffix, copy
  the full stored value after trimming surrounding whitespace.
- If the user already typed into the field, require the same direct tap and
  treat the tap as an intentional replace action.

Previous-cycle wording should be conservative:

- `Last logged` is safe when the app is showing the latest saved record for the
  same exercise ID.
- `Previous cycle` is allowed only for a candidate that can be derived with
  clear confidence from existing data and schedule context.
- If missed workout behavior or save-date ambiguity prevents confidence, the UI
  should stay with `Last logged` or similar neutral wording.

This avoids creating a false promise that the app can reconstruct exact
scheduled-cycle history from records that only contain exercise ID, free-text
weight, and save date.

## UX Wording

Recommended copy:

- Section label: `Last logged weight`
- Badge label when present: `Last logged`
- Quick-fill button: `Use`
- Candidate label when confidence is strong enough: `Previous cycle`
- Empty state: `No previous`

Examples:

- Stored current-format value:
  `185 [Sets: 3, Reps: 8, Early RPE: 8, Last RPE: 9]`
- Button label or accessible name may communicate: `Use 185`
- Input value after tap: `185`
- Legacy value without a trailing bracketed suffix:
  `40s; RPE 9*`
- Input value after tap: `40s; RPE 9*`

The UI should not imply that quick fill has saved anything. The existing Save
button remains the only action that writes a new record.

## Data And Storage Impact

No schema migration is planned.

- Database: `hiit-app-db`
- Version: `1`
- Store: `Weights`
- Record shape: `{ id, weight, date }`

The feature reads existing `WeightRecord` values and writes through the current
save path only after the user taps Save. It must not add hidden metadata to
`weight`, create a new store, or require a new IndexedDB version.

Because `date` is a save timestamp, not a scheduled workout timestamp, previous
cycle matching cannot be exact for all records. Missed workout logging can
place a record on a later calendar date than the workout it represents.

## Offline And PWA Impact

The feature uses local React state and the existing IndexedDB store. It should
work after the app shell is cached and the installed PWA is offline.

No service-worker strategy change is expected. The generated Workbox worker and
the legacy `public/service-worker.js` migration bridge should remain unchanged.

## Implementation Notes

- Keep `src/storage.ts` as the IndexedDB boundary.
- Prefer a small pure helper for extracting the reusable value from saved
  `weight` strings.
- Recognize only a trailing bracketed details suffix that matches the current
  app-generated format closely enough to avoid trimming intentional user text.
- Treat legacy free-text records as user-authored values and copy them whole.
- Keep `src/program-schedule.ts` responsible for cycle math if candidate
  labeling needs schedule context.
- Keep `src/components/workout.tsx` responsible for rendering the reference,
  quick-fill action, and input state.
- Do not add storage writes until the user presses Save.
- Do not clear or bypass existing PWA dirty-input protection.

## Acceptance Criteria

- Workout cards with a prior value show a last logged reference.
- A visible, direct `Use` action copies the reusable value into the weight
  input.
- Quick fill copies only the value before the trailing bracketed details suffix
  for current-format saved records.
- Quick fill copies the full trimmed value for legacy free-text records without
  a recognizable suffix.
- Quick fill does not save a record by itself.
- Quick fill does not overwrite typed input without a direct user tap.
- Previous-cycle wording appears only when the implementation can support it
  with confident data.
- Ambiguous missed workout cases use neutral wording such as `Last logged`.
- The IndexedDB database remains `hiit-app-db`, version `1`, store `Weights`,
  with `{ id, weight, date }` records.
- Offline installed-PWA behavior remains unchanged.

## Tests

- Unit tests cover extracting the reusable value from current-format saved
  strings with `[Sets: ...]` details.
- Unit tests cover legacy free-text fallback values.
- Unit tests cover any previous-cycle candidate helper, including missed
  workout ambiguity.
- Storage tests verify the database name, version, store, and `WeightRecord`
  shape stay unchanged.
- E2E tests cover tapping `Use`, seeing the input populate, and confirming no
  save occurs until Save is tapped.
- E2E tests cover preserving typed input until the user directly chooses quick
  fill.
- Existing workout save and History display tests remain passing.

## Manual QA

- Open a workout with saved history and confirm the last logged reference is
  visible.
- Tap `Use` for a current-format saved value and confirm only the value before
  `[Sets:` appears in the input.
- Save the quick-filled value and confirm the new History entry still includes
  the normal bracketed details suffix.
- Test a legacy free-text record and confirm quick fill copies the full trimmed
  value.
- Type into the input first, then tap `Use`, and confirm the replace only
  happens because of that tap.
- Verify ambiguous missed workout history does not receive exact
  `Previous cycle` wording.
- Repeat the flow while the installed PWA is service-worker controlled and
  offline.

## Rollback

Revert the workout quick-fill UI, value-extraction helper, schedule candidate
helper if added, tests, and docs. No database cleanup should be required
because the feature does not migrate schema or write records outside the
existing Save path.

## Open Questions

- What confidence rule, if any, is acceptable for showing `Previous cycle`
  instead of `Last logged` in `v4.1.2`?
- Should the `Use` action be visible only on expanded exercise cards, or also
  near compact last logged badges?
- Should replacing typed input show a confirmation affordance, or is the
  direct tap enough?
