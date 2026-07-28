import { useMemo } from 'react'
import { useAppStore } from '../store'
import type { LangId } from '../i18n/translations'

const LOCALE_MAP: Record<LangId, string> = {
  es: 'es-CL',
  en: 'en-US',
  fr: 'fr-FR',
  de: 'de-DE',
  pt: 'pt-BR',
  zh: 'zh-CN',
  ar: 'ar-SA',
  ru: 'ru-RU',
}

export function useFormat() {
  const lang   = useAppStore((s) => s.lang)
  const locale = LOCALE_MAP[lang] ?? 'es-CL'

  return useMemo(() => ({
    number: (n: number, decimals = 0) =>
      new Intl.NumberFormat(locale, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(n),

    pct: (n: number, decimals = 1) =>
      new Intl.NumberFormat(locale, {
        style: 'percent',
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(n / 100),

    tons: (n: number) => {
      if (Math.abs(n) >= 1_000_000)
        return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(n / 1_000_000)} Mt`
      return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(n)} t`
    },

    date: (iso: string) =>
      new Intl.DateTimeFormat(locale, {
        day: '2-digit', month: 'short', year: 'numeric',
      }).format(new Date(iso)),

    time: (iso: string) =>
      new Intl.DateTimeFormat(locale, {
        hour: '2-digit', minute: '2-digit',
      }).format(new Date(iso)),

    shortDate: (iso: string) =>
      new Intl.DateTimeFormat(locale, {
        day: '2-digit', month: '2-digit',
      }).format(new Date(iso)),
  }), [locale])
}
