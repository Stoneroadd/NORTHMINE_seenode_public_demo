import type { ModuleDict } from '../useModuleT'

export interface LoadingUnitsT {
  loading_label: string
  error_detail: string

  eyebrow: string
  title: string
  description: string
  exporting: string
  export_csv: string

  kpi_tonnage_title: string
  kpi_tonnage_subtitle: (count: number) => string
  kpi_tonnage_trend: string
  kpi_performance_title: string
  kpi_performance_subtitle: string
  kpi_performance_trend: string
  kpi_top_unit_title: string
  kpi_top_unit_no_data: string
  kpi_top_unit_trend: (cycles: number) => string
  kpi_distance_title: string
  kpi_distance_subtitle: string
  kpi_distance_trend: (tons: string) => string

  ranking_kicker: string
  ranking_title: string
  ranking_tag: (count: number) => string
  distance_kicker: string
  distance_title: string
  distance_tag: string
  routes_kicker: string
  routes_title: string
  routes_tag: (count: number) => string
}

export const loadingUnitsT: ModuleDict<LoadingUnitsT> = {
  es: {
    loading_label: 'Cargando modulo de carguio...',
    error_detail: 'No se pudo cargar el modulo de carguio.',

    eyebrow: 'Carguio',
    title: 'Palas, frentes activos y rutas',
    description: 'Rendimiento UC, toneladas por ciclo, distancia por ciclo y rutas principales.',
    exporting: 'Exportando...',
    export_csv: 'Export UC CSV',

    kpi_tonnage_title: 'Ton carguio',
    kpi_tonnage_subtitle: (count) => `${count} unidades`,
    kpi_tonnage_trend: 'turno actual',
    kpi_performance_title: 'Rendimiento',
    kpi_performance_subtitle: 'Promedio UC',
    kpi_performance_trend: 'operacional',
    kpi_top_unit_title: 'Top unidad',
    kpi_top_unit_no_data: 'Sin datos',
    kpi_top_unit_trend: (cycles) => `${cycles} ciclos`,
    kpi_distance_title: 'Distancia',
    kpi_distance_subtitle: 'Total desde ciclos WENCO',
    kpi_distance_trend: (tons) => `${tons} t hora a hora`,

    ranking_kicker: 'Ranking',
    ranking_title: 'Tonelaje por UC',
    ranking_tag: (count) => `${count} unidades`,
    distance_kicker: 'Distancia',
    distance_title: 'Promedio por ciclo',
    distance_tag: 'Estimado',
    routes_kicker: 'Rutas',
    routes_title: 'Principales rutas de carguio',
    routes_tag: (count) => `Top ${count}`,
  },
  en: {
    loading_label: 'Loading loading-units module...',
    error_detail: 'Could not load the loading-units module.',

    eyebrow: 'Loading Units',
    title: 'Loaders, active fronts and routes',
    description: 'Loading unit performance, tons per cycle, distance per cycle and main routes.',
    exporting: 'Exporting...',
    export_csv: 'Export UC CSV',

    kpi_tonnage_title: 'Loading tonnage',
    kpi_tonnage_subtitle: (count) => `${count} units`,
    kpi_tonnage_trend: 'current shift',
    kpi_performance_title: 'Performance',
    kpi_performance_subtitle: 'Loading unit average',
    kpi_performance_trend: 'operational',
    kpi_top_unit_title: 'Top unit',
    kpi_top_unit_no_data: 'No data',
    kpi_top_unit_trend: (cycles) => `${cycles} cycles`,
    kpi_distance_title: 'Distance',
    kpi_distance_subtitle: 'Total from WENCO cycles',
    kpi_distance_trend: (tons) => `${tons} t hour by hour`,

    ranking_kicker: 'Ranking',
    ranking_title: 'Tonnage per loading unit',
    ranking_tag: (count) => `${count} units`,
    distance_kicker: 'Distance',
    distance_title: 'Average per cycle',
    distance_tag: 'Estimated',
    routes_kicker: 'Routes',
    routes_title: 'Main loading routes',
    routes_tag: (count) => `Top ${count}`,
  },
}
