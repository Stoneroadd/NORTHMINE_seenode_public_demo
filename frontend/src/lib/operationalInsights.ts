import type {
  CurrentShiftCommandCenter,
  DemoSummary,
  DistanceSummary,
  FleetEquipment,
  FleetStatus,
  LoadingUnit,
  LoadingUnitDistanceItem,
  LoadingUnitsSummary,
  OperationalCollection,
  ProductionShift,
  SmartAlert,
} from './api'
import { formatHourLabel } from './time/operationalHour'

export type OperationalStatus = 'controlado' | 'preventivo' | 'critico'
export type OperationalSeverity = 'critical' | 'high' | 'medium' | 'low'
export type OperationalDomain = 'Produccion' | 'Operacion' | 'Seguridad' | 'Mantencion'

export interface OperationalInsight {
  id: string
  domain: OperationalDomain
  severity: OperationalSeverity
  priority: number
  title: string
  explanation: string
  recommendedAction: string
  source: string
  impactTons?: number
  equipmentId?: string
}

export interface ExecutiveRisk {
  title: string
  impact: string
  severity: 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAJA'
  origin: string
  action: string
  domain: OperationalDomain
  impactTons?: number
}

export interface TopCaexSummary {
  equipment: string
  tons: number
  cycles: number
  performance: number
  state?: string
}

export interface TopLoadingUnitSummary {
  equipment: string
  tons: number
  tph: number
  participationPct: number
  state?: string
}

export interface LowPerformerSummary {
  equipment: string
  type: 'CAEX' | 'UC'
  deviationPct: number
  breachTons: number
  estimatedImpactTons: number
  detail: string
}

export interface StandbyJustification {
  equipment: string
  type: 'CAEX' | 'UC'
  state: string
  code?: string | null
  description?: string | null
  operator?: string | null
  minutesInactive?: number | null
  startedAt?: string | null
  reason: string
}

export interface DecisionSummary {
  status: OperationalStatus
  score: number
  diagnosis: string
  risk: string
  action: string
}

export interface OperationalIntelligence {
  status: OperationalStatus
  statusLabel: 'Controlado' | 'Preventivo' | 'Critico'
  score: number
  insights: OperationalInsight[]
  risk: ExecutiveRisk
  decision: DecisionSummary
  topCaex: TopCaexSummary[]
  topLoadingUnits: TopLoadingUnitSummary[]
  lowPerformers: LowPerformerSummary[]
  standbyJustifications: StandbyJustification[]
}

export interface OperationalInsightInput {
  summary: DemoSummary
  alerts: SmartAlert[]
  production?: ProductionShift
  currentShift?: CurrentShiftCommandCenter
  fleet?: FleetStatus
  loading?: LoadingUnitsSummary
  fleetDistance?: DistanceSummary
  loadingUnitDistance?: OperationalCollection<LoadingUnitDistanceItem>
}

const severityWeight: Record<OperationalSeverity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
}

function toSeverity(alert: SmartAlert): OperationalSeverity {
  const raw = (alert.severidad ?? alert.severity ?? 'BAJA').toUpperCase()
  if (raw.includes('CRIT') || raw === 'CRITICAL') return 'critical'
  if (raw.includes('ALTA') || raw === 'HIGH') return 'high'
  if (raw.includes('MEDIA') || raw === 'MEDIUM') return 'medium'
  return 'low'
}

function toRiskSeverity(severity: OperationalSeverity): ExecutiveRisk['severity'] {
  if (severity === 'critical') return 'CRITICA'
  if (severity === 'high') return 'ALTA'
  if (severity === 'medium') return 'MEDIA'
  return 'BAJA'
}

