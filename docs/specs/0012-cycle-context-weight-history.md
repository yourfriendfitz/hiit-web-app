# Milestone 12 Spec: Cycle-Context Weight History

Status: Proposed

Owner: Fitz

Created: 2026-07-07

Related RFC: [`RFC 0004`](../rfcs/0004-cycle-context-weight-history.md)

Related ADRs:

- [`ADR 0003`](../adr/0003-indexeddb-preservation.md)

## Summary

Implement cycle-context-aware last weight lookup for workout cards. New saved
records should include scheduled workout context so the app can prefer a prior
load from the same part of the 12-week cycle before falling back to the latest
same-exercise record.

Legacy `{ id, weight, date }` records remain valid, readable, and eligible for
fallback. Exact cycle-context lookup is only available for records saved after
this feature or imported from backups that include context fields.

## Goals

- Increase the IndexedDB version from `1` to `2`.
- Keep database name `hiit-app-db`.
- Keep object store `Weights`.
- Preserve v1 records during upgrade without transforming them.
- Add optional context fields to scheduled workout saves.
- Look up exact context matches before exercise fallback.
- Preserve optional context fields through History backup export and import.
- Make the workout UI label the lookup source clearly.
- Cover exact context, fallback, route saves, missed-workout saves, import, and
  offline save behavior in tests.

## Non-Goals

- Do not change exercise IDs or workout data.
- Do not change `DB_NAME` or `WEIGHT_STORE`.
- Do not infer exact context from legacy save dates.
- Do not append hidden metadata to `weight`.
- Do not implement quick fill.
- Do not change service-worker behavior.

## Stored Context

New scheduled saves add these optional fields:

- `programWeek`: one-based absolute program week at save time.
- `cycle`: one-based cycle number at save time.
- `cycleWeek`: one-based week within the repeated cycle.
- `cycleLength`: normally `12`.
- `workoutDay`: one-based workout day in the week.

These fields are optional so legacy records and old backups remain compatible.
Current records cannot prove cycle context because they only contain
`{ id, weight, date }`.

## Storage Requirements

The IndexedDB contract after this milestone:

- Database: `hiit-app-db`
- Version: `2`
- Store: `Weights`
- Existing indexes: `id`, `date`, `weight`
- New index:
  `exerciseCycleContext` on `["id", "cycleLength", "cycleWeek", "workoutDay"]`

Upgrade behavior:

- Create the store and all indexes when the store is missing.
- Add missing indexes when the store already exists.
- Do not delete or rewrite existing records.
- Existing context-free records are expected to be absent from the compound
  context index and remain available through fallback.

## Lookup Requirements

Lookup order:

1. Newest record for the same `id`, `cycleLength`, `cycleWeek`, and
   `workoutDay`.
2. Newest record for the same `id` regardless of context.
3. No previous value.

Lookup results should expose the source as:

- `cycle-context`
- `exercise-fallback`
- `none`

The workout card should show:

- `Last from Cycle Week X/12 • Day Y` for `cycle-context`.
- `Last logged for exercise` for `exercise-fallback`.
- `No previous` for `none`.

The UI must not present a legacy fallback as a same-cycle match.

## Route And Home Context

Route workout saves use the route coordinates:

- `weekIndex`: route week.
- `dayIndex`: route day.
- `programLength`: loaded program length.

Home current workout saves use today's scheduled workout. Missed-workout saves
use the selected missed workout's scheduled week/day, not the current visible
date or today's workout context.

`src/program-schedule.ts` owns conversion from route/program coordinates into
stored context.

## Backup And Restore Requirements

History backups remain format version `1` because context fields are optional.
Export preserves valid context fields. Import accepts old records without
context and new records with context.

Invalid optional context fields are rejected:

- not finite numbers,
- non-integers,
- zero or negative values.

Import duplicate detection remains based on normalized `id`, `weight`, and
`date`, not context.

## Test Coverage

Unit tests:

- Schedule helper converts week/day coordinates to stored context.
- Schedule helper clamping follows existing cycle-position behavior.
- Storage upgrades a v1 database to version `2` and preserves records.
- Storage index assertions include `exerciseCycleContext`.
- Context saves write all optional context fields.
- Exact context lookup beats a newer wrong-context fallback.
- Fallback returns newest same-exercise record when exact context is absent.
- No record returns an empty `none` result.
- Imported context records are queryable by exact context.
- Backup export/import preserves valid context fields and accepts old backups.
- Backup import rejects invalid context fields.

Browser tests:

- Exact context record displays before a newer fallback.
- Fallback label displays when only legacy records exist.
- Route saves include route scheduled context.
- Missed-workout saves include missed scheduled context.
- Backup import preserves context enough for exact lookup.
- Offline save behavior still works with database version `2`.

## Acceptance Criteria

- `DB_VERSION` is `2`; `DB_NAME` remains `hiit-app-db`; store remains
  `Weights`.
- Existing v1 records remain readable after upgrade.
- New scheduled saves include `programWeek`, `cycle`, `cycleWeek`,
  `cycleLength`, and `workoutDay`.
- Exact lookup returns the newest matching context record even if a newer
  same-exercise fallback exists.
- Fallback lookup returns the newest same-exercise record when no exact context
  match exists.
- UI visibly distinguishes `Last from Cycle Week X/12 • Day Y` from
  `Last logged for exercise`.
- Missed-workout saves store missed scheduled context.
- Backup export/import preserves optional context fields.
- Old backups and old records without context still import and read.
- No exact context is inferred for legacy records.
- Full Docker verification passes.

## Rollback

Rollback must preserve user data already written to IndexedDB version `2`.
Reverting only `DB_VERSION` is unsafe for browsers that opened the upgraded
database. A rollback should either keep a version `2` compatible storage layer
or ship a forward-compatible repair path.
