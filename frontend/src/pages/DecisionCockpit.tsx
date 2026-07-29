import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Activity, BarChart3, Gauge, RadioTower, Target, Timer, Truck } from 'lucide-react'
import { CockpitAlertBar } from '../components/cockpit/CockpitAlertBar'
import { CockpitHeader } from '../components/cockpit/CockpitHeader'
import { DecisionAuditPanel } from '../components/cockpit/DecisionAuditPanel'
import { DispatcherAdvisorPanel } from '../components/cockpit/DispatcherAdvisorPanel'
import { EquipmentStatusPanel } from '../components/cockpit/EquipmentStatusPanel'
import { HiddenLossPanel } from '../components/cockpit/HiddenLossPanel'
import { KpiCard } from '../components/cockpit/KpiCard'
import { LoadingEquipmentCard } from '../components/cockpit/LoadingEquipmentCard'
import { LoadingEquipmentDetailModal } from '../components/cockpit/LoadingEquipmentDetailModal'
import { MonthlyTargetPanel } from '../components/cockpit/MonthlyTargetPanel'
import { OperationalNlpPanel } from '../components/cockpit/OperationalNlpPanel'
import { ProductionHourlyChart } from '../components/cockpit/ProductionHourlyChart'
import { ProductionTable } from '../components/cockpit/ProductionTable'
import { ProfitOptimizationPanel } from '../components/cockpit/ProfitOptimizationPanel'
import { ShiftSummary } from '../components/cockpit/ShiftSummary'
import { ShiftComparisonVisionPanel } from '../components/cockpit/ShiftComparisonVisionPanel'
import { ShovelProductionChart } from '../components/cockpit/ShovelProductionChart'
import { buildCockpitViewModel, formatMoney, formatNumber, formatPct, formatTons } from '../components/cockpit/cockpitModel'
import type { DetailModalAnchor } from '../components/cockpit/detailModalPosition'
import { ErrorState } from '../components/common/ErrorState'
import { LoadingState } from '../components/common/LoadingState'
import { northmineApi, type MonthlyTargetResponse, type ShiftComparisonResponse } from '../lib/api'
import { secureApi } from '../lib/secureApi'
import {
  FAST_DEMO_COCKPIT,
  FAST_DEMO_DECISION_AUDIT,
  FAST_DEMO_DISPATCHER,
  FAST_DEMO_HIDDEN_LOSSES,
  FAST_DEMO_MONTHLY_TARGET,
  FAST_DEMO_NLP,
  FAST_DEMO_PROFIT,
  FAST_DEMO_SHIFT_COMPARISON,
  FAST_PUBLIC_DEMO,
} from '../demo/fastDemo'
import { useModuleT } from '../i18n/useModuleT'
import { cockpitT, type CockpitT } from '../i18n/modules/cockpit'

function availabilityLabel(value: string, t: CockpitT): string {
  if (value === 'available') return t.availability_real
  if (value === 'partial') return t.availability_partial
  if (value === 'missing') return t.availability_missing
  return value
}

function deltaLabel(value: number): string {
  if (value > 0) return `+${formatTons(value)}`
  return formatTons(value)
}

function projectionConfidenceFromHours(activeHours: number, t: CockpitT): {
  label: string
  spreadPct: number
} {
  if (activeHours < 4) return { label: t.confidence_baja, spreadPct: 0.18 }
  if (activeHours < 8) return { label: t.confidence_media, spreadPct: 0.1 }
  return { label: t.confidence_alta, spreadPct: 0.05 }
}

const COCKPIT_SECTION_IDS = [
  'sec-turno',
  'sec-mensual',
  'sec-comparativa',
  'sec-equipos',
  'sec-produccion',
  'sec-decisiones',
  'sec-flota',
] as const

function SectionNav() {
  const t = useModuleT(cockpitT)
  const [activeSection, setActiveSection] = useState<string>(COCKPIT_SECTION_IDS[0])
  const sectionLabel: Record<(typeof COCKPIT_SECTION_IDS)[number], string> = {
    'sec-turno': t.section_turno,
    'sec-mensual': t.section_mensual,
    'sec-comparativa': t.section_comparativa,
    'sec-equipos': t.section_equipos,
    'sec-produccion': t.section_produccion,
    'sec-decisiones': t.section_decisiones,
    'sec-flota': t.section_flota,
  }

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveSection(entry.target.id)
        }
      },
      { rootMargin: '-25% 0px -65% 0px' },
    )
    for (const id of COCKPIT_SECTION_IDS) {
      const element = document.getElementById(id)
      if (element) observer.observe(element)
    }
    return () => observer.disconnect()
  }, [])

  const goToSection = (id: string) => {
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    document.getElementById(id)?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
    setActiveSection(id)
  }

  return (
    <nav className="nmcp-section-nav" aria-label={t.section_nav_aria}>
      {COCKPIT_SECTION_IDS.map((id) => (
        <button
          key={id}
          type="button"
          className={activeSection === id ? 'is-active' : ''}
          aria-current={activeSection === id ? 'true' : undefined}
          onClick={() => goToSection(id)}
        >
          {sectionLabel[id]}
        </button>
      ))}
    </nav>
  )
}

