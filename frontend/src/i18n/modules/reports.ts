import type { ModuleDict } from '../useModuleT'

export interface ReportsT {
  filtro_actual: string
  filtro_dia: string
  filtro_noche: string
  filtro_todos: string

  loading_reporte: string
  error_con_mensaje: (msg: string) => string
  error_generico: string
  error_sufijo: string

  fuente_cache_real: string
  fuente_modo_demo: string
  fuente_datos_reales: string
  sin_registro: string

  eyebrow: string
  titulo: string
  descripcion: string

  btn_actualizar_aria: string
  btn_actualizar: string

  filtros_titulo: string
  estado_conexion_aria: string
  label_fuente: string
  label_sistema: string
  label_ultimo_registro: string
  label_generado: string

  // ExecutiveShiftReport
  eyebrow_reporte_ejecutivo: string
  turno_fecha: (turno: string, fecha: string) => string
  equipo_lider_carguio_titulo: string
  equipo_lider_carguio_subtitulo: string
  caex_destacado_titulo: string
  caex_destacado_subtitulo: string
  kpi_toneladas: string
  kpi_meta: string
  kpi_brecha: string
  kpi_top_carguio: string
  principales_alertas: string
  recomendaciones: string
}

export const reportsT: ModuleDict<ReportsT> = {
  es: {
    filtro_actual: 'Actual',
    filtro_dia: 'Turno Dia',
    filtro_noche: 'Turno Noche',
    filtro_todos: 'Todos',

    loading_reporte: 'Conectando reporte ejecutivo con NORTHMINE...',
    error_con_mensaje: (msg) => `No se pudo cargar /api/reports/shift: ${msg}`,
    error_generico: 'No se pudo cargar /api/reports/shift.',
    error_sufijo: ' No se usa demo sin modo explicito del backend.',

    fuente_cache_real: 'CACHE REAL',
    fuente_modo_demo: 'MODO DEMO',
    fuente_datos_reales: 'DATOS REALES',
    sin_registro: 'Sin registro',

    eyebrow: 'Reportes',
    titulo: 'Resumen ejecutivo de turno',
    descripcion: 'Reporte conectado al sistema NORTHMINE con cumplimiento, brecha, top equipos, alertas y recomendaciones.',

    btn_actualizar_aria: 'Actualizar reporte',
    btn_actualizar: 'Actualizar',

    filtros_titulo: 'Filtros reporte',
    estado_conexion_aria: 'Estado de conexion del reporte',
    label_fuente: 'Fuente',
    label_sistema: 'Sistema',
    label_ultimo_registro: 'Ultimo registro',
    label_generado: 'Generado',

    eyebrow_reporte_ejecutivo: 'Reporte ejecutivo',
    turno_fecha: (turno, fecha) => `Turno ${turno} - ${fecha}`,
    equipo_lider_carguio_titulo: 'Equipo lider de carguio',
    equipo_lider_carguio_subtitulo: 'Unidad destacada del reporte ejecutivo',
    caex_destacado_titulo: 'CAEX destacado',
    caex_destacado_subtitulo: 'Camion con mayor aporte del turno',
    kpi_toneladas: 'Toneladas',
    kpi_meta: 'Meta',
    kpi_brecha: 'Brecha',
    kpi_top_carguio: 'Top carguio',
    principales_alertas: 'Principales alertas',
    recomendaciones: 'Recomendaciones',
  },
  en: {
    filtro_actual: 'Current',
    filtro_dia: 'Day shift',
    filtro_noche: 'Night shift',
    filtro_todos: 'All',

    loading_reporte: 'Connecting executive report to NORTHMINE...',
    error_con_mensaje: (msg) => `Could not load /api/reports/shift: ${msg}`,
    error_generico: 'Could not load /api/reports/shift.',
    error_sufijo: ' Demo mode is not used without an explicit backend flag.',

    fuente_cache_real: 'REAL CACHE',
    fuente_modo_demo: 'DEMO MODE',
    fuente_datos_reales: 'REAL DATA',
    sin_registro: 'No record',

    eyebrow: 'Reports',
    titulo: 'Executive shift summary',
    descripcion: 'Report connected to the NORTHMINE system with compliance, gap, top equipment, alerts and recommendations.',

    btn_actualizar_aria: 'Refresh report',
    btn_actualizar: 'Refresh',

    filtros_titulo: 'Report filters',
    estado_conexion_aria: 'Report connection status',
    label_fuente: 'Source',
    label_sistema: 'System',
    label_ultimo_registro: 'Last record',
    label_generado: 'Generated',

    eyebrow_reporte_ejecutivo: 'Executive report',
    turno_fecha: (turno, fecha) => `Shift ${turno} - ${fecha}`,
    equipo_lider_carguio_titulo: 'Top loading unit',
    equipo_lider_carguio_subtitulo: 'Featured unit from the executive report',
    caex_destacado_titulo: 'Featured CAEX',
    caex_destacado_subtitulo: 'Truck with the highest contribution of the shift',
    kpi_toneladas: 'Tonnage',
    kpi_meta: 'Target',
    kpi_brecha: 'Gap',
    kpi_top_carguio: 'Top loading unit',
    principales_alertas: 'Main alerts',
    recomendaciones: 'Recommendations',
  },
}
