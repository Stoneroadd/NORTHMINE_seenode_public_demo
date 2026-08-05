import type { ModuleDict } from '../useModuleT'

export interface SimulatorT {
  header_eyebrow: string
  header_title: string
  header_desc: string
  sensitivity_labels: Record<string, string>
  chart_meta_label: string
  mark_equilibrio: (caex: number) => string
  mark_actual: (caex: number) => string
  tooltip_crossover: (caex: number, produccion: string) => string
  narrative_turno_ambos: string
  narrative_turno_solo: (turno: string) => string
  narrative_intro: (caex: number, ciclosHora: number, tonCiclo: number) => string
  narrative_disponibilidad: (disp: number, dias: number, turnoLabel: string) => string
  narrative_produccion: (value: string) => string
  narrative_meta_supera: (value: string, pct: number) => string
  narrative_meta_no_alcanza: (value: string, pct: number) => string
  narrative_caex_minimo: (n: number) => string
  narrative_holgura: (actuales: number, delta: number) => string
  narrative_necesita: (delta: number) => string
  parametros_operacionales: string
  slider_caex: string
  slider_ciclos_hora: string
  slider_ton_ciclo: string
  slider_disponibilidad: string
  slider_dias: string
  turnos_label: string
  restablecer_valores: string
  produccion_estimada: string
  meta_resumen: (meta: string, sign: string, brecha: string, pct: number) => string
  ciclos_totales_caex_minimo: (ciclos: string) => string
  calculando: string
  chart_crossover_kicker: string
  chart_crossover_title: string
  analisis_sensibilidad: string
  narrativa_operacional: string
}

