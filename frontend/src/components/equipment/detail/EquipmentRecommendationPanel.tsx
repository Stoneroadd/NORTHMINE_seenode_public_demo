import { CheckCircle2, Clock3, Route, Timer, TrendingUp, Truck } from 'lucide-react'
import type { EquipmentDetail, EquipmentEvent } from '../../../types/equipment'

function formatTime(timestamp: string) {
  return new Date(timestamp).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
}

function formatNumber(value: number, digits = 0) {
  return value.toLocaleString('es-CL', { maximumFractionDigits: digits })
}

function equipmentFromEvent(event: EquipmentEvent) {
  return event.descripcion.match(/\bCAEX\s*\d+\b/i)?.[0].replace(/\s+/g, '') ?? event.tipo
}

function destinationFromEvent(event: EquipmentEvent) {
  const destination = event.descripcion.match(/\bhacia\s+(.+)$/i)?.[1]?.trim()
  return destination || 'Destino operacional'
}

export function EquipmentRecommendationPanel({ detail }: { detail: EquipmentDetail }) {
  const visibleEvents = detail.events.slice(0, 5)
  const maxTonnes = Math.max(...visibleEvents.map((event) => event.impacto_toneladas), 1)
  const maxDuration = Math.max(...visibleEvents.map((event) => event.duracion_min ?? 0), 1)
  const totalTonnes = visibleEvents.reduce((sum, event) => sum + event.impacto_toneladas, 0)
  const durations = visibleEvents
    .map((event) => event.duracion_min)
    .filter((value): value is number => value != null)
  const averageDuration = durations.length > 0
    ? durations.reduce((sum, value) => sum + value, 0) / durations.length
    : null
  const averagePayload = visibleEvents.length > 0 ? totalTonnes / visibleEvents.length : 0
  const uniqueTrucks = new Set(visibleEvents.map(equipmentFromEvent)).size
  const peakEvent = visibleEvents.length > 0
    ? visibleEvents.reduce((best, event) => event.impacto_toneladas > best.impacto_toneladas ? event : best, visibleEvents[0])
    : null

  return (
    <section className="equipment-detail-panel recommendation-panel">
      <div className="panel-header">
        <div><span className="panel-kicker">Recomendacion</span><h3>Accion operacional sugerida</h3></div>
        <span className="panel-tag">Riesgo {detail.risk_level}</span>
      </div>
      <div className="recommendation-command">
        <div>
          <span>Decision recomendada</span>
          <strong>{detail.recommendation}</strong>
        </div>
        <small>{visibleEvents.length} ciclos recientes como evidencia</small>
      </div>

      <div className="recommendation-cycle-summary" aria-label="Resumen de ciclos recientes">
        <article className="is-impact">
          <TrendingUp size={15} />
          <span>Tonelaje muestra</span>
          <strong>{formatNumber(totalTonnes)} t</strong>
          <small>{formatNumber(averagePayload, 1)} t/ciclo prom.</small>
        </article>
        <article>
          <Timer size={15} />
          <span>Duracion prom.</span>
          <strong>{averageDuration != null ? `${formatNumber(averageDuration, 1)} min` : 'Sin dato'}</strong>
          <small>{visibleEvents.length} ciclos visibles</small>
        </article>
        <article>
          <Truck size={15} />
          <span>CAEX involucrados</span>
          <strong>{uniqueTrucks}</strong>
          <small>{peakEvent ? `Pico ${equipmentFromEvent(peakEvent)} ${formatNumber(peakEvent.impacto_toneladas)} t` : 'Sin dato'}</small>
        </article>
      </div>

      <div className="equipment-event-list is-visual">
        {visibleEvents.map((event, index) => {
          const duration = event.duracion_min
          const tonnesWidth = `${Math.max(8, (event.impacto_toneladas / maxTonnes) * 100)}%`
          const durationWidth = `${Math.max(8, ((duration ?? 0) / maxDuration) * 100)}%`
          const truck = equipmentFromEvent(event)
          const destination = destinationFromEvent(event)
          return (
            <article
              key={`${event.timestamp}-${event.descripcion}`}
              className={`equipment-event-card ${event === peakEvent ? 'is-peak' : ''}`}
            >
              <div className="equipment-event-rank">
                <span>{String(index + 1).padStart(2, '0')}</span>
                <Clock3 size={14} />
              </div>
              <div className="equipment-event-main">
                <div className="equipment-event-title">
                  <strong>{truck}</strong>
                  <span>{formatTime(event.timestamp)}</span>
                </div>
                <div className="equipment-event-route">
                  <Route size={13} />
                  <span>{detail.equipment_id} hacia {destination}</span>
                </div>
                <div className="equipment-event-bars" aria-hidden="true">
                  <div>
                    <span>t</span>
                    <i style={{ width: tonnesWidth }} />
                  </div>
                  <div className="is-duration">
                    <span>min</span>
                    <i style={{ width: durationWidth }} />
                  </div>
                </div>
              </div>
              <div className="equipment-event-values">
                <strong>{formatNumber(event.impacto_toneladas)} t</strong>
                <small>{duration != null ? `${formatNumber(duration, 1)} min` : 'Sin dato'}</small>
              </div>
            </article>
          )
        })}
        {visibleEvents.length === 0 && (
          <div className="equipment-empty-message">Sin ciclos recientes para graficar.</div>
        )}
      </div>

      <div className="recommendation-ack">
        <CheckCircle2 size={15} />
        Evidencia ordenada por actividad mas reciente; lista preparada para drill-down SQL/WENCO.
      </div>
    </section>
  )
}
