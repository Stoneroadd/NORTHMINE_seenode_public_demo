import { useSectionReveal } from '../../../lib/animation/effects'

const problems = [
  {
    number: '01',
    title: 'Información fragmentada',
    description: 'Cada área posee datos correctos, pero no una visión operacional compartida.',
  },
  {
    number: '02',
    title: 'Brechas detectadas tarde',
    description: 'Cuando la desviación se entiende, queda poco tiempo para recuperar el turno.',
  },
  {
    number: '03',
    title: 'Indicadores sin prioridad',
    description: 'Muchos KPI muestran qué ocurrió, pero no explican qué atender primero.',
  },
]

const transformations = [
  ['Sistemas separados', 'Contexto conectado'],
  ['KPI aislados', 'Estado, brecha y causa'],
  ['Alertas planas', 'Riesgo priorizado'],
  ['Decisiones informales', 'Acción y resultado trazables'],
]

export function ProblemSolution() {
  const scope = useSectionReveal<HTMLElement>({
    targets: '[data-problem-reveal]',
    distance: 20,
    stagger: 0.06,
    duration: 0.55,
  })

  return (
    <section ref={scope} className="ns-problem" id="problema" aria-labelledby="ns-problem-title">
      <div className="ns-saas__shell">
        <div className="ns-problem__head" data-problem-reveal>
          <p className="mono-label">La problemática</p>
          <h2 id="ns-problem-title">La mina tiene datos. La decisión sigue fragmentada.</h2>
          <p>
            El desafío no es producir otro reporte. Es relacionar la condición del
            turno, su causa y la acción disponible antes de que la ventana de
            recuperación desaparezca.
          </p>
        </div>

        <div className="ns-problem__layout">
          <ol className="ns-problem__list">
            {problems.map((problem) => (
              <li key={problem.number} data-problem-reveal>
                <span className="mono-label">{problem.number}</span>
                <div>
                  <h3>{problem.title}</h3>
                  <p>{problem.description}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="ns-problem__answer" data-problem-reveal>
            <p className="mono-label">La respuesta NORTHMINE</p>
            <h3>De múltiples fuentes a una lectura operacional común.</h3>
            <dl>
              {transformations.map(([before, after]) => (
                <div key={before}>
                  <dt>{before}</dt>
                  <dd>{after}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </section>
  )
}
