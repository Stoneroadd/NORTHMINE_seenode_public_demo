import { useEffect, useState } from 'react'
import { CalendarDays, ChevronDown, RefreshCcw, Target } from 'lucide-react'
import type { MonthlyTargetResponse } from '../../lib/api'
import { formatNumber, formatPct } from './cockpitModel'
import { useModuleT } from '../../i18n/useModuleT'
import { cockpitT, type CockpitT } from '../../i18n/modules/cockpit'

interface MonthlyTargetPanelProps {
  data?: MonthlyTargetResponse
  error?: Error | null
  fetching?: boolean
  loading?: boolean
  onRefresh: () => void
}

function sourceClass(dataSource: string): string {
  const normalized = dataSource.toUpperCase()
  if (normalized === 'REAL') return 'is-real'
  if (normalized === 'DEMO') return 'is-demo'
  return 'is-estimated'
}

function differenceClass(value: number): string {
  if (value > 0) return 'is-positive'
  if (value < 0) return 'is-negative'
  return 'is-neutral'
}

function marketToneClass(tone?: string): string {
  const normalized = (tone || '').toUpperCase()
  if (normalized === 'BULL') return 'is-bull'
  if (normalized === 'BEAR') return 'is-bear'
  if (normalized === 'FLAT') return 'is-flat'
  return 'is-pending'
}

function statusLabel(status: string | undefined, t: CockpitT): string {
  const normalized = (status || '').toUpperCase()
  if (normalized === 'SOBRE_META') return t.monthly_status_sobre_meta
  if (normalized === 'BAJO_META') return t.monthly_status_bajo_meta
  if (normalized === 'CERCA_META') return t.monthly_status_cerca
  if (normalized === 'PENDIENTE') return t.monthly_status_pendiente
  return status || t.monthly_status_sin_estado
}

