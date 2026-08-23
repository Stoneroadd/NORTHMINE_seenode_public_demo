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
  conectividad_api_protegida: string
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
    titulo: 'Estado de la plataforma',

    metric_backend: 'Servicio operacional',
    metric_version: 'Preparacion operativa',
    metric_base_datos: 'Disponibilidad de datos',
    metric_usuarios: 'Acceso e identidad',
    metric_entorno: 'Contexto',
    metric_cpu_proceso: 'CPU proceso',
    metric_memoria: 'Memoria',

    verificando: 'verificando',
    no_disponible: 'no disponible',

    conectividad_titulo: 'Conectividad',
    conectividad_api: 'Canal de informacion',
    conectividad_api_protegida: 'Canal protegido',
    conectividad_estado: 'Estado',
    conectividad_produccion_lista: 'Produccion lista',
    conectividad_si: 'disponible',
    conectividad_no: 'no disponible',
    conectividad_frontend_esperado: 'Canal autorizado',
    conectividad_local: 'entorno controlado',

    seguridad_titulo: 'Seguridad',
    seguridad_sesiones_activas: 'Sesiones activas',
    seguridad_intentos_fallidos: 'Intentos fallidos ultima hora',
    seguridad_ips_bloqueadas: 'Bloqueos de red',
    seguridad_audit_log: 'Registro de actividad',

    ultimos_errores_titulo: 'Incidencias recientes',
    sin_errores: 'Sin incidencias recientes registradas.',
  },
  en: {
    eyebrow: 'System',
    titulo: 'Platform status',

    metric_backend: 'Operational service',
    metric_version: 'Operational readiness',
    metric_base_datos: 'Data availability',
    metric_usuarios: 'Access and identity',
    metric_entorno: 'Context',
    metric_cpu_proceso: 'Process CPU',
    metric_memoria: 'Memory',

    verificando: 'checking',
    no_disponible: 'not available',

    conectividad_titulo: 'Connectivity',
    conectividad_api: 'Information channel',
    conectividad_api_protegida: 'Protected channel',
    conectividad_estado: 'Status',
    conectividad_produccion_lista: 'Production ready',
    conectividad_si: 'available',
    conectividad_no: 'unavailable',
    conectividad_frontend_esperado: 'Authorized channel',
    conectividad_local: 'controlled environment',

    seguridad_titulo: 'Security',
    seguridad_sesiones_activas: 'Active sessions',
    seguridad_intentos_fallidos: 'Failed logins in the last hour',
    seguridad_ips_bloqueadas: 'Network blocks',
    seguridad_audit_log: 'Audit log',

    ultimos_errores_titulo: 'Recent incidents',
    sin_errores: 'No recent incidents recorded.',
  },
  de: {
    eyebrow: 'System',
    titulo: 'Plattformstatus',

    metric_backend: 'Betriebsdienst',
    metric_version: 'Betriebsbereitschaft',
    metric_base_datos: 'Datenverfügbarkeit',
    metric_usuarios: 'Zugang und Identität',
    metric_entorno: 'Kontext',
    metric_cpu_proceso: 'Prozess-CPU',
    metric_memoria: 'Speicher',

    verificando: 'wird geprüft',
    no_disponible: 'nicht verfügbar',

    conectividad_titulo: 'Konnektivität',
    conectividad_api: 'Informationskanal',
    conectividad_api_protegida: 'Geschützter Kanal',
    conectividad_estado: 'Status',
    conectividad_produccion_lista: 'Produktion bereit',
    conectividad_si: 'verfügbar',
    conectividad_no: 'nicht verfügbar',
    conectividad_frontend_esperado: 'Autorisierter Kanal',
    conectividad_local: 'kontrollierte Umgebung',

    seguridad_titulo: 'Sicherheit',
    seguridad_sesiones_activas: 'Aktive Sitzungen',
    seguridad_intentos_fallidos: 'Fehlgeschlagene Anmeldungen in der letzten Stunde',
    seguridad_ips_bloqueadas: 'Netzwerksperren',
    seguridad_audit_log: 'Prüfprotokoll',

    ultimos_errores_titulo: 'Aktuelle Vorfälle',
    sin_errores: 'Keine aktuellen Vorfälle erfasst.',
  },
}
