import { Database, FileCheck2, LockKeyhole, ServerCog, ShieldCheck } from 'lucide-react'
import { useModuleT } from '../../i18n/useModuleT'
import { publicPagesT } from '../../i18n/modules/publicPages'

const itemIcons = [Database, LockKeyhole, ServerCog]
const principleIcons = [ShieldCheck, FileCheck2, ServerCog]

export function DemoDisclosure() {
  const t = useModuleT(publicPagesT)
  return (
    <>
      <section className="nm-public-band nm-demo-disclosure" aria-labelledby="disclosure-title">
        <div className="nm-public-shell nm-demo-disclosure__layout">
          <div className="nm-public-section-heading">
            <p className="nm-public-eyebrow">{t.disclosure.eyebrow}</p>
            <h2 id="disclosure-title">{t.disclosure.title}</h2>
            <p>
              {t.disclosure.body}
            </p>
          </div>
          <div className="nm-demo-disclosure__items">
            {t.disclosure.items.map((item, index) => {
              const Icon = itemIcons[index] ?? Database
              return (
                <article key={item.title}>
                  <Icon size={20} aria-hidden="true" />
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.copy}</p>
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      <section className="nm-public-band nm-security-band" aria-labelledby="security-title">
        <div className="nm-public-shell nm-security-band__layout">
          <div>
            <h2 id="security-title">{t.disclosure.securityTitle}</h2>
          </div>
          <div className="nm-security-band__principles">
            {t.disclosure.securityPrinciples.map((principle, index) => {
              const Icon = principleIcons[index] ?? ShieldCheck
              return <span key={principle}><Icon size={18} aria-hidden="true" /> {principle}</span>
            })}
          </div>
        </div>
      </section>
    </>
  )
}
