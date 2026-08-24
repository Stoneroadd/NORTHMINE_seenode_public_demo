import { defineConfig, devices } from '@playwright/test'
import { existsSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const frontendDir = dirname(fileURLToPath(import.meta.url))
const backendDir = resolve(frontendDir, '../backend')
const bundledPython = process.platform === 'win32'
  ? resolve(backendDir, '.venv/Scripts/python.exe')
  : resolve(backendDir, '.venv/bin/python')
const pythonExecutable = process.env.NORTHMINE_TEST_PYTHON
  ?? (existsSync(bundledPython) ? bundledPython : process.platform === 'win32' ? 'python' : 'python3')
const quote = (value: string) => `"${value.replaceAll('"', '\\"')}"`
const runId = `northmine-mission-control-${process.pid}`
const testDatabase = (name: string) => join(tmpdir(), `${runId}-${name}.db`)
const auditEncryptionKey = randomBytes(32).toString('base64').replaceAll('+', '-').replaceAll('/', '_')
const reuseExistingServer = process.env.CI !== 'true'

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
  webServer: [
    {
      name: 'northmine-demo-api',
      command: `${quote(pythonExecutable)} -m uvicorn app.main:app --host 127.0.0.1 --port 8001 --no-access-log --log-level warning`,
      cwd: backendDir,
      url: 'http://127.0.0.1:8001/health',
      reuseExistingServer,
      timeout: 60_000,
      env: {
        ENVIRONMENT: 'demo',
        NORTHMINE_MODE: 'demo',
        NORTHMINE_DEMO_MODE: 'true',
        NORTHMINE_ALLOW_DEMO_LOGIN: 'true',
        NORTHMINE_CORS_ORIGINS: 'http://127.0.0.1:5206',
        NORTHMINE_AUDIT_DB: testDatabase('audit'),
        NORTHMINE_USERS_DB: testDatabase('users'),
        NORTHMINE_DEMO_ACCESS_DB: testDatabase('demo-access'),
        NORTHMINE_AI_COPILOT_DB: testDatabase('ai-copilot'),
        NORTHMINE_AGENT_RUNTIME_DB: testDatabase('agent-runtime'),
        NORTHMINE_AVERIAS_DB: testDatabase('averias'),
        NORTHMINE_CICLOS_DB: testDatabase('ciclos'),
        AUDIT_ENCRYPTION_KEY: auditEncryptionKey,
        AGENT_DEMO_MODE: 'true',
        OPENAI_REALTIME_ENABLED: 'false',
        LOG_LEVEL: 'WARNING',
      },
    },
    {
      name: 'northmine-mission-control-ui',
      command: 'npm run dev -- --host 127.0.0.1 --port 5206',
      cwd: frontendDir,
      url: 'http://127.0.0.1:5206/',
      reuseExistingServer,
      timeout: 60_000,
      env: {
        VITE_API_PROXY_TARGET: 'http://127.0.0.1:8001',
        VITE_SHOW_DEMO_MODE: 'true',
      },
    },
  ],
})
