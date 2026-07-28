import type { ModuleDict } from '../useModuleT'

export interface OperatorCoachingT {
  component_productividad: string
  component_disponibilidad: string
  component_utilizacion: string
  component_control_demoras: string
  component_seguridad: string
  score_vs_flota: (direccion: string, actual: string, promedio: string, deltaSufijo: string) => string
  sobre: string
  bajo: string
  en_linea_con: string
  delta_pct_sufijo: (pct: string) => string
  productividad_vs_flota: (pct: string) => string
  tendencia_al_alza: (antes: string, despues: string, delta: string, turnos: number) => string
  tendencia_a_la_baja: (antes: string, despues: string, delta: string, turnos: number) => string
  tendencia_estable: (turnos: number) => string
  fortaleza_debilidad: (fuerteLabel: string, fuerteValor: string, debilLabel: string, debilValor: string) => string
}

export const operatorCoachingT: ModuleDict<OperatorCoachingT> = {
  es: {
    component_productividad: 'productividad',
    component_disponibilidad: 'disponibilidad',
    component_utilizacion: 'utilizacion',
    component_control_demoras: 'control de demoras',
    component_seguridad: 'seguridad',
    score_vs_flota: (direccion, actual, promedio, deltaSufijo) =>
      `Score global ${direccion} el promedio de la flota (${actual} vs ${promedio}${deltaSufijo}`,
    sobre: 'sobre',
    bajo: 'bajo',
    en_linea_con: 'en linea con',
    delta_pct_sufijo: (pct) => `, ${pct})`,
    productividad_vs_flota: (pct) => ` · productividad ${pct} vs la flota`,
    tendencia_al_alza: (antes, despues, delta, turnos) =>
      `Tendencia al alza: el score paso de ${antes} a ${despues} en el periodo (${delta} pts) a lo largo de ${turnos} turnos medidos.`,
    tendencia_a_la_baja: (antes, despues, delta, turnos) =>
      `Tendencia a la baja: el score paso de ${antes} a ${despues} en el periodo (${delta} pts) a lo largo de ${turnos} turnos medidos.`,
    tendencia_estable: (turnos) => `Score estable en el periodo (${turnos} turnos medidos, variacion menor a 2 puntos).`,
    fortaleza_debilidad: (fuerteLabel, fuerteValor, debilLabel, debilValor) =>
      `Fortaleza: ${fuerteLabel} (${fuerteValor}). Area de mejora prioritaria: ${debilLabel} (${debilValor}).`,
  },
  en: {
    component_productividad: 'productivity',
    component_disponibilidad: 'availability',
    component_utilizacion: 'utilization',
    component_control_demoras: 'delay control',
    component_seguridad: 'safety',
    score_vs_flota: (direccion, actual, promedio, deltaSufijo) =>
      `Global score is ${direccion} the fleet average (${actual} vs ${promedio}${deltaSufijo}`,
    sobre: 'above',
    bajo: 'below',
    en_linea_con: 'in line with',
    delta_pct_sufijo: (pct) => `, ${pct})`,
    productividad_vs_flota: (pct) => ` · productivity ${pct} vs the fleet`,
    tendencia_al_alza: (antes, despues, delta, turnos) =>
      `Upward trend: score went from ${antes} to ${despues} over the period (${delta} pts) across ${turnos} measured shifts.`,
    tendencia_a_la_baja: (antes, despues, delta, turnos) =>
      `Downward trend: score went from ${antes} to ${despues} over the period (${delta} pts) across ${turnos} measured shifts.`,
    tendencia_estable: (turnos) => `Stable score over the period (${turnos} measured shifts, variation under 2 points).`,
    fortaleza_debilidad: (fuerteLabel, fuerteValor, debilLabel, debilValor) =>
      `Strength: ${fuerteLabel} (${fuerteValor}). Priority improvement area: ${debilLabel} (${debilValor}).`,
  },
}
