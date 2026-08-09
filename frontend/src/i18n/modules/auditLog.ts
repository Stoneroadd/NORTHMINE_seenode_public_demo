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
  label_accion: string
  label_desde: string
  placeholder_usuario: string
  placeholder_endpoint: string
  placeholder_accion: string
  placeholder_desde: string

  col_timestamp: string
  col_usuario: string
  col_accion: string
  col_metodo: string
  col_endpoint: string
  col_status: string
  col_ms: string

  btn_anterior: string
  btn_siguiente: string
  paginacion: (offset: number, total: number) => string

  cargando: string
  error_cargar: string

  mostrando_de_eventos: (shown: number, total: number) => string
}

export const auditLogT: ModuleDict<AuditLogT> = {
  es: {
    acceso_restringido: 'Acceso restringido',
    acceso_restringido_desc: 'Solo administradores pueden ver el log de auditoría.',

    eyebrow: 'Seguridad',
    titulo: '🔒 Log de Auditoría',
    btn_exportar_csv: 'Exportar CSV',
    privacy_notice: 'Las identidades de red se protegen y no se muestran en este entorno demostrativo.',

    label_usuario: 'Usuario',
    label_endpoint: 'Endpoint',
    label_accion: 'Acción',
    label_desde: 'Desde (ISO)',
    placeholder_usuario: 'admin…',
    placeholder_endpoint: '/api/…',
    placeholder_accion: 'login_failed…',
    placeholder_desde: '2026-05-31T00:00:00Z',

    col_timestamp: 'TIMESTAMP',
    col_usuario: 'USUARIO',
    col_accion: 'ACCIÓN',
    col_metodo: 'MÉTODO',
    col_endpoint: 'ENDPOINT',
    col_status: 'STATUS',
    col_ms: 'MS',

    btn_anterior: '← Anterior',
    btn_siguiente: 'Siguiente →',
    paginacion: (offset, total) => `Página ${Math.floor(offset / 100) + 1} de ${Math.max(1, Math.ceil(total / 100))}`,

    cargando: 'Cargando…',
    error_cargar: 'Error al cargar el log.',

    mostrando_de_eventos: (shown, total) => `Mostrando ${shown} de ${total} eventos`,
  },
  en: {
    acceso_restringido: 'Restricted access',
    acceso_restringido_desc: 'Only administrators can view the audit log.',

    eyebrow: 'Security',
    titulo: '🔒 Audit Log',
    btn_exportar_csv: 'Export CSV',
    privacy_notice: 'Network identities are protected and are not displayed in this demo environment.',

    label_usuario: 'User',
    label_endpoint: 'Endpoint',
    label_accion: 'Action',
    label_desde: 'From (ISO)',
    placeholder_usuario: 'admin…',
    placeholder_endpoint: '/api/…',
    placeholder_accion: 'login_failed…',
    placeholder_desde: '2026-05-31T00:00:00Z',

    col_timestamp: 'TIMESTAMP',
    col_usuario: 'USER',
    col_accion: 'ACTION',
    col_metodo: 'METHOD',
    col_endpoint: 'ENDPOINT',
    col_status: 'STATUS',
    col_ms: 'MS',

    btn_anterior: '← Previous',
    btn_siguiente: 'Next →',
    paginacion: (offset, total) => `Page ${Math.floor(offset / 100) + 1} of ${Math.max(1, Math.ceil(total / 100))}`,

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
    label_endpoint: 'Endpunkt',
    label_accion: 'Aktion',
    label_desde: 'Von (ISO)',
    placeholder_usuario: 'admin…',
    placeholder_endpoint: '/api/…',
    placeholder_accion: 'login_failed…',
    placeholder_desde: '2026-05-31T00:00:00Z',

    col_timestamp: 'ZEITSTEMPEL',
    col_usuario: 'BENUTZER',
    col_accion: 'AKTION',
    col_metodo: 'METHODE',
    col_endpoint: 'ENDPUNKT',
    col_status: 'STATUS',
    col_ms: 'MS',

    btn_anterior: '← Zurück',
    btn_siguiente: 'Weiter →',
    paginacion: (offset, total) => `Seite ${Math.floor(offset / 100) + 1} von ${Math.max(1, Math.ceil(total / 100))}`,

    cargando: 'Wird geladen…',
    error_cargar: 'Fehler beim Laden des Protokolls.',

    mostrando_de_eventos: (shown, total) => `Zeige ${shown} von ${total} Ereignissen`,
  },
}
