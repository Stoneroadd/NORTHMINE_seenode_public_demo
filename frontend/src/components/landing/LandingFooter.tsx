export function LandingFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="nm-public-footer">
      <div className="nm-public-shell nm-public-footer__inner">
        <div>
          <a className="nm-public-brand" href="/" aria-label="NORTHMINE Intelligence, inicio">
            <span className="nm-public-brand__mark" aria-hidden="true">N</span>
            <span>
              <strong>NORTHMINE</strong>
              <small>Intelligence</small>
            </span>
          </a>
          <p>Control y decision operacional para mineria a cielo abierto.</p>
        </div>
        <nav aria-label="Enlaces del pie">
          <a href="/privacy">Privacidad</a>
          <a href="/solicitar-demo">Solicitar acceso</a>
          <a href="/acceso-demo">Acceso al demo</a>
        </nav>
        <div className="nm-public-footer__status">
          <span>Demo con datos sinteticos</span>
          <small>&copy; {year} NORTHMINE Intelligence</small>
        </div>
      </div>
    </footer>
  )
}
