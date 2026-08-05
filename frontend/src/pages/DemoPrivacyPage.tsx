import { PublicPageMeta } from '../components/landing/PublicPageMeta'
import { PublicPageShell } from '../components/landing/PublicPageShell'
import { useModuleT } from '../i18n/useModuleT'
import { publicPagesT } from '../i18n/modules/publicPages'

const sectionIds = [
  'privacy-data',
  'privacy-use',
  'privacy-do-not-send',
  'privacy-separation',
  'privacy-retention',
  'privacy-pending',
]

export function DemoPrivacyPage() {
  const t = useModuleT(publicPagesT)
  return (
    <PublicPageShell compactHeader>
      <PublicPageMeta
        title={t.privacy.metaTitle}
        description={t.privacy.metaDescription}
        robots="noindex,follow"
      />
      <main id="contenido" className="nm-public-interior nm-privacy-page">
        <article className="nm-public-shell">
          <header>
            <p className="nm-public-eyebrow">{t.privacy.eyebrow}</p>
            <h1>{t.privacy.title}</h1>
            <p>{t.privacy.version}</p>
            <nav className="nm-privacy-page__index" aria-label={t.privacy.ariaIndex}>
              {t.privacy.index.map((item, index) => (
                <a key={item} href={`#${sectionIds[index] ?? ''}`}>{item}</a>
              ))}
            </nav>
          </header>

          {t.privacy.sections.map((section, index) => (
            <section
              key={section.heading}
              id={sectionIds[index]}
              className={index === sectionIds.length - 1 ? 'nm-privacy-page__pending' : undefined}
            >
              <h2>{section.heading}</h2>
              <p>{section.body}</p>
            </section>
          ))}
        </article>
      </main>
    </PublicPageShell>
  )
}
