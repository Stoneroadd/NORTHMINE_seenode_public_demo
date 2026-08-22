import type { ModuleDict } from '../useModuleT'

export interface FleetT {
  // FleetPage - header
  eyebrow: string
  title: string
  description: string
  meta: (dataSource: string, latestRecord: string) => string
  refresh: string
  exporting: string
  export_csv: string

  // FleetPage - status filter labels (display only; underlying filter values are left untouched)
  status_label: (filter: string) => string

  // FleetPage - KPI cards
  kpi_caex_total_title: string
  kpi_caex_total_subtitle: string
  kpi_caex_total_trend: (visible: number) => string
  kpi_active_title: string
  kpi_active_subtitle: string
  kpi_active_trend: (pct: string) => string
  kpi_standby_title: string
  kpi_standby_subtitle: string
  kpi_standby_trend: string
  kpi_maint_title: string
  kpi_maint_subtitle: (maint: number, delay: number) => string
  kpi_maint_trend: (pct: string) => string

  // FleetPage - table panel
  panel_current_status: string
  panel_full_list: string
  search_placeholder: string
  panel_tag_equipos: (count: number) => string
  col_caex: string
  col_estado: string
  col_substate: string
  col_tonnage: string
  col_cycles: string
  col_no_cycle: string
  col_operator: string
  col_origin: string
  col_destination: string
  no_operator: string
  no_data: string
  no_record: string

  // FleetPage - side panels
  operational_reading: string
  fleet_status: string
  live_wenco: string
  productive: string
  standby: string
  no_activity: string
  out_of_service: string
  standby_explanation: string
  standby_slack: string
  caex_out_of_performance: string
  no_standby: string
  no_cycle_suffix: string
  loading_label: string
  error_detail: string
  no_substate: string

  // FleetShiftChecklist
  checklist_kicker: string
  checklist_title: string
  checklist_tag: string
  shift_label: string
  date_label: string
  autofill_loading: string
  autofill_button: string
  copied: string
  copy_wsp: string
  download_txt: string
  reset: string
  autofill_error: string
  autofill_success: (fromWenco: number, fromReport: number, reportDateSuffix: string, noData: number) => string
  report_date_suffix: (date: string) => string
  total: string
  operational: string
  out_of_service_short: string
  format_label: string
  equipos_count: (count: number) => string
  location_aria: (label: string) => string
  preview_kicker: string
  preview_title: string
}

