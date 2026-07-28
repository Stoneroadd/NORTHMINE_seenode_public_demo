import { memo, useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import type { EChartsOption } from 'echarts'
import { PremiumChartFrame } from './PremiumChartFrame'
import { axisLabel, baseGrid, formatNumber, hasValues, premiumPalette, tooltipBase, useChartPaletteKey } from './chartTheme'
import { useModuleT } from '../../../i18n/useModuleT'
import { chartsT } from '../../../i18n/modules/charts'

export interface PremiumBarSeries {
  key: string
  name: string
  color?: string
}

interface Props {
  data: Array<Record<string, number | string>>
  xKey: string
  series: PremiumBarSeries[]
  height?: number
  loading?: boolean
  error?: boolean | string
  horizontal?: boolean
}

function PremiumBarChartBase({
  data,
  xKey,
  series,
  height = 320,
  loading,
  error,
  horizontal = false,
}: Props) {
  const t = useModuleT(chartsT)
  const themeId = useChartPaletteKey()
  const option = useMemo<EChartsOption>(() => {
    // Keep the default series colors consistent with the operational modules.
    // Explicit colors are still supported for charts with a domain-specific state.
    const moduleColors = [premiumPalette.cyan, premiumPalette.mineral, premiumPalette.amber, premiumPalette.red]
    const seriesColor = (item: PremiumBarSeries, index: number) => item.color ?? moduleColors[index % moduleColors.length]
    const categories = data.map((item) => String(item[xKey] ?? t.notAvailable))
    const valueAxis = {
      type: 'value' as const,
      splitLine: { lineStyle: { color: premiumPalette.grid } },
      axisLabel: {
        ...axisLabel,
        formatter: (value: number) => formatNumber(value),
      },
    }
    const categoryAxis = {
      type: 'category' as const,
      data: categories,
      axisTick: { show: false },
      axisLine: { lineStyle: { color: premiumPalette.grid } },
      axisLabel,
    }

    return {
      color: series.map(seriesColor),
      animationDuration: 820,
      animationEasing: 'quarticOut',
      grid: horizontal ? { top: 20, right: 28, bottom: 24, left: 92 } : baseGrid,
      legend: {
        top: 0,
        right: 4,
        textStyle: { color: premiumPalette.muted, fontSize: 11 },
      },
      tooltip: {
        ...tooltipBase(),
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: unknown) => {
          const rows = Array.isArray(params) ? params : [params]
          const first = rows[0] as { axisValue?: string }
          const detail = rows.map((row) => {
            const current = row as { marker: string; seriesName: string; value: number }
            return `${current.marker}${current.seriesName}: <strong>${formatNumber(Number(current.value))}</strong>`
          }).join('<br/>')
          return `<strong>${first?.axisValue ?? ''}</strong><br/>${detail}`
        },
      },
      xAxis: horizontal ? valueAxis : categoryAxis,
      yAxis: horizontal ? categoryAxis : valueAxis,
      series: series.map((item, index) => ({
        name: item.name,
        type: 'bar',
        barMaxWidth: 28,
        emphasis: { focus: 'series' },
        itemStyle: {
          color: seriesColor(item, index),
          borderRadius: horizontal ? [0, 6, 6, 0] : [6, 6, 0, 0],
        },
        data: data.map((row) => Number(row[item.key] ?? 0)),
      })),
    } as EChartsOption
  }, [data, horizontal, series, xKey, t, themeId])

  return (
    <PremiumChartFrame height={height} loading={loading} error={error} empty={!hasValues(data)}>
      <ReactECharts option={option} notMerge lazyUpdate style={{ width: '100%', height: '100%' }} />
    </PremiumChartFrame>
  )
}

export const PremiumBarChart = memo(PremiumBarChartBase)
