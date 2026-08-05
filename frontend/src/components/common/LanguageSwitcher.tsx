import { useEffect } from 'react'
import { useAppStore } from '../../store'
import type { LangId } from '../../i18n/translations'

const LANG_OPTIONS: { id: LangId; label: string }[] = [
  { id: 'es', label: 'ES' },
  { id: 'en', label: 'EN' },
  { id: 'de', label: 'DE' },
  { id: 'zh', label: '中文' },
  { id: 'ar', label: 'عربي' },
  { id: 'ru', label: 'RU' },
]

const RTL_LANGS: LangId[] = ['ar']

interface LanguageSwitcherProps {
  ariaLabel?: string
}

export function LanguageSwitcher({ ariaLabel = 'Idioma / Language' }: LanguageSwitcherProps) {
  const lang = useAppStore((s) => s.lang)
  const setLang = useAppStore((s) => s.setLang)

  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = RTL_LANGS.includes(lang) ? 'rtl' : 'ltr'
  }, [lang])

  return (
    <div className="lang-switcher" role="group" aria-label={ariaLabel}>
      {LANG_OPTIONS.map((option) => (
        <button
          key={option.id}
          type="button"
          className={option.id === lang ? 'is-active' : undefined}
          aria-pressed={option.id === lang}
          onClick={() => setLang(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
