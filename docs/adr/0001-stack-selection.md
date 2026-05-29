# ADR 0001: Stack Selection

Status: Accepted

Date: 2026-05-29T15:51:43-05:00

## Decision

Use React, TypeScript, Vite, Tailwind CSS, Vitest, Playwright, and Vite PWA/Workbox as the target stack for the refactor.

## Context

The current app is a static PWA built with plain HTML, CSS, JavaScript, Web Components, CDN dependencies, IndexedDB, and a hand-written service worker. It has no package manifest, build tooling, type checking, linting, automated tests, or CI.

The target app must remain backend-free, static-hostable on GitHub Pages, iPhone-first, offline-capable, and compatible with existing IndexedDB weight history.

## Options Considered

- Keep framework-free JavaScript and add tooling around the current shape.
- Move to React, TypeScript, and Vite.
- Move to Next.js.
- Add a backend or backend-as-a-service.

## Rationale

React, TypeScript, and Vite provide a mainstream static app foundation that works with GitHub Pages while improving maintainability and testability. Vitest and Playwright cover unit and end-to-end regression needs. Tailwind CSS plus local tokens supports a small internal design system without requiring a heavyweight component library. Vite PWA/Workbox reduces risk in service worker update and offline behavior.

Next.js is unnecessary because the app does not need a backend, server rendering, or account-based features. A backend conflicts with the explicit local-only data model.

## Consequences

- The project will gain a build step.
- Runtime CDN dependencies should be replaced with bundled assets where practical.
- GitHub Pages deployment must publish built static output.
- Existing behavior must be covered by characterization tests before high-risk refactors.
- The refactor must keep IndexedDB compatibility stable throughout the migration.
