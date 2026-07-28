import { apiFetch } from '../lib/api'

export interface SimResult {
  inputs: { caex: number; ciclos_hora: number; ton_ciclo: number; disponibilidad: number; dias: number; turno: string }
  resultado: { produccion_estimada: number; meta_mes: number; brecha: number; estado: string; ciclos_totales: number; caex_minimo: number; pct_meta: number }
  curva_caex: Array<{ caex: number; produccion: number; sobre_meta: boolean }>
  sensibilidad: {
    ciclos_hora_baja_10pct: { produccion: number; delta: number; estado: string }
    ton_ciclo_baja_10pct:   { produccion: number; delta: number; estado: string }
    disponibilidad_baja_5pt: { produccion: number; delta: number; estado: string }
  }
}

export interface SimInputs {
  caex: number
  ciclos_hora: number
  ton_ciclo: number
  disponibilidad: number  // 0-100 (UI %)
  dias: number
  turno: string
}

export function runSimulator(inputs: SimInputs): Promise<SimResult> {
  return apiFetch<SimResult>('/api/simulator/run', {
    method: 'POST',
    body: JSON.stringify({
      ...inputs,
      disponibilidad: inputs.disponibilidad / 100,
    }),
  })
}
