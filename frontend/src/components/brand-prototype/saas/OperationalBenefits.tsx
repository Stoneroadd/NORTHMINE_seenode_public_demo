import { useSectionReveal } from '../../../lib/animation/effects'
import { useModuleT } from '../../../i18n/useModuleT'
import { landingT } from '../../../i18n/modules/landing'

export function OperationalBenefits() {
  const t = useModuleT(landingT)
  const scope = useSectionReveal<HTMLElement>({ targets: '[data-benefit]', distance: 14, duration: 0.45, stagger: 0.06 })

  return (
    <section ref={scope} className="ns-benefits" id="diferenciadores" aria-labelledby="ns-benefits-title">
      <div className="ns-saas__shell">
        <h2 id="ns-benefits-title" className="ns-benefits__title">
          {t.benefits.title}
        </h2>

        <ol className="ns-benefits__list">
          {t.benefits.items.map((benefit, index) => (
            <li key={benefit.title} data-benefit>
              <span className="mono-label ns-benefits__number">{String(index + 1).padStart(2, '0')}</span>
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
