import { apiFetch } from '../lib/api'

export interface MlPrediction {
  modelo: { tipo: string; n_turnos: number; r2: number; rmse: number; mae: number }
  turno_actual: {
    fecha: string; turno: string; hora_inicio: number; hora_fin: number
    horas_transcurridas: number; horas_restantes: number
  }
  prediccion: {
    produccion_actual: number; proyeccion_final: number; meta_turno: number
    intervalo_inf: number; intervalo_sup: number
    ritmo_actual: number; ritmo_necesario: number
    confianza: number; estado: string; pct_cumplimiento: number
  }
  features: Array<{ nombre: string; importancia: number; grupo: string; descripcion: string }>
  historico: Array<{ label: string; turno: string; predicho: number; real: number; error_pct: number; acertado: boolean }>
  recomendacion: { estado: string; texto_principal: string; acciones: string[]; factor_critico: string }
}

export function fetchMlPrediction(fecha: string, turno: string): Promise<MlPrediction> {
  return apiFetch<MlPrediction>(`/api/ml/prediction?fecha=${encodeURIComponent(fecha)}&turno=${encodeURIComponent(turno)}`)
}
