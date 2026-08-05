import { useSectionReveal } from '../../../lib/animation/effects'
import { useModuleT } from '../../../i18n/useModuleT'
import { landingT } from '../../../i18n/modules/landing'

export function ProblemSolution() {
  const t = useModuleT(landingT)
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
          <p className="mono-label">{t.problem.kicker}</p>
          <h2 id="ns-problem-title">{t.problem.title}</h2>
          <p>
            {t.problem.body}
          </p>
        </div>

        <div className="ns-problem__layout">
          <ol className="ns-problem__list">
            {t.problem.items.map((problem, index) => (
              <li key={problem.title} data-problem-reveal>
                <span className="mono-label">{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <h3>{problem.title}</h3>
                  <p>{problem.description}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="ns-problem__answer" data-problem-reveal>
            <p className="mono-label">{t.problem.answerKicker}</p>
            <h3>{t.problem.answerTitle}</h3>
            <dl>
              {t.problem.transformations.map((transformation) => (
                <div key={transformation.before}>
                  <dt>{transformation.before}</dt>
                  <dd>{transformation.after}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </section>
  )
}
