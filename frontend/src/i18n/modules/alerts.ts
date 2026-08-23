import type { ModuleDict } from '../useModuleT'

export interface AlertsT {
  filter_todas: string
  severity_labels: Record<string, string>

  domain_flota: string
  domain_carguio: string
  domain_destino: string
  domain_produccion: string
  domain_seguridad: string
  domain_mantencion: string
  domain_operacion: string

  alert_title_fallback: string
  alert_description_fallback: string
  alert_action_fallback: string

  time_now: string
  time_ago_min: (minutes: number) => string
  time_ago_hour_min: (hours: number, minutesPadded: string) => string
  no_timestamp: string

  source_real: string
  source_demo: string
  source_none: string

  diagnosis_no_alerts_title: string
  diagnosis_no_alerts_desc: string
  diagnosis_no_alerts_action: string
  diagnosis_title_critical: (critical: number, high: number) => string
  diagnosis_title_high_only: (high: number) => string
  diagnosis_desc: (equipment: string, title: string, impact: string) => string
  equipment_operational_fallback: string

  impact_pct_avg: (tons: string, pct: number) => string
  impact_no_contribution: (relative: string) => string
  impact_loading: string
  impact_destination: string
  impact_generic: string

  chart_vs_average: (deltaPct: number) => string
  chart_cycles: (n: number) => string
  chart_pct_material: (pct: number) => string

  equipment_detail_aria: (id: string) => string
  reviewed_label: string
  mark_label: string

  eyebrow_alertas: string
  title_alertas_operacionales: string
  desc_alertas: string
  meta_updated: (source: string, date: string) => string

  kicker_lectura_ejecutiva: string
  tag_alertas_abiertas: (n: number) => string
  tag_equipos_afectados: (n: number) => string
  tag_sin_aporte: (n: number) => string
  tag_focos_carguio: (n: number) => string
  tag_destino_lider: (destino: string, pct: number) => string

  priority_inmediata: string
  no_critical_action: string
  ai_analizar_prioridad: string

  label_criticas: string
  detail_criticas: string
  label_altas: string
  detail_altas: string
  label_caex_bajo: string
  detail_caex_menor_aporte: (id: string) => string
  detail_sin_foco_bajo: string
  label_equipos_afectados: string
  detail_con_alerta: string
  label_destino_lider: string
  value_nd: string
  detail_sin_distribucion: string

  kicker_orden_operacional: string
  h2_que_atender: string
  tag_acciones_priorizadas: (n: number) => string
  empty_sin_acciones: string
  sin_equipo: string

  kicker_alertas_ordenadas: string
  h2_plan_accion: string
  tag_visibles: (n: number) => string

  kicker_caex_bajo_promedio: string
  h2_equipos_revisar: string
  tag_equipos: (n: number) => string
  low_caex_meta: (modelo: string, relative: string) => string
  pct_promedio: (pct: number) => string
  empty_sin_caex_bajo: string

  kicker_patron_semanal: string
  h2_produccion_dia: string
  tag_mejor_dia: (label: string) => string

  kicker_destinos: string
  h2_concentracion_material: string
  tag_suma_pct: (pct: string) => string

  loading_alertas: string
  error_alertas: string

  // components/alerts/SmartAlertPanel.tsx
  smart_panel_kicker: string
  smart_panel_title: string
  smart_panel_syncing: string
  smart_panel_active: (n: number) => string
  severity_meta_label: Record<string, string>
  smart_panel_empty: string

  // components/ai/NorthmineAI.tsx (used only by Alerts.tsx)
  ai_analizando_btn: string
  ai_actualizar_analisis: string
  ai_default_label: string
  ai_analizando_operacion: string
  ai_error_conexion: string
  ai_placeholder: string
  ai_suffix: string
}

