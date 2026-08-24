import { useEffect } from 'react'
import type { LangId } from '../../i18n/translations'
import { useAppStore } from '../../store'

// Orbitron, Share Tech Mono, Exo 2, Rajdhani and Barlow Condensed were
// requested here but appear in zero `font-family` declarations anywhere
// in src/ -- dropped. Inter and JetBrains Mono at these exact weights are
// already covered by tokens.css's own @import. IBM Plex Sans/Mono weights
// 400/500/600 are already self-hosted locally (northmine-fonts.css); only
// weight 700 is an actual gap, so that's all that's requested here.
export const ARABIC_FONT_STYLESHEET = 'https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700&display=swap'
export const OPERATIONAL_FONT_STYLESHEET = 'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@700&family=IBM+Plex+Sans:wght@700&display=swap'

export function operationalFontStylesheets(lang: LangId): string[] {
  return lang === 'ar'
    ? [OPERATIONAL_FONT_STYLESHEET, ARABIC_FONT_STYLESHEET]
    : [OPERATIONAL_FONT_STYLESHEET]
}

export function OperationalFontLoader() {
  const lang = useAppStore((state) => state.lang)

  useEffect(() => {
    const desiredStylesheets = new Set(operationalFontStylesheets(lang))
    const managedLinks = document.querySelectorAll<HTMLLinkElement>('link[data-northmine-operational-font]')

    managedLinks.forEach((link) => {
      if (!desiredStylesheets.has(link.href)) link.remove()
    })

    desiredStylesheets.forEach((href) => {
      if (document.querySelector(`link[href="${href}"]`)) return

      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = href
      link.dataset.northmineOperationalFont = 'true'
      document.head.appendChild(link)
    })
  }, [lang])

  return null
}
