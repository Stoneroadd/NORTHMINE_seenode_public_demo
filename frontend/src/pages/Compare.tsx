import { useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import ReactECharts from 'echarts-for-react'
import type { EChartsOption } from 'echarts'
import { ArrowDownRight, ArrowUpRight, GitCompareArrows } from 'lucide-react'
import { getCompare, type CompareParams } from '../services/compareService'
import { ModuleHeader } from '../components/common/ModuleHeader'
import { LoadingState } from '../components/common/LoadingState'
import { ErrorState } from '../components/common/ErrorState'
import { EquipmentDetailDrawer } from '../components/equipment/detail/EquipmentDetailDrawer'
import { axisLabel, formatNumber, formatTons, premiumPalette, tooltipBase, useChartPaletteKey } from '../components/charts/premium/chartTheme'
import type { CompareResponse } from '../lib/api'
import { useModuleT } from '../i18n/useModuleT'
import { compareT, type CompareT } from '../i18n/modules/compare'
import { useAgentWidget } from '../lib/agentRegistry/useAgentWidget'
import { useAgentEntityHandler } from '../lib/agentRegistry/useAgentEntityHandler'

type Preset = 'half-month' | 'week' | 'month' | 'custom'

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function defaultRanges(preset: Preset, custom: CompareParams): CompareParams {
  const today = new Date()
  if (preset === 'custom') return custom
  if (preset === 'week') {
    const bEnd = new Date(today)
    const bStart = new Date(today)
    bStart.setDate(today.getDate() - 6)
    const aEnd = new Date(bStart)
    aEnd.setDate(bStart.getDate() - 1)
    const aStart = new Date(aEnd)
    aStart.setDate(aEnd.getDate() - 6)
    return { desde_a: isoDate(aStart), hasta_a: isoDate(aEnd), desde_b: isoDate(bStart), hasta_b: isoDate(bEnd) }
  }
  if (preset === 'month') {
    const bStart = new Date(today.getFullYear(), today.getMonth(), 1)
    const aStart = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    const aEnd = new Date(today.getFullYear(), today.getMonth(), 0)
    return { desde_a: isoDate(aStart), hasta_a: isoDate(aEnd), desde_b: isoDate(bStart), hasta_b: isoDate(today) }
  }
  const year = today.getFullYear()
  const month = today.getMonth()
  return {
    desde_a: isoDate(new Date(year, month, 1)),
    hasta_a: isoDate(new Date(year, month, 15)),
    desde_b: isoDate(new Date(year, month, 16)),
    hasta_b: isoDate(today),
  }
}

function buildHourlyCompareOption(data: CompareResponse, t: CompareT): EChartsOption {
  const labels = data.hora_hora_a.map((item) => item.label)
  const aValues = data.hora_hora_a.map((item) => item.toneladas)
  const bValues = data.hora_hora_b.map((item) => item.toneladas)

  return {
    animationDuration: 850,
    color: [premiumPalette.cyan, premiumPalette.mineral],
    grid: { top: 30, right: 24, bottom: 42, left: 76 },
    tooltip: {
      ...tooltipBase(),
      formatter: (params: unknown) => {
        const rows = Array.isArray(params) ? params : [params]
        const first = rows[0] as { dataIndex: number; axisValue?: string }
        const a = aValues[first.dataIndex] ?? 0
        const b = bValues[first.dataIndex] ?? 0
        return `<strong>${first.axisValue}</strong><br/>${t.tooltip_period_a}: <strong>${formatTons(a)}</strong><br/>${t.tooltip_period_b}: <strong>${formatTons(b)}</strong><br/>${t.tooltip_diff}: <strong>${formatTons(b - a)}</strong>`
      },
    },
    legend: { top: 0, right: 0, textStyle: { color: premiumPalette.muted, fontSize: 11 } },
    xAxis: { type: 'category', data: labels, axisLabel, axisTick: { show: false }, axisLine: { lineStyle: { color: premiumPalette.grid } } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: premiumPalette.grid } }, axisLabel: { ...axisLabel, formatter: (value: number) => formatNumber(value) } },
    series: [
      { name: t.period_a, type: 'line', smooth: true, lineStyle: { width: 3 }, areaStyle: { color: premiumPalette.cyan, opacity: 0.08 }, data: aValues },
      { name: t.period_b, type: 'line', smooth: true, lineStyle: { width: 3 }, areaStyle: { color: premiumPalette.mineral, opacity: 0.08 }, data: bValues },
    ],
  } as EChartsOption
}

