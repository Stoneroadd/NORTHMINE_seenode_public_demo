import type { ModuleDict } from '../useModuleT'

export interface ReportsT {
  filtro_actual: string
  filtro_dia: string
  filtro_noche: string
  filtro_todos: string

  loading_reporte: string
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
    error_generico: 'No pudimos cargar el reporte de turno. Reintenta en unos segundos.',
    error_sufijo: ' No se muestran datos de demostración fuera de un contexto autorizado.',

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
    equipo_lider_carguio_titulo: 'Pala electrica lider',
    equipo_lider_carguio_subtitulo: 'PALA 1 / alto rendimiento de carguio',
    caex_destacado_titulo: 'CAEX destacado',
    caex_destacado_subtitulo: 'Camion con mayor aporte del turno',
    kpi_toneladas: 'Toneladas',
    kpi_meta: 'Meta',
    kpi_brecha: 'Brecha',
    kpi_top_carguio: 'Pala lider',
    principales_alertas: 'Principales alertas',
    recomendaciones: 'Recomendaciones',
  },
  en: {
    filtro_actual: 'Current',
    filtro_dia: 'Day shift',
    filtro_noche: 'Night shift',
    filtro_todos: 'All',

    loading_reporte: 'Connecting executive report to NORTHMINE...',
    error_generico: 'We could not load the shift report. Try again in a few seconds.',
    error_sufijo: ' Demonstration data is not shown outside an authorized context.',

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
  de: {
    filtro_actual: 'Aktuell',
    filtro_dia: 'Tagschicht',
    filtro_noche: 'Nachtschicht',
    filtro_todos: 'Alle',

    loading_reporte: 'Verbinde Executive-Bericht mit NORTHMINE...',
    error_generico: 'Der Schichtbericht konnte nicht geladen werden. Versuchen Sie es in Kürze erneut.',
    error_sufijo: ' Demo wird nicht ohne expliziten Backend-Modus verwendet.',

    fuente_cache_real: 'ECHTER CACHE',
    fuente_modo_demo: 'DEMO-MODUS',
    fuente_datos_reales: 'ECHTE DATEN',
    sin_registro: 'Kein Eintrag',

    eyebrow: 'Berichte',
    titulo: 'Executive-Zusammenfassung der Schicht',
    descripcion: 'Bericht verbunden mit dem NORTHMINE-System mit Zielerreichung, Abweichung, Top-Geräten, Alerts und Empfehlungen.',

    btn_actualizar_aria: 'Bericht aktualisieren',
    btn_actualizar: 'Aktualisieren',

    filtros_titulo: 'Berichtsfilter',
    estado_conexion_aria: 'Verbindungsstatus des Berichts',
    label_fuente: 'Quelle',
    label_sistema: 'System',
    label_ultimo_registro: 'Letzter Eintrag',
    label_generado: 'Generiert',

    eyebrow_reporte_ejecutivo: 'Executive-Bericht',
    turno_fecha: (turno, fecha) => `Schicht ${turno} - ${fecha}`,
    equipo_lider_carguio_titulo: 'Führender Bagger',
    equipo_lider_carguio_subtitulo: 'PALA 1 / hohe Ladeleistung',
    caex_destacado_titulo: 'Hervorgehobene CAEX',
    caex_destacado_subtitulo: 'Lkw mit dem höchsten Beitrag der Schicht',
    kpi_toneladas: 'Tonnen',
    kpi_meta: 'Ziel',
    kpi_brecha: 'Abweichung',
    kpi_top_carguio: 'Führender Bagger',
    principales_alertas: 'Wichtigste Alerts',
    recomendaciones: 'Empfehlungen',
  },
}
