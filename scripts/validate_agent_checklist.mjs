import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const checklistPath = resolve(root, 'docs/agent/NORTHMINE_AGENT_PROGRAM_CHECKLIST.json')
const markdownPath = resolve(root, 'docs/agent/NORTHMINE_AGENT_PROGRAM_CHECKLIST.md')
const scenariosPath = resolve(root, 'agent-harness/scenarios/golden_scenarios.json')
const data = JSON.parse(readFileSync(checklistPath, 'utf8'))
const scenarios = JSON.parse(readFileSync(scenariosPath, 'utf8'))
const markdown = readFileSync(markdownPath, 'utf8')
const errors = []
const statusSet = new Set(data.status_definitions)
const scenarioIds = new Set(scenarios.map((scenario) => scenario.id))
const stageIds = new Set(data.stages.map((stage) => stage.id))

function commitExists(sha) {
  try {
    execFileSync('git', ['cat-file', '-e', `${sha}^{commit}`], { cwd: root, stdio: 'ignore' })
    return true
  } catch { return false }
}

for (const stage of data.stages) {
  if (!statusSet.has(stage.status)) errors.push(`${stage.id}: invalid status ${stage.status}`)
  for (const sha of [stage.base_commit, ...stage.implementation_commits, stage.merge_commit, stage.production_commit].filter(Boolean)) {
    if (!commitExists(sha)) errors.push(`${stage.id}: commit does not exist: ${sha}`)
  }
  for (const dependency of stage.dependencies) if (!stageIds.has(dependency)) errors.push(`${stage.id}: missing dependency ${dependency}`)
  if (stage.status === 'ACCEPTED') {
    if (!stage.acceptance.passed || !stage.acceptance.evidence.length) errors.push(`${stage.id}: ACCEPTED without acceptance evidence`)
    for (const gate of ['unit', 'integration', 'harness', 'security']) if (!['VERIFIED', 'N/A'].includes(stage.tests[gate])) errors.push(`${stage.id}: ACCEPTED with ${gate}=${stage.tests[gate]}`)
  }
  if (stage.status === 'DEPLOYED' && (!stage.deployment.deployed || !stage.deployment.deployed_commit)) errors.push(`${stage.id}: DEPLOYED without deployed commit`)
  for (const requirement of stage.requirements) {
    if (!statusSet.has(requirement.status)) errors.push(`${requirement.id}: invalid status ${requirement.status}`)
    if (['VERIFIED', 'MERGED', 'DEPLOYED', 'ACCEPTED'].includes(requirement.status) && !requirement.evidence.length) errors.push(`${requirement.id}: ${requirement.status} without evidence`)
    if (!markdown.includes(`<!-- ${requirement.id}:${requirement.status} -->`)) errors.push(`${requirement.id}: Markdown state is not synchronized`)
  }
}

for (const capability of data.capability_matrix) {
  if (capability.status === 'ACCEPTED' && (!capability.harness || !scenarioIds.has(capability.harness))) {
    errors.push(`${capability.id}: ACCEPTED capability without harness scenario`)
  }
  if (capability.harness && !scenarioIds.has(capability.harness)) errors.push(`${capability.id}: unknown harness scenario ${capability.harness}`)
}

if (scenarios.length < 20) errors.push(`only ${scenarios.length} golden scenarios; minimum is 20`)
const duplicateScenarios = scenarios.filter((item, index) => scenarios.findIndex((other) => other.id === item.id) !== index)
if (duplicateScenarios.length) errors.push(`duplicate scenario ids: ${duplicateScenarios.map((item) => item.id).join(', ')}`)

const current = data.stages.find((stage) => stage.id === 'operational_agent_hardening')
const phaseCounts = Object.groupBy(current.requirements, (item) => item.status)
const programCounts = Object.groupBy(data.stages, (item) => item.status)
const phaseSummary = `${current.requirements.length} requirements; ${phaseCounts.ACCEPTED?.length ?? 0} accepted; ${phaseCounts.VERIFIED?.length ?? 0} verified; ${phaseCounts.IMPLEMENTED?.length ?? 0} implemented; ${phaseCounts.PARTIAL?.length ?? 0} partial; ${phaseCounts.PLANNED?.length ?? 0} planned`
const programSummary = `${data.stages.length} stages; ${programCounts.ACCEPTED?.length ?? 0} accepted; ${programCounts.MERGED?.length ?? 0} merged; ${programCounts.PARTIAL?.length ?? 0} partial; ${programCounts.IN_PROGRESS?.length ?? 0} current`
if (!markdown.includes(`Phase progress: ${phaseSummary}`)) errors.push('Markdown phase progress is stale')
if (!markdown.includes(`Program progress: ${programSummary}`)) errors.push('Markdown program progress is stale')

if (errors.length) {
  console.error('NORTHMINE Agent Checklist: FAIL\n')
  errors.forEach((error) => console.error(`- ${error}`))
  process.exit(1)
}
console.log('NORTHMINE Agent Checklist: PASS')
console.log(`Phase progress: ${phaseSummary}`)
console.log(`Program progress: ${programSummary}`)
