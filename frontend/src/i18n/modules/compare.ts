import type { ModuleDict } from '../useModuleT'

export interface CompareT {
  loading: string
  error_detail: string
  header_eyebrow: string
  header_title: string
  header_description: string
  preset_week: string
  preset_month: string
  preset_half_month: string
  preset_custom: string
  custom_range_label: (key: 'desde_a' | 'hasta_a' | 'desde_b' | 'hasta_b') => string
  period_a: string
  period_b: string
  cycles_per_day: (cycles: string, perDay: string) => string
  table_kicker: string
  table_title: string
  table_tag: (n: number) => string
  th_kpi: string
  th_period_a: string
  th_period_b: string
  th_variation: string
  th_trend: string
  hourly_kicker: string
  hourly_title: string
  loader_kicker: string
  loader_title: string
  loader_tag: string
  best_worst_title: string
  best_label: string
  worst_label: string
  pct_of_plan: (pct: number) => string
  tooltip_period_a: string
  tooltip_period_b: string
  tooltip_diff: string
}

export const compareT: ModuleDict<CompareT> = {
  es: {
    loading: 'Cargando comparativa operacional...',
    error_detail: 'No pudimos cargar la comparativa. Reintenta en unos segundos.',
    header_eyebrow: 'Comparativa',
    header_title: 'Periodos operacionales',
    header_description: 'Comparacion de tonelaje, ciclos, hora a hora y rendimiento por pala.',
    preset_week: 'Semana vs anterior',
    preset_month: 'Mes vs anterior',
    preset_half_month: 'Quincenas',
    preset_custom: 'Personalizado',
    custom_range_label: (key) => ({
      desde_a: 'DESDE A',
      hasta_a: 'HASTA A',
      desde_b: 'DESDE B',
      hasta_b: 'HASTA B',
    }[key]),
    period_a: 'Periodo A',
    period_b: 'Periodo B',
    cycles_per_day: (cycles, perDay) => `${cycles} ciclos · ${perDay}/dia`,
    table_kicker: 'Tabla comparativa',
    table_title: 'KPIs detallados',
    table_tag: (n) => `${n} indicadores`,
    th_kpi: 'KPI',
    th_period_a: 'Per. A',
    th_period_b: 'Per. B',
    th_variation: 'Variacion',
    th_trend: 'Tendencia',
    hourly_kicker: 'Hora a hora',
    hourly_title: 'Dos periodos',
    loader_kicker: 'Por pala',
    loader_title: 'Barras dobles',
    loader_tag: 'Click barra',
    best_worst_title: 'Mejor y peor dia',
    best_label: 'Mejor',
    worst_label: 'Peor',
    pct_of_plan: (pct) => `${pct}% plan`,
    tooltip_period_a: 'Periodo A',
    tooltip_period_b: 'Periodo B',
    tooltip_diff: 'Diferencia',
  },
  en: {
    loading: 'Loading operational comparison...',
    error_detail: 'We could not load the comparison. Try again in a few seconds.',
    header_eyebrow: 'Comparison',
    header_title: 'Operational periods',
    header_description: 'Comparison of tonnage, cycles, hour-by-hour and loading unit performance.',
    preset_week: 'Week vs previous',
    preset_month: 'Month vs previous',
    preset_half_month: 'Half-months',
    preset_custom: 'Custom',
    custom_range_label: (key) => ({
      desde_a: 'FROM A',
      hasta_a: 'TO A',
      desde_b: 'FROM B',
      hasta_b: 'TO B',
    }[key]),
    period_a: 'Period A',
    period_b: 'Period B',
    cycles_per_day: (cycles, perDay) => `${cycles} cycles · ${perDay}/day`,
    table_kicker: 'Comparison table',
    table_title: 'Detailed KPIs',
    table_tag: (n) => `${n} indicators`,
    th_kpi: 'KPI',
    th_period_a: 'Per. A',
    th_period_b: 'Per. B',
    th_variation: 'Variation',
    th_trend: 'Trend',
    hourly_kicker: 'Hour by hour',
    hourly_title: 'Two periods',
    loader_kicker: 'By loading unit',
    loader_title: 'Double bars',
    loader_tag: 'Click bar',
    best_worst_title: 'Best and worst day',
    best_label: 'Best',
    worst_label: 'Worst',
    pct_of_plan: (pct) => `${pct}% of plan`,
    tooltip_period_a: 'Period A',
    tooltip_period_b: 'Period B',
    tooltip_diff: 'Difference',
  },
  de: {
    loading: 'Lade betrieblichen Vergleich...',
    error_detail: 'Der Endpunkt /api/compare konnte nicht geladen werden.',
    header_eyebrow: 'Vergleich',
    header_title: 'Betriebszeiträume',
    header_description: 'Vergleich von Tonnage, Zyklen, Stunde für Stunde und Leistung je Bagger.',
    preset_week: 'Woche vs. Vorwoche',
    preset_month: 'Monat vs. Vormonat',
    preset_half_month: 'Halbmonate',
    preset_custom: 'Benutzerdefiniert',
    custom_range_label: (key) => ({
      desde_a: 'VON A',
      hasta_a: 'BIS A',
      desde_b: 'VON B',
      hasta_b: 'BIS B',
    }[key]),
    period_a: 'Zeitraum A',
    period_b: 'Zeitraum B',
    cycles_per_day: (cycles, perDay) => `${cycles} Zyklen · ${perDay}/Tag`,
    table_kicker: 'Vergleichstabelle',
    table_title: 'Detaillierte KPIs',
    table_tag: (n) => `${n} Kennzahlen`,
    th_kpi: 'KPI',
    th_period_a: 'Per. A',
    th_period_b: 'Per. B',
    th_variation: 'Variation',
    th_trend: 'Trend',
    hourly_kicker: 'Stunde für Stunde',
    hourly_title: 'Zwei Zeiträume',
    loader_kicker: 'Je Bagger',
    loader_title: 'Doppelte Balken',
    loader_tag: 'Balken anklicken',
    best_worst_title: 'Bester und schlechtester Tag',
    best_label: 'Best',
    worst_label: 'Schlechtester',
    pct_of_plan: (pct) => `${pct}% Plan`,
    tooltip_period_a: 'Zeitraum A',
    tooltip_period_b: 'Zeitraum B',
    tooltip_diff: 'Differenz',
  },
}
