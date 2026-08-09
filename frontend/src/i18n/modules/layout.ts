import type { ModuleDict } from '../useModuleT'

export interface LayoutT {
  cerrar_navegacion: string
  demo_banner: string
}

export const layoutT: ModuleDict<LayoutT> = {
  es: {
    cerrar_navegacion: 'Cerrar navegacion',
    demo_banner: 'MODO DEMO — Datos sinteticos de demostracion, no son operacion real.',
  },
  en: {
    cerrar_navegacion: 'Close navigation',
    demo_banner: 'DEMO MODE — Synthetic demonstration data, not real operations.',
  },
  de: {
    cerrar_navegacion: 'Navigation schließen',
    demo_banner: 'DEMO-MODUS — Synthetische Demonstrationsdaten, keine echten Betriebsdaten.',
  },
}
