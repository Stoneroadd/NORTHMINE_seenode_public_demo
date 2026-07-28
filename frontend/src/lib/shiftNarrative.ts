import type { CycleAnomaly, ShiftCaexRankingItem, ShiftCurrentResponse } from './api'
import type { ShiftNarrativeT } from '../i18n/modules/shiftNarrative'

// Resumen ejecutivo narrado del turno: compone parrafos a partir de datos que
// la pagina de Turno Actual ya tiene cargados (KPIs, anomalias de ciclo,
// CAEX bajo promedio). Genera-solo, sin llamar a un LLM: reglas
// deterministas sobre numeros reales, para que el texto siempre sea
// verificable contra las cifras que se muestran al lado. Bilingue (es/en)
// via las plantillas de shiftNarrativeT, resuelto por el caller segun idioma.

function tons(value: number): string {
  return `${Math.round(value).toLocaleString('es-CL')} t`
}

export function buildShiftNarrative(params: {
  t: ShiftNarrativeT
  data: ShiftCurrentResponse
  caex: ShiftCaexRankingItem[]
  lowAverageCount: number
  anomalies: CycleAnomaly[]
}): string[] {
  const { t, data, caex, lowAverageCount, anomalies } = params
  const paragraphs: string[] = []

  // 1. Resultado del turno contra la meta.
  const elapsedHours = Math.floor(data.elapsed_minutes / 60)
  const elapsedMin = data.elapsed_minutes % 60
  const cumplimiento = data.cumplimiento_pct
  const estadoMeta = cumplimiento >= 100
    ? t.estado_sobre_meta
    : cumplimiento >= 90
      ? t.estado_cerca_meta
      : cumplimiento >= 70
        ? t.estado_brecha_moderada
        : t.estado_brecha_importante
  paragraphs.push(
    t.parrafo1({
      shiftLabel: data.shift_label,
      fecha: data.fecha,
      horas: elapsedHours,
      minutos: String(elapsedMin).padStart(2, '0'),
      toneladas: tons(data.toneladas_turno),
      meta: tons(data.meta_turno),
      cumplimiento: cumplimiento.toFixed(1),
      estado: estadoMeta,
    })
    + (data.brecha_ton < 0 ? t.brecha_sufijo(tons(Math.abs(data.brecha_ton))) : '.'),
  )

  // 2. Lo destacado: mejor/peor CAEX, equipos sin actividad/averia, anomalias.
  const sorted = [...caex].sort((a, b) => b.toneladas - a.toneladas)
  const mejor = sorted[0]
  const criticas = anomalies.filter((item) => item.severidad === 'CRITICA')
  const destacadoParts: string[] = []
  if (mejor) {
    destacadoParts.push(t.lidera_turno(mejor.caex_id, tons(mejor.toneladas), mejor.ciclos))
  }
  if (lowAverageCount > 0) {
    destacadoParts.push(t.caex_bajo_promedio(lowAverageCount))
  }
  if (data.caex_sin_actividad > 0) {
    destacadoParts.push(t.sin_actividad(data.caex_sin_actividad))
  }
  if (data.caex_posible_averia > 0) {
    destacadoParts.push(t.posible_averia(data.caex_posible_averia))
  }
  if (criticas.length > 0) {
    destacadoParts.push(t.anomalias_criticas(criticas.length))
  }
  if (destacadoParts.length) {
    paragraphs.push(t.lo_destacado(destacadoParts.join('; ')))
  }

  // 3. Recomendacion / causa probable de la brecha (solo si hay brecha real).
  if (cumplimiento < 90) {
    const causas: string[] = []
    if (criticas.length > 0) causas.push(t.causa_criticas(criticas.length))
    if (lowAverageCount > 0) causas.push(t.causa_bajo_promedio(lowAverageCount))
    if (data.caex_posible_averia > 0) causas.push(t.causa_posible_averia(data.caex_posible_averia))
    const recomendacion = causas.length
      ? t.brecha_explicada(causas.join(' y '))
      : t.sin_causa_evidente
    paragraphs.push(recomendacion)
  } else if (cumplimiento >= 100) {
    paragraphs.push(t.sobre_meta_mensaje)
  }

  return paragraphs
}
