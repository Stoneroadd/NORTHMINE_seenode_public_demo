import { useDecisionCasesReveal } from '../../../lib/animation/effects'
import { useModuleT } from '../../../i18n/useModuleT'
import { landingT, landingFallback } from '../../../i18n/modules/landing'

export function DecisionCases() {
  const t = useModuleT(landingT)
  const decisionCases = landingFallback(t, 'decisionCases')
  const scope = useDecisionCasesReveal<HTMLElement>(3)

  return (
    <section ref={scope} className="ns-cases" aria-labelledby="ns-cases-title">
      <div className="ns-saas__shell">
        <div className="ns-cases__head" data-cases-fade>
          <p className="mono-label">{decisionCases.kicker}</p>
          <h2 id="ns-cases-title">{decisionCases.title}</h2>
        </div>

        <ol className="ns-cases__list">
          {decisionCases.cases.map((question, index) => (
            <li key={question} className="ns-cases__item" data-cases-item>
              <span className="mono-label ns-cases__number">{String(index + 1).padStart(2, '0')}</span>
              <p>{question}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
