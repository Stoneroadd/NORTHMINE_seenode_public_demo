import { useState } from 'react'
import { ArrowRight, Menu, X } from 'lucide-react'

const navigation = [
  { label: 'Capacidades', href: '/#capacidades' },
  { label: 'Como funciona', href: '/#flujo' },
  { label: 'Demo', href: '/#demo' },
]

export function LandingHeader() {
  const [open, setOpen] = useState(false)

  return (
    <header className="nm-public-header">
      <a className="nm-skip-link" href="#contenido">
        Saltar al contenido
      </a>
      <div className="nm-public-header__inner">
        <a className="nm-public-brand" href="/" aria-label="NORTHMINE Intelligence, inicio">
          <span className="nm-public-brand__mark" aria-hidden="true">N</span>
          <span>
            <strong>NORTHMINE</strong>
            <small>Intelligence</small>
          </span>
        </a>

        <button
          className="nm-public-menu-button"
          type="button"
          aria-expanded={open}
          aria-controls="public-navigation"
          aria-label={open ? 'Cerrar navegacion' : 'Abrir navegacion'}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>

        <nav
          id="public-navigation"
          className={`nm-public-navigation${open ? ' is-open' : ''}`}
          aria-label="Navegacion principal"
        >
          {navigation.map((item) => (
            <a key={item.href} href={item.href} onClick={() => setOpen(false)}>
              {item.label}
            </a>
          ))}
          <a className="nm-public-navigation__login" href="/acceso-demo">
            Ya tengo acceso
          </a>
          <a className="nm-public-navigation__cta" href="/solicitar-demo">
            Solicitar acceso <ArrowRight size={16} aria-hidden="true" />
          </a>
        </nav>
      </div>
    </header>
  )
}
