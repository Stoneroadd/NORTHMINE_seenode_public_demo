import type { ModuleDict } from '../useModuleT'

export interface OperatorRankingT {
  sin_causa: string
  sin_modo: string
  cargando_ranking: string
  error_cargar_ranking: string

  eyebrow: string
  titulo: string
  descripcion: string
  btn_metodologia: string
  btn_exportar: string
  ethics_note: string
  filtros_titulo: string

  cmd_kicker: string
  cmd_titulo_riesgo: (name: string) => string
  cmd_titulo_sin_riesgo: string
  cmd_texto_riesgo: (cause: string, tons: string, hours: string) => string
  cmd_texto_sin_riesgo: string
  cmd_mejor_score: (name: string) => string
  cmd_foco: (n: number) => string
  cmd_demoras: (h: string) => string
  cmd_mayor_demora: (name: string) => string
  cmd_causa: (cause: string) => string
  cmd_next_titulo: string
  cmd_next_fallback: string
  cmd_next_small: (spread: string) => string
  cmd_btn_auditar_foco: string

  prod_kicker: string
  prod_titulo: string
  prod_tag: string
  prod_top_titulo: string
  prod_top_subtitulo: string
  prod_low_titulo: string
  prod_low_subtitulo: string
  prod_score_label: string
  prod_impacto_suffix: string
  prod_nota: string

  priority_kicker: string
  priority_titulo: string
  priority_tag: (n: number) => string
  priority_metric_produccion: string
  priority_metric_score: string
  priority_metric_demoras: string
  priority_metric_impacto: string
  priority_btn_auditar: string

  ranking_kicker: string
  ranking_titulo: string
  ranking_tag: (n: number) => string

  score_kicker: string
  score_titulo: string

  correlacion_kicker: string
  correlacion_titulo: string
  impacto_kicker: string
  impacto_titulo: string
  heatmap_kicker: string
  heatmap_titulo: string
  evolucion_kicker: string
  evolucion_titulo: string
  evolucion_tag: (n: number) => string

  chart_productividad: string
  chart_demoras: string
  chart_tooltip_scatter: (name: string, productividad: number, demoras: number, score: number) => string
  heatmap_cat_bano: string
  heatmap_cat_colacion: string
  heatmap_cat_cambio: string
  heatmap_cat_petroleo: string
  heatmap_cat_sin_postura: string

  kpi_mejor_titulo: string
  kpi_mejor_trend: string
  kpi_promedio_titulo: string
  kpi_promedio_subtitulo: string
  kpi_promedio_trend: string
  kpi_foco_titulo: string
  kpi_foco_subtitulo: string
  kpi_foco_trend: string
  kpi_impacto_titulo: string
  kpi_impacto_subtitulo: string
  kpi_impacto_trend: string
  kpi_demoras_titulo: string
  kpi_demoras_subtitulo: string
  kpi_demoras_trend: string
  kpi_causa_titulo: string
  kpi_causa_subtitulo: string
  kpi_causa_trend: string

  tabla_col_rank: string
  tabla_col_operador: string
  tabla_col_produccion: string
  tabla_col_demoras: string
  tabla_col_impacto: string
  tabla_col_riesgo: string
  tabla_col_accion: string
  tabla_col_acciones: string
  tabla_ciclos: string
  tabla_chip_bano: string
  tabla_chip_colacion: string
  tabla_chip_cambio_turno: string
  tabla_chip_combustible: string
  tabla_chip_sin_asignacion: string
  tabla_min_gestionables: (n: string) => string
  tabla_sin_demoras: string
  tabla_perdida_estimada: string
  tabla_ver_detalle: (name: string) => string
  tabla_ver_auditoria: (name: string) => string

  risk_excelente: string
  risk_bueno: string
  risk_seguimiento: string
  risk_riesgo_alto: string
  risk_critico: string

  score_productividad: string
  score_disponibilidad: string
  score_utilizacion: string
  score_control_demoras: string
  score_seguridad: string
  score_peso: (weight: string) => string
  score_peso_pct: (pct: number) => string

  trend_score: string
  trend_disponibilidad: string
  trend_toneladas: string

  trace_col_componente: string
  trace_col_formula: string
  trace_col_valor: string
  trace_col_score: string
  trace_col_peso: string
  trace_col_puntos: string

  delay_col_categoria: string
  delay_col_tipo: string
  delay_col_esperado: string
  delay_col_alerta: string
  delay_col_critico: string
  delay_col_criterio: string
  delay_tipo_gestionable: string
  delay_tipo_sistemica: string

