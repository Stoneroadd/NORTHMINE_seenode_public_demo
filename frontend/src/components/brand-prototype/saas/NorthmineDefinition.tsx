import { useSectionReveal } from '../../../lib/animation/effects'
import { useModuleT } from '../../../i18n/useModuleT'
import { landingT } from '../../../i18n/modules/landing'

export function NorthmineDefinition() {
  const t = useModuleT(landingT)
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
          <p className="mono-label">{t.definition.kicker}</p>
          <h2 id="ns-definition-title">
            {t.definition.title}
          </h2>
          <p>
            {t.definition.body}
          </p>
        </div>

        <div className="ns-definition__system" data-definition-reveal>
          <p>
            {t.definition.system}
          </p>
          <ol aria-label={t.definition.ariaSequence}>
            {t.definition.sequence.map((step, index) => (
              <li key={step}>
                <span className="mono-label">{String(index + 1).padStart(2, '0')}</span>
                <strong>{step}</strong>
              </li>
            ))}
          </ol>
          <div className="ns-definition__boundary">
            <span>{t.definition.boundaryLabel}</span>
            <p>{t.definition.boundary}</p>
          </div>
        </div>
      </div>
    </section>
  )
}
