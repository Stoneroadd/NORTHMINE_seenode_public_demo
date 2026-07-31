import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import ReactECharts from 'echarts-for-react'
import type { EChartsOption } from 'echarts'
import { BarChart3, CalendarDays, Gauge, Mountain, Timer, TrendingDown, TrendingUp } from 'lucide-react'
import { getPerformanceSummary } from '../services/performanceService'
import { ModuleHeader } from '../components/common/ModuleHeader'
import { LoadingState } from '../components/common/LoadingState'
import { ErrorState } from '../components/common/ErrorState'
import { ExecutiveKpiCard } from '../components/kpi/ExecutiveKpiCard'
import { EquipmentDetailDrawer } from '../components/equipment/detail/EquipmentDetailDrawer'
import {
  axisLabel,
  formatNumber,
  formatTons,
  premiumPalette,
  tooltipBase,
  useChartPaletteKey,
} from '../components/charts/premium/chartTheme'
import type { LoaderPerformance, PerformanceSummary } from '../lib/api'
import { formatHourLabel } from '../lib/time/operationalHour'

type PeriodKey = '7d' | '14d' | 'month' | 'custom'

const periodOptions: Array<{ key: PeriodKey; label: string }> = [
  { key: '7d', label: 'Ultimos 7 dias' },
  { key: '14d', label: 'Ultimos 14 dias' },
  { key: 'month', label: 'Este mes' },
  { key: 'custom', label: 'Personalizado' },
]

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function periodRange(period: PeriodKey, customStart: string, customEnd: string) {
  const today = new Date()
  if (period === 'custom') return { desde: customStart, hasta: customEnd }
  if (period === 'month') return { desde: isoDate(new Date(today.getFullYear(), today.getMonth(), 1)), hasta: isoDate(today) }
  const days = period === '7d' ? 6 : 13
  const start = new Date(today)
  start.setDate(today.getDate() - days)
  return { desde: isoDate(start), hasta: isoDate(today) }
}

function formatDate(value?: string) {
  if (!value) return '-'
  return new Date(`${value}T00:00:00`).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })
}

function buildPeakHoursOption(data: PerformanceSummary): EChartsOption {
  const topSet = new Set(data.top_hour_set)

  return {
    color: [premiumPalette.cyan],
    animationDuration: 850,
    grid: { top: 20, right: 18, bottom: 42, left: 70 },
    tooltip: {
      ...tooltipBase(),
      formatter: (params: unknown) => {
        const row = params as { dataIndex: number }
        const item = data.hourly_profile[row.dataIndex]
        return `<strong>${item.label}</strong><br/>Promedio: <strong>${formatTons(item.promedio_ton)}</strong><br/>Participacion: <strong>${item.porcentaje_total}%</strong>`
      },
    },
    xAxis: {
      type: 'category',
      data: data.hourly_profile.map((item) => item.label),
      axisLine: { lineStyle: { color: premiumPalette.grid } },
      axisTick: { show: false },
      axisLabel,
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: premiumPalette.grid } },
      axisLabel: { ...axisLabel, formatter: (value: number) => formatNumber(value) },
    },
    series: [
      {
        type: 'bar',
        barMaxWidth: 24,
        data: data.hourly_profile.map((item) => ({
          value: item.promedio_ton,
          itemStyle: {
            borderRadius: [6, 6, 0, 0],
            color: topSet.has(item.hora) ? premiumPalette.mineral : premiumPalette.cyan,
          },
        })),
      },
    ],
  } as EChartsOption
}

function buildAverageCurveOption(data: PerformanceSummary): EChartsOption {
  const peak = data.hourly_profile.reduce((best, item) => (item.promedio_ton > best.promedio_ton ? item : best), data.hourly_profile[0])

  return {
    animationDuration: 900,
    grid: { top: 32, right: 22, bottom: 42, left: 70 },
    tooltip: tooltipBase(),
    xAxis: {
      type: 'category',
      data: data.hourly_profile.map((item) => item.label),
      axisLine: { lineStyle: { color: premiumPalette.grid } },
      axisTick: { show: false },
      axisLabel,
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: premiumPalette.grid } },
      axisLabel: { ...axisLabel, formatter: (value: number) => formatNumber(value) },
    },
    series: [
      {
        name: 'Banda superior',
        type: 'line',
        smooth: true,
        symbol: 'none',
        lineStyle: { opacity: 0 },
        stack: 'confidence',
        data: data.hourly_profile.map((item) => item.min_confianza),
      },
      {
        name: 'Confianza',
        type: 'line',
        smooth: true,
        symbol: 'none',
        lineStyle: { opacity: 0 },
        areaStyle: { color: premiumPalette.cyan, opacity: 0.14 },
        stack: 'confidence',
        data: data.hourly_profile.map((item) => Math.max(0, item.max_confianza - item.min_confianza)),
      },
      {
        name: 'Promedio',
        type: 'line',
        smooth: true,
        symbolSize: 7,
        lineStyle: { width: 3, color: premiumPalette.mineral },
        areaStyle: { color: premiumPalette.mineral, opacity: 0.10 },
        markPoint: {
          data: [{ name: 'Pico', coord: [peak.label, peak.promedio_ton], value: formatTons(peak.promedio_ton) }],
          label: { color: '#020403', fontWeight: 900 },
        },
        data: data.hourly_profile.map((item) => item.promedio_ton),
      },
    ],
  } as EChartsOption
}

