import { type CSSProperties, useEffect, useState } from 'react'
import { RefreshCcw, SplitSquareHorizontal, X } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  LabelList,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { getEquipmentImage, getEquipmentLabel } from '../../data/equipmentAssets'
import type {
  ShiftComparisonEquipmentHourlyPoint,
  ShiftComparisonEquipmentPoint,
  ShiftComparisonEquipmentStatusBreakdown,
  ShiftComparisonHourlyPoint,
  ShiftComparisonResponse,
} from '../../lib/api'
import { formatNumber, formatTons } from './cockpitModel'
import { getDetailModalAnchor, type DetailModalAnchor } from './detailModalPosition'
import { useModuleT } from '../../i18n/useModuleT'
import { cockpitT, type CockpitT } from '../../i18n/modules/cockpit'
import { premiumPalette, useChartPaletteKey } from '../charts/premium/chartTheme'
import { FloatingWindow } from '../ui/FloatingWindow'

// Dia/noche son un codigo de color semantico fijo (no un accent de marca),
// por eso usan su propio token --vision-night en vez de premiumPalette.amber
// o .red: cada apariencia lo redefine a su manera (violeta en dark/light,
// gris en minimal, bronce en carbon) para no chocar con su propio cyan.
const SHIFT_HOURS = 12

type ShiftFocus = 'DIA' | 'NOCHE' | 'AMBOS'
type VisualHourlyPoint = ShiftComparisonHourlyPoint & {
  dia_pending?: boolean
  noche_pending?: boolean
  hourly_total_tonnes: number
  shift_projected_cumulative_tonnes: number | null
  shift_projected_final_tonnes: number | null
}

type EquipmentVisualHourlyPoint = ShiftComparisonEquipmentHourlyPoint & {
  hourly_total_tonnes: number
}

interface ShiftComparisonVisionPanelProps {
  data?: ShiftComparisonResponse
  error?: Error | null
  fetching?: boolean
  loading?: boolean
  selectedDate: string
  onDateChange: (value: string) => void
  onRefresh: () => void
}

function sourceClass(dataSource: string): string {
  const normalized = dataSource.toUpperCase()
  if (normalized === 'REAL') return 'is-real'
  if (normalized === 'DEMO') return 'is-demo'
  return 'is-estimated'
}

function diffClass(value: number): string {
  if (value > 0) return 'is-day-leading'
  if (value < 0) return 'is-night-leading'
  return 'is-even'
}

function leaderLabel(leader: string, t: CockpitT): string {
  if (leader === 'DIA') return t.sc_leader_dia
  if (leader === 'NOCHE') return t.sc_leader_noche
  return t.sc_leader_empate
}

function focusLabel(focusShift: ShiftFocus, t: CockpitT): string {
  if (focusShift === 'DIA') return t.sc_focus_dia
  if (focusShift === 'NOCHE') return t.sc_focus_noche
  return t.sc_focus_ambos
}

function compactTons(value: number | null | undefined): string {
  if (!value) return ''
  if (Math.abs(value) >= 1000) return `${formatNumber(value / 1000, value >= 10000 ? 0 : 1)}k`
  return formatNumber(value)
}

function elapsedSlots(data: ShiftComparisonResponse, liveShift: ShiftFocus): number {
  const elapsed = data.operational_context?.elapsed_minutes
  if (liveShift === 'AMBOS' || typeof elapsed !== 'number' || Number.isNaN(elapsed)) return SHIFT_HOURS
  return Math.max(1, Math.min(SHIFT_HOURS, Math.ceil(elapsed / 60)))
}

function isLiveOperationalShift(data: ShiftComparisonResponse, liveShift: ShiftFocus): liveShift is 'DIA' | 'NOCHE' {
  return liveShift !== 'AMBOS' && data.selected_date === data.operational_context?.fecha_operacional
}

function selectedChartTonnes(row: ShiftComparisonHourlyPoint, focusShift: ShiftFocus): number {
  if (focusShift === 'DIA') return row.dia_tonnes
  if (focusShift === 'NOCHE') return row.noche_tonnes
  return row.dia_tonnes + row.noche_tonnes
}

function buildEquipmentVisualHourlyRows(rows: ShiftComparisonEquipmentHourlyPoint[], focusShift: ShiftFocus): EquipmentVisualHourlyPoint[] {
  return rows.map((row) => ({
    ...row,
    hourly_total_tonnes: selectedChartTonnes(row, focusShift),
  }))
}

function buildVisualHourlyRows(data: ShiftComparisonResponse, liveShift: ShiftFocus, focusShift: ShiftFocus): VisualHourlyPoint[] {
  const slots = elapsedSlots(data, liveShift)
  const isLive = isLiveOperationalShift(data, liveShift)
  const liveRows = data.hourly.filter((row) => row.slot <= slots)
  const liveTonnes = liveRows.reduce((sum, row) => sum + (liveShift === 'DIA' ? row.dia_tonnes : row.noche_tonnes), 0)
  const liveRate = slots > 0 ? liveTonnes / slots : 0
  const projectedFinal = isLive ? liveRate * SHIFT_HOURS : null
  return data.hourly.map((row) => {
    const diaPending = isLive && liveShift === 'DIA' && row.slot > slots && row.dia_tonnes <= 0 && row.dia_cycles <= 0
    const nochePending = isLive && liveShift === 'NOCHE' && row.slot > slots && row.noche_tonnes <= 0 && row.noche_cycles <= 0
    const actualTotal = selectedChartTonnes(row, focusShift)
    let projectedCumulative: number | null = null
    if (isLive && focusShift !== (liveShift === 'DIA' ? 'NOCHE' : 'DIA')) {
      projectedCumulative = liveRate * row.slot
    }
    return {
      ...row,
      dia_pending: diaPending,
      noche_pending: nochePending,
      hourly_total_tonnes: actualTotal,
      shift_projected_cumulative_tonnes: projectedCumulative,
      shift_projected_final_tonnes: projectedFinal,
    }
  })
}

function fairWindowSummary(data: ShiftComparisonResponse, liveShift: ShiftFocus) {
  if (!isLiveOperationalShift(data, liveShift)) return null
  const slots = elapsedSlots(data, liveShift)
  const rows = data.hourly.filter((row) => row.slot <= slots)
  const dia = rows.reduce((sum, row) => sum + row.dia_tonnes, 0)
  const noche = rows.reduce((sum, row) => sum + row.noche_tonnes, 0)
  const current = liveShift === 'DIA' ? dia : noche
  const previous = liveShift === 'DIA' ? noche : dia
  const projected = slots > 0 ? (current / slots) * SHIFT_HOURS : current
  const fullReference = liveShift === 'DIA' ? data.summary.noche.total_tonnes : data.summary.dia.total_tonnes
  const currentRate = slots > 0 ? current / slots : 0
  const referenceRate = slots > 0 ? previous / slots : 0
  return {
    slots,
    dia,
    noche,
    current,
    previous,
    projected,
    fullReference,
    currentRate,
    referenceRate,
    deltaSameWindow: current - previous,
    deltaProjection: projected - fullReference,
  }
}

function phaseFromText(value?: string | null): 'F01' | 'F02' | 'OTRO' {
  const normalized = (value ?? '').toUpperCase()
  if (normalized.includes('F01')) return 'F01'
  if (normalized.includes('F02')) return 'F02'
  return 'OTRO'
}

function phaseSplitFromHourly(rows: ShiftComparisonEquipmentHourlyPoint[], focusShift: ShiftFocus) {
  const totals = { f01: 0, f02: 0, other: 0 }
  for (const row of rows) {
    const add = (origin: string | null | undefined, tonnes: number) => {
      const phase = phaseFromText(origin)
      if (phase === 'F01') totals.f01 += tonnes
      else if (phase === 'F02') totals.f02 += tonnes
      else totals.other += tonnes
    }
    if (focusShift !== 'NOCHE') add(row.dia_origin, row.dia_tonnes)
    if (focusShift !== 'DIA') add(row.noche_origin, row.noche_tonnes)
  }
  const total = totals.f01 + totals.f02 + totals.other
  return {
    ...totals,
    total,
    f01Pct: total > 0 ? totals.f01 / total * 100 : 0,
    f02Pct: total > 0 ? totals.f02 / total * 100 : 0,
    otherPct: total > 0 ? totals.other / total * 100 : 0,
  }
}

function shouldReduceMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

