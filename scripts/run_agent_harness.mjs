import { spawnSync } from 'node:child_process'

const candidates = process.platform === 'win32'
  ? ['.venv\\Scripts\\python.exe', 'python']
  : ['.venv/bin/python', 'python3', 'python']
const args = ['agent-harness/runners/run_harness.py', ...process.argv.slice(2)]
for (const executable of candidates) {
  const result = spawnSync(executable, args, { stdio: 'inherit' })
  if (result.error?.code === 'ENOENT') continue
  process.exit(result.status ?? 1)
}
console.error('No Python runtime available for NORTHMINE Agent Harness.')
process.exit(1)
