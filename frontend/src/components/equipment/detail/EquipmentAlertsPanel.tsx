import { AlertTriangle } from 'lucide-react'
import type { EquipmentAlert } from '../../../types/equipment'
import { AlertSeverityBadge } from '../../alerts/AlertSeverityBadge'
import { useModuleT } from '../../../i18n/useModuleT'
import { equipmentT } from '../../../i18n/modules/equipment'

export function EquipmentAlertsPanel({ alerts }: { alerts: EquipmentAlert[] }) {
  const t = useModuleT(equipmentT)
  return (
    <section className="equipment-detail-panel">
      <div className="panel-header">
        <div><span className="panel-kicker">{t.alertsAssociated}</span><h3>{t.operationalRisk}</h3></div>
        <span className="panel-tag">{t.activeAlerts(alerts.length)}</span>
      </div>
      <div className="equipment-alert-list">
        {alerts.length === 0 && (
          <div className="equipment-empty-message">{t.noActiveAlerts}</div>
        )}
        {alerts.map((alert) => (
          <article key={alert.id} className="equipment-alert-row">
            <AlertTriangle size={17} />
            <div>
              <div className="equipment-alert-head">
                <strong>{alert.titulo}</strong>
                <AlertSeverityBadge severity={alert.severidad} />
              </div>
              <p>{alert.descripcion}</p>
              <span>{alert.recomendacion}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
