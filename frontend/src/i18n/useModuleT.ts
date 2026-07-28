import { useAppStore } from '../store'
import type { LangId } from './translations'

// Diccionario de traduccion por modulo/pagina: es y en son obligatorios
// (cobertura completa), el resto de idiomas es opcional y cae de vuelta a
// es si no esta definido (mismo comportamiento que tenian estos textos
// antes de traducirse: se ven en espanol).
export type ModuleDict<T> = { es: T; en: T } & Partial<Record<Exclude<LangId, 'es' | 'en'>, T>>

export function useModuleT<T>(dict: ModuleDict<T>): T {
  const lang = useAppStore((s) => s.lang)
  return (dict as Partial<Record<LangId, T>>)[lang] ?? dict.es
}
