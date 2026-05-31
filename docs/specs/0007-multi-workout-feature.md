# Milestone 7 Spec: Multi Workout Feature

Status: Accepted

Owner: Fitz

Created: 2026-05-30T19:01:39-05:00

Accepted: 2026-05-30T19:14:58-05:00

Related RFC: [`RFC 0001`](../rfcs/0001-spec-driven-refactor-plan.md)

Related ADRs:

- [`ADR 0001`](../adr/0001-stack-selection.md)
- [`ADR 0003`](../adr/0003-indexeddb-preservation.md)

## Summary

Add a compact quick-add workflow to the Home workout screen so a user who missed a recent workout can include it in the current training session. Limit options to scheduled workouts from the previous two calendar days, render the current workout first, and render one selected missed workout as a clearly labeled second section.

The feature must remain local-only and offline-capable. It should compose existing bundled workout data without changing the workout program, IndexedDB schema, saved record shape, directory routes, or history behavior.

## Goals

- Let users add one eligible missed workout from the previous two calendar days to today's Home workout screen.
- Keep the current workout visible first and clearly distinguish the optional added workout.
- Make quick-add and remove actions obvious on a narrow phone viewport.
- Limit the choice set to recent scheduled workouts so the workflow stays fast and intentional.
- Preserve free-text weight logging, Last Weight display, set checkboxes, exercise details, and dirty-input PWA protection in both workout sections.
- Keep persisted weight records associated with the existing exercise ID contract.
- Keep repeated UI instances collision-free when both sections contain the same exercise.
- Make recent-workout eligibility deterministic and independently testable.
- Keep the feature available offline because it only composes bundled program data.

## Non-Goals

- Do not allow more than one added missed workout at a time.
- Do not allow arbitrary historical workout selection.
- Do not add a custom workout builder.
- Do not persist the selected missed workout across reloads or route changes.
- Do not persist set completion checkboxes.
- Do not change workout data, exercise metadata, or exercise IDs.
- Do not change IndexedDB schema or saved weight record shape.
- Do not add calendar editing, drag-and-drop reordering, or workout completion tracking.
- Do not change service-worker or GitHub Pages deployment behavior.

## Scope

### Eligible Workout Resolution

- Extend the schedule helper with a DOM-independent function that resolves eligible previous workouts from:
  - The bundled workout program.
  - The fixed `PROGRAM_START_DATE`.
  - A supplied current date for deterministic tests.
  - A maximum lookback of the previous two calendar days.
- Use local calendar-day arithmetic so daylight-saving changes do not shift schedule coordinates.
- Include only valid scheduled workout days from the program:
  - Monday through Friday workout entries may be offered.
  - Weekend days without bundled workouts are skipped.
  - Dates before the program starts are skipped.
  - Dates after the final authored workout week are skipped rather than clamped.
- Preserve chronological context in each option:
  - Zero-based week and day indexes for lookup.
  - Workout name.
  - Human-readable weekday/date label.
- Keep the existing clamped Home week behavior from Milestone 6 unchanged.

### Home Quick-Add Workflow

- Add a compact Home-only quick-add surface above or directly below the current workout heading.
- Show the affordance only when today's Home route has a scheduled workout and at least one eligible previous workout exists.
- Label the action in user-facing language such as `Add missed workout`.
- Show at most two eligible options, each with the day/date and workout name.
- Allow one option to be selected at a time.
- After selection:
  - Keep today's workout section first.
  - Render the added missed workout as a second labeled section.
  - Provide a clear Remove action for the added section.
- Keep directory-selected `#/workout?week=...&day=...` routes single-workout views without the quick-add surface.
- Keep Home rest-day behavior unchanged; do not show quick-add when there is no current Home workout.

### Workout Section Composition

- Introduce a small section wrapper or narrow `WorkoutView` extension so each rendered workout has:
  - A stable UI instance key.
  - A visible section label such as `Today` or `Added missed workout`.
  - Workout name and day/date context where useful.
- Keep exercise-card presentation consistent with Milestone 5.
- Namespace DOM IDs, ARIA relationships, React keys, and dirty-input tracking IDs by workout instance.
- Continue passing the original exercise ID to IndexedDB reads and writes.
- If the same exercise appears in both sections:
  - Each card, disclosure, weight input, and PWA dirty-state entry remains independent in the DOM.
  - Saving either input stores a record under the existing exercise ID.
  - Last Weight updates consistently in both visible instances.

### Mobile Layout

- Keep the quick-add controls compact and touch-friendly.
- Keep primary controls at least `44px` high and wide.
- Avoid nested cards and large decorative panels.
- Keep the fixed bottom navigation clear of the final workout rows and Remove action.
- Prevent horizontal overflow for long workout names and option labels.

## Out Of Scope

- More than one added missed workout.
- Quick-add from Directory-selected workout routes.
- Persisting quick-add selection.
- Exact workout completion state.
- Rest timers, notifications, or calendar reminders.
- New storage fields or schema migration.
- PWA cache strategy changes.
- Remote repository setting changes.

## User Impact

On a scheduled Home workout day, users can add one recent missed workout without leaving the current session screen. The current workout remains first. The selected missed workout appears as a clearly labeled second section and can be removed without affecting saved weight history.

Users continue logging weights in the same free-text format. Saved entries remain compatible with earlier versions because persistence still uses the original exercise IDs and `{ id, weight, date }` record shape.

## Architecture Impact

`src/program-schedule.ts` should own previous-calendar-day schedule resolution so date arithmetic remains testable and DST-safe.

