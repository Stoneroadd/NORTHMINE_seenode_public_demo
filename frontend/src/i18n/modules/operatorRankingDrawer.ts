import type { ModuleDict } from '../useModuleT'

export interface OperatorRankingDrawerT {
  cerrar_detalle: string
  selecciona_operador: string
  detalle_operacional: string
  sin_recurrencia: string
  lectura_contextual: string
  resumen_productivo_aria: string
  score: string
  tonelaje: string
  esperado_sufijo: (tons: string) => string
  ciclos: string
  productividad: string
  score_productivo: string
  demoras: string
  sistema_sufijo: (min: string) => string
  impacto: string
  perdida_estimada: string
  equipo_frecuente: string
  detalle_no_disponible_titulo: string
  detalle_no_disponible_desc: string
  cargando_detalle: string
  explicacion_score: string
  sin_explicacion: string
  tendencia: string
  sin_tendencia: string
  demoras_por_categoria: string
  sin_demoras_categorizadas: string
  timeline_operacional: string
  sin_eventos_demora: string
  coaching: string
  recomendacion: string
  privacy_note_default: string
}

export const operatorRankingDrawerT: ModuleDict<OperatorRankingDrawerT> = {
  es: {
    cerrar_detalle: 'Cerrar detalle',
    selecciona_operador: 'Selecciona un operador.',
    detalle_operacional: 'Detalle operacional',
    sin_recurrencia: 'Sin recurrencia',
    lectura_contextual: 'Lectura operacional contextual. Validar frente, asignacion, flota, esperas sistemicas y relevo antes de concluir responsabilidad.',
    resumen_productivo_aria: 'Resumen productivo del operador',
    score: 'Score',
    tonelaje: 'Tonelaje',
    esperado_sufijo: (tons) => `${tons} esperado`,
    ciclos: 'Ciclos',
    productividad: 'Productividad',
    score_productivo: 'Score productivo',
    demoras: 'Demoras',
    sistema_sufijo: (min) => `${min} sistema`,
    impacto: 'Impacto',
    perdida_estimada: 'perdida estimada',
    equipo_frecuente: 'Equipo frecuente',
    detalle_no_disponible_titulo: 'Detalle API no disponible',
    detalle_no_disponible_desc: 'Se muestran los datos principales recibidos desde el ranking global. Revisa /api/operator-ranking/detail para el desglose fino.',
    cargando_detalle: 'Cargando detalle...',
    explicacion_score: 'Explicacion del score',
    sin_explicacion: 'Sin explicacion detallada para los filtros actuales.',
    tendencia: 'Tendencia',
    sin_tendencia: 'Sin tendencia para los filtros.',
    demoras_por_categoria: 'Demoras por categoria',
    sin_demoras_categorizadas: 'Sin demoras categorizadas para este operador y filtro.',
    timeline_operacional: 'Timeline operacional',
    sin_eventos_demora: 'Sin eventos de demora para el filtro seleccionado.',
    coaching: 'Coaching',
    recomendacion: 'Recomendacion',
    privacy_note_default: 'Uso orientado a analisis operacional. Validar contexto antes de tomar decisiones.',
  },
  en: {
    cerrar_detalle: 'Close detail',
    selecciona_operador: 'Select an operator.',
    detalle_operacional: 'Operational detail',
    sin_recurrencia: 'No recurrence',
    lectura_contextual: 'Contextual operational reading. Validate face conditions, assignment, fleet, systemic waits and shift handover before concluding responsibility.',
    resumen_productivo_aria: 'Operator productivity summary',
    score: 'Score',
    tonelaje: 'Tonnage',
    esperado_sufijo: (tons) => `${tons} expected`,
    ciclos: 'Cycles',
    productividad: 'Productivity',
    score_productivo: 'Productivity score',
    demoras: 'Delays',
    sistema_sufijo: (min) => `${min} system`,
    impacto: 'Impact',
    perdida_estimada: 'estimated loss',
    equipo_frecuente: 'Frequent equipment',
    detalle_no_disponible_titulo: 'API detail unavailable',
    detalle_no_disponible_desc: 'Showing the main data received from the global ranking. Check /api/operator-ranking/detail for the fine-grained breakdown.',
    cargando_detalle: 'Loading detail...',
    explicacion_score: 'Score explanation',
    sin_explicacion: 'No detailed explanation for the current filters.',
    tendencia: 'Trend',
    sin_tendencia: 'No trend for the current filters.',
    demoras_por_categoria: 'Delays by category',
    sin_demoras_categorizadas: 'No categorized delays for this operator and filter.',
    timeline_operacional: 'Operational timeline',
    sin_eventos_demora: 'No delay events for the selected filter.',
    coaching: 'Coaching',
    recomendacion: 'Recommendation',
    privacy_note_default: 'Intended for operational analysis. Validate context before making decisions.',
  },
  de: {
    cerrar_detalle: 'Detail schließen',
    selecciona_operador: 'Wählen Sie einen Operator.',
    detalle_operacional: 'Operatives Detail',
    sin_recurrencia: 'Keine Wiederholung',
    lectura_contextual: 'Kontextuelle operative Lesart. Abbaufront, Zuweisung, Flotte, systemische Wartezeiten und Schichtübergabe prüfen, bevor Verantwortung zugewiesen wird.',
    resumen_productivo_aria: 'Produktive Zusammenfassung des Operators',
    score: 'Score',
    tonelaje: 'Tonnage',
    esperado_sufijo: (tons) => `${tons} erwartet`,
    ciclos: 'Zyklen',
    productividad: 'Produktivität',
    score_productivo: 'Produktiver Score',
    demoras: 'Verzögerungen',
    sistema_sufijo: (min) => `${min} System`,
    impacto: 'Auswirkung',
    perdida_estimada: 'geschätzter Verlust',
    equipo_frecuente: 'Häufiges Gerät',
    detalle_no_disponible_titulo: 'API-Detail nicht verfügbar',
    detalle_no_disponible_desc: 'Es werden die wichtigsten Daten aus dem globalen Ranking angezeigt. Prüfen Sie /api/operator-ranking/detail für die feine Aufschlüsselung.',
    cargando_detalle: 'Lade Detail...',
    explicacion_score: 'Erläuterung des Scores',
    sin_explicacion: 'Keine detaillierte Erläuterung für die aktuellen Filter.',
    tendencia: 'Tendenz',
    sin_tendencia: 'Keine Tendenz für die aktuellen Filter.',
    demoras_por_categoria: 'Verzögerungen nach Kategorie',
    sin_demoras_categorizadas: 'Keine kategorisierten Verzögerungen für diesen Operator und Filter.',
    timeline_operacional: 'Operativer Zeitverlauf',
    sin_eventos_demora: 'Keine Verzögerungsereignisse für den gewählten Filter.',
    coaching: 'Coaching',
    recomendacion: 'Empfehlung',
    privacy_note_default: 'Nutzung zur operativen Analyse. Kontext vor Entscheidungen prüfen.',
  },
}
