import { DemoRequestForm } from '../components/landing/DemoRequestForm'
import { PitContourField } from '../components/landing/PitContourField'
import { PublicPageMeta } from '../components/landing/PublicPageMeta'
import { PublicPageShell } from '../components/landing/PublicPageShell'
import { useModuleT } from '../i18n/useModuleT'
import { publicPagesT } from '../i18n/modules/publicPages'

export function DemoRequestPage() {
  const t = useModuleT(publicPagesT)
  return (
    <PublicPageShell compactHeader>
      <PublicPageMeta
        title={t.requestPage.metaTitle}
        description={t.requestPage.metaDescription}
        robots="noindex,follow"
      />
      <main id="contenido" className="nm-public-interior">
        <div className="nm-public-shell nm-request-layout">
          <aside className="nm-request-intro">
            <p className="nm-public-eyebrow">{t.requestPage.eyebrow}</p>
            <h1>{t.requestPage.title}</h1>
            <p>
              {t.requestPage.body}
            </p>
            <dl>
              {t.requestPage.facts.map((fact) => (
                <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>
              ))}
            </dl>
            <div className="nm-request-intro__contours" aria-hidden="true">
              <PitContourField />
            </div>
          </aside>
          <section className="nm-request-form-panel" aria-labelledby="request-form-title">
            <header>
              <span>{t.requestPage.stepLabel}</span>
              <h2 id="request-form-title">{t.requestPage.formTitle}</h2>
              <p>{t.requestPage.formHint}</p>
            </header>
            <DemoRequestForm />
          </section>
        </div>
      </main>
    </PublicPageShell>
  )
}
