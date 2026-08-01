import { ArrowRight } from 'lucide-react'
import { PitContourField } from './PitContourField'

const decisionStrata = [
  { code: 'T', label: 'Terreno', detail: 'Pit shell / DXF' },
  { code: 'E', label: 'Equipos', detail: 'CAEX + carguio' },
  { code: 'D', label: 'Datos', detail: 'Turno + ciclos' },
  { code: 'A', label: 'Decision', detail: 'Brecha + ritmo' },
  { code: 'R', label: 'Resultado', detail: 'Accion trazable' },
]

/*
 * THESIS: NORTHMINE convierte estratos operacionales en una decision legible.
 * OWN-WORLD: carbon, acero y cobre; geometria de rajo y placas de ingenieria.
 * STORY: terreno, equipos y datos convergen en una accion que puede seguirse.
 * FIRST VIEWPORT: oferta a la izquierda; pit shell y cadena decisional a la derecha.
 * FORM: consola editorial minera, sin hero SaaS ni captura ficticia.
 */
export function StrataHeroVisual() {
  return (
    <div
      className="nm-strata-hero-visual"
      role="img"
      aria-label="Flujo conceptual desde terreno hasta resultado"
    >
      <PitContourField className="nm-strata-hero-visual__pit" />
      <div className="nm-strata-hero-visual__coordinates" aria-hidden="true">
        <span>E 491 496</span>
        <span>N 7 449 154</span>
        <span>RL 2 424</span>
      </div>
      <div className="nm-strata-hero-visual__plate">
        <div className="nm-strata-hero-visual__plate-head">
          <span>Estratos de decision</span>
          <small>Lectura conceptual</small>
        </div>
        <ol>
          {decisionStrata.map((stage, index) => (
            <li key={stage.code}>
              <span className="nm-strata-hero-visual__code">{stage.code}</span>
              <span>
                <strong>{stage.label}</strong>
                <small>{stage.detail}</small>
              </span>
              {index < decisionStrata.length - 1 && (
                <ArrowRight size={14} aria-hidden="true" />
              )}
            </li>
          ))}
        </ol>
        <p>Representacion del flujo. Los datos del demo son sinteticos.</p>
      </div>
    </div>
  )
}
