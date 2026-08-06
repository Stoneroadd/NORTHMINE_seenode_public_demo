import type { CopilotResponse, CopilotToolExecution } from '../../lib/aiCopilot'

export type ChatTurn =
  | { id: string; role: 'user'; text: string }
  | { id: string; role: 'assistant'; status: 'streaming'; phase: string; toolExecutions: CopilotToolExecution[]; text: string }
  | { id: string; role: 'assistant'; status: 'done'; response: CopilotResponse }
  | { id: string; role: 'assistant'; status: 'error'; error: string }
