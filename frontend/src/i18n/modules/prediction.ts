import type { ModuleDict } from '../useModuleT'

export interface PredictionT {
  loading: string
  error: string
  header_eyebrow: string
  header_title: string
  header_desc: string
  header_meta: (fecha: string, turno: string) => string
  modelo_predictivo: string
  turnos_entrenados: (n: number) => string
  modelo_acierta: (pct: number) => string
  stat_produccion_actual: string
  stat_produccion_actual_sub: (ritmo: number) => string
  stat_proyeccion_final: string
  stat_proyeccion_final_sub: (inf: string, sup: string) => string
  stat_meta_turno: string
  stat_ritmo_actual_necesario: string
  stat_ritmo_necesario_sub: (necesario: number) => string
  progreso_turno: string
  horas_transcurridas: (h: number) => string
  transcurrido_restantes: (pct: string, horas: number) => string
  cumplimiento_proyectado: string
  chart_proyeccion_kicker: string
  chart_proyeccion_title: string
  chart_features_kicker: string
  chart_features_title: string
  legend_operacional: string
  legend_acumulado: string
  legend_temporal: string
  chart_historico_kicker: string
  chart_historico_title: (n: number) => string
  table_col_turno: string
  table_col_predicho: string
  table_col_real: string
  table_col_error: string
  table_col_estado: string
  badge_acertado: string
  badge_margen: string
  badge_fallo: string
  chart_recomendacion_kicker: string
  chart_recomendacion_title: (factor: string) => string
  series_banda_confianza: string
  series_proyeccion: string
  series_meta_turno: string
  mark_ahora: string
  series_predicho: string
  series_real: string
  tooltip_importancia: (nombre: string, descripcion: string, pct: string) => string
}

