# RFC 0004: Cycle-Context Weight History

Status: Proposed

Owner: Fitz

Created: 2026-07-07

Target release: `v4.1.3`

## Summary

Add scheduled workout context to future weight-history records so workout
cards can prefer the most relevant previous load for the same point in the
repeating 12-week cycle. The app should first look for the newest record with
the same exercise, cycle week, cycle length, and workout day, then fall back to
the newest same-exercise record when no exact cycle-context match exists.

The database remains local-only IndexedDB. The database name stays
`hiit-app-db`, the object store stays `Weights`, and legacy records remain
readable.

## Problem Statement

The current persisted record shape is `{ id, weight, date }`. Those fields
cannot prove the scheduled cycle context that produced a save. The `date` is a
save timestamp, not a scheduled workout date, and missed-workout logging can
save a prior scheduled workout on a later calendar day.

Because current records cannot prove cycle context, exact context lookup is
only available for records saved after this feature or imported from a backup
that includes the new optional context fields. Legacy records without context
remain valid and are used as the fallback source.

## Goals

- Bump the IndexedDB database version from `1` to `2`.
- Keep the database name `hiit-app-db`.
- Keep the object store `Weights`.
- Preserve all existing records during upgrade.
- Add optional scheduled context fields to new saved records.
- Prefer newest exact cycle-context matches before same-exercise fallback.
- Preserve optional context fields in backup export and import.
- Keep old backups and old records without context readable.
- Avoid inferring exact cycle context from legacy save dates.

## Non-Goals

- Do not add cloud sync, accounts, or backend storage.
- Do not change exercise IDs, workout data, `DB_NAME`, or `WEIGHT_STORE`.
- Do not append hidden metadata to the free-text `weight` string.
- Do not infer exact cycle context for legacy records that lack context fields.
- Do not remove the legacy `public/service-worker.js` migration bridge.
- Do not implement quick fill in this change.

## Data Model

Existing fields remain:

- `id`: exercise identifier.
- `weight`: free-text saved weight plus app-added workout details.
- `date`: save timestamp.

New records add optional scheduled context fields:

- `programWeek`: one-based absolute program week at save time.
- `cycle`: one-based cycle number at save time.
- `cycleWeek`: one-based week within the repeated cycle.
- `cycleLength`: normally `12`.
- `workoutDay`: one-based workout day in the week.

The optional fields allow exact lookup for records that have them. They are not
required for legacy compatibility.

## Storage Migration

IndexedDB changes:

- Database: `hiit-app-db`
- Store: `Weights`
- Version: `2`
- Existing indexes stay in place: `id`, `date`, and `weight`
- New compound index:
  `exerciseCycleContext` on `["id", "cycleLength", "cycleWeek", "workoutDay"]`

The migration must not transform existing records. Existing records without the
optional context fields will not appear in the compound index, which is
expected and is why fallback remains part of lookup.

## Lookup Behavior

Lookup order:

1. Newest record for the same `id`, `cycleLength`, `cycleWeek`, and
   `workoutDay`.
2. Newest record for the same `id` regardless of context.
3. No previous value.

The UI should distinguish exact context matches from fallback results:

- Exact context match: `Last from Cycle Week X/12 • Day Y`
- Fallback match: `Last logged for exercise`
- Empty state: `No previous`

The app must not show exact cycle-context wording for legacy records without
the context fields.

## Backup And Restore

Backups keep format version `1` because the new fields are optional. Exported
records preserve valid optional context fields when present. Imported backups
without context still parse and import as legacy records.

Import validation must reject invalid optional context fields, while valid
context-bearing records must remain queryable by exact cycle context after
import.

Duplicate detection remains based on normalized `id`, `weight`, and `date`.
The optional context fields are not part of the duplicate key for this change.

## Offline And PWA Impact

This remains a local IndexedDB feature and must work offline after the app shell
is cached. Service-worker expectations do not change, and the legacy
`public/service-worker.js` migration bridge remains in place.

## Acceptance Criteria

- `DB_VERSION` is `2`; `DB_NAME` remains `hiit-app-db`; store remains
  `Weights`.
- Existing v1 records remain readable after upgrade.
- Scheduled workout saves include `programWeek`, `cycle`, `cycleWeek`,
  `cycleLength`, and `workoutDay`.
- Exact lookup returns the newest matching context record even when a newer
  same-exercise fallback exists.
- Fallback lookup returns the newest same-exercise record when no exact context
  match exists.
- The UI visibly distinguishes exact context from fallback.
- Missed-workout saves store the missed workout's scheduled context.
- Backup export and import preserve optional context fields.
- Old backups and old records without context still import and read.

## Rollback

Revert the context-aware lookup UI, storage API additions, backup preservation,
and tests. Because a browser that has opened version `2` cannot be downgraded
to version `1`, rollback must keep compatibility with existing version `2`
databases or ship a forward-compatible repair migration rather than changing
`DB_VERSION` back in isolation.
