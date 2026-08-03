export function SaaSFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="ns-footer">
      <div className="ns-saas__shell ns-footer__inner">
        <div className="ns-footer__brand">
          <svg className="ns-footer__mark" viewBox="0 0 64 64" aria-hidden="true">
            <path d="M8,8 L18,8 L18,56 L13,56 L8,51 Z" fill="currentColor" />
            <path d="M46,8 L51,8 L56,13 L56,56 L46,56 Z" fill="currentColor" />
            <path d="M18,16 L34,16 L34,32 L46,32" fill="none" stroke="currentColor" strokeWidth={10} strokeLinecap="butt" strokeLinejoin="miter" />
          </svg>
          <div>
            <strong>NORTHMINE</strong>
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
