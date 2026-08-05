import { PitContourField } from '../../landing/PitContourField'
import { useHeroRevealTimeline } from '../../../lib/animation/effects'
import { useModuleT } from '../../../i18n/useModuleT'
import { landingT } from '../../../i18n/modules/landing'

export function SaaSHero() {
  const t = useModuleT(landingT)
  const scope = useHeroRevealTimeline<HTMLElement>()

  return (
    <section ref={scope} className="ns-hero" id="hero" aria-labelledby="ns-hero-title">
      <div className="ns-hero__backdrop" aria-hidden="true">
        <img
          className="ns-hero__backdrop-image"
          data-hero-backdrop
          src="/assets/landing/saas/hero-dozer-openpit-premium.webp"
          alt=""
          width={1672}
          height={941}
          fetchPriority="high"
        />
        <div className="ns-hero__backdrop-veil" />
      </div>
      <div className="ns-hero__glow" aria-hidden="true" />
      <div className="ns-hero__contours" data-hero-contours aria-hidden="true">
        <PitContourField />
      </div>

      <div className="ns-hero__content">
        <p className="ns-hero__badge" data-hero-badge>
          <span className="ns-hero__badge-dot" />
          {t.hero.badge}
        </p>

        <h1 id="ns-hero-title" className="ns-hero__title" data-hero-title data-magnetic-text>
          {t.hero.title1}
          <br className="ns-hero__title-break" /> {t.hero.title2}
        </h1>

        <p className="ns-hero__lead" data-hero-lead>
          {t.hero.lead}
        </p>

        <div className="ns-hero__actions" data-hero-actions>
          <a className="ns-btn ns-btn--primary" href="/solicitar-demo">
            {t.hero.ctaDemo}
          </a>
          <a className="ns-btn ns-btn--ghost" href="#modulos">
            {t.hero.ctaExplorar}
          </a>
        </div>

        {t.hero.techNote && <p className="ns-hero__tech-note">{t.hero.techNote}</p>}
      </div>

      <figure className="ns-hero__glimpse" data-hero-glimpse aria-hidden="true">
        <img
          src="/assets/landing/prototype/product/cockpit-operational-demo-capture-900.webp"
          alt=""
          width={900}
          height={517}
          loading="lazy"
        />
        <figcaption className="mono-label">{t.stage.toolbar}</figcaption>
      </figure>
    </section>
  )
}
