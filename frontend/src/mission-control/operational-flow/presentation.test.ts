import { describe, expect, it } from 'vitest'
import {
  assertionDetailLabel,
  assertionShortLabel,
  dataQualityLabel,
  confidenceLabel,
  entityKindLabel,
  eventStatusLabel,
  provenanceOriginLabel,
  relationshipLabel,
} from './presentation'

describe('Operational Flow presentation labels', () => {
  it('translates assertion, quality and provenance contracts for operators', () => {
    expect(assertionShortLabel('FACT')).toBe('Hecho')
    expect(assertionDetailLabel('HYPOTHESIS')).toContain('requiere validación')
    expect(dataQualityLabel('FRESH')).toBe('Datos actualizados')
    expect(provenanceOriginLabel('SYNTHETIC')).toBe('Escenario sintético')
  })

  it('translates entity, relationship and event lifecycle values', () => {
    expect(entityKindLabel('LOADING_UNIT')).toBe('Unidad de carguío')
    expect(relationshipLabel('FEEDS', 'alimenta')).toBe('Alimenta')
    expect(eventStatusLabel('CONFIRMED')).toBe('Confirmado')
  })

  it('communicates confidence without exposing false precision', () => {
    expect(confidenceLabel('LOW')).toBe('Confianza baja')
    expect(confidenceLabel('MEDIUM')).toBe('Confianza media')
    expect(confidenceLabel('HIGH')).toBe('Confianza alta')
    expect(confidenceLabel('INTERNAL_VALUE')).toBe('Confianza no determinada')
    expect(confidenceLabel(null)).toBeNull()
  })

  it('does not expose unknown implementation identifiers', () => {
    expect(entityKindLabel('INTERNAL_NEW_KIND')).toBe('Entidad operacional')
    expect(eventStatusLabel('INTERNAL_NEW_STATUS')).toBe('Estado actualizado')
    expect(provenanceOriginLabel('INTERNAL_SOURCE')).toBe('Origen no disponible')
    expect(relationshipLabel('INTERNAL_EDGE', '')).toBe('Relación operacional')
  })
})
