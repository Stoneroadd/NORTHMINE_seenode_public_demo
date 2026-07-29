import { useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import type { EChartsOption } from 'echarts'
import type { EquipmentHourlyPoint } from '../../../types/equipment'
import { axisLabel, formatNumber, formatTons, premiumPalette, tooltipBase } from '../../charts/premium/chartTheme'
import { useModuleT } from '../../../i18n/useModuleT'
import { equipmentT } from '../../../i18n/modules/equipment'

export function EquipmentHourlyChart({ data }: { data: EquipmentHourlyPoint[] }) {
  const t = useModuleT(equipmentT)
  const option = useMemo<EChartsOption>(() => ({
    color: [premiumPalette.mineral, premiumPalette.cyan],
    animationDuration: 850,
    animationEasing: 'cubicOut',
    grid: { top: 28, right: 18, bottom: 38, left: 62 },
    legend: {
      top: 0,
      right: 0,
      textStyle: { color: premiumPalette.muted, fontSize: 11 },
    },
    tooltip: {
      ...tooltipBase(),
      trigger: 'axis',
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
      data: data.map((item) => `${String(item.hora).padStart(2, '0')}:00`),
      axisLine: { lineStyle: { color: premiumPalette.grid } },
      axisTick: { show: false },
      axisLabel,
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: premiumPalette.grid } },
      axisLabel: {
        ...axisLabel,
        formatter: (value: number) => formatNumber(value),
      },
    },
    series: [
      {
        name: t.tons,
        type: 'bar',
        barMaxWidth: 26,
        itemStyle: {
          borderRadius: [6, 6, 0, 0],
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: premiumPalette.mineral },
              { offset: 1, color: 'rgba(117, 214, 160, 0.35)' },
            ],
          },
          shadowBlur: 14,
          shadowColor: premiumPalette.mineral,
        },
        emphasis: { itemStyle: { shadowBlur: 22 } },
        data: data.map((item) => item.toneladas),
      },
      {
        name: t.cycles,
        type: 'line',
        smooth: true,
        yAxisIndex: 0,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { width: 2.6, color: premiumPalette.cyan, shadowBlur: 12, shadowColor: premiumPalette.cyan },
        itemStyle: { color: premiumPalette.cyan },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(56, 189, 248, 0.20)' },
              { offset: 1, color: 'rgba(56, 189, 248, 0.01)' },
            ],
          },
        },
        data: data.map((item) => item.ciclos),
      },
    ],
  } as EChartsOption), [data, t])

  return (
    <section className="equipment-detail-panel">
      <div className="panel-header">
        <div><span className="panel-kicker">{t.hourlyHistory}</span><h3>{t.tonsAndCycles}</h3></div>
        <span className="panel-tag">{t.currentShift}</span>
      </div>
      <div className="equipment-hourly-chart">
        <ReactECharts option={option} notMerge lazyUpdate style={{ width: '100%', height: '100%' }} />
      </div>
    </section>
  )
}
