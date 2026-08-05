import type { ModuleDict } from '../useModuleT'

export interface AveriasT {
  eyebrow: string
  titulo: string
  descripcion: string

  kpi_activas_titulo: string
  kpi_activas_subtitulo: string
  kpi_activas_trend: (n: number) => string

  kpi_mant_titulo: string
  kpi_mant_subtitulo: string
  kpi_mant_trend: string

  kpi_equipos_fs_titulo: string
  kpi_equipos_fs_subtitulo: string
  kpi_equipos_fs_trend_con: (n: number) => string
  kpi_equipos_fs_trend_sin: string

  kpi_horas_detenidas_titulo: string
  kpi_horas_detenidas_subtitulo: (dias: number) => string
  kpi_horas_detenidas_trend: (n: number) => string

  panel_wenco_kicker: string
  panel_wenco_titulo: string
  panel_wenco_tag: (n: number) => string
  empty_sin_averias: string

  panel_externo_kicker: string
  panel_externo_titulo: string
  mail_casilla: (user: string) => string
  mail_outlook: string
  auto_sync: (min: number) => string
  auto_sync_ultima: (time: string) => string

  btn_sincronizando: string
  btn_sincronizar: string
  btn_importando: string
  btn_cargar_xls: string

  import_msg_ok: (filename: string, imported: number, duplicated: number, notes: string) => string
  import_msg_err: (msg: string) => string
  import_msg_err_generic: string
  mail_sync_no_config: string
  mail_sync_err_generic: string
  mail_sync_ok: (mailFiles: number, folderFiles: number) => string
  mail_sync_err: (msg: string) => string
  mail_sync_err_generic2: string

  empty_cargando_desglose: string
  empty_sin_reportes: string

  kpi_equipos_afectados_titulo: string
  kpi_equipos_afectados_subtitulo: (dias: number) => string
  kpi_equipos_afectados_trend: (n: number) => string

  kpi_tiempo_detenido_titulo: string
  kpi_tiempo_detenido_subtitulo: string
  kpi_tiempo_detenido_trend: string

  kpi_eventos_titulo: string
  kpi_eventos_subtitulo: string
  kpi_eventos_trend: (n: number) => string

  kpi_costo_titulo: string
  kpi_costo_subtitulo: (dias: number) => string
  kpi_costo_trend: (correctiva: string, programada: string) => string
  costo_nota_prefix: (rate: string, fuente: string) => string

  kpi_disp_fisica_titulo: string
  kpi_disp_fisica_subtitulo: (equipos: number, dias: number) => string
  kpi_disp_fisica_trend_peor: (id: string, pct: number) => string

  kpi_mttr_titulo: string
  kpi_mttr_subtitulo: string
  kpi_mttr_trend: (n: number) => string

  kpi_mtbf_titulo: string
  kpi_mtbf_subtitulo: string
  kpi_mtbf_trend: (h: number) => string

  kpi_mant_prog_titulo: string
  kpi_mant_prog_subtitulo: string
  kpi_mant_prog_trend: (pct: number) => string

  filtro_todos: string
  tipo_averia_propia: string
  tipo_mant_programada: string
  tipo_mant_diario: string
  tipo_dano_operacional: string
  tipo_averia_otro: string
  tipo_otro: string

  select_todos_modelos: string
  select_todos_sistemas: string
  placeholder_buscar: string
  tag_eventos_filtrados: (n: number) => string
  btn_limpiar: string

  chart_donde_duele_kicker: string
  chart_horas_sistema_titulo: string
  chart_por_flota_kicker: string
  chart_horas_modelo_titulo: string
  chart_historico_kicker: string
  chart_horas_mes_titulo: string
  chart_composicion_kicker: string
  chart_distribucion_titulo: string

  insights_kicker: string
  insights_titulo: string
  insights_tag: (n: number, dias: number) => string
  insight_cada_dias: (gap: number) => string
  insight_ultima: (fecha: string) => string
  insight_ultimo_evento: (desc: string) => string
  insight_causa_probable: string
  insight_solucion_sugerida: string
  insight_confianza: (c: string) => string
  insight_sin_recurrentes: string

