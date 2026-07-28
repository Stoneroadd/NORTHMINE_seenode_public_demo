import type { OperatorRankingDetail, OperatorRankingItem, OperatorScoreBreakdown, OperatorTrendPoint } from '../types/operatorRanking'
import type { OperatorCoachingT } from '../i18n/modules/operatorCoaching'

// Coaching automatico por operador: convierte datos que la ficha ya carga
// (score_breakdown, fleet_average, trend) en 3-4 frases accionables, en vez
// de solo mostrar numeros. Reglas deterministas sobre datos reales - nada
// se inventa, todo se puede verificar contra las cifras de al lado.
// Bilingue (es/en) via las plantillas de operatorCoachingT, resueltas por
// el caller segun idioma.

function componentLabels(t: OperatorCoachingT): Record<keyof Omit<OperatorScoreBreakdown, 'score_global'>, string> {
  return {
    productividad_score: t.component_productividad,
    disponibilidad_score: t.component_disponibilidad,
    utilizacion_score: t.component_utilizacion,
    control_demoras_score: t.component_control_demoras,
    seguridad_score: t.component_seguridad,
  }
}

function pctDiff(actual: number, referencia: number): number {
  if (!referencia) return 0
  return Math.round(((actual - referencia) / referencia) * 1000) / 10
}

function signed(value: number, digits = 1): string {
  return `${value > 0 ? '+' : ''}${value.toFixed(digits)}`
}

export function buildOperatorCoaching(
  t: OperatorCoachingT,
  current: OperatorRankingItem,
  detail?: OperatorRankingDetail | null,
): string[] {
  const insights: string[] = []
  const breakdown = detail?.score_breakdown
  const fleetAvg = detail?.fleet_average
  const trend = detail?.trend ?? []

  // 1. Comparacion con el promedio de la flota (mismo filtro aplicado).
  if (fleetAvg) {
    const diffScore = pctDiff(current.score_global, fleetAvg.score_global)
    const diffProd = pctDiff(current.productividad_score, fleetAvg.productividad_score)
    const direccionScore = diffScore > 3 ? t.sobre : diffScore < -3 ? t.bajo : t.en_linea_con
    const deltaSufijo = Math.abs(diffScore) > 3 ? t.delta_pct_sufijo(`${signed(diffScore)}%`) : ')'
    insights.push(
      t.score_vs_flota(direccionScore, current.score_global.toFixed(1), fleetAvg.score_global.toFixed(1), deltaSufijo)
      + (Math.abs(diffProd) > 5 ? t.productividad_vs_flota(`${signed(diffProd)}%`) : ''),
    )
  }

  // 2. Tendencia reciente (primera mitad vs segunda mitad de las mediciones).
  if (trend.length >= 4) {
    const mid = Math.floor(trend.length / 2)
    const promedio = (points: OperatorTrendPoint[]) =>
      points.reduce((sum, point) => sum + point.score_global, 0) / points.length
    const antes = promedio(trend.slice(0, mid))
    const despues = promedio(trend.slice(mid))
    const delta = despues - antes
    if (Math.abs(delta) >= 2) {
      const template = delta > 0 ? t.tendencia_al_alza : t.tendencia_a_la_baja
      insights.push(template(antes.toFixed(1), despues.toFixed(1), signed(delta), trend.length))
    } else {
      insights.push(t.tendencia_estable(trend.length))
    }
  }

  // 3. Fortaleza y area de mejora, segun el desglose ponderado del score.
  if (breakdown) {
    const labels = componentLabels(t)
    const componentes = (Object.keys(labels) as Array<keyof typeof labels>)
      .map((key) => ({ key, label: labels[key], value: breakdown[key] }))
      .sort((a, b) => b.value - a.value)
    const fuerte = componentes[0]
    const debil = componentes[componentes.length - 1]
    if (fuerte && debil && fuerte.key !== debil.key) {
      insights.push(t.fortaleza_debilidad(fuerte.label, fuerte.value.toFixed(1), debil.label, debil.value.toFixed(1)))
    }
  }

  return insights
}
