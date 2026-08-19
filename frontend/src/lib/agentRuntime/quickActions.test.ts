import { describe, expect, it } from 'vitest'
import { actionsForModule, moduleFromPath } from './quickActions'

describe('structured quick actions', () => {
  it('prioritizes production actions in production context', () => {
    const actions = actionsForModule('produccion')
    expect(actions[0].intent).toBe('INVESTIGATE_PRODUCTION_DROP')
    expect(actions.some((item) => item.intent === 'FIND_WORST_HOUR')).toBe(true)
  })

  it('maps the real route without generating a prompt', () => {
    expect(moduleFromPath('/resumen')).toBe('dashboard')
    expect(moduleFromPath('/flota')).toBe('flota')
  })
})
