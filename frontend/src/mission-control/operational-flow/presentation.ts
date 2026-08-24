import type { AssertionType, DataQuality } from './types'

const ENTITY_KIND_LABELS: Record<string, string> = {
  FRONT: 'Frente de carguío',
  LOADING_UNIT: 'Unidad de carguío',
  TRUCK_GROUP: 'Grupo de CAEX',
  ROUTE: 'Ruta de acarreo',
  DESTINATION: 'Destino',
  METRIC: 'Indicador operacional',
  PLAN: 'Plan de turno',
  COST: 'Impacto económico',
}

const RELATIONSHIP_LABELS: Record<string, string> = {
  FEEDS: 'Alimenta',
  LOADS: 'Carga',
  TRAVELS_VIA: 'Transita por',
  DELIVERS_TO: 'Entrega en',
  MEASURED_BY: 'Se refleja en',
  CONTRIBUTES_TO: 'Contribuye a',
  CONSTRAINS: 'Condiciona',
  MEASURED_AGAINST: 'Se compara con',
  MAY_AFFECT_COST: 'Puede afectar',
}

const EVENT_STATUS_LABELS: Record<string, string> = {
  DETECTED: 'Detectado',
  CONFIRMED: 'Confirmado',
  ACKNOWLEDGED: 'Reconocido',
  ACTIONED: 'En acción',
  RECOVERING: 'En recuperación',
  NORMALIZED: 'Normalizado',
  CLOSED: 'Cerrado',
}

export function assertionShortLabel(value: AssertionType): string {
  if (value === 'FACT') return 'Hecho'
  if (value === 'DERIVED') return 'Derivado'
  return 'Hipótesis'
}

export function assertionDetailLabel(value: AssertionType): string {
  if (value === 'FACT') return 'Hecho de fuente'
  if (value === 'DERIVED') return 'Derivación determinística'
  return 'Hipótesis · requiere validación'
}

export function dataQualityLabel(value: DataQuality): string {
  if (value === 'FRESH') return 'Datos actualizados'
  if (value === 'STALE') return 'Datos desactualizados'
  if (value === 'INCOMPLETE') return 'Datos incompletos'
  if (value === 'CONFLICTING') return 'Datos en conflicto'
  return 'Datos no disponibles'
}

export function provenanceOriginLabel(value: string): string {
  if (value === 'REAL') return 'Datos operacionales'
  if (value === 'SYNTHETIC') return 'Escenario sintético'
  if (value === 'SIMULATED') return 'Simulación'
  if (value === 'REPLAY') return 'Reconstrucción histórica'
  if (value === 'DERIVED') return 'Cálculo NORTHMINE'
  return 'Origen no disponible'
}

export function entityKindLabel(value: string): string {
  return ENTITY_KIND_LABELS[value] ?? 'Entidad operacional'
}

export function relationshipLabel(type: string, fallbackLabel: string): string {
  const known = RELATIONSHIP_LABELS[type]
  if (known) return known
  const normalized = fallbackLabel.trim().replace(/\s+/g, ' ')
  return normalized ? `${normalized.charAt(0).toUpperCase()}${normalized.slice(1)}` : 'Relación operacional'
}

export function eventStatusLabel(value: string | undefined): string {
  if (!value) return 'Estable'
  return EVENT_STATUS_LABELS[value] ?? 'Estado actualizado'
}
