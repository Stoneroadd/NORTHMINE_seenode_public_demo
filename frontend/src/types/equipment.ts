export interface EquipmentCycleTimes {
  tiempo_vacio_min: number | null
  tiempo_cargado_min: number | null
  total_ciclo: number | null
}

export interface EquipmentHourlyPoint {
  hora: number
  toneladas: number
  ciclos: number
}

export interface EquipmentAlert {
  id: string
  titulo: string
  severidad: 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAJA' | string
  descripcion: string
  recomendacion: string
}

export interface EquipmentEvent {
  timestamp: string
  tipo: string
  descripcion: string
  duracion_min: number | null
  impacto_toneladas: number
}

export interface EquipmentDetail {
  source: string
  equipment_id: string
  model: string
  family: 'carguio' | 'caex' | 'apoyo' | 'unknown' | string
  family_label: string
  status: string
  operator: string | null
  location: string
  shift: string
  last_activity: string
  image_key?: string
  toneladas_turno: number
  ciclos_turno: number
  rendimiento_tph: number
  disponibilidad_pct: number | null
  utilizacion_pct: number | null
  velocidad_promedio: number | null
  velocidad_maxima: number | null
  alert_count: number
  delay_minutes: number
  risk_level: 'BAJO' | 'MEDIO' | 'CRITICO' | string
  recommendation: string
  cycle_times: EquipmentCycleTimes
  hourly_history: EquipmentHourlyPoint[]
  alerts: EquipmentAlert[]
  events: EquipmentEvent[]
}
