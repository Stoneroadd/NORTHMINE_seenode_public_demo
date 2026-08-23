import type { ModuleDict } from '../useModuleT'

export interface PerformanceT {
  period_7d: string
  period_14d: string
  period_month: string
  period_custom: string
  loading: string
  error: string
  header_eyebrow: string
  header_title: string
  header_desc: string
  header_meta: (desde: string, hasta: string) => string
  desde_label: string
  hasta_label: string
  kpi_total_periodo: string
  kpi_toneladas: string
  kpi_dias: (n: number) => string
  kpi_ciclos: string
  kpi_total_periodo_trend: string
  kpi_wenco: string
  kpi_prom_dia: string
  kpi_media_diaria: string
  kpi_periodo: string
  kpi_mejor_dia: string
  kpi_peor_dia: string
  kpi_plan_pct: (pct: number) => string
  concentracion_horaria: string
  top3_verde: string
  curva_promedio: string
  produccion_por_hora: string
  desviacion: string
  rendimiento_pala: string
  toneladas_ciclos: string
  click_barra: string
  heatmap_operacional: string
  produccion_hora_dia: string
  heatmap_max: (weekday: string, label: string) => string
  weekdays: string[]
  tooltip_peak: (label: string, promedio: string, pct: number) => string
  tooltip_heatmap: (day: string, hour: string, promedio: string, ranking: number) => string
  tooltip_loader: (carguioId: string, toneladas: string, ciclos: string, tonCiclo: string) => string
  loader_bar_label: (toneladas: string, ciclos: string, tonCiclo: string) => string
  series_banda_superior: string
  series_confianza: string
  series_promedio: string
  mark_pico: string
}

