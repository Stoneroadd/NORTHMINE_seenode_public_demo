import type { ModuleDict } from '../useModuleT'

export interface ExpertAnalysisT {
  loading_label: string
  error_detail: string
  eyebrow: string
  title: string
  description: string
  cycles_historized: (count: string, from: string, to: string) => string

  no_history_yet: string

  cost_of_unavailability_kicker: string
  lost_tons_by_breakdowns_title: string
  total_label: (tons: string) => string
  lost_tons_explanation: string
  lost_tons_detail: string

  maintenance_quality_kicker: string
  breakdowns_after_pm_title: string
  pct_within_7_days: (pct: number) => string
  no_data_tag: string
  breakdowns_after_pm_explanation: string
  case_singular: string
  case_plural: string
  no_repeated_cases: string

  backtesting_kicker: string
  shift_target_vs_reality_title: string
  shifts_analyzed: (count: number) => string
  current_target: string
  typical_shift: string
  times_met: string
  demand_percentile: string
  out_of_100: (percentile: number) => string
  percentile_reading_hint: string
  needs_more_shifts: string
}

export const expertAnalysisT: ModuleDict<ExpertAnalysisT> = {
  es: {
    loading_label: 'Cruzando produccion y mantencion...',
    error_detail: 'No se pudo cargar el analisis experto.',
    eyebrow: 'Analisis Experto',
    title: 'Produccion x Mantencion, en simple',
    description: 'Cada tarjeta responde una pregunta de negocio con los datos historicos reales.',
    cycles_historized: (count, from, to) => `${count} ciclos historizados (${from} a ${to})`,

    no_history_yet: 'Aun no hay suficiente historia para el analisis. Los ciclos se acumulan automaticamente.',

    cost_of_unavailability_kicker: 'Costo de indisponibilidad',
    lost_tons_by_breakdowns_title: 'Toneladas perdidas por averias, por equipo',
    total_label: (tons) => `Total: ${tons}`,
    lost_tons_explanation: 'Como se calcula: lo que el equipo mueve en un dia normal x los dias que estuvo detenido por averia. Es un techo teorico (parte de la carga la absorben otros equipos), pero ordena las prioridades por plata, no por horas.',
    lost_tons_detail: 'Detalle: dias detenido x produccion diaria promedio de cada equipo (solo averias correctivas).',

    maintenance_quality_kicker: 'Calidad de mantencion',
    breakdowns_after_pm_title: 'Averias justo despues de una PM',
    pct_within_7_days: (pct) => `${pct}% en 7 dias`,
    no_data_tag: 'sin datos',
    breakdowns_after_pm_explanation: 'Si un equipo se avería a los pocos dias de salir de mantencion programada, la intervencion probablemente no resolvio el problema de fondo. Estos son los equipos donde mas se repite:',
    case_singular: 'caso',
    case_plural: 'casos',
    no_repeated_cases: 'Sin casos repetidos en la ventana.',

    backtesting_kicker: 'Backtesting',
    shift_target_vs_reality_title: 'La meta de turno contra la realidad',
    shifts_analyzed: (count) => `${count} turnos`,
    current_target: 'Meta actual',
    typical_shift: 'Turno tipico (mediana real)',
    times_met: 'Veces que se cumplio',
    demand_percentile: 'Exigencia (percentil)',
    out_of_100: (percentile) => `${percentile} de 100`,
    percentile_reading_hint: 'Lectura: percentil bajo = meta facil (casi todos los turnos la superan); percentil 40-75 = exigente pero alcanzable; sobre 75 = se cumple pocas veces y desmotiva.',
    needs_more_shifts: 'Se necesitan al menos 10 turnos historizados.',
  },
  en: {
    loading_label: 'Cross-referencing production and maintenance...',
    error_detail: 'Could not load the expert analysis.',
    eyebrow: 'Expert Analysis',
    title: 'Production x Maintenance, made simple',
    description: 'Each card answers a business question using real historical data.',
    cycles_historized: (count, from, to) => `${count} historized cycles (${from} to ${to})`,

    no_history_yet: 'Not enough history yet for the analysis. Cycles accumulate automatically.',

    cost_of_unavailability_kicker: 'Cost of unavailability',
    lost_tons_by_breakdowns_title: 'Tons lost to breakdowns, by equipment',
    total_label: (tons) => `Total: ${tons}`,
    lost_tons_explanation: 'How it is calculated: what the equipment moves on a normal day x the days it was stopped due to breakdown. It is a theoretical ceiling (part of the load is absorbed by other equipment), but it ranks priorities by money, not by hours.',
    lost_tons_detail: 'Detail: days stopped x average daily production of each equipment (corrective breakdowns only).',

    maintenance_quality_kicker: 'Maintenance quality',
    breakdowns_after_pm_title: 'Breakdowns right after a PM',
    pct_within_7_days: (pct) => `${pct}% within 7 days`,
    no_data_tag: 'no data',
    breakdowns_after_pm_explanation: 'If a piece of equipment breaks down a few days after coming out of scheduled maintenance, the intervention probably did not solve the underlying problem. These are the equipment where it repeats the most:',
    case_singular: 'case',
    case_plural: 'cases',
    no_repeated_cases: 'No repeated cases in the window.',

    backtesting_kicker: 'Backtesting',
    shift_target_vs_reality_title: 'Shift target versus reality',
    shifts_analyzed: (count) => `${count} shifts`,
    current_target: 'Current target',
    typical_shift: 'Typical shift (real median)',
    times_met: 'Times met',
    demand_percentile: 'Demand (percentile)',
    out_of_100: (percentile) => `${percentile} out of 100`,
    percentile_reading_hint: 'Reading: low percentile = easy target (almost every shift beats it); percentile 40-75 = demanding but achievable; above 75 = met rarely and demotivates.',
    needs_more_shifts: 'At least 10 historized shifts are needed.',
  },
}
