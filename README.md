# click-and-ship

A turn-based incremental roguelike about software engineering management.
You are an IC Manager with 40 hours a week and a team of four. Each sprint
you pick which fires to fight (planning, 1:1s, code reviews, covering the
product and design gaps, incident triage, paying down tech debt), run the
sprint, and live with the results. A quarter is 6 sprints and ends in a
grade from F to S; grades earn career points toward promotion, and bad
quarters put you on a PIP. Get fired, get promoted, or coast for 24
quarters until HR retires you.

## Local development

```bash
npm install
npm run dev
npm test        # game-logic tests (vitest)
```

## Code layout

- `src/game/` — pure game logic (no React): sprint/quarter resolution,
  balancing constants, deterministic seeded RNG, named actions, the Zustand
  store bridge.
- `src/game/save/` — versioned save schema, migrations, autosave and
  base64 export/import.
- `src/storage/` — `StorageAdapter` interface with the IndexedDB
  implementation in use (and a Capacitor stub for iOS later).
- `src/ui/` — React components; the only place React is imported.

Saves live in IndexedDB and persist automatically after every action. The
RNG seed is part of the save, so a given save always replays identically.
For debugging, `window.__actionBuffer()` in the browser console returns
the recent named-action history.

Then open the printed local URL. `npm run build` produces a production
build in `dist/`, and `npm run preview` serves that build locally.

## Deployment

Pushes to `main` build and deploy automatically to GitHub Pages via
`.github/workflows/deploy.yml`.

## iOS

Capacitor's dependencies are installed and `capacitor.config.ts` is in
place, but the native iOS project has not been generated yet. To do that
you'll need a Mac:

```bash
npx cap add ios
npx cap sync ios
```

See `capacitor.config.ts` for the `TODO` on setting a real app id before
building for a device or the App Store.
