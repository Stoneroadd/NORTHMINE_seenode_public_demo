import { NorthmineBrand } from './NorthmineBrand'
import { useModuleT } from '../../i18n/useModuleT'
import { publicPagesT } from '../../i18n/modules/publicPages'

export function LandingFooter() {
  const t = useModuleT(publicPagesT)
  const year = new Date().getFullYear()

  return (
    <footer className="nm-public-footer">
      <div className="nm-public-shell nm-public-footer__inner">
        <div>
          <a className="nm-public-brand" href="/" aria-label={t.landingFooter.ariaBrand}>
            <NorthmineBrand />
          </a>
          <p>{t.landingFooter.tagline}</p>
        </div>
        <nav aria-label={t.landingFooter.ariaNav}>
          <a href="/privacy">{t.landingFooter.navPrivacidad}</a>
          <a href="/solicitar-demo">{t.landingFooter.navSolicitar}</a>
          <a href="/acceso-demo">{t.landingFooter.navAcceso}</a>
        </nav>
        <div className="nm-public-footer__status">
          <span>{t.landingFooter.status}</span>
          <small>&copy; {year} NORTHMINE Intelligence</small>
        </div>
      </div>
    </footer>
  )
}
