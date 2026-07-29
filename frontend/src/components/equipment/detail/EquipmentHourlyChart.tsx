import { useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import type { EChartsOption } from 'echarts'
import type { EquipmentHourlyPoint } from '../../../types/equipment'
import { axisLabel, formatNumber, formatTons, premiumPalette, tooltipBase, useChartPaletteKey } from '../../charts/premium/chartTheme'
import { useModuleT } from '../../../i18n/useModuleT'
import { equipmentT } from '../../../i18n/modules/equipment'

export function EquipmentHourlyChart({ data }: { data: EquipmentHourlyPoint[] }) {
  const t = useModuleT(equipmentT)
  const themeId = useChartPaletteKey()
  const chartRows = useMemo(() => data.map((item) => ({
    ...item,
    label: `${String(item.hora).padStart(2, '0')}:00`,
  })), [data])
  const summary = useMemo(() => {
    const totalTonnes = chartRows.reduce((sum, item) => sum + item.toneladas, 0)
    const totalCycles = chartRows.reduce((sum, item) => sum + item.ciclos, 0)
    const peak = chartRows.length > 0
      ? chartRows.reduce((best, item) => item.toneladas > best.toneladas ? item : best, chartRows[0])
      : null
    return {
      totalTonnes,
      totalCycles,
      peak,
      averageTonnes: chartRows.length > 0 ? totalTonnes / chartRows.length : 0,
    }
  }, [chartRows])
  const option = useMemo<EChartsOption>(() => ({
    color: [premiumPalette.mineral, premiumPalette.amber, premiumPalette.cyan],
    animationDuration: 980,
    animationDurationUpdate: 520,
    animationEasing: 'quarticOut',
    grid: { top: 34, right: 50, bottom: 38, left: 66 },
    legend: {
      top: 0,
      right: 0,
      itemWidth: 10,
      itemHeight: 10,
      textStyle: { color: premiumPalette.muted, fontSize: 11, fontWeight: 700 },
    },
    tooltip: {
      ...tooltipBase(),
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
        lineStyle: { color: premiumPalette.cyan, opacity: 0.45 },
        crossStyle: { color: premiumPalette.amber, opacity: 0.42 },
      },
      formatter: (params: unknown) => {
        const rows = Array.isArray(params) ? params : [params]
        const first = rows[0] as { axisValue?: string }
        return [
          `<strong>${first?.axisValue ?? ''}</strong>`,
          ...rows.map((row) => {
            const current = row as { marker: string; seriesName: string; value: number }
            const formatted = current.seriesName === t.tons ? formatTons(current.value) : formatNumber(current.value)
            return `${current.marker}${current.seriesName}: <strong>${formatted}</strong>`
          }),
        ].join('<br/>')
      },
    },
    xAxis: {
      type: 'category',
      data: chartRows.map((item) => item.label),
      axisLine: { lineStyle: { color: premiumPalette.grid } },
      axisTick: { show: false },
      axisLabel,
    },
    yAxis: [
      {
        type: 'value',
        name: 't',
        nameTextStyle: { color: premiumPalette.muted, fontSize: 10, fontWeight: 700 },
        splitLine: { lineStyle: { color: premiumPalette.grid } },
        axisLabel: {
          ...axisLabel,
          formatter: (value: number) => formatNumber(value),
        },
      },
      {
        type: 'value',
        name: t.cycles,
        nameTextStyle: { color: premiumPalette.muted, fontSize: 10, fontWeight: 700 },
        splitLine: { show: false },
        axisLine: { show: true, lineStyle: { color: premiumPalette.grid } },
        axisLabel: {
          ...axisLabel,
          formatter: (value: number) => formatNumber(value),
        },
      },
    ],
    series: [
      {
        name: t.tons,
        type: 'bar',
        barMaxWidth: 28,
        showBackground: true,
        backgroundStyle: {
          color: 'rgba(255,255,255,0.035)',
          borderRadius: [8, 8, 2, 2],
        },
        itemStyle: {
          borderRadius: [8, 8, 2, 2],
          shadowBlur: 14,
          shadowColor: 'rgba(62,229,138,0.22)',
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: premiumPalette.mineral },
              { offset: 0.55, color: premiumPalette.cyan },
              { offset: 1, color: 'rgba(47,212,255,0.18)' },
            ],
          },
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 24,
            shadowColor: 'rgba(47,212,255,0.42)',
          },
        },
        markLine: summary.peak ? {
          symbol: 'none',
          label: {
            show: true,
            formatter: 'pico',
            color: premiumPalette.amber,
            fontSize: 10,
            fontWeight: 800,
          },
          lineStyle: { color: premiumPalette.amber, type: 'dashed', opacity: 0.52 },
          data: [{ xAxis: summary.peak.label }],
        } : undefined,
        data: chartRows.map((item) => item.toneladas),
      },
      {
        name: t.cycles,
        type: 'line',
        smooth: true,
        yAxisIndex: 1,
        symbol: 'circle',
        symbolSize: 7,
        lineStyle: { width: 3, color: premiumPalette.amber, shadowBlur: 12, shadowColor: 'rgba(255,201,74,0.38)' },
        itemStyle: { color: premiumPalette.amber, borderColor: premiumPalette.panel, borderWidth: 2 },
        areaStyle: {
          opacity: 0.11,
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: premiumPalette.amber },
              { offset: 1, color: 'rgba(255,201,74,0)' },
            ],
          },
        },
        data: chartRows.map((item) => item.ciclos),
      },
    ],
  } as EChartsOption), [chartRows, summary.peak, t, themeId])

  return (
    <section className="equipment-detail-panel equipment-hourly-panel">
      <div className="panel-header">
        <div><span className="panel-kicker">{t.hourlyHistory}</span><h3>{t.tonsAndCycles}</h3></div>
        <span className="panel-tag">{t.currentShift}</span>
      </div>
      <div className="equipment-chart-summary" aria-label="Resumen horario">
        <article className="is-peak">
          <span>Pico horario</span>
          <strong>{summary.peak?.label ?? '--:--'}</strong>
          <small>{summary.peak ? formatTons(summary.peak.toneladas) : t.noData}</small>
        </article>
        <article>
          <span>Total visible</span>
          <strong>{formatTons(summary.totalTonnes)}</strong>
          <small>{formatNumber(summary.totalCycles)} ciclos</small>
        </article>
        <article>
          <span>Promedio</span>
          <strong>{formatTons(summary.averageTonnes)}</strong>
          <small>por hora activa</small>
        </article>
      </div>
      <div className="equipment-hourly-chart">
        {chartRows.length > 0 ? (
          <ReactECharts option={option} notMerge lazyUpdate style={{ width: '100%', height: '100%' }} />
        ) : (
          <div className="equipment-hourly-empty">{t.noData}</div>
        )}
      </div>
    </section>
  )
}