function buildLoaderCompareOption(data: CompareResponse, t: CompareT): EChartsOption {
  const loaders = data.por_pala_a.map((item) => item.carguio_id)
  return {
    animationDuration: 850,
    color: [premiumPalette.cyan, premiumPalette.mineral],
    grid: { top: 34, right: 24, bottom: 38, left: 74 },
    tooltip: tooltipBase(),
    legend: { top: 0, right: 0, textStyle: { color: premiumPalette.muted, fontSize: 11 } },
    xAxis: { type: 'category', data: loaders, axisLabel, axisTick: { show: false }, axisLine: { lineStyle: { color: premiumPalette.grid } } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: premiumPalette.grid } }, axisLabel: { ...axisLabel, formatter: (value: number) => formatNumber(value) } },
    series: [
      { name: t.period_a, type: 'bar', barMaxWidth: 22, data: data.por_pala_a.map((item) => item.toneladas) },
      { name: t.period_b, type: 'bar', barMaxWidth: 22, data: data.por_pala_b.map((item) => item.toneladas) },
    ],
  } as EChartsOption
}

export function Compare() {
  const t = useModuleT(compareT)
  const [preset, setPreset] = useState<Preset>('half-month')
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string | null>(null)
  const [custom, setCustom] = useState<CompareParams>(() => defaultRanges('half-month', {}))
  const params = defaultRanges(preset, custom)
  const query = useQuery({ queryKey: ['compare', params], queryFn: () => getCompare(params) })

  const themeId = useChartPaletteKey()
  const hourlyOption = useMemo(() => query.data ? buildHourlyCompareOption(query.data, t) : undefined, [query.data, t, themeId])
  const loaderOption = useMemo(() => query.data ? buildLoaderCompareOption(query.data, t) : undefined, [query.data, t, themeId])

  const compareDataRef = useRef(query.data)
  compareDataRef.current = query.data
  useAgentWidget({
    id: 'comparison-variance',
    moduleId: 'comparativa',
    type: 'table',
    label: 'Comparación de periodos',
    description: 'Tabla de KPIs con variacion absoluta y porcentual entre el periodo A y el periodo B.',
    supportedActions: ['focus_widget', 'explain_widget'],
    getSnapshot: () => {
      const current = compareDataRef.current
      return {
        widgetId: 'comparison-variance',
        type: 'table',
        label: 'Comparación de periodos',
        updatedAt: new Date().toISOString(),
        periodoA: current?.periodo_a ?? null,
        periodoB: current?.periodo_b ?? null,
        rows: (current?.tabla ?? []).map((row) => ({ kpi: row.kpi, a: row.a, b: row.b, variacion: row.var, tendencia: row.trend })),
      }
    },
  })
  useAgentEntityHandler('equipment', {
    select: (entityId) => setSelectedEquipmentId(entityId),
    open: (entityId) => setSelectedEquipmentId(entityId),
    isOpen: (entityId) => selectedEquipmentId === entityId,
  })

  if (query.isLoading) return <LoadingState label={t.loading} />
  if (query.isError || !query.data) return <ErrorState detail={t.error_detail} onRetry={() => query.refetch()} />

  const data = query.data
  const tonRow = data.tabla[0]

  return (
    <>
      <div className="module-page compare-page">
        <ModuleHeader
          icon={GitCompareArrows}
          eyebrow={t.header_eyebrow}
          title={t.header_title}
          description={t.header_description}
          meta={`${data.periodo_a.label} vs ${data.periodo_b.label}`}
          actions={
            <div className="filter-bar">
              <button className={preset === 'week' ? 'active' : ''} onClick={() => setPreset('week')}>{t.preset_week}</button>
              <button className={preset === 'month' ? 'active' : ''} onClick={() => setPreset('month')}>{t.preset_month}</button>
              <button className={preset === 'half-month' ? 'active' : ''} onClick={() => setPreset('half-month')}>{t.preset_half_month}</button>
              <button className={preset === 'custom' ? 'active' : ''} onClick={() => setPreset('custom')}>{t.preset_custom}</button>
            </div>
          }
        />

        {preset === 'custom' && (
          <section className="compare-custom-range">
            {(['desde_a', 'hasta_a', 'desde_b', 'hasta_b'] as const).map((key) => (
              <label key={key}>{t.custom_range_label(key)}
                <input type="date" value={custom[key] ?? ''} onChange={(event) => setCustom((current) => ({ ...current, [key]: event.target.value }))} />
              </label>
            ))}
          </section>
        )}

        <section className="compare-summary-grid">
          <article className="compare-period-card">
            <span className="panel-kicker">{t.period_a}</span>
            <h3>{data.periodo_a.label}</h3>
            <strong>{formatTons(data.periodo_a.tonelaje)}</strong>
            <p>{t.cycles_per_day(formatNumber(data.periodo_a.ciclos), formatTons(data.periodo_a.prom_dia))}</p>
          </article>
          <article className={`compare-period-card ${tonRow.trend === 'up' ? 'trend-up' : 'trend-down'}`}>
            <span className="panel-kicker">{t.period_b}</span>
            <h3>{data.periodo_b.label}</h3>
            <strong>{formatTons(data.periodo_b.tonelaje)} <small>{tonRow.trend === 'up' ? '▲' : '▼'} {tonRow.var}%</small></strong>
            <p>{t.cycles_per_day(formatNumber(data.periodo_b.ciclos), formatTons(data.periodo_b.prom_dia))}</p>
          </article>
        </section>

        <section className="panel">
          <div className="panel-header"><div><span className="panel-kicker">{t.table_kicker}</span><h2>{t.table_title}</h2></div><span className="panel-tag">{t.table_tag(data.tabla.length)}</span></div>
          <div className="table-wrap compare-table">
            <table>
              <thead><tr><th>{t.th_kpi}</th><th>{t.th_period_a}</th><th>{t.th_period_b}</th><th>{t.th_variation}</th><th>{t.th_trend}</th></tr></thead>
              <tbody>
                {data.tabla.map((row) => (
                  <tr key={row.kpi} className={Math.abs(row.var) > 10 ? 'strong-variation' : ''}>
                    <td><strong>{row.kpi}</strong></td>
                    <td>{row.suffix === 't' ? formatTons(row.a) : formatNumber(row.a, row.kpi === 'Prom/ciclo' ? 1 : 0)}</td>
                    <td>{row.suffix === 't' ? formatTons(row.b) : formatNumber(row.b, row.kpi === 'Prom/ciclo' ? 1 : 0)}</td>
                    <td className={row.trend === 'up' ? 'positive-value' : 'negative-value'}>{row.var >= 0 ? '+' : ''}{row.var}%</td>
                    <td className={row.trend === 'up' ? 'positive-value' : 'negative-value'}>{row.trend === 'up' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="two-column compare-chart-grid">
          <div className="panel">
            <div className="panel-header"><div><span className="panel-kicker">{t.hourly_kicker}</span><h2>{t.hourly_title}</h2></div></div>
            <div className="compare-chart">
              {hourlyOption && <ReactECharts option={hourlyOption} notMerge lazyUpdate style={{ width: '100%', height: '100%' }} />}
            </div>
          </div>
          <div className="panel">
            <div className="panel-header"><div><span className="panel-kicker">{t.loader_kicker}</span><h2>{t.loader_title}</h2></div><span className="panel-tag">{t.loader_tag}</span></div>
            <div className="compare-chart">
              {loaderOption && (
                <ReactECharts
                  option={loaderOption}
                  notMerge
                  lazyUpdate
                  style={{ width: '100%', height: '100%' }}
                  onEvents={{ click: (params: { name?: string }) => params.name && setSelectedEquipmentId(params.name) }}
                />
              )}
            </div>
          </div>
        </section>

        <section className="compare-days-grid">
          <article className="panel">
            <div className="panel-header"><div><span className="panel-kicker">{t.period_a}</span><h2>{t.best_worst_title}</h2></div></div>
            <p>{t.best_label} {'->'} <strong>{data.mejor_dia_a.fecha}</strong> {formatTons(data.mejor_dia_a.ton)} ({t.pct_of_plan(data.mejor_dia_a.pct)})</p>
            <p>{t.worst_label} {'->'} <strong>{data.peor_dia_a.fecha}</strong> {formatTons(data.peor_dia_a.ton)} ({t.pct_of_plan(data.peor_dia_a.pct)})</p>
          </article>
          <article className="panel">
            <div className="panel-header"><div><span className="panel-kicker">{t.period_b}</span><h2>{t.best_worst_title}</h2></div></div>
            <p>{t.best_label} {'->'} <strong>{data.mejor_dia_b.fecha}</strong> {formatTons(data.mejor_dia_b.ton)} ({t.pct_of_plan(data.mejor_dia_b.pct)})</p>
            <p>{t.worst_label} {'->'} <strong>{data.peor_dia_b.fecha}</strong> {formatTons(data.peor_dia_b.ton)} ({t.pct_of_plan(data.peor_dia_b.pct)})</p>
          </article>
        </section>
      </div>

      <EquipmentDetailDrawer
        equipmentId={selectedEquipmentId}
        open={Boolean(selectedEquipmentId)}
        onClose={() => setSelectedEquipmentId(null)}
      />
    </>
  )
}
