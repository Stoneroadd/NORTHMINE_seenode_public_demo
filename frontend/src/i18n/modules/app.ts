import type { ModuleDict } from '../useModuleT'

export interface AppT {
  cargando: string
  acceso_restringido: string
  acceso_restringido_sistema_titulo: string
  acceso_restringido_sistema_desc: string
  acceso_restringido_usuarios_titulo: string
  acceso_restringido_usuarios_desc: string
  acceso_restringido_ranking_titulo: string
  acceso_restringido_ranking_desc: string
  admin_titulo: string
  admin_subtitulo: string
  admin_desc: string
  rate_limit: (secs: number) => string
  backend_unreachable: string
  stale_data: string
}

export const appT: ModuleDict<AppT> = {
  es: {
    cargando: 'Cargando...',
    acceso_restringido: 'Acceso restringido',
    acceso_restringido_sistema_titulo: 'Sistema',
    acceso_restringido_sistema_desc: 'Modulo disponible solo para rol admin.',
    acceso_restringido_usuarios_titulo: 'Usuarios',
    acceso_restringido_usuarios_desc: 'Modulo disponible solo para rol admin.',
    acceso_restringido_ranking_titulo: 'Ranking Operadores',
    acceso_restringido_ranking_desc: 'Modulo disponible para roles admin y supervisor.',
    admin_titulo: 'Admin',
    admin_subtitulo: 'Gestión segura de usuarios, roles y permisos',
    admin_desc: 'Gestion de usuarios, permisos, tenants, integraciones y parametros operacionales.',
    rate_limit: (secs) => `⚠ Demasiadas solicitudes. Espera ${secs}s.`,
    backend_unreachable: 'DATOS OPERACIONALES DEMORADOS — LA INFORMACIÓN EN PANTALLA PUEDE ESTAR DESACTUALIZADA',
    stale_data: '⚠ SIN CONEXION CON WENCO — MOSTRANDO EL ULTIMO DATO REAL DISPONIBLE, NO EN VIVO',
  },
  en: {
    cargando: 'Loading...',
    acceso_restringido: 'Restricted access',
    acceso_restringido_sistema_titulo: 'System',
    acceso_restringido_sistema_desc: 'Module available only for the admin role.',
    acceso_restringido_usuarios_titulo: 'Users',
    acceso_restringido_usuarios_desc: 'Module available only for the admin role.',
    acceso_restringido_ranking_titulo: 'Operator Ranking',
    acceso_restringido_ranking_desc: 'Module available for admin and supervisor roles.',
    admin_titulo: 'Admin',
    admin_subtitulo: 'Secure management of users, roles and permissions',
    admin_desc: 'User management, permissions, tenants, integrations and operational parameters.',
    rate_limit: (secs) => `⚠ Too many requests. Wait ${secs}s.`,
    backend_unreachable: 'OPERATIONAL DATA DELAYED — INFORMATION ON SCREEN MAY BE OUTDATED',
    stale_data: '⚠ NO CONNECTION TO WENCO — SHOWING THE LAST AVAILABLE REAL DATA, NOT LIVE',
  },
  de: {
    cargando: 'Wird geladen...',
    acceso_restringido: 'Eingeschränkter Zugriff',
    acceso_restringido_sistema_titulo: 'System',
    acceso_restringido_sistema_desc: 'Modul nur für die Rolle Administrator verfügbar.',
    acceso_restringido_usuarios_titulo: 'Benutzer',
    acceso_restringido_usuarios_desc: 'Modul nur für die Rolle Administrator verfügbar.',
    acceso_restringido_ranking_titulo: 'Rangliste der Operatoren',
    acceso_restringido_ranking_desc: 'Modul für die Rollen Administrator und Supervisor verfügbar.',
    admin_titulo: 'Admin',
    admin_subtitulo: 'Sichere Verwaltung von Benutzern, Rollen und Berechtigungen',
    admin_desc: 'Verwaltung von Benutzern, Berechtigungen, Tenants, Integrationen und Betriebsparametern.',
    rate_limit: (secs) => `⚠ Zu viele Anfragen. Bitte warten Sie ${secs}s.`,
    backend_unreachable: 'BETRIEBSDATEN VERZÖGERT — ANGEZEIGTE INFORMATIONEN KÖNNEN VERALTET SEIN',
    stale_data: '⚠ KEINE VERBINDUNG ZU WENCO — LETZTE VERFÜGBARE REALDATEN WERDEN ANGEZEIGT, NICHT LIVE',
  },
}