export const predictionT: ModuleDict<PredictionT> = {
  es: {
    loading: 'Cargando predicción ML...',
    error: 'Prediccion no disponible en este momento.',
    header_eyebrow: 'ML / Inteligencia',
    header_title: 'Predicción de Turno',
    header_desc: 'Proyección de producción basada en modelo predictivo entrenado con histórico operacional.',
    header_meta: (fecha, turno) => `${fecha} · Turno ${turno}`,
    modelo_predictivo: 'Modelo predictivo',
    turnos_entrenados: (n) => `${n} turnos entrenados`,
    modelo_acierta: (pct) => `El modelo acierta el ${pct}% de la variación en producción`,
    stat_produccion_actual: 'Producción actual',
    stat_produccion_actual_sub: (ritmo) => `Ritmo: ${ritmo} t/h`,
    stat_proyeccion_final: 'Proyección final',
    stat_proyeccion_final_sub: (inf, sup) => `IC: ${inf} – ${sup}`,
    stat_meta_turno: 'Meta turno',
    stat_ritmo_actual_necesario: 'Ritmo actual / Necesario',
    stat_ritmo_necesario_sub: (necesario) => `Necesario: ${necesario} t/h`,
    progreso_turno: 'Progreso del turno',
    horas_transcurridas: (h) => `${h}h transcurridas`,
    transcurrido_restantes: (pct, horas) => `${pct}% transcurrido · ${horas}h restantes`,
    cumplimiento_proyectado: '% Cumplimiento proyectado',
    chart_proyeccion_kicker: 'Proyección con intervalo de confianza',
    chart_proyeccion_title: 'Producción acumulada vs meta',
    chart_features_kicker: 'Variables del modelo',
    chart_features_title: 'Importancia de features',
    legend_operacional: '■ Operacional',
    legend_acumulado: '■ Acumulado',
    legend_temporal: '■ Temporal',
    chart_historico_kicker: 'Validación histórica',
    chart_historico_title: (n) => `Predicho vs Real — últimos ${n} turnos`,
    table_col_turno: 'Turno',
    table_col_predicho: 'Predicho',
    table_col_real: 'Real',
    table_col_error: 'Error%',
    table_col_estado: 'Estado',
    badge_acertado: 'Acertado',
    badge_margen: 'Margen',
    badge_fallo: 'Fallo',
    chart_recomendacion_kicker: 'Recomendación operacional',
    chart_recomendacion_title: (factor) => `Factor crítico: ${factor}`,
    series_banda_confianza: 'Banda confianza',
    series_proyeccion: 'Proyección',
    series_meta_turno: 'Meta turno',
    mark_ahora: 'AHORA',
    series_predicho: 'Predicho',
    series_real: 'Real',
    tooltip_importancia: (nombre, descripcion, pct) =>
      `<strong>${nombre}</strong><br/>${descripcion}<br/>Importancia: ${pct}%`,
  },
  en: {
    loading: 'Loading ML prediction...',
    error: 'Prediction not available at this time.',
    header_eyebrow: 'ML / Intelligence',
    header_title: 'Shift Prediction',
    header_desc: 'Production projection based on a predictive model trained on operational history.',
    header_meta: (fecha, turno) => `${fecha} · Shift ${turno}`,
    modelo_predictivo: 'Predictive model',
    turnos_entrenados: (n) => `${n} shifts trained`,
    modelo_acierta: (pct) => `The model captures ${pct}% of production variation`,
    stat_produccion_actual: 'Current production',
    stat_produccion_actual_sub: (ritmo) => `Rate: ${ritmo} t/h`,
    stat_proyeccion_final: 'Final projection',
    stat_proyeccion_final_sub: (inf, sup) => `CI: ${inf} – ${sup}`,
    stat_meta_turno: 'Shift target',
    stat_ritmo_actual_necesario: 'Current / Required rate',
    stat_ritmo_necesario_sub: (necesario) => `Required: ${necesario} t/h`,
    progreso_turno: 'Shift progress',
    horas_transcurridas: (h) => `${h}h elapsed`,
    transcurrido_restantes: (pct, horas) => `${pct}% elapsed · ${horas}h remaining`,
    cumplimiento_proyectado: '% Projected compliance',
    chart_proyeccion_kicker: 'Projection with confidence interval',
    chart_proyeccion_title: 'Cumulative production vs target',
    chart_features_kicker: 'Model variables',
    chart_features_title: 'Feature importance',
    legend_operacional: '■ Operational',
    legend_acumulado: '■ Cumulative',
    legend_temporal: '■ Temporal',
    chart_historico_kicker: 'Historical validation',
    chart_historico_title: (n) => `Predicted vs Actual — last ${n} shifts`,
    table_col_turno: 'Shift',
    table_col_predicho: 'Predicted',
    table_col_real: 'Actual',
    table_col_error: 'Error%',
    table_col_estado: 'Status',
    badge_acertado: 'On target',
    badge_margen: 'Margin',
    badge_fallo: 'Miss',
    chart_recomendacion_kicker: 'Operational recommendation',
    chart_recomendacion_title: (factor) => `Critical factor: ${factor}`,
    series_banda_confianza: 'Confidence band',
    series_proyeccion: 'Projection',
    series_meta_turno: 'Shift target',
    mark_ahora: 'NOW',
    series_predicho: 'Predicted',
    series_real: 'Actual',
    tooltip_importancia: (nombre, descripcion, pct) =>
      `<strong>${nombre}</strong><br/>${descripcion}<br/>Importance: ${pct}%`,
  },
  de: {
    loading: 'ML-Prognose wird geladen...',
    error: 'NORTHMINE konnte nicht geladen werden.',
    header_eyebrow: 'ML / Intelligenz',
    header_title: 'Schichtprognose',
    header_desc: 'Produktionsprognose auf Basis eines Prognosemodells, trainiert mit dem operativen Verlauf.',
    header_meta: (fecha, turno) => `${fecha} · Schicht ${turno}`,
    modelo_predictivo: 'Prognosemodell',
    turnos_entrenados: (n) => `${n} Schichten trainiert`,
    modelo_acierta: (pct) => `Das Modell erklärt ${pct}% der Produktionsvariation`,
    stat_produccion_actual: 'Aktuelle Produktion',
    stat_produccion_actual_sub: (ritmo) => `Rate: ${ritmo} t/h`,
    stat_proyeccion_final: 'Endprognose',
    stat_proyeccion_final_sub: (inf, sup) => `CI: ${inf} – ${sup}`,
    stat_meta_turno: 'Schichtziel',
    stat_ritmo_actual_necesario: 'Aktuelle / erforderliche Rate',
    stat_ritmo_necesario_sub: (necesario) => `Erforderlich: ${necesario} t/h`,
    progreso_turno: 'Schichtfortschritt',
    horas_transcurridas: (h) => `${h}h vergangen`,
    transcurrido_restantes: (pct, horas) => `${pct}% vergangen · ${horas}h verbleibend`,
    cumplimiento_proyectado: '% Prognostizierte Zielerreichung',
    chart_proyeccion_kicker: 'Prognose mit Konfidenzintervall',
    chart_proyeccion_title: 'Kumulierte Produktion vs. Ziel',
    chart_features_kicker: 'Modellvariablen',
    chart_features_title: 'Feature-Wichtigkeit',
    legend_operacional: '■ Operativ',
    legend_acumulado: '■ Kumuliert',
    legend_temporal: '■ Zeitlich',
    chart_historico_kicker: 'Historische Validierung',
    chart_historico_title: (n) => `Prognose vs. Ist — letzte ${n} Schichten`,
    table_col_turno: 'Schicht',
    table_col_predicho: 'Prognose',
    table_col_real: 'Ist',
    table_col_error: 'Fehler%',
    table_col_estado: 'Status',
    badge_acertado: 'Getroffen',
    badge_margen: 'Grenzwertig',
    badge_fallo: 'Verfehlt',
    chart_recomendacion_kicker: 'Operative Empfehlung',
    chart_recomendacion_title: (factor) => `Kritischer Faktor: ${factor}`,
    series_banda_confianza: 'Konfidenzband',
    series_proyeccion: 'Prognose',
    series_meta_turno: 'Schichtziel',
    mark_ahora: 'JETZT',
    series_predicho: 'Vorhersage',
    series_real: 'Ist',
    tooltip_importancia: (nombre, descripcion, pct) =>
      `<strong>${nombre}</strong><br/>${descripcion}<br/>Wichtigkeit: ${pct}%`,
  },
}
