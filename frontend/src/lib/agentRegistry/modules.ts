import { appPaths, sectionPaths } from '../appRoutes'
import type { AgentModuleManifest } from './types'

/**
 * Modulos que el agente puede reconocer. Las rutas provienen del contrato
 * compartido appRoutes; App, shell, sidebar y agente ya no mantienen
 * literales paralelos que puedan desincronizarse.
 */
const SHIFT_FILTER = { id: 'shift', label: 'Turno', type: 'shift', allowedValues: ['DIA', 'NOCHE', 'AMBOS'] } as const
const DATE_FILTERS = [
  { id: 'start_date', label: 'Fecha desde', type: 'date' } as const,
  { id: 'end_date', label: 'Fecha hasta', type: 'date' } as const,
]
const EQUIPMENT_FILTER = { id: 'equipo', label: 'Equipo', type: 'equipment' } as const

export const NORTHMINE_MODULES: Record<string, AgentModuleManifest> = {
  cockpit: {
    id: 'cockpit',
    route: sectionPaths.cockpit,
    label: 'Decision Cockpit',
    description: 'Costos, riesgo y accion recomendada del turno.',
    category: 'operacional',
    agentAccess: 'read_only',
    minRoles: 'any',
    filters: [SHIFT_FILTER, ...DATE_FILTERS],
    entities: [{ type: 'equipment', label: 'CAEX' }, { type: 'loading_unit', label: 'Pala' }],
    supportedActions: ['navigate', 'set_filter', 'clear_filter', 'focus_widget', 'explain_widget'],
    instrumented: true,
  },
  operationalMap3d: {
    id: 'operationalMap3d',
    route: sectionPaths.operationalMap3d,
    label: 'Mapa Operacional 3D',
    description: 'Constelacion de datos operacionales en 3D.',
    category: 'geoespacial',
    agentAccess: 'read_only',
    minRoles: 'any',
    filters: [],
    entities: [],
    // Etapa 5: instrumentado como grafo de conocimiento (nodo seleccionado/
    // enfocado, modo de vista, alertas) - sigue sin ser una escena
    // georreferenciada real, por eso no hay entidades tipo equipment aca
    // (ver sceneContracts.ts).
    supportedActions: ['navigate', 'focus_widget', 'explain_widget'],
    instrumented: true,
  },
  dashboard: {
    id: 'dashboard',
    route: sectionPaths.dashboard,
    label: 'Resumen',
    description: 'Vista ejecutiva general.',
    category: 'operacional',
    agentAccess: 'read_only',
    minRoles: 'any',
    filters: [SHIFT_FILTER, ...DATE_FILTERS],
    entities: [],
    supportedActions: ['navigate', 'set_filter', 'clear_filter'],
    instrumented: false,
  },
  turno: {
    id: 'turno',
    route: sectionPaths.turno,
    label: 'Turno Actual',
    description: 'Operacion en tiempo real del turno.',
    category: 'operacional',
    agentAccess: 'read_only',
    minRoles: 'any',
    filters: [SHIFT_FILTER],
    entities: [{ type: 'equipment', label: 'CAEX' }, { type: 'loading_unit', label: 'Pala' }],
    supportedActions: ['navigate', 'set_filter', 'clear_filter', 'select_entity', 'focus_widget'],
    instrumented: true,
  },
  produccion: {
    id: 'produccion',
    route: sectionPaths.produccion,
    label: 'Producción',
    description: 'Tonelaje, cumplimiento de plan y tiempo de ciclo por hora.',
    category: 'operacional',
    agentAccess: 'read_only',
    minRoles: 'any',
    filters: [SHIFT_FILTER, ...DATE_FILTERS, EQUIPMENT_FILTER],
    entities: [{ type: 'equipment', label: 'CAEX' }, { type: 'loading_unit', label: 'Pala' }],
    supportedActions: ['navigate', 'set_filter', 'clear_filter', 'select_entity', 'focus_widget', 'explain_widget'],
    instrumented: true,
  },
  rendimiento: {
    id: 'rendimiento',
    route: sectionPaths.rendimiento,
    label: 'Rendimiento',
    description: 'Horas y demoras operacionales.',
    category: 'analitico',
    agentAccess: 'read_only',
    minRoles: 'any',
    filters: [SHIFT_FILTER, ...DATE_FILTERS],
    entities: [{ type: 'equipment', label: 'CAEX / Pala' }],
    supportedActions: ['navigate', 'set_filter', 'clear_filter', 'select_entity', 'open_entity', 'focus_widget'],
    instrumented: true,
  },
  flota: {
    id: 'flota',
    route: sectionPaths.flota,
    label: 'Flota',
    description: 'Estado, disponibilidad y utilizacion de CAEX.',
    category: 'operacional',
    agentAccess: 'read_only',
    minRoles: 'any',
    filters: [SHIFT_FILTER, EQUIPMENT_FILTER],
    entities: [{ type: 'equipment', label: 'CAEX' }],
    supportedActions: ['navigate', 'set_filter', 'clear_filter', 'select_entity', 'open_entity', 'focus_widget'],
    instrumented: true,
  },
  carguio: {
    id: 'carguio',
    route: sectionPaths.carguio,
    label: 'Carguío',
    description: 'Palas y frentes activos.',
    category: 'operacional',
    agentAccess: 'read_only',
    minRoles: 'any',
    filters: [SHIFT_FILTER, EQUIPMENT_FILTER],
    entities: [{ type: 'loading_unit', label: 'Pala' }],
    // "equipo" tambien filtra unidades de carguio (una sola dimension
    // global de equipo en el store, ver FiltroGlobal) - no existe un
    // filter_id 'loading_unit' separado todavia, adaptacion deliberada a
    // la arquitectura real en vez de forzar un contrato que no existe.
    supportedActions: ['navigate', 'set_filter', 'clear_filter', 'select_entity', 'focus_widget'],
    instrumented: true,
  },
  averias: {
    id: 'averias',
    route: sectionPaths.averias,
    label: 'Averías',
    description: 'Inactividad y fallas de equipos.',
    category: 'operacional',
    agentAccess: 'read_only',
    minRoles: 'any',
    filters: [...DATE_FILTERS, EQUIPMENT_FILTER],
    entities: [{ type: 'equipment', label: 'Equipo' }],
    // open_entity aca abre por tipo 'breakdown' (expandedId de la fila de
    // averia), no 'equipment' - Averias no registra handler de equipment.
    supportedActions: ['navigate', 'set_filter', 'clear_filter', 'select_entity', 'open_entity', 'focus_widget'],
    instrumented: true,
  },
  analisis: {
    id: 'analisis',
    route: sectionPaths.analisis,
    label: 'Análisis Experto',
    description: 'Produccion cruzada con mantencion.',
    category: 'analitico',
    agentAccess: 'read_only',
    minRoles: 'any',
    filters: [...DATE_FILTERS],
    entities: [],
    supportedActions: ['navigate'],
    instrumented: false,
  },
  aerea: {
    id: 'aerea',
    route: sectionPaths.aerea,
    label: 'Vista Aérea',
    description: 'Ortomosaicos y estado geoespacial.',
    category: 'geoespacial',
    agentAccess: 'read_only',
    minRoles: 'any',
    filters: [],
    entities: [],
    // Etapa 5: el visor de ortomosaico esta instrumentado (widget tipo
    // 'map', foco/explicacion/captura visual soportados) pero sigue sin ser
    // un mapa Leaflet georreferenciado - no hay coordenadas de equipo en
    // esta vista todavia (ver geoContracts.ts).
    supportedActions: ['navigate', 'focus_widget', 'explain_widget'],
    instrumented: true,
  },
  alertas: {
    id: 'alertas',
    route: sectionPaths.alertas,
    label: 'Alertas',
    description: 'Riesgo y seguridad operacional.',
    category: 'operacional',
    agentAccess: 'read_only',
    minRoles: 'any',
    filters: [{ id: 'shift', label: 'Turno', type: 'shift', allowedValues: ['DIA', 'NOCHE', 'AMBOS'] }],
    entities: [{ type: 'alert', label: 'Alerta' }],
    supportedActions: ['navigate', 'select_entity', 'open_entity', 'focus_widget'],
    instrumented: true,
  },
  reportes: {
    id: 'reportes',
    route: sectionPaths.reportes,
    label: 'Reportes',
    description: 'Informes de turno y periodo.',
    category: 'operacional',
    agentAccess: 'read_only',
    minRoles: 'any',
    filters: [...DATE_FILTERS],
    entities: [],
    supportedActions: ['navigate', 'focus_widget'],
    instrumented: true,
  },
  operationalFlow: {
    id: 'operationalFlow',
    route: appPaths.operationalFlow,
    label: 'Operational Flow',
    description: 'Proyeccion temporal del Operational Graph y su cadena de impacto.',
    category: 'operacional',
    agentAccess: 'read_only',
    minRoles: 'any',
    filters: [SHIFT_FILTER],
    entities: [
      { type: 'equipment', label: 'CAEX' },
      { type: 'loading_unit', label: 'Pala' },
      { type: 'route', label: 'Ruta' },
    ],
    supportedActions: ['navigate'],
    // La vista expone datos canonicos, pero todavia no registra widgets ni
    // handlers de entidad en el Agent UI Registry.
    instrumented: false,
  },
  admin: {
    id: 'admin',
    route: sectionPaths.admin,
    label: 'Admin',
    description: 'Marcador de seccion sin contenido real todavia.',
    category: 'administrativo',
    // Placeholder sin funcionalidad real - nunca se afirma control semantico
    // de algo que no existe (seccion 20 del brief).
    agentAccess: 'unavailable',
    minRoles: ['admin'],
    filters: [],
    entities: [],
    supportedActions: [],
    instrumented: false,
  },
  prediccion: {
    id: 'prediccion',
    route: appPaths.prediccion,
    label: 'Predicción',
    description: 'Proyeccion de produccion con Machine Learning.',
    category: 'predictivo',
    agentAccess: 'read_only',
    minRoles: 'any',
    filters: [],
    entities: [],
    supportedActions: ['navigate'],
    instrumented: false,
  },
  simulador: {
    id: 'simulador',
    route: appPaths.simulador,
    label: 'Simulador',
    description: 'Simulacion de escenarios de flota.',
    category: 'predictivo',
    agentAccess: 'read_only',
    minRoles: 'any',
    filters: [],
    entities: [],
    // Correr una simulacion escribe un resultado nuevo: no se expone como
    // accion del agente todavia (fuera del tool registry read-only actual).
    supportedActions: ['navigate'],
    instrumented: false,
  },
  comparativa: {
    id: 'comparativa',
    route: appPaths.comparativa,
    label: 'Comparativa',
    description: 'Dos periodos lado a lado, variacion por KPI.',
    category: 'analitico',
    agentAccess: 'read_only',
    minRoles: 'any',
    filters: [...DATE_FILTERS],
    entities: [{ type: 'equipment', label: 'Equipo' }],
    // Sin filter_id propio para "periodo A" / "periodo B" todavia (Compare.tsx
    // maneja 4 fechas via CompareParams, no las 2 de FiltroGlobal) - se puede
    // navegar, enfocar y leer el snapshot, pero no fijar los rangos via
    // set_filter en esta etapa. Documentado como limitacion, no simulado.
    supportedActions: ['navigate', 'select_entity', 'open_entity', 'focus_widget'],
    instrumented: true,
  },
  operatorRanking: {
    id: 'operatorRanking',
    route: appPaths.operatorRanking,
    label: 'Operator Ranking',
    description: 'Ranking y scoring de operadores.',
    category: 'analitico',
    agentAccess: 'read_only',
    minRoles: ['admin', 'supervisor'],
    filters: [],
    entities: [{ type: 'operator', label: 'Operador' }],
    supportedActions: ['navigate', 'select_entity', 'open_entity', 'focus_widget'],
    instrumented: true,
  },
  adminSistema: {
    id: 'adminSistema',
    route: appPaths.adminSistema,
    label: 'Sistema',
    description: 'Configuracion de sistema.',
    category: 'administrativo',
    agentAccess: 'unavailable',
    minRoles: ['admin'],
    filters: [],
    entities: [],
    supportedActions: [],
    instrumented: false,
  },
  adminUsers: {
    id: 'adminUsers',
    route: appPaths.adminUsers,
    label: 'Usuarios',
    description: 'Administracion de usuarios.',
    category: 'administrativo',
    agentAccess: 'unavailable',
    minRoles: ['admin'],
    filters: [],
    entities: [],
    supportedActions: [],
    instrumented: false,
  },
  adminDemoAccess: {
    id: 'adminDemoAccess',
    route: appPaths.adminDemoAccess,
    label: 'Acceso Demo',
    description: 'Solicitudes de acceso a la demo publica.',
    category: 'administrativo',
    agentAccess: 'unavailable',
    minRoles: ['admin'],
    filters: [],
    entities: [],
    supportedActions: [],
    instrumented: false,
  },
  adminAuditoria: {
    id: 'adminAuditoria',
    route: appPaths.adminAuditoria,
    label: 'Auditoría',
    description: 'Bitacora de seguridad del sistema.',
    category: 'administrativo',
    // Conservador a proposito: es informacion sensible de seguridad: el
    // agente puede navegar ahi si el rol lo permite, pero no se trata como
    // una fuente de datos operacionales mas.
    agentAccess: 'unavailable',
    minRoles: ['admin'],
    filters: [],
    entities: [],
    supportedActions: [],
    instrumented: false,
  },
}

export function moduleForRoute(pathname: string): AgentModuleManifest | null {
  return Object.values(NORTHMINE_MODULES).find((module) => module.route === pathname) ?? null
}
