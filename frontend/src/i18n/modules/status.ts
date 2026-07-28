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
    dbConnected: 'BD conectada',
    dbDisconnected: 'BD sin conexion',
    checkingApi: 'Verificando API',
    apiConnected: 'API conectada',
    apiUnreachable: 'API sin respuesta',
  },
  en: {
    systemStatusAria: 'System status',
    production: 'Production',
    local: 'Local',
    dbConnected: 'DB connected',
    dbDisconnected: 'DB disconnected',
    checkingApi: 'Checking API',
    apiConnected: 'API connected',
    apiUnreachable: 'API not responding',
  },
}
