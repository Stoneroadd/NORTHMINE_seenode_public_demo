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

// Rampa alineada a la paleta NORTHMINE (mineral/cyan), con celdas en 0
// prácticamente invisibles para que la lectura destaque dónde hay actividad.
const HEATMAP_RAMP = [
  'rgba(255,255,255,0.03)',
  'rgba(154,168,181,0.18)',
  'rgba(47,212,255,0.38)',
  'rgba(62,229,138,0.82)',
]

function padHour(value: number | string) {
  return String(value).padStart(2, '0')
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
    const hours = Array.from(new Set(data.map((item) => padHour(item.hora)))).sort()
    const equipments = Array.from(new Set(data.map((item) => item.equipo))).sort()
    const values = data.map((item) => {
      const x = hours.indexOf(padHour(item.hora))
      const y = equipments.indexOf(item.equipo)
      const value = Number(item[metric] ?? 0)
      return [x, y, value, item.toneladas, item.ciclos ?? 0, item.demoras ?? 0]
    })
    const max = Math.max(...values.map((item) => Number(item[2])), 1)

    const currentHour = padHour(new Date().getHours())
    const currentHourIdx = hours.indexOf(currentHour)
    const currentHourLabel = `${currentHour}:00`

    return {
      animationDuration: 850,
      animationEasing: 'cubicOut',
      grid: { top: 20, right: 18, bottom: 58, left: 86 },
      tooltip: {
        ...tooltipBase(),
        trigger: 'item',
        position: 'top',
        formatter: (param: unknown) => {
          const item = param as { value: [number, number, number, number, number, number] }
          const [x, y, value, tons, cycles, delays] = item.value
          const pct = max > 1 ? Math.round((value / max) * 100) : 0
          return [
            `<strong>${equipments[y]} · ${hours[x]}:00</strong>`,
            `${t.metricLabel(metric)}: <strong>${metric === 'toneladas' ? formatTons(value) : formatNumber(value)}</strong>`,
            `<span style="color:${premiumPalette.muted};font-size:11px">${t.shareOfMaxTooltip(String(pct))}</span>`,
            '',
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
        axisLabel: {
          ...axisLabel,
          formatter: (value: string | number) => {
            const label = String(value)
            return label === currentHourLabel ? '{live|' + label + '}' : label
          },
          rich: {
            live: { color: premiumPalette.cyan, fontWeight: 700 },
          },
        },
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
        bottom: 6,
        itemWidth: 10,
        itemHeight: 120,
        textStyle: { color: premiumPalette.muted, fontSize: 10 },
        inRange: { color: HEATMAP_RAMP },
      },
      series: [{
        name: metric,
        type: 'heatmap',
        data: values,
        itemStyle: {
          borderRadius: 3,
          borderColor: premiumPalette.panel,
          borderWidth: 1,
        },
        emphasis: {
          itemStyle: {
            borderColor: premiumPalette.text,
            borderWidth: 1,
            shadowBlur: 14,
            shadowColor: 'rgba(0,0,0,0.36)',
          },
        },
        markArea: currentHourIdx >= 0
          ? {
              silent: true,
              itemStyle: { color: 'rgba(47,212,255,0.05)' },
              label: {
                show: true,
                position: 'top',
                color: premiumPalette.cyan,
                fontWeight: 700,
                fontSize: 9,
                letterSpacing: 1.5,
                formatter: t.liveTag.toUpperCase(),
                distance: 2,
              },
              data: [[{ xAxis: currentHourIdx }, { xAxis: currentHourIdx }]],
            }
          : undefined,
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
