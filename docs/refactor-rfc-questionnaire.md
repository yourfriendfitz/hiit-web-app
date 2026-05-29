# Refactor RFC Questionnaire

Use this document to answer the decisions needed before drafting the spec-driven RFC and milestone plan.

Current repo baseline:

- Static PWA using plain HTML, CSS, and JavaScript.
- Runtime dependencies are loaded from CDNs.
- Workout data is stored in `data.json` and `exercises.json`.
- User-entered weights are stored locally in IndexedDB.
- Offline support is implemented with `service-worker.js`.
- Default branch is `staging`.

Answer format:

- Answer inline under each `Answer:` line.
- Use `TBD` when unknown.
- Add examples when a behavior should be precise.
- Mark must-have items separately from nice-to-have items.

## 1. Product Direction

1. What is the primary purpose of this app after the refactor?

Answer: This is a workout app used by a small group of friends hosted on my own github thru github pages.

2. Who are the target users?

Answer: Myself and a few others

3. Which devices matter most: iPhone, Android, desktop, tablet, or all?

Answer: Iphone is the main devices used, mobile devices only; phones only.

4. Should the app remain installable and usable offline as a core requirement?

Answer: The offline features are nice, but we dont want users to become stuck from recieving updates when new versions come out

5. Should the refactor preserve the current user experience as much as possible, or is a visible redesign acceptable?

Answer: lets enforce UI best practices even if that means the UI changes. We can take it milestone by milestone and go from there.

## 2. Deployment And Environments

1. Where should production be hosted after the refactor?

Answer: we will continue to host on github pages on my github

2. Should the current Glitch staging/prod URLs remain supported?

Answer: we are not longer using glitch

3. What environments do you want?

Answer: we just need the one live env on github pages and the rest can be local

4. What branch flow should we use?

Answer: lets talk about this more, but I say recommended approach

5. Should releases have semantic versions, changelogs, GitHub releases, or simple branch deploys?

Answer: lets start doing github releases

## 3. Technology Direction

1. Do you want to keep the app framework-free, or move to a modern app stack?

Answer: if it makes sense to move stacks lets do that

2. If moving stacks, do you have a preference?

Answer: lets use the latest trend

3. Should the refactor introduce TypeScript?

Answer: yes

4. Should the app use a build tool such as Vite?

Answer: yes

5. Should UI stay Bootstrap-based, move to custom CSS, or use a component library?

Answer: lets move to current best practice

6. Are there technologies you explicitly do not want?

Answer: lets use trending tech

## 4. Data And Domain Model

1. Is the current workout data authoritative, or should it be treated as seed data that can change?

Answer: the data in data.json is expert created content and should be treated as source of truth. Do not change it.

2. Should users eventually create or edit workout plans?

Answer: No

3. Should exercise metadata and workout programming stay in JSON files, move to a typed local schema, or move to a backend?

Answer: We will stay backend free and keep the full stack client side approch with indexedDB that must remain the same. The indexedDB integration is crucial to stay intact during the refactor so users dont lose their data.

4. Should the app support multiple programs, not just the current HIIT/PPL program?

Answer: No for right now its single program

5. Should weight history keep only free-text entries, or should it become structured data?

Answer: keep the input free-text

6. Should we preserve all existing IndexedDB user data through migrations?

Answer: refer to #3, we will not touch indexedDB data or integration

## 5. Storage, Sync, And Accounts

1. Should all user data remain local-only?

Answer: yes on device only

2. Should the app eventually support cloud backup or multi-device sync?

Answer: no

3. If sync is desired, should it require user accounts?

Answer: n/a

4. Are there privacy constraints around workout history, body metrics, or user identity?

Answer: n/a

5. Should users be able to export and import their data?

Answer: not right now

## 6. New Feature Backlog

Use this section for features you will describe later. Duplicate the template for each feature.

### Feature Template

Name:

Problem:

Target users:

Must-have behavior:

Nice-to-have behavior:

Data needed:

Offline behavior:

Success criteria:

Priority:

Dependencies or blockers:

### Multi Workout Feature

Name: Multi Workout

Problem: Users missed a workout and want to add a previous day to their current day's workout

Target users: all users

Must-have behavior: screen showing workouts includes the target day plus the current day workouts

Nice-to-have behavior: the way the target day is added is UX friendly possibly a button placed where users expect

Data needed: the target day (should be limited to previous 2 days workouts on a quick add)

Offline behavior: doesnt need any data to work offline

Success criteria: both days workouts show on the workouts screen

