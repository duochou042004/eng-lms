import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/ · https://vitest.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Same-origin in production (ADR-0004); in dev the API runs on :8080.
    proxy: { '/api': 'http://localhost:8080' },
  },
  build: {
    // The manifest drives the bundle budget (scripts/bundle-budget.mjs, NFR-PERF-03).
    manifest: true,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: { modules: { classNameStrategy: 'non-scoped' } },
    restoreMocks: true,
  },
})
