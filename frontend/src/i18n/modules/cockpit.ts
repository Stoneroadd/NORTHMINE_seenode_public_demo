import type { ModuleDict } from '../useModuleT'

export interface CockpitT {
  // Common / shared fallbacks
  common_sin_dato: string
  common_lectura_ejecutiva: string
  common_confianza: (value: string) => string
  common_top: (n: number) => string
  common_operador: (op: string) => string

  // DecisionCockpit.tsx - page-level helpers
  availability_real: string
  availability_partial: string
  availability_missing: string
  confidence_baja: string
  confidence_media: string
  confidence_alta: string
  section_turno: string
  section_mensual: string
  section_comparativa: string
  section_equipos: string
  section_produccion: string
  section_decisiones: string
  section_flota: string
  section_nav_aria: string
  filters_aria: string
  filters_fecha: string
  filters_turno: string
  filters_turno_resuelto_aria: (label: string) => string
  filters_turno_actual: string
  filters_turno_dia: string
  filters_turno_noche: string
  opening_read_aria: string
  opening_read_kicker: string
  opening_read_title: string
  opening_read_desc: string
  opening_1_label: string
  opening_1_actual: (tons: string) => string
  opening_1_esperado_sin_dato: string
  opening_1_esperado: (tons: string) => string
  opening_1_avance_sin_dato: string
  opening_1_avance: (pct: string) => string
  opening_2_label: string
  opening_2_pct_proyectado: (pct: string) => string
  opening_2_meta_no_configurada: string
  opening_2_brecha: (delta: string) => string
  opening_3_label: string
  opening_3_sin_meta: string
  opening_3_valor: (tph: string) => string
  opening_3_sin_calculo: string
  opening_3_detalle: (tons: string) => string
  opening_3_tiempo_sin_dato: string
  opening_3_tiempo_restante: (min: string) => string
  opening_4_label: string
  opening_4_sin_plan: string
  opening_4_valor: (v: string) => string
  opening_4_sin_dato: string
  opening_4_detalle: (pct: string) => string
  opening_5_actual_turno: (turno: string) => string
  opening_5_filtro_actual: string
  opening_6_label: string
  opening_6_sin_foco: string
  opening_6_detalle: (pct: string, tons: string) => string
  opening_6_sin_tarjetas: string
  opening_6_validar: string
  opening_7_label: string
  opening_7_impacto: (tons: string, money: string) => string
  fair_comparison_label: string
  fair_comparison_sin_dato: string
  fair_comparison_sin_respuesta: string
  fair_comparison_ventana: (slots: number) => string
  fair_comparison_actual_sin_ref: (current: string) => string
  fair_comparison_detalle: (current: string, reference: string, pct: string) => string
  required_green_meta_no_cargada: string
  required_green_meta_no_configurada: string
  required_green_dias_sin_promedio: (days: number) => string
  required_green_prom_actual: (avg: string, days: number) => string
  loading_cockpit: string
  error_title: string
  error_detail: (msg: string) => string
  error_detail_generic: string
  error_demo_suffix: string
  projection_sin_meta: string
  projection_sobre_meta: string
  projection_bajo_meta: string
  shift_target_label: (tons: string) => string
  shift_target_sin_meta: string
  daily_target_label: (tons: string) => string
  daily_target_sin_meta: string
  partial_item_ciclos: string
  partial_item_caex_activos: string
  partial_item_promedio_ciclo: string
  partial_item_caex_promedio_circuito: string
  partial_banner: (items: string) => string
  kpi_grid_aria: string
  kpi_produccion_actual_label: string
  kpi_produccion_actual_subtext_sin_meta: string
  kpi_produccion_actual_subtext: (pct: string) => string
  sector_split_aria: string
  sector_split_pct: (pct: string) => string
  sector_split_proyectado: (tons: string) => string
  kpi_tonelaje_proyectado: string
  kpi_meta_no_configurada: string
  kpi_proyeccion_detalle: (status: string, delta: string, pct: string) => string
  kpi_proyeccion_confianza: (label: string, hours: number) => string
  kpi_proyeccion_rango: (low: string, high: string) => string
  kpi_meta_turno_label: string
  kpi_meta_turno_sin_meta: string
  kpi_meta_turno_subtext_no_config: string
  kpi_meta_turno_subtext: (label: string) => string
  kpi_ciclos_label: string
  kpi_dato_no_disponible: string
  kpi_no_informado_api: string
  kpi_ciclos_subtext: string
  kpi_caex_activos_label: string
  kpi_caex_activos_subtext: string
  kpi_promedio_ciclo_label: string
  kpi_promedio_ciclo_subtext: (money: string) => string
  kpi_promedio_caex_circuito_label: string
  kpi_promedio_caex_circuito_subtext: string
  kpi_caex_disp_indicator: (pct: string) => string
  estado_caex_title: string
  estado_caex_empty: string
  estado_palas_title: string
  estado_palas_empty: string
  decision_intelligence_kicker: string
  decision_intelligence_title: string
  decision_intelligence_tag: (conf: string) => string
  decision_action_label: string
  decision_action_note: string
  decision_impact_tonelaje: string
  decision_impact_valor: string
  decision_impact_cola: (min: string) => string
  decision_scenarios_label: string
  decision_scenarios_top3: string
  intelligence_brief_aria: string
  intelligence_brief_kicker: string
  intelligence_brief_title: string
  intelligence_brief_desc: string
  fleet_section_aria: string
  fleet_kicker: string
  fleet_title: string
  fleet_desc: string
  fleet_empty: string

  // ShiftSummary.tsx
  shift_summary_kicker: string
  shift_summary_registro: string
  shift_summary_produccion: string
  shift_summary_meta: string
  shift_summary_sin_meta: string
  shift_summary_riesgo: string
  shift_summary_progress_aria: (pct: number) => string

  // KpiCard.tsx
  kpi_card_sparkline_aria: string
  kpi_card_progress_aria: (pct: number) => string

  // EquipmentStatusPanel.tsx
  equip_status_kicker: string
  equip_status_ver_todos: string
  equip_status_operativos: string
  equip_status_sin_actividad: string
  equip_status_posible_averia: string
  equip_status_ciclos_sd: string
  equip_status_ciclos: (n: string) => string
  equip_status_toneladas_sd: string

  // ProductionTable.tsx
  prod_table_kicker: string
  prod_table_title: string
  prod_table_registros: (n: number) => string
  prod_table_col_hora: string
  prod_table_col_total: string
  prod_table_col_ciclos: string
  prod_table_col_t_ciclo: string
  prod_table_col_acumulado: string
  prod_table_empty: string

  // CockpitAlertBar.tsx
  alert_bar_empty: string
  alert_bar_label: string
  alert_bar_ver_todas: string

  // ProfitOptimizationPanel.tsx
  profit_kicker: string
  profit_loading_title: string
  profit_loading_body: string
  profit_error_title: string
  profit_retry_aria: string
  profit_error_body: (msg: string) => string
  profit_sin_respuesta: string
  profit_no_demo_suffix: string
  profit_title: string
  profit_refresh_aria: string
  profit_recommended_scenario: string
  profit_confianza: (v: string) => string
  profit_factibilidad: (v: string) => string
  profit_more_tons_not_more_value: string
  profit_valor_ajustado: string
  profit_base: string
  profit_costo_tonelada: string
  profit_menor: (name: string) => string
  profit_margen_tonelada: string
  profit_mayor_margen: (name: string) => string
  profit_riesgo: string
  profit_col_escenario: string
  profit_col_toneladas: string
  profit_col_costo: string
  profit_col_usd_t: string
  profit_col_riesgo: string
  profit_col_valor_ajustado: string
  profit_valor_supuesto: (v: string) => string
  profit_fuente_costos: (v: string) => string
  profit_actualizado: (v: string) => string

  // CockpitHeader.tsx
  header_modo_demo: string
  header_cache_real: string
  header_datos_reales: string
  header_datos_sinteticos: string
  header_title: string
  header_subtitle: string
  header_status_aria: string
  header_backend: (status: string) => string
  header_ultimo_registro: string
  header_calidad: string
  header_frescura: string
  header_api: string
  header_refresh_aria: string

  // DispatcherAdvisorPanel.tsx
  dispatcher_kicker: string
  dispatcher_loading_title: string
  dispatcher_loading_body: string
  dispatcher_error_title: string
  dispatcher_retry_aria: string
  dispatcher_error_body: (msg: string) => string
  dispatcher_sin_respuesta: string
  dispatcher_title: string
  dispatcher_riesgo: (v: string) => string
  dispatcher_confianza: (v: string) => string
  dispatcher_refresh_aria: string
  dispatcher_situacion: string
  dispatcher_accion_sugerida: string
  dispatcher_sin_racional: string
  dispatcher_sin_equipo_objetivo: string
  dispatcher_productividad: string
  dispatcher_potenciales: (tons: string) => string
  dispatcher_cola: string
  dispatcher_ventana: (min: number) => string
  dispatcher_valor_esperado: string
  dispatcher_recuperable: (money: string) => string
  dispatcher_col_alternativa: string
  dispatcher_col_valor: string
  dispatcher_col_produccion: string
  dispatcher_col_riesgo: string
  dispatcher_sin_alternativas: string
  dispatcher_trazabilidad: string
  dispatcher_calidad_dato: (score: string, texts: number) => string
  dispatcher_peso: (pct: string) => string

  // ProductionHourlyChart.tsx
  prod_chart_kicker: string
  prod_chart_title: string
  prod_chart_tag: string
  prod_chart_aria: string
  prod_chart_tooltip_hora: string
  prod_chart_tooltip_toneladas: string
  prod_chart_tooltip_acumulado: string

  // LoadingEquipmentDetailModal.tsx
  loading_modal_tooltip_hora: string
  loading_modal_tooltip_toneladas: string
  loading_modal_tooltip_rendimiento: string
  loading_modal_tooltip_distancia: string
  loading_modal_tooltip_carguio: string
  loading_modal_tooltip_espera: string
  loading_modal_tooltip_ruta: string
  loading_modal_origen_sin_dato: string
  loading_modal_destino_sin_dato: string
  loading_modal_aria: (id: string) => string
  loading_modal_close_aria: string
  loading_modal_kicker: string
  loading_modal_operador: (op: string) => string
  loading_modal_toneladas_turno: string
  loading_modal_toneladas_horario: string
  loading_modal_ciclos: string
  loading_modal_rend_carguio: string
  loading_modal_eficiencia: string
  loading_modal_chart_kicker: string
  loading_modal_registros_horarios: (n: number) => string
  loading_modal_sin_serie: string
  loading_modal_peak: (hour: string) => string
  loading_modal_no_hourly_data: string
  loading_modal_col_hora: string
  loading_modal_col_ruta: string
  loading_modal_col_ton_h: string
  loading_modal_col_distancia: string
  loading_modal_col_carguio: string
  loading_modal_col_espera: string
  loading_modal_mejor_hora: string
  loading_modal_sin_detalle: (id: string) => string

  // MonthlyTargetPanel.tsx
  monthly_status_sobre_meta: string
  monthly_status_bajo_meta: string
  monthly_status_cerca: string
  monthly_status_pendiente: string
  monthly_status_sin_estado: string
  monthly_sin_registro: string
  monthly_kicker: string
  monthly_loading_title: string
  monthly_loading_body: string
  monthly_error_title: string
  monthly_retry_aria: string
  monthly_error_body: (msg: string) => string
  monthly_sin_respuesta: string
  monthly_meta_acumulada_kicker: string
  monthly_meta_mes: (label: string) => string
  monthly_refresh_aria: string
  monthly_row_programado: string
  monthly_row_real: string
  monthly_row_diferencia: string
  monthly_cumplimiento: string
  monthly_cumplimiento_aria: (pct: string) => string
  monthly_periodo: (start: string, end: string) => string
  monthly_meta_f01_diaria: string
  monthly_f02_aparte: string
  monthly_total: string
  monthly_fuente_calidad: (source: string, quality: string) => string
  monthly_ultimo_registro: (date: string) => string
  monthly_detalle_diario: string
  monthly_detalle_diario_summary: (n: number) => string
  monthly_detalle_diario_aria: string
  monthly_detalle_diario_note: string
  monthly_col_dia: string
  monthly_col_meta_f01: string
  monthly_col_real_f01: string
  monthly_col_pct_f01: string
  monthly_col_f02: string
  monthly_col_total: string
  monthly_col_estado: string

