import { useSectionReveal } from '../../../lib/animation/effects'
import { useModuleT } from '../../../i18n/useModuleT'
import { landingT, landingFallback } from '../../../i18n/modules/landing'

export function OperationalFlowOverview() {
  const t = useModuleT(landingT)
  const overview = landingFallback(t, 'operationalFlow')
  const scope = useSectionReveal<HTMLElement>({
    targets: '[data-flow-overview-reveal]',
    distance: 18,
    stagger: 0.08,
    duration: 0.55,
  })

  return (
    <section ref={scope} className="ns-flow-overview" aria-labelledby="ns-flow-overview-title">
      <div className="ns-saas__shell">
        <div className="ns-flow-overview__head" data-flow-overview-reveal>
          <p className="mono-label">{overview.kicker}</p>
          <h2 id="ns-flow-overview-title">{overview.title}</h2>
          <p className="ns-flow-overview__body">{overview.body}</p>
        </div>

        <figure className="ns-flow-overview__frame" data-flow-overview-reveal>
          <img
            src="/assets/landing/saas/operational-flow-overview.png"
            alt={overview.imageAlt}
            width={1672}
            height={846}
            loading="lazy"
          />
        </figure>

        <ul className="ns-flow-overview__benefits" data-flow-overview-reveal>
          {overview.benefits.map((benefit) => (
            <li key={benefit}>{benefit}</li>
          ))}
        </ul>

        <p className="ns-flow-overview__disclaimer" data-flow-overview-reveal>
          {overview.disclaimer}
        </p>
      </div>
    </section>
  )
}
