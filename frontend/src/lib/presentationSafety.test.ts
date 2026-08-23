import { describe, expect, it } from 'vitest'
import {
  auditActionLabel,
  auditOutcome,
  containsTechnicalFootprint,
  sourceDisplayName,
  toUserSafeMessage,
} from './presentationSafety'

describe('presentation safety', () => {
  it.each([
    '/api/cockpit',
    'TypeError at render (App.tsx:91:4)',
    'schema_version mission-control.v2',
    'http://localhost:8000/debug',
    'trace_id=abc-123',
  ])('detects technical footprint in %s', (value) => {
    expect(containsTechnicalFootprint(value)).toBe(true)
  })

  it('preserves operational language and measurements', () => {
    expect(toUserSafeMessage('Ruta Norte 22 km/h', 'fallback')).toBe('Ruta Norte 22 km/h')
    expect(toUserSafeMessage('No response from /api/cockpit', 'Consulta no disponible')).toBe('Consulta no disponible')
  })

  it('turns internal sources and audit protocol into product language', () => {
    expect(sourceDisplayName('/api/shift-comparison')).toBe('Comparación de turnos')
    expect(auditActionLabel('PATCH')).toBe('Actualización')
    expect(auditOutcome(403).label).toBe('Acceso rechazado')
    expect(auditOutcome(200).label).toBe('Completada')
  })
})
