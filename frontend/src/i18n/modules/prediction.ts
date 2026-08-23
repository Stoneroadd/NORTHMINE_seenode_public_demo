import type { ModuleDict } from '../useModuleT'

export interface PredictionT {
  loading: string
  error: string
  header_eyebrow: string
  header_title: string
  header_desc: string
  header_meta: (fecha: string, turno: string) => string
  health_label: string
  health_state: (state: string) => string
  stat_actual: string
  stat_actual_sub: string
  stat_forecast: string
  stat_forecast_sub: (riskPct: string) => string
  stat_target: string
  stat_target_sub: (source: string) => string
  stat_compliance: string
  progreso_turno: string
  horas_transcurridas: (h: number) => string
  transcurrido_restantes: (pct: string, horas: number) => string
  chart_hourly_kicker: string
  chart_hourly_title: string
  series_actual: string
  series_target: string
  recommendation_kicker: string
  recommendation_confidence: (level: string) => string
  confidence_baja: string
  confidence_media: string
  confidence_alta: string
  scenarios_kicker: string
  scenarios_title: string
  table_col_scenario: string
  table_col_tons: string
  table_col_cost: string
  table_col_risk: string
  table_col_value: string
  no_scenarios: string
}

export const predictionT: ModuleDict<PredictionT> = {
  es: {
    loading: 'Cargando proyección de turno...',
    error: 'Proyección no disponible en este momento.',
    header_eyebrow: 'Proyección',
    header_title: 'Proyección de Turno',
    header_desc: 'Cierre de turno proyectado a partir del avance real acumulado, no de un modelo entrenado aparte.',
    header_meta: (fecha, turno) => `${fecha} · Turno ${turno}`,
    health_label: 'Salud operacional',
    health_state: (state) =>
      ({ NORMAL: 'Normal', ATENCION: 'Atención', CRITICO: 'Crítico', CACHE: 'Datos en caché' })[state] ?? state,
    stat_actual: 'Producción actual',
    stat_actual_sub: 'Acumulado del turno',
    stat_forecast: 'Proyección de cierre',
    stat_forecast_sub: (riskPct) => `Riesgo de incumplimiento: ${riskPct}%`,
    stat_target: 'Meta del turno',
    stat_target_sub: (source) => `Fuente: ${source}`,
    stat_compliance: '% Cumplimiento proyectado',
    progreso_turno: 'Progreso del turno',
    horas_transcurridas: (h) => `${h}h transcurridas`,
    transcurrido_restantes: (pct, horas) => `${pct}% transcurrido · ${horas}h restantes`,
    chart_hourly_kicker: 'Avance real por hora',
    chart_hourly_title: 'Producción acumulada vs meta',
    series_actual: 'Acumulado real',
    series_target: 'Meta del turno',
    recommendation_kicker: 'Recomendación operacional',
    recommendation_confidence: (level) => `Confianza: ${level}`,
    confidence_baja: 'baja',
    confidence_media: 'media',
    confidence_alta: 'alta',
    scenarios_kicker: 'Qué pasaría si',
    scenarios_title: 'Escenarios de cierre de turno',
    table_col_scenario: 'Escenario',
    table_col_tons: 'Toneladas',
    table_col_cost: 'Costo',
    table_col_risk: 'Riesgo',
    table_col_value: 'Valor',
    no_scenarios: 'Sin escenarios calculados para este turno.',
  },
  en: {
    loading: 'Loading shift projection...',
    error: 'Projection not available at this time.',
    header_eyebrow: 'Projection',
    header_title: 'Shift Projection',
    header_desc: 'Shift-end projection built from real accumulated progress, not a separately trained model.',
    header_meta: (fecha, turno) => `${fecha} · Shift ${turno}`,
    health_label: 'Operational health',
    health_state: (state) =>
      ({ NORMAL: 'Normal', ATENCION: 'Needs attention', CRITICO: 'Critical', CACHE: 'Cached data' })[state] ?? state,
    stat_actual: 'Current production',
    stat_actual_sub: 'Shift accumulated',
    stat_forecast: 'Shift-end projection',
    stat_forecast_sub: (riskPct) => `Non-compliance risk: ${riskPct}%`,
    stat_target: 'Shift target',
    stat_target_sub: (source) => `Source: ${source}`,
    stat_compliance: '% Projected compliance',
    progreso_turno: 'Shift progress',
    horas_transcurridas: (h) => `${h}h elapsed`,
    transcurrido_restantes: (pct, horas) => `${pct}% elapsed · ${horas}h remaining`,
    chart_hourly_kicker: 'Real hourly progress',
    chart_hourly_title: 'Cumulative production vs target',
    series_actual: 'Actual cumulative',
    series_target: 'Shift target',
    recommendation_kicker: 'Operational recommendation',
    recommendation_confidence: (level) => `Confidence: ${level}`,
    confidence_baja: 'low',
    confidence_media: 'medium',
    confidence_alta: 'high',
    scenarios_kicker: 'What if',
    scenarios_title: 'Shift-end scenarios',
    table_col_scenario: 'Scenario',
    table_col_tons: 'Tonnes',
    table_col_cost: 'Cost',
    table_col_risk: 'Risk',
    table_col_value: 'Value',
    no_scenarios: 'No scenarios computed for this shift.',
  },
  de: {
    loading: 'Schichtprognose wird geladen...',
    error: 'Prognose derzeit nicht verfügbar.',
    header_eyebrow: 'Prognose',
    header_title: 'Schichtprognose',
    header_desc: 'Schichtendprognose auf Basis des realen kumulierten Fortschritts, kein separat trainiertes Modell.',
    header_meta: (fecha, turno) => `${fecha} · Schicht ${turno}`,
    health_label: 'Betriebszustand',
    health_state: (state) =>
      ({ NORMAL: 'Normal', ATENCION: 'Aufmerksamkeit', CRITICO: 'Kritisch', CACHE: 'Zwischengespeichert' })[state] ?? state,
    stat_actual: 'Aktuelle Produktion',
    stat_actual_sub: 'Kumuliert in der Schicht',
    stat_forecast: 'Schichtendprognose',
    stat_forecast_sub: (riskPct) => `Nichteinhaltungsrisiko: ${riskPct}%`,
    stat_target: 'Schichtziel',
    stat_target_sub: (source) => `Quelle: ${source}`,
    stat_compliance: '% Prognostizierte Zielerreichung',
    progreso_turno: 'Schichtfortschritt',
    horas_transcurridas: (h) => `${h}h vergangen`,
    transcurrido_restantes: (pct, horas) => `${pct}% vergangen · ${horas}h verbleibend`,
    chart_hourly_kicker: 'Realer stündlicher Fortschritt',
    chart_hourly_title: 'Kumulierte Produktion vs. Ziel',
    series_actual: 'Ist kumuliert',
    series_target: 'Schichtziel',
    recommendation_kicker: 'Operative Empfehlung',
    recommendation_confidence: (level) => `Konfidenz: ${level}`,
    confidence_baja: 'niedrig',
    confidence_media: 'mittel',
    confidence_alta: 'hoch',
    scenarios_kicker: 'Was wäre wenn',
    scenarios_title: 'Schichtend-Szenarien',
    table_col_scenario: 'Szenario',
    table_col_tons: 'Tonnen',
    table_col_cost: 'Kosten',
    table_col_risk: 'Risiko',
    table_col_value: 'Wert',
    no_scenarios: 'Keine Szenarien für diese Schicht berechnet.',
  },
}
