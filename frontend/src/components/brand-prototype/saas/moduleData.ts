export interface Module {
  id: string
  category: 'Operación' | 'Producción' | 'Equipos' | 'Riesgo' | 'Inteligencia'
  name: string
  description: string
  image: string
  imageMobile: string
  imageAlt: string
}

export const modules: Module[] = [
  {
    id: 'cockpit',
    category: 'Operación',
    name: 'Decision Cockpit',
    description: 'Estado, brecha, ritmo requerido y acción recomendada en una sola lectura del turno.',
    image: '/assets/landing/prototype/product/cockpit-operational-demo-capture.webp',
    imageMobile: '/assets/landing/prototype/product/cockpit-operational-demo-capture-900.webp',
    imageAlt: 'Captura del Decision Cockpit con la lectura ejecutiva del turno, datos sintéticos',
  },
  {
    id: 'production',
    category: 'Producción',
    name: 'Producción',
    description: 'Tonelaje, plan diario y proyección de cierre comparados contra la meta del turno.',
    image: '/assets/landing/prototype/product/module-production.webp',
    imageMobile: '/assets/landing/prototype/product/module-production-600.webp',
    imageAlt: 'Captura del módulo de Producción mostrando tonelaje y plan diario, datos sintéticos',
  },
  {
    id: 'fleet',
    category: 'Equipos',
    name: 'Flota CAEX',
    description: 'Estado operativo, subestado WENCO y ciclos de cada camión, con lista completa filtrable.',
    image: '/assets/landing/prototype/product/module-fleet.webp',
    imageMobile: '/assets/landing/prototype/product/module-fleet-600.webp',
    imageAlt: 'Captura del módulo de Flota CAEX mostrando estado y ciclos, datos sintéticos',
  },
  {
    id: 'loading',
    category: 'Equipos',
    name: 'Carguío',
    description: 'Palas y frentes activos, con disponibilidad y rendimiento vinculados al mismo turno.',
    image: '/assets/landing/prototype/product/module-loading.webp',
    imageMobile: '/assets/landing/prototype/product/module-loading-600.webp',
    imageAlt: 'Captura del módulo de Carguío mostrando palas y frentes activos, datos sintéticos',
  },
  {
    id: 'breakdowns',
    category: 'Riesgo',
    name: 'Averías',
    description: 'Inactividad y fallas registradas, con impacto sobre la disponibilidad de flota.',
    image: '/assets/landing/prototype/product/module-breakdowns.webp',
    imageMobile: '/assets/landing/prototype/product/module-breakdowns-600.webp',
    imageAlt: 'Captura del módulo de Averías mostrando inactividad y fallas, datos sintéticos',
  },
  {
    id: 'alerts',
    category: 'Riesgo',
    name: 'Alertas',
    description: 'Riesgo y seguridad operacional priorizados por criticidad, no por orden de llegada.',
    image: '/assets/landing/prototype/product/module-alerts.webp',
    imageMobile: '/assets/landing/prototype/product/module-alerts-600.webp',
    imageAlt: 'Captura del módulo de Alertas mostrando riesgo priorizado, datos sintéticos',
  },
  {
    id: 'map3d',
    category: 'Inteligencia',
    name: 'Mapa Operacional 3D',
    description: 'Constelación dinámica que relaciona producción, flota, riesgos y plan mensual.',
    image: '/assets/landing/prototype/product/module-map3d.webp',
    imageMobile: '/assets/landing/prototype/product/module-map3d-600.webp',
    imageAlt: 'Captura del Mapa Operacional 3D mostrando la constelación de datos, datos sintéticos',
  },
  {
    id: 'aerial',
    category: 'Producción',
    name: 'Vista Aérea',
    description: 'Ortomosaicos y estado del rajo desde arriba, como contexto físico de la operación.',
    image: '/assets/landing/prototype/product/module-aerial.webp',
    imageMobile: '/assets/landing/prototype/product/module-aerial-600.webp',
    imageAlt: 'Captura del módulo de Vista Aérea mostrando ortomosaicos, datos sintéticos',
  },
]

export const moduleFilters = ['Todos', 'Operación', 'Producción', 'Equipos', 'Riesgo', 'Inteligencia'] as const
