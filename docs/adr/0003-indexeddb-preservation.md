# ADR 0003: IndexedDB Preservation

Status: Accepted

Date: 2026-05-29T15:51:43-05:00

## Decision

Preserve the existing IndexedDB persistence contract during the refactor.

Compatibility contract:

- Database name: `hiit-app-db`.
- Object store: `Weights`.
- Record shape: `{ id, weight, date }`.
- `id` remains the exercise identifier.
- `weight` remains free text.
- `date` remains parseable as a date.

Storage code may move behind an adapter if the persisted contract remains unchanged.

## Context

Users store workout weight history locally on device. There is no backend, account system, cloud sync, import/export feature, or planned IndexedDB schema migration. The refactor is unsuccessful if existing IndexedDB integration or user data is affected.

## Options Considered

- Keep storage code exactly where it is.
- Move storage code behind a compatibility-preserving adapter.
- Redesign the IndexedDB schema.
- Add cloud sync or account-backed storage.

## Rationale

An adapter gives the refactor a testable seam while preserving the existing database. A schema redesign or backend would increase data-loss risk and contradict the local-only product direction.

## Consequences

- Storage behavior must be characterized before UI migration.
- Tests must verify old records are readable.
- Tests must verify new records preserve the existing shape.
- No IndexedDB migration is allowed in the initial refactor.
- Future schema changes require a separate RFC and explicit migration plan.
