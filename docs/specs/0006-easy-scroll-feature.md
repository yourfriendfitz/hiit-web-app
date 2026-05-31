# Milestone 6 Spec: Easy Scroll Feature

Status: Accepted

Owner: Fitz

Created: 2026-05-30T18:39:05-05:00

Accepted: 2026-05-30T18:45:25-05:00

Related RFC: [`RFC 0001`](../rfcs/0001-spec-driven-refactor-plan.md)

Related ADRs:

- [`ADR 0001`](../adr/0001-stack-selection.md)
- [`ADR 0003`](../adr/0003-indexeddb-preservation.md)

## Summary

Make the workout Directory open near the current training week instead of requiring users to manually scroll through earlier weeks. Keep every week and workout link available, preserve the mobile-first layout introduced in Milestone 5, and avoid changes to workout content, storage, routing, or offline behavior.

The feature should calculate a safe directory target from the fixed program start date and current device time. It should scroll once when the Directory mounts, prefer smooth motion when appropriate, and leave users free to browse older or future weeks afterward.

## Goals

- Reduce repeated scrolling when opening the 48-week Directory.
- Auto-scroll the Directory to the current training week on load.
- Clamp the target safely to the first or final available week when the current date falls outside the program range.
- Prefer smooth scrolling for standard motion settings.
- Respect reduced-motion preferences by using immediate positioning.
- Keep manual browsing available after the initial automatic scroll.
- Make the date calculation independently testable and reuse it where practical.
- Preserve the fixed bottom navigation and mobile layout behavior from Milestone 5.

## Non-Goals

- Do not auto-scroll to an exact workout day in this milestone.
- Do not add a floating return-to-current-week control.
- Do not keep re-centering the Directory after the user scrolls manually.
- Do not change the fixed program start date.
- Do not change workout data or exercise metadata.
- Do not change IndexedDB schema, records, weight entry, or History behavior.
- Do not add Multi Workout behavior; that remains Milestone 7.
- Do not change service-worker or GitHub Pages deployment behavior.

## Scope

### Current Week Calculation

- Add or extract a small schedule helper that calculates the current training-week index from:
  - The fixed `PROGRAM_START_DATE`.
  - A supplied current date for deterministic tests.
  - The available number of program weeks.
- Clamp the returned index:
  - Dates before the program start target Week 1.
  - Dates within the program target the calculated week.
  - Dates after the program target the final available week.
- Keep the helper independent of the DOM and persisted storage.
- Reuse the helper in `src/App.tsx` where doing so removes duplicate week arithmetic without broadening the milestone.

### Directory Positioning

- Give each rendered Directory week section a stable ref or data attribute.
- When Directory mounts, identify the clamped current-week section and scroll it into view once.
- Prefer `scrollIntoView({ behavior: "smooth", block: "start" })` for standard motion settings.
- Use immediate positioning when `prefers-reduced-motion: reduce` is active.
- Do not trigger automatic repositioning after the initial Directory mount.
- Keep the current-week heading and its first workout rows visible above the fixed bottom navigation.
- Keep route-change scroll restoration from Milestone 5 intact; the Directory-specific scroll runs after the route renders.

### Visual State

- Add a restrained current-week indicator to the targeted week heading if it improves orientation without increasing layout noise.
- Preserve the existing week/day card hierarchy and every workout link.
- Avoid adding new floating controls or nested cards.

## Out Of Scope

- Exact-day positioning.
- A persistent jump-to-current-week action.
- Multi-workout composition.
- Workout editing.
- New storage fields or schema migration.
- PWA cache strategy changes.
- Remote repository setting changes.

## User Impact

Opening Directory should land users at the relevant part of the training plan instead of Week 1. Users can still scroll backward or forward normally and open any workout. Before the configured program start date, Directory opens at Week 1. After the configured program ends, Directory opens at the final available week.

## Architecture Impact

The current week arithmetic in `src/App.tsx` should move into a small testable schedule helper if that keeps Home and Directory behavior aligned. `src/components/directory.tsx` should own DOM positioning because it owns the rendered week sections.

The component should perform one mount-time positioning effect. It should not introduce global scroll listeners, timers, or persisted UI state.

## Data And Storage Impact

No persisted data changes are allowed.

- `public/data.json` remains unchanged.
- `public/exercises.json` remains unchanged.
- Database name remains `hiit-app-db`.
- Database version remains `1`.
- Object store remains `Weights`.
- Record shape remains exactly `{ id, weight, date }`.

## Offline And PWA Impact

No service-worker policy change is intended. Easy Scroll uses bundled program data and the device clock, so it must work offline after the existing first-visit precache.

Existing offline coverage must continue proving that Directory loads and weight entries remain available without a network connection.

## Files Likely Touched

- `src/App.tsx`
- `src/components/directory.tsx`
- `src/program-schedule.ts`
- `src/styles.css`
- `tests/unit/**`
- `tests/e2e/current-app.spec.js`
- `README.md`

## Acceptance Criteria

- Opening Directory automatically positions the current training week near the top of the viewport.
- The target week is derived from `PROGRAM_START_DATE`, current device time, and available program length.
- Dates before the program start target Week 1.
- Dates after the program end target the final available week.
- Standard motion settings prefer smooth positioning.
- Reduced-motion settings use immediate positioning.
- Auto-positioning occurs once per Directory mount and does not fight manual browsing.
- Every week and workout link remains available.
- Directory still opens correctly through fixed bottom navigation.
- The current-week heading and workout rows remain readable on narrow mobile viewports.
- Existing route scroll restoration, IndexedDB behavior, and offline guarantees remain intact.
- Full containerized checks pass.

## Regression Tests

- Unit test: a date before `PROGRAM_START_DATE` resolves to the first week.
- Unit test: a date during the program resolves to the expected zero-based week index.
- Unit test: a date after the final program week resolves to the final available week.
- Unit test: an empty program is handled safely.
- Playwright: opening Directory with a mocked date requests scrolling for the expected current-week section.
- Playwright: standard motion requests smooth positioning.
- Playwright: reduced-motion mode requests immediate positioning.
- Playwright: automatic positioning occurs once on mount and does not repeat during manual browsing.
- Playwright: users can still open a workout from the positioned Directory.
- Existing mobile Chromium and WebKit route, storage, toast, and listener-cleanup tests continue passing.
- Existing Chromium offline route and weight-save test continues passing.
- Visual QA screenshot: Directory opens at a mocked mid-program week on a mobile viewport.

## Manual QA Checklist

- Open the Docker production preview and enter Directory from bottom navigation.
- Confirm Directory opens near the current training week rather than Week 1.
- Scroll backward to Week 1 and forward toward the final week.
- Confirm manual scrolling is not overridden after the initial positioning.
- Open a workout from the positioned week and confirm the workout route loads.
- Return to Directory and confirm a fresh mount positions the current week again.
- Confirm the current-week heading and first workout rows are not obscured by bottom navigation.
- Confirm Directory positioning still works after the app is loaded offline.
- Check a reduced-motion browser setting and confirm positioning does not animate.

## Rollback Plan

Revert the schedule helper, Directory mount-time positioning effect, indicator styling, and related tests together. Because this milestone must not change workout content, IndexedDB records, or service-worker policy, rollback should not require user-data migration or cache-specific recovery.

## Open Questions

- None.

## Decision Log

- Target the current week only; exact-day positioning remains deferred.
- Clamp dates outside the program range to the first or final available week.
- Position once when Directory mounts so automatic behavior does not fight manual browsing.
- Prefer smooth motion unless the user requests reduced motion.
- Keep positioning local to the Directory component and keep date arithmetic independently testable.
