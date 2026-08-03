import { useSectionReveal } from '../../../lib/animation/effects'

const benefits = [
  { number: '01', title: 'Orientado a decisiones', description: 'Explica dónde está la brecha, qué la provoca y qué acción evaluar primero.' },
  { number: '02', title: 'Conecta áreas', description: 'Producción, despacho, flota, mantenimiento, riesgos y plan comparten contexto.' },
  { number: '03', title: 'Profundidad operacional', description: 'Permite bajar del resultado global al frente, pala, CAEX, ciclo o avería.' },
  { number: '04', title: 'Trazabilidad', description: 'Vincula condición, evidencia, decisión, responsable, ejecución y resultado.' },
  { number: '05', title: 'Integra sin reemplazar', description: 'Aprovecha los datos disponibles y conserva los sistemas fuente de la operación.' },
  { number: '06', title: 'Continuidad compartida', description: 'Reduce la pérdida de contexto entre turnos, áreas y niveles de decisión.' },
]

export function OperationalBenefits() {
  const scope = useSectionReveal<HTMLElement>({ targets: '[data-benefit]', distance: 14, duration: 0.45, stagger: 0.06 })

  return (
    <section ref={scope} className="ns-benefits" id="diferenciadores" aria-labelledby="ns-benefits-title">
      <div className="ns-saas__shell">
        <h2 id="ns-benefits-title" className="ns-benefits__title">
          Lo que diferencia a NORTHMINE.
        </h2>

        <ol className="ns-benefits__list">
          {benefits.map((benefit) => (
            <li key={benefit.number} data-benefit>
              <span className="mono-label ns-benefits__number">{benefit.number}</span>
              <div>
                <h3>{benefit.title}</h3>
                <p>{benefit.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
