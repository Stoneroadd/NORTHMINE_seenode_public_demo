import { memo, useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import type { EChartsOption } from 'echarts'
import type { LoadingUnit, RankingItem } from '../../../lib/api'
import { PremiumChartFrame } from './PremiumChartFrame'
import { axisLabel, chartDataIndex, formatNumber, formatTons, hasValues, premiumPalette, tooltipBase, useChartPaletteKey } from './chartTheme'
import { useModuleT } from '../../../i18n/useModuleT'
import { chartsT, type ChartsT } from '../../../i18n/modules/charts'

type RankingInput = LoadingUnit | RankingItem

interface Props {
  data: RankingInput[]
  height?: number
  loading?: boolean
  error?: boolean | string
}

function unitId(item: RankingInput, t: ChartsT) {
  return ('carguio_id' in item && item.carguio_id) ? item.carguio_id : t.notAvailable
}

function tons(item: RankingInput) {
  return 'toneladas' in item ? item.toneladas : item.tonelaje
}

function cycles(item: RankingInput) {
  return item.ciclos
}

function tph(item: RankingInput) {
  if ('rendimiento_tph' in item) return item.rendimiento_tph
  return Math.round(tons(item) / 12)
}

function trucks(item: RankingInput) {
  if ('camiones_atendidos' in item) return item.camiones_atendidos
  return undefined
}

function PremiumLoadingRankingChartBase({
  data,
  height = 330,
  loading,
  error,
}: Props) {
  const t = useModuleT(chartsT)
  const themeId = useChartPaletteKey()
  const rows = useMemo(() => (
    [...data]
      .sort((a, b) => tons(b) - tons(a))
      .slice(0, 7)
      .reverse()
  ), [data])

  const option = useMemo<EChartsOption>(() => {
    const maxTph = Math.max(...rows.map(tph), 1)

    return {
      animationDuration: 850,
      animationEasing: 'quarticOut',
      grid: { top: 18, right: 28, bottom: 26, left: 92 },
      tooltip: {
        ...tooltipBase(),
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: unknown) => {
          const index = chartDataIndex(params)
          const item = index === undefined ? undefined : rows[index]
          if (!item) return ''
          return [
            `<strong>${unitId(item, t)}</strong>`,
            t.tonnageTooltip(formatTons(tons(item))),
            t.performanceTooltip(`${formatNumber(tph(item), 1)} tph`),
            t.cyclesTooltip(formatNumber(cycles(item))),
            trucks(item) === undefined ? '' : t.trucksServedTooltip(formatNumber(trucks(item) ?? 0)),
          ].filter(Boolean).join('<br/>')
        },
      },
      xAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: premiumPalette.grid } },
        axisLabel: {
          ...axisLabel,
          formatter: (value: number) => formatNumber(value),
        },
      },
      yAxis: {
        type: 'category',
        data: rows.map((item) => unitId(item, t)),
        axisTick: { show: false },
        axisLine: { lineStyle: { color: premiumPalette.grid } },
        axisLabel,
      },
      series: [
        {
          name: t.tonnageSeries,
          type: 'bar',
          barWidth: 18,
          data: rows.map((item) => ({
            value: tons(item),
            itemStyle: {
              color: tph(item) >= maxTph * 0.88
                ? premiumPalette.mineral
                : tph(item) >= maxTph * 0.72
                  ? premiumPalette.cyan
                  : premiumPalette.amber,
              borderRadius: [0, 7, 7, 0],
            },
          })),
          emphasis: {
            focus: 'series',
            itemStyle: { shadowBlur: 14, shadowColor: 'rgba(0,0,0,0.34)' },
          },
        },
      ],
    }
  }, [rows, t, themeId])

  return (
    <PremiumChartFrame height={height} loading={loading} error={error} empty={!hasValues(data)}>
      <ReactECharts option={option} notMerge lazyUpdate style={{ width: '100%', height: '100%' }} />
    </PremiumChartFrame>
  )
}

export const PremiumLoadingRankingChart = memo(PremiumLoadingRankingChartBase)
