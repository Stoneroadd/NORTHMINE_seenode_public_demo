import { defineConfig, devices } from '@playwright/test'
import { createDemoWebServers } from './playwright.demo-servers'

export default defineConfig({
  testDir: './tests/visual',
  testMatch: /mission-control-design-system\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  snapshotPathTemplate: '{testDir}/__screenshots__/{testFilePath}/{arg}{ext}',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://127.0.0.1:5206',
    trace: 'retain-on-failure',
    actionTimeout: 15_000,
  },
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.02 },
  },
  webServer: createDemoWebServers(5206),
})
