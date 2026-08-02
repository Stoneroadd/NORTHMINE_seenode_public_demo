import { useMetricCountSequence } from '../../../lib/animation/effects'

export function DemoMetrics() {
  const scope = useMetricCountSequence<HTMLDivElement>()

  return (
    <section className="ns-metrics" aria-labelledby="ns-metrics-title">
      <div ref={scope} className="ns-saas__shell">
        <p className="mono-label">Estado, brecha y acción</p>
        <h2 id="ns-metrics-title" className="ns-metrics-title">
          Datos sintéticos del entorno demostrativo
        </h2>

        <div className="ns-metrics__grid">
          <div className="ns-metrics__main" data-metric-card>
            <span className="mono-label">Estado del turno</span>
            <strong
              className="ns-metrics__value ns-metrics__value--positive"
              data-metric-value
              data-metric-target="107043"
              data-metric-suffix=" t"
            >
              107.043 t
            </strong>
            <span className="ns-metrics__sub">152,9% de avance real sobre meta de turno (70.000 t)</span>
          </div>

          <div className="ns-metrics__side" data-metric-card>
            <span className="mono-label">Brecha</span>
            <strong
              className="ns-metrics__value"
              data-metric-value
              data-metric-target="42600"
              data-metric-prefix="+"
              data-metric-suffix=" t"
            >
              +42.600 t
            </strong>
            <span className="ns-metrics__sub">Proyección de cierre 112.600 t</span>
          </div>

          <div className="ns-metrics__side" data-metric-card>
            <span className="mono-label">Ritmo requerido</span>
            <strong className="ns-metrics__value ns-metrics__value--positive">0 t/h</strong>
            <span className="ns-metrics__sub">Meta de turno ya cubierta</span>
          </div>

          <div className="ns-metrics__side ns-metrics__side--critical" data-metric-card>
            <span className="mono-label">Acción recomendada</span>
            <strong className="ns-metrics__value ns-metrics__value--critical">CF 2</strong>
            <span className="ns-metrics__sub">Mantener pala y mover un CAEX hacia CF2 por 30 min</span>
          </div>
        </div>
      </div>
    </section>
  )
}
