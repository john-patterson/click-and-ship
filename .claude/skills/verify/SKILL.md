---
name: verify
description: Build, launch, and drive click-and-ship in a headless browser to verify changes end-to-end.
---

# Verifying click-and-ship

## Build and serve

```bash
npm ci                         # once per container
npm run build                  # tsc -b && vite build
npm run preview -- --port 4173 # serves dist/ in the background
# App URL (note the base subpath): http://localhost:4173/click-and-ship/
```

## Drive it with Playwright

Playwright is not a project dependency; install it without saving and use the
pre-provisioned Chromium:

```bash
npm i --no-save playwright
```

```js
import { chromium } from '/path/to/repo/node_modules/playwright/index.mjs'
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
```

## Flows worth driving

- Toggle activities (buttons expose `aria-pressed`), watch the `used/budget h`
  counter, click "Run sprint N", read the "Sprint N results" card.
- Run 6 sprints to reach the quarter-review modal (`.fixed` overlay).
- Reload mid-run: state must persist (IndexedDB autosave on every action).
- Settings panel: "Export save" fills a readonly textarea with base64;
  paste into the import textarea + "Import save" round-trips it.
- **Fast-forward trick:** any game state can be reached instantly by
  importing a crafted save — base64-encode
  `{ version: <CURRENT_SAVE_VERSION>, state: {...}, lastSaveTimestamp: Date.now() }`
  with the `GameState` fields from `src/game/save/schema.ts` (e.g. set
  `sprint: 6, careerPoints: 5, quarterSp: 140` to test the promotion screen).
- Determinism check: import the same save (fixed `rngSeed`) twice, play the
  same plan, results must be identical.
- Debug hook: `window.__actionBuffer()` in the console returns the named
  action history.

## Gotchas

- Everything is turn-based; there are no timers to wait on. Short (~150ms)
  waits after clicks are enough.
- The budget bar animates (`transition-[width]`); screenshot immediately
  after a click can catch it mid-transition — that's not a bug.
