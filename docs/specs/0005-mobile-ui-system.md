# Milestone 5 Spec: Mobile UI System

Status: Accepted

Owner: Fitz

Created: 2026-05-30T12:34:18-05:00

Accepted: 2026-05-30T12:39:08-05:00

Related RFC: [`RFC 0001`](../rfcs/0001-spec-driven-refactor-plan.md)

Related ADRs:

- [`ADR 0001`](../adr/0001-stack-selection.md)
- [`ADR 0003`](../adr/0003-indexeddb-preservation.md)

## Summary

Replace the transitional React styling with a deliberate mobile-first workout interface optimized for iPhone Safari and repeated gym use. Preserve the current landing route, directory, history, IndexedDB records, offline behavior, and free-text weight workflow while improving navigation reachability, exercise-card scanning, weight-entry ergonomics, and visual consistency.

The implementation should introduce a small internal component system and design-token layer rather than a broad UI framework. The product should feel like a compact operational tool: quiet, fast to scan, and efficient during an active workout.

## Goals

- Keep the current workout as the default landing experience.
- Make Home, Directory, and History reachable one-handed from every route.
- Reduce visual noise and vertical scroll fatigue during workouts.
- Make collapsed exercise rows useful before expansion.
- Make free-text weight entry and Save obvious and comfortable on a phone.
- Establish reusable design tokens and internal UI primitives.
- Use consistent icons, touch targets, spacing, borders, and focus states.
- Keep route, storage, PWA, and deployment behavior unchanged.
- Verify the result visually on mobile and desktop viewports.

## Non-Goals

- Do not change workout data or exercise metadata.
- Do not change IndexedDB schema, record shape, or saved weight text.
- Do not persist set completion checkboxes.
- Do not add directory auto-scroll behavior; that remains Milestone 6.
- Do not add multiple-workout selection; that remains Milestone 7.
- Do not change service-worker or GitHub Pages deployment behavior.
- Do not add accounts, sync, import, or export.
- Do not introduce a general-purpose component framework.

## Scope

### Design Tokens

- Replace the transitional CSS palette with a compact token set for:
  - Background, raised surface, muted surface, and border.
  - Primary text, muted text, and subdued text.
  - Save/success, informational accent, warning, and danger states.
  - Spacing, fixed bottom-navigation height, safe-area insets, radii, shadows, and focus rings.
- Keep neutral surfaces dominant and reserve stronger colors for hierarchy and state.
- Remove decorative gradients and glow effects that do not improve usability.
- Use a system font stack so offline rendering remains self-contained.
- Keep repeated item cards at `8px` radius or less.

### Internal Components

- Extract focused components from `src/App.tsx` where they clarify ownership:
  - App frame.
  - Top route header.
  - Bottom navigation.
  - Exercise summary row.
  - Exercise details.
  - Metric display.
  - Weight logger.
  - Last-weight indicator.
  - Directory week and day rows.
  - History search, groups, and entries.
- Add `lucide-react` for familiar interface icons instead of maintaining handwritten SVG paths.
- Keep component APIs narrow and avoid speculative abstractions.

### Navigation

- Replace the split top-corner navigation controls with a fixed bottom navigation bar.
- Show Home, Directory, and History with icon and text labels.
- Respect `env(safe-area-inset-bottom)` for installed iPhone usage.
- Keep each destination at least `44px` high and wide.
- Keep a compact top header for route title and week/day subtitle.
- Move the version string out of the fixed floating corner so it cannot overlap content or bottom navigation.

### Workout View

- Keep exercise cards collapsed by default.
- Make each collapsed row show:
  - Exercise order.
  - Exercise name.
  - Working-set and rep summary.
  - Latest saved weight when available.
  - Expand/collapse indicator.
- Keep expanded details readable as one flat content region with dividers rather than nested cards.
- Group programming details with compact metrics for sets, reps, rest, and RPE.
- Keep notes, intensity technique, substitutions, and YouTube embeds available.
- Allow the video embed to sit behind a labeled disclosure if that materially reduces scroll fatigue.
- Keep set checkboxes as comfortable tap rows without persisting completion.
- Keep free-text weight input.
- Add an appropriate mobile keyboard hint such as `inputMode="decimal"` without restricting free-text values.
- Keep Save as a clear icon-and-text action.
- Preserve dirty-input tracking so service-worker updates cannot discard entered weight text.

### Directory And History

- Keep Directory as a week-by-week list and preserve every workout link.
- Improve day-row scanning with consistent date, workout name, and exercise-count hierarchy.
- Do not implement current-week auto-scroll yet.
- Keep History search visible and easy to reach.
- Keep history groups collapsible and show the latest entry clearly.
- Preserve exercise-name filtering and existing saved-record ordering behavior.

### Responsive Behavior

- Optimize the primary layout for narrow iPhone viewports first.
- Keep a constrained content width on larger screens without turning the app into a marketing-style page.
- Ensure bottom navigation does not obscure workout actions, history entries, or directory rows.
- Prevent horizontal overflow for long exercise names, notes, substitutions, and saved free-text weights.
- Keep interactive controls stable when labels or saved values change.

