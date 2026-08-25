import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { TrendingUp } from 'lucide-react'
import ReactECharts from 'echarts-for-react'
import type { EChartsOption } from 'echarts'
import { northmineApi, type CockpitResponse } from '../lib/api'
import { FAST_DEMO_COCKPIT, FAST_PUBLIC_DEMO } from '../demo/fastDemo'
import { premiumPalette, useChartPaletteKey } from '../components/charts/premium/chartTheme'
import { ModuleHeader } from '../components/common/ModuleHeader'
import { ErrorState } from '../components/common/ErrorState'
import { LoadingState } from '../components/common/LoadingState'
import { useAnimatedNumber } from '../hooks/useAnimatedNumber'
import { useModuleT } from '../i18n/useModuleT'
import { predictionT, type PredictionT } from '../i18n/modules/prediction'

/*
 * Reconnected to real data 2026-08-23 (see AGENT_LOG.md / AGENT_WORK_PLAN.md):
 * this page used to call the now-permanently-disabled /api/ml/prediction
 * (a demo-only ML model that never shipped with real training data), so it
 * always errored for every user. It now consumes the same /api/cockpit
 * projection already used by the Decision Cockpit -- a real linear-
 * regression forecast over the shift's actual hourly progress
 * (see backend app/services/forecast_service.py), not a separately
 * trained model. No feature-importance chart or predicted-vs-actual
 * history table: this repo has no real data source for either, and
 * fabricating one would violate the same no-invented-metrics rule that
 * governs every other page here.
 */

// ─── Confidence label mapping ──────────────────────────────────────────────

export function confidenceLabel(value: string, t: PredictionT): string {
  if (value === 'BAJA') return t.confidence_baja
  if (value === 'MEDIA') return t.confidence_media
  if (value === 'ALTA') return t.confidence_alta
  return value
}

// ─── Chart builder ──────────────────────────────────────────────────────────

export function buildHourlyOption(
  hourly: CockpitResponse['hourly_production'],
  target: number,
  t: PredictionT,
): EChartsOption {
  const labels = hourly.map((h) => h.hour)
  const accumulated = hourly.map((h) => h.accumulated ?? 0)
  const targetLine = hourly.map(() => target)

  return {
    backgroundColor: 'transparent',
    grid: { top: 40, right: 24, bottom: 40, left: 80 },
    tooltip: {
      trigger: 'axis',
      backgroundColor: premiumPalette.panel,
      borderColor: premiumPalette.border,
      textStyle: { color: premiumPalette.text, fontSize: 12 },
    },
    legend: {
      top: 0,
      right: 0,
      textStyle: { color: premiumPalette.muted, fontSize: 11 },
    },
    xAxis: {
      type: 'category',
      data: labels,
      axisLine: { lineStyle: { color: premiumPalette.border } },
      axisTick: { show: false },
      axisLabel: { color: premiumPalette.muted, fontSize: 10 },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: premiumPalette.grid } },
      axisLabel: {
        color: premiumPalette.muted,
        fontSize: 10,
        formatter: (v: number) => `${(v / 1000).toFixed(0)}k`,
      },
    },
    series: ([
      {
        name: t.series_actual,
        type: 'line',
        data: accumulated,
        smooth: true,
        lineStyle: { width: 3, color: premiumPalette.cyan },
        areaStyle: { color: premiumPalette.cyan, opacity: 0.12 },
        symbol: 'circle',
        symbolSize: 5,
        itemStyle: { color: premiumPalette.cyan },
      },
      {
        name: t.series_target,
        type: 'line',
        data: targetLine,
        lineStyle: { width: 2, color: premiumPalette.amber, type: 'dashed' },
        symbol: 'none',
        itemStyle: { color: premiumPalette.amber },
      },
    ] as EChartsOption['series']),
  }
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="panel" style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ fontSize: 11, color: 'var(--nm-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
        {label}
      </div>
      <div style={{ fontFamily: '"JetBrains Mono",monospace', fontSize: 22, fontWeight: 700, color: 'var(--nm-text)', lineHeight: 1.2 }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 12, color: 'var(--nm-muted)', fontFamily: '"JetBrains Mono",monospace' }}>{sub}</div>
      )}
    </div>
  )
}