Priority: medium

Dependencies or blockers: none

### Easy Scroll Feature

Name: Easy Scroll

Problem: Users must scroll to the current week in the workout week by week screen

Target users: all users

Must-have behavior: page auto scrolls to current week

Nice-to-have behavior: smooth scroll, exact day is scrolled to

Data needed: none, just system reads current time

Offline behavior: doesnt need any data to work offline

Success criteria: scrolls to current week on load of week by week

Priority: medium

Dependencies or blockers:

## 7. Existing Feature Requirements

1. What current features must not regress?

Answer: Users must see current workout on load, users must be able to input their weight for each workout

2. Should the app still show today's workout based on a fixed program start date?

Answer: yes

3. Should users be able to browse all weeks and days?

Answer: yes

4. Should exercise videos remain embedded from YouTube?

Answer: yes

5. Should users be able to search weight history by exercise?

Answer: yes

6. Should saved set completion checkboxes persist?

Answer: no

## 8. UX, Accessibility, And Design

1. Should the app stay dark-themed?

Answer: lets move to a trending theme

2. Should we create a new visual design system?

Answer: yes

3. Are there brand colors, typography, or visual references to follow?

Answer: lets use a trending palatte from adobe color

4. What accessibility baseline should be required?

Answer: we dont need accessiblity for these users at this time

5. Are there any critical mobile interactions that should be improved?

Answer: I will defer to you for improvements we can do, lets enforce best practices

## 9. PWA And Offline Behavior

1. What should work while offline?

Answer: seeing todays workout and saving the weight for the exercies, basically the full app should work except the youtube vids

2. What should happen when a new version is available?

Answer: users app should update automatically without the user having to do anything once the app loads

3. Should the user manually refresh app cache, or should updates be automatic with a prompt?

Answer: refer to #2, auto update

4. Should CDN dependencies be replaced with bundled local assets for more reliable offline support?

Answer: lets use best practice for our offline goals

## 10. Quality Gates

1. What checks should block merges?

Answer: I kind of want an e2e playwright style testing suite we use to check all our progress and catch regression

2. Should we add unit tests?

Answer: yes

3. Should we add browser or end-to-end tests?

Answer: yes

4. Which browsers/devices must be tested?

Answer: safari, chrome

5. Should we require formatting and linting in CI?

Answer: yes

## 11. Documentation And Spec Process

1. Where should RFCs live?

Answer: in repo under docs/

2. Should each milestone have its own spec with acceptance criteria?

Answer: yes

3. Should architectural decisions be recorded as ADRs?

Answer: yes

4. Who approves RFCs before implementation?

Answer: me

5. What level of documentation should be maintained for users and contributors?

Answer: standard rfc nothing too crazy

## 12. Milestone Strategy

1. Do you prefer small incremental milestones or larger milestone releases?

Answer: lets be smaller

2. Should the first milestone focus on safety infrastructure before feature changes?

Answer: yes

3. Should refactors and new features be separated into different milestones?

Answer: yes

4. What is the acceptable risk level for changing storage or offline behavior?

Answer: lets talk about this

5. Are there deadlines or time-boxes for this refactor?

Answer: no

## 13. Known Issues To Resolve

1. The app clamps current week to `19`, but the data currently has 12 weeks. What should happen after the final programmed week?

Answer: continue to show the last week

2. Cache update functions are currently defined in the service worker context but called from the window context. What update UX do you want?

Answer: lets use best practices here

3. `LastWeight` event cleanup currently cannot remove the original listener because of separate `bind(this)` calls. Should we prioritize lifecycle cleanup in the first technical milestone?

Answer: yes

4. Should the current IndexedDB schema be migrated to a versioned schema with explicit records for exercises, workouts, sets, and entries?

Answer: not right now

## 14. Constraints

1. Are there constraints on dependencies, bundle size, hosting cost, or maintenance complexity?

Answer: github pages

2. Should the project remain simple enough to run by opening a static server only?

Answer: yes

3. Should development use containers by default?

Answer: i dont think github pages can support that

4. Are there licensing or attribution concerns for workout data, exercise videos, icons, fonts, or UI libraries?

Answer: no

## 15. Definition Of Done

1. What must be true before this refactor is considered complete?

Answer: app is working with both new features implemented

2. What must be true before each milestone is considered complete?

Answer: app is working and no regressions observed

3. What failures are acceptable to defer?

Answer: not sure yet

4. What would make the refactor unsuccessful?

Answer: indexedDB integration is affected
