import { NorthmineLogo } from '../../brand/NorthmineLogo'
import { useModuleT } from '../../../i18n/useModuleT'
import { landingT } from '../../../i18n/modules/landing'

export function SaaSFooter() {
  const t = useModuleT(landingT)
  const year = new Date().getFullYear()

  return (
    <footer className="ns-footer">
      <div className="ns-saas__shell ns-footer__inner">
        <div className="ns-footer__brand">
          <NorthmineLogo className="ns-footer__logo" variant="horizontal" loading="lazy" />
          <div>
            <span>{t.footer.tagline}</span>
          </div>
        </div>

        <nav aria-label={t.footer.aria}>
          <a href="/origen">{t.footer.navHistoria}</a>
          <a href="/privacy">{t.footer.navPrivacidad}</a>
          <a href="/solicitar-demo">{t.footer.navSolicitar}</a>
          <a href="/acceso-demo">{t.footer.navAcceso}</a>
        </nav>

        <div className="ns-footer__meta">
          <span className="mono-label">{t.footer.status}</span>
          <small>© {year} NORTHMINE Intelligence</small>
        </div>
      </div>
    </footer>
  )
}
