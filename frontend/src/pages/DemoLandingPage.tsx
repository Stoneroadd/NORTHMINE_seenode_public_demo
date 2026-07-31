import { ArrowRight } from 'lucide-react'
import { CapabilitySection } from '../components/landing/CapabilitySection'
import { DemoDisclosure } from '../components/landing/DemoDisclosure'
import { LandingHero } from '../components/landing/LandingHero'
import { OperationalStory } from '../components/landing/OperationalStory'
import { ProductPreview } from '../components/landing/ProductPreview'
import { PublicPageMeta } from '../components/landing/PublicPageMeta'
import { PublicPageShell } from '../components/landing/PublicPageShell'

export function DemoLandingPage() {
  return (
    <PublicPageShell>
      <PublicPageMeta
        title="NORTHMINE Intelligence | Control operacional minero"
        description="Control y decision operacional para mineria a cielo abierto. Solicita acceso al demo interactivo de NORTHMINE con datos sinteticos."
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
              <h2 id="final-cta-title">Solicitar una demostracion de NORTHMINE</h2>
              <p>
                Cuéntanos que necesitas evaluar. La solicitud se revisa antes de
                habilitar un acceso individual al entorno interactivo.
              </p>
            </div>
            <div className="nm-final-cta__actions">
              <a className="nm-public-button nm-public-button--primary" href="/solicitar-demo">
                Solicitar acceso <ArrowRight size={18} aria-hidden="true" />
              </a>
              <a className="nm-public-text-link" href="/acceso-demo">
                Ya tengo acceso
              </a>
            </div>
          </div>
        </section>
      </main>
    </PublicPageShell>
  )
}