export const performanceT: ModuleDict<PerformanceT> = {
  es: {
    period_7d: 'Ultimos 7 dias',
    period_14d: 'Ultimos 14 dias',
    period_month: 'Este mes',
    period_custom: 'Personalizado',
    loading: 'Cargando rendimiento operacional...',
    error: 'No pudimos cargar el resumen de rendimiento. Reintenta en unos segundos.',
    header_eyebrow: 'Rendimiento',
    header_title: 'Analitica horaria y productividad',
    header_desc: 'Patrones por hora, dia de semana y unidad de carguio con datos reales WENCO/SQL.',
    header_meta: (desde, hasta) => `${desde} -> ${hasta}`,
    desde_label: 'Desde',
    hasta_label: 'Hasta',
    kpi_total_periodo: 'Total periodo',
    kpi_toneladas: 'Toneladas',
    kpi_dias: (n) => `${n} dias`,
    kpi_ciclos: 'Ciclos',
    kpi_total_periodo_trend: 'Total periodo',
    kpi_wenco: 'WENCO',
    kpi_prom_dia: 'Prom/dia',
    kpi_media_diaria: 'Media diaria',
    kpi_periodo: 'periodo',
    kpi_mejor_dia: 'Mejor dia',
    kpi_peor_dia: 'Peor dia',
    kpi_plan_pct: (pct) => `${pct}% plan`,
    concentracion_horaria: 'Concentracion horaria',
    top3_verde: 'Top 3 verde',
    curva_promedio: 'Curva promedio',
    produccion_por_hora: 'Produccion por hora',
    desviacion: '+/- 1 desv.',
    rendimiento_pala: 'Rendimiento por pala',
    toneladas_ciclos: 'Toneladas y ciclos',
    click_barra: 'Click barra',
    heatmap_operacional: 'Heatmap operacional',
    produccion_hora_dia: 'Produccion por hora y dia de semana',
    heatmap_max: (weekday, label) => `Max ${weekday} ${label}`,
    weekdays: ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'],
    tooltip_peak: (label, promedio, pct) =>
      `<strong>${label}</strong><br/>Promedio: <strong>${promedio}</strong><br/>Participacion: <strong>${pct}%</strong>`,
    tooltip_heatmap: (day, hour, promedio, ranking) =>
      `<strong>${day} ${hour}</strong><br/>Promedio: <strong>${promedio}</strong><br/>Ranking: <strong>#${ranking}</strong>`,
    tooltip_loader: (carguioId, toneladas, ciclos, tonCiclo) =>
      `<strong>${carguioId}</strong><br/>${toneladas}<br/>${ciclos} ciclos<br/>${tonCiclo} t/ciclo`,
    loader_bar_label: (toneladas, ciclos, tonCiclo) => `${toneladas}  ${ciclos} ciclos  ${tonCiclo} t/ciclo`,
    series_banda_superior: 'Banda superior',
    series_confianza: 'Confianza',
    series_promedio: 'Promedio',
    mark_pico: 'Pico',
  },
  en: {
    period_7d: 'Last 7 days',
    period_14d: 'Last 14 days',
    period_month: 'This month',
    period_custom: 'Custom',
    loading: 'Loading operational performance...',
    error: 'We could not load the performance summary. Try again in a few seconds.',
    header_eyebrow: 'Performance',
    header_title: 'Hourly analytics and productivity',
    header_desc: 'Patterns by hour, weekday and loading unit with real WENCO/SQL data.',
    header_meta: (desde, hasta) => `${desde} -> ${hasta}`,
    desde_label: 'From',
    hasta_label: 'To',
    kpi_total_periodo: 'Period total',
    kpi_toneladas: 'Tonnage',
    kpi_dias: (n) => `${n} days`,
    kpi_ciclos: 'Cycles',
    kpi_total_periodo_trend: 'Period total',
    kpi_wenco: 'WENCO',
    kpi_prom_dia: 'Avg/day',
    kpi_media_diaria: 'Daily average',
    kpi_periodo: 'period',
    kpi_mejor_dia: 'Best day',
    kpi_peor_dia: 'Worst day',
    kpi_plan_pct: (pct) => `${pct}% plan`,
    concentracion_horaria: 'Hourly concentration',
    top3_verde: 'Top 3 green',
    curva_promedio: 'Average curve',
    produccion_por_hora: 'Production per hour',
    desviacion: '+/- 1 std. dev.',
    rendimiento_pala: 'Performance per loader',
    toneladas_ciclos: 'Tonnage and cycles',
    click_barra: 'Click bar',
    heatmap_operacional: 'Operational heatmap',
    produccion_hora_dia: 'Production by hour and weekday',
    heatmap_max: (weekday, label) => `Max ${weekday} ${label}`,
    weekdays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    tooltip_peak: (label, promedio, pct) =>
      `<strong>${label}</strong><br/>Average: <strong>${promedio}</strong><br/>Share: <strong>${pct}%</strong>`,
    tooltip_heatmap: (day, hour, promedio, ranking) =>
      `<strong>${day} ${hour}</strong><br/>Average: <strong>${promedio}</strong><br/>Ranking: <strong>#${ranking}</strong>`,
    tooltip_loader: (carguioId, toneladas, ciclos, tonCiclo) =>
      `<strong>${carguioId}</strong><br/>${toneladas}<br/>${ciclos} cycles<br/>${tonCiclo} t/cycle`,
    loader_bar_label: (toneladas, ciclos, tonCiclo) => `${toneladas}  ${ciclos} cycles  ${tonCiclo} t/cycle`,
    series_banda_superior: 'Upper band',
    series_confianza: 'Confidence',
    series_promedio: 'Average',
    mark_pico: 'Peak',
  },
  de: {
    period_7d: 'Letzte 7 Tage',
    period_14d: 'Letzte 14 Tage',
    period_month: 'Dieser Monat',
    period_custom: 'Benutzerdefiniert',
    loading: 'Betriebsleistung wird geladen...',
    error: 'NORTHMINE konnte nicht geladen werden.',
    header_eyebrow: 'Leistung',
    header_title: 'Stündliche Analyse und Produktivität',
    header_desc: 'Muster nach Stunde, Wochentag und Ladeeinheit mit echten WENCO/SQL-Daten.',
    header_meta: (desde, hasta) => `${desde} -> ${hasta}`,
    desde_label: 'Von',
    hasta_label: 'Bis',
    kpi_total_periodo: 'Zeitraum gesamt',
    kpi_toneladas: 'Tonnen',
    kpi_dias: (n) => `${n} Tage`,
    kpi_ciclos: 'Zyklen',
    kpi_total_periodo_trend: 'Zeitraum gesamt',
    kpi_wenco: 'WENCO',
    kpi_prom_dia: 'Ø/Tag',
    kpi_media_diaria: 'Tagesdurchschnitt',
    kpi_periodo: 'Zeitraum',
    kpi_mejor_dia: 'Bester Tag',
    kpi_peor_dia: 'Schlechtester Tag',
    kpi_plan_pct: (pct) => `${pct}% Plan`,
    concentracion_horaria: 'Stündliche Konzentration',
    top3_verde: 'Top 3 grün',
    curva_promedio: 'Durchschnittskurve',
    produccion_por_hora: 'Produktion pro Stunde',
    desviacion: '+/- 1 Std.-Abw.',
    rendimiento_pala: 'Leistung pro Lader',
    toneladas_ciclos: 'Tonnen und Zyklen',
    click_barra: 'Balken klicken',
    heatmap_operacional: 'Operative Heatmap',
    produccion_hora_dia: 'Produktion nach Stunde und Wochentag',
    heatmap_max: (weekday, label) => `Max ${weekday} ${label}`,
    weekdays: ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'],
    tooltip_peak: (label, promedio, pct) =>
      `<strong>${label}</strong><br/>Durchschnitt: <strong>${promedio}</strong><br/>Anteil: <strong>${pct}%</strong>`,
    tooltip_heatmap: (day, hour, promedio, ranking) =>
      `<strong>${day} ${hour}</strong><br/>Durchschnitt: <strong>${promedio}</strong><br/>Rang: <strong>#${ranking}</strong>`,
    tooltip_loader: (carguioId, toneladas, ciclos, tonCiclo) =>
      `<strong>${carguioId}</strong><br/>${toneladas}<br/>${ciclos} Zyklen<br/>${tonCiclo} t/Zyklus`,
    loader_bar_label: (toneladas, ciclos, tonCiclo) => `${toneladas}  ${ciclos} Zyklen  ${tonCiclo} t/Zyklus`,
    series_banda_superior: 'Obere Bande',
    series_confianza: 'Konfidenz',
    series_promedio: 'Durchschnitt',
    mark_pico: 'Spitze',
  },
}
