# click-and-ship

An incremental roguelike about software engineering management.

## Local development

```bash
npm install
npm run dev
```

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
