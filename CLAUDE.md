# click-and-ship

An incremental roguelike about software engineering management.

## Stack

- Vite + React + TypeScript
- Zustand for game state
- Tailwind CSS v4 (via `@tailwindcss/vite`) for styling
- `idb-keyval` for save persistence, wrapped behind a `StorageAdapter`
  interface so it can be swapped for Capacitor Preferences later
- Capacitor, configured for an eventual iOS build (native project not yet
  generated — see README)
- Deployed to GitHub Pages via GitHub Actions (`.github/workflows/deploy.yml`)

## Folder conventions

- `src/game/` — pure game logic: state shape, reducers/actions, balancing
  constants, the tick loop. **No React imports allowed here.** This code
  should be usable from a test script or a future non-React host without
  modification.
- `src/game/save/` — save schema (`schema.ts`), version migrations
  (`migrations.ts`), and the autosave/export/import orchestration
  (`autosave.ts`).
- `src/storage/` — the `StorageAdapter` interface and its implementations
  (`IdbAdapter`, and a stub `CapacitorAdapter` for later). `src/storage/index.ts`
  exports the adapter currently in use.
- `src/ui/` — React components. This is the only place that should import
  React, JSX, or browser-only UI concerns.

## Save versioning rules

- The save schema lives in `src/game/save/schema.ts` and always carries a
  `version` field.
- **Whenever the save schema changes, bump `CURRENT_SAVE_VERSION` and add a
  corresponding entry to `migrationSteps` in `src/game/save/migrations.ts`**
  that transforms a save from the previous version to the new one.
- `migrate()` applies migrations sequentially, so old saves always walk
  forward through every intermediate version. Never delete a migration step
  for a version that might still exist in the wild (e.g. in an exported
  save string).
- Saves are stored as `{ version, state, lastSaveTimestamp }`. `state` is a
  plain-old-JSON snapshot of the Zustand store, not the store itself.

## Other conventions

- The active storage backend is chosen in `src/storage/index.ts`. Swap
  `IdbAdapter` for `CapacitorAdapter` there once the native iOS build exists
  and `CapacitorAdapter` is implemented.
- `vite.config.ts` derives the GitHub Pages `base` path from
  `package.json`'s `name` field. If the repo is renamed, keep them in sync
  (see the `TODO` comment in that file).
