import { ArrowRight } from 'lucide-react'
import { CapabilitySection } from '../components/landing/CapabilitySection'
import { DemoDisclosure } from '../components/landing/DemoDisclosure'
import { LandingHero } from '../components/landing/LandingHero'
import { OperationalStory } from '../components/landing/OperationalStory'
import { ProductPreview } from '../components/landing/ProductPreview'
import { PublicPageMeta } from '../components/landing/PublicPageMeta'
import { PublicPageShell } from '../components/landing/PublicPageShell'
import { useModuleT } from '../i18n/useModuleT'
import { publicPagesT } from '../i18n/modules/publicPages'

export function DemoLandingPage() {
  const t = useModuleT(publicPagesT)
  return (
    <PublicPageShell>
      <PublicPageMeta
        title={t.meta.home.title}
        description={t.meta.home.description}
      />
      <main id="contenido">
        <LandingHero />
        <OperationalStory />
        <CapabilitySection />
        <ProductPreview />
        <DemoDisclosure />
        <section className="nm-public-band nm-final-cta" aria-labelledby="final-cta-title">
          <div className="nm-public-shell nm-final-cta__inner">
            <div>
              <h2 id="final-cta-title">{t.finalCta.title}</h2>
              <p>
                {t.finalCta.body}
              </p>
            </div>
            <div className="nm-final-cta__actions">
              <a className="nm-public-button nm-public-button--primary" href="/solicitar-demo">
                {t.finalCta.cta} <ArrowRight size={18} aria-hidden="true" />
              </a>
              <a className="nm-public-text-link" href="/acceso-demo">
                {t.finalCta.acceso}
              </a>
            </div>
          </div>
        </section>
      </main>
    </PublicPageShell>
  )
}