function uniqueInsights(insights: OperationalInsight[]) {
  const seen = new Set<string>()
  return insights
    .filter((item) => {
      const key = `${item.domain}:${item.title}:${item.equipmentId ?? ''}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .sort((a, b) => {
      const severityDelta = severityWeight[b.severity] - severityWeight[a.severity]
      if (severityDelta) return severityDelta
      return b.priority - a.priority
    })
    .slice(0, 10)
}

function round(value: number, digits = 1) {
  if (!Number.isFinite(value)) return 0
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function formatTons(value: number) {
  const abs = Math.abs(value)
  if (abs >= 1_000_000) return `${round(value / 1_000_000, 2).toLocaleString('es-CL')} Mt`
  return `${Math.round(value).toLocaleString('es-CL')} t`
}

function normalizeText(value?: string | null) {
  return String(value ?? '').trim().toUpperCase()
}

function isStandbyEquipment(item?: {
  estado?: string | null
  status?: string | null
  status_code?: string | null
  status_category?: string | null
  gestion_flota?: string | null
}) {
  const category = normalizeText(item?.status_category)
  const state = normalizeText(item?.estado ?? item?.status)
  const code = normalizeText(item?.status_code)
  const management = normalizeText(item?.gestion_flota)
  return category === 'STANDBY' || state === 'STANDBY' || code.startsWith('S') || management === 'STANDBY_JUSTIFICADO'
}

function standbyReason(item: { status_code?: string | null; status_desc?: string | null; estado?: string | null }) {
  const code = item.status_code ? `${item.status_code} - ` : ''
  return `${code}${item.status_desc || item.estado || 'Standby WENCO'}`
}

function buildStandbyJustifications(params: {
  fleet?: FleetStatus
  currentShift?: CurrentShiftCommandCenter
  loading?: LoadingUnitsSummary
}): StandbyJustification[] {
  const rows: StandbyJustification[] = []
  const seen = new Set<string>()
  const push = (row: StandbyJustification) => {
    const key = `${row.type}:${row.equipment}`
    if (seen.has(key)) return
    seen.add(key)
    rows.push(row)
  }

  ;(params.fleet?.lista_equipos ?? []).filter(isStandbyEquipment).forEach((item) => {
    push({
      equipment: item.caex_id,
      type: 'CAEX',
      state: item.estado,
      code: item.status_code,
      description: item.status_desc,
      operator: item.operador,
      minutesInactive: item.minutos_sin_actividad,
      startedAt: item.status_started_at,
      reason: standbyReason(item),
    })
  })

  ;(params.currentShift?.caex_status ?? []).filter(isStandbyEquipment).forEach((item) => {
    push({
      equipment: item.caex_id,
      type: 'CAEX',
      state: item.estado,
      code: item.status_code,
      description: item.status_desc,
      operator: item.operador,
      minutesInactive: item.minutos_sin_actividad,
      startedAt: item.status_started_at,
      reason: standbyReason(item),
    })
  })

  ;([...(params.currentShift?.loading_units ?? []), ...(params.loading?.items ?? [])] as Array<LoadingUnit | CurrentShiftCommandCenter['loading_units'][number]>)
    .filter(isStandbyEquipment)
    .forEach((item) => {
      push({
        equipment: 'carguio_id' in item ? item.carguio_id : '',
        type: 'UC',
        state: item.estado,
        code: item.status_code,
        description: item.status_desc,
        operator: 'operador' in item ? item.operador : null,
        minutesInactive: 'minutos_sin_actividad' in item ? item.minutos_sin_actividad : null,
        startedAt: item.status_started_at,
        reason: standbyReason(item),
      })
    })

  return rows.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'CAEX' ? -1 : 1
    return a.equipment.localeCompare(b.equipment)
  })
}

function topCaex(items: FleetEquipment[] = []): TopCaexSummary[] {
  return [...items]
    .sort((a, b) => b.toneladas - a.toneladas)
    .slice(0, 5)
    .map((item) => ({
      equipment: item.caex_id,
      tons: item.toneladas,
      cycles: item.ciclos,
      performance: round(item.toneladas / Math.max(item.ciclos, 1), 1),
      state: item.estado,
    }))
}

function topLoadingUnits(items: LoadingUnit[] = [], totalTons?: number): TopLoadingUnitSummary[] {
  const total = totalTons ?? items.reduce((acc, item) => acc + item.toneladas, 0)
  return [...items]
    .sort((a, b) => b.toneladas - a.toneladas)
    .slice(0, 5)
    .map((item) => ({
      equipment: item.carguio_id,
      tons: item.toneladas,
      tph: item.rendimiento_tph,
      participationPct: total ? round((item.toneladas / total) * 100, 1) : 0,
      state: item.estado,
    }))
}

function lowCaexPerformers(items: FleetEquipment[] = []): LowPerformerSummary[] {
  const active = items.filter((item) => !isStandbyEquipment(item) && item.ciclos > 0 && item.toneladas > 0)
  const avg = active.reduce((acc, item) => acc + item.toneladas / Math.max(item.ciclos, 1), 0) / Math.max(active.length, 1)

  return active
    .map((item) => {
      const performance = item.toneladas / Math.max(item.ciclos, 1)
      const breach = Math.max(0, (avg - performance) * item.ciclos)
      return {
        equipment: item.caex_id,
        type: 'CAEX' as const,
        deviationPct: avg ? round(((performance - avg) / avg) * 100, 1) : 0,
        breachTons: round(breach, 0),
        estimatedImpactTons: round(breach, 0),
        detail: `${round(performance, 1)} t/ciclo vs ${round(avg, 1)} promedio`,
      }
    })
    .filter((item) => item.deviationPct < -4)
}

function lowLoadingUnitPerformers(items: LoadingUnit[] = []): LowPerformerSummary[] {
  const activeItems = items.filter((item) => !isStandbyEquipment(item))
  const avgTph = activeItems.reduce((acc, item) => acc + item.rendimiento_tph, 0) / Math.max(activeItems.length, 1)

  return activeItems
    .map((item) => {
      const deviation = Number.isFinite(item.variacion_pct)
        ? item.variacion_pct
        : avgTph
          ? ((item.rendimiento_tph - avgTph) / avgTph) * 100
          : 0
      const breach = Math.max(0, avgTph - item.rendimiento_tph) * 6
      return {
        equipment: item.carguio_id,
        type: 'UC' as const,
        deviationPct: round(deviation, 1),
        breachTons: round(breach, 0),
        estimatedImpactTons: round(breach, 0),
        detail: `${Math.round(item.rendimiento_tph).toLocaleString('es-CL')} tph vs ${Math.round(avgTph).toLocaleString('es-CL')} promedio`,
      }
    })
    .filter((item) => item.deviationPct < -4)
}

function lowPerformers(fleet?: FleetStatus, loading?: LoadingUnitsSummary): LowPerformerSummary[] {
  return [...lowCaexPerformers(fleet?.lista_equipos ?? []), ...lowLoadingUnitPerformers(loading?.items ?? [])]
    .sort((a, b) => a.deviationPct - b.deviationPct)
    .slice(0, 5)
}

function scoreStatus(params: {
  compliance: number
  breach: number
  criticalAlerts: number
  highAlerts: number
  breakdowns: number
}) {
  let rawScore = 0
  if (params.compliance < 90) rawScore += 4
  else if (params.compliance < 95) rawScore += 3
  else if (params.compliance < 98) rawScore += 1

  if (params.breach < -10_000) rawScore += 2
  else if (params.breach < 0) rawScore += 1

  rawScore += Math.min(params.criticalAlerts * 3, 6)
  rawScore += Math.min(params.highAlerts, 3)
  rawScore += Math.min(params.breakdowns, 4)

  const score = Math.min(100, Math.round((rawScore / 20) * 100))

  if (score >= 70 || (params.criticalAlerts > 0 && params.compliance < 96)) return { status: 'critico' as const, score }
  if (score >= 35) return { status: 'preventivo' as const, score }
  return { status: 'controlado' as const, score }
}

interface ShiftPaceContext {
  isInProgress: boolean
  elapsedPct: number
  shiftTons: number
  metaTurno: number
  expectedByNow: number
  paceCompliance: number
  projectedFinal: number | null
  projectedGap: number | null
}

function buildShiftPaceContext(currentShift?: CurrentShiftCommandCenter, production?: ProductionShift): ShiftPaceContext | null {
  const metaTurno = currentShift?.meta_turno ?? production?.meta_turno ?? 0
  const shiftTons = currentShift?.toneladas_turno ?? production?.toneladas_turno ?? 0
  const elapsedPct = currentShift?.elapsed_pct ?? 100
  if (metaTurno <= 0 || shiftTons < 0) return null

  const boundedElapsedPct = Math.min(Math.max(elapsedPct, 0), 100)
  const isInProgress = boundedElapsedPct > 0 && boundedElapsedPct < 98
  const expectedByNow = isInProgress ? metaTurno * (boundedElapsedPct / 100) : metaTurno
  const paceCompliance = expectedByNow > 0 ? (shiftTons / expectedByNow) * 100 : 0
  const projectedFinal = currentShift?.projection?.proyeccion_final ?? null
  const projectedGap = currentShift?.projection?.diferencia_proyectada ?? (
    projectedFinal !== null ? projectedFinal - metaTurno : null
  )

  return {
    isInProgress,
    elapsedPct: boundedElapsedPct,
    shiftTons,
    metaTurno,
    expectedByNow,
    paceCompliance,
    projectedFinal,
    projectedGap,
  }
}

function statusLabel(status: OperationalStatus): OperationalIntelligence['statusLabel'] {
  if (status === 'critico') return 'Critico'
  if (status === 'preventivo') return 'Preventivo'
  return 'Controlado'
}

function buildRisk(insights: OperationalInsight[], compliance: number): ExecutiveRisk {
  const primary = insights[0]
  if (!primary) {
    return {
      title: `Cumplimiento operacional ${round(compliance, 1)}%`,
      impact: 'Sin impacto critico proyectado',
      severity: 'BAJA',
      origin: 'Motor ejecutivo',
      action: 'Mantener monitoreo de cumplimiento, flota y alertas activas.',
      domain: 'Operacion',
    }
  }

  return {
    title: primary.title,
    impact: primary.impactTons ? `-${formatTons(Math.abs(primary.impactTons))} estimadas` : primary.explanation,
    severity: toRiskSeverity(primary.severity),
    origin: `${primary.domain} / ${primary.source}`,
    action: primary.recommendedAction,
    domain: primary.domain,
    impactTons: primary.impactTons,
  }
}

function buildDecision(params: {
  status: OperationalStatus
  score: number
  compliance: number
  breach: number
  risk: ExecutiveRisk
  topInsight?: OperationalInsight
  pace?: ShiftPaceContext | null
}) {
  const breachText = params.breach >= 0
    ? `brecha positiva de ${formatTons(params.breach)}`
    : `brecha negativa de ${formatTons(Math.abs(params.breach))}`
  const focus = params.topInsight?.equipmentId
    ? `La principal desviacion corresponde a ${params.topInsight.equipmentId}.`
    : `La principal desviacion corresponde a ${params.risk.title}.`

  return {
    status: params.status,
    score: params.score,
    diagnosis: params.pace?.isInProgress
      ? `Turno en curso: ${round(params.pace.elapsedPct, 1)}% transcurrido. Produccion actual ${formatTons(params.pace.shiftTons)} vs ${formatTons(params.pace.expectedByNow)} esperadas a esta hora; proyeccion de cierre ${params.pace.projectedFinal === null ? 'sin dato' : formatTons(params.pace.projectedFinal)}.`
      : `La operacion mantiene un cumplimiento del ${round(params.compliance, 1)}% con ${breachText}.`,
    risk: `${focus} Severidad ${params.risk.severity}.`,
    action: params.risk.action,
  }
}

function alertText(alert: SmartAlert) {
  return `${alert.titulo ?? alert.title ?? ''} ${alert.descripcion ?? alert.description ?? ''}`.toLowerCase()
}

function isProductionPlanAlert(alert: SmartAlert) {
  const text = alertText(alert)
  return (
    (text.includes('produccion') || text.includes('cumplimiento')) &&
    (text.includes('plan') || text.includes('meta') || text.includes('turno'))
  )
}

function classifyAlertDomain(alert: SmartAlert): OperationalDomain {
  const text = alertText(alert)
  if (
    text.includes('produccion') ||
    text.includes('cumplimiento') ||
    text.includes('tonel') ||
    text.includes('meta') ||
    text.includes('plan')
  ) {
    return 'Produccion'
  }

  if (
    text.includes('mant') ||
    text.includes('aver') ||
    text.includes('inactividad') ||
    text.includes('falla') ||
    text.includes('detenido')
  ) {
    return 'Mantencion'
  }

  if (
    text.includes('seguridad') ||
    text.includes('emergencia') ||
    text.includes('tronadura') ||
    text.includes('clima')
  ) {
    return 'Seguridad'
  }

  return 'Operacion'
}

export function buildOperationalInsights(input: OperationalInsightInput): OperationalIntelligence {
  const { summary, alerts, production, currentShift, fleet, loading, fleetDistance, loadingUnitDistance } = input
  const standbyJustifications = buildStandbyJustifications({ fleet, currentShift, loading })
  const pace = buildShiftPaceContext(currentShift, production)
  const finalCompliance = currentShift?.cumplimiento_pct ?? production?.cumplimiento_pct ?? summary.kpis.cumplimiento_pct
  const finalBreach = currentShift?.brecha_ton ?? production?.brecha_ton ?? summary.kpis.tonelaje_total - summary.kpis.meta_acumulada
  const compliance = pace?.isInProgress ? pace.paceCompliance : finalCompliance
  const breach = pace?.isInProgress
    ? pace.projectedGap ?? pace.shiftTons - pace.expectedByNow
    : finalBreach
  const executiveAlerts = alerts.filter((alert) => !isProductionPlanAlert(alert))
  const criticalAlerts = executiveAlerts.filter((alert) => toSeverity(alert) === 'critical').length
  const highAlerts = executiveAlerts.filter((alert) => toSeverity(alert) === 'high').length
  const breakdowns =
    (fleet?.equipos_mantencion ?? 0) +
    (fleet?.equipos_en_demora ?? 0) +
    (fleet?.equipos_sin_actividad ?? 0) +
    (currentShift?.caex_posible_averia ?? 0)
  const statusScore = scoreStatus({ compliance, breach, criticalAlerts, highAlerts, breakdowns })
  const performers = lowPerformers(fleet, loading)
  const insights: OperationalInsight[] = []

  const shiftBehindPace = pace?.isInProgress
    ? pace.paceCompliance < 95 || (pace.projectedGap !== null && pace.projectedGap < 0)
    : finalCompliance < 95 || finalBreach < 0

  if (shiftBehindPace) {
    const title = pace?.isInProgress ? 'Ritmo de turno bajo proyeccion' : 'Cumplimiento bajo plan'
    const explanation = pace?.isInProgress
      ? `Avance horario ${round(pace.paceCompliance, 1)}% contra lo esperado a esta hora; brecha proyectada ${formatTons(pace.projectedGap ?? pace.shiftTons - pace.expectedByNow)} al cierre.`
      : `Cumplimiento ${round(finalCompliance, 1)}% y brecha ${formatTons(finalBreach)} contra meta.`
    insights.push({
      id: 'low-compliance',
      domain: 'Produccion',
      severity: compliance < 90 ? 'critical' : 'high',
      priority: 98,
      title,
      explanation,
      recommendedAction: pace?.isInProgress
        ? 'Monitorear ritmo proyectado, horas restantes y equipos bajo referencia antes de declarar incumplimiento del turno.'
        : 'Revisar asignacion de CAEX, continuidad de carguio y horas de menor produccion antes del siguiente cambio de turno.',
      source: 'Produccion turno',
      impactTons: breach < 0 ? Math.abs(breach) : undefined,
    })
  }

  if ((production?.tendencia ?? '').toLowerCase().includes('baja') || (production?.peor_hora?.diferencia_meta ?? 0) < -500) {
    const worstHour = production?.peor_hora
    insights.push({
      id: 'production-drop',
      domain: 'Produccion',
      severity: 'medium',
      priority: 72,
      title: 'Caida de produccion horaria',
      explanation: worstHour
        ? `${formatHourLabel(worstHour.hora)} bajo meta por ${formatTons(Math.abs(worstHour.diferencia_meta ?? 0))}.`
        : 'La tendencia del turno muestra perdida de ritmo productivo.',
      recommendedAction: 'Confirmar colas, cambios de frente y demoras de ciclo en la ventana horaria afectada.',
      source: 'Perfil horario',
      impactTons: Math.abs(production?.peor_hora?.diferencia_meta ?? 0),
    })
  }

  const worstCaex = performers.find((item) => item.type === 'CAEX')
  if (worstCaex) {
    insights.push({
      id: `low-caex-${worstCaex.equipment}`,
      domain: 'Operacion',
      severity: worstCaex.deviationPct < -15 ? 'high' : 'medium',
      priority: 86,
      title: `${worstCaex.equipment} bajo promedio`,
      explanation: `${Math.abs(worstCaex.deviationPct)}% bajo referencia. ${worstCaex.detail}.`,
      recommendedAction: 'Revisar tiempos de ciclo, colas en carguio y continuidad de despacho del equipo.',
      source: 'Ranking CAEX',
      impactTons: worstCaex.estimatedImpactTons,
      equipmentId: worstCaex.equipment,
    })
  }

  const worstUc = performers.find((item) => item.type === 'UC')
  if (worstUc) {
    insights.push({
      id: `low-uc-${worstUc.equipment}`,
      domain: 'Operacion',
      severity: worstUc.deviationPct < -15 ? 'high' : 'medium',
      priority: 82,
      title: `${worstUc.equipment} bajo rendimiento`,
      explanation: `${Math.abs(worstUc.deviationPct)}% bajo referencia. ${worstUc.detail}.`,
      recommendedAction: 'Balancear camiones atendidos y revisar interferencias de frente en la unidad de carguio.',
      source: 'Ranking UC',
      impactTons: worstUc.estimatedImpactTons,
      equipmentId: worstUc.equipment,
    })
  }

  if (breakdowns > 0) {
    insights.push({
      id: 'active-breakdowns',
      domain: 'Mantencion',
      severity: breakdowns >= 3 ? 'high' : 'medium',
      priority: 88,
      title: 'Averias o inactividad con impacto operacional',
      explanation: `${breakdowns} equipos con mantencion, demora, inactividad o posible averia. Standby justificado separado: ${standbyJustifications.length}.`,
      recommendedAction: 'Priorizar recuperacion de equipos con mayor tonelaje esperado y confirmar ETA de mantencion.',
      source: 'Flota / turno',
      impactTons: breakdowns * 1400,
    })
  }

  const distanceAlert = alerts.find((alert) => alertText(alert).includes('distancia') || alertText(alert).includes('acarreo'))
  const worstFleetDistance = fleetDistance?.items
    .filter((item) => item.avg_distance_km > (fleetDistance.avg_distance_per_cycle_km * 1.15))
    .sort((a, b) => b.avg_distance_km - a.avg_distance_km)[0]
  const loadingDistanceItems = loadingUnitDistance?.items ?? []
  const loadingDistanceAvg = loadingDistanceItems.length
    ? loadingDistanceItems.reduce((acc, item) => acc + item.avg_distance_km, 0) / loadingDistanceItems.length
    : 0
  const worstLoadingDistance = loadingDistanceItems
    .filter((item) => item.avg_distance_km > loadingDistanceAvg * 1.15)
    .sort((a, b) => b.avg_distance_km - a.avg_distance_km)[0]

  if (distanceAlert || worstFleetDistance || worstLoadingDistance) {
    const equipment = worstFleetDistance?.caex_id ?? worstLoadingDistance?.carguio_id
    const distance = worstFleetDistance?.avg_distance_km ?? worstLoadingDistance?.avg_distance_km
    insights.push({
      id: `distance-${equipment ?? distanceAlert?.id ?? 'alert'}`,
      domain: 'Operacion',
      severity: 'medium',
      priority: 66,
      title: equipment ? `${equipment} con distancia sobre referencia` : 'Exceso de distancia detectado',
      explanation: distance
        ? `Promedio ${round(distance, 2)} km/ciclo sobre referencia operacional.`
        : (distanceAlert?.descripcion ?? distanceAlert?.description ?? 'Alerta operacional asociada a distancia de acarreo.'),
      recommendedAction: 'Validar rutas activas, destino de descarga y continuidad del frente antes de aumentar asignacion de camiones.',
      source: 'Distancia flota/UC',
      equipmentId: equipment,
    })
  }

  executiveAlerts
    .filter((alert) => ['critical', 'high'].includes(toSeverity(alert)))
    .slice(0, 4)
    .forEach((alert) => {
      const severity = toSeverity(alert)
      const text = `${alert.titulo ?? alert.title ?? 'Alerta operacional'}`
      insights.push({
        id: `alert-${alert.id}`,
        domain: classifyAlertDomain(alert),
        severity,
        priority: severity === 'critical' ? 96 : 76,
        title: text,
        explanation: alert.descripcion ?? alert.description ?? 'Alerta activa sin descripcion extendida.',
        recommendedAction: alert.recomendacion ?? 'Confirmar responsable, condicion del equipo y ventana de resolucion.',
        source: alert.modulo ?? alert.type ?? 'Smart alerts',
        equipmentId: alert.equipment_id ?? undefined,
      })
    })

  const sortedInsights = uniqueInsights(insights)
  const risk = buildRisk(sortedInsights, compliance)
  const decision = buildDecision({
    status: statusScore.status,
    score: statusScore.score,
    compliance,
    breach,
    risk,
    topInsight: sortedInsights[0],
    pace,
  })

  return {
    status: statusScore.status,
    statusLabel: statusLabel(statusScore.status),
    score: statusScore.score,
    insights: sortedInsights,
    risk,
    decision,
    topCaex: topCaex(fleet?.lista_equipos ?? summary.top_trucks.map((item) => ({
      caex_id: item.caex_id ?? 'CAEX',
      modelo: 'Demo',
      estado: 'ACTIVO',
      toneladas: item.tonelaje,
      ciclos: item.ciclos,
      ultima_actividad: summary.generated_at,
    }))),
    topLoadingUnits: topLoadingUnits(loading?.items ?? summary.top_loaders.map((item) => ({
      carguio_id: item.carguio_id ?? 'UC',
      modelo: 'Demo',
      toneladas: item.tonelaje,
      ciclos: item.ciclos,
      camiones_atendidos: 0,
      rendimiento_tph: round(item.tonelaje / 12, 0),
      ubicacion: item.fase ?? 'Operacion',
      estado: 'ACTIVO',
      variacion_pct: 0,
    })), loading?.total_toneladas),
    lowPerformers: performers,
    standbyJustifications,
  }
}
