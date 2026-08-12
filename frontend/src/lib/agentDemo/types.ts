export type AgentDemoMode = 'deterministic' | 'live'
export type AgentDemoSpeed = 'normal' | 'fast' | 'presentation'
export type AgentDemoSceneStatus = 'pending' | 'running' | 'passed' | 'failed' | 'skipped'
export type AgentDemoRunStatus = 'idle' | 'starting' | 'running' | 'paused' | 'failed' | 'completed' | 'aborted'

export interface AgentDemoSceneResult {
  id: string
  title: string
  status: AgentDemoSceneStatus
  startedAt?: string
  completedAt?: string
  latencyMs?: number
  detail?: string
  expected?: string
  observed?: string
}

export interface AgentDemoTraceEntry {
  scene: string
  timestamp: string
  eventType: string
  correlationId?: string
  investigationId?: string | null
  payload: Record<string, unknown>
}

export interface AgentDemoScore {
  reasoning: string
  evidence: string
  safety: string
  context: string
  uiManipulation: string
  guidance: string
  reports: string
  latency: string
}

export interface AgentDemoSnapshot {
  classification: 'AUTOMATED_AGENT_DEMO'
  physicalBrowserAcceptance: 'SEPARATE'
  status: AgentDemoRunStatus
  scenarioId: string
  mode: AgentDemoMode
  speed: AgentDemoSpeed
  currentIndex: number
  currentMessage: string
  scenes: AgentDemoSceneResult[]
  score: AgentDemoScore | null
  trace: AgentDemoTraceEntry[]
  startedAt: string | null
  completedAt: string | null
  error: string | null
}
