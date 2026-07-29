import { memo, useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import type { EChartsOption } from 'echarts'
import { useDemoLivePulse } from '../../../hooks/useDemoLivePulse'
import { PremiumChartFrame } from './PremiumChartFrame'
import { formatNumber, hasValues, premiumPalette, tooltipBase, useChartPaletteKey } from './chartTheme'
import { useModuleT } from '../../../i18n/useModuleT'
import { chartsT } from '../../../i18n/modules/charts'

export interface PremiumDonutItem {
  name: string
  value: number
  color?: string
}

interface Props {
  data: PremiumDonutItem[]
  height?: number
  loading?: boolean
  error?: boolean | string
  centerLabel?: string
  pulseNames?: string[]
  onSegmentClick?: (name: string) => void
}

function PremiumDonutChartBase({
  data,
  height = 300,
  loading,
  error,
  centerLabel = 'Total',
  pulseNames = [],
  onSegmentClick,
}: Props) {
  const t = useModuleT(chartsT)
  const themeId = useChartPaletteKey()
  const pulse = useDemoLivePulse({ enabled: pulseNames.length > 0, intervalMs: 2800, amplitude: 0.018 })
  const total = data.reduce((sum, item) => sum + item.value, 0)

  const option = useMemo<EChartsOption>(() => ({
    color: data.map((item) => item.color ?? premiumPalette.cyan),
    animationDuration: 900,
    animationEasing: 'cubicOut',
    tooltip: {
      ...tooltipBase(),
      trigger: 'item',
      formatter: (param: unknown) => {
        const item = param as { name: string; value: number; percent: number; marker: string }
        return `${item.marker}<strong>${item.name}</strong><br/>${formatNumber(item.value)} ${t.equipmentEventsUnit}<br/>${formatNumber(item.percent, 1)}%`
      },
    },
    legend: {
      bottom: 0,
      icon: 'circle',
      textStyle: { color: premiumPalette.muted, fontSize: 11 },
    },
    graphic: [
      {
        type: 'text',
        left: 'center',
        top: '42%',
        style: {
          text: `${formatNumber(total)}\n${centerLabel}`,
          fill: premiumPalette.text,
          font: '700 20px Inter, sans-serif',
          align: 'center',
          lineHeight: 24,
        },
      },
    ],
    series: [
      {
        name: centerLabel,
        type: 'pie',
        radius: ['58%', '78%'],
        center: ['50%', '44%'],
        avoidLabelOverlap: true,
        padAngle: 3,
        label: { show: false },
        labelLine: { show: false },
        emphasis: {
          scale: true,
          scaleSize: 7,
          itemStyle: { shadowBlur: 18, shadowColor: 'rgba(0,0,0,0.35)' },
        },
        data: data.map((item) => ({
          ...item,
          itemStyle: {
            color: item.color,
            shadowBlur: pulseNames.includes(item.name) && item.value > 0 ? 10 + Math.abs(pulse) * 700 : 0,
            shadowColor: item.color ?? premiumPalette.red,
          },
        })),
      },
    ],
  }), [centerLabel, data, pulse, pulseNames, total, t, themeId])

  return (
    <PremiumChartFrame height={height} loading={loading} error={error} empty={!hasValues(data)}>
      <ReactECharts
        option={option}
        notMerge
        lazyUpdate
        onEvents={onSegmentClick ? { click: (params: { name?: string }) => params.name && onSegmentClick(params.name) } : undefined}
        style={{ width: '100%', height: '100%' }}
      />
    </PremiumChartFrame>
  )
}

export const PremiumDonutChart = memo(PremiumDonutChartBase)
