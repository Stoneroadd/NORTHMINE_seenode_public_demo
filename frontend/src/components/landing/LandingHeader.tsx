import { useEffect, useState } from 'react'
import { ArrowRight, Menu, X } from 'lucide-react'
import { NorthmineLogo } from '../brand/NorthmineLogo'
import { useModuleT } from '../../i18n/useModuleT'
import { publicPagesT } from '../../i18n/modules/publicPages'
import { LanguageSwitcher } from '../common/LanguageSwitcher'

export function LandingHeader() {
  const t = useModuleT(publicPagesT)
  const [open, setOpen] = useState(false)

  const navigation = [
    { label: t.landingHeader.nav.capacidades, href: '/#capacidades' },
    { label: t.landingHeader.nav.flujo, href: '/#flujo' },
    { label: t.landingHeader.nav.demo, href: '/#demo' },
  ]

  useEffect(() => {
    if (!open) return undefined

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [open])

  return (
    <header className="nm-public-header">
      <a className="nm-skip-link" href="#contenido">
        {t.landingHeader.skip}
      </a>
      <div className="nm-public-header__inner">
        <a className="nm-public-brand" href="/" aria-label={t.landingHeader.ariaBrand}>
          <NorthmineLogo
            className="nm-public-brand__logo"
            variant="horizontal"
            alt={t.landingHeader.brandAlt}
          />
        </a>

        <button
          className="nm-public-menu-button"
          type="button"
          aria-expanded={open}
          aria-controls="public-navigation"
          aria-label={open ? t.landingHeader.ariaCerrar : t.landingHeader.ariaAbrir}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>

        <nav
          id="public-navigation"
          className={`nm-public-navigation${open ? ' is-open' : ''}`}
          aria-label={t.landingHeader.ariaNav}
        >
          <LanguageSwitcher ariaLabel={t.switcherAria} />
          <span className="nm-public-navigation__status">{t.landingHeader.status}</span>
          {navigation.map((item) => (
            <a key={item.href} href={item.href} onClick={() => setOpen(false)}>
              {item.label}
            </a>
          ))}
          <a className="nm-public-navigation__login" href="/acceso-demo">
            {t.landingHeader.accesoTengo}
          </a>
          <a className="nm-public-navigation__cta" href="/solicitar-demo">
            {t.landingHeader.cta} <ArrowRight size={16} aria-hidden="true" />
          </a>
        </nav>
      </div>
    </header>
  )
}
