import type { ModuleDict } from '../useModuleT'

export interface StatusT {
  // SystemStatusBadge
  systemStatusAria: string
  production: string
  local: string
  dbConnected: string
  dbDisconnected: string
  checkingApi: string
  apiConnected: string
  apiUnreachable: string
}

export const statusT: ModuleDict<StatusT> = {
  es: {
    systemStatusAria: 'Estado del sistema',
    production: 'Produccion',
    local: 'Local',
    dbConnected: 'Datos conectados',
    dbDisconnected: 'Datos sin conexion',
    checkingApi: 'Verificando conexion',
    apiConnected: 'Conectado en vivo',
    apiUnreachable: 'Sin respuesta',
  },
  en: {
    systemStatusAria: 'System status',
    production: 'Production',
    local: 'Local',
    dbConnected: 'Data connected',
    dbDisconnected: 'Data disconnected',
    checkingApi: 'Checking connection',
    apiConnected: 'Connected live',
    apiUnreachable: 'Not responding',
  },
  de: {
    systemStatusAria: 'Systemstatus',
    production: 'Produktion',
    local: 'Lokal',
    dbConnected: 'Daten verbunden',
    dbDisconnected: 'Daten nicht verbunden',
    checkingApi: 'Verbindung wird geprüft',
    apiConnected: 'Live verbunden',
    apiUnreachable: 'Antwortet nicht',
  },
}
