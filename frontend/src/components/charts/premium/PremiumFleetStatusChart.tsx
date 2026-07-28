import { memo, useMemo } from 'react'
import type { FleetStatus } from '../../../lib/api'
import { PremiumDonutChart, type PremiumDonutItem } from './PremiumDonutChart'
import { premiumPalette, useChartPaletteKey } from './chartTheme'
import { useModuleT } from '../../../i18n/useModuleT'
import { chartsT } from '../../../i18n/modules/charts'

interface Props {
  data?: FleetStatus
  height?: number
  loading?: boolean
  error?: boolean | string
}

function PremiumFleetStatusChartBase({ data, height = 300, loading, error }: Props) {
  const t = useModuleT(chartsT)
  const themeId = useChartPaletteKey()
  const chartData = useMemo<PremiumDonutItem[]>(() => {
    if (!data) return []
    return [
      { name: t.statusLabel('ACTIVO'), value: data.equipos_activos, color: premiumPalette.mineral },
      { name: t.statusLabel('DEMORA'), value: data.equipos_en_demora, color: premiumPalette.amber },
      { name: t.statusLabel('SIN ACTIVIDAD'), value: data.equipos_sin_actividad, color: premiumPalette.cyan },
      { name: t.statusLabel('MANTENCION'), value: data.equipos_mantencion, color: premiumPalette.red },
    ].filter((item) => item.value > 0)
  }, [data, t, themeId])

  return (
    <PremiumDonutChart
      data={chartData}
      height={height}
      loading={loading}
      error={error}
      centerLabel={t.fleetCenterLabel}
      pulseNames={[t.statusLabel('MANTENCION'), t.statusLabel('DEMORA')]}
    />
  )
}

export const PremiumFleetStatusChart = memo(PremiumFleetStatusChartBase)
