import { agentSessionClient } from './AgentSessionClient'
import type { AgentQuickAction } from './quickActions'

export type StructuredIntentSource = 'quick_action' | 'command_palette' | 'context_action'

export function dispatchStructuredIntent(
  action: AgentQuickAction,
  source: StructuredIntentSource,
  moduleId: string,
  entityId?: string,
): void {
  agentSessionClient.send('user.intent', {
    intent: action.intent,
    scope: 'current_context',
    module_id: moduleId,
    ...(entityId ? { entity_id: entityId } : {}),
    source,
  })
}
