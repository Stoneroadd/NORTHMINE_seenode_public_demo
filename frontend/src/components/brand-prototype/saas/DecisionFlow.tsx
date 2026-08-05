import { useDecisionFlowTimeline } from '../../../lib/animation/effects'
import { useModuleT } from '../../../i18n/useModuleT'
import { landingT } from '../../../i18n/modules/landing'

export function DecisionFlow() {
  const t = useModuleT(landingT)
  const steps = t.flow.steps
  const closing = t.flow.closing ?? landingT.es.flow.closing
  const scope = useDecisionFlowTimeline<HTMLElement>()

  return (
    <section ref={scope} className="ns-flow" aria-labelledby="ns-flow-title">
      <div className="ns-saas__shell">
        <p className="mono-label">{t.flow.kicker}</p>
        <h2 id="ns-flow-title" className="ns-flow__title">
          {t.flow.title}
        </h2>

        <ol className="ns-flow__steps">
          {steps.map((step, index) => (
            <li key={step.title} data-flow-step>
              <div className="ns-flow__marker" data-flow-marker>
                <span className="mono-label">{String(index + 1).padStart(2, '0')}</span>
                {index < steps.length - 1 && <span className="ns-flow__line" data-flow-line aria-hidden="true" />}
              </div>
              <div className="ns-flow__copy" data-flow-copy>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </div>
            </li>
          ))}
        </ol>

        {closing && <p className="ns-flow__closing">{closing}</p>}
      </div>
    </section>
  )
}
