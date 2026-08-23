import type { ModuleDict } from '../useModuleT'

export interface ProductionT {
  loading: string
  error_prefix: string
  error_generic: string
  error_no_demo_suffix: string
  error_no_session: string
  error_session_invalid: string
  sin_plan_label: string
  sin_plan_title: string
  sin_plan_message: string
  verde_label: string
  verde_title: string
  verde_message: string
  amber_label: string
  amber_title: string
  amber_message: string
  red_label: string
  red_title: string
  red_message: string
  sin_meta_configurada: string
  plan_diario: (value: string) => string
  sin_plan_diario: string
  proyeccion_sobre_meta: string
  proyeccion_riesgo: string
  sin_evaluacion: string
  avance_pct: (pct: string) => string
  avance_no_disponible: string
  faltan_meta: (value: string) => string
  meta_superada: string
  configurar_meta: string
  ritmo_requerido: (value: string) => string
  mantener_ritmo: string
  validar_ritmo: string
  mejor_hora_registrada: (hora: string, value: string) => string
  esperando_mejor_hora: string
  header_eyebrow: string
  header_title: string
  header_desc: string
  header_meta: (source: string, system: string, turno: string, registro: string) => string
  actualizar: string
  source_cache: string
  source_demo: string
  source_real: string
  sin_registro: string
  lectura_ejecutiva: string
  registro_label: (value: string) => string
  proyeccion_fin_turno: string
  proyeccion_modelo_regresion: (r2: string) => string
  proyeccion_modelo_ritmo: string
  vs_meta: (value: string) => string
  que_hacer_ahora: string
  sin_ciclos_kicker: string
  sin_produccion_title: (fecha: string, turno: string) => string
  sin_produccion_message: (system: string) => string
  kpi_toneladas_turno: string
  kpi_meta_turno: (value: string) => string
  kpi_proyeccion_cierre: string
  kpi_vs_meta_final: (value: string) => string
  kpi_meta_no_evaluable: string
  kpi_cumplimiento: string
  kpi_sin_meta: string
  kpi_contra_meta_final: (value: string) => string
  kpi_brecha_hora: string
  kpi_esperado_no_disponible: string
  kpi_esperado: (value: string) => string
  kpi_no_evaluable: string
  kpi_sobre_ritmo: string
  kpi_bajo_ritmo: string
  kpi_mejor_hora: string
  kpi_sin_data: string
  kpi_pico: string
  chart_toneladas_hora_kicker: string
  chart_toneladas_hora_title: string
  chart_zoom_activo: string
  chart_cumplimiento_kicker: string
  chart_cumplimiento_title: string
  chart_turno_tag: (turno: string) => string
  chart_heatmap_kicker: string
  chart_heatmap_title: string
  chart_heatmap_tag: string
}

