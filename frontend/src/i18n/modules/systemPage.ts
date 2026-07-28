import type { ModuleDict } from '../useModuleT'

export interface SystemPageT {
  eyebrow: string
  titulo: string

  metric_backend: string
  metric_version: string
  metric_base_datos: string
  metric_usuarios: string
  metric_entorno: string
  metric_cpu_proceso: string
  metric_memoria: string

  verificando: string
  no_disponible: string

  conectividad_titulo: string
  conectividad_api: string
  conectividad_estado: string
  conectividad_produccion_lista: string
  conectividad_si: string
  conectividad_no: string
  conectividad_frontend_esperado: string
  conectividad_local: string

  seguridad_titulo: string
  seguridad_sesiones_activas: string
  seguridad_intentos_fallidos: string
  seguridad_ips_bloqueadas: string
  seguridad_audit_log: string

  ultimos_errores_titulo: string
  sin_errores: string
}

export const systemPageT: ModuleDict<SystemPageT> = {
  es: {
    eyebrow: 'Sistema',
    titulo: 'Estado tecnico NORTHMINE',

    metric_backend: 'Backend',
    metric_version: 'Version',
    metric_base_datos: 'Base de datos',
    metric_usuarios: 'Usuarios',
    metric_entorno: 'Entorno',
    metric_cpu_proceso: 'CPU proceso',
    metric_memoria: 'Memoria',

    verificando: 'verificando',
    no_disponible: 'no disponible',

    conectividad_titulo: 'Conectividad',
    conectividad_api: 'API',
    conectividad_estado: 'Estado',
    conectividad_produccion_lista: 'Produccion lista',
    conectividad_si: 'si',
    conectividad_no: 'no',
    conectividad_frontend_esperado: 'Frontend esperado',
    conectividad_local: 'local',

    seguridad_titulo: 'Seguridad',
    seguridad_sesiones_activas: 'Sesiones activas',
    seguridad_intentos_fallidos: 'Intentos fallidos ultima hora',
    seguridad_ips_bloqueadas: 'IPs bloqueadas',
    seguridad_audit_log: 'Audit log',

    ultimos_errores_titulo: 'Ultimos errores',
    sin_errores: 'Sin errores recientes registrados.',
  },
  en: {
    eyebrow: 'System',
    titulo: 'NORTHMINE technical status',

    metric_backend: 'Backend',
    metric_version: 'Version',
    metric_base_datos: 'Database',
    metric_usuarios: 'Users',
    metric_entorno: 'Environment',
    metric_cpu_proceso: 'Process CPU',
    metric_memoria: 'Memory',

    verificando: 'checking',
    no_disponible: 'not available',

    conectividad_titulo: 'Connectivity',
    conectividad_api: 'API',
    conectividad_estado: 'Status',
    conectividad_produccion_lista: 'Production ready',
    conectividad_si: 'yes',
    conectividad_no: 'no',
    conectividad_frontend_esperado: 'Expected frontend',
    conectividad_local: 'local',

    seguridad_titulo: 'Security',
    seguridad_sesiones_activas: 'Active sessions',
    seguridad_intentos_fallidos: 'Failed logins in the last hour',
    seguridad_ips_bloqueadas: 'Blocked IPs',
    seguridad_audit_log: 'Audit log',

    ultimos_errores_titulo: 'Latest errors',
    sin_errores: 'No recent errors recorded.',
  },
}