function buildHeatmapOption(data: PerformanceSummary): EChartsOption {
  const weekdays = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom']
  const hours = Array.from({ length: 24 }, (_, hour) => formatHourLabel(hour))
  const values = data.heatmap.map((item) => [item.weekday, item.hora, item.promedio_ton, item.ranking])
  const maxValue = Math.max(...data.heatmap.map((item) => item.promedio_ton), 1)

  return {
    animationDuration: 850,
    grid: { top: 22, right: 22, bottom: 52, left: 74 },
    tooltip: {
      ...tooltipBase(),
      formatter: (params: unknown) => {
        const row = params as { value: [number, number, number, number] }
        return `<strong>${weekdays[row.value[0]]} ${hours[row.value[1]]}</strong><br/>Promedio: <strong>${formatTons(row.value[2])}</strong><br/>Ranking: <strong>#${row.value[3]}</strong>`
      },
    },
    xAxis: { type: 'category', data: weekdays, splitArea: { show: true }, axisLabel },
    yAxis: { type: 'category', data: hours, splitArea: { show: true }, axisLabel },
    visualMap: {
      min: 0,
      max: maxValue,
      calculable: false,
      orient: 'horizontal',
      left: 'center',
      bottom: 0,
      textStyle: { color: premiumPalette.muted },
      inRange: { color: [premiumPalette.panel, premiumPalette.cyan, premiumPalette.mineral] },
    },
    series: [
      {
        type: 'heatmap',
        data: values.map((value) => {
          const isMax = value[0] === data.heatmap_max.weekday && value[1] === data.heatmap_max.hora
          return {
            value,
            itemStyle: isMax ? { borderColor: '#FFFFFF', borderWidth: 2 } : undefined,
          }
        }),
        emphasis: { itemStyle: { borderColor: '#FFFFFF', borderWidth: 1 } },
      },
    ],
  } as EChartsOption
}

function buildLoaderOption(data: LoaderPerformance[]): EChartsOption {
  const rows = [...data].sort((a, b) => a.toneladas - b.toneladas)

  return {
    animationDuration: 850,
    grid: { top: 18, right: 26, bottom: 26, left: 86 },
    tooltip: {
      ...tooltipBase(),
      formatter: (params: unknown) => {
        const row = params as { dataIndex: number }
        const item = rows[row.dataIndex]
        return `<strong>${item.carguio_id}</strong><br/>${formatTons(item.toneladas)}<br/>${formatNumber(item.ciclos)} ciclos<br/>${formatNumber(item.ton_ciclo, 1)} t/ciclo`
      },
    },
    xAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: premiumPalette.grid } },
      axisLabel: { ...axisLabel, formatter: (value: number) => formatNumber(value) },
    },
    yAxis: {
      type: 'category',
      data: rows.map((item) => item.carguio_id),
      axisLine: { lineStyle: { color: premiumPalette.grid } },
      axisTick: { show: false },
      axisLabel,
    },
    series: [
      {
        type: 'bar',
        barMaxWidth: 24,
        data: rows.map((item) => ({
          value: item.toneladas,
          itemStyle: {
            borderRadius: [0, 7, 7, 0],
            color: item.fase === 'F02' ? premiumPalette.amber : premiumPalette.cyan,
          },
        })),
        label: {
          show: true,
          position: 'right',
          color: premiumPalette.text,
          formatter: (params: { dataIndex: number }) => {
            const item = rows[params.dataIndex]
            return `${formatTons(item.toneladas)}  ${formatNumber(item.ciclos)} ciclos  ${formatNumber(item.ton_ciclo, 1)} t/ciclo`
          },
        },
      },
    ],
  } as EChartsOption
}