export const alertsT: ModuleDict<AlertsT> = {
  es: {
    filter_todas: 'TODAS',
    severity_labels: { CRITICA: 'CRITICA', ALTA: 'ALTA', MEDIA: 'MEDIA', BAJA: 'BAJA' },

    domain_flota: 'Flota CAEX',
    domain_carguio: 'Unidades de carguio',
    domain_destino: 'Destinos',
    domain_produccion: 'Produccion',
    domain_seguridad: 'Seguridad',
    domain_mantencion: 'Mantencion',
    domain_operacion: 'Operacion',

    alert_title_fallback: 'Alerta operacional',
    alert_description_fallback: 'Sin descripcion extendida.',
    alert_action_fallback: 'Confirmar responsable, condicion operacional y ventana de resolucion.',

    time_now: 'Ahora',
    time_ago_min: (minutes) => `Hace ${minutes} min`,
    time_ago_hour_min: (hours, minutesPadded) => `Hace ${hours} h ${minutesPadded} min`,
    no_timestamp: 'Sin timestamp',

    source_real: 'REAL WENCO',
    source_demo: 'DEMO',
    source_none: 'SIN FUENTE',

    diagnosis_no_alerts_title: 'Operacion sin alertas abiertas',
    diagnosis_no_alerts_desc: 'No hay eventos relevantes para priorizar con el filtro actual.',
    diagnosis_no_alerts_action: 'Mantener monitoreo y validar frescura de datos WENCO.',
    diagnosis_title_critical: (critical, high) => `${critical} foco critico y ${high} alto${high === 1 ? '' : 's'} en seguimiento`,
    diagnosis_title_high_only: (high) => `${high} foco${high === 1 ? '' : 's'} alto${high === 1 ? '' : 's'} en seguimiento`,
    diagnosis_desc: (equipment, title, impact) => `${equipment} concentra la prioridad: ${title}. Impacto observado: ${impact}.`,
    equipment_operational_fallback: 'Equipo operativo',

    impact_pct_avg: (tons, pct) => `${tons} / ${pct}% del promedio`,
    impact_no_contribution: (relative) => `Sin aporte productivo ${relative}`,
    impact_loading: 'Afecta continuidad de carguio',
    impact_destination: 'Puede concentrar cola por destino',
    impact_generic: 'Impacto operacional a validar en terreno',

    chart_vs_average: (deltaPct) => `${deltaPct >= 0 ? '+' : ''}${deltaPct}% vs promedio`,
    chart_cycles: (n) => `${n} ciclos`,
    chart_pct_material: (pct) => `${pct}% del material`,

    equipment_detail_aria: (id) => `Ver detalle operacional ${id}`,
    reviewed_label: 'Revisado',
    mark_label: 'Marcar',

    eyebrow_alertas: 'Alertas',
    title_alertas_operacionales: 'Alertas operacionales',
    desc_alertas: 'Prioridad, causa probable y accion inmediata sobre flota, carguio, destinos y productividad.',
    meta_updated: (source, date) => `${source} / Actualizado ${date}`,

    kicker_lectura_ejecutiva: 'Lectura ejecutiva',
    tag_alertas_abiertas: (n) => `${n} alertas abiertas`,
    tag_equipos_afectados: (n) => `${n} equipos afectados`,
    tag_sin_aporte: (n) => `${n} sin aporte o posible averia`,
    tag_focos_carguio: (n) => `${n} foco${n === 1 ? '' : 's'} de carguio`,
    tag_destino_lider: (destino, pct) => `Destino lider: ${destino} (${pct}%)`,

    priority_inmediata: 'Prioridad inmediata',
    no_critical_action: 'Sin accion critica activa.',
    ai_analizar_prioridad: 'Analizar prioridad con IA',

    label_criticas: 'Criticas',
    detail_criticas: 'requieren accion inmediata',
    label_altas: 'Altas',
    detail_altas: 'priorizar dentro del turno',
    label_caex_bajo: 'CAEX bajo 80%',
    detail_caex_menor_aporte: (id) => `${id} menor aporte`,
    detail_sin_foco_bajo: 'sin foco bajo promedio',
    label_equipos_afectados: 'Equipos afectados',
    detail_con_alerta: 'con alerta asociada',
    label_destino_lider: 'Destino lider',
    value_nd: 'N/D',
    detail_sin_distribucion: 'sin distribucion',

    kicker_orden_operacional: 'Orden operacional',
    h2_que_atender: 'Que atender primero',
    tag_acciones_priorizadas: (n) => `${n} acciones priorizadas`,
    empty_sin_acciones: 'Sin acciones abiertas para el filtro activo.',
    sin_equipo: 'sin equipo',

    kicker_alertas_ordenadas: 'Alertas ordenadas',
    h2_plan_accion: 'Plan de accion por dominio',
    tag_visibles: (n) => `${n} visibles`,

    kicker_caex_bajo_promedio: 'CAEX bajo promedio',
    h2_equipos_revisar: 'Equipos a revisar',
    tag_equipos: (n) => `${n} equipos`,
    low_caex_meta: (modelo, relative) => `${modelo} / ultimo ciclo ${relative}`,
    pct_promedio: (pct) => `${pct}% del promedio`,
    empty_sin_caex_bajo: 'Sin CAEX bajo el umbral del filtro activo.',

    kicker_patron_semanal: 'Patron semanal',
    h2_produccion_dia: 'Produccion por dia de semana',
    tag_mejor_dia: (label) => `Mejor ${label}`,

    kicker_destinos: 'Destinos',
    h2_concentracion_material: 'Concentracion de material',
    tag_suma_pct: (pct) => `Suma ${pct}%`,

    loading_alertas: 'Cargando alertas operacionales...',
    error_alertas: 'No pudimos cargar las alertas. Reintenta en unos segundos.',

    smart_panel_kicker: 'Smart alerts',
    smart_panel_title: 'Riesgo operacional',
    smart_panel_syncing: 'Sincronizando',
    smart_panel_active: (n) => `${n} activas`,
    severity_meta_label: { CRITICAL: 'Critica', HIGH: 'Alta', MEDIUM: 'Media', LOW: 'Baja', INFO: 'Info' },
    smart_panel_empty: 'Sin alertas criticas para el periodo consultado.',

    ai_analizando_btn: '⟳ Analizando...',
    ai_actualizar_analisis: 'Actualizar análisis',
    ai_default_label: 'Analizar',
    ai_analizando_operacion: 'Analizando operación...',
    ai_error_conexion: 'Error al conectar con el servicio de análisis.',
    ai_placeholder: 'Haz clic en "Analizar" para obtener el análisis ejecutivo de IA.',
    ai_suffix: ' · IA',
  },
  en: {
    filter_todas: 'ALL',
    severity_labels: { CRITICA: 'CRITICAL', ALTA: 'HIGH', MEDIA: 'MEDIUM', BAJA: 'LOW' },

    domain_flota: 'CAEX Fleet',
    domain_carguio: 'Loading units',
    domain_destino: 'Destinations',
    domain_produccion: 'Production',
    domain_seguridad: 'Safety',
    domain_mantencion: 'Maintenance',
    domain_operacion: 'Operation',

    alert_title_fallback: 'Operational alert',
    alert_description_fallback: 'No extended description available.',
    alert_action_fallback: 'Confirm owner, operational condition and resolution window.',

    time_now: 'Now',
    time_ago_min: (minutes) => `${minutes} min ago`,
    time_ago_hour_min: (hours, minutesPadded) => `${hours}h ${minutesPadded}min ago`,
    no_timestamp: 'No timestamp',

    source_real: 'REAL WENCO',
    source_demo: 'DEMO',
    source_none: 'NO SOURCE',

    diagnosis_no_alerts_title: 'Operation with no open alerts',
    diagnosis_no_alerts_desc: 'No relevant events to prioritize with the current filter.',
    diagnosis_no_alerts_action: 'Keep monitoring and validate WENCO data freshness.',
    diagnosis_title_critical: (critical, high) => `${critical} critical focus and ${high} high issue${high === 1 ? '' : 's'} being tracked`,
    diagnosis_title_high_only: (high) => `${high} high issue${high === 1 ? '' : 's'} being tracked`,
    diagnosis_desc: (equipment, title, impact) => `${equipment} holds top priority: ${title}. Observed impact: ${impact}.`,
    equipment_operational_fallback: 'Operational equipment',

    impact_pct_avg: (tons, pct) => `${tons} / ${pct}% of average`,
    impact_no_contribution: (relative) => `No productive contribution ${relative}`,
    impact_loading: 'Affects loading continuity',
    impact_destination: 'May concentrate queue by destination',
    impact_generic: 'Operational impact to validate on site',

    chart_vs_average: (deltaPct) => `${deltaPct >= 0 ? '+' : ''}${deltaPct}% vs average`,
    chart_cycles: (n) => `${n} cycles`,
    chart_pct_material: (pct) => `${pct}% of material`,

    equipment_detail_aria: (id) => `View operational detail ${id}`,
    reviewed_label: 'Reviewed',
    mark_label: 'Mark',

    eyebrow_alertas: 'Alerts',
    title_alertas_operacionales: 'Operational alerts',
    desc_alertas: 'Priority, likely cause and immediate action on fleet, loading, destinations and productivity.',
    meta_updated: (source, date) => `${source} / Updated ${date}`,

    kicker_lectura_ejecutiva: 'Executive read',
    tag_alertas_abiertas: (n) => `${n} open alerts`,
    tag_equipos_afectados: (n) => `${n} affected equipment`,
    tag_sin_aporte: (n) => `${n} with no contribution or possible breakdown`,
    tag_focos_carguio: (n) => `${n} loading issue${n === 1 ? '' : 's'}`,
    tag_destino_lider: (destino, pct) => `Leading destination: ${destino} (${pct}%)`,

    priority_inmediata: 'Immediate priority',
    no_critical_action: 'No active critical action.',
    ai_analizar_prioridad: 'Analyze priority with AI',

    label_criticas: 'Critical',
    detail_criticas: 'require immediate action',
    label_altas: 'High',
    detail_altas: 'prioritize within the shift',
    label_caex_bajo: 'CAEX below 80%',
    detail_caex_menor_aporte: (id) => `${id} lowest contribution`,
    detail_sin_foco_bajo: 'no below-average focus',
    label_equipos_afectados: 'Affected equipment',
    detail_con_alerta: 'with associated alert',
    label_destino_lider: 'Leading destination',
    value_nd: 'N/A',
    detail_sin_distribucion: 'no distribution',

    kicker_orden_operacional: 'Operational order',
    h2_que_atender: 'What to address first',
    tag_acciones_priorizadas: (n) => `${n} prioritized actions`,
    empty_sin_acciones: 'No open actions for the active filter.',
    sin_equipo: 'no equipment',

    kicker_alertas_ordenadas: 'Sorted alerts',
    h2_plan_accion: 'Action plan by domain',
    tag_visibles: (n) => `${n} visible`,

    kicker_caex_bajo_promedio: 'CAEX below average',
    h2_equipos_revisar: 'Equipment to review',
    tag_equipos: (n) => `${n} equipment`,
    low_caex_meta: (modelo, relative) => `${modelo} / last cycle ${relative}`,
    pct_promedio: (pct) => `${pct}% of average`,
    empty_sin_caex_bajo: 'No CAEX below the active filter threshold.',

    kicker_patron_semanal: 'Weekly pattern',
    h2_produccion_dia: 'Production by weekday',
    tag_mejor_dia: (label) => `Best ${label}`,

    kicker_destinos: 'Destinations',
    h2_concentracion_material: 'Material concentration',
    tag_suma_pct: (pct) => `Sum ${pct}%`,

    loading_alertas: 'Loading operational alerts...',
    error_alertas: 'We could not load alerts. Try again in a few seconds.',

    smart_panel_kicker: 'Smart alerts',
    smart_panel_title: 'Operational risk',
    smart_panel_syncing: 'Syncing',
    smart_panel_active: (n) => `${n} active`,
    severity_meta_label: { CRITICAL: 'Critical', HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low', INFO: 'Info' },
    smart_panel_empty: 'No critical alerts for the queried period.',

    ai_analizando_btn: '⟳ Analyzing...',
    ai_actualizar_analisis: 'Update analysis',
    ai_default_label: 'Analyze',
    ai_analizando_operacion: 'Analyzing operation...',
    ai_error_conexion: 'Error connecting to the analysis service.',
    ai_placeholder: 'Click "Analyze" to get the AI executive analysis.',
    ai_suffix: ' · AI',
  },
  de: {
    filter_todas: 'ALLE',
    severity_labels: { CRITICA: 'KRITISCH', ALTA: 'HOCH', MEDIA: 'MITTEL', BAJA: 'NIEDRIG' },

    domain_flota: 'CAEX-Flotte',
    domain_carguio: 'Beladeinheiten',
    domain_destino: 'Zielorte',
    domain_produccion: 'Produktion',
    domain_seguridad: 'Sicherheit',
    domain_mantencion: 'Wartung',
    domain_operacion: 'Betrieb',

    alert_title_fallback: 'Betriebliche Warnung',
    alert_description_fallback: 'Keine erweiterte Beschreibung.',
    alert_action_fallback: 'Verantwortlichen, Betriebszustand und Lösungszeitraum bestätigen.',

    time_now: 'Jetzt',
    time_ago_min: (minutes) => `Vor ${minutes} min`,
    time_ago_hour_min: (hours, minutesPadded) => `Vor ${hours} h ${minutesPadded} min`,
    no_timestamp: 'Ohne Zeitstempel',

    source_real: 'REAL WENCO',
    source_demo: 'DEMO',
    source_none: 'OHNE QUELLE',

    diagnosis_no_alerts_title: 'Betrieb ohne offene Warnungen',
    diagnosis_no_alerts_desc: 'Mit dem aktuellen Filter sind keine relevanten Ereignisse zu priorisieren.',
    diagnosis_no_alerts_action: 'Monitoring aufrechterhalten und Aktualität der WENCO-Daten prüfen.',
    diagnosis_title_critical: (critical, high) => `${critical} kritischer Fokus und ${high} hohe${high === 1 ? 's' : ''} in Verfolgung`,
    diagnosis_title_high_only: (high) => `${high} hohe${high === 1 ? 's' : ''} in Verfolgung`,
    diagnosis_desc: (equipment, title, impact) => `${equipment} hat höchste Priorität: ${title}. Beobachtete Auswirkung: ${impact}.`,
    equipment_operational_fallback: 'Betriebsgerät',

    impact_pct_avg: (tons, pct) => `${tons} / ${pct}% des Durchschnitts`,
    impact_no_contribution: (relative) => `Kein produktiver Beitrag ${relative}`,
    impact_loading: 'Beeinträchtigt die Kontinuität der Beladung',
    impact_destination: 'Kann Staubildung am Zielort verursachen',
    impact_generic: 'Betriebliche Auswirkung vor Ort zu prüfen',

    chart_vs_average: (deltaPct) => `${deltaPct >= 0 ? '+' : ''}${deltaPct}% vs. Durchschnitt`,
    chart_cycles: (n) => `${n} Zyklen`,
    chart_pct_material: (pct) => `${pct}% des Materials`,

    equipment_detail_aria: (id) => `Betriebliches Detail anzeigen ${id}`,
    reviewed_label: 'Überprüft',
    mark_label: 'Markieren',

    eyebrow_alertas: 'Warnungen',
    title_alertas_operacionales: 'Betriebliche Warnungen',
    desc_alertas: 'Priorität, wahrscheinliche Ursache und unmittelbare Maßnahme für Flotte, Beladung, Zielorte und Produktivität.',
    meta_updated: (source, date) => `${source} / Aktualisiert ${date}`,

    kicker_lectura_ejecutiva: 'Management-Überblick',
    tag_alertas_abiertas: (n) => `${n} offene Warnungen`,
    tag_equipos_afectados: (n) => `${n} betroffene Geräte`,
    tag_sin_aporte: (n) => `${n} ohne Beitrag oder möglicher Ausfall`,
    tag_focos_carguio: (n) => `${n} Beladungs-${n === 1 ? 'schwerpunkt' : 'schwerpunkte'}`,
    tag_destino_lider: (destino, pct) => `Führender Zielort: ${destino} (${pct}%)`,

    priority_inmediata: 'Unmittelbare Priorität',
    no_critical_action: 'Keine aktive kritische Maßnahme.',
    ai_analizar_prioridad: 'Priorität mit KI analysieren',

    label_criticas: 'Kritisch',
    detail_criticas: 'erfordern unmittelbares Handeln',
    label_altas: 'Hoch',
    detail_altas: 'innerhalb der Schicht priorisieren',
    label_caex_bajo: 'CAEX unter 80%',
    detail_caex_menor_aporte: (id) => `${id} geringster Beitrag`,
    detail_sin_foco_bajo: 'kein Fokus unter dem Durchschnitt',
    label_equipos_afectados: 'Betroffene Geräte',
    detail_con_alerta: 'mit zugehöriger Warnung',
    label_destino_lider: 'Führender Zielort',
    value_nd: 'N/V',
    detail_sin_distribucion: 'ohne Verteilung',

    kicker_orden_operacional: 'Betriebliche Reihenfolge',
    h2_que_atender: 'Was zuerst angehen',
    tag_acciones_priorizadas: (n) => `${n} priorisierte Maßnahmen`,
    empty_sin_acciones: 'Keine offenen Maßnahmen für den aktiven Filter.',
    sin_equipo: 'ohne Gerät',

    kicker_alertas_ordenadas: 'Sortierte Warnungen',
    h2_plan_accion: 'Maßnahmenplan nach Bereich',
    tag_visibles: (n) => `${n} sichtbar`,

    kicker_caex_bajo_promedio: 'CAEX unter dem Durchschnitt',
    h2_equipos_revisar: 'Zu prüfende Geräte',
    tag_equipos: (n) => `${n} Geräte`,
    low_caex_meta: (modelo, relative) => `${modelo} / letzter Zyklus ${relative}`,
    pct_promedio: (pct) => `${pct}% des Durchschnitts`,
    empty_sin_caex_bajo: 'Kein CAEX unter dem Schwellenwert des aktiven Filters.',

    kicker_patron_semanal: 'Wochenmuster',
    h2_produccion_dia: 'Produktion nach Wochentag',
    tag_mejor_dia: (label) => `Bester ${label}`,

    kicker_destinos: 'Zielorte',
    h2_concentracion_material: 'Materialkonzentration',
    tag_suma_pct: (pct) => `Summe ${pct}%`,

    loading_alertas: 'Lade betriebliche Warnungen...',
    error_alertas: 'NORTHMINE konnte nicht geladen werden.',

    smart_panel_kicker: 'Smart Alerts',
    smart_panel_title: 'Betriebliches Risiko',
    smart_panel_syncing: 'Synchronisiere',
    smart_panel_active: (n) => `${n} aktiv`,
    severity_meta_label: { CRITICAL: 'Kritisch', HIGH: 'Hoch', MEDIUM: 'Mittel', LOW: 'Niedrig', INFO: 'Info' },
    smart_panel_empty: 'Keine kritischen Warnungen für den abgefragten Zeitraum.',

    ai_analizando_btn: '⟳ Analysiere...',
    ai_actualizar_analisis: 'Analyse aktualisieren',
    ai_default_label: 'Analysieren',
    ai_analizando_operacion: 'Analysiere Betrieb...',
    ai_error_conexion: 'Fehler bei der Verbindung zum Analyse-Dienst.',
    ai_placeholder: 'Klicken Sie auf "Analysieren", um die KI-gestützte Management-Analyse zu erhalten.',
    ai_suffix: ' · KI',
  },
}
