import { defineConfig, devices } from '@playwright/test'

// QA's own Playwright config (qa-protocol §1–§2). Viewports: responsive-standards §2 (the source of truth; kept in
// sync by hand, as QA never imports the implementer's e2e/ code). Per task: qa/e2e/<task-id>.spec.ts; milestone
// regression: qa/regression/*.spec.ts on all six viewports and three engines (QA_ENGINES=all).
const VIEWPORTS = {
  'phone-small': { width: 360, height: 740 },
  phone: { width: 390, height: 844 },
  tablet: { width: 768, height: 1024 },
  'tablet-land': { width: 1024, height: 768 },
  laptop: { width: 1280, height: 800 },
  desktop: { width: 1440, height: 900 },
} as const

const ENGINES = process.env.QA_ENGINES === 'all' ? (['chromium', 'firefox', 'webkit'] as const) : (['chromium'] as const)
const BASE = { chromium: devices['Desktop Chrome'], firefox: devices['Desktop Firefox'], webkit: devices['Desktop Safari'] }

export default defineConfig({
  testDir: '.',
  testMatch: ['e2e/**/*.spec.ts', 'regression/**/*.spec.ts'],
  retries: 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: process.env.QA_BASE_URL ?? 'http://localhost:8080',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: ENGINES.flatMap((engine) =>
    Object.entries(VIEWPORTS).map(([name, viewport]) => ({
      name: ENGINES.length > 1 ? `${engine}-${name}` : name,
      use: {
        ...BASE[engine],
        viewport,
        // Firefox does not support isMobile; touch emulation is enough there.
        isMobile: engine !== 'firefox' && viewport.width < 1024,
        hasTouch: viewport.width < 1024,
      },
    })),
  ),
})
