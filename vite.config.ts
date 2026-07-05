import { readFileSync } from 'node:fs'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const pkg = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf-8'),
) as { name: string }

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages serves project sites from /<repo-name>/, so the base must
  // match the repo name. Derived from package.json's "name" field — if you
  // rename the repo, keep the two in sync (or hardcode the path here).
  base: `/${pkg.name}/`,
  plugins: [react(), tailwindcss()],
})
