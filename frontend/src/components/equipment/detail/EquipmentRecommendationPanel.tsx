import { CheckCircle2, Clock3 } from 'lucide-react'
import type { EquipmentDetail } from '../../../types/equipment'

export function EquipmentRecommendationPanel({ detail }: { detail: EquipmentDetail }) {
  return (
    <section className="equipment-detail-panel recommendation-panel">
      <div className="panel-header">
        <div><span className="panel-kicker">Recomendacion</span><h3>Accion operacional sugerida</h3></div>
        <span className="panel-tag">Riesgo {detail.risk_level}</span>
      </div>
      <p>{detail.recommendation}</p>
      <div className="equipment-event-list">
        {detail.events.slice(0, 5).map((event) => (
          <article key={`${event.timestamp}-${event.descripcion}`}>
            <Clock3 size={14} />
            <div>
              <strong>{event.tipo}</strong>
              <span>{new Date(event.timestamp).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })} - {event.descripcion}</span>
            </div>
            <small>{event.duracion_min != null ? `${event.duracion_min.toLocaleString('es-CL')} min` : 'Sin dato'} / {event.impacto_toneladas.toLocaleString('es-CL')} t</small>
          </article>
        ))}
      </div>
      <div className="recommendation-ack">
        <CheckCircle2 size={15} />
        Preparado para drill-down SQL/WENCO en siguiente sprint.
      </div>
    </section>
  )
}
