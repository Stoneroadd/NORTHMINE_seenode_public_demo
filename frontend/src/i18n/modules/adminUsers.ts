import type { ModuleDict } from '../useModuleT'
import type { UserRole } from '../../lib/api'

export interface AdminUsersT {
  role_label: (role: UserRole) => string

  sin_registro: string
  operacion_no_disponible: string

  err_username_requerido: string
  err_nombre_requerido: string
  err_email_invalido: string
  err_password_debil: string
  err_rol_requerido: string

  notice_usuario_creado: string
  notice_usuario_actualizado: string
  notice_rol_actualizado: string
  notice_estado_actualizado: string
  notice_password_reseteada: string

  confirm_cambiar_rol: (username: string, roleLabel: string) => string
  confirm_activar: (username: string) => string
  confirm_desactivar: (username: string) => string

  acceso_restringido: string
  acceso_restringido_titulo: string
  acceso_restringido_desc: string

  eyebrow: string
  titulo: string
  btn_actualizar: string
  btn_crear_usuario: string

  stat_total: string
  stat_activos: string
  stat_admins_activos: string
  stat_demo: string

  cargando_usuarios: string
  error_cargar_usuarios: string
  sin_usuarios: string

  col_usuario: string
  col_nombre: string
  col_email: string
  col_rol: string
  col_estado: string
  col_tipo: string
  col_ultimo_login: string
  col_creado: string
  col_acciones: string

  sin_email: string
  pill_activo: string
  pill_inactivo: string
  pill_demo: string
  pill_real: string

  btn_editar: string
  btn_reset: string
  btn_activar: string
  btn_desactivar: string

  panel_titulo_nuevo: string
  panel_titulo_editar: string
  panel_titulo_password: string
  panel_usuario_fallback: string
  btn_cerrar: string

  field_username: string
  field_nombre_completo: string
  field_email: string
  placeholder_email: string
  field_rol: string
  field_faena: string
  field_empresa: string
  field_nueva_password: string
  field_usuario_activo: string

  btn_guardando: string
  btn_guardar: string
}

function roleLabelBase(role: UserRole, viewerLabel: string): string {
  return role === 'viewer' ? viewerLabel : role.toUpperCase()
}

