import { ArrowRight, CircleGauge, Route, ShieldAlert, Wrench } from 'lucide-react'

const fragmentedSignals = [
  { icon: CircleGauge, title: 'Produccion', copy: 'Meta, avance y proyeccion en fuentes separadas.' },
  { icon: Route, title: 'Despacho', copy: 'Ciclos y asignaciones sin una lectura comun del turno.' },
  { icon: Wrench, title: 'Mantenimiento', copy: 'Disponibilidad sin contexto sobre el impacto operacional.' },
  { icon: ShieldAlert, title: 'Riesgo', copy: 'Alertas que llegan tarde a la decision.' },
]

export function OperationalStory() {
  return (
    <section id="flujo" className="nm-public-band nm-operational-problem" aria-labelledby="problem-title">
      <div className="nm-public-shell">
        <div className="nm-public-section-heading nm-public-section-heading--plain">
          <h2 id="problem-title">La informacion existe. La decision sigue fragmentada.</h2>
          <p>
            Cuando produccion, flota y mantenimiento no comparten contexto, la
            brecha se detecta tarde y es dificil vincular una accion con su resultado.
          </p>
        </div>

        <div className="nm-signal-flow" aria-label="Fuentes operacionales consolidadas">
          <div className="nm-signal-flow__sources">
            {fragmentedSignals.map(({ icon: Icon, title, copy }) => (
              <article key={title}>
                <Icon size={19} aria-hidden="true" />
                <div>
                  <h3>{title}</h3>
                  <p>{copy}</p>
                </div>
              </article>
            ))}
          </div>
          <ArrowRight className="nm-signal-flow__arrow" size={28} aria-hidden="true" />
          <div className="nm-signal-flow__result">
            <span>Lectura comun</span>
            <strong>Estado, brecha, ritmo y accion</strong>
            <p>Una decision sustentada por evidencia operacional y trazabilidad.</p>
          </div>
        </div>
      </div>
    </section>
  )
}
