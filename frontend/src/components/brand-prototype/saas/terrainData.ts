export interface TerrainPhoto {
  id: string
  category: string
  title: string
  description: string
  image: string
  imageMobile: string
  imageAlt: string
  credit?: string
  creditUrl?: string
}

// Real, freely licensed photographs (Wikimedia Commons — public domain or
// CC BY / CC BY-SA). Full attribution and license text are documented in
// frontend/public/assets/landing/ASSET_SOURCES.md. Visible credit lines
// below satisfy the CC BY / BY-SA attribution requirement on-page.
export const terrainPhotos: TerrainPhoto[] = [
  {
    id: 'mineral-northmine',
    category: 'Mineral',
    title: 'Materia convertida en señal',
    description: 'La textura física del mineral inspira una lectura digital donde cada señal conserva su contexto operacional.',
    image: '/assets/landing/saas/mineral-copper-macro.webp',
    imageMobile: '/assets/landing/saas/mineral-copper-macro.webp',
    imageAlt: 'Macro de minerales de cobre con tonos metálicos y turquesa',
    credit: 'Activo visual proporcionado por NORTHMINE',
  },
  {
    id: 'mineral-iridescent',
    category: 'Mineral',
    title: 'El valor comienza en la materia',
    description: 'Texturas iridiscentes que recuerdan que cada indicador digital representa material, variabilidad y valor operacional real.',
    image: '/assets/landing/saas/mineral-iridescent.webp',
    imageMobile: '/assets/landing/saas/mineral-iridescent.webp',
    imageAlt: 'Macro de minerales iridiscentes en tonos cobre, verde, azul y violeta',
    credit: 'Activo visual proporcionado por NORTHMINE',
  },
  {
    id: 'caex-digital',
    category: 'Inteligencia',
    title: 'Del equipo a su gemelo operacional',
    description: 'Una representación conceptual del CAEX convertido en señales, contexto y decisiones dentro de NORTHMINE.',
    image: '/assets/landing/saas/caex-digital-twin.webp',
    imageMobile: '/assets/landing/saas/caex-digital-twin.webp',
    imageAlt: 'Representación digital luminosa de un camión minero CAEX sobre circuitos electrónicos',
    credit: 'Activo visual proporcionado por NORTHMINE',
  },
  {
    id: 'rajo',
    category: 'Rajo',
    title: 'Mina a rajo abierto',
    description: 'Vista aérea de una operación de cobre a cielo abierto, la misma escala de terreno que NORTHMINE lee turno a turno.',
    image: '/assets/landing/prototype/materials/terrain-openpit-kennecott.webp',
    imageMobile: '/assets/landing/prototype/materials/terrain-openpit-kennecott-900.webp',
    imageAlt: 'Vista aérea de una mina de cobre a rajo abierto',
    credit: 'Bruce McAllister · U.S. National Archives (NARA) · Dominio público',
    creditUrl: 'https://commons.wikimedia.org/wiki/File:KENNECOTT_SMELTER_AND_MINE_-_THE_LARGEST_OPEN-PIT_COPPER_MINE_IN_THE_WORLD_-_NARA_-_544792.jpg',
  },
  {
    id: 'caex',
    category: 'Flota',
    title: 'Camión CAEX en operación',
    description: 'Equipo de carguío pesado trabajando junto a una pala eléctrica, el mismo tipo de activo que la Flota CAEX monitorea.',
    image: '/assets/landing/prototype/materials/terrain-caex-real.webp',
    imageMobile: '/assets/landing/prototype/materials/terrain-caex-real-500.webp',
    imageAlt: 'Camión minero CAEX cargado junto a una pala en un banco de mina',
    credit: 'Peabody Energy · CC BY 3.0',
    creditUrl: 'https://commons.wikimedia.org/wiki/File:Coal_Haul_Truck_at_North_Antelope_Rochelle.png',
  },
  {
    id: 'pala',
    category: 'Carguío',
    title: 'Pala eléctrica de cable',
    description: 'Pala de cable cargando material en un frente activo, el equipo que el módulo de Carguío sigue por disponibilidad y rendimiento.',
    image: '/assets/landing/prototype/materials/terrain-pala-real.webp',
    imageMobile: '/assets/landing/prototype/materials/terrain-pala-real-500.webp',
    imageAlt: 'Pala eléctrica de cable P&H cargando material en una mina',
    credit: 'Sansumaria (Wikipedia en inglés) · CC BY-SA 3.0',
    creditUrl: 'https://commons.wikimedia.org/wiki/File:P%26H_4100XPB_Shovel-4.jpg',
  },
  {
    id: 'cobre',
    category: 'Mineral',
    title: 'Cobre nativo',
    description: 'Cobre nativo sin refinar — el mineral que da nombre al acento de marca de NORTHMINE.',
    image: '/assets/landing/prototype/materials/terrain-cobre-real.webp',
    imageMobile: '/assets/landing/prototype/materials/terrain-cobre-real-500.webp',
    imageAlt: 'Espécimen de cobre nativo sin refinar',
    credit: 'Jon Zander (Digon3) · CC BY-SA 3.0',
    creditUrl: 'https://commons.wikimedia.org/wiki/File:Natural_Copper_Ore_Macro_1.JPG',
  },
  {
    id: 'oro',
    category: 'Mineral',
    title: 'Oro en veta de cuarzo',
    description: 'Oro visible en una veta hidrotermal de cuarzo — el otro extremo del valor que se extrae y se reporta turno a turno.',
    image: '/assets/landing/prototype/materials/terrain-oro-real.webp',
    imageMobile: '/assets/landing/prototype/materials/terrain-oro-real-500.webp',
    imageAlt: 'Oro visible en una veta de cuarzo hidrotermal',
    credit: 'James St. John · CC BY 2.0',
    creditUrl: 'https://commons.wikimedia.org/wiki/File:Gold-quartz_hydrothermal_vein_(Eagles_Nest_Mine,_Placer_County,_California,_USA)_(17035851812).jpg',
  },
  {
    id: 'topografia',
    category: 'Topografía',
    title: 'Levantamiento topográfico',
    description: 'Curvas de nivel de un levantamiento minero histórico — la misma lógica que hoy vive en las capas DXF del Mapa Operacional 3D.',
    image: '/assets/landing/prototype/materials/terrain-topografia-real.webp',
    imageMobile: '/assets/landing/prototype/materials/terrain-topografia-real-700.webp',
    imageAlt: 'Mapa topográfico histórico con curvas de nivel de una zona minera',
    credit: 'USGS, Monograph XIII · Dominio público',
    creditUrl: 'https://commons.wikimedia.org/wiki/File:Geological_Map_of_the_Knoxville_District._U.S._Geological_Survey._Monograph_XIII,_Atlas_Sheet_V._Topography_by_J.D._Hoffman_(IA_dr_geological-map-of-the-knoxville-district-us-geological-survey-monograph-4580003).jpg',
  },
]
