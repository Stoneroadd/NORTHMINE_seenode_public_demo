import { defineConfig, devices } from '@playwright/test'

/**
 * Visual regression suite for the isolated /brand-prototype SaaS landing.
 * Not wired into any app CI script — run manually with:
 *   npx playwright test --config=playwright.config.ts
 * against a `vite preview` server (started separately, or auto-started
 * below if port 5199 isn't already serving).
 */
export default defineConfig({
  testDir: './tests/visual',
  fullyParallel: true,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  snapshotPathTemplate: '{testDir}/__screenshots__/{testFilePath}/{arg}{ext}',
  use: {
    baseURL: 'http://localhost:5199',
    trace: 'retain-on-failure',
  },
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.02 },
  },
  webServer: {
    command: 'npm run preview -- --port 5199',
    url: 'http://localhost:5199/brand-prototype',
    reuseExistingServer: true,
    timeout: 30_000,
  },
  projects: [
    {
      // Single project; each spec sets its own viewport explicitly
      // (desktop vs mobile is part of what's under test, not the runner
      // matrix), so nothing here needs to vary per-project.
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1600, height: 1000 } },
    },
  ],
})
