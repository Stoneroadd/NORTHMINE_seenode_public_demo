import { useMemo } from 'react'
import type { EquipmentCycleTimes } from '../../../types/equipment'
import { useModuleT } from '../../../i18n/useModuleT'
import { equipmentT } from '../../../i18n/modules/equipment'

export function EquipmentCycleBreakdown({ cycleTimes }: { cycleTimes: EquipmentCycleTimes }) {
  const t = useModuleT(equipmentT)
  const labels = useMemo<Array<[keyof EquipmentCycleTimes, string]>>(() => [
    ['tiempo_vacio_min', t.emptyTravel],
    ['tiempo_cargado_min', t.loadTravelUnload],
  ], [t])
  const values = labels.map(([key]) => cycleTimes[key]).filter((value): value is number => value != null)
  const max = Math.max(...values, 1)

  return (
    <section className="equipment-detail-panel">
      <div className="panel-header">
        <div><span className="panel-kicker">{t.operatingCycle}</span><h3>{t.timeBreakdown}</h3></div>
        <span className="panel-tag">
          {cycleTimes.total_ciclo != null ? t.totalMin(cycleTimes.total_ciclo.toLocaleString('es-CL')) : t.noData}
        </span>
      </div>
      <div className="cycle-breakdown-list">
        {labels.map(([key, label]) => {
          const value = cycleTimes[key]
          if (value == null) {
            return (
              <div className="cycle-breakdown-row" key={key}>
                <span>{label}</span>
                <div className="cycle-bar-track"><i style={{ width: '0%' }} /></div>
                <strong>{t.noData}</strong>
              </div>
            )
          }
          const width = `${Math.max(8, (value / max) * 100)}%`
          return (
            <div className="cycle-breakdown-row" key={key}>
              <span>{label}</span>
              <div className="cycle-bar-track"><i style={{ width }} /></div>
              <strong>{t.minValue(value.toLocaleString('es-CL'))}</strong>
            </div>
          )
        })}
      </div>
    </section>
  )
}
