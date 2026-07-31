export const DEMO_ACCESS_INTERESTS = [
  'Cockpit operacional',
  'Produccion',
  'Flota CAEX',
  'Carguio',
  'Riesgos y alertas',
  'Mapa 3D',
  'Prediccion y simulacion',
  'Integracion con datos operacionales',
  'Otro',
] as const

export type DemoAccessInterest = (typeof DEMO_ACCESS_INTERESTS)[number]

export type DemoAccessRequestStatus = 'pending' | 'approved' | 'rejected'

export interface DemoAccessRequestPayload {
  first_name: string
  last_name: string
  email: string
  company: string
  role: string
  country: string
  operation_type?: string
  fleet_size_range?: string
  interests: DemoAccessInterest[]
  message?: string
  phone?: string
  consent_accepted: boolean
  consent_version: string
  website?: string
}

export interface DemoAccessRequestReceipt {
  accepted: true
  message: string
  reference: string
}

export interface DemoAccessRequestAdminRecord {
  id: string
  created_at: string
  updated_at: string
  first_name: string
  last_name: string
  email_normalized: string
  company: string
  role: string
  country: string
  operation_type: string | null
  fleet_size_range: string | null
  interests: DemoAccessInterest[]
  message: string | null
  phone_optional: string | null
  consent_accepted: boolean
  consent_version: string
  status: DemoAccessRequestStatus
  reviewed_at: string | null
  reviewed_by: string | null
  internal_notes: string | null
  source: string
}

export interface DemoAccessRequestList {
  items: DemoAccessRequestAdminRecord[]
  total: number
}