export const simulatorT: ModuleDict<SimulatorT> = {
  es: {
    header_eyebrow: 'Herramientas',
    header_title: 'Simulador de Meta',
    header_desc: 'Ajusta los parámetros operacionales y ve el impacto en producción mensual en tiempo real.',
    sensitivity_labels: {
      ciclos_hora_baja_10pct: 'Si ciclos/hora baja 10%',
      ton_ciclo_baja_10pct: 'Si t/ciclo baja 10%',
      disponibilidad_baja_5pt: 'Si disponibilidad −5%',
    },
    chart_meta_label: 'META · 4.5M t',
    mark_equilibrio: (caex) => `${caex} CAEX\nequilibrio`,
    mark_actual: (caex) => `${caex} CAEX`,
    tooltip_crossover: (caex, produccion) => `CAEX: ${caex}<br/>Producción: ${produccion} t`,
    narrative_turno_ambos: 'ambos turnos',
    narrative_turno_solo: (turno) => `solo turno ${turno}`,
    narrative_intro: (caex, ciclosHora, tonCiclo) =>
      `Con ${caex} CAEX operando a ${ciclosHora} ciclos/hora y ${tonCiclo} t/ciclo,`,
    narrative_disponibilidad: (disp, dias, turnoLabel) =>
      `con disponibilidad ${disp}% durante ${dias} días (${turnoLabel}):`,
    narrative_produccion: (value) => `→ Producción estimada: ${value} t`,
    narrative_meta_supera: (value, pct) => `→ Superas la meta en ${value} t (${pct}%)`,
    narrative_meta_no_alcanza: (value, pct) => `→ No alcanzas la meta en ${value} t (${pct}%)`,
    narrative_caex_minimo: (n) => `→ CAEX mínimo para meta: ${n} equipos`,
    narrative_holgura: (actuales, delta) => `→ Con los ${actuales} actuales tienes holgura de ${delta} equipos`,
    narrative_necesita: (delta) => `→ Necesitas ${delta} equipos más`,
    parametros_operacionales: 'Parámetros operacionales',
    slider_caex: 'CAEX disponibles',
    slider_ciclos_hora: 'Ciclos por hora',
    slider_ton_ciclo: 'Tonelaje por ciclo',
    slider_disponibilidad: 'Disponibilidad',
    slider_dias: 'Días del período',
    turnos_label: 'Turnos',
    restablecer_valores: 'Restablecer valores demo',
    produccion_estimada: 'Producción estimada',
    meta_resumen: (meta, sign, brecha, pct) => `Meta: ${meta} t · ${sign}${brecha} t · ${pct}%`,
    ciclos_totales_caex_minimo: (ciclos) => `Ciclos totales: ${ciclos} · CAEX mínimo para meta:`,
    calculando: 'Calculando...',
    chart_crossover_kicker: 'Curva de producción',
    chart_crossover_title: 'Punto de cruce vs meta',
    analisis_sensibilidad: 'Análisis de sensibilidad',
    narrativa_operacional: 'Narrativa operacional',
  },
  en: {
    header_eyebrow: 'Tools',
    header_title: 'Target Simulator',
    header_desc: 'Adjust operational parameters and see the impact on monthly production in real time.',
    sensitivity_labels: {
      ciclos_hora_baja_10pct: 'If cycles/hour drops 10%',
      ton_ciclo_baja_10pct: 'If t/cycle drops 10%',
      disponibilidad_baja_5pt: 'If availability drops −5%',
    },
    chart_meta_label: 'TARGET · 4.5M t',
    mark_equilibrio: (caex) => `${caex} CAEX\nbreak-even`,
    mark_actual: (caex) => `${caex} CAEX`,
    tooltip_crossover: (caex, produccion) => `CAEX: ${caex}<br/>Production: ${produccion} t`,
    narrative_turno_ambos: 'both shifts',
    narrative_turno_solo: (turno) => `${turno} shift only`,
    narrative_intro: (caex, ciclosHora, tonCiclo) =>
      `With ${caex} CAEX operating at ${ciclosHora} cycles/hour and ${tonCiclo} t/cycle,`,
    narrative_disponibilidad: (disp, dias, turnoLabel) =>
      `with ${disp}% availability over ${dias} days (${turnoLabel}):`,
    narrative_produccion: (value) => `→ Estimated production: ${value} t`,
    narrative_meta_supera: (value, pct) => `→ You exceed the target by ${value} t (${pct}%)`,
    narrative_meta_no_alcanza: (value, pct) => `→ You fall short of the target by ${value} t (${pct}%)`,
    narrative_caex_minimo: (n) => `→ Minimum CAEX for target: ${n} units`,
    narrative_holgura: (actuales, delta) => `→ With the current ${actuales} you have a margin of ${delta} units`,
    narrative_necesita: (delta) => `→ You need ${delta} more units`,
    parametros_operacionales: 'Operational parameters',
    slider_caex: 'Available CAEX',
    slider_ciclos_hora: 'Cycles per hour',
    slider_ton_ciclo: 'Tonnage per cycle',
    slider_disponibilidad: 'Availability',
    slider_dias: 'Period days',
    turnos_label: 'Shifts',
    restablecer_valores: 'Reset to demo values',
    produccion_estimada: 'Estimated production',
    meta_resumen: (meta, sign, brecha, pct) => `Target: ${meta} t · ${sign}${brecha} t · ${pct}%`,
    ciclos_totales_caex_minimo: (ciclos) => `Total cycles: ${ciclos} · Minimum CAEX for target:`,
    calculando: 'Calculating...',
    chart_crossover_kicker: 'Production curve',
    chart_crossover_title: 'Crossover point vs target',
    analisis_sensibilidad: 'Sensitivity analysis',
    narrativa_operacional: 'Operational narrative',
  },
  de: {
    header_eyebrow: 'Werkzeuge',
    header_title: 'Zielsimulator',
    header_desc: 'Passen Sie die Betriebsparameter an und sehen Sie die Auswirkung auf die monatliche Produktion in Echtzeit.',
    sensitivity_labels: {
      ciclos_hora_baja_10pct: 'Wenn Zyklen/Stunde um 10% sinken',
      ton_ciclo_baja_10pct: 'Wenn t/Zyklus um 10% sinkt',
      disponibilidad_baja_5pt: 'Wenn die Verfügbarkeit −5%',
    },
    chart_meta_label: 'ZIEL · 4.5M t',
    mark_equilibrio: (caex) => `${caex} CAEX\nGleichgewicht`,
    mark_actual: (caex) => `${caex} CAEX`,
    tooltip_crossover: (caex, produccion) => `CAEX: ${caex}<br/>Produktion: ${produccion} t`,
    narrative_turno_ambos: 'beide Schichten',
    narrative_turno_solo: (turno) => `nur Schicht ${turno}`,
    narrative_intro: (caex, ciclosHora, tonCiclo) =>
      `Mit ${caex} CAEX, das mit ${ciclosHora} Zyklen/Stunde und ${tonCiclo} t/Zyklus arbeitet,`,
    narrative_disponibilidad: (disp, dias, turnoLabel) =>
      `bei einer Verfügbarkeit von ${disp}% über ${dias} Tage (${turnoLabel}):`,
    narrative_produccion: (value) => `→ Geschätzte Produktion: ${value} t`,
    narrative_meta_supera: (value, pct) => `→ Sie übertreffen das Ziel um ${value} t (${pct}%)`,
    narrative_meta_no_alcanza: (value, pct) => `→ Sie erreichen das Ziel um ${value} t (${pct}%) nicht`,
    narrative_caex_minimo: (n) => `→ Mindest-CAEX für das Ziel: ${n} Geräte`,
    narrative_holgura: (actuales, delta) => `→ Mit den aktuellen ${actuales} haben Sie eine Reserve von ${delta} Geräten`,
    narrative_necesita: (delta) => `→ Sie benötigen ${delta} weitere Geräte`,
    parametros_operacionales: 'Betriebsparameter',
    slider_caex: 'Verfügbare CAEX',
    slider_ciclos_hora: 'Zyklen pro Stunde',
    slider_ton_ciclo: 'Tonnen pro Zyklus',
    slider_disponibilidad: 'Verfügbarkeit',
    slider_dias: 'Tage des Zeitraums',
    turnos_label: 'Schichten',
    restablecer_valores: 'Demo-Werte zurücksetzen',
    produccion_estimada: 'Geschätzte Produktion',
    meta_resumen: (meta, sign, brecha, pct) => `Ziel: ${meta} t · ${sign}${brecha} t · ${pct}%`,
    ciclos_totales_caex_minimo: (ciclos) => `Gesamte Zyklen: ${ciclos} · Mindest-CAEX für das Ziel:`,
    calculando: 'Wird berechnet...',
    chart_crossover_kicker: 'Produktionskurve',
    chart_crossover_title: 'Schnittpunkt vs. Ziel',
    analisis_sensibilidad: 'Sensitivitätsanalyse',
    narrativa_operacional: 'Operative Narrativ',
  },
}
