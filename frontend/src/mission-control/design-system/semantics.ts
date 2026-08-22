export type OperationalTone =
  | 'normal'
  | 'attention'
  | 'critical'
  | 'informational'
  | 'unknown'
  | 'recovering'

export type DataCondition = 'fresh' | 'delayed' | 'incomplete' | 'conflicting' | 'unavailable'

export interface SemanticMeta {
  label: string
  liveEligible: boolean
}

const OPERATIONAL_META: Record<OperationalTone, SemanticMeta> = {
  normal: { label: 'Normal', liveEligible: true },
  attention: { label: 'Atención', liveEligible: true },
  critical: { label: 'Crítico', liveEligible: true },
  informational: { label: 'Información', liveEligible: true },
  unknown: { label: 'Desconocido', liveEligible: false },
  recovering: { label: 'Recuperando', liveEligible: true },
}

const DATA_META: Record<DataCondition, SemanticMeta> = {
  fresh: { label: 'Datos actualizados', liveEligible: true },
  delayed: { label: 'Datos operacionales retrasados', liveEligible: false },
  incomplete: { label: 'Datos incompletos', liveEligible: false },
  conflicting: { label: 'Datos en conflicto', liveEligible: false },
  unavailable: { label: 'Datos no disponibles', liveEligible: false },
}

export function operationalToneMeta(tone: OperationalTone): SemanticMeta {
  return OPERATIONAL_META[tone]
}

export function dataConditionMeta(condition: DataCondition): SemanticMeta {
  return DATA_META[condition]
}

export function isLiveEligible(tone: OperationalTone, condition: DataCondition): boolean {
  return OPERATIONAL_META[tone].liveEligible && DATA_META[condition].liveEligible
}
