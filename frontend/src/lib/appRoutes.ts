/**
 * Canonical path contract for the current manual router.
 *
 * Keeping paths here prevents the shell, page resolver and AI registry from
 * silently drifting while NORTHMINE migrates toward Mission Control. This is
 * intentionally a route contract, not a replacement router.
 */
export const sectionPaths = {
  cockpit: '/cockpit',
  operationalFlow: '/mission-control/operational-flow',
  operationalMap3d: '/operational-map-3d',
  dashboard: '/resumen',
  turno: '/turno',
  produccion: '/produccion',
  rendimiento: '/rendimiento',
  flota: '/flota',
  carguio: '/carguio',
  averias: '/averias',
  analisis: '/analisis',
  aerea: '/aerea',
  alertas: '/alertas',
  reportes: '/reportes',
  admin: '/admin',
} as const

export type SectionId = keyof typeof sectionPaths

export const appPaths = {
  ...sectionPaths,
  dashboardLegacy: '/dashboard',
  comparativa: '/comparativa',
  operatorRanking: '/operator-ranking',
  prediccion: '/prediccion',
  simulador: '/simulador',
  adminSistema: '/admin/sistema',
  adminUsers: '/admin/users',
  adminDemoAccess: '/admin/demo-access',
  adminAuditoria: '/admin/auditoria',
  adminGitnexus: '/admin/gitnexus',
  missionControlDesignSystem: '/mission-control/design-system',
} as const

export type AppPath = (typeof appPaths)[keyof typeof appPaths]

export function normalizeAppPath(pathname: string): string {
  return pathname.replace(/\/+$/, '') || '/'
}

export function sectionFromPath(pathname: string): SectionId {
  const normalized = normalizeAppPath(pathname)
  const entries = Object.entries(sectionPaths) as Array<[SectionId, string]>
  return entries.find(([, path]) => path === normalized)?.[0]
    ?? (normalized === appPaths.dashboardLegacy ? 'dashboard' : 'cockpit')
}
