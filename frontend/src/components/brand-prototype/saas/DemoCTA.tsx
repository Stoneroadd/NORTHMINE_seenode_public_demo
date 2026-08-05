import { useModuleT } from '../../../i18n/useModuleT'
import { landingT, landingFallback } from '../../../i18n/modules/landing'

export function DemoCTA() {
  const t = useModuleT(landingT)
  const demoBadges = landingFallback(t, 'demoBadges')

  return (
    <>
      <section className="ns-demo-badges" aria-labelledby="ns-demo-badges-title">
        <div className="ns-saas__shell ns-demo-badges__inner">
          <div>
            <h2 id="ns-demo-badges-title">{demoBadges.title}</h2>
            <p>{demoBadges.body}</p>
          </div>
          <ul className="ns-demo-badges__list">
            {demoBadges.badges.map((badge) => (
              <li key={badge}>{badge}</li>
            ))}
          </ul>
          <a className="ns-btn ns-btn--ghost" href="/acceso-demo">
            {demoBadges.cta}
          </a>
        </div>
      </section>

      <section className="ns-cta" id="cta" aria-labelledby="ns-cta-title">
        <div className="ns-cta__glow" aria-hidden="true" />
        <div className="ns-saas__shell ns-cta__inner">
          <h2 id="ns-cta-title" className="ns-cta__title">
            {t.cta.title}
          </h2>
          <p className="ns-cta__lead">
            {t.cta.lead}
          </p>
          <div className="ns-cta__actions">
            <a className="ns-btn ns-btn--primary" href="/solicitar-demo">
              {t.cta.ctaDemo}
            </a>
            <a className="ns-btn ns-btn--ghost" href="/acceso-demo">
              {t.cta.ctaAcceso}
            </a>
          </div>
          {t.cta.microcopy && <p className="ns-cta__microcopy">{t.cta.microcopy}</p>}
        </div>
      </section>
    </>
  )
}