export const adminUsersT: ModuleDict<AdminUsersT> = {
  es: {
    role_label: (role) => roleLabelBase(role, 'INVITADO'),

    sin_registro: 'Sin registro',
    operacion_no_disponible: 'Operacion no disponible.',

    err_username_requerido: 'Username requerido, minimo 3 caracteres.',
    err_nombre_requerido: 'Nombre requerido.',
    err_email_invalido: 'Email invalido.',
    err_password_debil: 'Password minimo 10 caracteres y 3 tipos de caracteres.',
    err_rol_requerido: 'Rol requerido.',

    notice_usuario_creado: 'Usuario creado.',
    notice_usuario_actualizado: 'Usuario actualizado.',
    notice_rol_actualizado: 'Rol actualizado.',
    notice_estado_actualizado: 'Estado actualizado.',
    notice_password_reseteada: 'Password reseteada.',

    confirm_cambiar_rol: (username, roleLabel) => `Cambiar rol de ${username} a ${roleLabel}?`,
    confirm_activar: (username) => `Activar usuario ${username}?`,
    confirm_desactivar: (username) => `Desactivar usuario ${username}?`,

    acceso_restringido: 'Acceso restringido',
    acceso_restringido_titulo: 'Usuarios',
    acceso_restringido_desc: 'Modulo disponible solo para rol admin.',

    eyebrow: 'Administracion',
    titulo: 'Usuarios y roles',
    btn_actualizar: 'Actualizar',
    btn_crear_usuario: 'Crear usuario',

    stat_total: 'Total usuarios',
    stat_activos: 'Activos',
    stat_admins_activos: 'ADMIN activos',
    stat_demo: 'Demo',

    cargando_usuarios: 'Cargando usuarios...',
    error_cargar_usuarios: 'No se pudo cargar usuarios.',
    sin_usuarios: 'No hay usuarios registrados.',

    col_usuario: 'Usuario',
    col_nombre: 'Nombre',
    col_email: 'Email',
    col_rol: 'Rol',
    col_estado: 'Estado',
    col_tipo: 'Tipo',
    col_ultimo_login: 'Ultimo login',
    col_creado: 'Creado',
    col_acciones: 'Acciones',

    sin_email: 'Sin email',
    pill_activo: 'ACTIVO',
    pill_inactivo: 'INACTIVO',
    pill_demo: 'DEMO',
    pill_real: 'REAL',

    btn_editar: 'Editar',
    btn_reset: 'Reset',
    btn_activar: 'Activar',
    btn_desactivar: 'Desactivar',

    panel_titulo_nuevo: 'Nuevo usuario',
    panel_titulo_editar: 'Editar usuario',
    panel_titulo_password: 'Reset password',
    panel_usuario_fallback: 'Usuario',
    btn_cerrar: 'Cerrar',

    field_username: 'Username',
    field_nombre_completo: 'Nombre completo',
    field_email: 'Email',
    placeholder_email: 'usuario@empresa.cl',
    field_rol: 'Rol',
    field_faena: 'Faena',
    field_empresa: 'Empresa',
    field_nueva_password: 'Nueva password',
    field_usuario_activo: 'Usuario activo',

    btn_guardando: 'Guardando...',
    btn_guardar: 'Guardar',
  },
  en: {
    role_label: (role) => roleLabelBase(role, 'VIEWER'),

    sin_registro: 'No record',
    operacion_no_disponible: 'Operation not available.',

    err_username_requerido: 'Username required, minimum 3 characters.',
    err_nombre_requerido: 'Name required.',
    err_email_invalido: 'Invalid email.',
    err_password_debil: 'Password requires at least 10 characters and 3 character types.',
    err_rol_requerido: 'Role required.',

    notice_usuario_creado: 'User created.',
    notice_usuario_actualizado: 'User updated.',
    notice_rol_actualizado: 'Role updated.',
    notice_estado_actualizado: 'Status updated.',
    notice_password_reseteada: 'Password reset.',

    confirm_cambiar_rol: (username, roleLabel) => `Change ${username}'s role to ${roleLabel}?`,
    confirm_activar: (username) => `Activate user ${username}?`,
    confirm_desactivar: (username) => `Deactivate user ${username}?`,

    acceso_restringido: 'Restricted access',
    acceso_restringido_titulo: 'Users',
    acceso_restringido_desc: 'Module available only for the admin role.',

    eyebrow: 'Administration',
    titulo: 'Users and roles',
    btn_actualizar: 'Refresh',
    btn_crear_usuario: 'Create user',

    stat_total: 'Total users',
    stat_activos: 'Active',
    stat_admins_activos: 'Active ADMINs',
    stat_demo: 'Demo',

    cargando_usuarios: 'Loading users...',
    error_cargar_usuarios: 'Could not load users.',
    sin_usuarios: 'No users registered.',

    col_usuario: 'User',
    col_nombre: 'Name',
    col_email: 'Email',
    col_rol: 'Role',
    col_estado: 'Status',
    col_tipo: 'Type',
    col_ultimo_login: 'Last login',
    col_creado: 'Created',
    col_acciones: 'Actions',

    sin_email: 'No email',
    pill_activo: 'ACTIVE',
    pill_inactivo: 'INACTIVE',
    pill_demo: 'DEMO',
    pill_real: 'REAL',

    btn_editar: 'Edit',
    btn_reset: 'Reset',
    btn_activar: 'Activate',
    btn_desactivar: 'Deactivate',

    panel_titulo_nuevo: 'New user',
    panel_titulo_editar: 'Edit user',
    panel_titulo_password: 'Reset password',
    panel_usuario_fallback: 'User',
    btn_cerrar: 'Close',

    field_username: 'Username',
    field_nombre_completo: 'Full name',
    field_email: 'Email',
    placeholder_email: 'user@company.com',
    field_rol: 'Role',
    field_faena: 'Site',
    field_empresa: 'Company',
    field_nueva_password: 'New password',
    field_usuario_activo: 'Active user',

    btn_guardando: 'Saving...',
    btn_guardar: 'Save',
  },
  de: {
    role_label: (role) => roleLabelBase(role, 'BETRACHTER'),

    sin_registro: 'Keine Aufzeichnung',
    operacion_no_disponible: 'Vorgang nicht verfügbar.',

    err_username_requerido: 'Benutzername erforderlich, mindestens 3 Zeichen.',
    err_nombre_requerido: 'Name erforderlich.',
    err_email_invalido: 'Ungültige E-Mail.',
    err_password_debil: 'Passwort erfordert mindestens 10 Zeichen und 3 Zeichentypen.',
    err_rol_requerido: 'Rolle erforderlich.',

    notice_usuario_creado: 'Benutzer erstellt.',
    notice_usuario_actualizado: 'Benutzer aktualisiert.',
    notice_rol_actualizado: 'Rolle aktualisiert.',
    notice_estado_actualizado: 'Status aktualisiert.',
    notice_password_reseteada: 'Passwort zurückgesetzt.',

    confirm_cambiar_rol: (username, roleLabel) => `Rolle von ${username} auf ${roleLabel} ändern?`,
    confirm_activar: (username) => `Benutzer ${username} aktivieren?`,
    confirm_desactivar: (username) => `Benutzer ${username} deaktivieren?`,

    acceso_restringido: 'Eingeschränkter Zugriff',
    acceso_restringido_titulo: 'Benutzer',
    acceso_restringido_desc: 'Modul nur für die Rolle Administrator verfügbar.',

    eyebrow: 'Administration',
    titulo: 'Benutzer und Rollen',
    btn_actualizar: 'Aktualisieren',
    btn_crear_usuario: 'Benutzer erstellen',

    stat_total: 'Benutzer gesamt',
    stat_activos: 'Aktiv',
    stat_admins_activos: 'Aktive ADMINs',
    stat_demo: 'Demo',

    cargando_usuarios: 'Benutzer werden geladen...',
    error_cargar_usuarios: 'Benutzer konnten nicht geladen werden.',
    sin_usuarios: 'Keine Benutzer registriert.',

    col_usuario: 'Benutzer',
    col_nombre: 'Name',
    col_email: 'E-Mail',
    col_rol: 'Rolle',
    col_estado: 'Status',
    col_tipo: 'Typ',
    col_ultimo_login: 'Letzte Anmeldung',
    col_creado: 'Erstellt',
    col_acciones: 'Aktionen',

    sin_email: 'Keine E-Mail',
    pill_activo: 'AKTIV',
    pill_inactivo: 'INAKTIV',
    pill_demo: 'DEMO',
    pill_real: 'REAL',

    btn_editar: 'Bearbeiten',
    btn_reset: 'Zurücksetzen',
    btn_activar: 'Aktivieren',
    btn_desactivar: 'Deaktivieren',

    panel_titulo_nuevo: 'Neuer Benutzer',
    panel_titulo_editar: 'Benutzer bearbeiten',
    panel_titulo_password: 'Passwort zurücksetzen',
    panel_usuario_fallback: 'Benutzer',
    btn_cerrar: 'Schließen',

    field_username: 'Benutzername',
    field_nombre_completo: 'Vollständiger Name',
    field_email: 'E-Mail',
    placeholder_email: 'benutzer@firma.de',
    field_rol: 'Rolle',
    field_faena: 'Standort',
    field_empresa: 'Unternehmen',
    field_nueva_password: 'Neues Passwort',
    field_usuario_activo: 'Aktiver Benutzer',

    btn_guardando: 'Wird gespeichert...',
    btn_guardar: 'Speichern',
  },
}
