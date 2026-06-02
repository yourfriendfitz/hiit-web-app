# Installed PWA Migration: v3.0.4 To v4.0.0

Keep this compatibility path deployed while installed `v3.0.4` clients migrate to
`v4.0.0`.

## Why The Bridge Exists

The legacy app registered `/hiit-web-app/service-worker.js` and served its cached
shell before checking the network. The refactored app registers the generated
Workbox worker at `/hiit-web-app/sw.js`.

Removing the legacy URL immediately can leave an installed `v3.0.4` PWA on its
cached shell indefinitely. The compatibility bridge restores the old URL long
enough for those installs to move forward.

## Bridge Behavior

`public/service-worker.js` is intentionally small:

- Activate immediately when a legacy registration discovers it.
- Delete only caches whose names start with `hiit-app-cache-v`.
- Claim existing clients.
- Do not register a `fetch` handler.
- Do not read, write, delete, or migrate IndexedDB.

Without a fetch handler, the next normal launch loads the network-hosted v4 shell.
The v4 shell then registers `/hiit-web-app/sw.js` for future generated Workbox
updates.

## Existing User Flow

Users with an installed `v3.0.4` PWA should:

1. Open the installed app while online.
2. Close the app after it finishes loading.
3. Reopen the installed app.
4. Confirm the footer reports `v4.0.0`.

Users should not clear site data or reinstall the PWA. Clearing site data can
delete device-local saved-weight history.

## Release Verification

Before publishing the `v4.0.0` tag and GitHub Release:

1. Confirm `/hiit-web-app/service-worker.js` returns `200`.
2. Confirm `/hiit-web-app/sw.js` returns `200`.
3. Start from a browser profile or installed PWA controlled by the legacy worker.
4. Retain or seed a legacy-compatible `{ id, weight, date }` IndexedDB record.
5. Open online once, close, and reopen.
6. Confirm the footer reports `v4.0.0`.
7. Confirm retained History and Last Weight values remain readable.
8. Confirm a new saved weight remains readable after reload.
9. Confirm offline core routes still work after the v4 worker takes control.

## Retention

Keep the bridge deployed after the initial release. Remove it only in a later
owner-approved cleanup after the migration window is intentionally closed.