function useAnimatedNumber(value: number, animationId?: string, duration = 850): number {
  const [displayValue, setDisplayValue] = useState(value)

  useEffect(() => {
    if (!value || shouldReduceMotion()) {
      setDisplayValue(value)
      return
    }
    let frame = 0
    const startedAt = performance.now()
    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayValue(value * eased)
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    setDisplayValue(0)
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [animationId, duration, value])

  return displayValue
}

function AnimatedTons({
  value,
  animationId,
  className,
  as = 'strong',
}: {
  value: number
  animationId?: string
  className?: string
  as?: 'strong' | 'b'
}) {
  const animated = useAnimatedNumber(value, animationId)
  const Tag = as
  return <Tag className={className}>{formatTons(animated)}</Tag>
}

function AnimatedCompactTons({ value, animationId }: { value: number; animationId?: string }) {
  const animated = useAnimatedNumber(value, animationId, 760)
  return <>{compactTons(animated)}</>
}

function barGradientStops(variant: string | undefined, fallback: string) {
  if (variant === 'night') {
    return {
      base: '#2A174F',
      mid: '#8D5CFF',
      top: '#F0A7FF',
      stroke: '#F4D0FF',
    }
  }
  if (variant === 'day') {
    return {
      base: '#07465C',
      mid: '#16C8F3',
      top: '#B8F7FF',
      stroke: '#D8FBFF',
    }
  }
  return {
    base: fallback,
    mid: fallback,
    top: '#F4F7FA',
    stroke: fallback,
  }
}

function RisingBarShape({ x, y, width, height, fill, payload, variant }: any) {
  const barHeight = Number(height)
  const barWidth = Number(width)
  if (!barHeight || !barWidth || barHeight <= 0 || barWidth <= 0) return null

  const slot = Number(payload?.slot ?? 1)
  const delayMs = Math.min(70 + Math.max(slot - 1, 0) * 55 + (variant === 'night' ? 45 : 0), 760)
  const radius = Math.min(7, barWidth / 2)
  const gradient = barGradientStops(variant, fill ?? '#16C8F3')
  const gradientId = `nmcp-rising-bar-gradient-${variant ?? 'default'}-${slot}`
  const glowStyle = {
    '--bar-delay': `${delayMs}ms`,
    '--bar-glow': gradient.mid,
  } as CSSProperties

  return (
    <g className={`nmcp-rising-bar is-${variant ?? 'default'}`} style={glowStyle}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor={gradient.base} stopOpacity="0.86" />
          <stop offset="58%" stopColor={gradient.mid} stopOpacity="0.96" />
          <stop offset="100%" stopColor={gradient.top} stopOpacity="1" />
        </linearGradient>
      </defs>
      <rect
        className="nmcp-rising-bar-core"
        x={Number(x)}
        y={Number(y)}
        width={barWidth}
        height={barHeight}
        rx={radius}
        ry={radius}
        fill={`url(#${gradientId})`}
        stroke={gradient.stroke}
        strokeOpacity={0.24}
      />
      {barHeight > 10 && (
        <rect
          className="nmcp-rising-bar-shine"
          x={Number(x) + Math.max(2, barWidth * 0.18)}
          y={Number(y) + 3}
          width={Math.max(1.5, barWidth * 0.18)}
          height={Math.max(0, barHeight - 6)}
          rx={radius}
          ry={radius}
        />
      )}
    </g>
  )
}

function HourlyBarValueLabel({ x, y, width, value, fill, animationId, payload, dataKey }: any) {
  const numeric = Number(value)
  const key = String(dataKey ?? '')
  if ((key.includes('dia') && payload?.dia_pending) || (key.includes('noche') && payload?.noche_pending)) return null
  if (!numeric || Number.isNaN(numeric)) return null
  const centerX = Number(x) + Number(width) / 2
  const topY = Math.max(12, Number(y) - 6)
  return (
    <text
      x={centerX}
      y={topY}
      textAnchor="middle"
      fill={fill ?? '#F4F7FA'}
      className="nmcp-shift-bar-label"
    >
      <AnimatedCompactTons value={numeric} animationId={`${animationId ?? 'bar'}-${key}-${payload?.slot ?? 'slot'}-${numeric}`} />
    </text>
  )
}

function HourlyValuesStrip({
  rows,
  focusShift,
  animationId,
}: {
  rows: Array<ShiftComparisonHourlyPoint & { dia_pending?: boolean; noche_pending?: boolean }>
  focusShift: ShiftFocus
  animationId?: string
}) {
  const t = useModuleT(cockpitT)
  const hourLabel = (row: ShiftComparisonHourlyPoint) => {
    if (focusShift === 'DIA') return row.dia_hour
    if (focusShift === 'NOCHE') return row.noche_hour
    return `${row.dia_hour} - ${row.noche_hour}`
  }

  return (
    <div className={`nmcp-shift-hourly-values is-${focusShift.toLowerCase()}`} aria-label={t.sc_tonelajes_visibles_aria}>
      {rows.map((row) => (
        <article key={row.slot} className={row.dia_pending || row.noche_pending ? 'is-pending' : undefined}>
          <span>{row.label}</span>
          <small className="nmcp-shift-hour-label">{hourLabel(row)}</small>
          {focusShift !== 'NOCHE' && (
            row.dia_pending
              ? <strong className="is-pending">{t.sc_pendiente}</strong>
              : <AnimatedTons value={row.dia_tonnes} animationId={`${animationId ?? 'hourly'}-day-${row.slot}`} className="is-day" />
          )}
          {focusShift !== 'DIA' && (
            row.noche_pending
              ? <strong className="is-pending">{t.sc_pendiente}</strong>
              : <AnimatedTons value={row.noche_tonnes} animationId={`${animationId ?? 'hourly'}-night-${row.slot}`} className="is-night" />
          )}
        </article>
      ))}
    </div>
  )
}

function HourlyTonnesTotal({
  dayTotal,
  nightTotal,
  focusShift,
  animationId,
  projectedFinal,
}: {
  dayTotal: number
  nightTotal: number
  focusShift: ShiftFocus
  animationId?: string
  projectedFinal?: number | null
}) {
  const t = useModuleT(cockpitT)
  const projectedNode = typeof projectedFinal === 'number'
    ? (
        <small className="nmcp-shift-projected-final">
          <span>{t.sc_proyectado}</span>
          <AnimatedTons value={projectedFinal} animationId={`${animationId ?? 'total'}-projected-${projectedFinal}`} as="b" />
        </small>
      )
    : null
  if (focusShift === 'DIA') {
    return (
      <div className="nmcp-shift-hourly-total is-day">
        <span>{t.sc_suma_tonelaje}</span>
        <AnimatedTons value={dayTotal} animationId={`${animationId ?? 'total'}-day`} />
        <em>{t.sc_turno_dia_em}{projectedNode}</em>
      </div>
    )
  }
  if (focusShift === 'NOCHE') {
    return (
      <div className="nmcp-shift-hourly-total is-night">
        <span>{t.sc_suma_tonelaje}</span>
        <AnimatedTons value={nightTotal} animationId={`${animationId ?? 'total'}-night`} />
        <em>{t.sc_turno_noche_em}{projectedNode}</em>
      </div>
    )
  }
  return (
    <div className="nmcp-shift-hourly-total is-combined">
      <span>{t.sc_suma_tonelaje}</span>
      <AnimatedTons value={dayTotal + nightTotal} animationId={`${animationId ?? 'total'}-both`} />
      <em>{t.sc_dia_noche_em(formatTons(dayTotal), formatTons(nightTotal))}{projectedNode}</em>
    </div>
  )
}

function FairComparisonCard({ summary, liveShift }: { summary: ReturnType<typeof fairWindowSummary>; liveShift: ShiftFocus }) {
  const t = useModuleT(cockpitT)
  if (!summary || liveShift === 'AMBOS') return null
  const currentLabel = liveShift === 'DIA' ? t.sc_dia_en_curso : t.sc_noche_en_curso
  const referenceLabel = liveShift === 'DIA' ? t.sc_noche_misma_ventana : t.sc_dia_misma_ventana
  const projectionTone = summary.deltaProjection >= 0 ? 'is-positive' : 'is-negative'
  const sameWindowTone = summary.deltaSameWindow >= 0 ? 'is-positive' : 'is-negative'
  return (
    <div className="nmcp-shift-fair-card" aria-label={t.sc_lectura_justa_aria}>
      <div>
        <span>{t.sc_comparacion_justa}</span>
        <strong>{t.sc_ventana(summary.slots)}</strong>
        <small>
          {currentLabel} {formatTons(summary.current)} vs {referenceLabel} {formatTons(summary.previous)}
        </small>
      </div>
      <div className={sameWindowTone}>
        <span>{t.sc_diferencia_misma_ventana}</span>
        <strong>{summary.deltaSameWindow >= 0 ? '+' : ''}{formatTons(summary.deltaSameWindow)}</strong>
        <small>{t.sc_evita_comparar}</small>
      </div>
      <div className={projectionTone}>
        <span>{t.sc_proyeccion_vs_completo}</span>
        <strong>{formatTons(summary.projected)}</strong>
        <small>{t.sc_vs_referencia(`${summary.deltaProjection >= 0 ? '+' : ''}${formatTons(summary.deltaProjection)}`)}</small>
      </div>
      <div>
        <span>{t.sc_ritmo_horario}</span>
        <strong>{formatNumber(summary.currentRate, 0)} t/h</strong>
        <small>{t.sc_referencia_rate(formatNumber(summary.referenceRate, 0))}</small>
      </div>
    </div>
  )
}

function PhaseSplitBar({ split, focusShift }: { split: ReturnType<typeof phaseSplitFromHourly>; focusShift: ShiftFocus }) {
  const t = useModuleT(cockpitT)
  if (split.total <= 0) return null
  return (
    <div className="nmcp-shift-phase-card" aria-label={t.sc_distribucion_operacional(focusLabel(focusShift, t))}>
      <div className="nmcp-shift-phase-head">
        <span>{t.sc_origen_operacional}</span>
        <strong>{focusLabel(focusShift, t)}</strong>
      </div>
      <div className="nmcp-shift-phase-bar">
        {split.f01 > 0 && <span className="is-f01" style={{ width: `${Math.max(split.f01Pct, 4)}%` }} />}
        {split.f02 > 0 && <span className="is-f02" style={{ width: `${Math.max(split.f02Pct, 4)}%` }} />}
        {split.other > 0 && <span className="is-other" style={{ width: `${Math.max(split.otherPct, 4)}%` }} />}
      </div>
      <div className="nmcp-shift-phase-values">
        <span><b>F01</b> {formatTons(split.f01)} / {formatNumber(split.f01Pct, 1)}%</span>
        <span><b>F02</b> {formatTons(split.f02)} / {formatNumber(split.f02Pct, 1)}%</span>
        {split.other > 0 && <span><b>{t.sc_tone_other}</b> {formatTons(split.other)} / {formatNumber(split.otherPct, 1)}%</span>}
      </div>
    </div>
  )
}

function shiftTone(focusShift: ShiftFocus): 'day' | 'night' | 'diff' {
  if (focusShift === 'DIA') return 'day'
  if (focusShift === 'NOCHE') return 'night'
  return 'diff'
}

function selectedOperator(item: ShiftComparisonEquipmentPoint, focusShift: ShiftFocus): string {
  if (focusShift === 'DIA') return item.dia_operator ?? item.operator ?? 'Sin dato'
  if (focusShift === 'NOCHE') return item.noche_operator ?? item.operator ?? 'Sin dato'
  return item.operator ?? 'Sin dato'
}

function selectedTonnes(item: ShiftComparisonEquipmentPoint, focusShift: ShiftFocus): number {
  if (focusShift === 'DIA') return item.dia_tonnes
  if (focusShift === 'NOCHE') return item.noche_tonnes
  return item.total_tonnes
}

function selectedCycles(item: ShiftComparisonEquipmentPoint, focusShift: ShiftFocus): number {
  if (focusShift === 'DIA') return item.dia_cycles
  if (focusShift === 'NOCHE') return item.noche_cycles
  return item.total_cycles
}

function selectedAssignedCaex(item: ShiftComparisonEquipmentPoint, focusShift: ShiftFocus): number | undefined {
  if (focusShift === 'DIA') return item.dia_assigned_caex
  if (focusShift === 'NOCHE') return item.noche_assigned_caex
  return item.assigned_caex
}

function selectedLoadingUnits(item: ShiftComparisonEquipmentPoint, focusShift: ShiftFocus): number | undefined {
  if (focusShift === 'DIA') return item.dia_loading_units
  if (focusShift === 'NOCHE') return item.noche_loading_units
  return item.loading_units
}

function selectedAvgCaex(item: ShiftComparisonEquipmentPoint, focusShift: ShiftFocus): number | null | undefined {
  if (focusShift === 'DIA') return item.dia_avg_caex_in_circuit
  if (focusShift === 'NOCHE') return item.noche_avg_caex_in_circuit
  return item.avg_caex_in_circuit
}

function selectedDestination(item: ShiftComparisonEquipmentPoint, focusShift: ShiftFocus): { label?: string; pct?: number } {
  if (focusShift === 'DIA') return { label: item.dia_main_destination, pct: item.dia_destination_pct }
  if (focusShift === 'NOCHE') return { label: item.noche_main_destination, pct: item.noche_destination_pct }
  return { label: item.main_destination, pct: item.destination_pct }
}

function selectedBench(item: ShiftComparisonEquipmentPoint, focusShift: ShiftFocus): { label?: string; pct?: number } {
  if (focusShift === 'DIA') return { label: item.dia_bench_mesh, pct: item.dia_bench_mesh_pct }
  if (focusShift === 'NOCHE') return { label: item.noche_bench_mesh, pct: item.noche_bench_mesh_pct }
  return { label: item.bench_mesh, pct: item.bench_mesh_pct }
}

function selectedMainLoadingUnit(item: ShiftComparisonEquipmentPoint, focusShift: ShiftFocus): { label?: string | null; pct?: number } {
  if (focusShift === 'DIA') return { label: item.dia_main_loading_unit, pct: item.dia_loading_unit_pct }
  if (focusShift === 'NOCHE') return { label: item.noche_main_loading_unit, pct: item.noche_loading_unit_pct }
  return { label: item.main_loading_unit, pct: item.loading_unit_pct }
}

function selectedHourlyTonnes(row: ShiftComparisonEquipmentHourlyPoint, focusShift: ShiftFocus): number {
  if (focusShift === 'DIA') return row.dia_tonnes
  if (focusShift === 'NOCHE') return row.noche_tonnes
  return row.dia_tonnes + row.noche_tonnes
}

function selectedHourlyCycles(row: ShiftComparisonEquipmentHourlyPoint, focusShift: ShiftFocus): number {
  if (focusShift === 'DIA') return row.dia_cycles
  if (focusShift === 'NOCHE') return row.noche_cycles
  return row.dia_cycles + row.noche_cycles
}

function selectedHourlyString(
  focusShift: ShiftFocus,
  dayValue: string | null | undefined,
  nightValue: string | null | undefined,
): string {
  if (focusShift === 'DIA') return dayValue || 'Sin dato'
  if (focusShift === 'NOCHE') return nightValue || 'Sin dato'
  const values = [dayValue, nightValue].filter(Boolean)
  return values.length ? [...new Set(values)].join(' / ') : 'Sin dato'
}

function selectedHourlyNumber(
  row: ShiftComparisonEquipmentHourlyPoint,
  focusShift: ShiftFocus,
  dayValue: number | null | undefined,
  nightValue: number | null | undefined,
): number | null {
  if (focusShift === 'DIA') return typeof dayValue === 'number' ? dayValue : null
  if (focusShift === 'NOCHE') return typeof nightValue === 'number' ? nightValue : null
  const values = [dayValue, nightValue].filter((value): value is number => typeof value === 'number')
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null
}

function selectedHourlySource(
  focusShift: ShiftFocus,
  dayValue: string | null | undefined,
  nightValue: string | null | undefined,
): string | null {
  if (focusShift === 'DIA') return dayValue || null
  if (focusShift === 'NOCHE') return nightValue || null
  const values = [dayValue, nightValue].filter(Boolean)
  return values.length ? [...new Set(values)].join(' / ') : null
}

function selectedHourlyMaintenanceCode(row: ShiftComparisonEquipmentHourlyPoint, focusShift: ShiftFocus): string | null {
  return selectedHourlySource(focusShift, row.dia_maintenance_code, row.noche_maintenance_code)
}

function selectedHourlyMaintenanceDesc(row: ShiftComparisonEquipmentHourlyPoint, focusShift: ShiftFocus): string | null {
  return selectedHourlySource(focusShift, row.dia_maintenance_desc, row.noche_maintenance_desc)
}

function selectedHourlyMaintenanceMinutes(row: ShiftComparisonEquipmentHourlyPoint, focusShift: ShiftFocus): number | null {
  return selectedHourlyNumber(row, focusShift, row.dia_maintenance_minutes, row.noche_maintenance_minutes)
}

function selectedHourlyStatuses(
  row: ShiftComparisonEquipmentHourlyPoint,
  focusShift: ShiftFocus,
): ShiftComparisonEquipmentStatusBreakdown[] {
  if (focusShift === 'DIA') return row.dia_status_breakdown ?? []
  if (focusShift === 'NOCHE') return row.noche_status_breakdown ?? []
  const merged = new Map<string, ShiftComparisonEquipmentStatusBreakdown>()
  for (const item of [...(row.dia_status_breakdown ?? []), ...(row.noche_status_breakdown ?? [])]) {
    const current = merged.get(item.code)
    if (!current) {
      merged.set(item.code, { ...item })
    } else {
      current.minutes += item.minutes
      current.occurrences = (current.occurrences ?? 0) + (item.occurrences ?? 0)
    }
  }
  return [...merged.values()].sort((a, b) => b.minutes - a.minutes)
}

function aggregateEquipmentStatuses(
  rows: ShiftComparisonEquipmentHourlyPoint[],
  focusShift: ShiftFocus,
): ShiftComparisonEquipmentStatusBreakdown[] {
  const merged = new Map<string, ShiftComparisonEquipmentStatusBreakdown>()
  for (const row of rows) {
    for (const item of selectedHourlyStatuses(row, focusShift)) {
      const current = merged.get(item.code)
      if (!current) {
        merged.set(item.code, { ...item, pct: undefined })
      } else {
        current.minutes += item.minutes
        current.occurrences = (current.occurrences ?? 0) + (item.occurrences ?? 0)
      }
    }
  }
  const total = [...merged.values()].reduce((sum, item) => sum + item.minutes, 0)
  return [...merged.values()]
    .map((item) => ({ ...item, minutes: Math.round(item.minutes * 10) / 10, pct: total > 0 ? Math.round((item.minutes / total) * 1000) / 10 : 0 }))
    .sort((a, b) => b.minutes - a.minutes)
}

const FUEL_STATUS_CODES = new Set(['O04', 'O11', 'O16', 'N30', 'N31'])
const FAILURE_STATUS_CODES = new Set(['M20', 'M30', 'M80', 'O10', 'O27', 'N97'])
const PRODUCTIVE_STATUS_CODES = new Set(['N01', 'N03', 'N04', 'N07', 'N09', 'N13', 'N74', 'N86', '80'])

type EquipmentStatusTone = 'fuel' | 'failure' | 'maintenance' | 'delay' | 'standby' | 'operation' | 'other'

function statusSearchText(status: ShiftComparisonEquipmentStatusBreakdown): string {
  return `${status.code} ${status.description} ${status.category}`.toLowerCase()
}

function equipmentStatusTone(status: ShiftComparisonEquipmentStatusBreakdown): EquipmentStatusTone {
  const code = status.code.toUpperCase()
  const text = statusSearchText(status)
  if (FUEL_STATUS_CODES.has(code) || text.includes('combustible') || text.includes('fuel')) return 'fuel'
  if (FAILURE_STATUS_CODES.has(code) || text.includes('averia') || text.includes('falla')) return 'failure'
  if (code.startsWith('M') || code === 'S03' || text.includes('mantencion') || text.includes('mantenimiento')) return 'maintenance'
  if (status.category === 'STANDBY' || code.startsWith('S')) return 'standby'
  if (
    status.category === 'OPERACIONAL'
    || text.includes('espera')
    || text.includes('cola')
    || text.includes('demora')
    || text.includes('detenido')
    || text.includes('traslado')
    || text.includes('tronadura')
    || text.includes('colacion')
    || text.includes('cambio de turno')
    || text.includes('charla')
    || text.includes('capacitacion')
    || text.includes('sin postura')
    || text.includes('chequeo')
    || text.includes('relevo')
  ) {
    return 'delay'
  }
  if (PRODUCTIVE_STATUS_CODES.has(code) || status.category === 'OPERACION') return 'operation'
  return 'other'
}

function equipmentStatusToneLabel(tone: EquipmentStatusTone, t: CockpitT): string {
  if (tone === 'fuel') return t.sc_tone_fuel
  if (tone === 'failure') return t.sc_tone_failure
  if (tone === 'maintenance') return t.sc_tone_maintenance
  if (tone === 'delay') return t.sc_tone_delay
  if (tone === 'standby') return t.sc_tone_standby
  if (tone === 'operation') return t.sc_tone_operation
  return t.sc_tone_other
}

function isLowProductionReason(status: ShiftComparisonEquipmentStatusBreakdown): boolean {
  const tone = equipmentStatusTone(status)
  return status.minutes > 0 && ['fuel', 'failure', 'maintenance', 'delay', 'standby'].includes(tone)
}

function equipmentStatusReasonRank(status: ShiftComparisonEquipmentStatusBreakdown): number {
  const tone = equipmentStatusTone(status)
  if (tone === 'failure') return 0
  if (tone === 'maintenance') return 1
  if (tone === 'fuel') return 2
  if (tone === 'delay') return 3
  if (tone === 'standby') return 4
  return 5
}

function equipmentStatusReasons(
  hourlyRows: ShiftComparisonEquipmentHourlyPoint[],
  equipmentId: string,
  focusShift: ShiftFocus,
): ShiftComparisonEquipmentStatusBreakdown[] {
  const equipmentRows = hourlyRows.filter((row) => row.equipment_id === equipmentId)
  return aggregateEquipmentStatuses(equipmentRows, focusShift)
    .filter(isLowProductionReason)
    .sort((a, b) => equipmentStatusReasonRank(a) - equipmentStatusReasonRank(b) || b.minutes - a.minutes)
}

function formatSourceLabel(source: string | null | undefined, t: CockpitT): string | null {
  if (!source) return null
  if (source === 'WENCO_N03') return 'N03 WENCO'
  if (source === 'WENCO_N04') return 'N04 WENCO'
  if (source === 'WENCO_N06') return 'N06 WENCO'
  if (source === 'WENCO_N13') return 'N13 WENCO'
  if (source === 'WENCO_N14') return 'N14 WENCO'
  if (source === 'WENCO_N04_N03') return 'N04 + N03'
  if (source === 'WENCO_N04_N03_N06') return 'N04 + N03 + N06'
  if (source === 'WENCO_N04_N03_TO_N13') return 'N04 + N03 -> N13'
  if (source === 'WENCO_N04_N03_N06_TO_N13') return 'N04 + N03 + N06 -> N13'
  if (source === 'CYCLE_EXPLICIT') return t.sc_dato_ciclo
  return source
}

function formatMetric(value: number | null | undefined, suffix: string, t: CockpitT, digits = 1): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return t.sc_metric_sin_dato
  return `${formatNumber(value, digits)} ${suffix}`
}

