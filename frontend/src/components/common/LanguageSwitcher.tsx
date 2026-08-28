import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
// Flag emoji (regional-indicator letter pairs) don't render as pictures on
// stock Windows/Chrome -- they fall back to plain two-letter text (e.g. a
// literal "ES" glyph next to the "ES" language code, redundant and
// confusing). SVGs from flag-icons render identically everywhere.
import flagEs from 'flag-icons/flags/4x3/es.svg'
import flagGb from 'flag-icons/flags/4x3/gb.svg'
import flagDe from 'flag-icons/flags/4x3/de.svg'
import flagCn from 'flag-icons/flags/4x3/cn.svg'
import flagSa from 'flag-icons/flags/4x3/sa.svg'
import flagRu from 'flag-icons/flags/4x3/ru.svg'
import { useAppStore } from '../../store'
import type { LangId } from '../../i18n/translations'

const LANG_OPTIONS: { id: LangId; label: string; flag: string; name: string }[] = [
  { id: 'es', label: 'ES', flag: flagEs, name: 'Español' },
  { id: 'en', label: 'EN', flag: flagGb, name: 'English' },
  { id: 'de', label: 'DE', flag: flagDe, name: 'Deutsch' },
  { id: 'zh', label: '中文', flag: flagCn, name: '中文' },
  { id: 'ar', label: 'عربي', flag: flagSa, name: 'العربية' },
  { id: 'ru', label: 'RU', flag: flagRu, name: 'Русский' },
]

const RTL_LANGS: LangId[] = ['ar']

interface LanguageSwitcherProps {
  ariaLabel?: string
}

export function LanguageSwitcher({ ariaLabel = 'Idioma / Language' }: LanguageSwitcherProps) {
  const lang = useAppStore((s) => s.lang)
  const setLang = useAppStore((s) => s.setLang)
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const current = LANG_OPTIONS.find((option) => option.id === lang) ?? LANG_OPTIONS[0]

  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = RTL_LANGS.includes(lang) ? 'rtl' : 'ltr'
  }, [lang])

  // Collapsed to a single trigger + popover instead of six always-visible
  // buttons -- that row was eating enough header width to help force the
  // nav labels into a too-narrow flex item (see the mid-word wrap fix).
  useEffect(() => {
    if (!open) return undefined
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="lang-switcher" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="lang-switcher__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((v) => !v)}
      >
        <img className="lang-switcher__flag" src={current.flag} alt="" aria-hidden="true" width={18} height={13} />
        <span className="lang-switcher__code">{current.label}</span>
        <ChevronDown aria-hidden="true" size={14} className="lang-switcher__chevron" data-open={open} />
      </button>

      {open && (
        <ul className="lang-switcher__menu" role="listbox" aria-label={ariaLabel}>
          {LANG_OPTIONS.map((option) => (
            <li key={option.id} role="option" aria-selected={option.id === lang}>
              <button
                type="button"
                className={option.id === lang ? 'is-active' : undefined}
                onClick={() => {
                  setLang(option.id)
                  setOpen(false)
                  triggerRef.current?.focus()
                }}
              >
                <img className="lang-switcher__flag" src={option.flag} alt="" aria-hidden="true" width={18} height={13} />
                <span className="lang-switcher__name">{option.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