function ScenariosTable({ scenarios, t }: { scenarios: CockpitResponse['scenarios']; t: PredictionT }) {
  if (scenarios.length === 0) {
    return <p style={{ color: 'var(--nm-muted)', fontSize: 13 }}>{t.no_scenarios}</p>
  }
  return (
    <div style={{ overflowX: 'auto', marginTop: 16 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: '"JetBrains Mono",monospace', fontSize: 12 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--nm-border)' }}>
            {[t.table_col_scenario, t.table_col_tons, t.table_col_cost, t.table_col_risk, t.table_col_value].map((col) => (
              <th
                key={col}
                style={{ padding: '6px 10px', textAlign: 'left', color: 'var(--nm-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {scenarios.map((s, i) => (
            <tr key={i} style={{ borderBottom: '1px solid rgba(245,255,250,0.04)', color: 'var(--nm-text)' }}>
              <td style={{ padding: '6px 10px' }}>{s.scenario}</td>
              <td style={{ padding: '6px 10px' }}>{s.tons.toLocaleString('es-CL')} t</td>
              <td style={{ padding: '6px 10px' }}>${s.cost.toLocaleString('es-CL')}</td>
              <td style={{ padding: '6px 10px' }}>{s.risk}</td>
              <td style={{ padding: '6px 10px' }}>{s.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Main component ─────────────────────────────────────────────────────────

export function Prediction() {
  const t = useModuleT(predictionT)
  const paletteKey = useChartPaletteKey()

  const query = useQuery({
    queryKey: ['prediction-cockpit', 'v1'],
    queryFn: () => northmineApi.cockpit(),
    enabled: !FAST_PUBLIC_DEMO,
    initialData: FAST_PUBLIC_DEMO ? FAST_DEMO_COCKPIT : undefined,
    placeholderData: (previousData) => previousData,
    staleTime: FAST_PUBLIC_DEMO ? Infinity : 60000,
    refetchInterval: FAST_PUBLIC_DEMO ? false : 60000,
  })

  const { value: animActual } = useAnimatedNumber(query.data?.production.actual_tonnes ?? 0, { durationMs: 1600 })

  const hourlyOption = useMemo(
    () => (query.data ? buildHourlyOption(query.data.hourly_production, query.data.production.target_tonnes, t) : null),
    [query.data, t, paletteKey],
  )

  if (query.isLoading) return <LoadingState label={t.loading} />
  if (query.isError || !query.data) return <ErrorState detail={t.error} onRetry={() => query.refetch()} />

  const data = query.data
  const prod = data.production
  const shift = data.shift
  const riskPct = (prod.non_compliance_risk * 100).toFixed(0)
  const compliancePct = prod.compliance_pct ?? 0
  const elapsedPct = shift.elapsed_pct ?? 0
  const elapsedHours = Math.round((shift.elapsed_minutes ?? 0) / 60)
  const remainingHours = Math.max(0, 12 - elapsedHours)

  const complianceColor =
    compliancePct >= 100 ? 'var(--nm-green)' : compliancePct >= 90 ? 'var(--nm-amber)' : 'var(--nm-red)'

  return (
    <div className="module-page">
      <ModuleHeader
        icon={TrendingUp}
        eyebrow={t.header_eyebrow}
        title={t.header_title}
        description={t.header_desc}
        meta={t.header_meta(shift.date, shift.name)}
      />

      {/* ── Health + progreso ── */}
      <section className="panel" style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 13, color: 'var(--nm-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {t.health_label}
          </div>
          <div style={{ fontFamily: '"JetBrains Mono",monospace', fontSize: 16, color: 'var(--nm-text)', fontWeight: 700 }}>
            {data.health.score} · {t.health_state(data.health.state)}
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12, color: 'var(--nm-muted)', fontFamily: '"JetBrains Mono",monospace' }}>
            <span>{t.progreso_turno}</span>
            <span style={{ color: 'var(--nm-green)' }}>{t.horas_transcurridas(elapsedHours)}</span>
          </div>
          <div style={{ height: 8, background: 'rgba(245,255,250,0.08)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 4, width: `${elapsedPct}%`, background: 'linear-gradient(90deg, var(--nm-cyan), var(--nm-green))', transition: 'width 600ms ease' }} />
          </div>
          <div style={{ textAlign: 'right', marginTop: 4, fontSize: 12, color: 'var(--nm-muted)', fontFamily: '"JetBrains Mono",monospace' }}>
            {t.transcurrido_restantes(elapsedPct.toFixed(0), remainingHours)}
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        <StatCard label={t.stat_actual} value={`${Math.round(animActual).toLocaleString('es-CL')} t`} sub={t.stat_actual_sub} />
        <StatCard label={t.stat_forecast} value={`${prod.forecast_tonnes.toLocaleString('es-CL')} t`} sub={t.stat_forecast_sub(riskPct)} />
        <StatCard label={t.stat_target} value={`${prod.target_tonnes.toLocaleString('es-CL')} t`} sub={prod.target_source ? t.stat_target_sub(prod.target_source) : undefined} />
        <StatCard label={t.stat_compliance} value={<span style={{ color: complianceColor }}>{compliancePct.toFixed(0)}%</span>} />
      </div>

      {/* ── Chart avance real ── */}
      <section className="panel">
        <div className="panel-header">
          <div>
            <span className="panel-kicker">{t.chart_hourly_kicker}</span>
            <h2>{t.chart_hourly_title}</h2>
          </div>
        </div>
        {hourlyOption && <ReactECharts option={hourlyOption} style={{ height: 300 }} />}
      </section>

      {/* ── Recomendación ── */}
      <section className="panel">
        <div className="panel-header">
          <div>
            <span className="panel-kicker">{t.recommendation_kicker}</span>
            <h2>{data.recommendation.title}</h2>
          </div>
          <span style={{ fontSize: 12, color: 'var(--nm-muted)', fontFamily: '"JetBrains Mono",monospace' }}>
            {t.recommendation_confidence(confidenceLabel(data.recommendation.confidence, t))}
          </span>
        </div>
        <div style={{ borderLeft: `4px solid ${premiumPalette.mineral}`, padding: '16px 20px', background: 'rgba(255,255,255,0.03)', borderRadius: '0 8px 8px 0' }}>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontFamily: '"JetBrains Mono",monospace', fontSize: 13, color: 'var(--nm-text)' }}>
            <span>{data.recommendation.impact_tons.toLocaleString('es-CL')} t</span>
            <span>${data.recommendation.impact_usd.toLocaleString('es-CL')}</span>
          </div>
        </div>
      </section>

      {/* ── Escenarios ── */}
      <section className="panel">
        <div className="panel-header">
          <div>
            <span className="panel-kicker">{t.scenarios_kicker}</span>
            <h2>{t.scenarios_title}</h2>
          </div>
        </div>
        <ScenariosTable scenarios={data.scenarios} t={t} />
      </section>
    </div>
  )
}
