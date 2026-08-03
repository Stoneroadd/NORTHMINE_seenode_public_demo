import { NorthmineLogo } from '../../brand/NorthmineLogo'

export function SaaSFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="ns-footer">
      <div className="ns-saas__shell ns-footer__inner">
        <div className="ns-footer__brand">
          <NorthmineLogo className="ns-footer__logo" variant="horizontal" loading="lazy" />
          <div>
            <span>Inteligencia operacional para minería a cielo abierto.</span>
          </div>
        </div>

        <nav aria-label="Enlaces del pie">
          <a href="/origen">Nuestra historia</a>
          <a href="/privacy">Privacidad</a>
          <a href="/solicitar-demo">Solicitar acceso</a>
          <a href="/acceso-demo">Acceso al demo</a>
        </nav>

        <div className="ns-footer__meta">
          <span className="mono-label">Demo con datos sintéticos</span>
          <small>© {year} NORTHMINE Intelligence</small>
        </div>
      </div>
    </footer>
  )
}