function CompactFilters({
  selectedDate,
  selectedShift,
  resolvedShiftLabel,
  onDateChange,
  onShiftChange,
}: {
  selectedDate: string
  selectedShift: string
  resolvedShiftLabel: string
  onDateChange: (value: string) => void
  onShiftChange: (value: string) => void
}) {
  const t = useModuleT(cockpitT)
  return (
    <section className="nmcp-filters" aria-label={t.filters_aria}>
      <label>
        <span>{t.filters_fecha}</span>
        <input type="date" value={selectedDate} onChange={(event) => onDateChange(event.target.value)} />
      </label>
      <label>
        <span>{t.filters_turno}</span>
        <select value={selectedShift} onChange={(event) => onShiftChange(event.target.value)} aria-label={t.filters_turno_resuelto_aria(resolvedShiftLabel)}>
          <option value="ACTUAL">{t.filters_turno_actual}</option>
          <option value="DIA">{t.filters_turno_dia}</option>
          <option value="NOCHE">{t.filters_turno_noche}</option>
        </select>
      </label>
    </section>
  )
}

function toneFromDelta(value: number | null | undefined): 'green' | 'yellow' | 'red' | 'cyan' {
  if (typeof value !== 'number') return 'cyan'
  if (value > 0) return 'green'
  if (value > -5000) return 'yellow'
  return 'red'
}

function toneFromStatusValue(value: number | null | undefined, goodAtOrAbove: number, warningAtOrAbove: number): 'green' | 'yellow' | 'red' | 'cyan' {
  if (typeof value !== 'number' || Number.isNaN(value)) return 'cyan'
  if (value >= goodAtOrAbove) return 'green'
  if (value >= warningAtOrAbove) return 'yellow'
  return 'red'
}

function comparisonSameWindow(t: CockpitT, comparison?: ShiftComparisonResponse): {
  label: string
  value: string
  detail: string
  tone: 'green' | 'yellow' | 'red' | 'cyan'
} {
  if (!comparison) {
    return {
      label: t.fair_comparison_label,
      value: t.fair_comparison_sin_dato,
      detail: t.fair_comparison_sin_respuesta,
      tone: 'cyan',
    }
  }
  const liveShift = comparison.operational_context?.turno_nombre
  const elapsedMinutes = comparison.operational_context?.elapsed_minutes
  const slots = liveShift === 'DIA' || liveShift === 'NOCHE'
    ? Math.max(1, Math.min(12, Math.ceil((elapsedMinutes ?? 720) / 60)))
    : 12
  const rows = comparison.hourly.filter((row) => row.slot <= slots)
  const dia = rows.reduce((sum, row) => sum + row.dia_tonnes, 0)
  const noche = rows.reduce((sum, row) => sum + row.noche_tonnes, 0)
  const current = liveShift === 'NOCHE' ? noche : dia
  const reference = liveShift === 'NOCHE' ? dia : noche
  const delta = current - reference
  const pct = reference > 0 ? (current / reference) * 100 : null
  return {
    label: t.fair_comparison_ventana(slots),
    value: delta >= 0 ? `+${formatTons(delta)}` : formatTons(delta),
    detail: pct === null
      ? t.fair_comparison_actual_sin_ref(formatTons(current))
      : t.fair_comparison_detalle(formatTons(current), formatTons(reference), formatNumber(pct, 1)),
    tone: toneFromDelta(delta),
  }
}

function requiredDailyToGreen(t: CockpitT, monthly?: MonthlyTargetResponse): {
  value: number | null
  detail: string
  tone: 'green' | 'yellow' | 'red' | 'cyan'
} {
  if (!monthly) return { value: null, detail: t.required_green_meta_no_cargada, tone: 'cyan' }
  const monthlyTarget = monthly.monthly_target_f01_tonnes ?? monthly.mov_programado_acumulado
  if (!monthlyTarget || monthlyTarget <= 0) return { value: null, detail: t.required_green_meta_no_configurada, tone: 'cyan' }
  const monthEnd = monthly.period.month_end_date ? new Date(`${monthly.period.month_end_date}T00:00:00`) : null
  const periodEnd = monthly.period.end_date ? new Date(`${monthly.period.end_date}T00:00:00`) : null
  const remainingDays = monthEnd && periodEnd && !Number.isNaN(monthEnd.getTime()) && !Number.isNaN(periodEnd.getTime())
    ? Math.max(0, Math.ceil((monthEnd.getTime() - periodEnd.getTime()) / 86_400_000))
    : null
  const remainingTonnes = Math.max(0, monthlyTarget - monthly.mov_real_acumulado)
  const required = remainingDays && remainingDays > 0 ? remainingTonnes / remainingDays : remainingTonnes
  const currentDaily = monthly.daily_breakdown?.filter((row) => !row.is_future && row.f01_real_tonnes > 0)
  const avgDaily = currentDaily?.length ? currentDaily.reduce((sum, row) => sum + row.f01_real_tonnes, 0) / currentDaily.length : null
  const tone = avgDaily === null
    ? 'cyan'
    : avgDaily >= required
      ? 'green'
      : avgDaily >= required * 0.9
        ? 'yellow'
        : 'red'
  return {
    value: required,
    detail: avgDaily === null
      ? t.required_green_dias_sin_promedio(remainingDays ?? 0)
      : t.required_green_prom_actual(formatTons(avgDaily), remainingDays ?? 0),
    tone,
  }
}

