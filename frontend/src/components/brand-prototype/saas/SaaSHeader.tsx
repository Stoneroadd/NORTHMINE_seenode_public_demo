import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'

const navItems = [
  { label: 'Plataforma', href: '#hero' },
  { label: 'Capacidades', href: '#lectura' },
  { label: 'Módulos', href: '#modulos' },
  { label: 'Seguridad', href: '#seguridad' },
  { label: 'Demo', href: '#cta' },
]

export function SaaSHeader() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        menuButtonRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <header className={`ns-header${scrolled ? ' is-scrolled' : ''}`}>
      <a className="ns-header__skip" href="#ns-contenido">
        Saltar al contenido
      </a>
      <div className="ns-header__inner">
        <a className="ns-header__brand" href="/" aria-label="NORTHMINE Intelligence, inicio">
          <svg className="ns-header__mark" viewBox="0 0 64 64" aria-hidden="true">
            <path d="M8,8 L18,8 L18,56 L13,56 L8,51 Z" fill="currentColor" />
            <path d="M46,8 L51,8 L56,13 L56,56 L46,56 Z" fill="currentColor" />
            <path
              d="M18,16 L34,16 L34,32 L46,32"
              fill="none"
              stroke="currentColor"
              strokeWidth={10}
              strokeLinecap="butt"
              strokeLinejoin="miter"
            />
          </svg>
          <span className="ns-header__word">NORTHMINE</span>
        </a>

        <nav className="ns-header__nav" aria-label="Navegación principal">
          {navItems.map((item) => (
            <a key={item.href} href={item.href} data-magnetic-text>
              {item.label}
            </a>
          ))}
        </nav>

        <div className="ns-header__actions">
          <a className="ns-header__login" href="/acceso-demo">
            Acceder
          </a>
          <a className="ns-btn ns-btn--primary ns-btn--sm" href="/solicitar-demo">
            Solicitar demo
          </a>
        </div>

        <button
          ref={menuButtonRef}
          type="button"
          className="ns-header__menu-button"
          aria-expanded={open}
          aria-controls="ns-mobile-nav"
          aria-label={open ? 'Cerrar navegación' : 'Abrir navegación'}
          onClick={() => setOpen((v) => !v)}
        >
          <span />
          <span />
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            id="ns-mobile-nav"
            className="ns-header__mobile-nav is-open"
            aria-label="Navegación móvil"
            initial={reduceMotion ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          >
            {navItems.map((item) => (
              <a key={item.href} href={item.href} onClick={() => setOpen(false)}>
                {item.label}
              </a>
            ))}
            <a className="ns-header__login" href="/acceso-demo" onClick={() => setOpen(false)}>
              Acceder
            </a>
            <a className="ns-btn ns-btn--primary" href="/solicitar-demo" onClick={() => setOpen(false)}>
              Solicitar demo
            </a>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  )
}
