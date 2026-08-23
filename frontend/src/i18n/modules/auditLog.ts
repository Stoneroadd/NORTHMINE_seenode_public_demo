import type { ModuleDict } from '../useModuleT'

export interface AuditLogT {
  acceso_restringido: string
  acceso_restringido_desc: string

  eyebrow: string
  titulo: string
  btn_exportar_csv: string
  privacy_notice: string

  label_usuario: string
  label_endpoint: string
  label_desde: string
  placeholder_usuario: string
  placeholder_endpoint: string
  placeholder_desde: string

  col_timestamp: string
  col_usuario: string
  col_metodo: string
  col_endpoint: string
  col_status: string
  col_ms: string

  cargando: string
  error_cargar: string

  mostrando_de_eventos: (shown: number, total: number) => string
}

export const auditLogT: ModuleDict<AuditLogT> = {
  es: {
    acceso_restringido: 'Acceso restringido',
    acceso_restringido_desc: 'Solo administradores pueden ver el log de auditoría.',

    eyebrow: 'Seguridad',
    titulo: 'Registro de actividad',
    btn_exportar_csv: 'Exportar CSV',
    privacy_notice: 'Las identidades de red se protegen y no se muestran en este entorno demostrativo.',

    label_usuario: 'Usuario',
    label_endpoint: 'Operación',
    label_desde: 'Desde',
    placeholder_usuario: 'admin…',
    placeholder_endpoint: 'Actividad operacional…',
    placeholder_desde: '2026-05-31',

    col_timestamp: 'FECHA Y HORA',
    col_usuario: 'USUARIO',
    col_metodo: 'ACCIÓN',
    col_endpoint: 'OPERACIÓN',
    col_status: 'RESULTADO',
    col_ms: 'DURACIÓN',

    cargando: 'Cargando…',
    error_cargar: 'Error al cargar el log.',

    mostrando_de_eventos: (shown, total) => `Mostrando ${shown} de ${total} eventos`,
  },
  en: {
    acceso_restringido: 'Restricted access',
    acceso_restringido_desc: 'Only administrators can view the audit log.',

    eyebrow: 'Security',
    titulo: 'Activity record',
    btn_exportar_csv: 'Export CSV',
    privacy_notice: 'Network identities are protected and are not displayed in this demo environment.',

    label_usuario: 'User',
    label_endpoint: 'Operation',
    label_desde: 'From',
    placeholder_usuario: 'admin…',
    placeholder_endpoint: 'Operational activity…',
    placeholder_desde: '2026-05-31',

    col_timestamp: 'DATE AND TIME',
    col_usuario: 'USER',
    col_metodo: 'ACTION',
    col_endpoint: 'OPERATION',
    col_status: 'RESULT',
    col_ms: 'DURATION',

    cargando: 'Loading…',
    error_cargar: 'Error loading the log.',

    mostrando_de_eventos: (shown, total) => `Showing ${shown} of ${total} events`,
  },
  de: {
    acceso_restringido: 'Eingeschränkter Zugriff',
    acceso_restringido_desc: 'Nur Administratoren können das Prüfprotokoll einsehen.',

    eyebrow: 'Sicherheit',
    titulo: '🔒 Prüfprotokoll',
    btn_exportar_csv: 'CSV exportieren',
    privacy_notice: 'Netzwerkidentitäten werden geschützt und in dieser Demo-Umgebung nicht angezeigt.',

    label_usuario: 'Benutzer',
    label_endpoint: 'Vorgang',
    label_desde: 'Ab',
    placeholder_usuario: 'admin…',
    placeholder_endpoint: 'Betriebliche Aktivität…',
    placeholder_desde: '2026-05-31',

    col_timestamp: 'DATUM UND UHRZEIT',
    col_usuario: 'BENUTZER',
    col_metodo: 'AKTION',
    col_endpoint: 'VORGANG',
    col_status: 'ERGEBNIS',
    col_ms: 'DAUER',

    cargando: 'Wird geladen…',
    error_cargar: 'Fehler beim Laden des Protokolls.',

    mostrando_de_eventos: (shown, total) => `Zeige ${shown} von ${total} Ereignissen`,
  },
}
