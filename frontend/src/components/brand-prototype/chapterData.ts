export interface ArchiveChapter {
  id: string
  number: string
  title: string
  eyebrow: string
  description: string
  facts: { label: string; value: string }[]
  evidenceLabel: string
  coordinate: string
  image: string
  imageAlt: string
  imagePosition?: string
}

/**
 * Content for the Archivo Operacional (Momento 4), separated from
 * presentation so OperationalArchive.tsx stays about layout/interaction,
 * not copy.
 */
export const archiveChapters: ArchiveChapter[] = [
  {
    id: 'terreno',
    number: '01',
    title: 'Terreno y contexto',
    eyebrow: 'Terreno',
    description:
      'El ortomosaico sintético y la capa DXF ubican cada decisión sobre la geometría real del rajo: bancos, niveles y coordenadas, no una ilustración genérica.',
    facts: [
      { label: 'Banco', value: 'Nivel 2 424 — 1 960' },
      { label: 'Polilíneas DXF', value: '4 823' },
      { label: 'Cobertura', value: 'Ortomosaico completo' },
    ],
    evidenceLabel: 'ORTOMOSAICO SINTÉTICO · CAPA DXF DEMO',
    coordinate: 'E 491 496 · N 7 449 154',
    image: '/assets/landing/open-pit-orthomosaic-synthetic.webp',
    imageAlt: 'Ortomosaico sintético de un rajo abierto con geometría de banco',
  },
  {
    id: 'carguio',
    number: '02',
    title: 'Unidades de carguío',
    eyebrow: 'Equipos',
    description:
      'Cada pala conserva su estado, su frente y su destino. Seleccionar una unidad no abre una ficha aislada: mantiene el turno completo como contexto.',
    facts: [
      { label: 'Unidad seleccionada', value: 'Pala eléctrica 02' },
      { label: 'Estado', value: 'Cargando' },
      { label: 'Destino', value: 'Botadero Norte' },
    ],
    evidenceLabel: 'ESCENA SINTÉTICA · CARGUÍO',
    coordinate: 'RL 2 180 · Frente F02',
    image: '/assets/landing/electric-shovel-loading-synthetic.webp',
    imageAlt: 'Pala eléctrica sintética, sin marca, cargando un CAEX en un banco minero',
  },
  {
    id: 'caex',
    number: '03',
    title: 'Flota CAEX',
    eyebrow: 'Equipos',
    description:
      'Disponibilidad, ciclo y circuito quedan vinculados a la misma unidad que aparece en el terreno — sin perder de vista la ruta de acarreo real.',
    facts: [
      { label: 'CAEX activos', value: '18' },
      { label: 'Ciclo promedio', value: '18,4 min' },
      { label: 'Ruta', value: 'F02 → CF2' },
    ],
    evidenceLabel: 'ESCENA SINTÉTICA · RUTA DE ACARREO',
    coordinate: 'RL 2 090 · Ruta F02–CF2',
    image: '/assets/landing/caex-haul-road-synthetic.webp',
    imageAlt: 'CAEX sintético, sin marca, circulando por una ruta de acarreo',
  },
  {
    id: 'produccion',
    number: '04',
    title: 'Producción y brecha',
    eyebrow: 'Producción',
    description:
      'La lectura horaria compara lo proyectado con lo real y expone la brecha exacta que falta cerrar antes de que termine el turno.',
    facts: [
      { label: 'Turno a esta hora', value: '+37.743 t' },
      { label: 'Proyectado fin turno', value: '112.600 t' },
      { label: 'Brecha vs. meta', value: '+42.600 t' },
    ],
    evidenceLabel: 'LECTURA DE TURNO · DATOS SINTÉTICOS',
    coordinate: 'Turno noche · 19:00–07:00',
    image: '/assets/landing/prototype/product/cockpit-operational-demo-capture.webp',
    imageAlt: 'Captura del Decision Cockpit mostrando la lectura ejecutiva de producción del turno',
    imagePosition: '18% 42%',
  },
  {
    id: 'riesgo',
    number: '05',
    title: 'Riesgo operacional',
    eyebrow: 'Riesgo',
    description:
      'Cada señal de riesgo llega con su causa y su criticidad — nunca como una alerta aislada sin el contexto que permite decidir.',
    facts: [
      { label: 'Equipo a revisar', value: 'CF 2' },
      { label: 'Causa', value: 'Eficiencia bajo umbral' },
      { label: 'Criticidad', value: 'Media' },
    ],
    evidenceLabel: 'SEÑAL DE RIESGO · DATOS SINTÉTICOS',
    coordinate: 'CF 2 · 72,3% eficiencia',
    image: '/assets/landing/prototype/product/cockpit-operational-demo-capture.webp',
    imageAlt: 'Captura del Decision Cockpit mostrando la tarjeta de equipo a revisar',
    imagePosition: '62% 48%',
  },
  {
    id: 'decision',
    number: '06',
    title: 'Decisión y resultado',
    eyebrow: 'Decisión',
    description:
      'La recomendación llega con la acción concreta, el responsable y el resultado esperado — lista para ejecutarse y luego trazarse.',
    facts: [
      { label: 'Acción recomendada', value: 'Mover CAEX a CF2' },
      { label: 'Impacto esperado', value: '+3.260 t / USD 14.500' },
      { label: 'Confianza', value: 'Alta' },
    ],
    evidenceLabel: 'RECOMENDACIÓN · DATOS SINTÉTICOS',
    coordinate: 'Acción registrada · turno noche',
    image: '/assets/landing/prototype/product/cockpit-operational-demo-capture.webp',
    imageAlt: 'Captura del Decision Cockpit mostrando la tarjeta de acción recomendada',
    imagePosition: '95% 48%',
  },
]
