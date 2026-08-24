import { describe, expect, it } from 'vitest'
import { appPaths, normalizeAppPath, sectionFromPath, sectionPaths } from './appRoutes'

describe('canonical app route contract', () => {
  it('keeps every named application path unique', () => {
    const paths = Object.values(appPaths)
    expect(new Set(paths).size).toBe(paths.length)
  })

  it('maps section routes and the dashboard legacy alias deterministically', () => {
    expect(sectionFromPath(sectionPaths.flota)).toBe('flota')
    expect(sectionFromPath(`${sectionPaths.alertas}/`)).toBe('alertas')
    expect(sectionFromPath(appPaths.dashboardLegacy)).toBe('dashboard')
  })

  it('keeps extra and Mission Control routes in the cockpit shell section', () => {
    expect(sectionFromPath(appPaths.prediccion)).toBe('cockpit')
    expect(sectionFromPath(appPaths.operationalFlow)).toBe('cockpit')
  })

  it('normalizes only trailing slashes without rewriting route identity', () => {
    expect(normalizeAppPath('/mission-control/operational-flow///')).toBe(appPaths.operationalFlow)
    expect(normalizeAppPath('/')).toBe('/')
  })
})
