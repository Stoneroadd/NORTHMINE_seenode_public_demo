import { memo, useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import type { EChartsOption } from 'echarts'
import { useAnimatedNumber } from '../../../hooks/useAnimatedNumber'
import { useDemoLivePulse } from '../../../hooks/useDemoLivePulse'
import { PremiumChartFrame } from './PremiumChartFrame'
import { formatNumber, formatTons, premiumPalette, tooltipBase } from './chartTheme'
import { useModuleT } from '../../../i18n/useModuleT'
import { chartsT } from '../../../i18n/modules/charts'

interface Props {
  value: number
  meta?: number
  current?: number
  breach?: number
  height?: number
  loading?: boolean
  error?: boolean | string
  label?: string
}

function gaugeColor(value: number) {
  if (value >= 100) return premiumPalette.mineral
  if (value >= 90) return premiumPalette.amber
  return premiumPalette.red
}

function PremiumGaugeChartBase({
  value,
  meta,
  current,
  breach,
  height = 300,
  loading,
  error,
  label,
}: Props) {
  const t = useModuleT(chartsT)
  const resolvedLabel = label ?? t.complianceLabel
  const animated = useAnimatedNumber(value, { durationMs: 900 })
  const pulse = useDemoLivePulse({ enabled: value < 100, intervalMs: 2600, amplitude: 0.02 })
  const color = gaugeColor(value)

  const option = useMemo<EChartsOption>(() => ({
    animationDuration: 1000,
    animationEasing: 'cubicOut',
    tooltip: {
      ...tooltipBase(),
      trigger: 'item',
      formatter: () => [
        `<strong>${resolvedLabel}</strong>`,
        t.complianceTooltip(formatNumber(value, 1)),
        current === undefined ? '' : t.currentTooltip(formatTons(current)),
        meta === undefined ? '' : t.targetTooltip(formatTons(meta)),
        breach === undefined ? '' : t.gapTooltip(formatTons(breach)),
      ].filter(Boolean).join('<br/>'),
    },
    series: [
      {
        type: 'gauge',
        min: 0,
        max: 125,
        startAngle: 210,
        endAngle: -30,
        radius: '94%',
        center: ['50%', '56%'],
        progress: {
          show: true,
          width: 14,
          roundCap: true,
          itemStyle: {
            color,
            shadowBlur: value < 100 ? 10 + Math.abs(pulse) * 520 : 4,
            shadowColor: color,
          },
        },
        axisLine: {
          roundCap: true,
          lineStyle: {
            width: 14,
            color: [[1, 'rgba(255,255,255,0.08)']],
          },
        },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        pointer: {
          show: true,
          length: '58%',
          width: 4,
          itemStyle: { color: premiumPalette.steel },
        },
        anchor: {
          show: true,
          size: 8,
          itemStyle: { color: premiumPalette.text },
        },
        detail: {
          valueAnimation: true,
          offsetCenter: [0, '34%'],
          color: premiumPalette.text,
          fontSize: 28,
          fontWeight: 800,
          formatter: () => `${formatNumber(animated, 1)}%`,
        },
        title: {
          offsetCenter: [0, '55%'],
          color: premiumPalette.muted,
          fontSize: 12,
          fontWeight: 600,
        },
        data: [{ value: Math.min(value, 125), name: resolvedLabel }],
      },
    ],
  }), [animated, breach, color, current, resolvedLabel, meta, pulse, t, value])

  return (
    <PremiumChartFrame height={height} loading={loading} error={error} empty={Number.isNaN(value)}>
      <ReactECharts option={option} notMerge lazyUpdate style={{ width: '100%', height: '100%' }} />
    </PremiumChartFrame>
  )
}

export const PremiumGaugeChart = memo(PremiumGaugeChartBase)
