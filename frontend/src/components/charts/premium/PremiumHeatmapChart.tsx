import { memo, useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import type { EChartsOption } from 'echarts'
import { PremiumChartFrame } from './PremiumChartFrame'
import { axisLabel, formatNumber, formatTons, hasValues, premiumPalette, tooltipBase, useChartPaletteKey } from './chartTheme'
import { useModuleT } from '../../../i18n/useModuleT'
import { chartsT } from '../../../i18n/modules/charts'

export interface PremiumHeatmapCell {
  hora: number | string
  equipo: string
  toneladas: number
  ciclos?: number
  demoras?: number
}

interface Props {
  data: PremiumHeatmapCell[]
  height?: number
  loading?: boolean
  error?: boolean | string
  metric?: 'toneladas' | 'ciclos' | 'demoras'
}

function PremiumHeatmapChartBase({
  data,
  height = 330,
  loading,
  error,
  metric = 'toneladas',
}: Props) {
  const t = useModuleT(chartsT)
  const themeId = useChartPaletteKey()
  const option = useMemo<EChartsOption>(() => {
    const hours = Array.from(new Set(data.map((item) => String(item.hora).padStart(2, '0')))).sort()
    const equipments = Array.from(new Set(data.map((item) => item.equipo))).sort()
    const values = data.map((item) => {
      const x = hours.indexOf(String(item.hora).padStart(2, '0'))
      const y = equipments.indexOf(item.equipo)
      const value = Number(item[metric] ?? 0)
      return [x, y, value, item.toneladas, item.ciclos ?? 0, item.demoras ?? 0]
    })
    const max = Math.max(...values.map((item) => Number(item[2])), 1)

    return {
      animationDuration: 850,
      animationEasing: 'cubicOut',
      grid: { top: 20, right: 18, bottom: 58, left: 86 },
      tooltip: {
        ...tooltipBase(),
        position: 'top',
        formatter: (param: unknown) => {
          const item = param as { value: [number, number, number, number, number, number] }
          const [x, y, value, tons, cycles, delays] = item.value
          const metricLabel = metric === 'toneladas' ? formatTons(value) : formatNumber(value)
          return [
            `<strong>${equipments[y]} - ${hours[x]}:00</strong>`,
            `${t.metricLabel(metric)}: <strong>${metricLabel}</strong>`,
            t.tonnageTooltip(formatTons(tons)),
            t.cyclesTooltip(formatNumber(cycles)),
            delays ? t.delaysTooltip(formatNumber(delays)) : '',
          ].filter(Boolean).join('<br/>')
        },
      },
      xAxis: {
        type: 'category',
        data: hours.map((hour) => `${hour}:00`),
        splitArea: { show: true, areaStyle: { color: ['rgba(255,255,255,0.018)', 'transparent'] } },
        axisTick: { show: false },
        axisLine: { lineStyle: { color: premiumPalette.grid } },
        axisLabel,
      },
      yAxis: {
        type: 'category',
        data: equipments,
        splitArea: { show: true, areaStyle: { color: ['rgba(255,255,255,0.014)', 'transparent'] } },
        axisTick: { show: false },
        axisLine: { lineStyle: { color: premiumPalette.grid } },
        axisLabel,
      },
      visualMap: {
        min: 0,
        max,
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: 8,
        textStyle: { color: premiumPalette.muted },
        inRange: {
          color: ['rgba(102,113,127,0.20)', 'rgba(122,167,199,0.54)', 'rgba(117,214,160,0.86)'],
        },
      },
      series: [{
        name: metric,
        type: 'heatmap',
        data: values,
        emphasis: {
          itemStyle: {
            borderColor: premiumPalette.text,
            borderWidth: 1,
            shadowBlur: 14,
            shadowColor: 'rgba(0,0,0,0.36)',
          },
        },
      }],
    }
  }, [data, metric, t, themeId])

  return (
    <PremiumChartFrame height={height} loading={loading} error={error} empty={!hasValues(data)}>
      <ReactECharts option={option} notMerge lazyUpdate style={{ width: '100%', height: '100%' }} />
    </PremiumChartFrame>
  )
}

export const PremiumHeatmapChart = memo(PremiumHeatmapChartBase)