  audit_close: string
  audit_kicker: string
  audit_operador_fallback: string
  audit_seed: (id: string) => string
  audit_desc: string
  audit_cargando: string
  audit_error: string
  audit_sin_datos: string
  audit_resultado_titulo: string
  audit_score_global: string
  audit_periodo: string
  audit_turnos_analizados: string
  audit_modo: string
  audit_filtros_titulo: string
  audit_datos_base_titulo: string
  audit_traza_titulo: string
  audit_penalizaciones_titulo: string
  audit_excesos_titulo: string
  audit_recurrencia_titulo: string
  audit_sistemicas_titulo: string
  audit_explicacion_titulo: string
  audit_recomendacion_titulo: string

  pattern_kicker: string
  pattern_titulo: string
  pattern_tag: string
  pattern_turnos: (n: number) => string
  pattern_impacto: (n: string) => string
  pattern_empty: string

  method_close: string
  method_kicker: string
  method_titulo: string
  method_desc: string
  method_cargando: string
  method_error: string
  method_umbral_kicker: string
  method_umbral_titulo: string
  method_interp_kicker: string
  method_interp_titulo: string

  formula_kicker: string
  formula_titulo: string
}

export const operatorRankingT: ModuleDict<OperatorRankingT> = {
  es: {
    sin_causa: 'Sin causa',
    sin_modo: 'SIN MODO',
    cargando_ranking: 'Cargando ranking real WENCO/SQL de operadores...',
    error_cargar_ranking: 'No pudimos cargar el ranking. Reintenta en unos segundos.',

    eyebrow: 'Analitica operacional',
    titulo: 'Ranking Global de Operadores',
    descripcion: 'Lectura orientativa de productividad, disponibilidad, utilizacion, demoras gestionables y seguridad.',
    btn_metodologia: 'Ver metodologia del score',
    btn_exportar: 'Exportar ranking CSV',
    ethics_note: 'Ranking orientativo. No usar como sancion directa: validar condiciones de frente, disponibilidad, flota, esperas sistemicas y relevo antes de concluir responsabilidad operacional.',
    filtros_titulo: 'Filtros ranking operadores',

    cmd_kicker: 'Lectura ejecutiva',
    cmd_titulo_riesgo: (name) => `${name} requiere revision contextual`,
    cmd_titulo_sin_riesgo: 'Sin operadores en seguimiento para el filtro activo',
    cmd_texto_riesgo: (cause, tons, hours) => `Principal foco: ${cause}. Impacto estimado ${tons} y ${hours} de demoras gestionables.`,
    cmd_texto_sin_riesgo: 'El ranking no detecta brechas relevantes con el filtro activo.',
    cmd_mejor_score: (name) => `Mejor score: ${name}`,
    cmd_foco: (n) => `Foco: ${n}`,
    cmd_demoras: (h) => `Demoras: ${h}`,
    cmd_mayor_demora: (name) => `Mayor demora: ${name}`,
    cmd_causa: (cause) => `Causa: ${cause}`,
    cmd_next_titulo: 'Que hacer ahora',
    cmd_next_fallback: 'Mantener monitoreo preventivo del ranking.',
    cmd_next_small: (spread) => `Comparar score contra auditoria del operador antes de decidir acciones. Brecha score max-min: ${spread} pts.`,
    cmd_btn_auditar_foco: 'Auditar operador foco',

    prod_kicker: 'Productividad operadores',
    prod_titulo: 'Mas productivos vs menor productividad relativa',
    prod_tag: 'tph / score / ciclos',
    prod_top_titulo: 'Mas productivos',
    prod_top_subtitulo: 'Ordenado por toneladas por hora',
    prod_low_titulo: 'Menor productividad relativa',
    prod_low_subtitulo: 'Revisar con contexto operacional',
    prod_score_label: 'score prod.',
    prod_impacto_suffix: 'impacto',
    prod_nota: 'Lectura orientativa: baja productividad puede explicarse por frente, disponibilidad, cola, asignacion, mantencion o demoras sistemicas.',

    priority_kicker: 'Prioridad operacional',
    priority_titulo: 'Datos utiles para gestionar ahora',
    priority_tag: (n) => `Top ${n}`,
    priority_metric_produccion: 'produccion',
    priority_metric_score: 'score',
    priority_metric_demoras: 'demoras',
    priority_metric_impacto: 'impacto',
    priority_btn_auditar: 'Auditar evidencia',

    ranking_kicker: 'Ranking operacional',
    ranking_titulo: 'Lectura compacta por operador',
    ranking_tag: (n) => `${n} operadores`,

    score_kicker: 'Score',
    score_titulo: 'Score global por operador',

    correlacion_kicker: 'Correlacion',
    correlacion_titulo: 'Productividad vs demoras gestionables',
    impacto_kicker: 'Impacto',
    impacto_titulo: 'Distribucion de causas de perdida',
    heatmap_kicker: 'Heatmap',
    heatmap_titulo: 'Operador vs categoria gestionable',
    evolucion_kicker: 'Evolucion',
    evolucion_titulo: 'Tendencia de score y toneladas',
    evolucion_tag: (n) => `${n} puntos`,

    chart_productividad: 'Productividad',
    chart_demoras: 'Demoras',
    chart_tooltip_scatter: (name, productividad, demoras, score) =>
      `<strong>${name}</strong><br/>Productividad ${productividad}%<br/>Demoras gestionables ${demoras} min<br/>Score ${score}`,
    heatmap_cat_bano: 'Bano',
    heatmap_cat_colacion: 'Colacion',
    heatmap_cat_cambio: 'Cambio',
    heatmap_cat_petroleo: 'Petroleo',
    heatmap_cat_sin_postura: 'Sin postura',

    kpi_mejor_titulo: 'Mejor desempeno',
    kpi_mejor_trend: 'score estimado',
    kpi_promedio_titulo: 'Score promedio',
    kpi_promedio_subtitulo: 'Ranking operacional',
    kpi_promedio_trend: '0-100 ponderado',
    kpi_foco_titulo: 'Foco seguimiento',
    kpi_foco_subtitulo: 'requieren contexto',
    kpi_foco_trend: 'requiere contexto',
    kpi_impacto_titulo: 'Impacto estimado',
    kpi_impacto_subtitulo: 'no atribuible directo',
    kpi_impacto_trend: 'impacto acumulado',
    kpi_demoras_titulo: 'Demoras gestionables',
    kpi_demoras_subtitulo: 'Acumulado periodo',
    kpi_demoras_trend: 'sobre categorias O',
    kpi_causa_titulo: 'Causa principal',
    kpi_causa_subtitulo: 'Mayor impacto estimado',
    kpi_causa_trend: 'validar con operacion',

    tabla_col_rank: 'Rank',
    tabla_col_operador: 'Operador / equipo',
    tabla_col_produccion: 'Produccion',
    tabla_col_demoras: 'Demoras utiles',
    tabla_col_impacto: 'Impacto',
    tabla_col_riesgo: 'Riesgo / causa',
    tabla_col_accion: 'Accion recomendada',
    tabla_col_acciones: 'Acciones',
    tabla_ciclos: 'ciclos',
    tabla_chip_bano: 'Bano',
    tabla_chip_colacion: 'Colacion',
    tabla_chip_cambio_turno: 'Cambio turno',
    tabla_chip_combustible: 'Combustible',
    tabla_chip_sin_asignacion: 'Sin asignacion',
    tabla_min_gestionables: (n) => `${n} min gestionables`,
    tabla_sin_demoras: 'Sin demoras gestionables',
    tabla_perdida_estimada: 'perdida estimada',
    tabla_ver_detalle: (name) => `Ver detalle ${name}`,
    tabla_ver_auditoria: (name) => `Ver auditoria ${name}`,

    risk_excelente: 'Excelente',
    risk_bueno: 'Bueno',
    risk_seguimiento: 'Seguimiento',
    risk_riesgo_alto: 'Riesgo alto',
    risk_critico: 'Critico',

    score_productividad: 'Productividad',
    score_disponibilidad: 'Disponibilidad',
    score_utilizacion: 'Utilizacion',
    score_control_demoras: 'Control demoras',
    score_seguridad: 'Seguridad',
    score_peso: (weight) => `Peso ${weight}`,
    score_peso_pct: (pct) => `${pct}% del score`,

    trend_score: 'Score',
    trend_disponibilidad: 'Disponibilidad',
    trend_toneladas: 'Toneladas',

    trace_col_componente: 'Componente',
    trace_col_formula: 'Formula',
    trace_col_valor: 'Valor',
    trace_col_score: 'Score',
    trace_col_peso: 'Peso',
    trace_col_puntos: 'Puntos',

    delay_col_categoria: 'Categoria',
    delay_col_tipo: 'Tipo',
    delay_col_esperado: 'Esperado',
    delay_col_alerta: 'Alerta',
    delay_col_critico: 'Critico',
    delay_col_criterio: 'Criterio',
    delay_tipo_gestionable: 'Gestionable',
    delay_tipo_sistemica: 'Sistemica',

    audit_close: 'Cerrar auditoria',
    audit_kicker: 'Auditoria de KPI',
    audit_operador_fallback: 'Operador',
    audit_seed: (id) => `seed ${id}`,
    audit_desc: 'Traza del calculo, filtros aplicados y separacion entre demoras gestionables y sistemicas.',
    audit_cargando: 'Cargando auditoria...',
    audit_error: 'No se pudo cargar la auditoria.',
    audit_sin_datos: 'Sin datos para mostrar.',
    audit_resultado_titulo: 'Resultado auditado',
    audit_score_global: 'Score global',
    audit_periodo: 'Periodo',
    audit_turnos_analizados: 'Turnos analizados',
    audit_modo: 'Modo',
    audit_filtros_titulo: 'Filtros aplicados',
    audit_datos_base_titulo: 'Datos base usados',
    audit_traza_titulo: 'Traza del calculo',
    audit_penalizaciones_titulo: 'Penalizaciones aplicadas',
    audit_excesos_titulo: 'Excesos sobre umbral gestionable',
    audit_recurrencia_titulo: 'Recurrencia',
    audit_sistemicas_titulo: 'Demoras sistemicas informativas',
    audit_explicacion_titulo: 'Explicacion narrativa',
    audit_recomendacion_titulo: 'Recomendacion',

    pattern_kicker: 'Recurrencia',
    pattern_titulo: 'Patrones de demoras sobre umbral',
    pattern_tag: 'Contexto operacional requerido',
    pattern_turnos: (n) => `${n} turnos sobre umbral`,
    pattern_impacto: (n) => `${n} t impacto estimado`,
    pattern_empty: 'Sin patrones recurrentes con los filtros aplicados.',

    method_close: 'Cerrar metodologia',
    method_kicker: 'Metodologia y trazabilidad',
    method_titulo: 'Como se calcula el score',
    method_desc: 'Resumen operacional para supervisores, despacho, planificacion, gerencia y RRHH operacional.',
    method_cargando: 'Cargando metodologia...',
    method_error: 'No se pudo cargar la metodologia.',
    method_umbral_kicker: 'Demoras y umbrales',
    method_umbral_titulo: 'Que se considera gestionable y que es contexto sistemico',
    method_interp_kicker: 'Interpretacion',
    method_interp_titulo: 'Lectura de colores y rangos',

    formula_kicker: 'Formula trazable',
    formula_titulo: 'Score global 0-100',
  },
  en: {
    sin_causa: 'No cause',
    sin_modo: 'NO MODE',
    cargando_ranking: 'Loading real WENCO/SQL operator ranking...',
    error_cargar_ranking: 'We could not load the ranking. Try again in a few seconds.',

    eyebrow: 'Operational analytics',
    titulo: 'Global Operator Ranking',
    descripcion: 'Orientative read on productivity, availability, utilization, manageable delays and safety.',
    btn_metodologia: 'View score methodology',
    btn_exportar: 'Export ranking CSV',
    ethics_note: 'Orientative ranking. Do not use as direct sanction: validate front conditions, availability, fleet, systemic waits and relief before concluding operational responsibility.',
    filtros_titulo: 'Operator ranking filters',

    cmd_kicker: 'Executive read',
    cmd_titulo_riesgo: (name) => `${name} requires contextual review`,
    cmd_titulo_sin_riesgo: 'No operators under watch for the active filter',
    cmd_texto_riesgo: (cause, tons, hours) => `Main focus: ${cause}. Estimated impact ${tons} and ${hours} of manageable delays.`,
    cmd_texto_sin_riesgo: 'The ranking does not detect relevant gaps with the active filter.',
    cmd_mejor_score: (name) => `Best score: ${name}`,
    cmd_foco: (n) => `Focus: ${n}`,
    cmd_demoras: (h) => `Delays: ${h}`,
    cmd_mayor_demora: (name) => `Highest delay: ${name}`,
    cmd_causa: (cause) => `Cause: ${cause}`,
    cmd_next_titulo: 'What to do now',
    cmd_next_fallback: 'Keep preventive monitoring of the ranking.',
    cmd_next_small: (spread) => `Compare score against the operator's audit before deciding actions. Max-min score gap: ${spread} pts.`,
    cmd_btn_auditar_foco: 'Audit focus operator',

    prod_kicker: 'Operator productivity',
    prod_titulo: 'Most productive vs lowest relative productivity',
    prod_tag: 'tph / score / cycles',
    prod_top_titulo: 'Most productive',
    prod_top_subtitulo: 'Ordered by tons per hour',
    prod_low_titulo: 'Lowest relative productivity',
    prod_low_subtitulo: 'Review with operational context',
    prod_score_label: 'prod. score',
    prod_impacto_suffix: 'impact',
    prod_nota: 'Orientative read: low productivity can be explained by front, availability, queue, assignment, maintenance or systemic delays.',

    priority_kicker: 'Operational priority',
    priority_titulo: 'Useful data to manage now',
    priority_tag: (n) => `Top ${n}`,
    priority_metric_produccion: 'production',
    priority_metric_score: 'score',
    priority_metric_demoras: 'delays',
    priority_metric_impacto: 'impact',
    priority_btn_auditar: 'Audit evidence',

    ranking_kicker: 'Operational ranking',
    ranking_titulo: 'Compact read per operator',
    ranking_tag: (n) => `${n} operators`,

    score_kicker: 'Score',
    score_titulo: 'Global score per operator',

    correlacion_kicker: 'Correlation',
    correlacion_titulo: 'Productivity vs manageable delays',
    impacto_kicker: 'Impact',
    impacto_titulo: 'Loss cause distribution',
    heatmap_kicker: 'Heatmap',
    heatmap_titulo: 'Operator vs manageable category',
    evolucion_kicker: 'Trend',
    evolucion_titulo: 'Score and tonnage trend',
    evolucion_tag: (n) => `${n} points`,

    chart_productividad: 'Productivity',
    chart_demoras: 'Delays',
    chart_tooltip_scatter: (name, productividad, demoras, score) =>
      `<strong>${name}</strong><br/>Productivity ${productividad}%<br/>Manageable delays ${demoras} min<br/>Score ${score}`,
    heatmap_cat_bano: 'Restroom',
    heatmap_cat_colacion: 'Lunch',
    heatmap_cat_cambio: 'Shift change',
    heatmap_cat_petroleo: 'Fueling',
    heatmap_cat_sin_postura: 'No assignment',

    kpi_mejor_titulo: 'Best performance',
    kpi_mejor_trend: 'estimated score',
    kpi_promedio_titulo: 'Average score',
    kpi_promedio_subtitulo: 'Operational ranking',
    kpi_promedio_trend: '0-100 weighted',
    kpi_foco_titulo: 'Focus / watch',
    kpi_foco_subtitulo: 'need context',
    kpi_foco_trend: 'needs context',
    kpi_impacto_titulo: 'Estimated impact',
    kpi_impacto_subtitulo: 'not directly attributable',
    kpi_impacto_trend: 'accumulated impact',
    kpi_demoras_titulo: 'Manageable delays',
    kpi_demoras_subtitulo: 'Period accumulated',
    kpi_demoras_trend: 'over O categories',
    kpi_causa_titulo: 'Main cause',
    kpi_causa_subtitulo: 'Highest estimated impact',
    kpi_causa_trend: 'validate with operations',

    tabla_col_rank: 'Rank',
    tabla_col_operador: 'Operator / equipment',
    tabla_col_produccion: 'Production',
    tabla_col_demoras: 'Useful delays',
    tabla_col_impacto: 'Impact',
    tabla_col_riesgo: 'Risk / cause',
    tabla_col_accion: 'Recommended action',
    tabla_col_acciones: 'Actions',
    tabla_ciclos: 'cycles',
    tabla_chip_bano: 'Restroom',
    tabla_chip_colacion: 'Lunch',
    tabla_chip_cambio_turno: 'Shift change',
    tabla_chip_combustible: 'Fuel',
    tabla_chip_sin_asignacion: 'No assignment',
    tabla_min_gestionables: (n) => `${n} manageable min`,
    tabla_sin_demoras: 'No manageable delays',
    tabla_perdida_estimada: 'estimated loss',
    tabla_ver_detalle: (name) => `View detail ${name}`,
    tabla_ver_auditoria: (name) => `View audit ${name}`,

    risk_excelente: 'Excellent',
    risk_bueno: 'Good',
    risk_seguimiento: 'Monitoring',
    risk_riesgo_alto: 'High risk',
    risk_critico: 'Critical',

    score_productividad: 'Productivity',
    score_disponibilidad: 'Availability',
    score_utilizacion: 'Utilization',
    score_control_demoras: 'Delay control',
    score_seguridad: 'Safety',
    score_peso: (weight) => `Weight ${weight}`,
    score_peso_pct: (pct) => `${pct}% of score`,

    trend_score: 'Score',
    trend_disponibilidad: 'Availability',
    trend_toneladas: 'Tonnage',

    trace_col_componente: 'Component',
    trace_col_formula: 'Formula',
    trace_col_valor: 'Value',
    trace_col_score: 'Score',
    trace_col_peso: 'Weight',
    trace_col_puntos: 'Points',

    delay_col_categoria: 'Category',
    delay_col_tipo: 'Type',
    delay_col_esperado: 'Expected',
    delay_col_alerta: 'Alert',
    delay_col_critico: 'Critical',
    delay_col_criterio: 'Criterion',
    delay_tipo_gestionable: 'Manageable',
    delay_tipo_sistemica: 'Systemic',

    audit_close: 'Close audit',
    audit_kicker: 'KPI audit',
    audit_operador_fallback: 'Operator',
    audit_seed: (id) => `seed ${id}`,
    audit_desc: 'Calculation trace, applied filters and separation between manageable and systemic delays.',
    audit_cargando: 'Loading audit...',
    audit_error: 'Could not load the audit.',
    audit_sin_datos: 'No data to show.',
    audit_resultado_titulo: 'Audited result',
    audit_score_global: 'Global score',
    audit_periodo: 'Period',
    audit_turnos_analizados: 'Shifts analyzed',
    audit_modo: 'Mode',
    audit_filtros_titulo: 'Applied filters',
    audit_datos_base_titulo: 'Base data used',
    audit_traza_titulo: 'Calculation trace',
    audit_penalizaciones_titulo: 'Applied penalties',
    audit_excesos_titulo: 'Excess over manageable threshold',
    audit_recurrencia_titulo: 'Recurrence',
    audit_sistemicas_titulo: 'Informative systemic delays',
    audit_explicacion_titulo: 'Narrative explanation',
    audit_recomendacion_titulo: 'Recommendation',

    pattern_kicker: 'Recurrence',
    pattern_titulo: 'Delay patterns over threshold',
    pattern_tag: 'Operational context required',
    pattern_turnos: (n) => `${n} shifts over threshold`,
    pattern_impacto: (n) => `${n} t estimated impact`,
    pattern_empty: 'No recurring patterns with the applied filters.',

    method_close: 'Close methodology',
    method_kicker: 'Methodology and traceability',
    method_titulo: 'How the score is calculated',
    method_desc: 'Operational summary for supervisors, dispatch, planning, management and operational HR.',
    method_cargando: 'Loading methodology...',
    method_error: 'Could not load the methodology.',
    method_umbral_kicker: 'Delays and thresholds',
    method_umbral_titulo: 'What is considered manageable and what is systemic context',
    method_interp_kicker: 'Interpretation',
    method_interp_titulo: 'Reading colors and ranges',

    formula_kicker: 'Traceable formula',
    formula_titulo: 'Global score 0-100',
  },
  de: {
    sin_causa: 'Ohne Ursache',
    sin_modo: 'OHNE MODUS',
    cargando_ranking: 'Lade echtes WENCO/SQL-Operatoren-Ranking...',
    error_cargar_ranking: 'Das Ranking konnte nicht geladen werden. Versuchen Sie es in Kürze erneut.',

    eyebrow: 'Operative Analytik',
    titulo: 'Globales Operatoren-Ranking',
    descripcion: 'Orientierende Betrachtung von Produktivität, Verfügbarkeit, Auslastung, steuerbaren Verzögerungen und Sicherheit.',
    btn_metodologia: 'Score-Methodik anzeigen',
    btn_exportar: 'Ranking-CSV exportieren',
    ethics_note: 'Orientierendes Ranking. Nicht als direkte Sanktion verwenden: Abbaufront-Bedingungen, Verfügbarkeit, Flotte, systemische Wartezeiten und Schichtwechsel prüfen, bevor die operative Verantwortung abschließend bewertet wird.',
    filtros_titulo: 'Filter Operatoren-Ranking',

    cmd_kicker: 'Executive Lesart',
    cmd_titulo_riesgo: (name) => `${name} erfordert kontextuelle Prüfung`,
    cmd_titulo_sin_riesgo: 'Keine Operatoren in Beobachtung für den aktiven Filter',
    cmd_texto_riesgo: (cause, tons, hours) => `Hauptfokus: ${cause}. Geschätzte Auswirkung ${tons} und ${hours} an steuerbaren Verzögerungen.`,
    cmd_texto_sin_riesgo: 'Das Ranking erkennt mit dem aktiven Filter keine relevanten Lücken.',
    cmd_mejor_score: (name) => `Bester Score: ${name}`,
    cmd_foco: (n) => `Fokus: ${n}`,
    cmd_demoras: (h) => `Verzögerungen: ${h}`,
    cmd_mayor_demora: (name) => `Größte Verzögerung: ${name}`,
    cmd_causa: (cause) => `Ursache: ${cause}`,
    cmd_next_titulo: 'Was jetzt tun',
    cmd_next_fallback: 'Präventive Überwachung des Rankings aufrechterhalten.',
    cmd_next_small: (spread) => `Score vor Entscheidungen mit der Auditierung des Operators vergleichen. Score-Lücke max-min: ${spread} Punkte.`,
    cmd_btn_auditar_foco: 'Fokus-Operator auditieren',

    prod_kicker: 'Produktivität der Operatoren',
    prod_titulo: 'Höchste Produktivität vs. niedrigste relative Produktivität',
    prod_tag: 'tph / Score / Zyklen',
    prod_top_titulo: 'Am produktivsten',
    prod_top_subtitulo: 'Sortiert nach Tonnen pro Stunde',
    prod_low_titulo: 'Niedrigste relative Produktivität',
    prod_low_subtitulo: 'Mit operativem Kontext prüfen',
    prod_score_label: 'Produktivitäts-Score',
    prod_impacto_suffix: 'Auswirkung',
    prod_nota: 'Orientierende Betrachtung: niedrige Produktivität kann durch Abbaufront, Verfügbarkeit, Warteschlange, Zuweisung, Wartung oder systemische Verzögerungen erklärt werden.',

    priority_kicker: 'Operative Priorität',
    priority_titulo: 'Nützliche Daten für die Steuerung jetzt',
    priority_tag: (n) => `Top ${n}`,
    priority_metric_produccion: 'Produktion',
    priority_metric_score: 'Score',
    priority_metric_demoras: 'Verzögerungen',
    priority_metric_impacto: 'Auswirkung',
    priority_btn_auditar: 'Belege auditieren',

    ranking_kicker: 'Operatives Ranking',
    ranking_titulo: 'Kompakte Lesart pro Operator',
    ranking_tag: (n) => `${n} Operatoren`,

    score_kicker: 'Score',
    score_titulo: 'Globaler Score pro Operator',

    correlacion_kicker: 'Korrelation',
    correlacion_titulo: 'Produktivität vs. steuerbare Verzögerungen',
    impacto_kicker: 'Auswirkung',
    impacto_titulo: 'Verteilung der Verlustursachen',
    heatmap_kicker: 'Heatmap',
    heatmap_titulo: 'Operator vs. steuerbare Kategorie',
    evolucion_kicker: 'Entwicklung',
    evolucion_titulo: 'Trend von Score und Tonnage',
    evolucion_tag: (n) => `${n} Punkte`,

    chart_productividad: 'Produktivität',
    chart_demoras: 'Verzögerungen',
    chart_tooltip_scatter: (name, productividad, demoras, score) =>
      `<strong>${name}</strong><br/>Produktivität ${productividad}%<br/>Steuerbare Verzögerungen ${demoras} min<br/>Score ${score}`,
    heatmap_cat_bano: 'Toilettenpause',
    heatmap_cat_colacion: 'Verpflegungspause',
    heatmap_cat_cambio: 'Schichtwechsel',
    heatmap_cat_petroleo: 'Betankung',
    heatmap_cat_sin_postura: 'Ohne Zuweisung',

    kpi_mejor_titulo: 'Beste Leistung',
    kpi_mejor_trend: 'geschätzter Score',
    kpi_promedio_titulo: 'Durchschnittlicher Score',
    kpi_promedio_subtitulo: 'Operatives Ranking',
    kpi_promedio_trend: '0-100 gewichtet',
    kpi_foco_titulo: 'Fokus / Beobachtung',
    kpi_foco_subtitulo: 'benötigen Kontext',
    kpi_foco_trend: 'benötigt Kontext',
    kpi_impacto_titulo: 'Geschätzte Auswirkung',
    kpi_impacto_subtitulo: 'nicht direkt zurechenbar',
    kpi_impacto_trend: 'kumulierte Auswirkung',
    kpi_demoras_titulo: 'Steuerbare Verzögerungen',
    kpi_demoras_subtitulo: 'Periode kumuliert',
    kpi_demoras_trend: 'über O-Kategorien',
    kpi_causa_titulo: 'Hauptursache',
    kpi_causa_subtitulo: 'Höchste geschätzte Auswirkung',
    kpi_causa_trend: 'mit Betrieb validieren',

    tabla_col_rank: 'Rang',
    tabla_col_operador: 'Operator / Gerät',
    tabla_col_produccion: 'Produktion',
    tabla_col_demoras: 'Nutzbare Verzögerungen',
    tabla_col_impacto: 'Auswirkung',
    tabla_col_riesgo: 'Risiko / Ursache',
    tabla_col_accion: 'Empfohlene Maßnahme',
    tabla_col_acciones: 'Maßnahmen',
    tabla_ciclos: 'Zyklen',
    tabla_chip_bano: 'Toilettenpause',
    tabla_chip_colacion: 'Verpflegungspause',
    tabla_chip_cambio_turno: 'Schichtwechsel',
    tabla_chip_combustible: 'Kraftstoff',
    tabla_chip_sin_asignacion: 'Ohne Zuweisung',
    tabla_min_gestionables: (n) => `${n} steuerbare min`,
    tabla_sin_demoras: 'Keine steuerbaren Verzögerungen',
    tabla_perdida_estimada: 'geschätzter Verlust',
    tabla_ver_detalle: (name) => `Detail anzeigen ${name}`,
    tabla_ver_auditoria: (name) => `Auditierung anzeigen ${name}`,

    risk_excelente: 'Ausgezeichnet',
    risk_bueno: 'Gut',
    risk_seguimiento: 'Beobachtung',
    risk_riesgo_alto: 'Hohes Risiko',
    risk_critico: 'Kritisch',

    score_productividad: 'Produktivität',
    score_disponibilidad: 'Verfügbarkeit',
    score_utilizacion: 'Auslastung',
    score_control_demoras: 'Kontrolle der Verzögerungen',
    score_seguridad: 'Sicherheit',
    score_peso: (weight) => `Gewicht ${weight}`,
    score_peso_pct: (pct) => `${pct}% des Scores`,

    trend_score: 'Score',
    trend_disponibilidad: 'Verfügbarkeit',
    trend_toneladas: 'Tonnage',

    trace_col_componente: 'Komponente',
    trace_col_formula: 'Formel',
    trace_col_valor: 'Wert',
    trace_col_score: 'Score',
    trace_col_peso: 'Gewicht',
    trace_col_puntos: 'Punkte',

    delay_col_categoria: 'Kategorie',
    delay_col_tipo: 'Typ',
    delay_col_esperado: 'Erwartet',
    delay_col_alerta: 'Alarm',
    delay_col_critico: 'Kritisch',
    delay_col_criterio: 'Kriterium',
    delay_tipo_gestionable: 'Steuerbar',
    delay_tipo_sistemica: 'Systemisch',

    audit_close: 'Auditierung schließen',
    audit_kicker: 'KPI-Auditierung',
    audit_operador_fallback: 'Operator',
    audit_seed: (id) => `seed ${id}`,
    audit_desc: 'Berechnungsspur, angewandte Filter und Trennung zwischen steuerbaren und systemischen Verzögerungen.',
    audit_cargando: 'Lade Auditierung...',
    audit_error: 'Die Auditierung konnte nicht geladen werden.',
    audit_sin_datos: 'Keine Daten anzuzeigen.',
    audit_resultado_titulo: 'Auditiertes Ergebnis',
    audit_score_global: 'Globaler Score',
    audit_periodo: 'Periode',
    audit_turnos_analizados: 'Analysierte Schichten',
    audit_modo: 'Modus',
    audit_filtros_titulo: 'Angewandte Filter',
    audit_datos_base_titulo: 'Verwendete Basisdaten',
    audit_traza_titulo: 'Berechnungsspur',
    audit_penalizaciones_titulo: 'Angewandte Strafpunkte',
    audit_excesos_titulo: 'Überschreitungen über dem steuerbaren Schwellenwert',
    audit_recurrencia_titulo: 'Wiederholung',
    audit_sistemicas_titulo: 'Systemische Verzögerungen informativ',
    audit_explicacion_titulo: 'Narrative Erläuterung',
    audit_recomendacion_titulo: 'Empfehlung',

    pattern_kicker: 'Wiederholung',
    pattern_titulo: 'Verzögerungsmuster über Schwellenwert',
    pattern_tag: 'Operativer Kontext erforderlich',
    pattern_turnos: (n) => `${n} Schichten über Schwellenwert`,
    pattern_impacto: (n) => `${n} t geschätzte Auswirkung`,
    pattern_empty: 'Keine wiederkehrenden Muster mit den angewandten Filtern.',

    method_close: 'Methodik schließen',
    method_kicker: 'Methodik und Nachvollziehbarkeit',
    method_titulo: 'So wird der Score berechnet',
    method_desc: 'Operative Zusammenfassung für Schichtleiter, Disposition, Planung, Geschäftsleitung und operative Personalabteilung.',
    method_cargando: 'Lade Methodik...',
    method_error: 'Die Methodik konnte nicht geladen werden.',
    method_umbral_kicker: 'Verzögerungen und Schwellenwerte',
    method_umbral_titulo: 'Was als steuerbar gilt und was systemischer Kontext ist',
    method_interp_kicker: 'Interpretation',
    method_interp_titulo: 'Lesart von Farben und Bereichen',

    formula_kicker: 'Nachvollziehbare Formel',
    formula_titulo: 'Globaler Score 0-100',
  },
}