export const productionT: ModuleDict<ProductionT> = {
  es: {
    loading: 'Cargando produccion del turno...',
    error_prefix: 'No pudimos cargar la produccion del turno:',
    error_generic: 'No pudimos cargar la produccion del turno. Reintenta en unos segundos.',
    error_no_demo_suffix: 'Los datos de demostración solo se muestran en un contexto autorizado.',
    error_no_session: 'Sesion no disponible. Inicia sesion nuevamente para cargar Produccion real.',
    error_session_invalid: 'la sesion no es valida o no tiene permisos para ver Produccion real.',
    sin_plan_label: 'Sin plan',
    sin_plan_title: 'Meta no configurada',
    sin_plan_message: 'La produccion real se muestra desde WENCO, pero no se evalua cumplimiento sin meta de turno.',
    verde_label: 'En verde',
    verde_title: 'Ritmo suficiente para cerrar sobre meta',
    verde_message: 'Mantener continuidad de carguio y vigilar horas valle para no perder la ventaja proyectada.',
    amber_label: 'Preventivo',
    amber_title: 'La proyeccion llega, pero el turno requiere control',
    amber_message: 'Revisar continuidad horaria y asignacion CAEX antes de que la brecha a esta hora se convierta en riesgo.',
    red_label: 'Riesgo',
    red_title: 'La proyeccion queda bajo meta',
    red_message: 'Priorizar carguio critico, CAEX disponibles y restricciones de destino para recuperar toneladas dentro del turno.',
    sin_meta_configurada: 'Sin meta configurada',
    plan_diario: (value) => `${value}/dia`,
    sin_plan_diario: 'Sin plan diario',
    proyeccion_sobre_meta: 'Cierre sobre meta',
    proyeccion_riesgo: 'Riesgo de cierre',
    sin_evaluacion: 'Sin evaluacion',
    avance_pct: (pct) => `${pct}% del turno`,
    avance_no_disponible: 'Avance no disponible',
    faltan_meta: (value) => `Faltan ${value} para meta de turno.`,
    meta_superada: 'Meta de turno superada con produccion real.',
    configurar_meta: 'Configurar meta de turno para activar brecha y cumplimiento.',
    ritmo_requerido: (value) => `Ritmo requerido restante: ${value} t/h.`,
    mantener_ritmo: 'Mantener ritmo actual; la proyeccion esta sobre meta.',
    validar_ritmo: 'Validar ritmo requerido cuando exista plan.',
    mejor_hora_registrada: (hora, value) => `Mejor hora registrada: ${hora} con ${value}.`,
    esperando_mejor_hora: 'Esperando horas reales para detectar mejor hora.',
    header_eyebrow: 'Produccion',
    header_title: 'Control de turno',
    header_desc: 'Lectura ejecutiva de tonelaje, cumplimiento, brecha y tendencia operacional por hora.',
    header_meta: (source, system, turno, registro) => `${source} - ${system} - ${turno} - Registro ${registro}`,
    actualizar: 'Actualizar',
    source_cache: 'CACHE REAL',
    source_demo: 'MODO DEMO',
    source_real: 'DATOS REALES',
    sin_registro: 'Sin registro',
    lectura_ejecutiva: 'Lectura ejecutiva',
    registro_label: (value) => `Registro ${value}`,
    proyeccion_fin_turno: 'Proyeccion fin de turno',
    proyeccion_modelo_regresion: (r2) => `Regresion lineal · R² ${r2}`,
    proyeccion_modelo_ritmo: 'Ritmo promedio del turno',
    vs_meta: (value) => `${value} vs meta`,
    que_hacer_ahora: 'Que hacer ahora',
    sin_ciclos_kicker: 'Sin ciclos para el filtro',
    sin_produccion_title: (fecha, turno) => `No hay produccion para ${fecha} / ${turno}`,
    sin_produccion_message: (system) => `No hay produccion para el turno actual. La información disponible corresponde a ${system}; no se muestran datos sinteticos automaticamente.`,
    kpi_toneladas_turno: 'Toneladas turno',
    kpi_meta_turno: (value) => `Meta turno ${value}`,
    kpi_proyeccion_cierre: 'Proyeccion cierre',
    kpi_vs_meta_final: (value) => `${value} vs meta final`,
    kpi_meta_no_evaluable: 'Meta no evaluable',
    kpi_cumplimiento: 'Cumplimiento',
    kpi_sin_meta: 'Sin meta',
    kpi_contra_meta_final: (value) => `Contra meta final - ${value}`,
    kpi_brecha_hora: 'Brecha a esta hora',
    kpi_esperado_no_disponible: 'Esperado no disponible',
    kpi_esperado: (value) => `Esperado ${value}`,
    kpi_no_evaluable: 'No evaluable',
    kpi_sobre_ritmo: 'Sobre ritmo',
    kpi_bajo_ritmo: 'Bajo ritmo',
    kpi_mejor_hora: 'Mejor hora',
    kpi_sin_data: 'Sin data',
    kpi_pico: 'pico',
    chart_toneladas_hora_kicker: 'Toneladas por hora',
    chart_toneladas_hora_title: 'Produccion, acumulado y meta',
    chart_zoom_activo: 'Zoom activo',
    chart_cumplimiento_kicker: 'Cumplimiento',
    chart_cumplimiento_title: 'Meta de turno',
    chart_turno_tag: (turno) => `Turno ${turno}`,
    chart_heatmap_kicker: 'Heatmap operacional',
    chart_heatmap_title: 'Intensidad por hora y unidad de carguio',
    chart_heatmap_tag: 'Toneladas / celda',
  },
  en: {
    loading: 'Loading shift production...',
    error_prefix: 'We could not load shift production:',
    error_generic: 'We could not load shift production. Try again in a few seconds.',
    error_no_demo_suffix: 'Demonstration data is only shown in an authorized context.',
    error_no_session: 'Session not available. Sign in again to load actual Production.',
    error_session_invalid: 'the session is not valid or does not have permission to view actual Production.',
    sin_plan_label: 'No plan',
    sin_plan_title: 'Target not configured',
    sin_plan_message: 'Actual production is shown from WENCO, but compliance is not evaluated without a shift target.',
    verde_label: 'On track',
    verde_title: 'Rate is sufficient to close above target',
    verde_message: 'Maintain loading continuity and watch low-activity hours to avoid losing the projected advantage.',
    amber_label: 'Preventive',
    amber_title: 'The projection reaches target, but the shift needs monitoring',
    amber_message: 'Review hourly continuity and CAEX assignment before the current gap becomes a risk.',
    red_label: 'At risk',
    red_title: 'The projection falls short of target',
    red_message: 'Prioritize critical loading, available CAEX and destination constraints to recover tonnage within the shift.',
    sin_meta_configurada: 'Target not configured',
    plan_diario: (value) => `${value}/day`,
    sin_plan_diario: 'No daily plan',
    proyeccion_sobre_meta: 'Closing above target',
    proyeccion_riesgo: 'Risk of closing below target',
    sin_evaluacion: 'Not evaluated',
    avance_pct: (pct) => `${pct}% of shift`,
    avance_no_disponible: 'Progress not available',
    faltan_meta: (value) => `${value} remaining to reach shift target.`,
    meta_superada: 'Shift target exceeded with actual production.',
    configurar_meta: 'Configure a shift target to enable gap and compliance tracking.',
    ritmo_requerido: (value) => `Remaining required rate: ${value} t/h.`,
    mantener_ritmo: 'Maintain current rate; the projection is above target.',
    validar_ritmo: 'Validate required rate once a plan exists.',
    mejor_hora_registrada: (hora, value) => `Best recorded hour: ${hora} with ${value}.`,
    esperando_mejor_hora: 'Waiting for actual hours to detect the best hour.',
    header_eyebrow: 'Production',
    header_title: 'Shift control',
    header_desc: 'Executive read on tonnage, compliance, gap and hourly operational trend.',
    header_meta: (source, system, turno, registro) => `${source} - ${system} - ${turno} - Record ${registro}`,
    actualizar: 'Refresh',
    source_cache: 'CACHED REAL DATA',
    source_demo: 'DEMO MODE',
    source_real: 'REAL DATA',
    sin_registro: 'No record',
    lectura_ejecutiva: 'Executive read',
    registro_label: (value) => `Record ${value}`,
    proyeccion_fin_turno: 'End-of-shift projection',
    proyeccion_modelo_regresion: (r2) => `Linear regression · R² ${r2}`,
    proyeccion_modelo_ritmo: 'Shift average pace',
    vs_meta: (value) => `${value} vs target`,
    que_hacer_ahora: 'What to do now',
    sin_ciclos_kicker: 'No cycles for the filter',
    sin_produccion_title: (fecha, turno) => `No production for ${fecha} / ${turno}`,
    sin_produccion_message: (system) => `There is no production for the current shift. The available information comes from ${system}; synthetic data is not shown automatically.`,
    kpi_toneladas_turno: 'Shift tonnage',
    kpi_meta_turno: (value) => `Shift target ${value}`,
    kpi_proyeccion_cierre: 'Closing projection',
    kpi_vs_meta_final: (value) => `${value} vs final target`,
    kpi_meta_no_evaluable: 'Target not evaluable',
    kpi_cumplimiento: 'Compliance',
    kpi_sin_meta: 'No target',
    kpi_contra_meta_final: (value) => `Against final target - ${value}`,
    kpi_brecha_hora: 'Gap at this hour',
    kpi_esperado_no_disponible: 'Expected not available',
    kpi_esperado: (value) => `Expected ${value}`,
    kpi_no_evaluable: 'Not evaluable',
    kpi_sobre_ritmo: 'Above rate',
    kpi_bajo_ritmo: 'Below rate',
    kpi_mejor_hora: 'Best hour',
    kpi_sin_data: 'No data',
    kpi_pico: 'peak',
    chart_toneladas_hora_kicker: 'Tonnage per hour',
    chart_toneladas_hora_title: 'Production, cumulative and target',
    chart_zoom_activo: 'Zoom active',
    chart_cumplimiento_kicker: 'Compliance',
    chart_cumplimiento_title: 'Shift target',
    chart_turno_tag: (turno) => `Shift ${turno}`,
    chart_heatmap_kicker: 'Operational heatmap',
    chart_heatmap_title: 'Intensity by hour and loading unit',
    chart_heatmap_tag: 'Tonnage / cell',
  },
  de: {
    loading: 'Schichtproduktion wird geladen...',
    error_prefix: 'Die Schichtproduktion konnte nicht geladen werden:',
    error_generic: 'Die Schichtproduktion konnte nicht geladen werden. Versuchen Sie es in Kürze erneut.',
    error_no_demo_suffix: 'Demo wird ohne expliziten Backend-Modus nicht verwendet.',
    error_no_session: 'Sitzung nicht verfuegbar. Melden Sie sich erneut an, um echte Produktion zu laden.',
    error_session_invalid: 'die Sitzung ist ungueltig oder hat keine Berechtigung, echte Produktion einzusehen.',
    sin_plan_label: 'Kein Plan',
    sin_plan_title: 'Ziel nicht konfiguriert',
    sin_plan_message: 'Die echte Produktion wird aus WENCO angezeigt, die Zielerreichung wird jedoch ohne Schichtziel nicht bewertet.',
    verde_label: 'Im Plan',
    verde_title: 'Tempo ausreichend, um ueber dem Ziel abzuschliessen',
    verde_message: 'Kontinuitaet der Beladung aufrechterhalten und Schwachlastzeiten beobachten, um den prognostizierten Vorteil nicht zu verlieren.',
    amber_label: 'Praeventiv',
    amber_title: 'Die Prognose erreicht das Ziel, der Schicht bedarf jedoch der Kontrolle',
    amber_message: 'Stuendliche Kontinuitaet und CAEX-Zuordnung pruefen, bevor die Luecke zu dieser Stunde zum Risiko wird.',
    red_label: 'Risiko',
    red_title: 'Die Prognose bleibt unter dem Ziel',
    red_message: 'Kritische Beladung, verfuegbare CAEX und Destinationsbeschraenkungen priorisieren, um Tonnage innerhalb der Schicht zurueckzugewinnen.',
    sin_meta_configurada: 'Kein Ziel konfiguriert',
    plan_diario: (value) => `${value}/Tag`,
    sin_plan_diario: 'Kein Tagesplan',
    proyeccion_sobre_meta: 'Abschluss ueber dem Ziel',
    proyeccion_riesgo: 'Risiko des Abschlusses unter dem Ziel',
    sin_evaluacion: 'Keine Bewertung',
    avance_pct: (pct) => `${pct}% der Schicht`,
    avance_no_disponible: 'Fortschritt nicht verfuegbar',
    faltan_meta: (value) => `Es fehlen ${value} bis zum Schichtziel.`,
    meta_superada: 'Schichtziel mit echter Produktion uebertroffen.',
    configurar_meta: 'Schichtziel konfigurieren, um Luecke und Zielerreichung zu aktivieren.',
    ritmo_requerido: (value) => `Verbleibendes erforderliches Tempo: ${value} t/h.`,
    mantener_ritmo: 'Aktuelles Tempo beibehalten; die Prognose liegt ueber dem Ziel.',
    validar_ritmo: 'Erforderliches Tempo validieren, sobald ein Plan vorliegt.',
    mejor_hora_registrada: (hora, value) => `Beste registrierte Stunde: ${hora} mit ${value}.`,
    esperando_mejor_hora: 'Warte auf echte Stundenwerte, um die beste Stunde zu ermitteln.',
    header_eyebrow: 'Produktion',
    header_title: 'Schichtkontrolle',
    header_desc: 'Exekutive Uebersicht ueber Tonnage, Zielerreichung, Luecke und stuendlichen Betriebsverlauf.',
    header_meta: (source, system, turno, registro) => `${source} - ${system} - ${turno} - Datensatz ${registro}`,
    actualizar: 'Aktualisieren',
    source_cache: 'REALER CACHE',
    source_demo: 'DEMO-MODUS',
    source_real: 'ECHTE DATEN',
    sin_registro: 'Kein Datensatz',
    lectura_ejecutiva: 'Exekutive Uebersicht',
    registro_label: (value) => `Datensatz ${value}`,
    proyeccion_fin_turno: 'Prognose Schichtende',
    proyeccion_modelo_regresion: (r2) => `Lineare Regression · R² ${r2}`,
    proyeccion_modelo_ritmo: 'Durchschnittliches Schichttempo',
    vs_meta: (value) => `${value} vs. Ziel`,
    que_hacer_ahora: 'Was jetzt zu tun ist',
    sin_ciclos_kicker: 'Keine Zyklen fuer den Filter',
    sin_produccion_title: (fecha, turno) => `Keine Produktion fuer ${fecha} / ${turno}`,
    sin_produccion_message: (system) => `Fuer die aktuelle Schicht gibt es keine Produktion. Die verfügbaren Informationen stammen aus ${system}; synthetische Daten werden nicht automatisch angezeigt.`,
    kpi_toneladas_turno: 'Tonnen Schicht',
    kpi_meta_turno: (value) => `Schichtziel ${value}`,
    kpi_proyeccion_cierre: 'Abschlussprognose',
    kpi_vs_meta_final: (value) => `${value} vs. Endziel`,
    kpi_meta_no_evaluable: 'Ziel nicht bewertbar',
    kpi_cumplimiento: 'Zielerreichung',
    kpi_sin_meta: 'Ohne Ziel',
    kpi_contra_meta_final: (value) => `Gegen Endziel - ${value}`,
    kpi_brecha_hora: 'Luecke zu dieser Stunde',
    kpi_esperado_no_disponible: 'Erwartungswert nicht verfuegbar',
    kpi_esperado: (value) => `Erwartet ${value}`,
    kpi_no_evaluable: 'Nicht bewertbar',
    kpi_sobre_ritmo: 'Ueber dem Tempo',
    kpi_bajo_ritmo: 'Unter dem Tempo',
    kpi_mejor_hora: 'Beste Stunde',
    kpi_sin_data: 'Keine Daten',
    kpi_pico: 'Spitze',
    chart_toneladas_hora_kicker: 'Tonnen pro Stunde',
    chart_toneladas_hora_title: 'Produktion, kumuliert und Ziel',
    chart_zoom_activo: 'Zoom aktiv',
    chart_cumplimiento_kicker: 'Zielerreichung',
    chart_cumplimiento_title: 'Schichtziel',
    chart_turno_tag: (turno) => `Schicht ${turno}`,
    chart_heatmap_kicker: 'Operative Heatmap',
    chart_heatmap_title: 'Intensitaet nach Stunde und Beladungseinheit',
    chart_heatmap_tag: 'Tonnen / Zelle',
  },
}
