import { spawn, spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const args = Object.fromEntries(process.argv.slice(2).map((arg) => {
  const match = arg.match(/^--([^=]+)(?:=(.*))?$/)
  return match ? [match[1], match[2] ?? true] : [arg, true]
}))
const aliases = { full: 'full_operational_demo', production: 'production_investigation_demo', fleet: 'fleet_demo', report: 'report_demo', failure: 'failure_recovery_demo' }
const scenario = aliases[args.scenario] ?? args.scenario ?? 'full_operational_demo'
const mode = args.mode === 'live' ? 'live' : 'deterministic'
const speed = ['fast', 'normal', 'presentation'].includes(args.speed) ? args.speed : 'presentation'
const headless = Boolean(args.headless || process.env.CI)
const keepOpen = Boolean(args['keep-open'])
const port = String(args.port ?? process.env.AGENT_DEMO_PORT ?? '8092')
const baseUrl = `http://127.0.0.1:${port}`
const artifactRoot = resolve('agent-harness', 'artifacts', `demo-${new Date().toISOString().replace(/[:.]/g, '-')}`)
mkdirSync(artifactRoot, { recursive: true })

function commandSpec(value, commandArgs) {
  if (process.platform === 'win32' && value === 'npm') {
    return { file: process.env.ComSpec ?? 'cmd.exe', args: ['/d', '/s', '/c', 'npm.cmd', ...commandArgs] }
  }
  return { file: value, args: commandArgs }
}
function run(commandName, runArgs, options = {}) {
  const spec = commandSpec(commandName, runArgs)
  const result = spawnSync(spec.file, spec.args, { stdio: 'inherit', ...options })
  if (result.error) console.error(result.error)
  if (result.status !== 0) process.exit(result.status ?? 1)
}

run('npm', ['run', 'agent:demo:harness', '--', `--scenario=${scenario}`])
if (!args['skip-build']) run('npm', ['run', 'build'])

const serverCommand = commandSpec('npm', ['run', 'start'])
const server = spawn(serverCommand.file, serverCommand.args, {
  stdio: ['ignore', 'pipe', 'pipe'],
  env: {
    ...process.env,
    PORT: port,
    AGENT_DEMO_MODE: 'true',
    NORTHMINE_AUDIT_DB: resolve(artifactRoot, 'audit.db'),
    NORTHMINE_USERS_DB: resolve(artifactRoot, 'users.db'),
    NORTHMINE_AI_COPILOT_DB: resolve(artifactRoot, 'copilot.db'),
    NORTHMINE_AGENT_RUNTIME_DB: resolve(artifactRoot, 'runtime.db'),
  },
})
server.stdout.on('data', (chunk) => process.stdout.write(`[demo-server] ${chunk}`))
server.stderr.on('data', (chunk) => process.stderr.write(`[demo-server] ${chunk}`))

async function waitForServer(timeoutMs = 60_000) {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(`${baseUrl}/health`)
      if (response.ok) return
    } catch { /* endpoint is the synchronization signal */ }
    await new Promise((resolveWait) => setTimeout(resolveWait, 250))
  }
  throw new Error(`NORTHMINE did not become healthy at ${baseUrl}`)
}