export const fleetT: ModuleDict<FleetT> = {
  es: {
    eyebrow: 'Flota',
    title: 'Toda la flota y status actual',
    description: 'Estado operativo de CAEX desde WENCO, subestado, operador, ultima actividad y aporte del turno actual.',
    meta: (dataSource, latestRecord) => `${dataSource} - Turno actual - Registro ${latestRecord}`,
    refresh: 'Actualizar',
    exporting: 'Exportando...',
    export_csv: 'Export CAEX CSV',

    status_label: (filter) => ({
      TODOS: 'TODOS',
      ACTIVO: 'ACTIVO',
      STANDBY: 'STANDBY',
      DEMORA: 'DEMORA',
      MANTENCION: 'MANTENCION',
      'SIN ACTIVIDAD': 'SIN ACTIVIDAD',
    } as Record<string, string>)[filter] ?? filter,

    kpi_caex_total_title: 'CAEX totales',
    kpi_caex_total_subtitle: 'Flota con registro WENCO',
    kpi_caex_total_trend: (visible) => `${visible} visibles`,
    kpi_active_title: 'Activos',
    kpi_active_subtitle: 'Con estado productivo',
    kpi_active_trend: (pct) => `${pct}% utilizacion`,
    kpi_standby_title: 'Standby',
    kpi_standby_subtitle: 'Excluido de bajo rendimiento',
    kpi_standby_trend: 'gestion flota',
    kpi_maint_title: 'Mantencion / demora',
    kpi_maint_subtitle: (maint, delay) => `${maint} mant. / ${delay} demora`,
    kpi_maint_trend: (pct) => `${pct}% disp.`,

    panel_current_status: 'Status actual',
    panel_full_list: 'Lista completa de CAEX',
    search_placeholder: 'Buscar CAEX, operador, estado, destino',
    panel_tag_equipos: (count) => `${count} equipos`,
    col_caex: 'CAEX',
    col_estado: 'Estado',
    col_substate: 'Subestado WENCO',
    col_tonnage: 'Tonelaje',
    col_cycles: 'Ciclos',
    col_no_cycle: 'Sin ciclo',
    col_operator: 'Operador',
    col_origin: 'Origen / UC',
    col_destination: 'Destino',
    no_operator: 'Sin operador',
    no_data: 'Sin dato',
    no_record: 'Sin registro',

    operational_reading: 'Lectura operacional',
    fleet_status: 'Estado de flota',
    live_wenco: 'REAL WENCO',
    productive: 'Productivos',
    standby: 'Standby',
    no_activity: 'Sin actividad',
    out_of_service: 'Fuera servicio',
    standby_explanation: 'Los equipos en STANDBY se muestran con subestado WENCO y no se mezclan con bajo rendimiento. Esto permite justificar gestion de flota adecuada cuando sobran CAEX para el ritmo del frente.',
    standby_slack: 'Standby / holgura',
    caex_out_of_performance: 'CAEX fuera de rendimiento',
    no_standby: 'Sin CAEX en standby WENCO.',
    no_cycle_suffix: 'sin ciclo',
    loading_label: 'Cargando status actual de flota...',
    error_detail: 'No pudimos cargar el estado de flota. Reintenta en unos segundos.',
    no_substate: 'Sin subestado WENCO',

    checklist_kicker: 'Cierre de turno',
    checklist_title: 'Status manual para WhatsApp',
    checklist_tag: 'Checklist local',
    shift_label: 'Turno',
    date_label: 'Fecha',
    autofill_loading: 'Consultando...',
    autofill_button: 'Autocompletar desde datos',
    copied: 'Copiado',
    copy_wsp: 'Copiar WSP',
    download_txt: 'Descargar TXT',
    reset: 'Reset',
    autofill_error: 'No se pudo autocompletar. Verifica el backend y reintenta.',
    autofill_success: (fromWenco, fromReport, reportDateSuffix, noData) =>
      `Autocompletado: ${fromWenco} desde WENCO en vivo, ${fromReport} desde el reporte de mantencion${reportDateSuffix}. ${noData} sin dato (revisar a mano).`,
    report_date_suffix: (date) => ` (reporte del ${date})`,
    total: 'Total',
    operational: 'Operativos',
    out_of_service_short: 'Fuera servicio',
    format_label: 'Formato',
    equipos_count: (count) => `${count} equipos`,
    location_aria: (label) => `Ubicacion ${label}`,
    preview_kicker: 'Vista previa',
    preview_title: 'Mensaje WhatsApp',
  },
  en: {
    eyebrow: 'Fleet',
    title: 'Entire fleet and current status',
    description: 'CAEX operating status from WENCO, substate, operator, last activity and current shift contribution.',
    meta: (dataSource, latestRecord) => `${dataSource} - Current shift - Record ${latestRecord}`,
    refresh: 'Refresh',
    exporting: 'Exporting...',
    export_csv: 'Export CAEX CSV',

    status_label: (filter) => ({
      TODOS: 'ALL',
      ACTIVO: 'ACTIVE',
      STANDBY: 'STANDBY',
      DEMORA: 'DELAY',
      MANTENCION: 'MAINTENANCE',
      'SIN ACTIVIDAD': 'NO ACTIVITY',
    } as Record<string, string>)[filter] ?? filter,

    kpi_caex_total_title: 'Total CAEX',
    kpi_caex_total_subtitle: 'Fleet with WENCO record',
    kpi_caex_total_trend: (visible) => `${visible} visible`,
    kpi_active_title: 'Active',
    kpi_active_subtitle: 'With productive status',
    kpi_active_trend: (pct) => `${pct}% utilization`,
    kpi_standby_title: 'Standby',
    kpi_standby_subtitle: 'Excluded from low performance',
    kpi_standby_trend: 'fleet management',
    kpi_maint_title: 'Maintenance / delay',
    kpi_maint_subtitle: (maint, delay) => `${maint} maint. / ${delay} delay`,
    kpi_maint_trend: (pct) => `${pct}% avail.`,

    panel_current_status: 'Current status',
    panel_full_list: 'Full CAEX list',
    search_placeholder: 'Search CAEX, operator, status, destination',
    panel_tag_equipos: (count) => `${count} units`,
    col_caex: 'CAEX',
    col_estado: 'Status',
    col_substate: 'WENCO substate',
    col_tonnage: 'Tonnage',
    col_cycles: 'Cycles',
    col_no_cycle: 'No cycle',
    col_operator: 'Operator',
    col_origin: 'Origin / Loading unit',
    col_destination: 'Destination',
    no_operator: 'No operator',
    no_data: 'No data',
    no_record: 'No record',

    operational_reading: 'Operational reading',
    fleet_status: 'Fleet status',
    live_wenco: 'LIVE WENCO',
    productive: 'Productive',
    standby: 'Standby',
    no_activity: 'No activity',
    out_of_service: 'Out of service',
    standby_explanation: 'Equipment in STANDBY is shown with its WENCO substate and is not mixed with low performance. This lets you justify proper fleet management when there are more CAEX than the front needs.',
    standby_slack: 'Standby / slack',
    caex_out_of_performance: 'CAEX out of performance',
    no_standby: 'No CAEX in WENCO standby.',
    no_cycle_suffix: 'no cycle',
    loading_label: 'Loading current fleet status...',
    error_detail: 'We could not load fleet status. Try again in a few seconds.',
    no_substate: 'No WENCO substate',

    checklist_kicker: 'Shift closeout',
    checklist_title: 'Manual status for WhatsApp',
    checklist_tag: 'Local checklist',
    shift_label: 'Shift',
    date_label: 'Date',
    autofill_loading: 'Checking...',
    autofill_button: 'Auto-fill from data',
    copied: 'Copied',
    copy_wsp: 'Copy WSP',
    download_txt: 'Download TXT',
    reset: 'Reset',
    autofill_error: 'Could not auto-fill. Check the backend and retry.',
    autofill_success: (fromWenco, fromReport, reportDateSuffix, noData) =>
      `Auto-filled: ${fromWenco} from live WENCO, ${fromReport} from the maintenance report${reportDateSuffix}. ${noData} with no data (check manually).`,
    report_date_suffix: (date) => ` (report dated ${date})`,
    total: 'Total',
    operational: 'Operational',
    out_of_service_short: 'Out of service',
    format_label: 'Format',
    equipos_count: (count) => `${count} units`,
    location_aria: (label) => `Location ${label}`,
    preview_kicker: 'Preview',
    preview_title: 'WhatsApp message',
  },
  de: {
    eyebrow: 'Flotte',
    title: 'Gesamte Flotte und aktueller Status',
    description: 'Betriebsstatus der CAEX aus WENCO, Unterstatus, Operator, letzte Aktivität und Beitrag der aktuellen Schicht.',
    meta: (dataSource, latestRecord) => `${dataSource} - Aktuelle Schicht - Datensatz ${latestRecord}`,
    refresh: 'Aktualisieren',
    exporting: 'Export wird ausgeführt...',
    export_csv: 'CAEX-CSV exportieren',

    status_label: (filter) => ({
      TODOS: 'ALLE',
      ACTIVO: 'AKTIV',
      STANDBY: 'STANDBY',
      DEMORA: 'VERZÖGERUNG',
      MANTENCION: 'WARTUNG',
      'SIN ACTIVIDAD': 'KEINE AKTIVITÄT',
    } as Record<string, string>)[filter] ?? filter,

    kpi_caex_total_title: 'CAEX gesamt',
    kpi_caex_total_subtitle: 'Flotte mit WENCO-Datensatz',
    kpi_caex_total_trend: (visible) => `${visible} sichtbar`,
    kpi_active_title: 'Aktiv',
    kpi_active_subtitle: 'Mit produktivem Status',
    kpi_active_trend: (pct) => `${pct}% Auslastung`,
    kpi_standby_title: 'Standby',
    kpi_standby_subtitle: 'Von geringer Leistung ausgenommen',
    kpi_standby_trend: 'Flottenmanagement',
    kpi_maint_title: 'Wartung / Verzögerung',
    kpi_maint_subtitle: (maint, delay) => `${maint} Wart. / ${delay} Verzög.`,
    kpi_maint_trend: (pct) => `${pct}% Verfügbarkeit`,

    panel_current_status: 'Aktueller Status',
    panel_full_list: 'Vollständige CAEX-Liste',
    search_placeholder: 'CAEX, Operator, Status, Ziel suchen',
    panel_tag_equipos: (count) => `${count} Geräte`,
    col_caex: 'CAEX',
    col_estado: 'Status',
    col_substate: 'WENCO-Unterstatus',
    col_tonnage: 'Tonnage',
    col_cycles: 'Zyklen',
    col_no_cycle: 'Kein Zyklus',
    col_operator: 'Operator',
    col_origin: 'Ursprung / UC',
    col_destination: 'Ziel',
    no_operator: 'Kein Operator',
    no_data: 'Keine Daten',
    no_record: 'Kein Datensatz',

    operational_reading: 'Operative Ablesung',
    fleet_status: 'Flottenstatus',
    live_wenco: 'WENCO LIVE',
    productive: 'Produktiv',
    standby: 'Standby',
    no_activity: 'Keine Aktivität',
    out_of_service: 'Außer Betrieb',
    standby_explanation: 'Die Geräte im STANDBY werden mit WENCO-Unterstatus angezeigt und nicht mit geringer Leistung vermischt. Dies ermöglicht eine angemessene Flottensteuerung, wenn mehr CAEX vorhanden sind, als die Abbaufront benötigt.',
    standby_slack: 'Standby / Puffer',
    caex_out_of_performance: 'CAEX außerhalb der Leistung',
    no_standby: 'Keine CAEX im WENCO-Standby.',
    no_cycle_suffix: 'ohne Zyklus',
    loading_label: 'Aktueller Flottenstatus wird geladen...',
    error_detail: '/api/fleet/status konnte nicht geladen werden.',
    no_substate: 'Kein WENCO-Unterstatus',

    checklist_kicker: 'Schichtabschluss',
    checklist_title: 'Manueller Status für WhatsApp',
    checklist_tag: 'Lokale Checkliste',
    shift_label: 'Schicht',
    date_label: 'Datum',
    autofill_loading: 'Prüfung läuft...',
    autofill_button: 'Aus Daten automatisch ausfüllen',
    copied: 'Kopiert',
    copy_wsp: 'WSP kopieren',
    download_txt: 'TXT herunterladen',
    reset: 'Zurücksetzen',
    autofill_error: 'Automatisches Ausfüllen fehlgeschlagen. Backend prüfen und erneut versuchen.',
    autofill_success: (fromWenco, fromReport, reportDateSuffix, noData) =>
      `Automatisch ausgefüllt: ${fromWenco} aus WENCO live, ${fromReport} aus dem Wartungsbericht${reportDateSuffix}. ${noData} ohne Daten (manuell prüfen).`,
    report_date_suffix: (date) => ` (Bericht vom ${date})`,
    total: 'Gesamt',
    operational: 'Operativ',
    out_of_service_short: 'Außer Betrieb',
    format_label: 'Format',
    equipos_count: (count) => `${count} Geräte`,
    location_aria: (label) => `Standort ${label}`,
    preview_kicker: 'Vorschau',
    preview_title: 'WhatsApp-Nachricht',
  },
}
