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
    admin_subtitulo: 'Administracion preparada para Sprint 1.3',
    admin_desc: 'Gestion de usuarios, permisos, tenants, integraciones y parametros operacionales.',
    rate_limit: (secs) => `⚠ Demasiadas solicitudes. Espera ${secs}s.`,
    backend_unreachable: '⚠ SIN CONEXION CON EL BACKEND — LOS DATOS EN PANTALLA PUEDEN ESTAR DESACTUALIZADOS',
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
    admin_subtitulo: 'Administration scheduled for Sprint 1.3',
    admin_desc: 'User management, permissions, tenants, integrations and operational parameters.',
    rate_limit: (secs) => `⚠ Too many requests. Wait ${secs}s.`,
    backend_unreachable: '⚠ NO CONNECTION TO THE BACKEND — DATA ON SCREEN MAY BE OUTDATED',
    stale_data: '⚠ NO CONNECTION TO WENCO — SHOWING THE LAST AVAILABLE REAL DATA, NOT LIVE',
  },
}