function metricBarWidth(value: number | null | undefined, max: number, minimum = 6): string {
  if (typeof value !== 'number' || Number.isNaN(value) || max <= 0) return '0%'
  return `${Math.max(minimum, Math.min(100, (value / max) * 100))}%`
}

function hasMetricValue(value: number | null | undefined): value is number {
  return typeof value === 'number' && !Number.isNaN(value)
}

function hourlyRecommendation(
  row: ShiftComparisonEquipmentHourlyPoint,
  focusShift: ShiftFocus,
  peakSlot: number | null,
  t: CockpitT,
  type: 'loader' | 'truck' = 'loader',
): string {
  const tonnes = selectedHourlyTonnes(row, focusShift)
  const cycles = selectedHourlyCycles(row, focusShift)
  const maintenanceCode = selectedHourlyMaintenanceCode(row, focusShift)
  const maintenanceDesc = selectedHourlyMaintenanceDesc(row, focusShift)
  const maintenanceMinutes = selectedHourlyMaintenanceMinutes(row, focusShift)
  const wait = selectedHourlyNumber(row, focusShift, row.dia_caex_wait_time_min, row.noche_caex_wait_time_min)
  const loading = selectedHourlyNumber(row, focusShift, row.dia_loading_time_min, row.noche_loading_time_min)
  const transport = selectedHourlyNumber(row, focusShift, row.dia_transport_time_min, row.noche_transport_time_min)
  const emptyReturn = selectedHourlyNumber(row, focusShift, row.dia_empty_return_time_min, row.noche_empty_return_time_min)
  const travelCycle = selectedHourlyNumber(row, focusShift, row.dia_travel_cycle_time_min, row.noche_travel_cycle_time_min)
  const shovelWait = selectedHourlyNumber(row, focusShift, row.dia_shovel_wait_time_min, row.noche_shovel_wait_time_min)
  const caexCycle = selectedHourlyNumber(row, focusShift, row.dia_caex_cycle_time_min, row.noche_caex_cycle_time_min)
  if (maintenanceCode && typeof maintenanceMinutes === 'number' && maintenanceMinutes > 0) {
    return t.sc_rec_maintenance(maintenanceCode, maintenanceDesc || '')
  }
  if (tonnes <= 0 || cycles <= 0) return t.sc_rec_sin_actividad
  if (peakSlot === row.slot) return t.sc_rec_mejor_hora
  if (type === 'truck') {
    if (typeof caexCycle === 'number' && caexCycle >= 35) return t.sc_rec_ciclo_caex_alto
    if (typeof shovelWait === 'number' && shovelWait >= 8) return t.sc_rec_reducir_espera_n06
    if (typeof travelCycle === 'number' && travelCycle >= 30) return t.sc_rec_ruta_alta
    if (typeof transport === 'number' && transport >= 20) return t.sc_rec_revisar_transporte
    if (typeof emptyReturn === 'number' && emptyReturn >= 15) return t.sc_rec_revisar_retorno
    return t.sc_rec_mantener_ciclo
  }
  if (typeof wait === 'number' && wait >= 8) return t.sc_rec_revisar_espera_n14
  if (typeof loading === 'number' && loading >= 7) return t.sc_rec_revisar_carguio_n13
  if (cycles <= 3) return t.sc_rec_mejorar_continuidad
  return t.sc_rec_mantener_ritmo
}

function averageHourlyValue(values: Array<number | null>): number | null {
  const valid = values.filter((value): value is number => typeof value === 'number' && !Number.isNaN(value))
  if (!valid.length) return null
  return valid.reduce((sum, value) => sum + value, 0) / valid.length
}

function operatorForShift(item: ShiftComparisonEquipmentPoint, shift: 'DIA' | 'NOCHE'): string {
  return shift === 'DIA'
    ? item.dia_operator ?? item.operator ?? 'Sin dato'
    : item.noche_operator ?? item.operator ?? 'Sin dato'
}