`src/App.tsx` should own the transient Home selection because it composes route-level workout sections. The selection should reset naturally when the Home route unmounts or the page reloads.

`src/components/workout.tsx` should support repeated workout sections by accepting a stable UI instance key and namespacing DOM/ARIA/dirty-state identifiers. Storage calls must continue using authored exercise IDs.

If a separate quick-add component improves ownership, keep it focused under `src/components/**` rather than adding a broad state-management abstraction.

## Data And Storage Impact

No persisted data changes are allowed.

- `public/data.json` remains unchanged.
- `public/exercises.json` remains unchanged.
- Database name remains `hiit-app-db`.
- Database version remains `1`.
- Object store remains `Weights`.
- Record shape remains exactly `{ id, weight, date }`.
- `id` remains the authored exercise identifier.
- `weight` remains free text with the existing appended programming context.

Multi Workout changes UI composition only. It must not introduce workout-instance IDs into persisted records.

## Offline And PWA Impact

No service-worker policy change is intended. Multi Workout uses bundled program data, exercise metadata, and the device clock, so eligible options and composed workout sections must work offline after the existing first-visit precache.

Dirty-input protection must continue covering every visible weight field. An unsaved value in either workout section must defer a waiting PWA update reload.

## Files Likely Touched

- `src/App.tsx`
- `src/components/workout.tsx`
- `src/components/**`
- `src/program-schedule.ts`
- `src/styles.css`
- `tests/unit/program-schedule.test.ts`
- `tests/e2e/current-app.spec.js`
- `tests/pwa/offline.spec.js`
- `README.md`
- `AGENTS.md`

## Acceptance Criteria

- On a scheduled Home workout day with eligible recent workouts, the UI exposes an `Add missed workout` affordance.
- Quick-add options contain only valid scheduled workouts from the previous two calendar days.
- Weekend, pre-program, and post-program candidate dates are skipped.
- Users can select one eligible workout.
- Today's workout remains visible first.
- The selected missed workout renders as a clearly labeled second section.
- Users can remove the added workout without changing saved weight history.
- Directory-selected workout routes remain single-workout views.
- Home rest days do not expose the quick-add affordance.
- Repeated exercises across workout sections have unique DOM IDs, ARIA relationships, React keys, and dirty-state tracking IDs.
- Saving from either section writes the unchanged `{ id, weight, date }` record shape using the authored exercise ID.
- Last Weight updates correctly in both sections when the same exercise is visible twice.
- Unsaved weight input in either section still defers PWA update reloads.
- The combined layout remains usable on narrow mobile viewports without horizontal overflow.
- Existing Easy Scroll, IndexedDB, and offline guarantees remain intact.
- Full containerized checks pass.

## Regression Tests

- Unit test: recent-workout resolution returns the previous two valid weekday workouts when both exist.
- Unit test: recent-workout resolution crosses a week boundary correctly.
- Unit test: recent-workout resolution skips weekend days.
- Unit test: recent-workout resolution skips dates before program start.
- Unit test: recent-workout resolution skips dates after the authored program range rather than clamping.
- Playwright: Home shows eligible quick-add options for a mocked weekday.
- Playwright: selecting an option keeps Today first and renders the added missed workout second.
- Playwright: Remove returns Home to a single workout section.
- Playwright: Directory-selected workout routes do not show quick-add controls.
- Playwright: repeated workout sections do not create duplicate IDs.
- Playwright: saving a weight from the added workout updates Last Weight and History.
- Playwright: combined mobile layout has no horizontal overflow.
- Chromium PWA test: quick-add selection and weight save work after switching offline.
- Existing mobile Chromium and WebKit route, storage, toast, Directory positioning, and listener-cleanup tests continue passing.
- Existing Chromium offline route and weight-save test continues passing.
- Visual QA screenshots: Home quick-add closed, options open, and selected missed-workout section on mobile Chromium.

## Manual QA Checklist

- Open the Docker production preview with a mocked scheduled weekday or during a weekday workout.
- Confirm Home still shows today's workout first.
- Open `Add missed workout` and inspect the available previous-day options.
- Confirm no option is older than two calendar days.
- Select one option and confirm its workout appears as a second labeled section.
- Expand and collapse exercises in both sections.
- Save a free-text weight from the added workout and confirm Last Weight and History update.
- If the same exercise appears in both sections, confirm both visible Last Weight indicators update.
- Enter unsaved weight text in the added section and confirm the PWA update policy still treats the app as dirty.
- Remove the added workout and confirm today's section remains intact.
- Open a Directory workout and confirm it remains a single-workout screen.
- Confirm the combined phone layout does not overflow horizontally or hide final actions behind bottom navigation.
- Confirm the workflow still works after the app is loaded offline.

## Rollback Plan

Revert the recent-workout schedule helper, Home quick-add composition, repeated-instance identifier namespacing, styles, and related tests together. Because this milestone must not change authored workout data, IndexedDB schema, or saved record shape, rollback should not require user-data migration or cache-specific recovery.

## Open Questions

- None.

## Decision Log

- Limit quick-add eligibility to scheduled workouts from the previous two calendar days.
- Allow one added missed workout at a time.
- Keep today's workout first and render the selected missed workout second.
- Expose quick-add only on Home when today's workout exists; Directory workout routes stay single-workout views.
- Keep selection transient and local to the Home screen.
- Namespace UI instance identifiers while preserving authored exercise IDs for IndexedDB.
- Skip invalid candidate dates rather than clamping them into the authored program range.
