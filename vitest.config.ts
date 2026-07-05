import { defineConfig } from 'vitest/config'

// Scoped to pure game-logic tests only; kept separate from vite.config.ts so
// these don't pull in the Tailwind/React plugins meant for the app build.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/game/**/*.test.ts'],
  },
})
