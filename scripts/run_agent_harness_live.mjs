const baseUrl = process.env.NORTHMINE_LIVE_BASE_URL
if (process.env.NORTHMINE_AGENT_HARNESS_LIVE !== '1' || !baseUrl) {
  console.error('Live harness requires NORTHMINE_AGENT_HARNESS_LIVE=1 and NORTHMINE_LIVE_BASE_URL. It is intentionally excluded from deterministic CI.')
  process.exit(2)
}
const started = performance.now()
const response = await fetch(new URL('/health', baseUrl), { signal: AbortSignal.timeout(10_000) })
if (!response.ok) throw new Error(`Live health failed: HTTP ${response.status}`)
const body = await response.json()
console.log('NORTHMINE Agent Harness Live')
console.log(`Health: PASS (${Math.round(performance.now() - started)}ms)`)
console.log(`Service: ${body.service ?? 'northmine'}`)
console.log('Authenticated Realtime/voice/UI acceptance remains an explicit operator-run scenario; no credentials are read by this smoke command.')