export function Performance() {
  const search = new URLSearchParams(window.location.search)
  const [period, setPeriod] = useState<PeriodKey>((search.get('rendimiento') as PeriodKey) || '14d')
  const [customStart, setCustomStart] = useState(search.get('desde') || isoDate(new Date(new Date().setDate(new Date().getDate() - 13))))
  const [customEnd, setCustomEnd] = useState(search.get('hasta') || isoDate(new Date()))
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string | null>(null)
  const range = periodRange(period, customStart, customEnd)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    params.set('rendimiento', period)
    params.set('desde', range.desde)
    params.set('hasta', range.hasta)
    window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`)
  }, [period, range.desde, range.hasta])

  const query = useQuery({
    queryKey: ['performance-summary', range.desde, range.hasta],
    queryFn: () => getPerformanceSummary(range.desde, range.hasta),
  })
  const themeId = useChartPaletteKey()

  const peakOption = useMemo(() => query.data ? buildPeakHoursOption(query.data) : undefined, [query.data, themeId])
  const curveOption = useMemo(() => query.data ? buildAverageCurveOption(query.data) : undefined, [query.data, themeId])
  const heatmapOption = useMemo(() => query.data ? buildHeatmapOption(query.data) : undefined, [query.data, themeId])
  const loaderOption = useMemo(() => query.data ? buildLoaderOption(query.data.loader_performance) : undefined, [query.data, themeId])

  if (query.isLoading) return <LoadingState label="Cargando rendimiento operacional..." />
  if (query.isError || !query.data) return <ErrorState detail="No se pudo cargar /api/performance/summary." onRetry={() => query.refetch()} />

  const data = query.data
  const worstTone = (data.kpis.peor_dia?.cumplimiento_pct ?? 100) < 80 ? 'red' : 'amber'

  return (
    <>
      <div className="module-page performance-page">
        <ModuleHeader
          icon={BarChart3}
          eyebrow="Rendimiento"
          title="Analitica horaria y productividad"
          description="Patrones por hora, dia de semana y unidad de carguio con datos reales WENCO/SQL."
          meta={`${formatDate(data.desde)} -> ${formatDate(data.hasta)}`}
          actions={
            <div className="filter-bar">
              {periodOptions.map((option) => (
                <button key={option.key} className={period === option.key ? 'active' : ''} onClick={() => setPeriod(option.key)}>
                  {option.label}
                </button>
              ))}
            </div>
          }
        />

        {period === 'custom' && (
          <section className="performance-custom-range">
            <label>Desde <input type="date" value={customStart} onChange={(event) => setCustomStart(event.target.value)} /></label>
            <label>Hasta <input type="date" value={customEnd} onChange={(event) => setCustomEnd(event.target.value)} /></label>
          </section>
        )}

        <section className="kpi-grid compact">
          <ExecutiveKpiCard title="Total periodo" value={formatTons(data.kpis.total_periodo)} subtitle="Toneladas" trend={`${data.daily.length} dias`} tone="green" icon={Mountain} />
          <ExecutiveKpiCard title="Ciclos" value={formatNumber(data.kpis.ciclos)} subtitle="Total periodo" trend="WENCO" tone="cyan" icon={Timer} />
          <ExecutiveKpiCard title="Prom/dia" value={formatTons(data.kpis.promedio_dia)} subtitle="Media diaria" trend="periodo" tone="slate" icon={Gauge} />
          <ExecutiveKpiCard title="Mejor dia" value={formatDate(data.kpis.mejor_dia?.fecha)} subtitle={formatTons(data.kpis.mejor_dia?.toneladas ?? 0)} trend={`${data.kpis.mejor_dia?.cumplimiento_pct ?? 0}%`} tone="green" icon={TrendingUp} />
          <ExecutiveKpiCard title="Peor dia" value={formatDate(data.kpis.peor_dia?.fecha)} subtitle={formatTons(data.kpis.peor_dia?.toneladas ?? 0)} trend={`${data.kpis.peor_dia?.cumplimiento_pct ?? 0}% plan`} tone={worstTone} icon={TrendingDown} />
        </section>

        <section className="panel">
          <div className="panel-header">
            <div><span className="panel-kicker">Concentracion horaria</span><h2>{data.peak_title}</h2></div>
            <span className="panel-tag">Top 3 verde</span>
          </div>
          <div className="performance-chart">
            {peakOption && <ReactECharts option={peakOption} notMerge lazyUpdate style={{ width: '100%', height: '100%' }} />}
          </div>
        </section>

        <section className="two-column performance-two-column">
          <div className="panel">
            <div className="panel-header"><div><span className="panel-kicker">Curva promedio</span><h2>Produccion por hora</h2></div><span className="panel-tag">+/- 1 desv.</span></div>
            <div className="performance-chart compact-chart">
              {curveOption && <ReactECharts option={curveOption} notMerge lazyUpdate style={{ width: '100%', height: '100%' }} />}
            </div>
          </div>
          <div className="panel">
            <div className="panel-header"><div><span className="panel-kicker">Rendimiento por pala</span><h2>Toneladas y ciclos</h2></div><span className="panel-tag">Click barra</span></div>
            <div className="performance-chart compact-chart">
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
            <div className="loader-phase-legend">
              {data.loader_performance.map((item) => (
                <button key={item.carguio_id} type="button" onClick={() => setSelectedEquipmentId(item.carguio_id)}>
                  <span className={`phase-badge phase-badge-${item.fase.toLowerCase()}`}>{item.fase}</span>
                  {item.carguio_id}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="panel performance-heatmap-panel">
          <div className="panel-header">
            <div><span className="panel-kicker">Heatmap operacional</span><h2>Produccion por hora y dia de semana</h2></div>
            <span className="panel-tag">Max {data.heatmap_max.weekday_label} {data.heatmap_max.label}</span>
          </div>
          <div className="performance-heatmap">
            {heatmapOption && <ReactECharts option={heatmapOption} notMerge lazyUpdate style={{ width: '100%', height: '100%' }} />}
          </div>
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