  // HiddenLossPanel.tsx
  hidden_loss_title: string
  hidden_loss_loading_title: string
  hidden_loss_loading_body: string
  hidden_loss_error_title: string
  hidden_loss_retry_aria: string
  hidden_loss_error_body: (msg: string) => string
  hidden_loss_sin_respuesta: string
  hidden_loss_kicker: string
  hidden_loss_subtitle: string
  hidden_loss_confianza: (v: string) => string
  hidden_loss_refresh_aria: string
  hidden_loss_valor_recuperable: string
  hidden_loss_perdida_estimada: (money: string) => string
  hidden_loss_causa_principal: string
  hidden_loss_category_severity: (category: string, severity: string) => string
  hidden_loss_tiempo_capacidad: string
  hidden_loss_potenciales: (tons: string) => string
  hidden_loss_que_lo_explica: string
  hidden_loss_no_capturadas: (tons: string) => string
  hidden_loss_combustible: (liters: string) => string
  hidden_loss_desgaste: (money: string) => string
  hidden_loss_fuentes: string
  hidden_loss_category_confianza: (category: string, confidence: string) => string
  hidden_loss_recuperable: (money: string) => string
  hidden_loss_equipos_afectados: string
  hidden_loss_col_equipo: string
  hidden_loss_col_perdida: string
  hidden_loss_col_horas: string
  hidden_loss_col_fuente: string
  hidden_loss_sin_equipos: string

  // OperationalNlpPanel.tsx
  nlp_title: string
  nlp_loading_title: string
  nlp_loading_body: string
  nlp_error_title: string
  nlp_retry_aria: string
  nlp_error_body: (msg: string) => string
  nlp_sin_respuesta: string
  nlp_kicker: string
  nlp_subtitle: string
  nlp_refresh_aria: string
  nlp_senal_principal: string
  nlp_menciones_confianza: (freq: number, conf: string) => string
  nlp_impacto_asociado: string
  nlp_horas_perdidas: (h: string) => string
  nlp_equipos_mencionados: string
  nlp_sin_equipo: string
  nlp_textos_analizados: (n: number, trend: string) => string
  nlp_que_dicen: string
  nlp_relacion_perdida: string
  nlp_conectado: (money: string) => string
  nlp_sin_textos: string
  nlp_patrones_detectados: string
  nlp_sin_patrones: string
  nlp_equipos_involucrados: string
  nlp_menciones: (n: number) => string
  nlp_sin_equipos_asociados: string
  nlp_operadores_roles: string
  nlp_sin_operadores_asociados: string
  nlp_evidencia_operacional: string
  nlp_pattern_menciones: (category: string, freq: number) => string
  nlp_pattern_horas: (h: string) => string

  // ShovelProductionChart.tsx
  shovel_tooltip_uc: string
  shovel_tooltip_total: string
  shovel_kicker: string
  shovel_title: string
  shovel_tag_hora_pala: string
  shovel_tag_palas: (n: number) => string
  shovel_total_uc: string
  shovel_uc_lider: string
  shovel_sin_dato: string
  shovel_sin_participacion: string
  shovel_pct_carguio: (pct: string) => string
  shovel_equipos: string
  shovel_con_apertura: string
  shovel_total_turno: string
  shovel_legend_aria: string
  shovel_chart_aria: string

  // DecisionAuditPanel.tsx
  audit_title: string
  audit_loading_title: string
  audit_loading_body: string
  audit_error_title: string
  audit_retry_aria: string
  audit_error_body: (msg: string) => string
  audit_sin_respuesta: string
  audit_kicker: string
  audit_refresh_aria: string
  audit_no_history_title: string
  audit_no_history_fallback: string
  audit_en_seguimiento: (action: string) => string
  audit_metric_recomendaciones: string
  audit_metric_ejecutadas: (n: string) => string
  audit_metric_adopcion: string
  audit_insuficiente: string
  audit_metric_parciales: (n: string) => string
  audit_metric_efectividad: string
  audit_metric_evaluadas: (n: string) => string
  audit_metric_valor_esperado: string
  audit_acumulado: string
  audit_metric_valor_real: string
  audit_observado: string
  audit_metric_recuperacion: string
  audit_col_decision: string
  audit_col_estado: string
  audit_col_esperado: string
  audit_col_real: string
  audit_col_efectividad: string
  audit_sin_evaluar: string
  audit_aprendizaje: string
  audit_mejor_tipo_label: string
  audit_menor_desempeno_label: string
  audit_decision_actual: string
  audit_esperado_detalle: (tons: string, money: string) => string

  // LoadingEquipmentCard.tsx
  loading_card_rank: (rank: number) => string
  loading_card_unidad_carguio: string
  loading_card_critico: string
  loading_card_revisar: string
  loading_card_operando: string
  loading_card_tonelaje_turno: string
  loading_card_aporte_sin_dato: string
  loading_card_pct_lider: (pct: string) => string
  loading_card_ciclos: string
  loading_card_t_ciclo: string
  loading_card_eficiencia: string
  loading_card_operador: string
  loading_card_origen_frente: string
  loading_card_destino_principal: string
  loading_card_participacion_sin_dato: string
  loading_card_pct_destino: (pct: string) => string
  loading_card_ver_detalle: string
  loading_card_aria: (id: string) => string

  // ShiftComparisonVisionPanel.tsx
  sc_leader_dia: string
  sc_leader_noche: string
  sc_leader_empate: string
  sc_focus_dia: string
  sc_focus_noche: string
  sc_focus_ambos: string
  sc_tone_fuel: string
  sc_tone_failure: string
  sc_tone_maintenance: string
  sc_tone_delay: string
  sc_tone_standby: string
  sc_tone_operation: string
  sc_tone_other: string
  sc_source_dato_ciclo: string
  sc_metric_sin_dato: string
  sc_rec_maintenance: (code: string, desc: string) => string
  sc_rec_sin_actividad: string
  sc_rec_mejor_hora: string
  sc_rec_ciclo_caex_alto: string
  sc_rec_reducir_espera_n06: string
  sc_rec_ruta_alta: string
  sc_rec_revisar_transporte: string
  sc_rec_revisar_retorno: string
  sc_rec_mantener_ciclo: string
  sc_rec_revisar_espera_n14: string
  sc_rec_revisar_carguio_n13: string
  sc_rec_mejorar_continuidad: string
  sc_rec_mantener_ritmo: string
  sc_sin_fecha: string
  sc_sin_periodo: string
  sc_vision_comparativa_kicker: string
  sc_foco_turno_aria: string
  sc_contexto_operacional_aria: string
  sc_vision_comparativa_aria: string
  sc_leyenda_hora_hora_aria: string
  sc_barras_comparativas_aria: string
  sc_comparativa_aria: string
  sc_loading_title: string
  sc_loading_body: string
  sc_error_title: string
  sc_fecha_comparativa: string
  sc_retry_aria: string
  sc_error_body: string
  sc_title: string
  sc_dia: string
  sc_noche: string
  sc_ambos: string
  sc_refresh_aria: string
  sc_fecha_operacional: (date: string) => string
  sc_turno_actual: (turno: string) => string
  sc_periodo_actual: (start: string, end: string) => string
  sc_turno_dia_label: string
  sc_turno_noche_label: string
  sc_diferencia_label: string
  sc_ciclos_uc: (ciclos: string, uc: string) => string
  sc_hora_a_hora: string
  sc_leyenda_dia: string
  sc_leyenda_noche: string
  sc_leyenda_ambos: string
  sc_linea_total_hora: string
  sc_proyectado: string
  sc_suma_tonelaje: string
  sc_turno_dia_em: string
  sc_turno_noche_em: string
  sc_dia_noche_em: (dia: string, noche: string) => string
  sc_pendiente: string
  sc_tonelajes_visibles_aria: string
  sc_dia_en_curso: string
  sc_noche_en_curso: string
  sc_dia_misma_ventana: string
  sc_noche_misma_ventana: string
  sc_comparacion_justa: string
  sc_ventana: (slots: number) => string
  sc_diferencia_misma_ventana: string
  sc_evita_comparar: string
  sc_proyeccion_vs_completo: string
  sc_vs_referencia: (delta: string) => string
  sc_ritmo_horario: string
  sc_referencia_rate: (rate: string) => string
  sc_origen_operacional: string
  sc_distribucion_operacional: (label: string) => string
  sc_lectura_justa_aria: string
  sc_diferencia_por_hora: string
  sc_produccion_por_hora: string
  sc_mayor_brecha: string
  sc_unidades_carguio: string
  sc_caex: string
  sc_total_visible: string
  sc_top2: string
  sc_top_equipo: string
  sc_filtro: string
  sc_concentracion_uc: string
  sc_top2_pct: (pct: string) => string
  sc_bajo_aporte: (id: string, tons: string) => string
  sc_sin_uc_bajo: string
  sc_lectura_caex: string
  sc_equipos_dataset: (n: number) => string
  sc_incluye_caex: string
  sc_sin_equipos_para: (label: string) => string
  sc_rendimiento_operadores: string
  sc_turno_dia_vs_noche: string
  sc_dia_short: string
  sc_noche_short: string
  sc_tonelaje: string
  sc_rendimiento: string
  sc_ciclos_t_ciclo: string
  sc_horas_actividad: (n: number) => string
  sc_diferencia_rendimiento: string
  sc_noche_supera: string
  sc_dia_supera: string
  sc_filtro_ambos_note: (winner: string) => string
  sc_dato_ciclo: string
  sc_unidad_carguio: string
  sc_equipo_caex: string
  sc_acarreo: string
  sc_produccion: string
  sc_eficiencia: string
  sc_pct_lider: (pct: string) => string
  sc_caex_asignados: (n: string) => string
  sc_uc_atendidas: (n: string) => string
  sc_prom_circuito: (v: string) => string
  sc_ciclos_n: (n: string) => string
  sc_operador: string
  sc_estado_wenco: string
  sc_sin_categoria: string
  sc_banco_malla: string
  sc_origen_uc: string
  sc_destino: string
  sc_ver_detalle: string
  sc_dia_tons: (tons: string) => string
  sc_noche_tons: (tons: string) => string
  sc_detalle_comparativo_aria: (id: string) => string
  sc_close_aria: string
  sc_detalle_uc: string
  sc_detalle_caex: string
  sc_dist_od: string
  sc_transp_n04: string
  sc_retorno_n03: string
  sc_espera_n06: string
  sc_ciclo_caex: string
  sc_mejor_hora_kv: (label: string, tons: string) => string
  sc_mejor_hora_label: string
  sc_dia_kv: string
  sc_noche_kv: string
  sc_dia_hora: (hour: string) => string
  sc_noche_hora: (hour: string) => string
  sc_hora_futura: string
  sc_dia_noche_disponible: string
  sc_linea_verde_proyectada: string
  sc_sin_operador: string
  sc_total_hora: string
  sc_ton_h_label: string
  sc_linea_amarilla: string
  sc_en_curso_badge: string
  sc_status_reasons_aria: (id: string) => string
  sc_status_actual_aria: (id: string) => string
  sc_estado_wenco_label: string
  sc_mas_estados: (n: number) => string
  sc_comparacion_aria: (id: string) => string
  sc_uc_label: (label: string) => string
  sc_equipos_focus_summary: (n: number, label: string) => string
  sc_operador_dia_noche: (dia: string, noche: string) => string
  sc_leyenda_grafico_aria: string
  sc_linea_tonelaje_hora: string
  sc_ciclos_kv: string
  sc_rend_carguio_kv: string
  sc_tonelaje_hora_hora: string
  sc_peak: (label: string) => string
  sc_estados_wenco_equipo: string
  sc_n_estados: (n: number) => string
  sc_sin_estado: string
  sc_sin_transiciones: string
  sc_no_data_detail: (id: string) => string
  sc_col_slot: string
  sc_col_origen_destino: string
  sc_col_tonelaje: string
  sc_col_dist_od: string
  sc_col_transp_retorno: string
  sc_col_carguio_ciclo: string
  sc_col_ciclo_caex: string
  sc_col_espera_caex: string
  sc_col_recomendacion: string
  sc_sin_detalle_horario: string
  sc_ciclo_kv: string
  sc_retorno_kv: (v: string) => string
  sc_ciclos_c: (tons: string, c: string) => string
  sc_dia_n13: (v: string) => string
  sc_noche_n13: (v: string) => string
  sc_dia_ciclo: (v: string) => string
  sc_noche_ciclo: (v: string) => string
  sc_dia_n14: (v: string) => string
  sc_noche_n14: (v: string) => string
  sc_dia_n04_n03: (n04: string, n03: string) => string
  sc_noche_n04_n03: (n04: string, n03: string) => string
}

