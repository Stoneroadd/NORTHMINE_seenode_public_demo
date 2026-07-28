import { useLayoutEffect } from 'react'
import { useAppStore } from '../store'

export function useTheme() {
  const themeId = useAppStore((s) => s.themeId)
  const lang = useAppStore((s) => s.lang)
  const effects = useAppStore((s) => s.effects)

  useLayoutEffect(() => {
    const html = document.documentElement

    html.setAttribute('data-theme', themeId)
    html.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr')
    html.setAttribute('lang', lang)

    const body = document.body
    body.classList.toggle('fx-scanlines', effects.scanlines)
    body.classList.toggle('fx-hexgrid', effects.hexgrid)
    body.classList.toggle('fx-glow', effects.glow)
    body.classList.toggle('fx-cursor', effects.cursor)
    body.classList.toggle('fx-animations', effects.animations)

    body.classList.add('theme-transitioning')
    const timer = setTimeout(() => {
      body.classList.remove('theme-transitioning')
    }, 450)

    return () => clearTimeout(timer)
  }, [themeId, lang, effects])
}
