import type { ModuleDict } from '../useModuleT'

export interface LayoutT {
  cerrar_navegacion: string
}

export const layoutT: ModuleDict<LayoutT> = {
  es: {
    cerrar_navegacion: 'Cerrar navegacion',
  },
  en: {
    cerrar_navegacion: 'Close navigation',
  },
}
