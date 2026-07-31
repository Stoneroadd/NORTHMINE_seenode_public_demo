import {
  Activity,
  ArrowDownRight,
  Crosshair,
  Gauge,
  GitCompareArrows,
  ShieldAlert,
} from 'lucide-react'

const stages = [
  {
    number: '01',
    icon: Gauge,
    title: 'Estado del turno',
    copy: 'Produccion acumulada, cumplimiento, proyeccion y calidad del dato.',
  },
  {
    number: '02',
    icon: Activity,
    title: 'Brecha y ritmo requerido',
    copy: 'Lo que falta para cerrar el turno y el ritmo necesario para recuperarlo.',
  },
  {
    number: '03',
    icon: Crosshair,
    title: 'Equipos y causas',
    copy: 'CAEX, carguio, ciclos, disponibilidad y frentes asociados a la brecha.',
  },
  {
    number: '04',
    icon: ShieldAlert,
    title: 'Riesgo y recomendacion',
    copy: 'Prioridad, confianza, impacto esperado y condiciones para ejecutar.',
  },
  {
    number: '05',
    icon: ArrowDownRight,
    title: 'Decision y resultado',
    copy: 'Accion registrada y seguimiento de su efecto en la operacion.',
  },
  {
    number: '06',
    icon: GitCompareArrows,
    title: 'Planificacion y comparacion',
    copy: 'Turnos, periodos, escenarios y avance del plan mensual en un mismo lenguaje.',
  },
]

export function CapabilitySection() {
  return (
    <section id="capacidades" className="nm-public-band nm-capabilities" aria-labelledby="capabilities-title">
      <div className="nm-public-shell nm-capabilities__layout">
        <div className="nm-public-section-heading nm-public-section-heading--sticky">
          <p className="nm-public-eyebrow">Capacidades</p>
          <h2 id="capabilities-title">Del estado operacional a una accion verificable.</h2>
          <p>
            NORTHMINE organiza el turno como una secuencia de lectura. La
            interfaz prioriza la decision y deja el detalle disponible para
            investigar la causa.
          </p>
        </div>

        <ol className="nm-capability-sequence">
          {stages.map(({ number, icon: Icon, title, copy }) => (
            <li key={number}>
              <span className="nm-capability-sequence__number">{number}</span>
              <Icon size={21} aria-hidden="true" />
              <div>
                <h3>{title}</h3>
                <p>{copy}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