function equipmentOperatorPerformance(
  item: ShiftComparisonEquipmentPoint,
  rows: ShiftComparisonEquipmentHourlyPoint[],
  shift: 'DIA' | 'NOCHE',
) {
  const tonnes = shift === 'DIA' ? item.dia_tonnes : item.noche_tonnes
  const cycles = shift === 'DIA' ? item.dia_cycles : item.noche_cycles
  const activeHours = rows.filter((row) => (
    shift === 'DIA'
      ? row.dia_tonnes > 0 || row.dia_cycles > 0
      : row.noche_tonnes > 0 || row.noche_cycles > 0
  )).length
  return {
    shift,
    operator: operatorForShift(item, shift),
    tonnes,
    cycles,
    activeHours,
    tph: activeHours > 0 ? tonnes / activeHours : null,
    tonnesPerCycle: cycles > 0 ? tonnes / cycles : null,
  }
}

function performanceTone(dayValue: number, nightValue: number, shift: 'DIA' | 'NOCHE'): 'is-day-leading' | 'is-night-leading' | 'is-even' {
  if (dayValue === nightValue) return 'is-even'
  const dayWins = dayValue > nightValue
  if ((shift === 'DIA' && dayWins) || (shift === 'NOCHE' && !dayWins)) {
    return shift === 'DIA' ? 'is-day-leading' : 'is-night-leading'
  }
  return shift === 'DIA' ? 'is-night-leading' : 'is-day-leading'
}

function formatContextDate(value: string | null | undefined, t: CockpitT): string {
  if (!value) return t.sc_sin_fecha
  const [year, month, day] = value.slice(0, 10).split('-')
  if (!year || !month || !day) return value
  return `${day}-${month}-${year}`
}

function formatContextDateTime(value: string | null | undefined, t: CockpitT): string {
  if (!value) return t.sc_sin_periodo
  const [datePart, timePart = ''] = value.split('T')
  const time = timePart.slice(0, 5)
  return `${formatContextDate(datePart, t)}${time ? ` ${time}` : ''}`
}

function EquipmentVisual({ item, type }: { item: ShiftComparisonEquipmentPoint; type: 'loader' | 'truck' }) {
  const image = getEquipmentImage(item.id, item.model)
  const label = getEquipmentLabel(item.id, item.model)
  return (
    <span className={`nmcp-equipment-visual is-${type}`}>
      <img src={image} alt={label} loading="lazy" />
    </span>
  )
}

function OperatorPerformanceComparison({
  day,
  night,
}: {
  day: ReturnType<typeof equipmentOperatorPerformance>
  night: ReturnType<typeof equipmentOperatorPerformance>
}) {
  const t = useModuleT(cockpitT)
  const deltaTonnes = night.tonnes - day.tonnes
  const deltaTph = (night.tph ?? 0) - (day.tph ?? 0)
  return (
    <section className="nmcp-operator-compare-card" aria-label={t.sc_rendimiento_operadores}>
      <div className="nmcp-operator-compare-head">
        <div>
          <span className="nmcp-section-kicker">{t.sc_rendimiento_operadores}</span>
          <h3>{t.sc_turno_dia_vs_noche}</h3>
        </div>
        <strong className={deltaTonnes >= 0 ? 'is-night-leading' : 'is-day-leading'}>
          {deltaTonnes >= 0 ? '+' : ''}{formatTons(deltaTonnes)}
        </strong>
      </div>
      <div className="nmcp-operator-compare-grid">
        {[day, night].map((item) => (
          <article key={item.shift} className={item.shift === 'DIA' ? 'is-day' : 'is-night'}>
            <span>{item.shift === 'DIA' ? t.sc_dia_short : t.sc_noche_short}</span>
            <strong>{item.operator}</strong>
            <div>
              <small>{t.sc_tonelaje}</small>
              <b>{formatTons(item.tonnes)}</b>
            </div>
            <div>
              <small>{t.sc_rendimiento}</small>
              <b>{item.tph === null ? t.common_sin_dato : `${formatNumber(item.tph, 1)} t/h`}</b>
            </div>
            <div>
              <small>{t.sc_ciclos_t_ciclo}</small>
              <b>{formatNumber(item.cycles)} / {item.tonnesPerCycle === null ? t.common_sin_dato : formatNumber(item.tonnesPerCycle, 1)}</b>
            </div>
            <em>{t.sc_horas_actividad(item.activeHours)}</em>
          </article>
        ))}
        <article className={`is-delta ${performanceTone(day.tph ?? 0, night.tph ?? 0, deltaTph >= 0 ? 'NOCHE' : 'DIA')}`}>
          <span>{t.sc_diferencia_rendimiento}</span>
          <strong>{deltaTph >= 0 ? '+' : ''}{formatNumber(deltaTph, 1)} t/h</strong>
          <small>
            {t.sc_filtro_ambos_note(deltaTonnes >= 0 ? t.sc_noche_supera : t.sc_dia_supera)}
          </small>
        </article>
      </div>
    </section>
  )
}

function HourlyTooltip({ active, payload, focusShift = 'AMBOS' }: any) {
  const t = useModuleT(cockpitT)
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload as VisualHourlyPoint
  if (!row) return null
  const tone = focusShift === 'DIA' ? 'is-day' : focusShift === 'NOCHE' ? 'is-night' : 'is-mixed'
  const deltaTone = row.difference_tonnes >= 0 ? 'is-day' : 'is-night'
  return (
    <div className={`nmcp-chart-tooltip ${tone}`}>
      <div className="nmcp-tooltip-head">
        <span>{focusLabel(focusShift, t)}</span>
        <strong>{row.label}</strong>
      </div>
      <div className="nmcp-tooltip-series">
        {focusShift !== 'NOCHE' && (
          <span className="nmcp-tooltip-row is-day">
            <i aria-hidden="true" />
            <small>{t.sc_dia_hora(row.dia_hour)}</small>
            <b>{row.dia_pending ? t.sc_pendiente : formatTons(row.dia_tonnes)}</b>
            <em>{row.dia_pending ? t.sc_hora_futura : t.sc_ciclos_n(formatNumber(row.dia_cycles))}</em>
          </span>
        )}
        {focusShift !== 'DIA' && (
          <span className="nmcp-tooltip-row is-night">
            <i aria-hidden="true" />
            <small>{t.sc_noche_hora(row.noche_hour)}</small>
            <b>{row.noche_pending ? t.sc_pendiente : formatTons(row.noche_tonnes)}</b>
            <em>{row.noche_pending ? t.sc_hora_futura : t.sc_ciclos_n(formatNumber(row.noche_cycles))}</em>
          </span>
        )}
      </div>
      {focusShift === 'AMBOS' && (
        <div className={`nmcp-tooltip-delta ${deltaTone}`}>
          <small>{t.sc_diferencia_label}</small>
          <strong>{formatTons(row.difference_tonnes)}</strong>
        </div>
      )}
      <div className="nmcp-tooltip-series">
        <span className="nmcp-tooltip-row is-total">
          <i aria-hidden="true" />
          <small>{t.sc_total_hora}</small>
          <b>{formatTons(row.hourly_total_tonnes)}</b>
          <em>{focusShift === 'AMBOS' ? t.sc_dia_noche_disponible : focusLabel(focusShift, t)}</em>
        </span>
        {typeof row.shift_projected_final_tonnes === 'number' && (
          <span className="nmcp-tooltip-row is-projected">
            <i aria-hidden="true" />
            <small>{t.sc_proyectado}</small>
            <b>{formatTons(row.shift_projected_final_tonnes)}</b>
            <em>{t.sc_linea_verde_proyectada}</em>
          </span>
        )}
      </div>
    </div>
  )
}

function EquipmentDetailTooltip({ active, payload, label, focusShift = 'AMBOS' }: any) {
  const t = useModuleT(cockpitT)
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload as EquipmentVisualHourlyPoint
  if (!row) return null
  const tone = focusShift === 'DIA' ? 'is-day' : focusShift === 'NOCHE' ? 'is-night' : 'is-mixed'
  const deltaTone = row.difference_tonnes >= 0 ? 'is-day' : 'is-night'
  return (
    <div className={`nmcp-chart-tooltip ${tone}`}>
      <div className="nmcp-tooltip-head">
        <span>{focusLabel(focusShift, t)}</span>
        <strong>{label}</strong>
      </div>
      <div className="nmcp-tooltip-series">
        {focusShift !== 'NOCHE' && (
          <span className="nmcp-tooltip-row is-day">
            <i aria-hidden="true" />
            <small>{t.sc_dia_hora(row.dia_hour)}</small>
            <b>{formatTons(row.dia_tonnes)}</b>
            <em>{formatNumber(row.dia_tonnes, 1)} t/h / {t.sc_ciclos_n(formatNumber(row.dia_cycles))}</em>
            <em>{row.dia_operator ?? t.sc_sin_operador}</em>
          </span>
        )}
        {focusShift !== 'DIA' && (
          <span className="nmcp-tooltip-row is-night">
            <i aria-hidden="true" />
            <small>{t.sc_noche_hora(row.noche_hour)}</small>
            <b>{formatTons(row.noche_tonnes)}</b>
            <em>{formatNumber(row.noche_tonnes, 1)} t/h / {t.sc_ciclos_n(formatNumber(row.noche_cycles))}</em>
            <em>{row.noche_operator ?? t.sc_sin_operador}</em>
          </span>
        )}
      </div>
      {focusShift === 'AMBOS' && (
        <div className={`nmcp-tooltip-delta ${deltaTone}`}>
          <small>{t.sc_diferencia_label}</small>
          <strong>{formatTons(row.difference_tonnes)}</strong>
        </div>
      )}
      <div className="nmcp-tooltip-series">
        <span className="nmcp-tooltip-row is-total">
          <i aria-hidden="true" />
          <small>{t.sc_ton_h_label}</small>
          <b>{formatTons(row.hourly_total_tonnes)}</b>
          <em>{t.sc_linea_amarilla}</em>
        </span>
      </div>
    </div>
  )
}

function SummaryCard({
  label,
  value,
  detail,
  tone,
  focused = false,
  dimmed = false,
  live = false,
}: {
  label: string
  value: string
  detail: string
  tone: 'day' | 'night' | 'diff'
  focused?: boolean
  dimmed?: boolean
  live?: boolean
}) {
  const t = useModuleT(cockpitT)
  return (
    <article className={`nmcp-shift-summary-card is-${tone} ${focused ? 'is-focused' : ''} ${dimmed ? 'is-dimmed' : ''}`}>
      <span>
        {label}
        {live && <em className="nmcp-live-badge"><i aria-hidden="true" /> {t.sc_en_curso_badge}</em>}
      </span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  )
}

