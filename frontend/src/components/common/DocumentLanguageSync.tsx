import { useEffect } from 'react'
import { useAppStore } from '../../store'

const RTL_LANGS = ['ar']

export function DocumentLanguageSync() {
  const lang = useAppStore((s) => s.lang)

  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = RTL_LANGS.includes(lang) ? 'rtl' : 'ltr'
  }, [lang])

  return null
}
