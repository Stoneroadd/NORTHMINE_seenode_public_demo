import type { ModuleDict } from '../useModuleT'

export interface CurrentShiftT {
  eyebrow: string
  title_suffix: string
  descripcion: (fecha: string, minutos: number) => string
  reporte_pdf: string
  generando: string
  filtro_despacho: string
  reportes_anteriores: string
  exportando: string
  export_csv: string
  export_excel: string
  imprimir_reporte_anterior: string
  selecciona_fecha_turno: string
  turno_ciclos: (fecha: string, turno: string, ciclos: number) => string
  generar_pdf: string
  cargando_turnos: string
  sin_ciclos_para: (fecha: string, turno: string) => string
  reporte_generado: (fecha: string, turno: string, ciclos: number) => string
  reporte_error: string
  filtro_despacho_label: string
  fecha_hoy: string
  turno_placeholder: string
  uc_placeholder: string
  caex_placeholder: string
  fase_placeholder: string
  malla_placeholder: string
  limpiar: string
  revision_historica: string
  en_vivo: string
  calculando_anomalias: string
  sin_anomalias: string
  sin_ciclo_hace: string
  hueco_de: string
  esperado_min: (n: number) => string
  uc_prefix: (id: string) => string
  kpi_cluster_title: string
  kpi_ton_turno: string
  kpi_ton_turno_sub: string
  kpi_cumplimiento: string
  kpi_cumplimiento_sub: string
  kpi_ciclos: string
  kpi_ciclos_sub: string
  kpi_ciclos_trend: (tPorCiclo: number) => string
  kpi_caex_activos: string
  kpi_caex_sin_actividad: (n: number) => string
  kpi_caex_averia: (n: number) => string
  resumen_ejecutivo: string
  lectura_del_turno: string
  generado_automaticamente: string
  hora_a_hora: string
  tonelaje_del_turno: string
  sin_datos_evaluacion: string
  bajo_promedio: string
  caex_a_revisar: string
  equipos_count: (n: number) => string
  ultima_actividad_hace: (tiempo: string) => string
  carguio: string
  rendimiento_por_uc: string
  unidades_count: (n: number) => string
  ranking_caex: string
  top_12: string
  rutas_por_modelo: string
  origen_destino_distancia: string
  modelos_count: (n: number) => string
  equipos_ton_desc: (equipos: number, tons: string, ciclos: number) => string
  banco_malla: (banco: string, malla: string) => string
  desc_count: (n: number) => string
  ver_actividad_wenco: (id: string) => string
  sin_origen: string
  sin_destino: string
  anomalia_ciclo_title: (label: string) => string
  caex_en_anomalia: (n: number) => string
  caex_uc_anomalo_title: (n: number) => string
  cargando_turno: string
  error_turno: string
  ciclos_ton: (n: number) => string
  pct_del_promedio: (pct: number) => string
}

