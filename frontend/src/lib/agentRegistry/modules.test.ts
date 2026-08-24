import { describe, expect, it } from 'vitest'
import { appPaths } from '../appRoutes'
import { moduleForRoute, NORTHMINE_MODULES } from './modules'

describe('agent module route registry', () => {
  it('recognizes Operational Flow as a read-only operational module', () => {
    expect(moduleForRoute(appPaths.operationalFlow)).toMatchObject({
      id: 'operationalFlow',
      route: appPaths.operationalFlow,
      category: 'operacional',
      agentAccess: 'read_only',
      supportedActions: ['navigate'],
    })
  })

  it('does not duplicate module routes', () => {
    const routes = Object.values(NORTHMINE_MODULES).map((module) => module.route)
    expect(new Set(routes).size).toBe(routes.length)
  })

  it('uses only paths declared by the application route contract', () => {
    const declaredPaths = new Set<string>(Object.values(appPaths))
    for (const module of Object.values(NORTHMINE_MODULES)) {
      expect(declaredPaths.has(module.route), module.id).toBe(true)
    }
  })
})
