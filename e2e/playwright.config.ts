import { defineConfig, devices } from '@playwright/test'

/** Reference viewports (responsive-standards §2, NFR-RESP-01). PRs run the mandatory three (`pnpm test:pr`). */
export const VIEWPORTS = {
  'phone-small': { width: 360, height: 740 },
  phone: { width: 390, height: 844 },
  tablet: { width: 768, height: 1024 },
  'tablet-land': { width: 1024, height: 768 },
  laptop: { width: 1280, height: 800 },
  desktop: { width: 1440, height: 900 },
} as const

export const MANDATORY_PROJECTS = ['phone-small', 'tablet', 'laptop'] as const

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // Flaky policy (test-strategy §3): never silently retried.
  retries: 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    // The packaged app (scripts/e2e-run.sh) serves the SPA and the API from one origin (ADR-0004).
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:8080',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: Object.entries(VIEWPORTS).map(([name, viewport]) => ({
    name,
    use: {
      ...devices['Desktop Chrome'],
      viewport,
      // Below the tablet-landscape width the devices are touch phones/tablets.
      isMobile: viewport.width < 1024,
      hasTouch: viewport.width < 1024,
    },
  })),
})