## Out Of Scope

- Directory scroll positioning.
- Multi-workout composition.
- Workout editing.
- Timer, rest tracking, or notifications.
- Set-completion persistence.
- New workout-history fields.
- PWA cache strategy changes.
- Remote repository setting changes.

## User Impact

Users should notice a materially cleaner phone interface. The current workout still appears on launch, but navigation moves to a reachable bottom bar, exercise rows become easier to scan before expansion, and weight entry becomes more direct during an active workout.

The saved-weight format, workout content, directory structure, history behavior, and offline workflow remain compatible with earlier milestones.

## Architecture Impact

`src/App.tsx` currently owns most UI rendering. This milestone may split presentation components into `src/components/**` while keeping data loading, routing, and storage boundaries intact.

`src/styles.css` becomes the source of truth for shared design tokens and small component classes. Tailwind remains available for restrained layout utilities, but repeated UI patterns should use stable internal component classes rather than long duplicated utility strings.

`lucide-react` becomes the icon source for standard navigation and action symbols.

## Data And Storage Impact

No persisted data changes are allowed.

- Database name remains `hiit-app-db`.
- Database version remains `1`.
- Object store remains `Weights`.
- Record shape remains exactly `{ id, weight, date }`.
- Weight entry remains free text with the existing appended programming context.

## Offline And PWA Impact

No service-worker policy change is intended. New bundled component code, CSS, and icon imports should remain part of the generated hashed precache.

Offline regression coverage must continue proving that the app shell, workout routes, directory, history, and weight saves work after the first visit.

## Files Likely Touched

- `src/App.tsx`
- `src/components/**`
- `src/styles.css`
- `tests/e2e/**`
- `tests/pwa/**`
- `package.json`
- `package-lock.json`
- `README.md`
- `AGENTS.md`

## Acceptance Criteria

- Current workout remains the default landing experience.
- Home, Directory, and History are available from a fixed bottom navigation bar.
- Bottom navigation respects the iPhone safe-area inset and does not cover page content.
- Standard interface icons come from `lucide-react`.
- Primary navigation and weight-entry controls meet a minimum `44px` touch-target size.
- The top header is compact and route-specific.
- Collapsed exercise rows show exercise name, working-set/rep summary, and latest saved weight when available.
- Exercise expansion still exposes programming details, notes, substitutions, video, set checkboxes, and weight entry.
- Free-text weight entry still works with the existing persisted record shape.
- Dirty input still defers PWA update reloads.
- Directory exposes every week and workout link without auto-scrolling.
- History search, grouping, latest-entry display, and filtering remain functional.
- Version text does not overlap bottom navigation or workout content.
- Narrow mobile viewports have no horizontal overflow.
- Existing PWA build and offline guarantees remain intact.
- Full containerized checks pass.

## Regression Tests

- Existing Vitest storage, update-policy, and workout-data tests continue passing.
- Existing mobile Chromium and WebKit route, storage, and listener-cleanup tests continue passing.
- Existing Chromium offline route and weight-save test continues passing.
- Playwright: bottom navigation renders Home, Directory, and History destinations on mobile.
- Playwright: bottom navigation reaches Directory and History, then returns Home.
- Playwright: navigation and Save controls have at least `44px` touch targets.
- Playwright: a collapsed exercise row exposes exercise name and programming summary.
- Playwright: expanding an exercise exposes free-text weight input and Save.
- Playwright: saving weight updates the latest-weight indicator and History.
- Playwright: long exercise content does not create horizontal overflow at iPhone viewport width.
- Visual QA screenshots: home workout collapsed, workout expanded, Directory, and History on mobile Chromium.
- Visual QA screenshots: workout route on a desktop viewport.

## Manual QA Checklist

- Open the Docker production preview on an iPhone-sized viewport.
- Confirm the current workout is visible immediately.
- Use bottom navigation to visit Home, Directory, and History.
- Confirm bottom navigation remains reachable and does not cover the last row on each route.
- Expand several exercises and confirm details remain scannable.
- Save a free-text weight and confirm the latest value updates.
- Reload and confirm the saved value remains visible.
- Open History and filter by exercise name.
- Confirm long exercise names, notes, substitutions, and weight values wrap without horizontal scrolling.
- Confirm focus states and touch targets are comfortable.
- Confirm the installed PWA layout respects the iPhone bottom safe area.
- Review mobile and desktop screenshots before accepting the milestone.

## Rollback Plan

Revert the UI component extraction, icon dependency, and CSS token changes together. Because routing, IndexedDB, workout content, and service-worker policy must remain unchanged, rollback should not require data migration or cache-specific recovery.

## Open Questions

- None.

## Decision Log

- Use a fixed bottom navigation bar for one-handed access.
- Keep a compact top header for route context rather than navigation controls.
- Use `lucide-react` for standard interface icons.
- Use `lucide-react` `1.17.0`, installed from the current npm package during implementation.
- Keep the visual language restrained: neutral surfaces, small radii, limited shadows, and color reserved for state.
- Keep the current storage and offline contracts unchanged.
