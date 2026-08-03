import { PitContourField } from '../../landing/PitContourField'
import { useHeroRevealTimeline } from '../../../lib/animation/effects'

export function SaaSHero() {
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
          Inteligencia operacional para minería
        </p>

        <h1 id="ns-hero-title" className="ns-hero__title" data-hero-title>
          Observe la operación completa.
          <br />
          Decida con contexto.
        </h1>

        <p className="ns-hero__lead" data-hero-lead>
          NORTHMINE es un Command Center minero que transforma datos dispersos
          en decisiones priorizadas, explicables y trazables durante el turno.
        </p>

        <div className="ns-hero__actions" data-hero-actions>
          <a className="ns-btn ns-btn--primary" href="/solicitar-demo">
            Solicitar acceso al demo
          </a>
          <a className="ns-btn ns-btn--ghost" href="#modulos">
            Explorar la plataforma
          </a>
        </div>
      </div>
    </section>
  )
}
