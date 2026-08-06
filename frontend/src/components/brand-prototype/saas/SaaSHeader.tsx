import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { NorthmineLogo } from '../../brand/NorthmineLogo'
import { LanguageSwitcher } from '../../common/LanguageSwitcher'
import { useModuleT } from '../../../i18n/useModuleT'
import { landingT } from '../../../i18n/modules/landing'

export function SaaSHeader() {
  const t = useModuleT(landingT)
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const reduceMotion = useReducedMotion()
  // Portal target resolved post-mount: must stay inside .nm-saas (all the
  // theme's CSS custom properties and .nm-saas-scoped rules live there) but
  // outside .ns-header (see the comment further down on why).
  const [portalTarget, setPortalTarget] = useState<Element | null>(null)

  useEffect(() => {
    setPortalTarget(document.querySelector('.nm-saas'))
  }, [])
  const navItems = [
    { label: t.header.nav.plataforma, href: '#hero' },
    { label: t.header.nav.propuesta, href: '#propuesta' },
    { label: t.header.nav.problema, href: '#problema' },
    { label: t.header.nav.diferencia, href: '#diferencia' },
    { label: t.header.nav.seguridad, href: '#seguridad' },
    { label: t.header.nav.origen, href: '/origen' },
    { label: t.header.nav.demo, href: '#cta' },
  ]

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

  useEffect(() => {
    if (!open) return undefined
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  return (
    <header className={`ns-header${scrolled ? ' is-scrolled' : ''}`}>
      <a className="ns-header__skip" href="#ns-contenido">
        {t.header.skip}
      </a>
      <div className="ns-header__inner">
        <a className="ns-header__brand" href="/" aria-label="NORTHMINE Intelligence, inicio">
          <NorthmineLogo
            className="ns-header__logo"
            variant="horizontal"
            src="/assets/brand/northmine-logo-minimal-landing.webp"
            alt="NORTHMINE Intelligence Hub"
          />
        </a>

        <nav className="ns-header__nav" aria-label={t.header.ariaNav}>
          {navItems.map((item) => (
            <a key={item.href} href={item.href} data-magnetic-text>
              {item.label}
            </a>
          ))}
        </nav>

        <div className="ns-header__actions">
          <LanguageSwitcher ariaLabel={t.switcherAria} />
          <a className="ns-header__login" href="/acceso-demo">
            {t.header.acceder}
          </a>
          <a className="ns-btn ns-btn--primary ns-btn--sm" href="/solicitar-demo">
            {t.header.solicitarDemo}
          </a>
        </div>

        <button
          ref={menuButtonRef}
          type="button"
          className="ns-header__menu-button"
          aria-expanded={open}
          aria-controls="ns-mobile-nav"
          aria-label={open ? t.header.ariaCerrar : t.header.ariaAbrir}
          onClick={() => setOpen((v) => !v)}
        >
          <span />
          <span />
        </button>
      </div>

      {/*
        Portaled to .nm-saas (not document.body - see portalTarget above):
        .ns-header has `backdrop-filter: blur(0px)` (present even at 0px,
        which still counts per spec), and that makes the header itself the
        containing block for any position:fixed descendant instead of the
        viewport. Left inline, this panel's `inset:0` resolved against the
        ~72px-tall header box, not the screen, and it rendered as a ~37px
        sliver instead of a full-height drawer. Portaling out from under
        that ancestor is the robust fix, not chasing z-index further.
      */}
      {portalTarget && createPortal(
        <AnimatePresence>
          {open && (
            <motion.nav
              id="ns-mobile-nav"
              className="ns-header__mobile-nav is-open"
              aria-label={t.header.ariaMovil}
              initial={reduceMotion ? false : { opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -12 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              {navItems.map((item) => (
                <a key={item.href} href={item.href} onClick={() => setOpen(false)}>
                  {item.label}
                </a>
              ))}
              <LanguageSwitcher ariaLabel={t.switcherAria} />
              <a className="ns-header__login" href="/acceso-demo" onClick={() => setOpen(false)}>
                {t.header.acceder}
              </a>
              <a className="ns-btn ns-btn--primary" href="/solicitar-demo" onClick={() => setOpen(false)}>
                {t.header.solicitarDemo}
              </a>
            </motion.nav>
          )}
        </AnimatePresence>,
        portalTarget,
      )}
    </header>
  )
}