function EquipmentRow({
  item,
  type,
  maxTotal,
  focusShift,
  hourlyRows,
  onOpenDetail,
}: {
  item: ShiftComparisonEquipmentPoint
  type: 'loader' | 'truck'
  maxTotal: number
  focusShift: ShiftFocus
  hourlyRows: ShiftComparisonEquipmentHourlyPoint[]
  onOpenDetail?: (item: ShiftComparisonEquipmentPoint, anchor: DetailModalAnchor) => void
}) {
  const t = useModuleT(cockpitT)
  const displayTonnes = selectedTonnes(item, focusShift)
  const displayCycles = selectedCycles(item, focusShift)
  const displayOperator = selectedOperator(item, focusShift)
  const displayDestination = selectedDestination(item, focusShift)
  const displayBench = selectedBench(item, focusShift)
  const displayLoadingUnit = selectedMainLoadingUnit(item, focusShift)
  const displayEfficiency = displayTonnes / Math.max(maxTotal, 1) * 100
  const displayShare = displayTonnes / Math.max(maxTotal, 1) * 100
  const dayPct = Math.max(2, Math.min(100, item.dia_tonnes / Math.max(maxTotal, 1) * 100))
  const nightPct = Math.max(2, Math.min(100, item.noche_tonnes / Math.max(maxTotal, 1) * 100))
  const selectedPct = Math.max(2, Math.min(100, displayTonnes / Math.max(maxTotal, 1) * 100))
  const diffPct = Math.abs(item.difference_tonnes) / Math.max(Math.max(item.dia_tonnes, item.noche_tonnes), 1) * 100
  const primaryMetric = type === 'loader'
    ? t.sc_caex_asignados(formatNumber(selectedAssignedCaex(item, focusShift) ?? 0))
    : t.sc_uc_atendidas(formatNumber(selectedLoadingUnits(item, focusShift) ?? 0))
  const circuitMetric = type === 'loader'
    ? t.sc_prom_circuito(formatNumber(selectedAvgCaex(item, focusShift) ?? 0, 1))
    : t.sc_ciclos_n(formatNumber(displayCycles))
  const statusReasons = equipmentStatusReasons(hourlyRows, item.id, focusShift)
  const visibleStatusReasons = statusReasons.slice(0, 3)
  const extraStatusReasons = Math.max(statusReasons.length - visibleStatusReasons.length, 0)
  const statusLabel = item.status_code
    ? `${item.status_code} ${item.status_desc ?? ''}`.trim()
    : null
  const openDetail = (element: HTMLElement) => {
    onOpenDetail?.(item, getDetailModalAnchor(element))
  }

  return (
    <article
      className={`nmcp-shift-equipment-row ${diffClass(item.difference_tonnes)}`}
      role="button"
      tabIndex={0}
      onClick={(event) => openDetail(event.currentTarget)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          openDetail(event.currentTarget)
        }
      }}
      aria-label={t.sc_detalle_comparativo_aria(item.id)}
    >
      <EquipmentVisual item={item} type={type} />
      <div className="nmcp-shift-equipment-main">
        <div className="nmcp-shift-equipment-title">
          <div>
            <span>{type === 'loader' ? t.sc_unidad_carguio : t.sc_equipo_caex}</span>
            <strong>{item.id}</strong>
          </div>
          <span>{item.model}</span>
          <em>{leaderLabel(item.leader, t)}</em>
        </div>
        <div className="nmcp-shift-equipment-hero">
          <div>
            <span>{focusShift === 'AMBOS' ? t.sc_total_visible : focusLabel(focusShift, t)}</span>
            <strong>{formatTons(displayTonnes)}</strong>
            <small>{t.sc_pct_lider(formatNumber(displayShare, 1))}</small>
          </div>
          <div>
            <span>{type === 'loader' ? t.sc_acarreo : t.sc_produccion}</span>
            <strong>{primaryMetric}</strong>
            <small>{circuitMetric}</small>
          </div>
          <div>
            <span>{t.sc_eficiencia}</span>
            <strong>{formatNumber(displayEfficiency, 1)}%</strong>
            <small>{t.sc_ciclos_n(formatNumber(displayCycles))}</small>
          </div>
        </div>
        <div className="nmcp-shift-equipment-operator">
          <span>{t.sc_operador}</span>
          <strong>{displayOperator}</strong>
        </div>
        {visibleStatusReasons.length > 0 && (
          <div className="nmcp-shift-status-reasons" aria-label={t.sc_status_reasons_aria(item.id)}>
            {visibleStatusReasons.map((status) => {
              const tone = equipmentStatusTone(status)
              return (
                <span key={status.code} className={`is-${tone}`}>
                  <b>{equipmentStatusToneLabel(tone, t)}</b>
                  <em>{status.code} {status.description}</em>
                  <strong>{formatMetric(status.minutes, 'min', t)}</strong>
                </span>
              )
            })}
            {extraStatusReasons > 0 && <small>{t.sc_mas_estados(extraStatusReasons)}</small>}
          </div>
        )}
        {!visibleStatusReasons.length && statusLabel && displayTonnes <= 0 && (
          <div className="nmcp-shift-status-reasons" aria-label={t.sc_status_actual_aria(item.id)}>
            <span className="is-neutral">
              <b>{t.sc_estado_wenco_label}</b>
              <em>{statusLabel}</em>
              <strong>{item.status_category ?? t.sc_sin_categoria}</strong>
            </span>
          </div>
        )}
        <div className="nmcp-shift-equipment-bars" aria-label={t.sc_comparacion_aria(item.id)}>
          {focusShift !== 'NOCHE' && <span className="is-day" style={{ width: `${focusShift === 'DIA' ? selectedPct : dayPct}%` }} />}
          {focusShift !== 'DIA' && <span className="is-night" style={{ width: `${focusShift === 'NOCHE' ? selectedPct : nightPct}%` }} />}
        </div>
        <div className="nmcp-shift-equipment-values">
          {focusShift !== 'NOCHE' && <span>{t.sc_dia_tons(formatTons(item.dia_tonnes))}</span>}
          {focusShift !== 'DIA' && <span>{t.sc_noche_tons(formatTons(item.noche_tonnes))}</span>}
          {focusShift === 'AMBOS' && <b>{formatTons(item.difference_tonnes)} ({formatNumber(diffPct, 1)}%)</b>}
        </div>
        <div className="nmcp-shift-equipment-destination">
          <span>
            {type === 'truck' ? t.sc_origen_uc : t.sc_banco_malla}{' '}
            <b>
              {displayBench.label ?? t.common_sin_dato}
              {type === 'truck' && t.sc_uc_label(displayLoadingUnit.label ?? t.common_sin_dato)}
            </b>
            {type === 'truck' && displayLoadingUnit.pct ? ` ${formatNumber(displayLoadingUnit.pct, 1)}%` : ''}
          </span>
          <span>{t.sc_destino} <b>{displayDestination.label ?? t.common_sin_dato}</b> {formatNumber(displayDestination.pct ?? 0, 1)}%</span>
          <em className="nmcp-shift-detail-cta" aria-hidden="true">{t.sc_ver_detalle}</em>
        </div>
      </div>
    </article>
  )
}

function EquipmentList({
  title,
  type,
  rows,
  focusShift,
  hourlyRows = [],
  onOpenDetail,
}: {
  title: string
  type: 'loader' | 'truck'
  rows: ShiftComparisonEquipmentPoint[]
  focusShift: ShiftFocus
  hourlyRows?: ShiftComparisonEquipmentHourlyPoint[]
  onOpenDetail?: (item: ShiftComparisonEquipmentPoint, anchor: DetailModalAnchor) => void
}) {
  const t = useModuleT(cockpitT)
  const visibleRows = rows
    .filter((item) => type === 'truck' || focusShift === 'AMBOS' || selectedTonnes(item, focusShift) > 0 || selectedCycles(item, focusShift) > 0)
    .sort((a, b) => selectedTonnes(b, focusShift) - selectedTonnes(a, focusShift))
  const maxTotal = Math.max(...visibleRows.map((item) => selectedTonnes(item, focusShift)), 1)
  const totalTonnes = visibleRows.reduce((sum, item) => sum + selectedTonnes(item, focusShift), 0)
  const topTwoTonnes = visibleRows.slice(0, 2).reduce((sum, item) => sum + selectedTonnes(item, focusShift), 0)
  const topTwoPct = totalTonnes > 0 ? topTwoTonnes / totalTonnes * 100 : 0
  const topEquipment = visibleRows[0] ?? null
  const lowContributor = type === 'loader'
    ? visibleRows.find((item) => selectedTonnes(item, focusShift) > 0 && selectedTonnes(item, focusShift) / Math.max(totalTonnes, 1) < 0.08)
    : null
  return (
    <section className="nmcp-shift-equipment-panel">
      <div className="nmcp-shift-equipment-header">
        <div>
          <span>{title}</span>
          <strong>{formatTons(totalTonnes)}</strong>
        </div>
        <em>{t.sc_equipos_focus_summary(visibleRows.length, focusLabel(focusShift, t))}</em>
      </div>
      <div className="nmcp-shift-equipment-overview">
        <span>
          <small>{t.sc_total_visible}</small>
          <strong>{formatTons(totalTonnes)}</strong>
        </span>
        <span>
          <small>{type === 'loader' ? t.sc_top2 : t.sc_top_equipo}</small>
          <strong>{type === 'loader' ? `${formatNumber(topTwoPct, 1)}%` : topEquipment?.id ?? t.common_sin_dato}</strong>
        </span>
        <span>
          <small>{t.sc_filtro}</small>
          <strong>{focusLabel(focusShift, t)}</strong>
        </span>
      </div>
      {type === 'loader' && visibleRows.length > 1 && (
        <div className="nmcp-shift-pareto-note">
          <span>{t.sc_concentracion_uc}</span>
          <strong>{t.sc_top2_pct(formatNumber(topTwoPct, 1))}</strong>
          <small>
            {lowContributor
              ? t.sc_bajo_aporte(lowContributor.id, formatTons(selectedTonnes(lowContributor, focusShift)))
              : t.sc_sin_uc_bajo}
          </small>
        </div>
      )}
      {type === 'truck' && (
        <div className="nmcp-shift-pareto-note is-neutral">
          <span>{t.sc_lectura_caex}</span>
          <strong>{t.sc_equipos_dataset(visibleRows.length)}</strong>
          <small>{t.sc_incluye_caex}</small>
        </div>
      )}
      <div className="nmcp-shift-equipment-list">
        {visibleRows.map((item) => (
          <EquipmentRow
            key={item.id}
            item={item}
            type={type}
            maxTotal={maxTotal}
            focusShift={focusShift}
            hourlyRows={hourlyRows}
            onOpenDetail={onOpenDetail}
          />
        ))}
        {!visibleRows.length && <div className="nmcp-shift-empty">{t.sc_sin_equipos_para(focusLabel(focusShift, t))}</div>}
      </div>
    </section>
  )
}

