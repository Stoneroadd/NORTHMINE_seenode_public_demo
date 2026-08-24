import { defineConfig, devices } from '@playwright/test'
import { createDemoWebServers } from './playwright.demo-servers'

/**
 * Permanent responsive regression suite (overflow + critical-element-size
 * assertions, not pixel screenshots — see playwright.config.ts for the
 * separate brand-prototype visual-diff suite, left untouched).
 *
 * Runs against `vite dev` (not `preview`) because the authenticated routes
 * need the app's client-side demo-mode fallback, which only activates the
 * same way it does for a real user when served via the dev server.
 *
 * Run with: npm run test:responsive
 */
export default defineConfig({
  testDir: './tests/visual',
  testMatch: /responsive-.*\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  retries: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:5205',
    trace: 'retain-on-failure',
    actionTimeout: 15_000,
  },
  webServer: createDemoWebServers(5205),
  projects: [
    { name: 'iphone-se', use: { ...devices['iPhone SE'] } },
    { name: 'iphone-13', use: { ...devices['iPhone 13'] } },
    { name: 'pixel-7', use: { ...devices['Pixel 7'] } },
    { name: 'ipad-mini', use: { ...devices['iPad Mini'] } },
    { name: 'ipad-pro-landscape', use: { ...devices['iPad Pro 11 landscape'] } },
    { name: 'desktop-1440', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'desktop-1920', use: { viewport: { width: 1920, height: 1080 } } },
  ],
})