  tabla_flota_kicker: string
  tabla_flota_titulo: string
  tabla_flota_tag: (n: number) => string
  col_equipo: string
  col_modelo: string
  col_estado: string
  col_tipo_dominante: string
  col_eventos: string
  col_horas_detenidas: string
  col_costo: string
  col_disp_fisica: string
  col_sistema_principal: string
  col_ultimo_evento: string
  tabla_sin_eventos: string

  sin_tipo: string
  sin_modelo: string
  sin_sistema: string
  equipo_fallback: string
  sin_timestamp: string
  cargando: string
  error_cargar: string
}

export const averiasT: ModuleDict<AveriasT> = {
  es: {
    eyebrow: 'Averias',
    titulo: 'Averias y mantencion de flota',
    descripcion: 'Averias, mantenciones programadas y desglose del reporte diario de mantencion.',

    kpi_activas_titulo: 'Averias activas',
    kpi_activas_subtitulo: 'Eventos abiertos WENCO',
    kpi_activas_trend: (n) => `${n} en mantencion`,

    kpi_mant_titulo: 'Averias / mantenciones',
    kpi_mant_subtitulo: 'Eventos WENCO recientes',
    kpi_mant_trend: 'turno vigente',

    kpi_equipos_fs_titulo: 'Equipos F/S',
    kpi_equipos_fs_subtitulo: 'Fuera de servicio (reporte)',
    kpi_equipos_fs_trend_con: (n) => `${n} con eventos`,
    kpi_equipos_fs_trend_sin: 'sin reporte',

    kpi_horas_detenidas_titulo: 'Horas detenidas',
    kpi_horas_detenidas_subtitulo: (dias) => `Flota / ultimos ${dias} dias`,
    kpi_horas_detenidas_trend: (n) => `${n} eventos`,

    panel_wenco_kicker: 'WENCO en vivo',
    panel_wenco_titulo: 'Averias y mantenciones recientes',
    panel_wenco_tag: (n) => `${n} eventos`,
    empty_sin_averias: 'Sin averias ni mantenciones registradas en WENCO recientemente',

    panel_externo_kicker: 'Reporte externo',
    panel_externo_titulo: 'Desglose de averias de la flota (XLS del correo)',
    mail_casilla: (user) => `Casilla: ${user}`,
    mail_outlook: 'Outlook via tarea programada',
    auto_sync: (min) => `Auto cada ${min} min`,
    auto_sync_ultima: (time) => ` / ultima ${time}`,

    btn_sincronizando: 'Sincronizando...',
    btn_sincronizar: 'Sincronizar correo',
    btn_importando: 'Importando...',
    btn_cargar_xls: 'Cargar XLS',

    import_msg_ok: (filename, imported, duplicated, notes) =>
      `${filename}: ${imported} eventos nuevos (${duplicated} ya existian). ${notes}`,
    import_msg_err: (msg) => `Error al importar: ${msg}`,
    import_msg_err_generic: 'Error al importar el archivo.',
    mail_sync_no_config: 'Casilla y carpeta vigilada sin configurar. Define NORTHMINE_MAIL_USER / NORTHMINE_MAIL_PASSWORD o NORTHMINE_AVERIAS_WATCH_DIR en el backend.',
    mail_sync_err_generic: 'Error al sincronizar el correo.',
    mail_sync_ok: (mailFiles, folderFiles) => `Sincronizacion lista: ${mailFiles} adjuntos desde correo, ${folderFiles} archivos desde carpeta.`,
    mail_sync_err: (msg) => `Error al sincronizar: ${msg}`,
    mail_sync_err_generic2: 'Error al sincronizar.',

    empty_cargando_desglose: 'Cargando desglose importado...',
    empty_sin_reportes: 'Aun no hay reportes XLS importados. Carga uno con el boton o configura la casilla / carpeta vigilada.',

    kpi_equipos_afectados_titulo: 'Equipos afectados',
    kpi_equipos_afectados_subtitulo: (dias) => `Ultimos ${dias} dias`,
    kpi_equipos_afectados_trend: (n) => `${n} eventos`,

    kpi_tiempo_detenido_titulo: 'Tiempo detenido',
    kpi_tiempo_detenido_subtitulo: 'Flota completa',
    kpi_tiempo_detenido_trend: 'XLS importado',

    kpi_eventos_titulo: 'Eventos',
    kpi_eventos_subtitulo: 'Registros del reporte',
    kpi_eventos_trend: (n) => `${n} historicos`,

    kpi_costo_titulo: 'Costo de indisponibilidad',
    kpi_costo_subtitulo: (dias) => `Ultimos ${dias} dias, flota completa`,
    kpi_costo_trend: (correctiva, programada) => `${correctiva} correctiva / ${programada} programada`,
    costo_nota_prefix: (rate, fuente) => `Estimado a USD ${rate}/min de indisponibilidad (${fuente}).`,

    kpi_disp_fisica_titulo: 'Disponibilidad fisica',
    kpi_disp_fisica_subtitulo: (equipos, dias) => `${equipos} equipos / ${dias} dias con reporte`,
    kpi_disp_fisica_trend_peor: (id, pct) => `Peor: ${id} (${pct}%)`,

    kpi_mttr_titulo: 'MTTR',
    kpi_mttr_subtitulo: 'Tiempo medio de reparacion',
    kpi_mttr_trend: (n) => `${n} averias correctivas`,

    kpi_mtbf_titulo: 'MTBF',
    kpi_mtbf_subtitulo: 'Tiempo medio entre fallas',
    kpi_mtbf_trend: (h) => `${h} h en averias`,

    kpi_mant_prog_titulo: 'Mantencion programada',
    kpi_mant_prog_subtitulo: 'De la detencion total',
    kpi_mant_prog_trend: (pct) => `${pct}% correctiva`,

    filtro_todos: 'Todos',
    tipo_averia_propia: 'Averia propia',
    tipo_mant_programada: 'Mantencion programada',
    tipo_mant_diario: 'Mantenimiento diario',
    tipo_dano_operacional: 'Dano / falla operacional',
    tipo_averia_otro: 'Averia otro',
    tipo_otro: 'Otro',

    select_todos_modelos: 'Todos los modelos',
    select_todos_sistemas: 'Todos los sistemas',
    placeholder_buscar: 'Buscar equipo, sistema o falla...',
    tag_eventos_filtrados: (n) => `${n} eventos filtrados`,
    btn_limpiar: 'Limpiar',

    chart_donde_duele_kicker: 'Donde duele',
    chart_horas_sistema_titulo: 'Horas por sistema',
    chart_por_flota_kicker: 'Por flota',
    chart_horas_modelo_titulo: 'Horas por modelo',
    chart_historico_kicker: 'Historico',
    chart_horas_mes_titulo: 'Horas detenidas por mes',
    chart_composicion_kicker: 'Composicion',
    chart_distribucion_titulo: 'Distribucion por tipo de evento',

    insights_kicker: 'Analisis inteligente',
    insights_titulo: 'Patrones de averias: recurrencias, tendencias y equipos en riesgo',
    insights_tag: (n, dias) => `${n} averias analizadas / ${dias} dias`,
    insight_cada_dias: (gap) => `cada ~${gap} dias / `,
    insight_ultima: (fecha) => `ultima ${fecha}`,
    insight_ultimo_evento: (desc) => `Ultimo evento: ${desc}`,
    insight_causa_probable: 'Causa probable:',
    insight_solucion_sugerida: 'Solucion sugerida:',
    insight_confianza: (c) => `confianza ${c}`,
    insight_sin_recurrentes: 'Sin fallas recurrentes detectadas en la ventana analizada.',

    tabla_flota_kicker: 'Flota',
    tabla_flota_titulo: 'Tabla global de equipos',
    tabla_flota_tag: (n) => `${n} equipos / clic para desplegar detalle`,
    col_equipo: 'Equipo',
    col_modelo: 'Modelo',
    col_estado: 'Estado',
    col_tipo_dominante: 'Tipo dominante',
    col_eventos: 'Eventos',
    col_horas_detenidas: 'Horas detenidas',
    col_costo: 'Costo',
    col_disp_fisica: 'Disp. fisica',
    col_sistema_principal: 'Sistema principal',
    col_ultimo_evento: 'Ultimo evento',
    tabla_sin_eventos: 'Sin eventos con los filtros actuales.',

    sin_tipo: 'Sin tipo',
    sin_modelo: 'Sin modelo',
    sin_sistema: 'Sin sistema',
    equipo_fallback: 'Equipo',
    sin_timestamp: 'sin timestamp',
    cargando: 'Cargando averias y mantenciones...',
    error_cargar: 'No se pudo cargar el modulo de averias.',
  },
  en: {
    eyebrow: 'Breakdowns',
    titulo: 'Fleet breakdowns and maintenance',
    descripcion: 'Breakdowns, scheduled maintenance and daily maintenance report breakdown.',

    kpi_activas_titulo: 'Active breakdowns',
    kpi_activas_subtitulo: 'Open WENCO events',
    kpi_activas_trend: (n) => `${n} under maintenance`,

    kpi_mant_titulo: 'Breakdowns / maintenance',
    kpi_mant_subtitulo: 'Recent WENCO events',
    kpi_mant_trend: 'current shift',

    kpi_equipos_fs_titulo: 'Out-of-service units',
    kpi_equipos_fs_subtitulo: 'Out of service (report)',
    kpi_equipos_fs_trend_con: (n) => `${n} with events`,
    kpi_equipos_fs_trend_sin: 'no report',

    kpi_horas_detenidas_titulo: 'Downtime hours',
    kpi_horas_detenidas_subtitulo: (dias) => `Fleet / last ${dias} days`,
    kpi_horas_detenidas_trend: (n) => `${n} events`,

    panel_wenco_kicker: 'WENCO live',
    panel_wenco_titulo: 'Recent breakdowns and maintenance',
    panel_wenco_tag: (n) => `${n} events`,
    empty_sin_averias: 'No breakdowns or maintenance recorded in WENCO recently',

    panel_externo_kicker: 'External report',
    panel_externo_titulo: 'Fleet breakdown detail (XLS from email)',
    mail_casilla: (user) => `Mailbox: ${user}`,
    mail_outlook: 'Outlook via scheduled task',
    auto_sync: (min) => `Auto every ${min} min`,
    auto_sync_ultima: (time) => ` / last ${time}`,

    btn_sincronizando: 'Syncing...',
    btn_sincronizar: 'Sync email',
    btn_importando: 'Importing...',
    btn_cargar_xls: 'Load XLS',

    import_msg_ok: (filename, imported, duplicated, notes) =>
      `${filename}: ${imported} new events (${duplicated} already existed). ${notes}`,
    import_msg_err: (msg) => `Import error: ${msg}`,
    import_msg_err_generic: 'Error importing the file.',
    mail_sync_no_config: 'Mailbox and watched folder not configured. Set NORTHMINE_MAIL_USER / NORTHMINE_MAIL_PASSWORD or NORTHMINE_AVERIAS_WATCH_DIR on the backend.',
    mail_sync_err_generic: 'Error syncing email.',
    mail_sync_ok: (mailFiles, folderFiles) => `Sync complete: ${mailFiles} attachments from email, ${folderFiles} files from folder.`,
    mail_sync_err: (msg) => `Sync error: ${msg}`,
    mail_sync_err_generic2: 'Sync error.',

    empty_cargando_desglose: 'Loading imported breakdown...',
    empty_sin_reportes: 'No XLS reports imported yet. Load one with the button or configure the mailbox / watched folder.',

    kpi_equipos_afectados_titulo: 'Affected units',
    kpi_equipos_afectados_subtitulo: (dias) => `Last ${dias} days`,
    kpi_equipos_afectados_trend: (n) => `${n} events`,

    kpi_tiempo_detenido_titulo: 'Downtime',
    kpi_tiempo_detenido_subtitulo: 'Full fleet',
    kpi_tiempo_detenido_trend: 'XLS imported',

    kpi_eventos_titulo: 'Events',
    kpi_eventos_subtitulo: 'Report records',
    kpi_eventos_trend: (n) => `${n} historical`,

    kpi_costo_titulo: 'Unavailability cost',
    kpi_costo_subtitulo: (dias) => `Last ${dias} days, full fleet`,
    kpi_costo_trend: (correctiva, programada) => `${correctiva} corrective / ${programada} scheduled`,
    costo_nota_prefix: (rate, fuente) => `Estimated at USD ${rate}/min of unavailability (${fuente}).`,

    kpi_disp_fisica_titulo: 'Physical availability',
    kpi_disp_fisica_subtitulo: (equipos, dias) => `${equipos} units / ${dias} days reported`,
    kpi_disp_fisica_trend_peor: (id, pct) => `Worst: ${id} (${pct}%)`,

    kpi_mttr_titulo: 'MTTR',
    kpi_mttr_subtitulo: 'Mean time to repair',
    kpi_mttr_trend: (n) => `${n} corrective breakdowns`,

    kpi_mtbf_titulo: 'MTBF',
    kpi_mtbf_subtitulo: 'Mean time between failures',
    kpi_mtbf_trend: (h) => `${h} h in breakdowns`,

    kpi_mant_prog_titulo: 'Scheduled maintenance',
    kpi_mant_prog_subtitulo: 'Of total downtime',
    kpi_mant_prog_trend: (pct) => `${pct}% corrective`,

    filtro_todos: 'All',
    tipo_averia_propia: 'Own breakdown',
    tipo_mant_programada: 'Scheduled maintenance',
    tipo_mant_diario: 'Daily maintenance',
    tipo_dano_operacional: 'Operational damage / fault',
    tipo_averia_otro: 'Third-party breakdown',
    tipo_otro: 'Other',

    select_todos_modelos: 'All models',
    select_todos_sistemas: 'All systems',
    placeholder_buscar: 'Search equipment, system or fault...',
    tag_eventos_filtrados: (n) => `${n} filtered events`,
    btn_limpiar: 'Clear',

    chart_donde_duele_kicker: 'Where it hurts',
    chart_horas_sistema_titulo: 'Hours by system',
    chart_por_flota_kicker: 'By fleet',
    chart_horas_modelo_titulo: 'Hours by model',
    chart_historico_kicker: 'Historical',
    chart_horas_mes_titulo: 'Downtime hours by month',
    chart_composicion_kicker: 'Composition',
    chart_distribucion_titulo: 'Distribution by event type',

    insights_kicker: 'Smart analysis',
    insights_titulo: 'Breakdown patterns: recurrences, trends and at-risk equipment',
    insights_tag: (n, dias) => `${n} breakdowns analyzed / ${dias} days`,
    insight_cada_dias: (gap) => `every ~${gap} days / `,
    insight_ultima: (fecha) => `last ${fecha}`,
    insight_ultimo_evento: (desc) => `Last event: ${desc}`,
    insight_causa_probable: 'Probable cause:',
    insight_solucion_sugerida: 'Suggested solution:',
    insight_confianza: (c) => `confidence ${c}`,
    insight_sin_recurrentes: 'No recurring failures detected in the analyzed window.',

    tabla_flota_kicker: 'Fleet',
    tabla_flota_titulo: 'Global equipment table',
    tabla_flota_tag: (n) => `${n} units / click to expand detail`,
    col_equipo: 'Equipment',
    col_modelo: 'Model',
    col_estado: 'Status',
    col_tipo_dominante: 'Dominant type',
    col_eventos: 'Events',
    col_horas_detenidas: 'Downtime hours',
    col_costo: 'Cost',
    col_disp_fisica: 'Phys. avail.',
    col_sistema_principal: 'Main system',
    col_ultimo_evento: 'Last event',
    tabla_sin_eventos: 'No events with the current filters.',

    sin_tipo: 'No type',
    sin_modelo: 'No model',
    sin_sistema: 'No system',
    equipo_fallback: 'Equipment',
    sin_timestamp: 'no timestamp',
    cargando: 'Loading breakdowns and maintenance...',
    error_cargar: 'Could not load the breakdowns module.',
  },
  de: {
    eyebrow: 'Ausfälle',
    titulo: 'Flotten-Ausfälle und Wartung',
    descripcion: 'Ausfälle, geplante Wartungen und Aufschlüsselung des täglichen Wartungsberichts.',

    kpi_activas_titulo: 'Aktive Ausfälle',
    kpi_activas_subtitulo: 'Offene WENCO-Ereignisse',
    kpi_activas_trend: (n) => `${n} in Wartung`,

    kpi_mant_titulo: 'Ausfälle / Wartungen',
    kpi_mant_subtitulo: 'Aktuelle WENCO-Ereignisse',
    kpi_mant_trend: 'laufende Schicht',

    kpi_equipos_fs_titulo: 'Geräte F/S',
    kpi_equipos_fs_subtitulo: 'Außer Betrieb (Bericht)',
    kpi_equipos_fs_trend_con: (n) => `${n} mit Ereignissen`,
    kpi_equipos_fs_trend_sin: 'ohne Bericht',

    kpi_horas_detenidas_titulo: 'Stillstandsstunden',
    kpi_horas_detenidas_subtitulo: (dias) => `Flotte / letzte ${dias} Tage`,
    kpi_horas_detenidas_trend: (n) => `${n} Ereignisse`,

    panel_wenco_kicker: 'WENCO live',
    panel_wenco_titulo: 'Aktuelle Ausfälle und Wartungen',
    panel_wenco_tag: (n) => `${n} Ereignisse`,
    empty_sin_averias: 'In WENCO sind derzeit keine Ausfälle oder Wartungen registriert',

    panel_externo_kicker: 'Externer Bericht',
    panel_externo_titulo: 'Aufschlüsselung der Flotten-Ausfälle (XLS aus E-Mail)',
    mail_casilla: (user) => `Postfach: ${user}`,
    mail_outlook: 'Outlook über geplante Aufgabe',
    auto_sync: (min) => `Automatisch alle ${min} min`,
    auto_sync_ultima: (time) => ` / letzte ${time}`,

    btn_sincronizando: 'Synchronisiere...',
    btn_sincronizar: 'E-Mail synchronisieren',
    btn_importando: 'Importiere...',
    btn_cargar_xls: 'XLS laden',

    import_msg_ok: (filename, imported, duplicated, notes) =>
      `${filename}: ${imported} neue Ereignisse (${duplicated} bereits vorhanden). ${notes}`,
    import_msg_err: (msg) => `Fehler beim Import: ${msg}`,
    import_msg_err_generic: 'Fehler beim Import der Datei.',
    mail_sync_no_config: 'Postfach und überwachter Ordner nicht konfiguriert. Legen Sie NORTHMINE_MAIL_USER / NORTHMINE_MAIL_PASSWORD oder NORTHMINE_AVERIAS_WATCH_DIR im Backend fest.',
    mail_sync_err_generic: 'Fehler beim Synchronisieren der E-Mail.',
    mail_sync_ok: (mailFiles, folderFiles) => `Synchronisierung abgeschlossen: ${mailFiles} Anhänge aus E-Mail, ${folderFiles} Dateien aus Ordner.`,
    mail_sync_err: (msg) => `Fehler beim Synchronisieren: ${msg}`,
    mail_sync_err_generic2: 'Fehler beim Synchronisieren.',

    empty_cargando_desglose: 'Lade importierte Aufschlüsselung...',
    empty_sin_reportes: 'Noch keine XLS-Berichte importiert. Laden Sie einen über den Button oder konfigurieren Sie das Postfach / den überwachten Ordner.',

    kpi_equipos_afectados_titulo: 'Betroffene Geräte',
    kpi_equipos_afectados_subtitulo: (dias) => `Letzte ${dias} Tage`,
    kpi_equipos_afectados_trend: (n) => `${n} Ereignisse`,

    kpi_tiempo_detenido_titulo: 'Stillstandszeit',
    kpi_tiempo_detenido_subtitulo: 'Gesamte Flotte',
    kpi_tiempo_detenido_trend: 'XLS importiert',

    kpi_eventos_titulo: 'Ereignisse',
    kpi_eventos_subtitulo: 'Berichtsdaten',
    kpi_eventos_trend: (n) => `${n} historisch`,

    kpi_costo_titulo: 'Kosten der Nichtverfügbarkeit',
    kpi_costo_subtitulo: (dias) => `Letzte ${dias} Tage, gesamte Flotte`,
    kpi_costo_trend: (correctiva, programada) => `${correctiva} korrektiv / ${programada} geplant`,
    costo_nota_prefix: (rate, fuente) => `Geschätzt mit USD ${rate}/min Nichtverfügbarkeit (${fuente}).`,

    kpi_disp_fisica_titulo: 'Physische Verfügbarkeit',
    kpi_disp_fisica_subtitulo: (equipos, dias) => `${equipos} Geräte / ${dias} Tage mit Bericht`,
    kpi_disp_fisica_trend_peor: (id, pct) => `Schlechtester: ${id} (${pct}%)`,

    kpi_mttr_titulo: 'MTTR',
    kpi_mttr_subtitulo: 'Mittlere Reparaturzeit',
    kpi_mttr_trend: (n) => `${n} korrektive Ausfälle`,

    kpi_mtbf_titulo: 'MTBF',
    kpi_mtbf_subtitulo: 'Mittlere Betriebsdauer zwischen Ausfällen',
    kpi_mtbf_trend: (h) => `${h} h in Ausfällen`,

    kpi_mant_prog_titulo: 'Geplante Wartung',
    kpi_mant_prog_subtitulo: 'Anteil an der Gesamtstillstandszeit',
    kpi_mant_prog_trend: (pct) => `${pct}% korrektiv`,

    filtro_todos: 'Alle',
    tipo_averia_propia: 'Eigener Ausfall',
    tipo_mant_programada: 'Geplante Wartung',
    tipo_mant_diario: 'Tägliche Wartung',
    tipo_dano_operacional: 'Betriebsschaden / -ausfall',
    tipo_averia_otro: 'Sonstiger Ausfall',
    tipo_otro: 'Andere',

    select_todos_modelos: 'Alle Modelle',
    select_todos_sistemas: 'Alle Systeme',
    placeholder_buscar: 'Gerät, System oder Ausfall suchen...',
    tag_eventos_filtrados: (n) => `${n} gefilterte Ereignisse`,
    btn_limpiar: 'Zurücksetzen',

    chart_donde_duele_kicker: 'Brennpunkte',
    chart_horas_sistema_titulo: 'Stunden nach System',
    chart_por_flota_kicker: 'Nach Flotte',
    chart_horas_modelo_titulo: 'Stunden nach Modell',
    chart_historico_kicker: 'Historisch',
    chart_horas_mes_titulo: 'Stillstandsstunden pro Monat',
    chart_composicion_kicker: 'Zusammensetzung',
    chart_distribucion_titulo: 'Verteilung nach Ereignistyp',

    insights_kicker: 'Intelligente Analyse',
    insights_titulo: 'Ausfallmuster: Wiederholungen, Trends und Geräte mit Risiko',
    insights_tag: (n, dias) => `${n} analysierte Ausfälle / ${dias} Tage`,
    insight_cada_dias: (gap) => `alle ~${gap} Tage / `,
    insight_ultima: (fecha) => `letzte ${fecha}`,
    insight_ultimo_evento: (desc) => `Letztes Ereignis: ${desc}`,
    insight_causa_probable: 'Wahrscheinliche Ursache:',
    insight_solucion_sugerida: 'Empfohlene Lösung:',
    insight_confianza: (c) => `Konfidenz ${c}`,
    insight_sin_recurrentes: 'Keine wiederkehrenden Ausfälle im analysierten Zeitraum erkannt.',

    tabla_flota_kicker: 'Flotte',
    tabla_flota_titulo: 'Gesamttabelle der Geräte',
    tabla_flota_tag: (n) => `${n} Geräte / Klicken zum Aufklappen der Details`,
    col_equipo: 'Gerät',
    col_modelo: 'Modell',
    col_estado: 'Status',
    col_tipo_dominante: 'Dominanter Typ',
    col_eventos: 'Ereignisse',
    col_horas_detenidas: 'Stillstandsstunden',
    col_costo: 'Kosten',
    col_disp_fisica: 'Phy. Verfüg.',
    col_sistema_principal: 'Hauptsystem',
    col_ultimo_evento: 'Letztes Ereignis',
    tabla_sin_eventos: 'Keine Ereignisse mit den aktuellen Filtern.',

    sin_tipo: 'Ohne Typ',
    sin_modelo: 'Ohne Modell',
    sin_sistema: 'Ohne System',
    equipo_fallback: 'Gerät',
    sin_timestamp: 'ohne Zeitstempel',
    cargando: 'Lade Ausfälle und Wartungen...',
    error_cargar: 'Das Ausfall-Modul konnte nicht geladen werden.',
  },
}