function dateTimeLabel(value: string | null | undefined, t: CockpitT): string {
  if (!value) return t.monthly_sin_registro
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function shouldReduceMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

function useAnimatedNumber(value: number, animationId: string, duration = 900): number {
  const [displayValue, setDisplayValue] = useState(value)

  useEffect(() => {
    if (shouldReduceMotion()) {
      setDisplayValue(value)
      return
    }
    let frame = 0
    const startedAt = performance.now()
    const startValue = 0
    const delta = value - startValue
    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayValue(startValue + delta * eased)
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    setDisplayValue(startValue)
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [animationId, duration, value])

  return displayValue
}

function AnimatedNumber({
  value,
  animationId,
  digits = 0,
  suffix = '',
}: {
  value: number
  animationId: string
  digits?: number
  suffix?: string
}) {
  const animated = useAnimatedNumber(value, animationId)
  return <>{formatNumber(animated, digits)}{suffix}</>
}

function Row({
  label,
  value,
  animationId,
  tone,
}: {
  label: string
  value: number
  animationId: string
  tone?: string
}) {
  return (
    <article className={tone}>
      <span>{label}</span>
      <strong><AnimatedNumber value={value} animationId={animationId} /></strong>
    </article>
  )
}

export function MonthlyTargetPanel({
  data,
  error,
  fetching = false,
  loading = false,
  onRefresh,
}: MonthlyTargetPanelProps) {
  const t = useModuleT(cockpitT)
  const [showDailyDetail, setShowDailyDetail] = useState(false)
  const animationId = data
    ? `${data.generated_at}-${data.period.end_date}-${data.mov_real_acumulado}-${data.mov_programado_acumulado}`
    : 'monthly-target-empty'
  const progress = data ? Math.max(0, Math.min(data.cumplimiento_pct ?? 0, 140)) : 0
  const animatedProgress = Math.max(0, Math.min(useAnimatedNumber(progress, `${animationId}-progress`, 950), 140))

  if (loading) {
    return (
      <section className="nmcp-panel nmcp-monthly-panel" aria-label={t.monthly_kicker}>
        <div className="nmcp-panel-header">
          <div>
            <span className="nmcp-section-kicker">{t.monthly_kicker}</span>
            <h2>{t.monthly_loading_title}</h2>
          </div>
          <span className="nmcp-panel-tag">API v1</span>
        </div>
        <div className="nmcp-monthly-empty">{t.monthly_loading_body}</div>
      </section>
    )
  }

  if (error || !data) {
    return (
      <section className="nmcp-panel nmcp-monthly-panel" aria-label={t.monthly_kicker}>
        <div className="nmcp-panel-header">
          <div>
            <span className="nmcp-section-kicker">{t.monthly_kicker}</span>
            <h2>{t.monthly_error_title}</h2>
          </div>
          <button className="nmcp-icon-button" type="button" onClick={onRefresh} aria-label={t.monthly_retry_aria}>
            <RefreshCcw size={16} />
          </button>
        </div>
        <div className="nmcp-monthly-empty">
          {t.monthly_error_body(error?.message ?? t.monthly_sin_respuesta)}
        </div>
      </section>
    )
  }

  const diffTone = differenceClass(data.mov_diferencia)
  const dailyRows = data.daily_breakdown ?? []
  const f02Accumulated = data.mov_f02_acumulado ?? 0
  const totalWithF02 = data.mov_total_con_f02 ?? data.mov_real_acumulado
  const isDemo = data.data_source.toUpperCase() === 'DEMO'
  const sourceSystem = isDemo ? 'NORTHMINE DEMO' : data.source_system
  const dataQuality = isDemo ? 'DATOS SINTÉTICOS CONFIGURADOS' : data.quality

  return (
    <section className="nmcp-panel nmcp-monthly-panel" aria-label={t.monthly_meta_mes(data.period.label)}>
      <div className="nmcp-monthly-header">
        <div className="nmcp-monthly-title">
          <Target size={18} />
          <div>
            <span className="nmcp-section-kicker">{t.monthly_meta_acumulada_kicker}</span>
            <h2>{t.monthly_meta_mes(data.period.label)}</h2>
          </div>
        </div>
        <div className="nmcp-monthly-actions">
          <span className={`nmcp-mode-pill ${sourceClass(data.data_source)}`}>{data.data_source}</span>
          <span className="nmcp-panel-tag">{data.sector}</span>
          <button className="nmcp-icon-button" type="button" onClick={onRefresh} aria-label={t.monthly_refresh_aria}>
            <RefreshCcw size={16} className={fetching ? 'is-spinning' : undefined} />
          </button>
        </div>
      </div>

      <div className="nmcp-monthly-body">
        <div className="nmcp-monthly-metrics">
          <Row label={t.monthly_row_programado} value={data.mov_programado_acumulado} animationId={`${animationId}-programmed`} />
          <Row label={t.monthly_row_real} value={data.mov_real_acumulado} animationId={`${animationId}-real`} tone="is-real-value" />
          <Row label={t.monthly_row_diferencia} value={data.mov_diferencia} animationId={`${animationId}-diff`} tone={diffTone} />
        </div>

        <aside className="nmcp-monthly-summary">
          <div>
            <span>{t.monthly_cumplimiento}</span>
            <strong>
              {data.cumplimiento_pct === null
                ? t.common_sin_dato
                : <AnimatedNumber value={data.cumplimiento_pct} animationId={`${animationId}-pct`} digits={1} suffix="%" />}
            </strong>
          </div>
          <div className="nmcp-monthly-progress" aria-label={t.monthly_cumplimiento_aria(formatPct(data.cumplimiento_pct, 1))}>
            <span style={{ width: `${animatedProgress}%` }} className={diffTone} />
          </div>
          <p>
            <CalendarDays size={13} />
            {t.monthly_periodo(data.period.start_date, data.period.month_end_date ?? data.period.end_date)}
          </p>
          <p>
            {t.monthly_meta_f01_diaria}{' '}
            <b><AnimatedNumber value={data.daily_target_f01_tonnes ?? 129971} animationId={`${animationId}-daily`} /> t</b>
          </p>
          <p>
            {t.monthly_f02_aparte}{' '}
            <b><AnimatedNumber value={f02Accumulated} animationId={`${animationId}-f02`} /> t</b>
            {' / '}{t.monthly_total}{' '}
            <b><AnimatedNumber value={totalWithF02} animationId={`${animationId}-total`} /> t</b>
          </p>
          <p>{t.monthly_fuente_calidad(sourceSystem, dataQuality)}</p>
          <p>{t.monthly_ultimo_registro(dateTimeLabel(data.last_updated, t))}</p>
        </aside>
      </div>

      {!!dailyRows.length && (
        <div className="nmcp-monthly-detail">
          <button
            className={`nmcp-monthly-detail-toggle ${showDailyDetail ? 'is-open' : ''} ${diffTone}`}
            type="button"
            aria-expanded={showDailyDetail}
            aria-controls="monthly-daily-detail"
            onClick={() => setShowDailyDetail((value) => !value)}
          >
            <span>
              <strong>{t.monthly_detalle_diario}</strong>
              <small>{t.monthly_detalle_diario_summary(dailyRows.length)}</small>
            </span>
            <ChevronDown size={16} />
          </button>
          {showDailyDetail && (
            <div id="monthly-daily-detail" className="nmcp-monthly-table-card" aria-label={t.monthly_detalle_diario_aria}>
          <div className="nmcp-monthly-table-title">
            <strong>{t.monthly_detalle_diario}</strong>
            <span>{t.monthly_detalle_diario_note}</span>
          </div>
          <div className="nmcp-monthly-table">
            <div className="nmcp-monthly-table-head">
              <span>{t.monthly_col_dia}</span>
              <span>{t.monthly_col_meta_f01}</span>
              <span>{t.monthly_col_real_f01}</span>
              <span>{t.monthly_col_pct_f01}</span>
              <span>{t.monthly_col_f02}</span>
              <span>{t.monthly_col_total}</span>
              <span>{t.monthly_col_estado}</span>
            </div>
            <div className="nmcp-monthly-table-body">
              {dailyRows.map((row) => {
                const compliance = row.f01_cumplimiento_pct ?? 0
                const isOptimal = compliance >= 100
                const rowTone = isOptimal ? 'BULL' : compliance >= 95 ? 'FLAT' : 'BEAR'
                return (
                <div key={row.date} className={`nmcp-monthly-table-row ${marketToneClass(rowTone)}`}>
                  <span>
                    <b>{row.day.toString().padStart(2, '0')}</b>
                    <small>{row.date.slice(5)}</small>
                  </span>
                  <span>{formatNumber(row.f01_programmed_tonnes)}</span>
                  <strong>{formatNumber(row.f01_real_tonnes)}</strong>
                  <em>{formatPct(row.f01_cumplimiento_pct, 1)}</em>
                  <span>{formatNumber(row.f02_real_tonnes)}</span>
                  <strong>{formatNumber(row.total_real_tonnes)}</strong>
                  <i>{statusLabel(isOptimal ? 'SOBRE_META' : row.status, t)}</i>
                </div>
                )
              })}
            </div>
          </div>
            </div>
          )}
        </div>
      )}

      {!!data.warnings.length && (
        <div className="nmcp-monthly-warnings">
          {data.warnings.slice(0, 2).map((item) => <span key={item}>{item}</span>)}
        </div>
      )}
    </section>
  )
}
