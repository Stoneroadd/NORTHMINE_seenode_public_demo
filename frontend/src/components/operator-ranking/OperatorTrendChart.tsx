import ReactECharts from 'echarts-for-react'
import type { EChartsOption } from 'echarts'
import type { OperatorTrendPoint } from '../../types/operatorRanking'
import { axisLabel, premiumPalette, tooltipBase, useChartPaletteKey } from '../charts/premium/chartTheme'
import { useModuleT } from '../../i18n/useModuleT'
import { operatorRankingT } from '../../i18n/modules/operatorRanking'

export function OperatorTrendChart({ points, height = 260 }: { points: OperatorTrendPoint[]; height?: number }) {
  const t = useModuleT(operatorRankingT)
  // Se suscribe al tema activo solo para forzar un re-render cuando cambia:
  // el option de ECharts se recalcula en cada render usando premiumPalette,
  // que lee las variables CSS del tema en ese momento.
  useChartPaletteKey()
  const option: EChartsOption = {
    animationDuration: 750,
    grid: { top: 28, right: 28, bottom: 42, left: 48 },
    tooltip: {
      ...tooltipBase(),
      formatter: (params: unknown) => {
        const rows = Array.isArray(params) ? params : [params]
        return rows.map((row) => {
          const item = row as { seriesName: string; value: number | string; axisValue: string }
          return `${item.seriesName}: ${item.value}`
        }).join('<br/>')
      },
    },
    legend: { bottom: 0, textStyle: { color: premiumPalette.muted, fontSize: 11 } },
    xAxis: {
      type: 'category',
      data: points.map((point) => `${point.fecha.slice(5)} ${point.turno[0]}`),
      axisLabel,
      axisTick: { show: false },
      axisLine: { lineStyle: { color: premiumPalette.grid } },
    },
    yAxis: [
      {
        type: 'value',
        min: 0,
        max: 100,
        axisLabel: { ...axisLabel, formatter: (value: number) => `${value}%` },
        splitLine: { lineStyle: { color: premiumPalette.grid } },
      },
      {
        type: 'value',
        axisLabel: { ...axisLabel, formatter: (value: number) => `${Math.round(value / 1000)}k t` },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: t.trend_score,
        type: 'line',
        smooth: true,
        symbolSize: 6,
        data: points.map((point) => point.score_global),
        lineStyle: { color: premiumPalette.mineral, width: 3 },
        itemStyle: { color: premiumPalette.mineral },
        areaStyle: { color: premiumPalette.mineral, opacity: 0.08 },
      },
      {
        name: t.trend_disponibilidad,
        type: 'line',
        smooth: true,
        symbolSize: 5,
        data: points.map((point) => point.disponibilidad),
        lineStyle: { color: premiumPalette.cyan, width: 2 },
        itemStyle: { color: premiumPalette.cyan },
      },
      {
        name: t.trend_toneladas,
        type: 'bar',
        yAxisIndex: 1,
        barMaxWidth: 16,
        data: points.map((point) => point.toneladas),
        itemStyle: { color: 'rgba(255,204,51,0.42)', borderRadius: [4, 4, 0, 0] },
      },
    ],
  }

  return <ReactECharts option={option} notMerge lazyUpdate style={{ width: '100%', height }} />
}
