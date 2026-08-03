import { useSectionReveal } from '../../../lib/animation/effects'

const decisionSequence = ['Estado', 'Brecha', 'Causa', 'Riesgo', 'Acción', 'Resultado']

export function NorthmineDefinition() {
  const scope = useSectionReveal<HTMLElement>({
    targets: '[data-definition-reveal]',
    distance: 18,
    stagger: 0.07,
    duration: 0.55,
  })

  return (
    <section ref={scope} className="ns-definition" id="propuesta" aria-labelledby="ns-definition-title">
      <div className="ns-saas__shell ns-definition__grid">
        <div className="ns-definition__copy" data-definition-reveal>
          <p className="mono-label">Qué es NORTHMINE</p>
          <h2 id="ns-definition-title">
            Una capa de decisión sobre sus sistemas operacionales.
          </h2>
          <p>
            NORTHMINE es un Command Center para minería a cielo abierto. Integra
            producción, carguío, transporte, mantenimiento, riesgos y planificación
            en una lectura operacional común.
          </p>
        </div>

        <div className="ns-definition__system" data-definition-reveal>
          <p>
            Convierte datos dispersos en decisiones priorizadas, explicables y
            trazables dentro del turno.
          </p>
          <ol aria-label="Secuencia de decisión operacional">
            {decisionSequence.map((step, index) => (
              <li key={step}>
                <span className="mono-label">{String(index + 1).padStart(2, '0')}</span>
                <strong>{step}</strong>
              </li>
            ))}
          </ol>
          <div className="ns-definition__boundary">
            <span>Integra</span>
            <p>No reemplaza despacho, mantenimiento, SQL ni los sistemas fuente existentes.</p>
          </div>
        </div>
      </div>
    </section>
  )
}
