import { beforeEach, describe, expect, it, vi } from 'vitest'

const { send } = vi.hoisted(() => ({ send: vi.fn() }))
vi.mock('./AgentSessionClient', () => ({ agentSessionClient: { send } }))

import { dispatchStructuredIntent } from './dispatchIntent'

describe('dispatchStructuredIntent', () => {
  beforeEach(() => send.mockClear())

  it('uses the structured Runtime contract without writing conversational text', () => {
    dispatchStructuredIntent({ id: 'compare', label: 'Comparar turno', intent: 'COMPARE_SHIFT' }, 'quick_action', 'produccion')
    expect(send).toHaveBeenCalledWith('user.intent', {
      intent: 'COMPARE_SHIFT', scope: 'current_context', module_id: 'produccion', source: 'quick_action',
    })
    expect(send).not.toHaveBeenCalledWith('user.text', expect.anything())
  })

  it('carries an explicit selected entity without converting the action to text', () => {
    dispatchStructuredIntent({ id: 'compare', label: 'Comparar turno', intent: 'COMPARE_SHIFT' }, 'quick_action', 'carguio', 'Pala 03')
    expect(send).toHaveBeenCalledWith('user.intent', {
      intent: 'COMPARE_SHIFT', scope: 'current_context', module_id: 'carguio', entity_id: 'Pala 03', source: 'quick_action',
    })
  })
})
