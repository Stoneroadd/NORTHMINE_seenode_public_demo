import { useModuleT } from '../../../i18n/useModuleT'
import { landingT } from '../../../i18n/modules/landing'

export function DemoCTA() {
  const t = useModuleT(landingT)

  return (
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
      </div>
    </section>
  )
}
