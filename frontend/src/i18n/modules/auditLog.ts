import type { ModuleDict } from '../useModuleT'

export interface AuditLogT {
  acceso_restringido: string
  acceso_restringido_desc: string

  eyebrow: string
  titulo: string
  btn_exportar_csv: string

  label_usuario: string
  label_endpoint: string
  label_desde: string
  placeholder_usuario: string
  placeholder_endpoint: string
  placeholder_desde: string

  col_timestamp: string
  col_usuario: string
  col_ip: string
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
    titulo: '🔒 Log de Auditoría',
    btn_exportar_csv: 'Exportar CSV',

    label_usuario: 'Usuario',
    label_endpoint: 'Endpoint',
    label_desde: 'Desde (ISO)',
    placeholder_usuario: 'admin…',
    placeholder_endpoint: '/api/…',
    placeholder_desde: '2026-05-31T00:00:00Z',

    col_timestamp: 'TIMESTAMP',
    col_usuario: 'USUARIO',
    col_ip: 'IP',
    col_metodo: 'MÉTODO',
    col_endpoint: 'ENDPOINT',
    col_status: 'STATUS',
    col_ms: 'MS',

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

    label_usuario: 'User',
    label_endpoint: 'Endpoint',
    label_desde: 'From (ISO)',
    placeholder_usuario: 'admin…',
    placeholder_endpoint: '/api/…',
    placeholder_desde: '2026-05-31T00:00:00Z',

    col_timestamp: 'TIMESTAMP',
    col_usuario: 'USER',
    col_ip: 'IP',
    col_metodo: 'METHOD',
    col_endpoint: 'ENDPOINT',
    col_status: 'STATUS',
    col_ms: 'MS',

    cargando: 'Loading…',
    error_cargar: 'Error loading the log.',

    mostrando_de_eventos: (shown, total) => `Showing ${shown} of ${total} events`,
  },
}
