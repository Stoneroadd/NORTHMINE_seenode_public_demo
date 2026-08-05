import { ArrowDown, ArrowRight, Database, Route, ShieldCheck } from 'lucide-react'
import { StrataHeroVisual } from './StrataHeroVisual'
import { useModuleT } from '../../i18n/useModuleT'
import { publicPagesT } from '../../i18n/modules/publicPages'

const factIcons = [Database, Route, ShieldCheck]

export function LandingHero() {
  const t = useModuleT(publicPagesT)
  return (
    <section className="nm-landing-hero" aria-labelledby="landing-title">
      <img
        className="nm-landing-hero__media"
        src="/assets/landing/open-pit-blue-hour-synthetic.webp"
        alt=""
        width="1600"
        height="900"
        fetchPriority="high"
        aria-hidden="true"
      />
      <div className="nm-landing-hero__veil" aria-hidden="true" />
      <div className="nm-public-shell nm-landing-hero__content">
        <div className="nm-landing-hero__copy">
          <p className="nm-public-eyebrow">{t.hero.eyebrow}</p>
          <h1 id="landing-title">{t.hero.title}</h1>
          <p className="nm-landing-hero__positioning">
            {t.hero.positioning}
          </p>
          <p className="nm-landing-hero__lead">
            {t.hero.lead}
          </p>
          <div className="nm-landing-hero__actions">
            <a className="nm-public-button nm-public-button--primary" href="/solicitar-demo">
              {t.hero.ctaDemo} <ArrowRight size={18} aria-hidden="true" />
            </a>
            <a className="nm-public-button nm-public-button--quiet" href="#capacidades">
              {t.hero.ctaExplorar} <ArrowDown size={18} aria-hidden="true" />
            </a>
          </div>
          <p className="nm-landing-hero__disclosure">
            {t.hero.disclosure}
          </p>
        </div>

        <StrataHeroVisual />

        <dl className="nm-landing-hero__facts" aria-label={t.hero.ariaFacts}>
          {t.hero.facts.map((fact, index) => {
            const Icon = factIcons[index] ?? Database
            return (
              <div key={fact.label}>
                <dt><Icon size={16} aria-hidden="true" /> {fact.label}</dt>
                <dd>{fact.value}</dd>
              </div>
            )
          })}
        </dl>
      </div>
    </section>
  )
}