function CockpitOpeningRead({
  data,
  monthly,
  comparison,
}: {
  data: NonNullable<ReturnType<typeof buildCockpitViewModel>>
  monthly?: MonthlyTargetResponse
  comparison?: ShiftComparisonResponse
}) {
  const t = useModuleT(cockpitT)
  const monthlyDiff = typeof monthly?.mov_diferencia === 'number' ? monthly.mov_diferencia : null
  const monthlyPct = typeof monthly?.cumplimiento_pct === 'number' ? monthly.cumplimiento_pct : null
  const shiftDelta = data.targetTonnes > 0 ? data.forecastTonnes - data.targetTonnes : null
  const elapsedPct = typeof data.raw.shift.elapsed_pct === 'number' ? data.raw.shift.elapsed_pct : null
  const expectedNow = elapsedPct !== null && data.targetTonnes > 0 ? data.targetTonnes * elapsedPct / 100 : null
  const nowDelta = expectedNow === null ? null : data.actualTonnes - expectedNow
  const remainingMinutes = typeof data.raw.shift.elapsed_minutes === 'number'
    ? Math.max(0, 720 - data.raw.shift.elapsed_minutes)
    : null
  const requiredTph = remainingMinutes !== null && remainingMinutes > 0 && data.targetTonnes > 0
    ? Math.max(0, data.targetTonnes - data.actualTonnes) / (remainingMinutes / 60)
    : null
  const fairComparison = comparisonSameWindow(t, comparison)
  const dailyGreen = requiredDailyToGreen(t, monthly)
  const weakestEquipment = [...data.equipmentCards]
    .filter((item) => item.tonnes !== null || item.efficiency !== null)
    .sort((left, right) => (left.efficiency ?? 999) - (right.efficiency ?? 999))[0]
  const weakEquipmentTone = toneFromStatusValue(weakestEquipment?.efficiency, 75, 55)

  return (
    <section className="nmcp-opening-read" aria-label={t.opening_read_aria}>
      <div className="nmcp-opening-read-head">
        <div>
          <span className="nmcp-section-kicker">{t.opening_read_kicker}</span>
          <h2>{t.opening_read_title}</h2>
        </div>
        <p>{t.opening_read_desc}</p>
      </div>

      <div className="nmcp-opening-read-grid">
        <article className={`is-${toneFromDelta(nowDelta)}`}>
          <span><b>1</b> {t.opening_1_label}</span>
          <strong>{nowDelta === null ? formatTons(data.actualTonnes) : deltaLabel(nowDelta)}</strong>
          <small>
            {t.opening_1_actual(formatTons(data.actualTonnes))}
            {' / '}
            {expectedNow === null ? t.opening_1_esperado_sin_dato : t.opening_1_esperado(formatTons(expectedNow))}
          </small>
          <em>
            {elapsedPct === null ? t.opening_1_avance_sin_dato : t.opening_1_avance(formatNumber(elapsedPct, 1))}
          </em>
        </article>
        <article className={`is-${toneFromDelta(shiftDelta)}`}>
          <span><b>2</b> {t.opening_2_label}</span>
          <strong>{formatTons(data.forecastTonnes)}</strong>
          <small>{data.targetTonnes > 0 ? t.opening_2_pct_proyectado(formatNumber(data.forecastTonnes / data.targetTonnes * 100, 1)) : t.opening_2_meta_no_configurada}</small>
          <em>{shiftDelta === null ? `${data.dataSource} / ${data.sourceSystem}` : t.opening_2_brecha(deltaLabel(shiftDelta))}</em>
        </article>
        <article className={`is-${requiredTph === null ? 'cyan' : requiredTph <= 0 ? 'green' : 'yellow'}`}>
          <span><b>3</b> {t.opening_3_label}</span>
          <strong>{requiredTph === null ? t.opening_3_sin_meta : t.opening_3_valor(formatNumber(requiredTph))}</strong>
          <small>{requiredTph === null ? t.opening_3_sin_calculo : t.opening_3_detalle(formatTons(Math.max(0, data.targetTonnes - data.actualTonnes)))}</small>
          <em>{remainingMinutes === null ? t.opening_3_tiempo_sin_dato : t.opening_3_tiempo_restante(formatNumber(remainingMinutes))}</em>
        </article>
        <article className={`is-${dailyGreen.tone}`}>
          <span><b>4</b> {t.opening_4_label}</span>
          <strong>{dailyGreen.value === null ? t.opening_4_sin_plan : t.opening_4_valor(formatNumber(dailyGreen.value))}</strong>
          <small>{monthlyPct === null ? t.opening_4_sin_dato : t.opening_4_detalle(formatNumber(monthlyPct, 1))}</small>
          <em>{monthlyDiff === null ? dailyGreen.detail : `${dailyGreen.detail} / ${t.opening_2_brecha(deltaLabel(monthlyDiff))}`}</em>
        </article>
        <article className={`is-${fairComparison.tone}`}>
          <span><b>5</b> {fairComparison.label}</span>
          <strong>{fairComparison.value}</strong>
          <small>{fairComparison.detail}</small>
          <em>{comparison?.operational_context?.turno_nombre ? t.opening_5_actual_turno(comparison.operational_context.turno_nombre) : t.opening_5_filtro_actual}</em>
        </article>
        <article className={`is-${weakEquipmentTone}`}>
          <span><b>6</b> {t.opening_6_label}</span>
          <strong>{weakestEquipment?.id ?? t.opening_6_sin_foco}</strong>
          <small>{weakestEquipment ? t.opening_6_detalle(formatPct(weakestEquipment.efficiency, 1), formatTons(weakestEquipment.tonnes)) : t.opening_6_sin_tarjetas}</small>
          <em>{weakestEquipment?.operator ? t.common_operador(weakestEquipment.operator) : t.opening_6_validar}</em>
        </article>
        <article className="is-green">
          <span><b>7</b> {t.opening_7_label}</span>
          <strong>{data.recommendation.confidence}</strong>
          <small>{data.recommendation.title}</small>
          <em>{t.opening_7_impacto(formatTons(data.recommendation.impact_tons), formatMoney(data.recommendation.impact_usd))}</em>
        </article>
      </div>
    </section>
  )
}