const requireFromFrontend = createRequire(resolve('frontend', 'package.json'))
const { chromium } = requireFromFrontend('playwright')
let browser
let page
try {
  await waitForServer()
  browser = await chromium.launch({ channel: 'chrome', headless, slowMo: headless ? 0 : 35 })
  const context = await browser.newContext({
    viewport: { width: 1600, height: 1000 },
    recordVideo: args.video ? { dir: artifactRoot, size: { width: 1600, height: 1000 } } : undefined,
  })
  page = await context.newPage()
  page.setDefaultTimeout(30_000)
  page.on('pageerror', (error) => console.error(`[browser-pageerror] ${error.message}`))
  await page.goto(`${baseUrl}/acceso-demo`, { waitUntil: 'domcontentloaded' })
  await page.locator('input[autocomplete="username"]').fill(process.env.AGENT_DEMO_USER ?? 'admin')
  await page.locator('input[autocomplete="current-password"]').fill(process.env.AGENT_DEMO_PASSWORD ?? 'Northmine-Demo#2026')
  await page.locator('form').getByRole('button').click()
  await page.locator('.app-shell').waitFor({ state: 'visible', timeout: 30_000 })
  // Scope console/network acceptance to the authenticated product. The
  // public access page may legitimately receive a pre-login refresh 401.
  page.on('console', (message) => { if (message.type() === 'error') console.error(`[browser-console] ${message.text()}`) })
  page.on('response', (response) => {
    if (response.status() >= 400) console.error(`[browser-response] ${response.status()} ${response.url()}`)
  })
  await page.waitForFunction(() => Boolean(window.__NORTHMINE_AGENT_DEMO__), null, { timeout: 15_000 })
  await page.evaluate(({ scenario, mode, speed }) => {
    void window.__NORTHMINE_AGENT_DEMO__?.start({ scenarioId: scenario, mode, speed })
  }, { scenario, mode, speed })

  const captures = {
    activation: '01_dashboard', context: '02_investigation', 'critical-equipment': '03_pala03_highlight',
    chart: '04_chart_deviation', contradiction: '05_transport_comparison', map: '06_map_focus',
    'work-product': '07_report', final: '08_final',
  }
  await page.waitForFunction(() => (window.__NORTHMINE_AGENT_DEMO__?.snapshot().scenes.length ?? 0) > 0)
  const sceneIds = new Set(await page.evaluate(() => window.__NORTHMINE_AGENT_DEMO__?.snapshot().scenes.map((item) => item.id) ?? []))
  for (const [sceneId, name] of Object.entries(captures)) {
    if (!sceneIds.has(sceneId)) continue
    await page.waitForFunction((id) => {
      const scene = window.__NORTHMINE_AGENT_DEMO__?.snapshot().scenes.find((item) => item.id === id)
      const run = window.__NORTHMINE_AGENT_DEMO__?.snapshot()
      return scene?.status === 'passed' || run?.status === 'failed'
    }, sceneId, { timeout: speed === 'presentation' ? 420_000 : 120_000 })
    const state = await page.evaluate(() => window.__NORTHMINE_AGENT_DEMO__?.snapshot())
    if (state?.status === 'failed') break
    await page.screenshot({ path: resolve(artifactRoot, `${name}.png`), fullPage: false })
  }

  await page.waitForFunction(() => ['completed', 'failed', 'aborted'].includes(window.__NORTHMINE_AGENT_DEMO__?.snapshot().status ?? ''), null, { timeout: speed === 'presentation' ? 480_000 : 180_000 })
  const result = await page.evaluate(() => window.__NORTHMINE_AGENT_DEMO__?.snapshot())
  writeFileSync(resolve(artifactRoot, 'agent-demo-trace.json'), JSON.stringify(result, null, 2), 'utf8')
  await page.screenshot({ path: resolve(artifactRoot, '08_final.png'), fullPage: false })
  console.log(`\nNORTHMINE Agent Demo Tour\nStatus: ${result?.status}\nMode: ${result?.mode}\nArtifacts: ${artifactRoot}`)
  if (result?.score) Object.entries(result.score).forEach(([key, value]) => console.log(`${key.padEnd(18)} ${value}`))
  if (result?.status !== 'completed') process.exitCode = 1
  if (keepOpen && !headless) await new Promise((resolveWait) => process.once('SIGINT', resolveWait))
  await context.close()
} catch (error) {
  console.error(error)
  if (page) {
    console.error('[browser-body]', await page.locator('body').innerText().catch(() => 'unavailable'))
    await page.screenshot({ path: resolve(artifactRoot, 'failure.png'), fullPage: false }).catch(() => {})
  }
  process.exitCode = 1
} finally {
  if (browser) await browser.close()
  if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(server.pid), '/T', '/F'], { stdio: 'ignore' })
  else server.kill()
}