function EquipmentComparisonDetailModal({
  item,
  rows,
  type,
  anchor,
  focusShift,
  onClose,
}: {
  item: ShiftComparisonEquipmentPoint | null
  rows: ShiftComparisonEquipmentHourlyPoint[]
  type: 'loader' | 'truck'
  anchor?: DetailModalAnchor | null
  focusShift: ShiftFocus
  onClose: () => void
}) {
  const t = useModuleT(cockpitT)
  useChartPaletteKey()

  if (!item) return null

  const equipmentRows = rows.filter((row) => row.equipment_id === item.id)
  const equipmentVisualRows = buildEquipmentVisualHourlyRows(equipmentRows, focusShift)
  const dayPerformance = equipmentOperatorPerformance(item, equipmentRows, 'DIA')
  const nightPerformance = equipmentOperatorPerformance(item, equipmentRows, 'NOCHE')
  const displayOperator = focusShift === 'AMBOS'
    ? t.sc_operador_dia_noche(dayPerformance.operator, nightPerformance.operator)
    : selectedOperator(item, focusShift)
  const displayTonnes = selectedTonnes(item, focusShift)
  const displayCycles = selectedCycles(item, focusShift)
  const activeHourlyRows = equipmentRows.filter((row) => {
    if (focusShift === 'DIA') return row.dia_tonnes > 0 || row.dia_cycles > 0
    if (focusShift === 'NOCHE') return row.noche_tonnes > 0 || row.noche_cycles > 0
    return row.dia_tonnes > 0 || row.noche_tonnes > 0 || row.dia_cycles > 0 || row.noche_cycles > 0
  }).length
  const avgLoadingTph = type === 'loader' && activeHourlyRows > 0 ? displayTonnes / activeHourlyRows : null
  const image = getEquipmentImage(item.id, item.model)
  const label = getEquipmentLabel(item.id, item.model)
  const isPala1 = type === 'loader' && item.id.replace(/\s/g, '').toUpperCase() === 'PALA1'
  const displayModel = isPala1 ? 'P&H 4100XPC AC' : item.model
  const peak = equipmentRows.reduce<ShiftComparisonEquipmentHourlyPoint | null>(
    (best, row) => (!best || selectedHourlyTonnes(row, focusShift) > selectedHourlyTonnes(best, focusShift) ? row : best),
    null,
  )
  const peakSlot = peak?.slot ?? null
  const avgTransportN04 = type === 'truck'
    ? averageHourlyValue(equipmentRows.map((row) => selectedHourlyNumber(row, focusShift, row.dia_transport_time_min, row.noche_transport_time_min)))
    : null
  const avgLoadedDistance = averageHourlyValue(
    equipmentRows.map((row) => selectedHourlyNumber(row, focusShift, row.dia_loaded_distance_km, row.noche_loaded_distance_km)),
  )
  const avgEmptyReturnN03 = type === 'truck'
    ? averageHourlyValue(equipmentRows.map((row) => selectedHourlyNumber(row, focusShift, row.dia_empty_return_time_min, row.noche_empty_return_time_min)))
    : null
  const avgTravelCycle = type === 'truck'
    ? averageHourlyValue(equipmentRows.map((row) => selectedHourlyNumber(row, focusShift, row.dia_travel_cycle_time_min, row.noche_travel_cycle_time_min)))
    : null
  const avgShovelWaitN06 = type === 'truck'
    ? averageHourlyValue(equipmentRows.map((row) => selectedHourlyNumber(row, focusShift, row.dia_shovel_wait_time_min, row.noche_shovel_wait_time_min)))
    : null
  const avgCaexCycle = type === 'truck'
    ? averageHourlyValue(equipmentRows.map((row) => selectedHourlyNumber(row, focusShift, row.dia_caex_cycle_time_min, row.noche_caex_cycle_time_min)))
    : null
  const equipmentStatuses = aggregateEquipmentStatuses(equipmentRows, focusShift)
  const detailAnimationId = `${type}-${item.id}-${focusShift}`
  const operationalRows = equipmentRows.map((row) => {
    const hourLabel = focusShift === 'DIA' ? row.dia_hour : focusShift === 'NOCHE' ? row.noche_hour : `${row.dia_hour} / ${row.noche_hour}`
    const origin = selectedHourlyString(focusShift, row.dia_origin, row.noche_origin)
    const destination = selectedHourlyString(focusShift, row.dia_destination, row.noche_destination)
    const tonnes = selectedHourlyTonnes(row, focusShift)
    const cycles = selectedHourlyCycles(row, focusShift)
    const loadedDistance = selectedHourlyNumber(row, focusShift, row.dia_loaded_distance_km, row.noche_loaded_distance_km)
    const loading = selectedHourlyNumber(row, focusShift, row.dia_loading_time_min, row.noche_loading_time_min)
    const cycle = selectedHourlyNumber(row, focusShift, row.dia_cycle_time_min, row.noche_cycle_time_min)
    const wait = selectedHourlyNumber(row, focusShift, row.dia_caex_wait_time_min, row.noche_caex_wait_time_min)
    const transport = selectedHourlyNumber(row, focusShift, row.dia_transport_time_min, row.noche_transport_time_min)
    const emptyReturn = selectedHourlyNumber(row, focusShift, row.dia_empty_return_time_min, row.noche_empty_return_time_min)
    const travelCycle = selectedHourlyNumber(row, focusShift, row.dia_travel_cycle_time_min, row.noche_travel_cycle_time_min)
    const shovelWait = selectedHourlyNumber(row, focusShift, row.dia_shovel_wait_time_min, row.noche_shovel_wait_time_min)
    const caexCycle = selectedHourlyNumber(row, focusShift, row.dia_caex_cycle_time_min, row.noche_caex_cycle_time_min)
    const loadingSource = formatSourceLabel(selectedHourlySource(focusShift, row.dia_loading_time_source, row.noche_loading_time_source), t)
    const waitSource = formatSourceLabel(selectedHourlySource(focusShift, row.dia_caex_wait_time_source, row.noche_caex_wait_time_source), t)
    const transportSource = formatSourceLabel(selectedHourlySource(focusShift, row.dia_transport_time_source, row.noche_transport_time_source), t)
    const emptyReturnSource = formatSourceLabel(selectedHourlySource(focusShift, row.dia_empty_return_time_source, row.noche_empty_return_time_source), t)
    const travelCycleSource = formatSourceLabel(selectedHourlySource(focusShift, row.dia_travel_cycle_time_source, row.noche_travel_cycle_time_source), t)
    const shovelWaitSource = formatSourceLabel(selectedHourlySource(focusShift, row.dia_shovel_wait_time_source, row.noche_shovel_wait_time_source), t)
    const caexCycleSource = formatSourceLabel(selectedHourlySource(focusShift, row.dia_caex_cycle_time_source, row.noche_caex_cycle_time_source), t)
    const maintenanceCode = selectedHourlyMaintenanceCode(row, focusShift)
    const maintenanceDesc = selectedHourlyMaintenanceDesc(row, focusShift)
    const maintenanceMinutes = selectedHourlyMaintenanceMinutes(row, focusShift)
    const statusBreakdown = selectedHourlyStatuses(row, focusShift)
    const recommendation = hourlyRecommendation(row, focusShift, peakSlot, t, type)
    const recommendationClass = maintenanceCode && maintenanceMinutes ? 'is-maintenance' : peakSlot === row.slot ? 'is-best' : ''
    const cycleMetric = type === 'truck' ? caexCycle ?? travelCycle : cycle
    return {
      row,
      hourLabel,
      origin,
      destination,
      tonnes,
      cycles,
      loadedDistance,
      loading,
      cycle,
      wait,
      transport,
      emptyReturn,
      travelCycle,
      shovelWait,
      caexCycle,
      loadingSource,
      waitSource,
      transportSource,
      emptyReturnSource,
      travelCycleSource,
      shovelWaitSource,
      caexCycleSource,
      maintenanceCode,
      maintenanceDesc,
      maintenanceMinutes,
      statusBreakdown,
      recommendation,
      recommendationClass,
      cycleMetric,
      isPeak: peakSlot === row.slot,
    }
  })
  const maxOperationalTonnes = Math.max(...operationalRows.map((row) => row.tonnes), 1)
  const maxOperationalDistance = Math.max(...operationalRows.map((row) => row.loadedDistance ?? 0), 1)
  const maxOperationalCycle = Math.max(...operationalRows.map((row) => row.cycleMetric ?? 0), 1)
  const activeOperationalRows = operationalRows.filter((row) => row.tonnes > 0 || row.cycles > 0)
  const lowProductionRow = activeOperationalRows.length
    ? activeOperationalRows.reduce((low, row) => row.tonnes < low.tonnes ? row : low, activeOperationalRows[0])
    : null
  const detailAverageCycle = averageHourlyValue(operationalRows.map((row) => row.cycleMetric))
  const detailAverageDistance = averageHourlyValue(operationalRows.map((row) => row.loadedDistance))

  return (
    <FloatingWindow
      open
      onClose={onClose}
      placement={anchor ? { mode: 'anchor', anchor } : { mode: 'center' }}
      ariaLabel={t.sc_detalle_comparativo_aria(item.id)}
      panelClassName="nmcp-detail-modal"
    >
        <header className="nmcp-detail-header">
          <div className="nmcp-shift-detail-title">
            <span className={`nmcp-equipment-visual is-${type}${isPala1 ? ' is-pala-1' : ''}`}>
              <img src={image} alt={label} loading="lazy" />
            </span>
            <div>
              <span className="nmcp-section-kicker">{type === 'loader' ? t.sc_detalle_uc : t.sc_detalle_caex}</span>
              <h2>{item.id}</h2>
              <p>{displayModel} - {focusLabel(focusShift, t)}</p>
              <p>{t.loading_modal_operador(displayOperator)}</p>
            </div>
          </div>
          <button className="nmcp-icon-button" type="button" onClick={onClose} aria-label={t.sc_close_aria}>
            <X size={17} />
          </button>
        </header>

        <div className="nmcp-detail-kpis">
          {focusShift !== 'NOCHE' && <span><small>{t.sc_dia_kv}</small><strong>{formatTons(item.dia_tonnes)}</strong></span>}
          {focusShift !== 'DIA' && <span><small>{t.sc_noche_kv}</small><strong>{formatTons(item.noche_tonnes)}</strong></span>}
          {focusShift === 'AMBOS' && <span><small>{t.sc_diferencia_label}</small><strong>{formatTons(item.difference_tonnes)}</strong></span>}
          <span><small>{t.sc_ciclos_kv}</small><strong>{formatNumber(displayCycles)}</strong></span>
          {type === 'loader' && <span><small>{t.sc_rend_carguio_kv}</small><strong>{avgLoadingTph === null ? t.common_sin_dato : `${formatNumber(avgLoadingTph, 1)} t/h`}</strong></span>}
          {isPala1 && <span><small>Meta P&H 4100</small><strong>5.000 t/h</strong></span>}
          <span><small>{t.sc_dist_od}</small><strong>{formatMetric(avgLoadedDistance, 'km', t)}</strong></span>
          {type === 'truck' && <span><small>{t.sc_transp_n04}</small><strong>{formatMetric(avgTransportN04, 'min', t)}</strong></span>}
          {type === 'truck' && <span><small>{t.sc_retorno_n03}</small><strong>{formatMetric(avgEmptyReturnN03, 'min', t)}</strong></span>}
          {type === 'truck' && <span><small>{t.sc_espera_n06}</small><strong>{formatMetric(avgShovelWaitN06, 'min', t)}</strong></span>}
          {type === 'truck' && <span><small>{t.sc_ciclo_caex}</small><strong>{formatMetric(avgCaexCycle ?? avgTravelCycle, 'min', t)}</strong></span>}
          <span><small>{t.sc_mejor_hora_label}</small><strong>{peak ? t.sc_mejor_hora_kv(peak.label, formatTons(selectedHourlyTonnes(peak, focusShift))) : t.common_sin_dato}</strong></span>
        </div>

        {focusShift === 'AMBOS' && (
          <OperatorPerformanceComparison day={dayPerformance} night={nightPerformance} />
        )}

        <section className="nmcp-detail-chart-card is-compact">
          <div className="nmcp-panel-header">
            <div>
              <span className="nmcp-section-kicker">{t.sc_tonelaje_hora_hora}</span>
              <h3>{focusLabel(focusShift, t)}</h3>
            </div>
            <span className="nmcp-panel-tag">{peak ? t.sc_peak(peak.label) : 'API v1'}</span>
          </div>
          {equipmentRows.length ? (
            <>
              <HourlyTonnesTotal
                dayTotal={item.dia_tonnes}
                nightTotal={item.noche_tonnes}
                focusShift={focusShift}
                animationId={`${detailAnimationId}-total`}
              />
              <div className="nmcp-shift-chart-legend" aria-label={t.sc_leyenda_grafico_aria}>
                <span className="is-total">{t.sc_linea_tonelaje_hora}</span>
              </div>
              <div className="nmcp-detail-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    key={detailAnimationId}
                    data={equipmentVisualRows}
                    margin={{ top: 18, right: 4, bottom: 0, left: -6 }}
                  >
                    <CartesianGrid stroke="rgba(158,173,186,0.1)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: '#9EADBA', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis
                      tick={{ fill: '#9EADBA', fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      width={42}
                      tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`}
                    />
                        {peak && (
                          <ReferenceLine
                            x={peak.label}
                            stroke="#FFC928"
                            strokeDasharray="4 4"
                            strokeOpacity={0.62}
                          />
                        )}
                        <Tooltip
                          content={<EquipmentDetailTooltip focusShift={focusShift} />}
                          cursor={{ fill: 'rgba(244,247,250,0.035)' }}
                          wrapperStyle={{ outline: 'none' }}
                        />
                        {focusShift !== 'NOCHE' && (
                          <Bar
                            dataKey="dia_tonnes"
                            name="Dia"
                            fill={premiumPalette.cyan}
                            radius={[5, 5, 0, 0]}
                            maxBarSize={18}
                            shape={<RisingBarShape variant="day" />}
                            isAnimationActive
                            animationBegin={80}
                            animationDuration={720}
                            animationEasing="ease-out"
                            activeBar={{ fill: '#55DEFF', stroke: '#F4F7FA', strokeWidth: 1.1 }}
                          />
                        )}
                        {focusShift !== 'DIA' && (
                          <Bar
                            dataKey="noche_tonnes"
                            name="Noche"
                            fill={premiumPalette.night}
                            radius={[5, 5, 0, 0]}
                            maxBarSize={18}
                            shape={<RisingBarShape variant="night" />}
                            isAnimationActive
                            animationBegin={140}
                            animationDuration={720}
                            animationEasing="ease-out"
                            activeBar={{ fill: '#D99BFF', stroke: '#F4F7FA', strokeWidth: 1.1 }}
                          />
                        )}
                        <Line
                          type="monotone"
                          dataKey="hourly_total_tonnes"
                          name="Ton/h"
                          stroke="#FFC928"
                          strokeWidth={3}
                          strokeLinecap="round"
                          dot={{ r: 1.9, strokeWidth: 1.1, fill: '#071425', stroke: '#FFC928' }}
                          activeDot={{ r: 4.4, strokeWidth: 1.5, fill: '#FFC928', stroke: '#F4F7FA' }}
                          isAnimationActive
                          animationBegin={260}
                          animationDuration={720}
                          animationEasing="ease-out"
                        />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <HourlyValuesStrip rows={equipmentVisualRows} focusShift={focusShift} animationId={`${detailAnimationId}-strip`} />
            </>
          ) : (
            <div className="nmcp-detail-empty">
              {t.sc_no_data_detail(item.id)}
            </div>
          )}
        </section>

        <section className="nmcp-status-detail-card">
          <div className="nmcp-panel-header">
            <div>
              <span className="nmcp-section-kicker">{t.sc_estados_wenco_equipo}</span>
              <h3>{item.id} / {focusLabel(focusShift, t)}</h3>
            </div>
            <span className="nmcp-panel-tag">{equipmentStatuses.length ? t.sc_n_estados(equipmentStatuses.length) : t.sc_sin_estado}</span>
          </div>
          {equipmentStatuses.length ? (
            <div className="nmcp-status-grid">
              {equipmentStatuses.slice(0, 10).map((status) => (
                <article key={status.code} className={`nmcp-status-chip is-${equipmentStatusTone(status)}`}>
                  <b>{status.code}</b>
                  <span>{status.description}</span>
                  <small>{formatMetric(status.minutes, 'min', t)} / {formatNumber(status.pct ?? 0, 1)}%</small>
                </article>
              ))}
            </div>
          ) : (
            <div className="nmcp-detail-empty">
              {t.sc_sin_transiciones}
            </div>
          )}
        </section>

        <section className="nmcp-detail-operational-card">
          <div className="nmcp-panel-header">
            <div>
              <span className="nmcp-section-kicker">Lectura operacional por slot</span>
              <h3>{item.id} / {focusLabel(focusShift, t)}</h3>
            </div>
            <span className="nmcp-panel-tag">{operationalRows.length} slots</span>
          </div>
          {operationalRows.length ? (
            <>
              <div className="nmcp-operational-summary-grid">
                <article className="is-peak">
                  <span>Mejor hora</span>
                  <strong>{peak ? peak.label : t.common_sin_dato}</strong>
                  <small>{peak ? `${formatTons(selectedHourlyTonnes(peak, focusShift))} / ${t.sc_ciclos_n(formatNumber(selectedHourlyCycles(peak, focusShift)))}` : t.sc_sin_detalle_horario}</small>
                </article>
                <article>
                  <span>Hora baja</span>
                  <strong>{lowProductionRow ? lowProductionRow.row.label : t.common_sin_dato}</strong>
                  <small>{lowProductionRow ? `${formatTons(lowProductionRow.tonnes)} / ${t.sc_ciclos_n(formatNumber(lowProductionRow.cycles))}` : t.sc_sin_detalle_horario}</small>
                </article>
                <article>
                  <span>Promedios visibles</span>
                  <strong>{formatMetric(detailAverageCycle, 'min', t)}</strong>
                  <small>{t.sc_dist_od} {formatMetric(detailAverageDistance, 'km', t)}</small>
                </article>
              </div>

              <div className="nmcp-operational-slot-grid">
                {operationalRows.map((detail) => {
                  const primaryCycleLabel = type === 'truck' ? t.sc_col_ciclo_caex : t.sc_ciclo_kv
                  const primaryCycleSource = type === 'truck' ? detail.caexCycleSource || detail.travelCycleSource : detail.loadingSource
                  return (
                    <article
                      key={`${detail.row.equipment_id}-${detail.row.slot}`}
                      className={`nmcp-operational-slot-card ${detail.isPeak ? 'is-best-hour' : ''}`}
                    >
                      <div className="nmcp-slot-card-head">
                        <span>
                          <b>{detail.row.label}</b>
                          <small>{detail.hourLabel}</small>
                        </span>
                        <strong className="nmcp-slot-tonnes">{formatTons(detail.tonnes)}</strong>
                        <em className={detail.recommendationClass}>
                          {detail.recommendation}
                        </em>
                      </div>

                      <div className="nmcp-slot-route">
                        <span>
                          <small>{t.sc_col_origen_destino.split('/')[0]?.trim() || 'Origen'}</small>
                          <strong>{detail.origin}</strong>
                        </span>
                        <i aria-hidden="true" />
                        <span>
                          <small>{t.sc_col_origen_destino.split('/')[1]?.trim() || 'Destino'}</small>
                          <strong>{detail.destination}</strong>
                        </span>
                      </div>

                      <div className="nmcp-slot-bar-list">
                        <div>
                          <span>{t.sc_col_tonelaje}</span>
                          <i><b style={{ width: metricBarWidth(detail.tonnes, maxOperationalTonnes) }} /></i>
                          <strong>{formatTons(detail.tonnes)}</strong>
                        </div>
                        <div>
                          <span>{t.sc_dist_od}</span>
                          <i><b style={{ width: metricBarWidth(detail.loadedDistance, maxOperationalDistance) }} /></i>
                          <strong>{formatMetric(detail.loadedDistance, 'km', t)}</strong>
                        </div>
                        <div className="is-cycle">
                          <span>{primaryCycleLabel}</span>
                          <i><b style={{ width: metricBarWidth(detail.cycleMetric, maxOperationalCycle) }} /></i>
                          <strong>{formatMetric(detail.cycleMetric, 'min', t)}</strong>
                        </div>
                      </div>

                      <div className="nmcp-slot-meta-grid">
                        <span><small>{t.sc_ciclos_kv}</small><strong>{formatNumber(detail.cycles)}</strong></span>
                        {type === 'truck' ? (
                          <>
                            {hasMetricValue(detail.transport) && <span><small>{t.sc_transp_n04}</small><strong>{formatMetric(detail.transport, 'min', t)}</strong>{detail.transportSource && <em>{detail.transportSource}</em>}</span>}
                            {hasMetricValue(detail.emptyReturn) && <span><small>{t.sc_retorno_n03}</small><strong>{formatMetric(detail.emptyReturn, 'min', t)}</strong>{detail.emptyReturnSource && <em>{detail.emptyReturnSource}</em>}</span>}
                            {hasMetricValue(detail.shovelWait) && <span><small>{t.sc_espera_n06}</small><strong>{formatMetric(detail.shovelWait, 'min', t)}</strong>{detail.shovelWaitSource && <em>{detail.shovelWaitSource}</em>}</span>}
                          </>
                        ) : (
                          <>
                            {hasMetricValue(detail.loading) && <span><small>Carguio</small><strong>{formatMetric(detail.loading, 'min', t)}</strong>{primaryCycleSource && <em>{primaryCycleSource}</em>}</span>}
                            {hasMetricValue(detail.cycle) && <span><small>{t.sc_ciclo_kv}</small><strong>{formatMetric(detail.cycle, 'min', t)}</strong></span>}
                            {hasMetricValue(detail.wait) && <span><small>{t.sc_col_espera_caex}</small><strong>{formatMetric(detail.wait, 'min', t)}</strong>{detail.waitSource && <em>{detail.waitSource}</em>}</span>}
                          </>
                        )}
                      </div>

                      {(detail.maintenanceCode && detail.maintenanceMinutes) || !!detail.statusBreakdown.length ? (
                        <div className="nmcp-slot-status-strip">
                          {detail.maintenanceCode && detail.maintenanceMinutes && (
                            <span className="is-maintenance">
                              {detail.maintenanceDesc || detail.maintenanceCode} / {formatMetric(detail.maintenanceMinutes, 'min', t)}
                            </span>
                          )}
                          {detail.statusBreakdown.slice(0, 3).map((status) => (
                            <span key={status.code}>
                              {status.code} {status.description} / {formatMetric(status.minutes, 'min', t)}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </article>
                  )
                })}
              </div>
            </>
          ) : (
            <div className="nmcp-detail-empty">{t.sc_sin_detalle_horario}</div>
          )}
        </section>
    </FloatingWindow>
  )
}

export function ShiftComparisonVisionPanel({
  data,
  error,
  fetching = false,
  loading = false,
  selectedDate,
  onDateChange,
  onRefresh,
}: ShiftComparisonVisionPanelProps) {
  const t = useModuleT(cockpitT)
  useChartPaletteKey()
  const [focusShift, setFocusShift] = useState<ShiftFocus>('AMBOS')
  const [selectedEquipment, setSelectedEquipment] = useState<{
    type: 'loader' | 'truck'
    item: ShiftComparisonEquipmentPoint
    anchor: DetailModalAnchor
  } | null>(null)
  const liveShift = data?.operational_context?.turno_nombre === 'DIA'
    ? 'DIA'
    : data?.operational_context?.turno_nombre === 'NOCHE'
      ? 'NOCHE'
      : 'AMBOS'

  useEffect(() => {
    if (liveShift !== 'AMBOS') {
      setFocusShift((current) => current === 'AMBOS' ? liveShift : current)
    }
  }, [liveShift])

  if (loading) {
    return (
      <section className="nmcp-panel nmcp-shift-vision-panel" aria-label={t.sc_comparativa_aria}>
        <div className="nmcp-panel-header">
          <div>
            <span className="nmcp-section-kicker">{t.sc_vision_comparativa_kicker}</span>
            <h2>{t.sc_loading_title}</h2>
          </div>
          <label className="nmcp-shift-date-filter">
            <span>{t.sc_fecha_comparativa}</span>
            <input type="date" value={selectedDate} onChange={(event) => onDateChange(event.target.value)} />
          </label>
        </div>
        <div className="nmcp-shift-empty">{t.sc_loading_body}</div>
      </section>
    )
  }

  if (error || !data) {
    return (
      <section className="nmcp-panel nmcp-shift-vision-panel" aria-label={t.sc_comparativa_aria}>
        <div className="nmcp-panel-header">
          <div>
            <span className="nmcp-section-kicker">{t.sc_vision_comparativa_kicker}</span>
            <h2>{t.sc_error_title}</h2>
          </div>
          <div className="nmcp-shift-vision-actions">
            <label className="nmcp-shift-date-filter">
              <span>{t.sc_fecha_comparativa}</span>
              <input type="date" value={selectedDate} onChange={(event) => onDateChange(event.target.value)} />
            </label>
            <button className="nmcp-icon-button" type="button" onClick={onRefresh} aria-label={t.sc_retry_aria}>
              <RefreshCcw size={16} />
            </button>
          </div>
        </div>
        <div className="nmcp-shift-empty">
          {error?.message ?? t.sc_error_body}
        </div>
      </section>
    )
  }

  const diff = data.summary.difference_tonnes
  const visualHourlyRows = buildVisualHourlyRows(data, liveShift, focusShift)
  const fairSummary = fairWindowSummary(data, liveShift)
  const phaseSplit = phaseSplitFromHourly(data.loading_unit_hourly ?? [], focusShift)
  const scoreHourlyRow = (row: ShiftComparisonHourlyPoint) => {
    if (focusShift === 'DIA') return row.dia_tonnes
    if (focusShift === 'NOCHE') return row.noche_tonnes
    return Math.abs(row.difference_tonnes)
  }
  const topDiffRows = [...data.hourly].filter((row) => scoreHourlyRow(row) > 0).sort((a, b) => scoreHourlyRow(b) - scoreHourlyRow(a)).slice(0, 4)
  const hourlyDayTotal = data.hourly.reduce((sum, row) => sum + row.dia_tonnes, 0)
  const hourlyNightTotal = data.hourly.reduce((sum, row) => sum + row.noche_tonnes, 0)
  const shiftProjectedFinal = visualHourlyRows.find((row) => typeof row.shift_projected_final_tonnes === 'number')?.shift_projected_final_tonnes ?? null
  const mainHourlyAnimationId = `main-hourly-${data.selected_date}-${focusShift}`
  const showHourlyBarLabels = focusShift !== 'AMBOS'
  const showProjectionLine = typeof shiftProjectedFinal === 'number' && focusShift !== 'AMBOS'

  const focusClass = focusShift === 'DIA' ? 'is-focus-dia' : focusShift === 'NOCHE' ? 'is-focus-noche' : ''

  return (
    <section className={`nmcp-panel nmcp-shift-vision-panel ${focusClass}`} aria-label={t.sc_vision_comparativa_aria}>
      <div className="nmcp-shift-vision-header">
        <div className="nmcp-shift-vision-title">
          <SplitSquareHorizontal size={18} />
          <div>
            <span className="nmcp-section-kicker">{t.sc_vision_comparativa_kicker}</span>
            <h2>{t.sc_title}</h2>
          </div>
        </div>
        <div className="nmcp-shift-vision-actions">
          <div className="nmcp-shift-toggle" role="group" aria-label={t.sc_foco_turno_aria}>
            {(['DIA', 'NOCHE', 'AMBOS'] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={focusShift === option}
                className={focusShift === option ? 'is-active' : ''}
                onClick={() => setFocusShift(option)}
              >
                {option === 'DIA' ? t.sc_dia : option === 'NOCHE' ? t.sc_noche : t.sc_ambos}
                {option === liveShift && <i className="nmcp-live-dot" aria-hidden="true" />}
              </button>
            ))}
          </div>
          <label className="nmcp-shift-date-filter">
            <span>{t.sc_fecha_comparativa}</span>
            <input type="date" value={selectedDate} onChange={(event) => onDateChange(event.target.value)} />
          </label>
          <span className={`nmcp-mode-pill ${sourceClass(data.data_source)}`}>{data.data_source}</span>
          <span className="nmcp-panel-tag">{data.selected_date}</span>
          <button className="nmcp-icon-button" type="button" onClick={onRefresh} aria-label={t.sc_refresh_aria}>
            <RefreshCcw size={16} className={fetching ? 'is-spinning' : undefined} />
          </button>
        </div>
      </div>

      <div className="nmcp-shift-vision-actions" aria-label={t.sc_contexto_operacional_aria}>
        <span className="nmcp-panel-tag">{t.sc_fecha_operacional(formatContextDate(data.operational_context?.fecha_operacional ?? data.selected_date, t))}</span>
        <span className="nmcp-panel-tag">{t.sc_turno_actual(data.operational_context?.turno_nombre ?? t.common_sin_dato)}</span>
        <span className="nmcp-panel-tag">
          {t.sc_periodo_actual(formatContextDateTime(data.operational_context?.turno_inicio, t), formatContextDateTime(data.operational_context?.turno_fin, t))}
        </span>
      </div>

      <div className="nmcp-shift-summary-grid">
        <SummaryCard
          label={t.sc_turno_dia_label}
          value={formatTons(data.summary.dia.total_tonnes)}
          detail={t.sc_ciclos_uc(formatNumber(data.summary.dia.cycles), formatNumber(data.summary.dia.loading_units_count))}
          tone="day"
          focused={focusShift === 'DIA'}
          dimmed={focusShift === 'NOCHE'}
          live={liveShift === 'DIA'}
        />
        <SummaryCard
          label={t.sc_turno_noche_label}
          value={formatTons(data.summary.noche.total_tonnes)}
          detail={t.sc_ciclos_uc(formatNumber(data.summary.noche.cycles), formatNumber(data.summary.noche.loading_units_count))}
          tone="night"
          focused={focusShift === 'NOCHE'}
          dimmed={focusShift === 'DIA'}
          live={liveShift === 'NOCHE'}
        />
        <SummaryCard
          label={t.sc_diferencia_label}
          value={formatTons(diff)}
          detail={leaderLabel(data.summary.leader, t)}
          tone="diff"
        />
      </div>

      <FairComparisonCard summary={fairSummary} liveShift={liveShift} />

      <div className="nmcp-shift-vision-grid">
        <div className="nmcp-shift-hourly-card">
          <div className="nmcp-shift-mini-header">
            <span>{t.sc_hora_a_hora}</span>
            <em>{focusShift === 'DIA' ? t.sc_leyenda_dia : focusShift === 'NOCHE' ? t.sc_leyenda_noche : t.sc_leyenda_ambos}</em>
          </div>
          <div className="nmcp-shift-chart-legend" aria-label={t.sc_leyenda_hora_hora_aria}>
            <span className="is-total">{t.sc_linea_total_hora}</span>
            {showProjectionLine && <span className="is-projected">{t.sc_proyectado}</span>}
          </div>
          <HourlyTonnesTotal
            dayTotal={hourlyDayTotal}
            nightTotal={hourlyNightTotal}
            focusShift={focusShift}
            animationId={`${mainHourlyAnimationId}-total`}
            projectedFinal={shiftProjectedFinal}
          />
          <div className="nmcp-shift-hourly-chart" role="img" aria-label={t.sc_barras_comparativas_aria}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                key={mainHourlyAnimationId}
                data={visualHourlyRows}
                margin={{ top: showHourlyBarLabels ? 28 : 18, right: 8, bottom: 0, left: -6 }}
                barCategoryGap={focusShift === 'AMBOS' ? '18%' : '32%'}
                barGap={focusShift === 'AMBOS' ? 5 : 8}
              >
                <CartesianGrid stroke="rgba(158,173,186,0.10)" vertical={false} strokeDasharray="4 8" />
                <XAxis dataKey="label" tick={{ fill: '#9EADBA', fontSize: 10, fontWeight: 800 }} axisLine={false} tickLine={false} dy={6} />
                <YAxis tick={{ fill: '#9EADBA', fontSize: 10 }} axisLine={false} tickLine={false} width={46} tickFormatter={(value) => compactTons(Number(value))} />
                {showProjectionLine && (
                  <YAxis
                    yAxisId="projection"
                    orientation="right"
                    hide
                    domain={[0, 'dataMax']}
                  />
                )}
                  <Tooltip
                    content={<HourlyTooltip focusShift={focusShift} />}
                    cursor={{ stroke: 'rgba(244,247,250,0.18)', strokeWidth: 1 }}
                    wrapperStyle={{ outline: 'none' }}
                  />
                {focusShift !== 'NOCHE' && (
                  <Bar
                    dataKey="dia_tonnes"
                    name="Dia"
                    fill={premiumPalette.cyan}
                    radius={[5, 5, 0, 0]}
                    maxBarSize={24}
                    shape={<RisingBarShape variant="day" />}
                    isAnimationActive
                    animationBegin={80}
                    animationDuration={980}
                    animationEasing="ease-out"
                    activeBar={{ fill: '#47D9FF', stroke: '#F4F7FA', strokeWidth: 1.4 }}
                  >
                    {showHourlyBarLabels && (
                      <LabelList
                        dataKey="dia_tonnes"
                        content={<HourlyBarValueLabel fill={premiumPalette.cyan} animationId={`${mainHourlyAnimationId}-dia`} />}
                      />
                    )}
                  </Bar>
                )}
                {focusShift !== 'DIA' && (
                  <Bar
                    dataKey="noche_tonnes"
                    name="Noche"
                    fill={premiumPalette.night}
                    radius={[5, 5, 0, 0]}
                    maxBarSize={24}
                    shape={<RisingBarShape variant="night" />}
                    isAnimationActive
                    animationBegin={140}
                    animationDuration={980}
                    animationEasing="ease-out"
                    activeBar={{ fill: '#D88BFF', stroke: '#F4F7FA', strokeWidth: 1.4 }}
                  >
                    {showHourlyBarLabels && (
                      <LabelList
                        dataKey="noche_tonnes"
                        content={<HourlyBarValueLabel fill={premiumPalette.night} animationId={`${mainHourlyAnimationId}-noche`} />}
                      />
                    )}
                  </Bar>
                )}
                <Line
                  type="monotone"
                  dataKey="hourly_total_tonnes"
                  name="Total hora"
                  stroke="#FFC928"
                  strokeWidth={2.4}
                  dot={{ r: 2.4, strokeWidth: 1.4, fill: '#071425', stroke: '#FFC928' }}
                  activeDot={{ r: 4.2, strokeWidth: 1.6, fill: '#FFC928', stroke: '#F4F7FA' }}
                  isAnimationActive
                  animationBegin={260}
                  animationDuration={900}
                  animationEasing="ease-out"
                />
                {showProjectionLine && (
                  <Line
                    type="monotone"
                    yAxisId="projection"
                    dataKey="shift_projected_cumulative_tonnes"
                    name="PROYECTADO"
                    stroke="#29E76F"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 1.4, fill: '#29E76F', stroke: '#F4F7FA' }}
                    connectNulls
                    isAnimationActive
                    animationBegin={340}
                    animationDuration={900}
                    animationEasing="ease-out"
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <HourlyValuesStrip rows={visualHourlyRows} focusShift={focusShift} animationId={`${mainHourlyAnimationId}-strip`} />
          <PhaseSplitBar split={phaseSplit} focusShift={focusShift} />
        </div>

        <div className="nmcp-shift-diff-card">
          <div className="nmcp-shift-mini-header">
            <span>{focusShift === 'AMBOS' ? t.sc_diferencia_por_hora : t.sc_produccion_por_hora}</span>
            <em>{focusShift === 'AMBOS' ? t.sc_mayor_brecha : focusLabel(focusShift, t)}</em>
          </div>
          <div className="nmcp-shift-diff-list">
            {topDiffRows.map((row) => (
              <article key={row.slot} className={diffClass(row.difference_tonnes)}>
                <span>{row.label}</span>
                <strong>{focusShift === 'DIA' ? formatTons(row.dia_tonnes) : focusShift === 'NOCHE' ? formatTons(row.noche_tonnes) : formatTons(row.difference_tonnes)}</strong>
                <small>{focusShift === 'DIA' ? row.dia_hour : focusShift === 'NOCHE' ? row.noche_hour : `${row.dia_hour} vs ${row.noche_hour}`}</small>
              </article>
            ))}
          </div>
        </div>
      </div>

      <div className="nmcp-shift-equipment-grid">
        <EquipmentList
          title={t.sc_unidades_carguio}
          type="loader"
          rows={data.loading_units}
          focusShift={focusShift}
          hourlyRows={data.loading_unit_hourly ?? []}
          onOpenDetail={(item, anchor) => setSelectedEquipment({ type: 'loader', item, anchor })}
        />
        <EquipmentList
          title={t.sc_caex}
          type="truck"
          rows={data.caex}
          focusShift={focusShift}
          hourlyRows={data.caex_hourly ?? []}
          onOpenDetail={(item, anchor) => setSelectedEquipment({ type: 'truck', item, anchor })}
        />
      </div>

      {!!data.warnings.length && (
        <div className="nmcp-shift-warnings">
          {data.warnings.slice(0, 2).map((warning) => <span key={warning}>{warning}</span>)}
        </div>
      )}
      <EquipmentComparisonDetailModal
          item={selectedEquipment?.item ?? null}
          type={selectedEquipment?.type ?? 'loader'}
          anchor={selectedEquipment?.anchor ?? null}
          focusShift={focusShift}
          rows={selectedEquipment?.type === 'truck' ? data.caex_hourly ?? [] : data.loading_unit_hourly ?? []}
          onClose={() => setSelectedEquipment(null)}
        />
    </section>
  )
}
