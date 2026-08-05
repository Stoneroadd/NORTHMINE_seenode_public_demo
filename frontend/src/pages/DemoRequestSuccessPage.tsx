import { CheckCircle2, LogIn } from 'lucide-react'
import { PitContourField } from '../components/landing/PitContourField'
import { PublicPageMeta } from '../components/landing/PublicPageMeta'
import { PublicPageShell } from '../components/landing/PublicPageShell'
import { useModuleT } from '../i18n/useModuleT'
import { publicPagesT } from '../i18n/modules/publicPages'

export function DemoRequestSuccessPage() {
  const t = useModuleT(publicPagesT)
  const reference = sessionStorage.getItem('northmine.demo-access.reference')

  return (
    <PublicPageShell compactHeader>
      <PublicPageMeta
        title={t.success.metaTitle}
        description={t.success.metaDescription}
        robots="noindex,nofollow"
      />
      <main id="contenido" className="nm-public-interior nm-request-success">
        <div className="nm-request-success__contours" aria-hidden="true">
          <PitContourField />
        </div>
        <section className="nm-request-success__panel">
          <CheckCircle2 size={42} aria-hidden="true" />
          <p className="nm-public-eyebrow">{t.success.eyebrow}</p>
          <h1>{t.success.title}</h1>
          <p>
            {t.success.body}
          </p>
          {reference && (
            <dl>
              <dt>{t.success.reference}</dt>
              <dd>{reference}</dd>
            </dl>
          )}
          <div>
            <a className="nm-public-button nm-public-button--primary" href="/">
              {t.success.back}
            </a>
            <a className="nm-public-button nm-public-button--quiet" href="/acceso-demo">
              <LogIn size={18} aria-hidden="true" /> {t.success.acceso}
            </a>
          </div>
        </section>
      </main>
    </PublicPageShell>
  )
}