export function DecisionCockpit() {
  const t = useModuleT(cockpitT)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedShift, setSelectedShift] = useState('ACTUAL')
  const [selectedLoadingUnitId, setSelectedLoadingUnitId] = useState<string | null>(null)
  const [selectedLoadingUnitAnchor, setSelectedLoadingUnitAnchor] = useState<DetailModalAnchor | null>(null)
  const [downloadingExecutiveReport, setDownloadingExecutiveReport] = useState(false)
  const selectedDateParam = selectedDate || undefined
  const query = useQuery({
    queryKey: ['decision-cockpit', 'v1', selectedDate, selectedShift],
    queryFn: () => northmineApi.cockpit({ date: selectedDateParam, shift: selectedShift }),
    enabled: !FAST_PUBLIC_DEMO,
    initialData: FAST_PUBLIC_DEMO ? FAST_DEMO_COCKPIT : undefined,
    placeholderData: (previousData) => previousData,
    staleTime: FAST_PUBLIC_DEMO ? Infinity : 60000,
    gcTime: FAST_PUBLIC_DEMO ? Infinity : 30 * 60000,
    refetchInterval: FAST_PUBLIC_DEMO ? false : 60000,
    refetchOnMount: !FAST_PUBLIC_DEMO,
  })
  const profitQuery = useQuery({
    queryKey: ['profit-optimization', 'v1'],
    queryFn: northmineApi.profitOptimization,
    enabled: !FAST_PUBLIC_DEMO,
    initialData: FAST_PUBLIC_DEMO ? FAST_DEMO_PROFIT : undefined,
    placeholderData: (previousData) => previousData,
    staleTime: FAST_PUBLIC_DEMO ? Infinity : 300000,
    gcTime: FAST_PUBLIC_DEMO ? Infinity : 30 * 60000,
    refetchInterval: FAST_PUBLIC_DEMO ? false : 300000,
  })
  const hiddenLossesQuery = useQuery({
    queryKey: ['hidden-losses', 'v1'],
    queryFn: northmineApi.hiddenLosses,
    enabled: !FAST_PUBLIC_DEMO,
    initialData: FAST_PUBLIC_DEMO ? FAST_DEMO_HIDDEN_LOSSES : undefined,
    placeholderData: (previousData) => previousData,
    staleTime: FAST_PUBLIC_DEMO ? Infinity : 300000,
    gcTime: FAST_PUBLIC_DEMO ? Infinity : 30 * 60000,
    refetchInterval: FAST_PUBLIC_DEMO ? false : 300000,
  })
  const nlpQuery = useQuery({
    queryKey: ['operational-nlp', 'v1'],
    queryFn: northmineApi.operationalNlp,
    enabled: !FAST_PUBLIC_DEMO,
    initialData: FAST_PUBLIC_DEMO ? FAST_DEMO_NLP : undefined,
    placeholderData: (previousData) => previousData,
    staleTime: FAST_PUBLIC_DEMO ? Infinity : 300000,
    gcTime: FAST_PUBLIC_DEMO ? Infinity : 30 * 60000,
    refetchInterval: FAST_PUBLIC_DEMO ? false : 300000,
  })
  const dispatcherQuery = useQuery({
    queryKey: ['dispatcher-advisor', 'v1', selectedDate, selectedShift],
    queryFn: () => northmineApi.dispatcherAdvisor({ date: selectedDateParam, shift: selectedShift }),
    enabled: !FAST_PUBLIC_DEMO,
    initialData: FAST_PUBLIC_DEMO ? FAST_DEMO_DISPATCHER : undefined,
    placeholderData: (previousData) => previousData,
    staleTime: FAST_PUBLIC_DEMO ? Infinity : 300000,
    gcTime: FAST_PUBLIC_DEMO ? Infinity : 30 * 60000,
    refetchInterval: FAST_PUBLIC_DEMO ? false : 300000,
  })
  const decisionAuditQuery = useQuery({
    queryKey: ['decision-audit', 'v1', selectedDate, selectedShift],
    queryFn: () => northmineApi.decisionAudit({ date: selectedDateParam, shift: selectedShift }),
    enabled: !FAST_PUBLIC_DEMO,
    initialData: FAST_PUBLIC_DEMO ? FAST_DEMO_DECISION_AUDIT : undefined,
    placeholderData: (previousData) => previousData,
    staleTime: FAST_PUBLIC_DEMO ? Infinity : 300000,
    gcTime: FAST_PUBLIC_DEMO ? Infinity : 30 * 60000,
    refetchInterval: FAST_PUBLIC_DEMO ? false : 300000,
  })
  const monthlyTargetQuery = useQuery({
    queryKey: ['monthly-target', 'v1', selectedDate, 'F01'],
    queryFn: () => northmineApi.monthlyTarget({ date: selectedDateParam, sector: 'F01' }),
    enabled: !FAST_PUBLIC_DEMO,
    initialData: FAST_PUBLIC_DEMO ? FAST_DEMO_MONTHLY_TARGET : undefined,
    placeholderData: (previousData) => previousData,
    staleTime: FAST_PUBLIC_DEMO ? Infinity : 300000,
    gcTime: FAST_PUBLIC_DEMO ? Infinity : 30 * 60000,
    refetchInterval: FAST_PUBLIC_DEMO ? false : 300000,
  })
  const shiftComparisonQuery = useQuery({
    queryKey: ['shift-comparison', 'v1', selectedDate],
    queryFn: () => northmineApi.shiftComparison({ date: selectedDateParam }),
    enabled: !FAST_PUBLIC_DEMO,
    initialData: FAST_PUBLIC_DEMO ? FAST_DEMO_SHIFT_COMPARISON : undefined,
    placeholderData: (previousData) => previousData,
    staleTime: FAST_PUBLIC_DEMO ? Infinity : 60000,
    gcTime: FAST_PUBLIC_DEMO ? Infinity : 30 * 60000,
    refetchInterval: FAST_PUBLIC_DEMO ? false : 60000,
    refetchOnMount: !FAST_PUBLIC_DEMO,
  })

  useEffect(() => {
    if (FAST_PUBLIC_DEMO) return
    const resolvedDate = shiftComparisonQuery.data?.selected_date
    if (!selectedDate && resolvedDate) {
      setSelectedDate(resolvedDate)
    }
  }, [selectedDate, shiftComparisonQuery.data?.selected_date])

  const data = useMemo(() => query.data ? buildCockpitViewModel(query.data) : null, [query.data])

  const downloadExecutiveReport = async () => {
    if (!data) return
    setDownloadingExecutiveReport(true)
    try {
      const response = await secureApi.get<Blob>(
        `/api/report/cockpit-executive-pdf?fecha=${encodeURIComponent(data.shiftDate)}&turno=${encodeURIComponent(data.selectedShift)}`,
        {
          responseType: 'blob',
          timeout: 60_000,
          headers: { Accept: 'application/pdf' },
        },
      )
      if (!(response.data instanceof Blob) || response.data.size === 0) {
        throw new Error('El backend no entrego un archivo PDF valido.')
      }
      const url = URL.createObjectURL(response.data)
      const link = document.createElement('a')
      link.href = url
      link.download = `NORTHMINE_Informe_Ejecutivo_${data.selectedShift}_${data.shiftDate}.pdf`
      link.style.display = 'none'
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1_000)
    } catch (error) {
      console.error('No se pudo descargar el informe ejecutivo', error)
      window.alert('No se pudo generar el informe. Verifica la conexión con el backend e inténtalo nuevamente.')
    } finally {
      setDownloadingExecutiveReport(false)
    }
  }

  // Deep-link desde el mapa 3D: /cockpit#sec-x desplaza a la seccion al cargar.
  const hashHandledRef = useRef(false)
  useEffect(() => {
    if (!data || hashHandledRef.current) return
    const hash = window.location.hash.slice(1)
    if (!hash) return
    hashHandledRef.current = true
    const timer = window.setTimeout(() => {
      document.getElementById(hash)?.scrollIntoView({ behavior: 'auto', block: 'start' })
    }, 150)
    return () => window.clearTimeout(timer)
  }, [data])

  if (!FAST_PUBLIC_DEMO && query.isLoading) return <LoadingState label={t.loading_cockpit} />

  if (query.isError || !data) {
    const detail = query.error instanceof Error
      ? t.error_detail(query.error.message)
      : t.error_detail_generic
    return <ErrorState title={t.error_title} detail={`${detail}${t.error_demo_suffix}`} onRetry={() => query.refetch()} />
  }

  const hourlySpark = data.hourly.map((point) => point.tonnes)
  const lastActiveHourIndex = data.hourly.reduce((last, point, index) => (
    (point.tonnes > 0 || (point.cycles ?? 0) > 0) ? index : last
  ), -1)
  const activeProjectionHours = Math.max(lastActiveHourIndex + 1, data.hourly.filter((point) => point.tonnes > 0 || (point.cycles ?? 0) > 0).length)
  const projectionConfidence = projectionConfidenceFromHours(activeProjectionHours, t)
  const forecastLow = Math.max(0, data.forecastTonnes * (1 - projectionConfidence.spreadPct))
  const forecastHigh = data.forecastTonnes * (1 + projectionConfidence.spreadPct)
  const progress = data.targetTonnes > 0 ? (data.actualTonnes / data.targetTonnes) * 100 : null
  const projectedProgress = data.targetTonnes > 0 ? (data.forecastTonnes / data.targetTonnes) * 100 : null
  const projectedDelta = data.targetTonnes > 0 ? data.forecastTonnes - data.targetTonnes : null
  const projectionTone = projectedDelta === null
    ? 'neutral'
    : projectedDelta >= 0
      ? 'green'
      : projectedProgress !== null && projectedProgress >= 92
        ? 'yellow'
        : 'red'
  const projectionStatus = projectedDelta === null
    ? t.projection_sin_meta
    : projectedDelta >= 0
      ? t.projection_sobre_meta
      : t.projection_bajo_meta
  const shiftTargetLabel = data.targetTonnes > 0 ? t.shift_target_label(formatTons(data.targetTonnes)) : t.shift_target_sin_meta
  const dailyTargetLabel = data.dailyTargetTonnes && data.dailyTargetTonnes > 0
    ? t.daily_target_label(formatTons(data.dailyTargetTonnes))
    : t.daily_target_sin_meta
  const sectorBreakdown = data.sectorBreakdown
    .filter((item) => item.sector === 'F01' || item.sector === 'F02')
    .sort((left, right) => left.sector.localeCompare(right.sector))
  const partialItems = [
    data.cycles.availability === 'missing' ? t.partial_item_ciclos : null,
    data.activeCaex.availability === 'missing' ? t.partial_item_caex_activos : null,
    data.averageCycle.availability === 'missing' ? t.partial_item_promedio_ciclo : null,
    data.averageCaexCircuit.availability === 'missing' ? t.partial_item_caex_promedio_circuito : null,
  ].filter(Boolean)
  const selectedLoadingUnit = data.equipmentCards.find((item) => item.id === selectedLoadingUnitId) ?? null
  const rankedEquipmentCards = [...data.equipmentCards].sort((left, right) => (right.tonnes ?? -1) - (left.tonnes ?? -1))
  const leaderEquipmentTonnes = rankedEquipmentCards[0]?.tonnes ?? null

  return (
    <div className="nmcp-shell">
      <div className="nmcp-main">
        <CockpitHeader
          data={data}
          fetching={!FAST_PUBLIC_DEMO && query.isFetching}
          onRefresh={() => { if (!FAST_PUBLIC_DEMO) void query.refetch() }}
          downloadingReport={downloadingExecutiveReport}
          onDownloadReport={downloadExecutiveReport}
        />

        <main className="nmcp-content">
          <SectionNav />
          {partialItems.length > 0 && (
            <section className="nmcp-partial-banner">
              <RadioTower size={16} />
              <span>{t.partial_banner(partialItems.join(', '))}</span>
            </section>
          )}

          <ShiftSummary data={data} />
          <CompactFilters
            selectedDate={selectedDate || data.shiftDate}
            selectedShift={selectedShift}
            resolvedShiftLabel={data.shiftLabel}
            onDateChange={setSelectedDate}
            onShiftChange={setSelectedShift}
          />

          <CockpitOpeningRead
            data={data}
            monthly={monthlyTargetQuery.data}
            comparison={shiftComparisonQuery.data}
          />

          <section id="sec-turno" className="nmcp-kpi-section" aria-label={t.kpi_grid_aria}>
            <div className="nmcp-kpi-hero-row">
              <KpiCard
                icon={Gauge}
                label={t.kpi_produccion_actual_label}
                value={formatTons(data.actualTonnes)}
                subtext={progress === null ? t.kpi_produccion_actual_subtext_sin_meta : t.kpi_produccion_actual_subtext(formatNumber(progress, 1))}
                indicator={data.dataSource}
                tone="cyan"
                progress={progress}
                sparkline={hourlySpark}
              >
                <div className="nmcp-kpi-hero-details">
                  {sectorBreakdown.length > 0 && (
                    <div className="nmcp-kpi-sector-split" aria-label={t.sector_split_aria}>
                      {sectorBreakdown.map((sector) => (
                        <span key={sector.sector}>
                          <small>{sector.sector}</small>
                          <strong>{formatTons(sector.actualTonnes)}</strong>
                          <em>
                            {sector.forecastTonnes === null
                              ? t.sector_split_pct(formatNumber(sector.pctOfTotal, 1))
                              : t.sector_split_proyectado(formatTons(sector.forecastTonnes))}
                          </em>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className={`nmcp-kpi-forecast is-${projectionTone}`}>
                    <span>{t.kpi_tonelaje_proyectado}</span>
                    <strong>{formatTons(data.forecastTonnes)}</strong>
                    <em>
                      {projectedProgress === null
                        ? t.kpi_meta_no_configurada
                        : t.kpi_proyeccion_detalle(projectionStatus, deltaLabel(projectedDelta ?? 0), formatNumber(projectedProgress, 1))}
                    </em>
                    <small>
                      {t.kpi_proyeccion_confianza(projectionConfidence.label, activeProjectionHours || 0)}
                    </small>
                    <small>
                      {t.kpi_proyeccion_rango(formatTons(forecastLow), formatTons(forecastHigh))}
                    </small>
                  </div>
                </div>
              </KpiCard>
            </div>
            <div className="nmcp-kpi-grid nmcp-kpi-grid-secondary">
              <KpiCard
                icon={Target}
                label={t.kpi_meta_turno_label}
                value={data.targetTonnes > 0 ? formatTons(data.targetTonnes) : t.kpi_meta_turno_sin_meta}
                subtext={
                  data.targetTonnes <= 0
                    ? t.kpi_meta_turno_subtext_no_config
                    : t.kpi_meta_turno_subtext(dailyTargetLabel)
                }
                indicator={shiftTargetLabel}
                tone={projectionTone}
                progress={progress}
              />
              <KpiCard
                icon={Activity}
                label={t.kpi_ciclos_label}
                value={data.cycles.value === null ? t.kpi_dato_no_disponible : formatNumber(data.cycles.value)}
                subtext={data.cycles.value === null ? t.kpi_no_informado_api : t.kpi_ciclos_subtext}
                indicator={availabilityLabel(data.cycles.availability, t)}
                tone="neutral"
                unavailable={data.cycles.value === null}
              />
              <KpiCard
                icon={Truck}
                label={t.kpi_caex_activos_label}
                value={data.activeCaex.value === null ? t.kpi_dato_no_disponible : formatNumber(data.activeCaex.value)}
                subtext={data.activeCaex.value === null ? t.kpi_no_informado_api : t.kpi_caex_activos_subtext}
                indicator={t.kpi_caex_disp_indicator(formatNumber(data.availabilityPct, 0))}
                tone="green"
                unavailable={data.activeCaex.value === null}
              />
              <KpiCard
                icon={Timer}
                label={t.kpi_promedio_ciclo_label}
                value={data.averageCycle.value === null ? t.kpi_dato_no_disponible : `${formatNumber(data.averageCycle.value, 1)} t`}
                subtext={data.averageCycle.value === null ? t.kpi_no_informado_api : t.kpi_promedio_ciclo_subtext(formatMoney(data.totalCost))}
                indicator={`USD ${formatNumber(data.costPerTonne, 2)}/t`}
                tone="yellow"
                unavailable={data.averageCycle.value === null}
              />
              <KpiCard
                icon={BarChart3}
                label={t.kpi_promedio_caex_circuito_label}
                value={data.averageCaexCircuit.value === null ? t.kpi_dato_no_disponible : formatNumber(data.averageCaexCircuit.value, 1)}
                subtext={data.averageCaexCircuit.value === null ? t.kpi_no_informado_api : t.kpi_promedio_caex_circuito_subtext}
                indicator={availabilityLabel(data.averageCaexCircuit.availability, t)}
                tone="purple"
                unavailable={data.averageCaexCircuit.value === null}
              />
            </div>
          </section>

          <div id="sec-mensual" className="nmcp-section-anchor">
            <MonthlyTargetPanel
              data={monthlyTargetQuery.data}
              error={monthlyTargetQuery.error instanceof Error ? monthlyTargetQuery.error : null}
              fetching={!FAST_PUBLIC_DEMO && monthlyTargetQuery.isFetching}
              loading={!FAST_PUBLIC_DEMO && monthlyTargetQuery.isLoading}
              onRefresh={() => { if (!FAST_PUBLIC_DEMO) void monthlyTargetQuery.refetch() }}
            />
          </div>

          <div id="sec-comparativa" className="nmcp-section-anchor">
            <ShiftComparisonVisionPanel
              data={shiftComparisonQuery.data}
              error={shiftComparisonQuery.error instanceof Error ? shiftComparisonQuery.error : null}
              fetching={!FAST_PUBLIC_DEMO && shiftComparisonQuery.isFetching}
              loading={!FAST_PUBLIC_DEMO && shiftComparisonQuery.isLoading}
              selectedDate={selectedDate || data.shiftDate}
              onDateChange={setSelectedDate}
              onRefresh={() => { if (!FAST_PUBLIC_DEMO) void shiftComparisonQuery.refetch() }}
            />
          </div>

          <section id="sec-equipos" className="nmcp-equipment-grid">
            <EquipmentStatusPanel
              title={t.estado_caex_title}
              rows={data.caexRows}
              emptyLabel={t.estado_caex_empty}
            />
            <EquipmentStatusPanel
              title={t.estado_palas_title}
              rows={data.shovelRows}
              emptyLabel={t.estado_palas_empty}
            />
          </section>

          <section id="sec-produccion" className="nmcp-production-grid">
            <ProductionHourlyChart data={data.hourly} />
            <ProductionTable data={data.hourly} />
          </section>

          <section className="nmcp-production-grid is-secondary">
            <ShovelProductionChart rows={data.shovelRows} hourly={data.shovelHourly} />
            <section className="nmcp-panel nmcp-decision-panel">
              <div className="nmcp-panel-header">
                <div>
                  <span className="nmcp-section-kicker">{t.decision_intelligence_kicker}</span>
                  <h2>{t.decision_intelligence_title}</h2>
                </div>
                <span className="nmcp-panel-tag">{t.decision_intelligence_tag(data.recommendation.confidence)}</span>
              </div>
              <div className="nmcp-decision-action">
                <span>{t.decision_action_label}</span>
                <strong>{data.recommendation.title}</strong>
                <small>{t.decision_action_note}</small>
              </div>
              <div className="nmcp-impact-row">
                <span><small>{t.decision_impact_tonelaje}</small>+{formatTons(data.recommendation.impact_tons)}</span>
                <span><small>{t.decision_impact_valor}</small>+{formatMoney(data.recommendation.impact_usd)}</span>
                <span><small>{t.dispatcher_cola}</small>{t.decision_impact_cola(formatNumber(data.recommendation.queue_delta_min, 1))}</span>
              </div>
              <div className="nmcp-mini-section-title">
                <span>{t.decision_scenarios_label}</span>
                <strong>{t.decision_scenarios_top3}</strong>
              </div>
              <div className="nmcp-scenario-strip">
                {data.raw.scenarios.slice(0, 3).map((scenario) => (
                  <article key={scenario.scenario} className={scenario.value === 'Mejor' ? 'is-best' : ''}>
                    <strong>{scenario.scenario}</strong>
                    <span>{formatTons(scenario.tons)}</span>
                    <em>{scenario.risk}</em>
                  </article>
                ))}
              </div>
            </section>
          </section>

          <div id="sec-decisiones" className="nmcp-section-anchor">
            <DispatcherAdvisorPanel
              data={dispatcherQuery.data}
              error={dispatcherQuery.error instanceof Error ? dispatcherQuery.error : null}
              fetching={!FAST_PUBLIC_DEMO && dispatcherQuery.isFetching}
              loading={!FAST_PUBLIC_DEMO && dispatcherQuery.isLoading}
              onRefresh={() => { if (!FAST_PUBLIC_DEMO) void dispatcherQuery.refetch() }}
            />

            <section className="nmcp-intelligence-brief" aria-label={t.intelligence_brief_aria}>
              <div className="nmcp-section-title-row">
                <div>
                  <span className="nmcp-section-kicker">{t.intelligence_brief_kicker}</span>
                  <h2>{t.intelligence_brief_title}</h2>
                </div>
                <p>{t.intelligence_brief_desc}</p>
              </div>

              <HiddenLossPanel
                data={hiddenLossesQuery.data}
                error={hiddenLossesQuery.error instanceof Error ? hiddenLossesQuery.error : null}
                fetching={!FAST_PUBLIC_DEMO && hiddenLossesQuery.isFetching}
                loading={!FAST_PUBLIC_DEMO && hiddenLossesQuery.isLoading}
                onRefresh={() => { if (!FAST_PUBLIC_DEMO) void hiddenLossesQuery.refetch() }}
              />

              <OperationalNlpPanel
                data={nlpQuery.data}
                error={nlpQuery.error instanceof Error ? nlpQuery.error : null}
                fetching={!FAST_PUBLIC_DEMO && nlpQuery.isFetching}
                loading={!FAST_PUBLIC_DEMO && nlpQuery.isLoading}
                onRefresh={() => { if (!FAST_PUBLIC_DEMO) void nlpQuery.refetch() }}
              />
            </section>

            <ProfitOptimizationPanel
              data={profitQuery.data}
              error={profitQuery.error instanceof Error ? profitQuery.error : null}
              fetching={!FAST_PUBLIC_DEMO && profitQuery.isFetching}
              loading={!FAST_PUBLIC_DEMO && profitQuery.isLoading}
              onRefresh={() => { if (!FAST_PUBLIC_DEMO) void profitQuery.refetch() }}
            />

            <DecisionAuditPanel
              data={decisionAuditQuery.data}
              error={decisionAuditQuery.error instanceof Error ? decisionAuditQuery.error : null}
              fetching={!FAST_PUBLIC_DEMO && decisionAuditQuery.isFetching}
              loading={!FAST_PUBLIC_DEMO && decisionAuditQuery.isLoading}
              onRefresh={() => { if (!FAST_PUBLIC_DEMO) void decisionAuditQuery.refetch() }}
            />
          </div>

          <section id="sec-flota" className="nmcp-equipment-card-section" aria-label={t.fleet_section_aria}>
            <div className="nmcp-section-title-row">
              <div>
                <span className="nmcp-section-kicker">{t.fleet_kicker}</span>
                <h2>{t.fleet_title}</h2>
              </div>
              <p>{t.fleet_desc}</p>
            </div>

            <div className="nmcp-equipment-card-grid">
              {rankedEquipmentCards.map((item, index) => (
                <LoadingEquipmentCard
                  key={item.id}
                  item={item}
                  rank={index + 1}
                  leaderTonnes={leaderEquipmentTonnes ?? undefined}
                  onOpenDetail={(selected, anchor) => {
                    setSelectedLoadingUnitId(selected.id)
                    setSelectedLoadingUnitAnchor(anchor)
                  }}
                />
              ))}
              {!rankedEquipmentCards.length && (
                <section className="nmcp-panel nmcp-empty-inline">{t.fleet_empty}</section>
              )}
            </div>
          </section>
        </main>

        <CockpitAlertBar data={data} />
        <LoadingEquipmentDetailModal
          item={selectedLoadingUnit}
          hourly={data.shovelHourly}
          anchor={selectedLoadingUnitAnchor}
          onClose={() => {
            setSelectedLoadingUnitId(null)
            setSelectedLoadingUnitAnchor(null)
          }}
        />
      </div>
    </div>
  )
}