export const cockpitT: ModuleDict<CockpitT> = {
  es: {
    common_sin_dato: 'Sin dato',
    common_lectura_ejecutiva: 'Lectura ejecutiva',
    common_confianza: (value) => `Confianza ${value}`,
    common_top: (n) => `Top ${n}`,
    common_operador: (op) => `Operador ${op}`,

    availability_real: 'Dato real',
    availability_partial: 'Dato parcial',
    availability_missing: 'Sin dato',
    confidence_baja: 'BAJA',
    confidence_media: 'MEDIA',
    confidence_alta: 'ALTA',
    section_turno: 'Turno en curso',
    section_mensual: 'Meta mensual',
    section_comparativa: 'Dia vs Noche',
    section_equipos: 'Equipos',
    section_produccion: 'Produccion',
    section_decisiones: 'Decisiones',
    section_flota: 'Flota',
    section_nav_aria: 'Secciones del cockpit',
    filters_aria: 'Filtros cockpit',
    filters_fecha: 'Fecha',
    filters_turno: 'Turno',
    filters_turno_resuelto_aria: (label) => `Turno resuelto: ${label}`,
    filters_turno_actual: 'Actual',
    filters_turno_dia: 'Dia',
    filters_turno_noche: 'Noche',
    opening_read_aria: 'Lectura inicial del cockpit',
    opening_read_kicker: 'Lectura ejecutiva',
    opening_read_title: 'Estado, brecha, ritmo requerido y accion',
    opening_read_desc: 'Primero muestra si el turno y el mes van en verde; despues baja a equipos, causas y decision.',
    opening_1_label: 'Turno a esta hora',
    opening_1_actual: (tons) => `Actual ${tons}`,
    opening_1_esperado_sin_dato: 'esperado sin dato',
    opening_1_esperado: (tons) => `Esperado ${tons}`,
    opening_1_avance_sin_dato: 'Avance horario sin dato',
    opening_1_avance: (pct) => `${pct}% del turno transcurrido`,
    opening_2_label: 'Proyectado fin turno',
    opening_2_pct_proyectado: (pct) => `${pct}% proyectado`,
    opening_2_meta_no_configurada: 'Meta turno no configurada',
    opening_2_brecha: (delta) => `Brecha cierre ${delta}`,
    opening_3_label: 'Requerido restante',
    opening_3_sin_meta: 'Sin meta',
    opening_3_valor: (tph) => `${tph} t/h`,
    opening_3_sin_calculo: 'No se calcula sin meta/avance',
    opening_3_detalle: (tons) => `${tons} para meta turno`,
    opening_3_tiempo_sin_dato: 'Tiempo restante sin dato',
    opening_3_tiempo_restante: (min) => `${min} min restantes`,
    opening_4_label: 'Para cerrar verde F01',
    opening_4_sin_plan: 'Sin plan',
    opening_4_valor: (v) => `${v} t/dia`,
    opening_4_sin_dato: 'Cumplimiento mensual sin dato',
    opening_4_detalle: (pct) => `${pct}% acumulado F01`,
    opening_5_actual_turno: (turno) => `Actual ${turno}`,
    opening_5_filtro_actual: 'Filtro actual',
    opening_6_label: 'Equipo a revisar',
    opening_6_sin_foco: 'Sin foco',
    opening_6_detalle: (pct, tons) => `${pct} eficiencia / ${tons}`,
    opening_6_sin_tarjetas: 'Sin tarjetas UC disponibles',
    opening_6_validar: 'Validar estados WENCO y asignacion',
    opening_7_label: 'Accion recomendada',
    opening_7_impacto: (tons, money) => `Impacto ${tons} / ${money}`,
    fair_comparison_label: 'Comparacion justa',
    fair_comparison_sin_dato: 'Sin dato',
    fair_comparison_sin_respuesta: 'No hay respuesta de /api/shift-comparison.',
    fair_comparison_ventana: (slots) => `Ventana H+1-H+${slots}`,
    fair_comparison_actual_sin_ref: (current) => `${current} turno actual / referencia sin dato`,
    fair_comparison_detalle: (current, reference, pct) => `${current} actual vs ${reference} ref. (${pct}%)`,
    required_green_meta_no_cargada: 'Meta mensual no cargada.',
    required_green_meta_no_configurada: 'Meta F01 mensual no configurada.',
    required_green_dias_sin_promedio: (days) => `${days} dias restantes / promedio real sin dato`,
    required_green_prom_actual: (avg, days) => `Prom. actual ${avg} / ${days} dias restantes`,
    loading_cockpit: 'Cargando cockpit operacional...',
    error_title: 'Cockpit sin datos operacionales',
    error_detail: (msg) => `No se pudo cargar /api/cockpit: ${msg}`,
    error_detail_generic: 'No se pudo cargar /api/cockpit.',
    error_demo_suffix: ' No se usa demo sin modo explicito del backend.',
    projection_sin_meta: 'Sin meta',
    projection_sobre_meta: 'Sobre meta',
    projection_bajo_meta: 'Bajo meta',
    shift_target_label: (tons) => `${tons}/turno`,
    shift_target_sin_meta: 'Sin meta turno',
    daily_target_label: (tons) => `${tons}/dia`,
    daily_target_sin_meta: 'Sin meta diaria',
    partial_item_ciclos: 'ciclos',
    partial_item_caex_activos: 'CAEX activos',
    partial_item_promedio_ciclo: 'promedio ciclo',
    partial_item_caex_promedio_circuito: 'CAEX promedio en circuito',
    partial_banner: (items) => `Datos parciales: ${items} no vienen en /api/cockpit v1. No se inventan valores.`,
    kpi_grid_aria: 'Indicadores del turno',
    kpi_produccion_actual_label: 'Produccion actual',
    kpi_produccion_actual_subtext_sin_meta: 'Avance sin meta configurada',
    kpi_produccion_actual_subtext: (pct) => `${pct}% avance real`,
    sector_split_aria: 'Separacion F01 versus F02',
    sector_split_pct: (pct) => `${pct}% del turno`,
    sector_split_proyectado: (tons) => `Proy. ${tons}`,
    kpi_tonelaje_proyectado: 'Tonelaje proyectado',
    kpi_meta_no_configurada: 'Meta no configurada',
    kpi_proyeccion_detalle: (status, delta, pct) => `${status} ${delta} (${pct}%)`,
    kpi_proyeccion_confianza: (label, hours) => `Confianza ${label} / ${hours || 0}/12 h reales`,
    kpi_proyeccion_rango: (low, high) => `Rango ${low} - ${high}`,
    kpi_meta_turno_label: 'Meta turno',
    kpi_meta_turno_sin_meta: 'Sin meta',
    kpi_meta_turno_subtext_no_config: 'Meta no configurada',
    kpi_meta_turno_subtext: (label) => `Meta diaria ${label}`,
    kpi_ciclos_label: 'Ciclos',
    kpi_dato_no_disponible: 'Dato no disponible',
    kpi_no_informado_api: 'No informado por API',
    kpi_ciclos_subtext: 'Ciclos del turno',
    kpi_caex_activos_label: 'CAEX activos',
    kpi_caex_activos_subtext: 'Equipos activos',
    kpi_promedio_ciclo_label: 'Promedio ciclo',
    kpi_promedio_ciclo_subtext: (money) => `Costo turno ${money}`,
    kpi_promedio_caex_circuito_label: 'Promedio CAEX circuito',
    kpi_promedio_caex_circuito_subtext: 'CAEX promedio en circuito',
    kpi_caex_disp_indicator: (pct) => `${pct}% disp.`,
    estado_caex_title: 'Estado CAEX',
    estado_caex_empty: 'Sin detalle CAEX informado por /api/cockpit.',
    estado_palas_title: 'Estado Palas',
    estado_palas_empty: 'Sin palas informadas por /api/cockpit.',
    decision_intelligence_kicker: 'Decision intelligence',
    decision_intelligence_title: 'Que hacer ahora',
    decision_intelligence_tag: (conf) => `Confianza ${conf}`,
    decision_action_label: 'Accion prioritaria',
    decision_action_note: 'Validar en terreno y monitorear el efecto durante los proximos 30 minutos.',
    decision_impact_tonelaje: 'Tonelaje',
    decision_impact_valor: 'Valor',
    decision_impact_cola: (min) => `${min} min`,
    decision_scenarios_label: 'Escenarios rapidos',
    decision_scenarios_top3: 'Top 3',
    intelligence_brief_aria: 'Perdidas ocultas y senales operacionales',
    intelligence_brief_kicker: 'Causas y evidencia',
    intelligence_brief_title: 'Por que se pierde valor operacional',
    intelligence_brief_desc: 'Ordena valor recuperable, causa principal, evidencias y equipos involucrados.',
    fleet_section_aria: 'Resumen por equipo',
    fleet_kicker: 'Unidades de carguio',
    fleet_title: 'Equipos que explican la produccion del turno',
    fleet_desc: 'Haz clic en una tarjeta para revisar tonelaje hora a hora, estados WENCO y detalle operacional.',
    fleet_empty: 'Sin resumen por equipo en /api/cockpit.',

    shift_summary_kicker: 'Turno actual',
    shift_summary_registro: 'Registro',
    shift_summary_produccion: 'Produccion',
    shift_summary_meta: 'Meta',
    shift_summary_sin_meta: 'Sin meta',
    shift_summary_riesgo: 'Riesgo',
    shift_summary_progress_aria: (pct) => `Avance de meta ${pct}%`,

    kpi_card_sparkline_aria: 'Tendencia KPI',
    kpi_card_progress_aria: (pct) => `Avance ${pct}%`,

    equip_status_kicker: 'Estado equipos',
    equip_status_ver_todos: 'Ver todos',
    equip_status_operativos: 'Operativos',
    equip_status_sin_actividad: 'Sin actividad',
    equip_status_posible_averia: 'Posible averia',
    equip_status_ciclos_sd: 'Ciclos s/d',
    equip_status_ciclos: (n) => `${n} ciclos`,
    equip_status_toneladas_sd: 't s/d',

    prod_table_kicker: 'Detalle horario',
    prod_table_title: 'Produccion por hora',
    prod_table_registros: (n) => `${n} registros`,
    prod_table_col_hora: 'Hora',
    prod_table_col_total: 'Total',
    prod_table_col_ciclos: 'Ciclos',
    prod_table_col_t_ciclo: 't/ciclo',
    prod_table_col_acumulado: 'Acumulado',
    prod_table_empty: 'Sin datos horarios en /api/cockpit.',

    alert_bar_empty: 'Sin alertas operacionales abiertas.',
    alert_bar_label: 'alertas',
    alert_bar_ver_todas: 'Ver todas',

    profit_kicker: 'Profit Optimization',
    profit_loading_title: 'Evaluando escenarios economicos',
    profit_loading_body: 'Cargando /api/profit-optimization...',
    profit_error_title: 'Optimizacion economica no disponible',
    profit_retry_aria: 'Reintentar profit optimization',
    profit_error_body: (msg) => `${msg} No se usa demo silencioso.`,
    profit_sin_respuesta: 'Sin respuesta de /api/profit-optimization.',
    profit_no_demo_suffix: 'No se usa demo silencioso.',
    profit_title: 'Mayor valor economico ajustado por riesgo',
    profit_refresh_aria: 'Actualizar profit optimization',
    profit_recommended_scenario: 'Escenario recomendado',
    profit_confianza: (v) => `Confianza ${v}`,
    profit_factibilidad: (v) => `Factibilidad ${v}`,
    profit_more_tons_not_more_value: 'Mas toneladas no es mayor valor',
    profit_valor_ajustado: 'Valor ajustado',
    profit_base: 'Base',
    profit_costo_tonelada: 'Costo por tonelada',
    profit_menor: (name) => `Menor: ${name}`,
    profit_margen_tonelada: 'Margen por tonelada',
    profit_mayor_margen: (name) => `Mayor margen: ${name}`,
    profit_riesgo: 'Riesgo',
    profit_col_escenario: 'Escenario',
    profit_col_toneladas: 'Toneladas',
    profit_col_costo: 'Costo',
    profit_col_usd_t: 'USD/t',
    profit_col_riesgo: 'Riesgo',
    profit_col_valor_ajustado: 'Valor ajustado',
    profit_valor_supuesto: (v) => `Valor/t supuesto: USD ${v}`,
    profit_fuente_costos: (v) => `Fuente costos: ${v}`,
    profit_actualizado: (v) => `Actualizado: ${v}`,

    header_modo_demo: 'MODO DEMO',
    header_cache_real: 'CACHE REAL',
    header_datos_reales: 'DATOS REALES',
    header_datos_sinteticos: 'Datos sinteticos',
    header_title: 'COCKPIT OPERACIONAL',
    header_subtitle: 'Vision en tiempo real de la operacion',
    header_status_aria: 'Estado operacional',
    header_backend: (status) => `Backend ${status}`,
    header_ultimo_registro: 'Ultimo registro real',
    header_calidad: 'Calidad',
    header_frescura: 'Frescura',
    header_api: 'API',
    header_refresh_aria: 'Actualizar cockpit',

    dispatcher_kicker: 'AI Dispatcher Advisor',
    dispatcher_loading_title: 'Construyendo recomendacion operacional',
    dispatcher_loading_body: 'Cargando /api/dispatcher-advisor...',
    dispatcher_error_title: 'Advisor operacional no disponible',
    dispatcher_retry_aria: 'Reintentar dispatcher advisor',
    dispatcher_error_body: (msg) => `${msg} No se usa demo silencioso.`,
    dispatcher_sin_respuesta: 'Sin respuesta de /api/dispatcher-advisor.',
    dispatcher_title: 'Recomendacion operacional integrada',
    dispatcher_riesgo: (v) => `Riesgo ${v}`,
    dispatcher_confianza: (v) => `Confianza ${v}`,
    dispatcher_refresh_aria: 'Actualizar dispatcher advisor',
    dispatcher_situacion: 'Situacion detectada',
    dispatcher_accion_sugerida: 'Accion sugerida',
    dispatcher_sin_racional: 'Sin racional operacional disponible.',
    dispatcher_sin_equipo_objetivo: 'Sin equipo objetivo especifico',
    dispatcher_productividad: 'Productividad',
    dispatcher_potenciales: (tons) => `${tons} potenciales`,
    dispatcher_cola: 'Cola',
    dispatcher_ventana: (min) => `Ventana ${min} min`,
    dispatcher_valor_esperado: 'Valor esperado',
    dispatcher_recuperable: (money) => `${money} recuperable`,
    dispatcher_col_alternativa: 'Alternativa',
    dispatcher_col_valor: 'Valor',
    dispatcher_col_produccion: 'Produccion',
    dispatcher_col_riesgo: 'Riesgo',
    dispatcher_sin_alternativas: 'Sin alternativas comparables informadas por el motor.',
    dispatcher_trazabilidad: 'Trazabilidad',
    dispatcher_calidad_dato: (score, texts) => `Calidad dato ${score} / 100 - ${texts} textos`,
    dispatcher_peso: (pct) => `Peso ${pct}%`,

    prod_chart_kicker: 'Produccion',
    prod_chart_title: 'Hora a hora',
    prod_chart_tag: 'Barras + acumulado',
    prod_chart_aria: 'Produccion por hora y acumulado',
    prod_chart_tooltip_hora: 'Hora',
    prod_chart_tooltip_toneladas: 'Toneladas',
    prod_chart_tooltip_acumulado: 'Acumulado',

    loading_modal_tooltip_hora: 'Hora',
    loading_modal_tooltip_toneladas: 'Toneladas',
    loading_modal_tooltip_rendimiento: 'Rendimiento',
    loading_modal_tooltip_distancia: 'Distancia',
    loading_modal_tooltip_carguio: 'Carguio N13',
    loading_modal_tooltip_espera: 'Espera N14',
    loading_modal_tooltip_ruta: 'Ruta dominante',
    loading_modal_origen_sin_dato: 'Origen sin dato',
    loading_modal_destino_sin_dato: 'Destino sin dato',
    loading_modal_aria: (id) => `Detalle UC ${id}`,
    loading_modal_close_aria: 'Cerrar detalle',
    loading_modal_kicker: 'Detalle unidad de carguio',
    loading_modal_operador: (op) => `Operador: ${op}`,
    loading_modal_toneladas_turno: 'Toneladas turno',
    loading_modal_toneladas_horario: 'Toneladas horario',
    loading_modal_ciclos: 'Ciclos',
    loading_modal_rend_carguio: 'Rend. carguio',
    loading_modal_eficiencia: 'Eficiencia',
    loading_modal_chart_kicker: 'Tonelaje hora a hora',
    loading_modal_registros_horarios: (n) => `${n} registros horarios`,
    loading_modal_sin_serie: 'Sin serie horaria',
    loading_modal_peak: (hour) => `Peak ${hour}`,
    loading_modal_no_hourly_data: '/api/cockpit no entrego serie hora a hora para esta UC. Se mantiene el total del turno sin inventar datos.',
    loading_modal_col_hora: 'Hora',
    loading_modal_col_ruta: 'Origen -> destino',
    loading_modal_col_ton_h: 'Ton/h',
    loading_modal_col_distancia: 'Distancia',
    loading_modal_col_carguio: 'Prom. carguio N13',
    loading_modal_col_espera: 'Espera CAEX N14',
    loading_modal_mejor_hora: 'Mejor hora',
    loading_modal_sin_detalle: (id) => `Sin detalle horario disponible para ${id}.`,

    monthly_status_sobre_meta: 'Sobre meta',
    monthly_status_bajo_meta: 'Bajo meta',
    monthly_status_cerca: 'Cerca',
    monthly_status_pendiente: 'Pendiente',
    monthly_status_sin_estado: 'Sin estado',
    monthly_sin_registro: 'Sin registro',
    monthly_kicker: 'Meta mensual',
    monthly_loading_title: 'Cargando Meta Mes',
    monthly_loading_body: 'Cargando /api/monthly-target...',
    monthly_error_title: 'Meta acumulada no disponible',
    monthly_retry_aria: 'Reintentar meta mensual',
    monthly_error_body: (msg) => `${msg} No se usa referencia sin marcar fuente.`,
    monthly_sin_respuesta: 'Sin respuesta de /api/monthly-target.',
    monthly_meta_acumulada_kicker: 'Meta acumulada',
    monthly_meta_mes: (label) => `Meta Mes ${label}`,
    monthly_refresh_aria: 'Actualizar meta mensual',
    monthly_row_programado: 'Programado acumulado',
    monthly_row_real: 'Real acumulado',
    monthly_row_diferencia: 'Diferencia',
    monthly_cumplimiento: 'Cumplimiento',
    monthly_cumplimiento_aria: (pct) => `Cumplimiento ${pct}`,
    monthly_periodo: (start, end) => `${start} al ${end}`,
    monthly_meta_f01_diaria: 'Meta F01 diaria:',
    monthly_f02_aparte: 'F02 aparte:',
    monthly_total: 'Total:',
    monthly_fuente_calidad: (source, quality) => `Fuente: ${source} / Calidad: ${quality}`,
    monthly_ultimo_registro: (date) => `Ultimo registro: ${date}`,
    monthly_detalle_diario: 'Detalle diario del mes',
    monthly_detalle_diario_summary: (n) => `${n} dias / F01 diario / F02 aparte`,
    monthly_detalle_diario_aria: 'Detalle diario Meta Mes',
    monthly_detalle_diario_note: 'F01 contra meta diaria oficial · F02 cobro aparte · Total operacional',
    monthly_col_dia: 'Dia',
    monthly_col_meta_f01: 'Meta F01',
    monthly_col_real_f01: 'Real F01',
    monthly_col_pct_f01: '% F01',
    monthly_col_f02: 'F02 aparte',
    monthly_col_total: 'Total',
    monthly_col_estado: 'Estado',

    hidden_loss_title: 'Hidden Loss Detector',
    hidden_loss_loading_title: 'Detectando perdidas ocultas',
    hidden_loss_loading_body: 'Cargando /api/hidden-losses...',
    hidden_loss_error_title: 'Perdidas ocultas no disponibles',
    hidden_loss_retry_aria: 'Reintentar hidden losses',
    hidden_loss_error_body: (msg) => `${msg} No se usa demo silencioso.`,
    hidden_loss_sin_respuesta: 'Sin respuesta de /api/hidden-losses.',
    hidden_loss_kicker: 'Perdidas ocultas',
    hidden_loss_subtitle: 'Impacto economico, causa y equipos afectados',
    hidden_loss_confianza: (v) => `Confianza ${v}`,
    hidden_loss_refresh_aria: 'Actualizar hidden losses',
    hidden_loss_valor_recuperable: 'Valor recuperable',
    hidden_loss_perdida_estimada: (money) => `${money} perdida estimada`,
    hidden_loss_causa_principal: 'Causa principal',
    hidden_loss_category_severity: (category, severity) => `${category} / ${severity}`,
    hidden_loss_tiempo_capacidad: 'Tiempo / capacidad',
    hidden_loss_potenciales: (tons) => `${tons} potenciales`,
    hidden_loss_que_lo_explica: 'Que lo explica',
    hidden_loss_no_capturadas: (tons) => `${tons} no capturadas`,
    hidden_loss_combustible: (liters) => `${liters} L combustible`,
    hidden_loss_desgaste: (money) => `${money} desgaste`,
    hidden_loss_fuentes: 'Fuentes de perdida',
    hidden_loss_category_confianza: (category, confidence) => `${category} - Confianza ${confidence}`,
    hidden_loss_recuperable: (money) => `${money} recuperable`,
    hidden_loss_equipos_afectados: 'Equipos afectados',
    hidden_loss_col_equipo: 'Equipo',
    hidden_loss_col_perdida: 'Perdida',
    hidden_loss_col_horas: 'Horas',
    hidden_loss_col_fuente: 'Fuente',
    hidden_loss_sin_equipos: 'Sin equipos con perdida oculta material.',

    nlp_title: 'Operational NLP',
    nlp_loading_title: 'Analizando novedades operacionales',
    nlp_loading_body: 'Cargando /api/operational-nlp...',
    nlp_error_title: 'Inteligencia textual no disponible',
    nlp_retry_aria: 'Reintentar operational NLP',
    nlp_error_body: (msg) => `${msg} No se usa demo silencioso.`,
    nlp_sin_respuesta: 'Sin respuesta de /api/operational-nlp.',
    nlp_kicker: 'Novedades operacionales',
    nlp_subtitle: 'Senales textuales que explican perdidas',
    nlp_refresh_aria: 'Actualizar operational NLP',
    nlp_senal_principal: 'Senal principal',
    nlp_menciones_confianza: (freq, conf) => `${freq} menciones - Confianza ${conf}`,
    nlp_impacto_asociado: 'Impacto asociado',
    nlp_horas_perdidas: (h) => `${h} h perdidas`,
    nlp_equipos_mencionados: 'Equipos mencionados',
    nlp_sin_equipo: 'Sin equipo',
    nlp_textos_analizados: (n, trend) => `${n} textos analizados / ${trend}`,
    nlp_que_dicen: 'Que dicen las novedades',
    nlp_relacion_perdida: 'Relacion perdida oculta',
    nlp_conectado: (money) => `${money} conectado`,
    nlp_sin_textos: 'No hay textos suficientes para detectar un patron dominante.',
    nlp_patrones_detectados: 'Patrones detectados',
    nlp_sin_patrones: 'Sin patrones detectados.',
    nlp_equipos_involucrados: 'Equipos involucrados',
    nlp_menciones: (n) => `${n} menciones`,
    nlp_sin_equipos_asociados: 'Sin equipos asociados.',
    nlp_operadores_roles: 'Operadores / roles',
    nlp_sin_operadores_asociados: 'Sin operadores asociados.',
    nlp_evidencia_operacional: 'Evidencia operacional',
    nlp_pattern_menciones: (category, freq) => `${category} - ${freq} menciones`,
    nlp_pattern_horas: (h) => `${h} h estimadas`,

    shovel_tooltip_uc: 'Unidad de carguio',
    shovel_tooltip_total: 'Total',
    shovel_kicker: 'Produccion por pala',
    shovel_title: 'Toneladas por unidad de carguio',
    shovel_tag_hora_pala: 'Hora + pala',
    shovel_tag_palas: (n) => `${n} palas`,
    shovel_total_uc: 'Total UC',
    shovel_uc_lider: 'UC lider',
    shovel_sin_dato: 'Sin dato',
    shovel_sin_participacion: 'Sin participacion',
    shovel_pct_carguio: (pct) => `${pct}% del carguio`,
    shovel_equipos: 'Equipos',
    shovel_con_apertura: 'Con apertura hora a hora',
    shovel_total_turno: 'Total del turno',
    shovel_legend_aria: 'Selector de palas',
    shovel_chart_aria: 'Produccion por pala',

    audit_title: 'Operational Decision Audit',
    audit_loading_title: 'Cargando auditoria de decisiones',
    audit_loading_body: 'Cargando /api/decision-audit...',
    audit_error_title: 'Auditoria no disponible',
    audit_retry_aria: 'Reintentar decision audit',
    audit_error_body: (msg) => `${msg} No se usa demo silencioso.`,
    audit_sin_respuesta: 'Sin respuesta de /api/decision-audit.',
    audit_kicker: 'Auditoria de decisiones',
    audit_refresh_aria: 'Actualizar decision audit',
    audit_no_history_title: 'Aun no existen decisiones auditadas.',
    audit_no_history_fallback: 'Sin historial real de ejecucion; auditoria actual en modo seguimiento.',
    audit_en_seguimiento: (action) => `En seguimiento: ${action}`,
    audit_metric_recomendaciones: 'Recomendaciones',
    audit_metric_ejecutadas: (n) => `${n} ejecutadas`,
    audit_metric_adopcion: 'Adopcion',
    audit_insuficiente: 'Insuficiente',
    audit_metric_parciales: (n) => `${n} parciales`,
    audit_metric_efectividad: 'Efectividad',
    audit_metric_evaluadas: (n) => `${n} evaluadas`,
    audit_metric_valor_esperado: 'Valor esperado',
    audit_acumulado: 'Acumulado',
    audit_metric_valor_real: 'Valor real',
    audit_observado: 'Observado',
    audit_metric_recuperacion: 'Recuperacion',
    audit_col_decision: 'Decision',
    audit_col_estado: 'Estado',
    audit_col_esperado: 'Esperado',
    audit_col_real: 'Real',
    audit_col_efectividad: 'Efectividad',
    audit_sin_evaluar: 'Sin evaluar',
    audit_aprendizaje: 'Aprendizaje',
    audit_mejor_tipo_label: 'Mejor tipo:',
    audit_menor_desempeno_label: 'Menor desempeno:',
    audit_decision_actual: 'Decision actual',
    audit_esperado_detalle: (tons, money) => `Esperado: ${tons} / ${money}`,

    loading_card_rank: (rank) => `#${rank} aporte UC`,
    loading_card_unidad_carguio: 'Unidad de carguio',
    loading_card_critico: 'Critico',
    loading_card_revisar: 'Revisar',
    loading_card_operando: 'Operando',
    loading_card_tonelaje_turno: 'Tonelaje turno',
    loading_card_aporte_sin_dato: 'Aporte relativo sin dato',
    loading_card_pct_lider: (pct) => `${pct} del lider`,
    loading_card_ciclos: 'Ciclos',
    loading_card_t_ciclo: 't/ciclo',
    loading_card_eficiencia: 'Eficiencia',
    loading_card_operador: 'Operador',
    loading_card_origen_frente: 'Origen / frente',
    loading_card_destino_principal: 'Destino principal',
    loading_card_participacion_sin_dato: 'Participacion destino sin dato',
    loading_card_pct_destino: (pct) => `${pct} al destino`,
    loading_card_ver_detalle: 'Ver detalle',
    loading_card_aria: (id) => `Ver detalle hora a hora de ${id}`,

    sc_leader_dia: 'Lidera Dia',
    sc_leader_noche: 'Lidera Noche',
    sc_leader_empate: 'Empate',
    sc_focus_dia: 'Turno Dia',
    sc_focus_noche: 'Turno Noche',
    sc_focus_ambos: 'Dia vs Noche',
    sc_tone_fuel: 'Combustible',
    sc_tone_failure: 'Averia',
    sc_tone_maintenance: 'Mantencion',
    sc_tone_delay: 'Demora',
    sc_tone_standby: 'Standby',
    sc_tone_operation: 'Operacion',
    sc_tone_other: 'Otro',
    sc_source_dato_ciclo: 'Dato ciclo',
    sc_metric_sin_dato: 'Sin dato',
    sc_rec_maintenance: (code, desc) => `${code} ${desc || 'Mantencion'}`,
    sc_rec_sin_actividad: 'Sin actividad',
    sc_rec_mejor_hora: 'Mejor hora',
    sc_rec_ciclo_caex_alto: 'Ciclo CAEX alto',
    sc_rec_reducir_espera_n06: 'Reducir espera N06',
    sc_rec_ruta_alta: 'Ruta N04/N03 alta',
    sc_rec_revisar_transporte: 'Revisar transporte N04',
    sc_rec_revisar_retorno: 'Revisar retorno N03',
    sc_rec_mantener_ciclo: 'Mantener ciclo',
    sc_rec_revisar_espera_n14: 'Revisar espera N14',
    sc_rec_revisar_carguio_n13: 'Revisar carguio N13',
    sc_rec_mejorar_continuidad: 'Mejorar continuidad',
    sc_rec_mantener_ritmo: 'Mantener ritmo',
    sc_sin_fecha: 'Sin fecha',
    sc_sin_periodo: 'Sin periodo',
    sc_vision_comparativa_kicker: 'Vision comparativa',
    sc_foco_turno_aria: 'Foco de turno',
    sc_contexto_operacional_aria: 'Contexto operacional comparativo',
    sc_vision_comparativa_aria: 'Vision comparativa Dia vs Noche',
    sc_leyenda_hora_hora_aria: 'Leyenda grafico hora a hora',
    sc_barras_comparativas_aria: 'Barras comparativas Dia Noche por hora de turno',
    sc_comparativa_aria: 'Comparativa Dia Noche',
    sc_loading_title: 'Cargando Dia vs Noche',
    sc_loading_body: 'Cargando /api/shift-comparison...',
    sc_error_title: 'Dia vs Noche no disponible',
    sc_fecha_comparativa: 'Fecha comparativa',
    sc_retry_aria: 'Reintentar comparativa',
    sc_error_body: 'Sin respuesta de /api/shift-comparison.',
    sc_title: 'Turno Dia vs Turno Noche',
    sc_dia: 'Dia',
    sc_noche: 'Noche',
    sc_ambos: 'Ambos',
    sc_refresh_aria: 'Actualizar comparativa',
    sc_fecha_operacional: (date) => `Fecha operacional: ${date}`,
    sc_turno_actual: (turno) => `Turno actual: ${turno}`,
    sc_periodo_actual: (start, end) => `Periodo actual: ${start} - ${end}`,
    sc_turno_dia_label: 'Turno Dia',
    sc_turno_noche_label: 'Turno Noche',
    sc_diferencia_label: 'Diferencia',
    sc_ciclos_uc: (ciclos, uc) => `${ciclos} ciclos / ${uc} UC`,
    sc_hora_a_hora: 'Hora a hora',
    sc_leyenda_dia: 'Turno Dia / cyan',
    sc_leyenda_noche: 'Turno Noche / purpura',
    sc_leyenda_ambos: 'Dia cyan / Noche purpura',
    sc_linea_total_hora: 'Linea total hora',
    sc_proyectado: 'PROYECTADO',
    sc_suma_tonelaje: 'Suma tonelaje',
    sc_turno_dia_em: 'Turno Dia',
    sc_turno_noche_em: 'Turno Noche',
    sc_dia_noche_em: (dia, noche) => `Dia ${dia} / Noche ${noche}`,
    sc_pendiente: 'Pendiente',
    sc_tonelajes_visibles_aria: 'Tonelajes visibles por hora',
    sc_dia_en_curso: 'Dia en curso',
    sc_noche_en_curso: 'Noche en curso',
    sc_dia_misma_ventana: 'Dia misma ventana',
    sc_noche_misma_ventana: 'Noche misma ventana',
    sc_comparacion_justa: 'Comparacion justa',
    sc_ventana: (slots) => `H+1-H+${slots}`,
    sc_diferencia_misma_ventana: 'Diferencia misma ventana',
    sc_evita_comparar: 'Evita comparar 12 h contra turno parcial.',
    sc_proyeccion_vs_completo: 'Proyeccion vs turno completo',
    sc_vs_referencia: (delta) => `${delta} frente a referencia.`,
    sc_ritmo_horario: 'Ritmo horario',
    sc_referencia_rate: (rate) => `Referencia ${rate} t/h.`,
    sc_origen_operacional: 'Origen operacional',
    sc_distribucion_operacional: (label) => `Distribucion operacional ${label}`,
    sc_lectura_justa_aria: 'Lectura justa del turno en curso',
    sc_diferencia_por_hora: 'Diferencia por hora',
    sc_produccion_por_hora: 'Produccion por hora',
    sc_mayor_brecha: 'Mayor brecha',
    sc_unidades_carguio: 'Unidades de carguio',
    sc_caex: 'CAEX',
    sc_total_visible: 'Total visible',
    sc_top2: 'Top 2',
    sc_top_equipo: 'Top equipo',
    sc_filtro: 'Filtro',
    sc_concentracion_uc: 'Concentracion UC',
    sc_top2_pct: (pct) => `Top 2: ${pct}%`,
    sc_bajo_aporte: (id, tons) => `Bajo aporte relativo: ${id} (${tons}).`,
    sc_sin_uc_bajo: 'Distribucion sin UC bajo 8% del tonelaje visible.',
    sc_lectura_caex: 'Lectura CAEX',
    sc_equipos_dataset: (n) => `${n} equipos del dataset`,
    sc_incluye_caex: 'Incluye CAEX con 0 t/ciclos en el turno para identificar equipos sin aporte visible.',
    sc_sin_equipos_para: (label) => `Sin equipos para ${label} en la fecha seleccionada.`,
    sc_rendimiento_operadores: 'Rendimiento operadores',
    sc_turno_dia_vs_noche: 'Turno Dia vs Turno Noche',
    sc_dia_short: 'Dia',
    sc_noche_short: 'Noche',
    sc_tonelaje: 'Tonelaje',
    sc_rendimiento: 'Rendimiento',
    sc_ciclos_t_ciclo: 'Ciclos / t ciclo',
    sc_horas_actividad: (n) => `${n} h con actividad`,
    sc_diferencia_rendimiento: 'Diferencia rendimiento',
    sc_noche_supera: 'Noche supera a Dia',
    sc_dia_supera: 'Dia supera a Noche',
    sc_filtro_ambos_note: (winner) => `${winner} en el filtro \`Ambos\`.`,
    sc_dato_ciclo: 'Dato ciclo',
    sc_unidad_carguio: 'Unidad de carguio',
    sc_equipo_caex: 'Equipo CAEX',
    sc_acarreo: 'Acarreo',
    sc_produccion: 'Produccion',
    sc_eficiencia: 'Eficiencia',
    sc_pct_lider: (pct) => `${pct}% del lider`,
    sc_caex_asignados: (n) => `${n} CAEX asignados`,
    sc_uc_atendidas: (n) => `${n} UC atendidas`,
    sc_prom_circuito: (v) => `${v} prom. circuito`,
    sc_ciclos_n: (n) => `${n} ciclos`,
    sc_operador: 'Operador',
    sc_estado_wenco: 'Estado WENCO',
    sc_sin_categoria: 'Sin categoria',
    sc_banco_malla: 'Banco / Malla',
    sc_origen_uc: 'Origen / UC',
    sc_destino: 'Destino',
    sc_ver_detalle: 'Ver detalle',
    sc_dia_tons: (tons) => `Dia ${tons}`,
    sc_noche_tons: (tons) => `Noche ${tons}`,
    sc_detalle_comparativo_aria: (id) => `Ver detalle comparativo de ${id}`,
    sc_close_aria: 'Cerrar detalle',
    sc_detalle_uc: 'Detalle unidad de carguio',
    sc_detalle_caex: 'Detalle CAEX',
    sc_dist_od: 'Dist. O->D',
    sc_transp_n04: 'Transp. N04',
    sc_retorno_n03: 'Retorno N03',
    sc_espera_n06: 'Espera N06',
    sc_ciclo_caex: 'Ciclo CAEX',
    sc_mejor_hora_kv: (label, tons) => `${label} / ${tons}`,
    sc_mejor_hora_label: 'Mejor hora',
    sc_dia_kv: 'Dia',
    sc_noche_kv: 'Noche',
    sc_dia_hora: (hour) => `Dia ${hour}`,
    sc_noche_hora: (hour) => `Noche ${hour}`,
    sc_hora_futura: 'Hora futura',
    sc_dia_noche_disponible: 'Dia + noche disponible',
    sc_linea_verde_proyectada: 'Linea verde: acumulado proyectado hacia H+12',
    sc_sin_operador: 'Sin operador',
    sc_total_hora: 'Total hora',
    sc_ton_h_label: 'Ton/h',
    sc_linea_amarilla: 'Linea amarilla de tonelaje por hora',
    sc_en_curso_badge: 'En curso',
    sc_status_reasons_aria: (id) => `Estados WENCO que justifican baja de produccion en ${id}`,
    sc_status_actual_aria: (id) => `Estado WENCO actual de ${id}`,
    sc_estado_wenco_label: 'Estado WENCO',
    sc_mas_estados: (n) => `+${n} estados`,
    sc_comparacion_aria: (id) => `Comparacion ${id}`,
    sc_uc_label: (label) => ` / UC ${label}`,
    sc_equipos_focus_summary: (n, label) => `${n} equipos / ${label}`,
    sc_operador_dia_noche: (dia, noche) => `Dia: ${dia} / Noche: ${noche}`,
    sc_leyenda_grafico_aria: 'Leyenda grafico detalle equipo',
    sc_linea_tonelaje_hora: 'Linea tonelaje/hora',
    sc_ciclos_kv: 'Ciclos',
    sc_rend_carguio_kv: 'Rend. carguio',
    sc_tonelaje_hora_hora: 'Tonelaje hora a hora',
    sc_peak: (label) => `Peak ${label}`,
    sc_estados_wenco_equipo: 'Estados WENCO del equipo',
    sc_n_estados: (n) => `${n} estados`,
    sc_sin_estado: 'Sin estado',
    sc_sin_transiciones: 'WENCO no entrego transiciones de estado para este equipo en el turno seleccionado.',
    sc_no_data_detail: (id) => `/api/shift-comparison no entrego detalle horario para ${id}. No se inventan datos.`,
    sc_col_slot: 'Slot',
    sc_col_origen_destino: 'Origen / Destino',
    sc_col_tonelaje: 'Tonelaje',
    sc_col_dist_od: 'Dist. O->D',
    sc_col_transp_retorno: 'Transporte / Retorno',
    sc_col_carguio_ciclo: 'Carguio / Ciclo',
    sc_col_ciclo_caex: 'Ciclo CAEX',
    sc_col_espera_caex: 'Espera CAEX',
    sc_col_recomendacion: 'Recomendacion',
    sc_sin_detalle_horario: 'Sin detalle horario disponible.',
    sc_ciclo_kv: 'Ciclo',
    sc_retorno_kv: (v) => `Retorno ${v}`,
    sc_ciclos_c: (tons, c) => `${tons} / ${c} c`,
    sc_dia_n13: (v) => `Dia N13 ${v}`,
    sc_noche_n13: (v) => `Noche N13 ${v}`,
    sc_dia_ciclo: (v) => `Dia ciclo ${v}`,
    sc_noche_ciclo: (v) => `Noche ciclo ${v}`,
    sc_dia_n14: (v) => `Dia N14 ${v}`,
    sc_noche_n14: (v) => `Noche N14 ${v}`,
    sc_dia_n04_n03: (n04, n03) => `Dia N04 ${n04} / N03 ${n03}`,
    sc_noche_n04_n03: (n04, n03) => `Noche N04 ${n04} / N03 ${n03}`,
  },
  en: {
    common_sin_dato: 'No data',
    common_lectura_ejecutiva: 'Executive reading',
    common_confianza: (value) => `Confidence ${value}`,
    common_top: (n) => `Top ${n}`,
    common_operador: (op) => `Operator ${op}`,

    availability_real: 'Real data',
    availability_partial: 'Partial data',
    availability_missing: 'No data',
    confidence_baja: 'LOW',
    confidence_media: 'MEDIUM',
    confidence_alta: 'HIGH',
    section_turno: 'Current shift',
    section_mensual: 'Monthly target',
    section_comparativa: 'Day vs Night',
    section_equipos: 'Equipment',
    section_produccion: 'Production',
    section_decisiones: 'Decisions',
    section_flota: 'Fleet',
    section_nav_aria: 'Cockpit sections',
    filters_aria: 'Cockpit filters',
    filters_fecha: 'Date',
    filters_turno: 'Shift',
    filters_turno_resuelto_aria: (label) => `Resolved shift: ${label}`,
    filters_turno_actual: 'Current',
    filters_turno_dia: 'Day',
    filters_turno_noche: 'Night',
    opening_read_aria: 'Cockpit opening read',
    opening_read_kicker: 'Executive reading',
    opening_read_title: 'Status, gap, required pace and action',
    opening_read_desc: 'First shows whether the shift and month are in the green; then drills into equipment, causes and decision.',
    opening_1_label: 'Shift at this hour',
    opening_1_actual: (tons) => `Actual ${tons}`,
    opening_1_esperado_sin_dato: 'expected without data',
    opening_1_esperado: (tons) => `Expected ${tons}`,
    opening_1_avance_sin_dato: 'Hourly progress without data',
    opening_1_avance: (pct) => `${pct}% of shift elapsed`,
    opening_2_label: 'Projected shift end',
    opening_2_pct_proyectado: (pct) => `${pct}% projected`,
    opening_2_meta_no_configurada: 'Shift target not configured',
    opening_2_brecha: (delta) => `Close gap ${delta}`,
    opening_3_label: 'Required remaining',
    opening_3_sin_meta: 'No target',
    opening_3_valor: (tph) => `${tph} t/h`,
    opening_3_sin_calculo: 'Not calculated without target/progress',
    opening_3_detalle: (tons) => `${tons} for shift target`,
    opening_3_tiempo_sin_dato: 'Remaining time without data',
    opening_3_tiempo_restante: (min) => `${min} min remaining`,
    opening_4_label: 'To close green F01',
    opening_4_sin_plan: 'No plan',
    opening_4_valor: (v) => `${v} t/day`,
    opening_4_sin_dato: 'Monthly compliance without data',
    opening_4_detalle: (pct) => `${pct}% accumulated F01`,
    opening_5_actual_turno: (turno) => `Current ${turno}`,
    opening_5_filtro_actual: 'Current filter',
    opening_6_label: 'Equipment to review',
    opening_6_sin_foco: 'No focus',
    opening_6_detalle: (pct, tons) => `${pct} efficiency / ${tons}`,
    opening_6_sin_tarjetas: 'No UC cards available',
    opening_6_validar: 'Validate WENCO states and assignment',
    opening_7_label: 'Recommended action',
    opening_7_impacto: (tons, money) => `Impact ${tons} / ${money}`,
    fair_comparison_label: 'Fair comparison',
    fair_comparison_sin_dato: 'No data',
    fair_comparison_sin_respuesta: 'No response from /api/shift-comparison.',
    fair_comparison_ventana: (slots) => `Window H+1-H+${slots}`,
    fair_comparison_actual_sin_ref: (current) => `${current} current shift / reference without data`,
    fair_comparison_detalle: (current, reference, pct) => `${current} current vs ${reference} ref. (${pct}%)`,
    required_green_meta_no_cargada: 'Monthly target not loaded.',
    required_green_meta_no_configurada: 'Monthly F01 target not configured.',
    required_green_dias_sin_promedio: (days) => `${days} days remaining / actual average without data`,
    required_green_prom_actual: (avg, days) => `Current avg. ${avg} / ${days} days remaining`,
    loading_cockpit: 'Loading operational cockpit...',
    error_title: 'Cockpit without operational data',
    error_detail: (msg) => `Could not load /api/cockpit: ${msg}`,
    error_detail_generic: 'Could not load /api/cockpit.',
    error_demo_suffix: ' Demo is not used without explicit backend mode.',
    projection_sin_meta: 'No target',
    projection_sobre_meta: 'Above target',
    projection_bajo_meta: 'Below target',
    shift_target_label: (tons) => `${tons}/shift`,
    shift_target_sin_meta: 'No shift target',
    daily_target_label: (tons) => `${tons}/day`,
    daily_target_sin_meta: 'No daily target',
    partial_item_ciclos: 'cycles',
    partial_item_caex_activos: 'active CAEX',
    partial_item_promedio_ciclo: 'average cycle',
    partial_item_caex_promedio_circuito: 'average CAEX in circuit',
    partial_banner: (items) => `Partial data: ${items} do not come from /api/cockpit v1. Values are not invented.`,
    kpi_grid_aria: 'Shift indicators',
    kpi_produccion_actual_label: 'Current production',
    kpi_produccion_actual_subtext_sin_meta: 'Progress without configured target',
    kpi_produccion_actual_subtext: (pct) => `${pct}% real progress`,
    sector_split_aria: 'F01 versus F02 split',
    sector_split_pct: (pct) => `${pct}% of shift`,
    sector_split_proyectado: (tons) => `Proj. ${tons}`,
    kpi_tonelaje_proyectado: 'Projected tonnage',
    kpi_meta_no_configurada: 'Target not configured',
    kpi_proyeccion_detalle: (status, delta, pct) => `${status} ${delta} (${pct}%)`,
    kpi_proyeccion_confianza: (label, hours) => `Confidence ${label} / ${hours || 0}/12 h real`,
    kpi_proyeccion_rango: (low, high) => `Range ${low} - ${high}`,
    kpi_meta_turno_label: 'Shift target',
    kpi_meta_turno_sin_meta: 'No target',
    kpi_meta_turno_subtext_no_config: 'Target not configured',
    kpi_meta_turno_subtext: (label) => `Daily target ${label}`,
    kpi_ciclos_label: 'Cycles',
    kpi_dato_no_disponible: 'Data not available',
    kpi_no_informado_api: 'Not reported by API',
    kpi_ciclos_subtext: 'Shift cycles',
    kpi_caex_activos_label: 'Active CAEX',
    kpi_caex_activos_subtext: 'Active equipment',
    kpi_promedio_ciclo_label: 'Average cycle',
    kpi_promedio_ciclo_subtext: (money) => `Shift cost ${money}`,
    kpi_promedio_caex_circuito_label: 'Average CAEX in circuit',
    kpi_promedio_caex_circuito_subtext: 'Average CAEX in circuit',
    kpi_caex_disp_indicator: (pct) => `${pct}% avail.`,
    estado_caex_title: 'CAEX status',
    estado_caex_empty: 'No CAEX detail reported by /api/cockpit.',
    estado_palas_title: 'Loader status',
    estado_palas_empty: 'No loaders reported by /api/cockpit.',
    decision_intelligence_kicker: 'Decision intelligence',
    decision_intelligence_title: 'What to do now',
    decision_intelligence_tag: (conf) => `Confidence ${conf}`,
    decision_action_label: 'Priority action',
    decision_action_note: 'Validate on-site and monitor the effect over the next 30 minutes.',
    decision_impact_tonelaje: 'Tonnage',
    decision_impact_valor: 'Value',
    decision_impact_cola: (min) => `${min} min`,
    decision_scenarios_label: 'Quick scenarios',
    decision_scenarios_top3: 'Top 3',
    intelligence_brief_aria: 'Hidden losses and operational signals',
    intelligence_brief_kicker: 'Causes and evidence',
    intelligence_brief_title: 'Why operational value is being lost',
    intelligence_brief_desc: 'Ranks recoverable value, main cause, evidence and equipment involved.',
    fleet_section_aria: 'Equipment summary',
    fleet_kicker: 'Loading units',
    fleet_title: 'Equipment that explains shift production',
    fleet_desc: 'Click a card to review hourly tonnage, WENCO states and operational detail.',
    fleet_empty: 'No equipment summary in /api/cockpit.',

    shift_summary_kicker: 'Current shift',
    shift_summary_registro: 'Record',
    shift_summary_produccion: 'Production',
    shift_summary_meta: 'Target',
    shift_summary_sin_meta: 'No target',
    shift_summary_riesgo: 'Risk',
    shift_summary_progress_aria: (pct) => `Target progress ${pct}%`,

    kpi_card_sparkline_aria: 'KPI trend',
    kpi_card_progress_aria: (pct) => `Progress ${pct}%`,

    equip_status_kicker: 'Equipment status',
    equip_status_ver_todos: 'View all',
    equip_status_operativos: 'Operational',
    equip_status_sin_actividad: 'No activity',
    equip_status_posible_averia: 'Possible breakdown',
    equip_status_ciclos_sd: 'Cycles n/d',
    equip_status_ciclos: (n) => `${n} cycles`,
    equip_status_toneladas_sd: 't n/d',

    prod_table_kicker: 'Hourly detail',
    prod_table_title: 'Production by hour',
    prod_table_registros: (n) => `${n} records`,
    prod_table_col_hora: 'Hour',
    prod_table_col_total: 'Total',
    prod_table_col_ciclos: 'Cycles',
    prod_table_col_t_ciclo: 't/cycle',
    prod_table_col_acumulado: 'Accumulated',
    prod_table_empty: 'No hourly data in /api/cockpit.',

    alert_bar_empty: 'No open operational alerts.',
    alert_bar_label: 'alerts',
    alert_bar_ver_todas: 'View all',

    profit_kicker: 'Profit Optimization',
    profit_loading_title: 'Evaluating economic scenarios',
    profit_loading_body: 'Loading /api/profit-optimization...',
    profit_error_title: 'Economic optimization not available',
    profit_retry_aria: 'Retry profit optimization',
    profit_error_body: (msg) => `${msg} Silent demo is not used.`,
    profit_sin_respuesta: 'No response from /api/profit-optimization.',
    profit_no_demo_suffix: 'Silent demo is not used.',
    profit_title: 'Highest risk-adjusted economic value',
    profit_refresh_aria: 'Refresh profit optimization',
    profit_recommended_scenario: 'Recommended scenario',
    profit_confianza: (v) => `Confidence ${v}`,
    profit_factibilidad: (v) => `Feasibility ${v}`,
    profit_more_tons_not_more_value: 'More tonnes is not more value',
    profit_valor_ajustado: 'Adjusted value',
    profit_base: 'Base',
    profit_costo_tonelada: 'Cost per tonne',
    profit_menor: (name) => `Lowest: ${name}`,
    profit_margen_tonelada: 'Margin per tonne',
    profit_mayor_margen: (name) => `Highest margin: ${name}`,
    profit_riesgo: 'Risk',
    profit_col_escenario: 'Scenario',
    profit_col_toneladas: 'Tonnes',
    profit_col_costo: 'Cost',
    profit_col_usd_t: 'USD/t',
    profit_col_riesgo: 'Risk',
    profit_col_valor_ajustado: 'Adjusted value',
    profit_valor_supuesto: (v) => `Assumed value/t: USD ${v}`,
    profit_fuente_costos: (v) => `Cost source: ${v}`,
    profit_actualizado: (v) => `Updated: ${v}`,

    header_modo_demo: 'DEMO MODE',
    header_cache_real: 'REAL CACHE',
    header_datos_reales: 'REAL DATA',
    header_datos_sinteticos: 'Synthetic data',
    header_title: 'OPERATIONAL COCKPIT',
    header_subtitle: 'Real-time view of the operation',
    header_status_aria: 'Operational status',
    header_backend: (status) => `Backend ${status}`,
    header_ultimo_registro: 'Last real record',
    header_calidad: 'Quality',
    header_frescura: 'Freshness',
    header_api: 'API',
    header_refresh_aria: 'Refresh cockpit',

    dispatcher_kicker: 'AI Dispatcher Advisor',
    dispatcher_loading_title: 'Building operational recommendation',
    dispatcher_loading_body: 'Loading /api/dispatcher-advisor...',
    dispatcher_error_title: 'Operational advisor not available',
    dispatcher_retry_aria: 'Retry dispatcher advisor',
    dispatcher_error_body: (msg) => `${msg} Silent demo is not used.`,
    dispatcher_sin_respuesta: 'No response from /api/dispatcher-advisor.',
    dispatcher_title: 'Integrated operational recommendation',
    dispatcher_riesgo: (v) => `Risk ${v}`,
    dispatcher_confianza: (v) => `Confidence ${v}`,
    dispatcher_refresh_aria: 'Refresh dispatcher advisor',
    dispatcher_situacion: 'Detected situation',
    dispatcher_accion_sugerida: 'Suggested action',
    dispatcher_sin_racional: 'No operational rationale available.',
    dispatcher_sin_equipo_objetivo: 'No specific target equipment',
    dispatcher_productividad: 'Productivity',
    dispatcher_potenciales: (tons) => `${tons} potential`,
    dispatcher_cola: 'Queue',
    dispatcher_ventana: (min) => `Window ${min} min`,
    dispatcher_valor_esperado: 'Expected value',
    dispatcher_recuperable: (money) => `${money} recoverable`,
    dispatcher_col_alternativa: 'Alternative',
    dispatcher_col_valor: 'Value',
    dispatcher_col_produccion: 'Production',
    dispatcher_col_riesgo: 'Risk',
    dispatcher_sin_alternativas: 'No comparable alternatives reported by the engine.',
    dispatcher_trazabilidad: 'Traceability',
    dispatcher_calidad_dato: (score, texts) => `Data quality ${score} / 100 - ${texts} texts`,
    dispatcher_peso: (pct) => `Weight ${pct}%`,

    prod_chart_kicker: 'Production',
    prod_chart_title: 'Hour by hour',
    prod_chart_tag: 'Bars + accumulated',
    prod_chart_aria: 'Hourly production and accumulated',
    prod_chart_tooltip_hora: 'Hour',
    prod_chart_tooltip_toneladas: 'Tonnes',
    prod_chart_tooltip_acumulado: 'Accumulated',

    loading_modal_tooltip_hora: 'Hour',
    loading_modal_tooltip_toneladas: 'Tonnes',
    loading_modal_tooltip_rendimiento: 'Throughput',
    loading_modal_tooltip_distancia: 'Distance',
    loading_modal_tooltip_carguio: 'Loading N13',
    loading_modal_tooltip_espera: 'Wait N14',
    loading_modal_tooltip_ruta: 'Dominant route',
    loading_modal_origen_sin_dato: 'Origin without data',
    loading_modal_destino_sin_dato: 'Destination without data',
    loading_modal_aria: (id) => `UC detail ${id}`,
    loading_modal_close_aria: 'Close detail',
    loading_modal_kicker: 'Loading unit detail',
    loading_modal_operador: (op) => `Operator: ${op}`,
    loading_modal_toneladas_turno: 'Shift tonnage',
    loading_modal_toneladas_horario: 'Hourly tonnage',
    loading_modal_ciclos: 'Cycles',
    loading_modal_rend_carguio: 'Loading throughput',
    loading_modal_eficiencia: 'Efficiency',
    loading_modal_chart_kicker: 'Hourly tonnage',
    loading_modal_registros_horarios: (n) => `${n} hourly records`,
    loading_modal_sin_serie: 'No hourly series',
    loading_modal_peak: (hour) => `Peak ${hour}`,
    loading_modal_no_hourly_data: '/api/cockpit did not return an hourly series for this UC. The shift total is kept without inventing data.',
    loading_modal_col_hora: 'Hour',
    loading_modal_col_ruta: 'Origin -> destination',
    loading_modal_col_ton_h: 't/h',
    loading_modal_col_distancia: 'Distance',
    loading_modal_col_carguio: 'Avg. loading N13',
    loading_modal_col_espera: 'CAEX wait N14',
    loading_modal_mejor_hora: 'Best hour',
    loading_modal_sin_detalle: (id) => `No hourly detail available for ${id}.`,

    monthly_status_sobre_meta: 'Above target',
    monthly_status_bajo_meta: 'Below target',
    monthly_status_cerca: 'Close',
    monthly_status_pendiente: 'Pending',
    monthly_status_sin_estado: 'No status',
    monthly_sin_registro: 'No record',
    monthly_kicker: 'Monthly target',
    monthly_loading_title: 'Loading Month Target',
    monthly_loading_body: 'Loading /api/monthly-target...',
    monthly_error_title: 'Accumulated target not available',
    monthly_retry_aria: 'Retry monthly target',
    monthly_error_body: (msg) => `${msg} Reference is not used without marking source.`,
    monthly_sin_respuesta: 'No response from /api/monthly-target.',
    monthly_meta_acumulada_kicker: 'Accumulated target',
    monthly_meta_mes: (label) => `${label} Month Target`,
    monthly_refresh_aria: 'Refresh monthly target',
    monthly_row_programado: 'Accumulated planned',
    monthly_row_real: 'Accumulated real',
    monthly_row_diferencia: 'Difference',
    monthly_cumplimiento: 'Compliance',
    monthly_cumplimiento_aria: (pct) => `Compliance ${pct}`,
    monthly_periodo: (start, end) => `${start} to ${end}`,
    monthly_meta_f01_diaria: 'Daily F01 target:',
    monthly_f02_aparte: 'F02 apart:',
    monthly_total: 'Total:',
    monthly_fuente_calidad: (source, quality) => `Source: ${source} / Quality: ${quality}`,
    monthly_ultimo_registro: (date) => `Last record: ${date}`,
    monthly_detalle_diario: 'Daily detail of the month',
    monthly_detalle_diario_summary: (n) => `${n} days / daily F01 / F02 apart`,
    monthly_detalle_diario_aria: 'Daily detail Month Target',
    monthly_detalle_diario_note: 'F01 against official daily target - F02 billed separately - Operational total',
    monthly_col_dia: 'Day',
    monthly_col_meta_f01: 'F01 target',
    monthly_col_real_f01: 'F01 real',
    monthly_col_pct_f01: '% F01',
    monthly_col_f02: 'F02 apart',
    monthly_col_total: 'Total',
    monthly_col_estado: 'Status',

    hidden_loss_title: 'Hidden Loss Detector',
    hidden_loss_loading_title: 'Detecting hidden losses',
    hidden_loss_loading_body: 'Loading /api/hidden-losses...',
    hidden_loss_error_title: 'Hidden losses not available',
    hidden_loss_retry_aria: 'Retry hidden losses',
    hidden_loss_error_body: (msg) => `${msg} Silent demo is not used.`,
    hidden_loss_sin_respuesta: 'No response from /api/hidden-losses.',
    hidden_loss_kicker: 'Hidden losses',
    hidden_loss_subtitle: 'Economic impact, cause and equipment affected',
    hidden_loss_confianza: (v) => `Confidence ${v}`,
    hidden_loss_refresh_aria: 'Refresh hidden losses',
    hidden_loss_valor_recuperable: 'Recoverable value',
    hidden_loss_perdida_estimada: (money) => `${money} estimated loss`,
    hidden_loss_causa_principal: 'Main cause',
    hidden_loss_category_severity: (category, severity) => `${category} / ${severity}`,
    hidden_loss_tiempo_capacidad: 'Time / capacity',
    hidden_loss_potenciales: (tons) => `${tons} potential`,
    hidden_loss_que_lo_explica: 'What explains it',
    hidden_loss_no_capturadas: (tons) => `${tons} not captured`,
    hidden_loss_combustible: (liters) => `${liters} L fuel`,
    hidden_loss_desgaste: (money) => `${money} wear`,
    hidden_loss_fuentes: 'Loss sources',
    hidden_loss_category_confianza: (category, confidence) => `${category} - Confidence ${confidence}`,
    hidden_loss_recuperable: (money) => `${money} recoverable`,
    hidden_loss_equipos_afectados: 'Equipment affected',
    hidden_loss_col_equipo: 'Equipment',
    hidden_loss_col_perdida: 'Loss',
    hidden_loss_col_horas: 'Hours',
    hidden_loss_col_fuente: 'Source',
    hidden_loss_sin_equipos: 'No equipment with material hidden loss.',

    nlp_title: 'Operational NLP',
    nlp_loading_title: 'Analyzing operational updates',
    nlp_loading_body: 'Loading /api/operational-nlp...',
    nlp_error_title: 'Text intelligence not available',
    nlp_retry_aria: 'Retry operational NLP',
    nlp_error_body: (msg) => `${msg} Silent demo is not used.`,
    nlp_sin_respuesta: 'No response from /api/operational-nlp.',
    nlp_kicker: 'Operational updates',
    nlp_subtitle: 'Text signals that explain losses',
    nlp_refresh_aria: 'Refresh operational NLP',
    nlp_senal_principal: 'Main signal',
    nlp_menciones_confianza: (freq, conf) => `${freq} mentions - Confidence ${conf}`,
    nlp_impacto_asociado: 'Associated impact',
    nlp_horas_perdidas: (h) => `${h} h lost`,
    nlp_equipos_mencionados: 'Equipment mentioned',
    nlp_sin_equipo: 'No equipment',
    nlp_textos_analizados: (n, trend) => `${n} texts analyzed / ${trend}`,
    nlp_que_dicen: 'What the updates say',
    nlp_relacion_perdida: 'Hidden loss relation',
    nlp_conectado: (money) => `${money} connected`,
    nlp_sin_textos: 'Not enough text to detect a dominant pattern.',
    nlp_patrones_detectados: 'Patterns detected',
    nlp_sin_patrones: 'No patterns detected.',
    nlp_equipos_involucrados: 'Equipment involved',
    nlp_menciones: (n) => `${n} mentions`,
    nlp_sin_equipos_asociados: 'No associated equipment.',
    nlp_operadores_roles: 'Operators / roles',
    nlp_sin_operadores_asociados: 'No associated operators.',
    nlp_evidencia_operacional: 'Operational evidence',
    nlp_pattern_menciones: (category, freq) => `${category} - ${freq} mentions`,
    nlp_pattern_horas: (h) => `${h} h estimated`,

    shovel_tooltip_uc: 'Loading unit',
    shovel_tooltip_total: 'Total',
    shovel_kicker: 'Production by loader',
    shovel_title: 'Tonnage by loading unit',
    shovel_tag_hora_pala: 'Hour + loader',
    shovel_tag_palas: (n) => `${n} loaders`,
    shovel_total_uc: 'Total UC',
    shovel_uc_lider: 'Lead UC',
    shovel_sin_dato: 'No data',
    shovel_sin_participacion: 'No share',
    shovel_pct_carguio: (pct) => `${pct}% of loading`,
    shovel_equipos: 'Equipment',
    shovel_con_apertura: 'With hourly breakdown',
    shovel_total_turno: 'Shift total',
    shovel_legend_aria: 'Loader selector',
    shovel_chart_aria: 'Production by loader',

    audit_title: 'Operational Decision Audit',
    audit_loading_title: 'Loading decision audit',
    audit_loading_body: 'Loading /api/decision-audit...',
    audit_error_title: 'Audit not available',
    audit_retry_aria: 'Retry decision audit',
    audit_error_body: (msg) => `${msg} Silent demo is not used.`,
    audit_sin_respuesta: 'No response from /api/decision-audit.',
    audit_kicker: 'Decision audit',
    audit_refresh_aria: 'Refresh decision audit',
    audit_no_history_title: 'No audited decisions yet.',
    audit_no_history_fallback: 'No real execution history; current audit in monitoring mode.',
    audit_en_seguimiento: (action) => `Monitoring: ${action}`,
    audit_metric_recomendaciones: 'Recommendations',
    audit_metric_ejecutadas: (n) => `${n} executed`,
    audit_metric_adopcion: 'Adoption',
    audit_insuficiente: 'Insufficient',
    audit_metric_parciales: (n) => `${n} partial`,
    audit_metric_efectividad: 'Effectiveness',
    audit_metric_evaluadas: (n) => `${n} evaluated`,
    audit_metric_valor_esperado: 'Expected value',
    audit_acumulado: 'Accumulated',
    audit_metric_valor_real: 'Real value',
    audit_observado: 'Observed',
    audit_metric_recuperacion: 'Recovery',
    audit_col_decision: 'Decision',
    audit_col_estado: 'Status',
    audit_col_esperado: 'Expected',
    audit_col_real: 'Real',
    audit_col_efectividad: 'Effectiveness',
    audit_sin_evaluar: 'Not evaluated',
    audit_aprendizaje: 'Learning',
    audit_mejor_tipo_label: 'Best type:',
    audit_menor_desempeno_label: 'Lowest performance:',
    audit_decision_actual: 'Current decision',
    audit_esperado_detalle: (tons, money) => `Expected: ${tons} / ${money}`,

    loading_card_rank: (rank) => `#${rank} UC contribution`,
    loading_card_unidad_carguio: 'Loading unit',
    loading_card_critico: 'Critical',
    loading_card_revisar: 'Review',
    loading_card_operando: 'Operating',
    loading_card_tonelaje_turno: 'Shift tonnage',
    loading_card_aporte_sin_dato: 'Relative contribution without data',
    loading_card_pct_lider: (pct) => `${pct} of leader`,
    loading_card_ciclos: 'Cycles',
    loading_card_t_ciclo: 't/cycle',
    loading_card_eficiencia: 'Efficiency',
    loading_card_operador: 'Operator',
    loading_card_origen_frente: 'Origin / front',
    loading_card_destino_principal: 'Main destination',
    loading_card_participacion_sin_dato: 'Destination share without data',
    loading_card_pct_destino: (pct) => `${pct} to destination`,
    loading_card_ver_detalle: 'View detail',
    loading_card_aria: (id) => `View hourly detail for ${id}`,

    sc_leader_dia: 'Day leads',
    sc_leader_noche: 'Night leads',
    sc_leader_empate: 'Tie',
    sc_focus_dia: 'Day Shift',
    sc_focus_noche: 'Night Shift',
    sc_focus_ambos: 'Day vs Night',
    sc_tone_fuel: 'Fuel',
    sc_tone_failure: 'Breakdown',
    sc_tone_maintenance: 'Maintenance',
    sc_tone_delay: 'Delay',
    sc_tone_standby: 'Standby',
    sc_tone_operation: 'Operation',
    sc_tone_other: 'Other',
    sc_source_dato_ciclo: 'Cycle data',
    sc_metric_sin_dato: 'No data',
    sc_rec_maintenance: (code, desc) => `${code} ${desc || 'Maintenance'}`,
    sc_rec_sin_actividad: 'No activity',
    sc_rec_mejor_hora: 'Best hour',
    sc_rec_ciclo_caex_alto: 'High CAEX cycle',
    sc_rec_reducir_espera_n06: 'Reduce N06 wait',
    sc_rec_ruta_alta: 'High N04/N03 route',
    sc_rec_revisar_transporte: 'Review N04 transport',
    sc_rec_revisar_retorno: 'Review N03 return',
    sc_rec_mantener_ciclo: 'Maintain cycle',
    sc_rec_revisar_espera_n14: 'Review N14 wait',
    sc_rec_revisar_carguio_n13: 'Review N13 loading',
    sc_rec_mejorar_continuidad: 'Improve continuity',
    sc_rec_mantener_ritmo: 'Maintain pace',
    sc_sin_fecha: 'No date',
    sc_sin_periodo: 'No period',
    sc_vision_comparativa_kicker: 'Comparative vision',
    sc_foco_turno_aria: 'Shift focus',
    sc_contexto_operacional_aria: 'Comparative operational context',
    sc_vision_comparativa_aria: 'Comparative vision Day vs Night',
    sc_leyenda_hora_hora_aria: 'Hourly chart legend',
    sc_barras_comparativas_aria: 'Comparative Day Night bars per shift hour',
    sc_comparativa_aria: 'Day Night comparison',
    sc_loading_title: 'Loading Day vs Night',
    sc_loading_body: 'Loading /api/shift-comparison...',
    sc_error_title: 'Day vs Night not available',
    sc_fecha_comparativa: 'Comparison date',
    sc_retry_aria: 'Retry comparison',
    sc_error_body: 'No response from /api/shift-comparison.',
    sc_title: 'Day Shift vs Night Shift',
    sc_dia: 'Day',
    sc_noche: 'Night',
    sc_ambos: 'Both',
    sc_refresh_aria: 'Refresh comparison',
    sc_fecha_operacional: (date) => `Operational date: ${date}`,
    sc_turno_actual: (turno) => `Current shift: ${turno}`,
    sc_periodo_actual: (start, end) => `Current period: ${start} - ${end}`,
    sc_turno_dia_label: 'Day Shift',
    sc_turno_noche_label: 'Night Shift',
    sc_diferencia_label: 'Difference',
    sc_ciclos_uc: (ciclos, uc) => `${ciclos} cycles / ${uc} UC`,
    sc_hora_a_hora: 'Hour by hour',
    sc_leyenda_dia: 'Day Shift / cyan',
    sc_leyenda_noche: 'Night Shift / purple',
    sc_leyenda_ambos: 'Day cyan / Night purple',
    sc_linea_total_hora: 'Total hour line',
    sc_proyectado: 'PROJECTED',
    sc_suma_tonelaje: 'Total tonnage',
    sc_turno_dia_em: 'Day Shift',
    sc_turno_noche_em: 'Night Shift',
    sc_dia_noche_em: (dia, noche) => `Day ${dia} / Night ${noche}`,
    sc_pendiente: 'Pending',
    sc_tonelajes_visibles_aria: 'Visible hourly tonnage',
    sc_dia_en_curso: 'Day in progress',
    sc_noche_en_curso: 'Night in progress',
    sc_dia_misma_ventana: 'Day same window',
    sc_noche_misma_ventana: 'Night same window',
    sc_comparacion_justa: 'Fair comparison',
    sc_ventana: (slots) => `H+1-H+${slots}`,
    sc_diferencia_misma_ventana: 'Difference same window',
    sc_evita_comparar: 'Avoids comparing 12 h against a partial shift.',
    sc_proyeccion_vs_completo: 'Projection vs full shift',
    sc_vs_referencia: (delta) => `${delta} versus reference.`,
    sc_ritmo_horario: 'Hourly pace',
    sc_referencia_rate: (rate) => `Reference ${rate} t/h.`,
    sc_origen_operacional: 'Operational origin',
    sc_distribucion_operacional: (label) => `Operational distribution ${label}`,
    sc_lectura_justa_aria: 'Fair reading of the ongoing shift',
    sc_diferencia_por_hora: 'Difference by hour',
    sc_produccion_por_hora: 'Production by hour',
    sc_mayor_brecha: 'Largest gap',
    sc_unidades_carguio: 'Loading units',
    sc_caex: 'CAEX',
    sc_total_visible: 'Total visible',
    sc_top2: 'Top 2',
    sc_top_equipo: 'Top equipment',
    sc_filtro: 'Filter',
    sc_concentracion_uc: 'UC concentration',
    sc_top2_pct: (pct) => `Top 2: ${pct}%`,
    sc_bajo_aporte: (id, tons) => `Low relative contribution: ${id} (${tons}).`,
    sc_sin_uc_bajo: 'No UC distribution under 8% of visible tonnage.',
    sc_lectura_caex: 'CAEX reading',
    sc_equipos_dataset: (n) => `${n} equipment in dataset`,
    sc_incluye_caex: 'Includes CAEX with 0 t/cycles in the shift to identify equipment with no visible contribution.',
    sc_sin_equipos_para: (label) => `No equipment for ${label} on the selected date.`,
    sc_rendimiento_operadores: 'Operator performance',
    sc_turno_dia_vs_noche: 'Day Shift vs Night Shift',
    sc_dia_short: 'Day',
    sc_noche_short: 'Night',
    sc_tonelaje: 'Tonnage',
    sc_rendimiento: 'Throughput',
    sc_ciclos_t_ciclo: 'Cycles / t cycle',
    sc_horas_actividad: (n) => `${n} h with activity`,
    sc_diferencia_rendimiento: 'Performance difference',
    sc_noche_supera: 'Night outperforms Day',
    sc_dia_supera: 'Day outperforms Night',
    sc_filtro_ambos_note: (winner) => `${winner} in the \`Both\` filter.`,
    sc_dato_ciclo: 'Cycle data',
    sc_unidad_carguio: 'Loading unit',
    sc_equipo_caex: 'CAEX equipment',
    sc_acarreo: 'Haulage',
    sc_produccion: 'Production',
    sc_eficiencia: 'Efficiency',
    sc_pct_lider: (pct) => `${pct}% of leader`,
    sc_caex_asignados: (n) => `${n} assigned CAEX`,
    sc_uc_atendidas: (n) => `${n} UC served`,
    sc_prom_circuito: (v) => `${v} avg. circuit`,
    sc_ciclos_n: (n) => `${n} cycles`,
    sc_operador: 'Operator',
    sc_estado_wenco: 'WENCO status',
    sc_sin_categoria: 'No category',
    sc_banco_malla: 'Bench / Mesh',
    sc_origen_uc: 'Origin / UC',
    sc_destino: 'Destination',
    sc_ver_detalle: 'View detail',
    sc_dia_tons: (tons) => `Day ${tons}`,
    sc_noche_tons: (tons) => `Night ${tons}`,
    sc_detalle_comparativo_aria: (id) => `View comparison detail for ${id}`,
    sc_close_aria: 'Close detail',
    sc_detalle_uc: 'Loading unit detail',
    sc_detalle_caex: 'CAEX detail',
    sc_dist_od: 'Dist. O->D',
    sc_transp_n04: 'Transp. N04',
    sc_retorno_n03: 'Return N03',
    sc_espera_n06: 'Wait N06',
    sc_ciclo_caex: 'CAEX cycle',
    sc_mejor_hora_kv: (label, tons) => `${label} / ${tons}`,
    sc_mejor_hora_label: 'Best hour',
    sc_dia_kv: 'Day',
    sc_noche_kv: 'Night',
    sc_dia_hora: (hour) => `Day ${hour}`,
    sc_noche_hora: (hour) => `Night ${hour}`,
    sc_hora_futura: 'Future hour',
    sc_dia_noche_disponible: 'Day + night available',
    sc_linea_verde_proyectada: 'Green line: cumulative projected toward H+12',
    sc_sin_operador: 'No operator',
    sc_total_hora: 'Total hour',
    sc_ton_h_label: 't/h',
    sc_linea_amarilla: 'Yellow line for hourly tonnage',
    sc_en_curso_badge: 'In progress',
    sc_status_reasons_aria: (id) => `WENCO states that justify low production in ${id}`,
    sc_status_actual_aria: (id) => `Current WENCO status of ${id}`,
    sc_estado_wenco_label: 'WENCO status',
    sc_mas_estados: (n) => `+${n} states`,
    sc_comparacion_aria: (id) => `Comparison ${id}`,
    sc_uc_label: (label) => ` / UC ${label}`,
    sc_equipos_focus_summary: (n, label) => `${n} equipment / ${label}`,
    sc_operador_dia_noche: (dia, noche) => `Day: ${dia} / Night: ${noche}`,
    sc_leyenda_grafico_aria: 'Equipment detail chart legend',
    sc_linea_tonelaje_hora: 'Hourly tonnage line',
    sc_ciclos_kv: 'Cycles',
    sc_rend_carguio_kv: 'Loading throughput',
    sc_tonelaje_hora_hora: 'Hourly tonnage',
    sc_peak: (label) => `Peak ${label}`,
    sc_estados_wenco_equipo: 'Equipment WENCO states',
    sc_n_estados: (n) => `${n} states`,
    sc_sin_estado: 'No state',
    sc_sin_transiciones: 'WENCO did not report state transitions for this equipment in the selected shift.',
    sc_no_data_detail: (id) => `/api/shift-comparison did not return hourly detail for ${id}. Data is not invented.`,
    sc_col_slot: 'Slot',
    sc_col_origen_destino: 'Origin / Destination',
    sc_col_tonelaje: 'Tonnage',
    sc_col_dist_od: 'Dist. O->D',
    sc_col_transp_retorno: 'Transport / Return',
    sc_col_carguio_ciclo: 'Loading / Cycle',
    sc_col_ciclo_caex: 'CAEX cycle',
    sc_col_espera_caex: 'CAEX wait',
    sc_col_recomendacion: 'Recommendation',
    sc_sin_detalle_horario: 'No hourly detail available.',
    sc_ciclo_kv: 'Cycle',
    sc_retorno_kv: (v) => `Return ${v}`,
    sc_ciclos_c: (tons, c) => `${tons} / ${c} c`,
    sc_dia_n13: (v) => `Day N13 ${v}`,
    sc_noche_n13: (v) => `Night N13 ${v}`,
    sc_dia_ciclo: (v) => `Day cycle ${v}`,
    sc_noche_ciclo: (v) => `Night cycle ${v}`,
    sc_dia_n14: (v) => `Day N14 ${v}`,
    sc_noche_n14: (v) => `Night N14 ${v}`,
    sc_dia_n04_n03: (n04, n03) => `Day N04 ${n04} / N03 ${n03}`,
    sc_noche_n04_n03: (n04, n03) => `Night N04 ${n04} / N03 ${n03}`,
  },
}