export const currentShiftT: ModuleDict<CurrentShiftT> = {
  es: {
    eyebrow: 'Turno Actual',
    title_suffix: ' operacional',
    descripcion: (fecha, minutos) => `${fecha} / ${minutos} min transcurridos`,
    reporte_pdf: 'Reporte PDF',
    generando: 'Generando...',
    filtro_despacho: 'Filtro despacho',
    reportes_anteriores: 'Reportes anteriores',
    exportando: 'Exportando...',
    export_csv: 'Export CSV',
    export_excel: 'Export Excel',
    imprimir_reporte_anterior: 'Imprimir reporte de turno anterior:',
    selecciona_fecha_turno: 'Selecciona fecha y turno...',
    turno_ciclos: (fecha, turno, ciclos) => `${fecha} - TURNO ${turno} (${ciclos} ciclos)`,
    generar_pdf: 'Generar PDF',
    cargando_turnos: 'Cargando turnos disponibles...',
    sin_ciclos_para: (fecha, turno) => `Sin ciclos registrados para ${fecha} turno ${turno}.`,
    reporte_generado: (fecha, turno, ciclos) => `Reporte ${fecha} ${turno} generado (${ciclos} ciclos).`,
    reporte_error: 'No se pudo generar el reporte historico. Reintenta.',
    filtro_despacho_label: 'Filtro despacho:',
    fecha_hoy: 'Fecha (hoy)',
    turno_placeholder: 'Turno',
    uc_placeholder: 'UC',
    caex_placeholder: 'CAEX',
    fase_placeholder: 'Fase',
    malla_placeholder: 'Malla',
    limpiar: 'Limpiar',
    revision_historica: 'Revision historica',
    en_vivo: 'En vivo',
    calculando_anomalias: 'Calculando anomalias de ciclo...',
    sin_anomalias: 'Sin anomalias de ciclo con el filtro actual.',
    sin_ciclo_hace: 'Sin ciclo hace',
    hueco_de: 'Hueco de',
    esperado_min: (n) => `(esperado ~${n} min)`,
    uc_prefix: (id) => `/ UC ${id}`,
    kpi_cluster_title: 'Estado del turno',
    kpi_ton_turno: 'Ton turno',
    kpi_ton_turno_sub: 'Produccion acumulada',
    kpi_cumplimiento: 'Cumplimiento',
    kpi_cumplimiento_sub: 'Contra meta turno',
    kpi_ciclos: 'Ciclos',
    kpi_ciclos_sub: 'Ciclos registrados',
    kpi_ciclos_trend: (tPorCiclo) => `${tPorCiclo} t/ciclo`,
    kpi_caex_activos: 'CAEX activos',
    kpi_caex_sin_actividad: (n) => `${n} sin actividad`,
    kpi_caex_averia: (n) => `${n} averia`,
    resumen_ejecutivo: 'Resumen ejecutivo',
    lectura_del_turno: 'Lectura del turno',
    generado_automaticamente: 'Generado automaticamente',
    hora_a_hora: 'Hora a hora',
    tonelaje_del_turno: 'Tonelaje del turno',
    sin_datos_evaluacion: 'Sin datos suficientes para evaluacion operacional',
    bajo_promedio: 'Bajo promedio',
    caex_a_revisar: 'CAEX a revisar',
    equipos_count: (n) => `${n} equipos`,
    ultima_actividad_hace: (tiempo) => `Ultima actividad hace ${tiempo}`,
    carguio: 'Carguio',
    rendimiento_por_uc: 'Rendimiento por UC',
    unidades_count: (n) => `${n} unidades`,
    ranking_caex: 'Ranking CAEX',
    top_12: 'Top 12',
    rutas_por_modelo: 'Rutas por modelo',
    origen_destino_distancia: 'Origen, destino y distancia por modelo de CAEX',
    modelos_count: (n) => `${n} modelos`,
    equipos_ton_desc: (equipos, tons, ciclos) => `${equipos} equipos / ${tons} / ${ciclos} desc.`,
    banco_malla: (banco, malla) => `Banco ${banco} / Malla ${malla}`,
    desc_count: (n) => `${n} desc.`,
    ver_actividad_wenco: (id) => `Ver actividad WENCO de ${id}`,
    sin_origen: 'Sin origen',
    sin_destino: 'Sin destino',
    anomalia_ciclo_title: (label) => `Anomalia de ciclo: ${label}`,
    caex_en_anomalia: (n) => `${n} CAEX en anomalia`,
    caex_uc_anomalo_title: (n) => `${n} CAEX de este frente con ciclo anomalo`,
    cargando_turno: 'Cargando turno actual...',
    error_turno: 'No se pudo cargar el modulo de turno actual.',
    ciclos_ton: (n) => `${n} ciclos`,
    pct_del_promedio: (pct) => `${pct}% del promedio`,
  },
  en: {
    eyebrow: 'Current Shift',
    title_suffix: ' operations',
    descripcion: (fecha, minutos) => `${fecha} / ${minutos} min elapsed`,
    reporte_pdf: 'PDF Report',
    generando: 'Generating...',
    filtro_despacho: 'Dispatch filter',
    reportes_anteriores: 'Previous reports',
    exportando: 'Exporting...',
    export_csv: 'Export CSV',
    export_excel: 'Export Excel',
    imprimir_reporte_anterior: 'Print a previous shift report:',
    selecciona_fecha_turno: 'Select date and shift...',
    turno_ciclos: (fecha, turno, ciclos) => `${fecha} - SHIFT ${turno} (${ciclos} cycles)`,
    generar_pdf: 'Generate PDF',
    cargando_turnos: 'Loading available shifts...',
    sin_ciclos_para: (fecha, turno) => `No cycles recorded for ${fecha} shift ${turno}.`,
    reporte_generado: (fecha, turno, ciclos) => `Report ${fecha} ${turno} generated (${ciclos} cycles).`,
    reporte_error: 'Could not generate the historic report. Try again.',
    filtro_despacho_label: 'Dispatch filter:',
    fecha_hoy: 'Date (today)',
    turno_placeholder: 'Shift',
    uc_placeholder: 'Loader',
    caex_placeholder: 'CAEX',
    fase_placeholder: 'Phase',
    malla_placeholder: 'Mesh',
    limpiar: 'Clear',
    revision_historica: 'Historic review',
    en_vivo: 'Live',
    calculando_anomalias: 'Calculating cycle anomalies...',
    sin_anomalias: 'No cycle anomalies with the current filter.',
    sin_ciclo_hace: 'No cycle for',
    hueco_de: 'Gap of',
    esperado_min: (n) => `(expected ~${n} min)`,
    uc_prefix: (id) => `/ Loader ${id}`,
    kpi_cluster_title: 'Shift status',
    kpi_ton_turno: 'Shift tonnes',
    kpi_ton_turno_sub: 'Accumulated production',
    kpi_cumplimiento: 'Compliance',
    kpi_cumplimiento_sub: 'Against shift target',
    kpi_ciclos: 'Cycles',
    kpi_ciclos_sub: 'Recorded cycles',
    kpi_ciclos_trend: (tPorCiclo) => `${tPorCiclo} t/cycle`,
    kpi_caex_activos: 'Active CAEX',
    kpi_caex_sin_actividad: (n) => `${n} inactive`,
    kpi_caex_averia: (n) => `${n} breakdown`,
    resumen_ejecutivo: 'Executive summary',
    lectura_del_turno: 'Shift reading',
    generado_automaticamente: 'Auto-generated',
    hora_a_hora: 'Hour by hour',
    tonelaje_del_turno: 'Shift tonnage',
    sin_datos_evaluacion: 'Not enough data for an operational assessment',
    bajo_promedio: 'Below average',
    caex_a_revisar: 'CAEX to review',
    equipos_count: (n) => `${n} units`,
    ultima_actividad_hace: (tiempo) => `Last activity ${tiempo} ago`,
    carguio: 'Loading',
    rendimiento_por_uc: 'Performance by loader',
    unidades_count: (n) => `${n} units`,
    ranking_caex: 'CAEX ranking',
    top_12: 'Top 12',
    rutas_por_modelo: 'Routes by model',
    origen_destino_distancia: 'Origin, destination and distance by CAEX model',
    modelos_count: (n) => `${n} models`,
    equipos_ton_desc: (equipos, tons, ciclos) => `${equipos} units / ${tons} / ${ciclos} loads`,
    banco_malla: (banco, malla) => `Bench ${banco} / Mesh ${malla}`,
    desc_count: (n) => `${n} loads`,
    ver_actividad_wenco: (id) => `View WENCO activity for ${id}`,
    sin_origen: 'No origin',
    sin_destino: 'No destination',
    anomalia_ciclo_title: (label) => `Cycle anomaly: ${label}`,
    caex_en_anomalia: (n) => `${n} CAEX with anomaly`,
    caex_uc_anomalo_title: (n) => `${n} CAEX from this loader with an anomalous cycle`,
    cargando_turno: 'Loading current shift...',
    error_turno: 'Could not load the current shift module.',
    ciclos_ton: (n) => `${n} cycles`,
    pct_del_promedio: (pct) => `${pct}% of average`,
  },
  de: {
    eyebrow: 'Aktuelle Schicht',
    title_suffix: ' Betrieb',
    descripcion: (fecha, minutos) => `${fecha} / ${minutos} min vergangen`,
    reporte_pdf: 'PDF-Bericht',
    generando: 'Wird generiert...',
    filtro_despacho: 'Dispatch-Filter',
    reportes_anteriores: 'Fruehere Berichte',
    exportando: 'Wird exportiert...',
    export_csv: 'CSV exportieren',
    export_excel: 'Excel exportieren',
    imprimir_reporte_anterior: 'Bericht der vorherigen Schicht drucken:',
    selecciona_fecha_turno: 'Datum und Schicht auswaehlen...',
    turno_ciclos: (fecha, turno, ciclos) => `${fecha} - SCHICHT ${turno} (${ciclos} Zyklen)`,
    generar_pdf: 'PDF erstellen',
    cargando_turnos: 'Verfuegbare Schichten werden geladen...',
    sin_ciclos_para: (fecha, turno) => `Keine Zyklen fuer ${fecha}, Schicht ${turno} erfasst.`,
    reporte_generado: (fecha, turno, ciclos) => `Bericht ${fecha} ${turno} erstellt (${ciclos} Zyklen).`,
    reporte_error: 'Der historische Bericht konnte nicht erstellt werden. Bitte erneut versuchen.',
    filtro_despacho_label: 'Dispatch-Filter:',
    fecha_hoy: 'Datum (heute)',
    turno_placeholder: 'Schicht',
    uc_placeholder: 'Schaufelbagger',
    caex_placeholder: 'CAEX',
    fase_placeholder: 'Phase',
    malla_placeholder: 'Maschenweite',
    limpiar: 'Zuruecksetzen',
    revision_historica: 'Historische Ueberpruefung',
    en_vivo: 'Live',
    calculando_anomalias: 'Zyklusanomalien werden berechnet...',
    sin_anomalias: 'Keine Zyklusanomalien mit dem aktuellen Filter.',
    sin_ciclo_hace: 'Kein Zyklus seit',
    hueco_de: 'Luecke von',
    esperado_min: (n) => `(erwartet ~${n} min)`,
    uc_prefix: (id) => `/ Schaufelbagger ${id}`,
    kpi_cluster_title: 'Schichtstatus',
    kpi_ton_turno: 'Tonnen Schicht',
    kpi_ton_turno_sub: 'Kumulierte Produktion',
    kpi_cumplimiento: 'Zielerreichung',
    kpi_cumplimiento_sub: 'Gegen Schichtziel',
    kpi_ciclos: 'Zyklen',
    kpi_ciclos_sub: 'Erfasste Zyklen',
    kpi_ciclos_trend: (tPorCiclo) => `${tPorCiclo} t/Zyklus`,
    kpi_caex_activos: 'Aktive CAEX',
    kpi_caex_sin_actividad: (n) => `${n} ohne Aktivitaet`,
    kpi_caex_averia: (n) => `${n} Stoerung`,
    resumen_ejecutivo: 'Exekutive Zusammenfassung',
    lectura_del_turno: 'Schichtuebersicht',
    generado_automaticamente: 'Automatisch generiert',
    hora_a_hora: 'Stunde fuer Stunde',
    tonelaje_del_turno: 'Tonnage der Schicht',
    sin_datos_evaluacion: 'Nicht genuegend Daten fuer eine betriebliche Bewertung',
    bajo_promedio: 'Unter dem Durchschnitt',
    caex_a_revisar: 'CAEX zu pruefen',
    equipos_count: (n) => `${n} Geraete`,
    ultima_actividad_hace: (tiempo) => `Letzte Aktivitaet vor ${tiempo}`,
    carguio: 'Beladung',
    rendimiento_por_uc: 'Leistung nach Schaufelbagger',
    unidades_count: (n) => `${n} Einheiten`,
    ranking_caex: 'CAEX-Ranking',
    top_12: 'Top 12',
    rutas_por_modelo: 'Routen nach Modell',
    origen_destino_distancia: 'Ursprung, Ziel und Distanz nach CAEX-Modell',
    modelos_count: (n) => `${n} Modelle`,
    equipos_ton_desc: (equipos, tons, ciclos) => `${equipos} Geraete / ${tons} / ${ciclos} Verladevorgaenge`,
    banco_malla: (banco, malla) => `Bank ${banco} / Maschenweite ${malla}`,
    desc_count: (n) => `${n} Verladevorgaenge`,
    ver_actividad_wenco: (id) => `WENCO-Aktivitaet von ${id} ansehen`,
    sin_origen: 'Ohne Ursprung',
    sin_destino: 'Ohne Ziel',
    anomalia_ciclo_title: (label) => `Zyklusanomalie: ${label}`,
    caex_en_anomalia: (n) => `${n} CAEX mit Anomalie`,
    caex_uc_anomalo_title: (n) => `${n} CAEX dieser Abbaufront mit anormalem Zyklus`,
    cargando_turno: 'Aktuelle Schicht wird geladen...',
    error_turno: 'Das Modul der aktuellen Schicht konnte nicht geladen werden.',
    ciclos_ton: (n) => `${n} Zyklen`,
    pct_del_promedio: (pct) => `${pct}% des Durchschnitts`,
  },
}
