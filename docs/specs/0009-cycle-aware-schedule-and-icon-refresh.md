# Milestone 9 Spec: Cycle-Aware Schedule And Icon Refresh

Status: Accepted

Owner: Fitz

Created: 2026-06-26T14:18:21-05:00

Accepted: 2026-06-26T14:18:21-05:00

Related RFC: [`RFC 0001`](../rfcs/0001-spec-driven-refactor-plan.md)

Related ADRs:

- [`ADR 0001`](../adr/0001-stack-selection.md)
- [`ADR 0002`](../adr/0002-branch-release-flow.md)
- [`ADR 0003`](../adr/0003-indexeddb-preservation.md)

## Summary

The workout plan has been expanded to 96 weeks by repeating the existing
programming. The smallest exact repeated block is 12 weeks, so the UI should
make the plan feel like eight clear training cycles instead of a single long
week count.

This milestone adds cycle-aware labels to Home, workout headers, missed-workout
cards, and the Directory. It also replaces the app icon family with a simpler
dumbbell mark that better matches the current app.

## Goals

- Represent the 96-week plan as eight repeated 12-week cycles.
- Keep Home and workout route subtitles compact with labels such as
  `Cycle Week 12/12 • Day 5`.
- Keep missed-workout cards readable with date-first metadata such as
  `Fri, Aug 1 • Cycle Week 1/12 • Day 5`.
- Make the Directory the verbose planning view by grouping workouts into
  user-facing cycles.
- Collapse Directory cycles by default except the cycle containing the current
  week.
- Collapse weeks inside each Directory cycle by default except the current week.
- Refresh favicon, Apple touch, Android, and PWA icon assets with a clean
  app-specific mark.
- Make icon generation reproducible from a repo script.

## Non-Goals

- Do not change exercise IDs or authored exercise metadata.
- Do not change the IndexedDB database, version, store, indexes, or record
  shape.
- Do not introduce accounts, cloud sync, or a backend.
- Do not change the legacy PWA migration bridge at `/service-worker.js`.
- Do not normalize unrelated line-ending or formatting noise as part of this
  feature branch.

## Scope

- Add reusable cycle helpers in `src/program-schedule.ts`.
- Update app-route subtitle composition in `src/App.tsx`.
- Update Home current and missed-workout labels in
  `src/components/home-workout.tsx`.
- Update Directory rendering in `src/components/directory.tsx`.
- Add cycle and nested week summary styling in `src/styles.css`.
- Update app version metadata to `4.1.0`.
- Update tests for 96 weeks, eight 12-week cycles, compact labels, Directory
  collapse behavior, and icon build requirements.
- Replace icon assets in `public/`.
- Add `public/icon.svg`.
- Add `scripts/generate-icons.mjs` and the `npm run generate:icons` script.
- Update release documentation for `v4.1.0`.

## User Impact

Users can still browse the full program, but the schedule now communicates
where each workout sits inside the repeated training cycle. The current cycle
and current week are expanded automatically, reducing Directory noise while
keeping the rest of the plan available.

Users who install the PWA or save the app to their home screen see the refreshed
dark-and-mint dumbbell icon.

## Architecture Impact

Cycle math stays centralized in `src/program-schedule.ts` so Home, route
headers, Directory, and tests rely on the same 12-week cycle definition.
Directory grouping is presentational: route parameters remain global week/day
indexes, and no new route shape is introduced.

The icon refresh is asset-only at runtime. The generator uses Node standard
library APIs so the project does not gain an image-generation dependency.

## Data And Storage Impact

`public/data.json` now contains 96 weeks of workout programming. The user-facing
cycle model is derived from repeated data and does not add new fields to workout
records.

IndexedDB remains unchanged:

- Database: `hiit-app-db`
- Database version: `1`
- Store: `Weights`
- Record shape: `{ id, weight, date }`

Saved weight history remains compatible because records are still stored by
exercise ID and date.

## Offline And PWA Impact

The generated Workbox worker continues to precache the app shell, workout data,
exercise metadata, manifest, icons, and hashed build assets. The legacy
`public/service-worker.js` bridge remains deployed for installed `v3.0.4`
clients and is not changed by this milestone.

The PWA build verifier now requires `icon.svg`, matching the explicit
`index.html` favicon link.

## Files Touched

- `README.md`
- `docs/releases/v4.1.0.md`
- `docs/specs/0009-cycle-aware-schedule-and-icon-refresh.md`
- `index.html`
- `package.json`
- `package-lock.json`
- `public/android-chrome-192x192.png`
- `public/android-chrome-512x512.png`
- `public/apple-touch-icon.png`
- `public/favicon-16x16.png`
- `public/favicon-32x32.png`
- `public/favicon.ico`
- `public/icon.svg`
- `scripts/assert-pwa-build.mjs`
- `scripts/generate-icons.mjs`
- `src/App.tsx`
- `src/components/directory.tsx`
- `src/components/home-workout.tsx`
- `src/program-schedule.ts`
- `src/styles.css`
- `src/types.ts`
- `tests/e2e/current-app.spec.js`
- `tests/pwa/offline.spec.js`
- `tests/unit/program-schedule.test.ts`
- `tests/unit/workout-data.test.js`

## Acceptance Criteria

- Home and workout route subtitles use `Cycle Week X/12 • Day Y`.
- Missed-workout metadata uses `Date • Cycle Week X/12 • Day Y`.
- Directory groups the 96-week plan into eight cycles of 12 weeks.
- Only the current Directory cycle is expanded by default.
- Only the current week inside the current cycle is expanded by default.
- Non-current cycles and weeks remain manually expandable.
- Workout links still resolve to the correct global program week and day.
- The app footer and package metadata report `v4.1.0`.
- The new icon family is generated reproducibly by `npm run generate:icons`.
- The production PWA build includes the new SVG icon and existing install icon
  assets.

## Regression Tests

- Unit tests verify the 12-week cycle helper and compact schedule labels.
- Workout-data contract tests verify 96 weeks and eight identical 12-week
  cycles.
- E2E tests verify visible cycle labels and collapsed Directory behavior.
- PWA tests verify the updated Directory heading while preserving offline
  behavior.
- Production build verification requires `icon.svg` in the generated artifact.

## Manual QA Checklist

- Open Home on the current scheduled day and confirm the header subtitle format.
- Add a recent missed workout and confirm the missed-workout metadata format.
- Open Directory and confirm the current cycle and current week are expanded.
- Expand a non-current cycle and a non-current week and open a workout.
- Confirm the refreshed favicon appears in the browser tab.
- Confirm the 192px install icon uses the new dumbbell mark.
- Run the targeted changed-file format check plus lint, typecheck, unit tests,
  production build verification, E2E tests, and PWA offline tests in Docker.

## Rollback Plan

Revert the milestone branch or pull request. No database migration or saved
history cleanup is needed because storage schema and record shape are
unchanged.

## Open Questions

- None known.
