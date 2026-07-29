import { memo, useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import type { EChartsOption } from 'echarts'
import { useDemoLivePulse } from '../../../hooks/useDemoLivePulse'
import { PremiumChartFrame } from './PremiumChartFrame'
import { axisLabel, baseGrid, formatNumber, formatTons, hasValues, premiumPalette, tooltipBase } from './chartTheme'
import { useModuleT } from '../../../i18n/useModuleT'
import { chartsT } from '../../../i18n/modules/charts'

export interface PremiumLineAreaPoint {
  label: string
  toneladas: number
  acumulado?: number
  meta?: number
}

interface Props {
  data: PremiumLineAreaPoint[]
  height?: number
  loading?: boolean
  error?: boolean | string
  showAccumulated?: boolean
  showMeta?: boolean
  bestLabel?: string
  worstLabel?: string
  demoPulse?: boolean
}

function PremiumLineAreaChartBase({
  data,
  height = 330,
  loading,
  error,
  showAccumulated = true,
  showMeta = true,
  bestLabel,
  worstLabel,
  demoPulse = true,
}: Props) {
  const t = useModuleT(chartsT)
  const pulse = useDemoLivePulse({ enabled: demoPulse, intervalMs: 5200, amplitude: 0.012 })

  const option = useMemo<EChartsOption>(() => {
    const labels = data.map((item) => item.label)
    const toneladas = data.map((item) => item.toneladas)
    const acumulado = data.map((item) => item.acumulado ?? null)
    const meta = data.map((item) => item.meta ?? null)
    const bestValue = data.find((item) => item.label === bestLabel)?.toneladas ?? (toneladas.length ? Math.max(...toneladas) : 0)
    const worstValue = data.find((item) => item.label === worstLabel)?.toneladas ?? (toneladas.length ? Math.min(...toneladas) : 0)

    return {
      color: [premiumPalette.mineral, premiumPalette.cyan, premiumPalette.amber],
      animationDuration: 900,
      animationEasing: 'cubicOut',
      grid: baseGrid,
      legend: {
        top: 0,
        right: 4,
        icon: 'roundRect',
        textStyle: { color: premiumPalette.muted, fontSize: 11 },
      },
      tooltip: {
        ...tooltipBase(),
        formatter: (params: unknown) => {
          const rows = Array.isArray(params) ? params : [params]
          const first = rows[0] as { axisValue?: string; dataIndex?: number }
          const item = data[first?.dataIndex ?? 0]
          const diff = item?.meta === undefined ? null : item.toneladas - item.meta
          const detail = rows
            .map((row) => {
              const current = row as { marker: string; seriesName: string; value: number | null }
              if (current.value === null || current.value === undefined) return ''
              const suffix = current.seriesName.toLowerCase().includes('meta') ? 't' : 't'
              return `${current.marker}${current.seriesName}: <strong>${formatNumber(Number(current.value))} ${suffix}</strong>`
            })
            .filter(Boolean)
            .join('<br/>')

          return [
            `<strong>${first?.axisValue ?? ''}</strong>`,
            detail,
            diff === null ? '' : t.targetDifferenceTooltip(formatTons(diff)),
          ].filter(Boolean).join('<br/>')
        },
      },
      xAxis: {
        type: 'category',
        data: labels,
        boundaryGap: false,
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
      dataZoom: [
        { type: 'inside', throttle: 80 },
        {
          type: 'slider',
          height: 18,
          bottom: 10,
          borderColor: 'transparent',
          fillerColor: 'rgba(117,214,160,0.16)',
          handleStyle: { color: premiumPalette.mineral },
          textStyle: { color: premiumPalette.slate },
          brushSelect: false,
        },
      ],
      series: [
        {
          name: t.tonsPerHourSeries,
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 5 + Math.abs(pulse) * 120,
          emphasis: { focus: 'series' },
          lineStyle: { width: 3, color: premiumPalette.mineral },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(117,214,160,0.24)' },
                { offset: 1, color: 'rgba(117,214,160,0.015)' },
              ],
            },
          },
          data: toneladas,
          markPoint: {
            symbolSize: 46,
            label: { color: '#06100B', fontWeight: 800, fontSize: 10 },
            itemStyle: { color: premiumPalette.amber },
            data: [
              ...(bestLabel ? [{ name: t.bestHourPoint, coord: [bestLabel, bestValue], value: 'MAX' }] : []),
              ...(worstLabel ? [{ name: t.worstHourPoint, coord: [worstLabel, worstValue], value: 'MIN' }] : []),
            ],
          },
        },
        ...(showAccumulated
          ? [{
              name: t.accumulatedSeries,
              type: 'line' as const,
              smooth: true,
              showSymbol: false,
              lineStyle: { width: 2, color: premiumPalette.cyan },
              data: acumulado,
            }]
          : []),
        ...(showMeta
          ? [{
              name: t.hourlyTargetSeries,
              type: 'line' as const,
              smooth: true,
              showSymbol: false,
              lineStyle: { width: 2, color: premiumPalette.amber, type: 'dashed' as const },
              data: meta,
            }]
          : []),
      ],
    } as EChartsOption
  }, [bestLabel, data, pulse, showAccumulated, showMeta, t, worstLabel])

  return (
    <PremiumChartFrame height={height} loading={loading} error={error} empty={!hasValues(data)}>
      <ReactECharts option={option} notMerge lazyUpdate style={{ width: '100%', height: '100%' }} />
    </PremiumChartFrame>
  )
}

export const PremiumLineAreaChart = memo(PremiumLineAreaChartBase)
