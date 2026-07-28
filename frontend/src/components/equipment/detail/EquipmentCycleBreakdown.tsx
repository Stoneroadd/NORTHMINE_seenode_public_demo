import { useMemo } from 'react'
import type { EquipmentCycleTimes } from '../../../types/equipment'
import { useModuleT } from '../../../i18n/useModuleT'
import { equipmentT } from '../../../i18n/modules/equipment'

export function EquipmentCycleBreakdown({ cycleTimes }: { cycleTimes: EquipmentCycleTimes }) {
  const t = useModuleT(equipmentT)
  const labels = useMemo<Array<[keyof EquipmentCycleTimes, string, string]>>(() => [
    ['tiempo_vacio_min', t.emptyTravel, 'empty'],
    ['tiempo_cargado_min', t.loadTravelUnload, 'loaded'],
  ], [t])
  const values = labels.map(([key]) => cycleTimes[key]).filter((value): value is number => value != null)
  const total = cycleTimes.total_ciclo ?? values.reduce((sum, value) => sum + value, 0)
  const max = Math.max(total, ...values, 1)

  return (
    <section className="equipment-detail-panel">
      <div className="panel-header">
        <div><span className="panel-kicker">{t.operatingCycle}</span><h3>{t.timeBreakdown}</h3></div>
        <span className="panel-tag">
          {cycleTimes.total_ciclo != null ? t.totalMin(cycleTimes.total_ciclo.toLocaleString('es-CL')) : t.noData}
        </span>
      </div>
      <div className="cycle-breakdown-list">
        {labels.map(([key, label, tone]) => {
          const value = cycleTimes[key]
          if (value == null) {
            return (
              <div className={`cycle-breakdown-row is-${tone}`} key={key}>
                <span>{label}</span>
                <div className="cycle-bar-track"><i style={{ width: '0%' }} /></div>
                <strong>{t.noData}</strong>
              </div>
            )
          }
          const width = `${Math.max(9, (value / max) * 100)}%`
          return (
            <div className={`cycle-breakdown-row is-${tone}`} key={key}>
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
