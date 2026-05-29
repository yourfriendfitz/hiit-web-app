# Milestone 1 Spec: Safety And Regression Harness

Status: Accepted

Owner: Fitz

Created: 2026-05-29T15:51:43-05:00

Accepted: 2026-05-29T16:05:02-05:00

Related RFC: [`RFC 0001`](../rfcs/0001-spec-driven-refactor-plan.md)

Related ADRs:

- [`ADR 0001`](../adr/0001-stack-selection.md)
- [`ADR 0002`](../adr/0002-branch-release-flow.md)
- [`ADR 0003`](../adr/0003-indexeddb-preservation.md)

## Summary

Add the first safety layer around the current static app before any product refactor. This milestone introduces package tooling, local scripted serving, formatting/linting/typecheck structure, Playwright smoke tests, initial Vitest setup, and CI. The current app behavior must not change.

## Goals

- Establish repeatable local commands for validation.
- Add end-to-end smoke tests for current critical behavior.
- Add a unit-test harness that later milestones can extend.
- Add CI checks for pull requests.
- Capture IndexedDB-sensitive behavior before migrating the UI.

## Non-Goals

- Do not migrate to React.
- Do not change app UI.
- Do not change service worker behavior.
- Do not change `data.json`.
- Do not change IndexedDB database name, store name, or record shape.
- Do not deploy GitHub Pages.

## Scope

- Add `package.json` and npm scripts.
- Add Playwright configuration.
- Add Vitest configuration.
- Add linting and formatting configuration.
- Add a local static-server command for the current app.
- Add smoke tests for launch, directory navigation, history, and weight save behavior.
- Add GitHub Actions CI for the introduced checks.
- Add a minimal containerized check path using the official Playwright image to satisfy container-first tooling without changing static GitHub Pages hosting.

## Out Of Scope

- Full unit coverage.
- Full accessibility test suite.
- Service worker rewrite.
- Vite app migration.
- Branch/default-branch remote changes.

## User Impact

Users should see no product behavior change. This milestone is infrastructure-only.

## Architecture Impact

The current static app remains the runtime architecture. New tooling files create a validation harness around it.

## Data And Storage Impact

IndexedDB behavior must remain unchanged. Tests may create browser-local test data during Playwright runs, but source code must not alter the existing persistence contract.

## Offline And PWA Impact

No intentional offline or service worker behavior changes are included in this milestone.

## Files Likely Touched

- `package.json`
- `package-lock.json`
- `playwright.config.*`
- `vitest.config.*`
- `.github/workflows/*`
- `.gitignore`
- `Dockerfile`
- `AGENTS.md`
- Test files under a new test directory
- Optional lint/format config files

## Acceptance Criteria

- A scripted local command serves the current static app.
- `npm run test:e2e` runs Playwright smoke tests.
- `npm run test` runs the unit-test harness.
- `npm run lint` and `npm run format:check` exist.
- CI runs the milestone checks on pull requests.
- CI runs checks in the pinned Playwright container image.
- Playwright verifies the app loads the current workout route.
- Playwright verifies directory navigation.
- Playwright verifies weight entry updates last-weight behavior.
- Playwright verifies history page access.
- No source behavior changes are made to the app.

## Regression Tests

- Launch app and confirm a workout or rest-day state renders.
- Open directory and navigate to a workout.
- Save a free-text weight entry for an exercise.
- Confirm the last weight display updates.
- Open history and confirm the saved entry can be found.

## Manual QA Checklist

- Serve the app locally.
- Open it in a browser.
- Confirm current workout loads.
- Save a weight.
- Navigate to History.
- Confirm the weight appears.
- Navigate to Directory.
- Confirm workout links work.

## Rollback Plan

Revert the tooling and test files. Because this milestone should not change runtime source behavior, rollback should not affect user data or deployed behavior.

## Decision Log

- CI runs on pull requests and pushes to `main` and `staging`.
- Playwright browser/system dependencies are supplied by `mcr.microsoft.com/playwright:v1.60.0-noble` instead of installing system packages on the host.
- E2E tests freeze the browser date inside the valid program window so the smoke suite characterizes normal launch behavior before the later final-week behavior correction.
