import type {
  CockpitResponse,
  DecisionAuditResponse,
  DispatcherAdvisorResponse,
  HiddenLossesResponse,
  MonthlyTargetResponse,
  OperationalNlpResponse,
  ProfitOptimizationResponse,
} from '../../lib/api'
import {
  asNumber,
  clamp,
  formatCurrency,
  formatNumber,
  formatPercent,
  formatTonnes,
  normalizeStatus,
  riskFromStatus,
  uniqueId,
} from './mindMapUtils'

export type MindMapGraphStatus = 'OK' | 'PARTIAL' | 'NO_DATA'
export type MindMapDataSource = 'REAL' | 'DEMO' | 'ESTIMADO' | 'MIXED' | 'NO_DATA'
export type MindMapNodeStatus = 'NORMAL' | 'ATTENTION' | 'CRITICAL' | 'INACTIVE' | 'UNKNOWN'
export type MindMapConfidence = 'ALTA' | 'MEDIA' | 'BAJA' | string
export type MindMapViewMode = 'CONSTELACION' | 'RADIAL' | 'FLUJO' | 'RIESGO' | 'ECONOMIA'
export type MindMapQuality = 'AUTO' | 'ALTA' | 'MEDIA' | 'BAJA'

export type MindMapCategory =
  | 'ROOT'
  | 'OPERATION'
  | 'PRODUCTION'
  | 'FLEET'
  | 'LOADING'
  | 'ECONOMY'
  | 'RISK'
  | 'INTELLIGENCE'
  | 'MONTHLY_TARGET'

export type MindMapNodeType =
  | 'ROOT'
  | 'SHIFT'
  | 'KPI'
  | 'SHOVEL'
  | 'TRUCK'
  | 'DESTINATION'
  | 'BENCH'
  | 'MESH'
  | 'ALERT'
  | 'LOSS'
  | 'COST'
  | 'RECOMMENDATION'
  | 'RISK'
  | 'TARGET'
  | 'CATEGORY'

export interface MindMapMetadata {
  [key: string]: string | number | boolean | null | undefined | string[] | number[]
}

export interface MindMapNode {
  id: string
  type: MindMapNodeType
  category: MindMapCategory
  label: string
  value?: number | null
  displayValue?: string
  unit?: string
  status: MindMapNodeStatus
  importance: number
  risk: number
  confidence?: MindMapConfidence
  data_source: string
  sourceEndpoint?: string
  generated_at?: string | null
  metadata: MindMapMetadata
}

export interface MindMapEdge {
  id: string
  source: string
  target: string
  type: string
  weight: number
  flow: number
  risk: number
  active: boolean
  category: MindMapCategory
  data_source: string
}

export interface MindMapGraph {
  status: MindMapGraphStatus
  data_source: MindMapDataSource
  generated_at: string
  nodes: MindMapNode[]
  edges: MindMapEdge[]
  metadata: {
    source_system?: string
    backend_status?: string
    data_source_status?: string
    last_real_record?: string | null
    api_errors: MindMapSourceError[]
    modules_loaded: number
    modules_requested: number
  }
}

export interface MindMapSourceError {
  endpoint: string
  message: string
}

export interface MindMapSources {
  cockpit?: CockpitResponse
  profit?: ProfitOptimizationResponse
  hiddenLosses?: HiddenLossesResponse
  operationalNlp?: OperationalNlpResponse
  dispatcher?: DispatcherAdvisorResponse
  decisionAudit?: DecisionAuditResponse
  monthlyTarget?: MonthlyTargetResponse
  errors: MindMapSourceError[]
}

export const categoryDefinitions: Array<{
  id: MindMapCategory
  label: string
  color: string
  description: string
}> = [
  { id: 'OPERATION', label: 'Operacion', color: '#5B9DFF', description: 'Turno, fecha y frescura operacional' },
  { id: 'PRODUCTION', label: 'Produccion', color: '#2FD4FF', description: 'Toneladas, ciclos y rendimiento' },
  { id: 'FLEET', label: 'Flota', color: '#3EE58A', description: 'CAEX activos, inactivos y posibles averias' },
  { id: 'LOADING', label: 'Carguio', color: '#FFC94A', description: 'Palas, destinos y concentracion de carga' },
  { id: 'ECONOMY', label: 'Economia', color: '#C98BFF', description: 'Costos, margen, perdidas y valor' },
  { id: 'RISK', label: 'Riesgos', color: '#FF5C5C', description: 'Alertas, congestiones y causas' },
  { id: 'INTELLIGENCE', label: 'Inteligencia', color: '#FF7ED4', description: 'Advisor, NLP, escenarios y auditoria' },
  { id: 'MONTHLY_TARGET', label: 'Plan Mensual', color: '#2BE0C0', description: 'Meta acumulada, real y brecha' },
]

const ROOT_ID = 'northmine-root'
const CATEGORY_NODE_PREFIX = 'category'

type NodeInput = Omit<MindMapNode, 'id' | 'metadata'> & {
  id?: string
  metadata?: MindMapMetadata
}

function nodeIdFor(category: MindMapCategory): string {
  return `${CATEGORY_NODE_PREFIX}-${category.toLowerCase()}`
}

function getDataSource(...sources: Array<string | undefined>): MindMapDataSource {
  const normalized = sources.filter(Boolean).map(source => String(source).toUpperCase())
  if (!normalized.length) return 'NO_DATA'
  if (normalized.some(source => source === 'DEMO')) return normalized.every(source => source === 'DEMO') ? 'DEMO' : 'MIXED'
  if (normalized.some(source => source === 'ESTIMADO')) return normalized.every(source => source === 'ESTIMADO') ? 'ESTIMADO' : 'MIXED'
  if (normalized.every(source => source === 'REAL')) return 'REAL'
  return 'MIXED'
}

function addNode(nodes: MindMapNode[], ids: Set<string>, input: NodeInput): MindMapNode {
  const id = input.id && !ids.has(input.id) ? input.id : uniqueId(input.id ?? `${input.category}-${input.type}-${input.label}`, ids)
  ids.add(id)
  const node: MindMapNode = {
    id,
    category: input.category,
    type: input.type,
    label: input.label,
    value: input.value ?? null,
    displayValue: input.displayValue,
    unit: input.unit,
    status: input.status,
    importance: clamp(input.importance, 0.08, 1),
    risk: clamp(input.risk, 0, 1),
    confidence: input.confidence,
    data_source: input.data_source,
    sourceEndpoint: input.sourceEndpoint,
    generated_at: input.generated_at,
    metadata: input.metadata ?? {},
  }
  nodes.push(node)
  return node
}

function addEdge(edges: MindMapEdge[], source: string, target: string, input: Omit<MindMapEdge, 'id' | 'source' | 'target'>): void {
  if (!source || !target || source === target) return
  const id = `${source}->${target}:${input.type}`
  if (edges.some(edge => edge.id === id)) return
  edges.push({
    id,
    source,
    target,
    type: input.type,
    weight: clamp(input.weight, 0.05, 1),
    flow: clamp(input.flow, 0, 1),
    risk: clamp(input.risk, 0, 1),
    active: input.active,
    category: input.category,
    data_source: input.data_source,
  })
}

function addKpiNode(
  nodes: MindMapNode[],
  edges: MindMapEdge[],
  ids: Set<string>,
  categoryId: string,
  category: MindMapCategory,
  label: string,
  value: number | null | undefined,
  displayValue: string,
  data_source: string,
  sourceEndpoint: string,
  metadata: MindMapMetadata = {},
): void {
  const numeric = asNumber(value)
  const node = addNode(nodes, ids, {
    type: 'KPI',
    category,
    label,
    value: numeric,
    displayValue,
    status: numeric === null ? 'UNKNOWN' : 'NORMAL',
    importance: numeric === null ? 0.28 : 0.55,
    risk: 0.18,
    data_source,
    sourceEndpoint,
    metadata,
  })
  addEdge(edges, categoryId, node.id, {
    type: 'kpi',
    weight: 0.46,
    flow: numeric === null ? 0.08 : 0.34,
    risk: node.risk,
    active: numeric !== null,
    category,
    data_source,
  })
}

function addSourceErrorNodes(nodes: MindMapNode[], edges: MindMapEdge[], ids: Set<string>, errors: MindMapSourceError[]): void {
  const riskCategory = nodeIdFor('RISK')
  errors.slice(0, 7).forEach(error => {
    const node = addNode(nodes, ids, {
      type: 'ALERT',
      category: 'RISK',
      label: `API parcial: ${error.endpoint}`,
      displayValue: error.message,
      status: 'ATTENTION',
      importance: 0.38,
      risk: 0.56,
      data_source: 'PARTIAL',
      metadata: { endpoint: error.endpoint, message: error.message },
    })
    addEdge(edges, riskCategory, node.id, {
      type: 'api_error',
      weight: 0.35,
      flow: 0.12,
      risk: 0.56,
      active: true,
      category: 'RISK',
      data_source: 'PARTIAL',
    })
  })
}

export function buildOperationalMindMap(sources: MindMapSources): MindMapGraph {
  const nodes: MindMapNode[] = []
  const edges: MindMapEdge[] = []
  const ids = new Set<string>()

  const availableSources = [
    sources.cockpit?.data_source,
    sources.profit?.data_source,
    sources.hiddenLosses?.data_source,
    sources.operationalNlp?.data_source,
    sources.dispatcher?.data_source,
    sources.decisionAudit?.data_source,
    sources.monthlyTarget?.data_source,
  ].filter(Boolean) as string[]
  const dataSource = getDataSource(...availableSources)
  const generatedAt = sources.cockpit?.generated_at ?? sources.dispatcher?.generated_at ?? sources.monthlyTarget?.generated_at ?? new Date().toISOString()

  addNode(nodes, ids, {
    id: ROOT_ID,
    type: 'ROOT',
    category: 'ROOT',
    label: 'NORTHMINE',
    displayValue: dataSource === 'REAL' ? 'Datos reales WENCO' : dataSource,
    status: dataSource === 'REAL' ? 'NORMAL' : dataSource === 'NO_DATA' ? 'UNKNOWN' : 'ATTENTION',
    importance: 1,
    risk: dataSource === 'REAL' ? 0.12 : 0.52,
    data_source: dataSource,
    generated_at: generatedAt,
    metadata: {
      source_system: sources.cockpit?.source_system ?? sources.monthlyTarget?.source_system ?? 'NORTHMINE',
      backend_status: sources.cockpit?.backend_status,
      data_source_status: sources.cockpit?.data_source_status,
    },
  })

  categoryDefinitions.forEach(category => {
    const node = addNode(nodes, ids, {
      id: nodeIdFor(category.id),
      type: 'CATEGORY',
      category: category.id,
      label: category.label,
      displayValue: category.description,
      status: dataSource === 'NO_DATA' ? 'UNKNOWN' : 'NORMAL',
      importance: 0.74,
      risk: 0.18,
      data_source: dataSource,
      generated_at: generatedAt,
      metadata: { description: category.description },
    })
    addEdge(edges, ROOT_ID, node.id, {
      type: 'category',
      weight: 0.72,
      flow: 0.46,
      risk: node.risk,
      active: dataSource !== 'NO_DATA',
      category: category.id,
      data_source: dataSource,
    })
  })

  const cockpit = sources.cockpit
  if (cockpit) {
    const operation = nodeIdFor('OPERATION')
    const production = nodeIdFor('PRODUCTION')
    const fleet = nodeIdFor('FLEET')
    const loading = nodeIdFor('LOADING')
    const economy = nodeIdFor('ECONOMY')
    const risk = nodeIdFor('RISK')
    const dataSourceLabel = cockpit.data_source
    const findLoadingUnitNode = (label: string) =>
      nodes.find(candidate => candidate.type === 'SHOVEL' && candidate.category === 'LOADING' && candidate.label === label)

    const shiftNode = addNode(nodes, ids, {
      type: 'SHIFT',
      category: 'OPERATION',
      label: cockpit.shift?.name ?? cockpit.selected_shift ?? 'Turno',
      displayValue: cockpit.shift?.date ?? cockpit.selected_date ?? 'Fecha no disponible',
      status: normalizeStatus(cockpit.status),
      importance: 0.62,
      risk: riskFromStatus(cockpit.status),
      data_source: dataSourceLabel,
      sourceEndpoint: '/api/cockpit',
      generated_at: cockpit.generated_at,
      metadata: {
        selected_date: cockpit.selected_date,
        selected_shift: cockpit.selected_shift,
        last_real_record: cockpit.last_real_record,
        source_system: cockpit.source_system,
      },
    })
    addEdge(edges, operation, shiftNode.id, {
      type: 'operational_context',
      weight: 0.62,
      flow: 0.34,
      risk: shiftNode.risk,
      active: true,
      category: 'OPERATION',
      data_source: dataSourceLabel,
    })

    addKpiNode(nodes, edges, ids, production, 'PRODUCTION', 'Toneladas turno', cockpit.production?.actual_tonnes, formatTonnes(cockpit.production?.actual_tonnes), dataSourceLabel, '/api/cockpit')
    addKpiNode(nodes, edges, ids, production, 'PRODUCTION', 'Ciclos', cockpit.production?.cycles, formatNumber(cockpit.production?.cycles), dataSourceLabel, '/api/cockpit')
    addKpiNode(nodes, edges, ids, production, 'PRODUCTION', 'Promedio t/ciclo', cockpit.production?.avg_tonnes_per_cycle, formatNumber(cockpit.production?.avg_tonnes_per_cycle, 1), dataSourceLabel, '/api/cockpit')
    addKpiNode(nodes, edges, ids, production, 'PRODUCTION', 'Proyeccion cierre', cockpit.production?.forecast_tonnes, formatTonnes(cockpit.production?.forecast_tonnes), dataSourceLabel, '/api/cockpit')

    addKpiNode(nodes, edges, ids, fleet, 'FLEET', 'CAEX activos', cockpit.production?.caex_active, formatNumber(cockpit.production?.caex_active), dataSourceLabel, '/api/cockpit')
    addKpiNode(nodes, edges, ids, fleet, 'FLEET', 'CAEX en circuito', cockpit.production?.avg_caex_in_circuit, formatNumber(cockpit.production?.avg_caex_in_circuit, 1), dataSourceLabel, '/api/cockpit')
    addKpiNode(nodes, edges, ids, economy, 'ECONOMY', 'Costo por tonelada', cockpit.economics?.cost_per_tonne_usd, `USD ${formatNumber(cockpit.economics?.cost_per_tonne_usd, 2)}/t`, dataSourceLabel, '/api/cockpit')
    addKpiNode(nodes, edges, ids, economy, 'ECONOMY', 'Costo acumulado', cockpit.economics?.total_cost_usd, formatCurrency(cockpit.economics?.total_cost_usd), dataSourceLabel, '/api/cockpit')
    const nonComplianceRisk = cockpit.production?.non_compliance_risk ?? null
    addKpiNode(nodes, edges, ids, risk, 'RISK', 'Riesgo incumplimiento', nonComplianceRisk === null ? null : nonComplianceRisk * 100, formatPercent(nonComplianceRisk === null ? null : nonComplianceRisk * 100), dataSourceLabel, '/api/cockpit')

    cockpit.caex_status?.slice(0, 30).forEach(truck => {
      const status = normalizeStatus(truck.status)
      const node = addNode(nodes, ids, {
        type: 'TRUCK',
        category: 'FLEET',
        label: truck.caex_id,
        value: truck.tons,
        displayValue: `${formatTonnes(truck.tons)} - ${truck.cycles} ciclos`,
        status,
        importance: clamp(0.32 + (truck.tons || 0) / Math.max(1, cockpit.production.actual_tonnes || 1), 0.28, 0.74),
        risk: riskFromStatus(truck.status),
        data_source: dataSourceLabel,
        sourceEndpoint: '/api/cockpit',
        generated_at: cockpit.generated_at,
        metadata: {
          estado: truck.status,
          ciclos: truck.cycles,
          ultima_actividad: truck.last_activity,
          carguio: truck.loading_unit,
          destino: truck.destination,
          operador: truck.operator,
        },
      })
      addEdge(edges, fleet, node.id, {
        type: 'fleet_equipment',
        weight: 0.28 + node.importance * 0.42,
        flow: status === 'NORMAL' ? 0.55 : 0.18,
        risk: node.risk,
        active: status === 'NORMAL',
        category: 'FLEET',
        data_source: dataSourceLabel,
      })
      if (truck.loading_unit) {
        const loaderNode = findLoadingUnitNode(truck.loading_unit) ?? addNode(nodes, ids, {
            id: uniqueId(`pala-${truck.loading_unit}`, ids),
            type: 'SHOVEL',
            category: 'LOADING',
            label: truck.loading_unit,
            displayValue: 'Carguio asociado',
            status: 'NORMAL',
            importance: 0.42,
            risk: 0.2,
            data_source: dataSourceLabel,
            sourceEndpoint: '/api/cockpit',
            generated_at: cockpit.generated_at,
            metadata: { from_truck: truck.caex_id },
          })
        addEdge(edges, node.id, loaderNode.id, {
          type: 'loads_at',
          weight: 0.28,
          flow: 0.48,
          risk: node.risk,
          active: true,
          category: 'LOADING',
          data_source: dataSourceLabel,
        })
      }
    })

    cockpit.shovels?.slice(0, 14).forEach(shovel => {
      const status = normalizeStatus(shovel.status)
      const existingNode = findLoadingUnitNode(shovel.id)
      const node = existingNode ?? addNode(nodes, ids, {
          type: 'SHOVEL',
          category: 'LOADING',
          label: shovel.id,
          value: shovel.tons,
          displayValue: `${formatTonnes(shovel.tons)} - cola ${formatNumber(shovel.queue_min, 1)} min`,
          status,
          importance: clamp(0.38 + (shovel.tons || 0) / Math.max(1, cockpit.production.actual_tonnes || 1), 0.34, 0.82),
          risk: Math.max(riskFromStatus(shovel.status), clamp((shovel.queue_min || 0) / 18, 0, 0.86)),
          data_source: dataSourceLabel,
          sourceEndpoint: '/api/cockpit',
          generated_at: cockpit.generated_at,
          metadata: {
            estado: shovel.status,
            cola_min: shovel.queue_min,
            ciclos: shovel.cycles,
            frente: shovel.front,
            destino: shovel.destination,
            eficiencia_pct: shovel.efficiency_pct,
          },
        })
      if (existingNode) {
        existingNode.value = shovel.tons
        existingNode.displayValue = `${formatTonnes(shovel.tons)} - cola ${formatNumber(shovel.queue_min, 1)} min`
        existingNode.status = status
        existingNode.importance = clamp(0.38 + (shovel.tons || 0) / Math.max(1, cockpit.production.actual_tonnes || 1), 0.34, 0.82)
        existingNode.risk = Math.max(riskFromStatus(shovel.status), clamp((shovel.queue_min || 0) / 18, 0, 0.86))
        existingNode.metadata = {
          estado: shovel.status,
          cola_min: shovel.queue_min,
          ciclos: shovel.cycles,
          frente: shovel.front,
          destino: shovel.destination,
          eficiencia_pct: shovel.efficiency_pct,
        }
      }
      addEdge(edges, loading, node.id, {
        type: 'loading_unit',
        weight: 0.35 + node.importance * 0.4,
        flow: status === 'NORMAL' ? 0.56 : 0.16,
        risk: node.risk,
        active: status === 'NORMAL',
        category: 'LOADING',
        data_source: dataSourceLabel,
      })
    })

    cockpit.destinations?.slice(0, 12).forEach(destination => {
      const node = addNode(nodes, ids, {
        type: 'DESTINATION',
        category: 'LOADING',
        label: destination.destination,
        value: destination.tons,
        displayValue: `${formatTonnes(destination.tons)} - ${formatPercent(destination.pct, 1)}`,
        status: 'NORMAL',
        importance: clamp(0.26 + destination.pct / 100, 0.3, 0.78),
        risk: destination.pct > 45 ? 0.54 : 0.22,
        data_source: dataSourceLabel,
        sourceEndpoint: '/api/cockpit',
        generated_at: cockpit.generated_at,
        metadata: { porcentaje: destination.pct },
      })
      addEdge(edges, loading, node.id, {
        type: 'destination_flow',
        weight: clamp(destination.pct / 100, 0.22, 0.82),
        flow: 0.5,
        risk: node.risk,
        active: true,
        category: 'LOADING',
        data_source: dataSourceLabel,
      })
    })

    cockpit.warnings?.slice(0, 6).forEach(warning => {
      const node = addNode(nodes, ids, {
        type: 'ALERT',
        category: 'RISK',
        label: warning,
        displayValue: 'Advertencia operacional',
        status: 'ATTENTION',
        importance: 0.44,
        risk: 0.62,
        data_source: dataSourceLabel,
        sourceEndpoint: '/api/cockpit',
        generated_at: cockpit.generated_at,
        metadata: { warning },
      })
      addEdge(edges, risk, node.id, {
        type: 'warning',
        weight: 0.38,
        flow: 0.18,
        risk: 0.62,
        active: true,
        category: 'RISK',
        data_source: dataSourceLabel,
      })
    })
  }

  if (sources.hiddenLosses) {
    const hidden = sources.hiddenLosses
    const economy = nodeIdFor('ECONOMY')
    const risk = nodeIdFor('RISK')
    const dataSourceLabel = hidden.data_source
    const summary = addNode(nodes, ids, {
      type: 'LOSS',
      category: 'ECONOMY',
      label: 'Perdida oculta',
      value: hidden.summary?.hidden_loss_usd,
      displayValue: formatCurrency(hidden.summary?.hidden_loss_usd),
      status: normalizeStatus(hidden.summary?.confidence),
      importance: 0.78,
      risk: 0.72,
      confidence: hidden.summary?.confidence,
      data_source: dataSourceLabel,
      sourceEndpoint: '/api/hidden-losses',
      generated_at: hidden.generated_at,
      metadata: {
        fuente_principal: hidden.summary?.primary_source,
        recuperable_usd: hidden.summary?.recoverable_value_usd,
        toneladas_potenciales: hidden.summary?.potential_tonnes,
      },
    })
    addEdge(edges, economy, summary.id, {
      type: 'hidden_loss',
      weight: 0.68,
      flow: 0.32,
      risk: 0.72,
      active: true,
      category: 'ECONOMY',
      data_source: dataSourceLabel,
    })
    addEdge(edges, risk, summary.id, {
      type: 'loss_risk',
      weight: 0.48,
      flow: 0.16,
      risk: 0.78,
      active: true,
      category: 'RISK',
      data_source: dataSourceLabel,
    })

    hidden.losses?.slice(0, 8).forEach(loss => {
      const node = addNode(nodes, ids, {
        type: 'LOSS',
        category: 'ECONOMY',
        label: loss.title,
        value: loss.loss_usd,
        displayValue: formatCurrency(loss.loss_usd),
        status: normalizeStatus(loss.severity),
        importance: clamp(0.3 + (loss.loss_usd || 0) / Math.max(1, hidden.summary.hidden_loss_usd || 1), 0.32, 0.72),
        risk: riskFromStatus(loss.severity),
        confidence: loss.confidence,
        data_source: dataSourceLabel,
        sourceEndpoint: '/api/hidden-losses',
        generated_at: hidden.generated_at,
        metadata: {
          equipo: loss.equipment_id,
          categoria: loss.category,
          horas_perdidas: loss.lost_hours,
          recomendacion: loss.recommendation,
          evidencia: loss.evidence?.slice(0, 3),
        },
      })
      addEdge(edges, summary.id, node.id, {
        type: 'loss_detail',
        weight: node.importance,
        flow: 0.18,
        risk: node.risk,
        active: true,
        category: 'ECONOMY',
        data_source: dataSourceLabel,
      })
    })
  }

  if (sources.profit) {
    const profit = sources.profit
    const economy = nodeIdFor('ECONOMY')
    const intelligence = nodeIdFor('INTELLIGENCE')
    const dataSourceLabel = profit.data_source
    const best = addNode(nodes, ids, {
      type: 'RECOMMENDATION',
      category: 'INTELLIGENCE',
      label: profit.recommendation?.title ?? 'Profit Optimization',
      value: profit.recommendation?.risk_adjusted_value_usd,
      displayValue: formatCurrency(profit.recommendation?.risk_adjusted_value_usd),
      status: normalizeStatus(profit.recommendation?.confidence),
      importance: 0.72,
      risk: 0.36,
      confidence: profit.recommendation?.confidence,
      data_source: dataSourceLabel,
      sourceEndpoint: '/api/profit-optimization',
      generated_at: profit.generated_at,
      metadata: {
        escenario: profit.best_scenario_id,
        porque: profit.recommendation?.why,
        factibilidad: profit.recommendation?.feasibility,
      },
    })
    addEdge(edges, intelligence, best.id, {
      type: 'profit_recommendation',
      weight: 0.62,
      flow: 0.28,
      risk: best.risk,
      active: true,
      category: 'INTELLIGENCE',
      data_source: dataSourceLabel,
    })
    addEdge(edges, economy, best.id, {
      type: 'economic_value',
      weight: 0.52,
      flow: 0.26,
      risk: 0.32,
      active: true,
      category: 'ECONOMY',
      data_source: dataSourceLabel,
    })
    profit.scenarios?.slice(0, 5).forEach(scenario => {
      const node = addNode(nodes, ids, {
        type: 'COST',
        category: 'ECONOMY',
        label: scenario.name,
        value: scenario.risk_adjusted_value_usd,
        displayValue: formatCurrency(scenario.risk_adjusted_value_usd),
        status: normalizeStatus(scenario.risk_label),
        importance: scenario.id === profit.best_scenario_id ? 0.62 : 0.42,
        risk: clamp(scenario.risk, 0, 1),
        confidence: scenario.confidence,
        data_source: dataSourceLabel,
        sourceEndpoint: '/api/profit-optimization',
        generated_at: profit.generated_at,
        metadata: {
          produccion_t: scenario.production_tonnes,
          costo_t: scenario.cost_per_tonne_usd,
          valor_delta_usd: scenario.value_delta_usd,
          factibilidad: scenario.feasibility,
        },
      })
      addEdge(edges, best.id, node.id, {
        type: 'scenario',
        weight: node.importance,
        flow: 0.16,
        risk: node.risk,
        active: scenario.id === profit.best_scenario_id,
        category: 'ECONOMY',
        data_source: dataSourceLabel,
      })
    })
  }

  if (sources.operationalNlp) {
    const nlp = sources.operationalNlp
    const intelligence = nodeIdFor('INTELLIGENCE')
    const risk = nodeIdFor('RISK')
    const dataSourceLabel = nlp.data_source
    const emerging = addNode(nodes, ids, {
      type: 'ALERT',
      category: 'INTELLIGENCE',
      label: nlp.summary?.emerging_pattern ?? 'Patron operacional',
      value: nlp.summary?.estimated_impact_usd,
      displayValue: `${formatNumber(nlp.summary?.frequency)} menciones - ${formatCurrency(nlp.summary?.estimated_impact_usd)}`,
      status: normalizeStatus(nlp.summary?.trend),
      importance: 0.58,
      risk: nlp.summary?.trend === 'EN_AUMENTO' ? 0.66 : 0.42,
      confidence: nlp.summary?.confidence,
      data_source: dataSourceLabel,
      sourceEndpoint: '/api/operational-nlp',
      generated_at: nlp.generated_at,
      metadata: {
        tendencia: nlp.summary?.trend,
        equipos: nlp.summary?.associated_equipment?.slice(0, 6),
        horas_perdidas: nlp.summary?.estimated_lost_hours,
      },
    })
    addEdge(edges, intelligence, emerging.id, {
      type: 'nlp_pattern',
      weight: 0.52,
      flow: 0.22,
      risk: emerging.risk,
      active: true,
      category: 'INTELLIGENCE',
      data_source: dataSourceLabel,
    })
    addEdge(edges, risk, emerging.id, {
      type: 'textual_risk',
      weight: 0.42,
      flow: 0.14,
      risk: emerging.risk,
      active: true,
      category: 'RISK',
      data_source: dataSourceLabel,
    })
    nlp.entities?.equipment?.slice(0, 8).forEach(entity => {
      const node = addNode(nodes, ids, {
        type: 'TRUCK',
        category: 'FLEET',
        label: entity.id,
        value: entity.mentions,
        displayValue: `${formatNumber(entity.mentions)} menciones`,
        status: 'ATTENTION',
        importance: clamp(0.28 + entity.mentions / 20, 0.3, 0.64),
        risk: clamp(0.28 + entity.mentions / 25, 0.28, 0.72),
        data_source: dataSourceLabel,
        sourceEndpoint: '/api/operational-nlp',
        generated_at: nlp.generated_at,
        metadata: { patrones: entity.patterns?.slice(0, 4) },
      })
      addEdge(edges, emerging.id, node.id, {
        type: 'mentioned_equipment',
        weight: node.importance,
        flow: 0.12,
        risk: node.risk,
        active: true,
        category: 'RISK',
        data_source: dataSourceLabel,
      })
    })
  }

  if (sources.dispatcher) {
    const dispatcher = sources.dispatcher
    const intelligence = nodeIdFor('INTELLIGENCE')
    const risk = nodeIdFor('RISK')
    const dataSourceLabel = dispatcher.data_source
    const advisor = addNode(nodes, ids, {
      type: 'RECOMMENDATION',
      category: 'INTELLIGENCE',
      label: dispatcher.advisor?.action?.title ?? 'AI Dispatcher Advisor',
      value: dispatcher.advisor?.impact?.expected_value_usd,
      displayValue: formatCurrency(dispatcher.advisor?.impact?.expected_value_usd),
      status: normalizeStatus(dispatcher.advisor?.risk),
      importance: 0.82,
      risk: riskFromStatus(dispatcher.advisor?.risk),
      confidence: dispatcher.advisor?.confidence,
      data_source: dataSourceLabel,
      sourceEndpoint: '/api/dispatcher-advisor',
      generated_at: dispatcher.generated_at,
      metadata: {
        situacion: dispatcher.advisor?.situation,
        causa: dispatcher.advisor?.probable_cause,
        equipos: dispatcher.advisor?.target_equipment?.slice(0, 8),
        ventana_min: dispatcher.advisor?.execution_window_min,
      },
    })
    addEdge(edges, intelligence, advisor.id, {
      type: 'dispatcher_action',
      weight: 0.76,
      flow: 0.42,
      risk: advisor.risk,
      active: true,
      category: 'INTELLIGENCE',
      data_source: dataSourceLabel,
    })
    addEdge(edges, risk, advisor.id, {
      type: 'risk_response',
      weight: 0.54,
      flow: 0.22,
      risk: advisor.risk,
      active: true,
      category: 'RISK',
      data_source: dataSourceLabel,
    })
    dispatcher.evidence?.slice(0, 5).forEach(evidence => {
      const node = addNode(nodes, ids, {
        type: 'KPI',
        category: 'INTELLIGENCE',
        label: evidence.title,
        displayValue: evidence.detail,
        status: 'NORMAL',
        importance: clamp(0.28 + evidence.weight / 2, 0.28, 0.62),
        risk: 0.28,
        data_source: dataSourceLabel,
        sourceEndpoint: '/api/dispatcher-advisor',
        generated_at: dispatcher.generated_at,
        metadata: { fuente: evidence.source, peso: evidence.weight, detalle: evidence.detail },
      })
      addEdge(edges, node.id, advisor.id, {
        type: 'advisor_evidence',
        weight: node.importance,
        flow: 0.18,
        risk: 0.28,
        active: true,
        category: 'INTELLIGENCE',
        data_source: dataSourceLabel,
      })
    })
  }

  if (sources.decisionAudit) {
    const audit = sources.decisionAudit
    const intelligence = nodeIdFor('INTELLIGENCE')
    const dataSourceLabel = audit.data_source
    const node = addNode(nodes, ids, {
      type: 'RECOMMENDATION',
      category: 'INTELLIGENCE',
      label: audit.status === 'SIN_HISTORIAL' ? 'Auditoria sin historial' : 'Decision Audit',
      value: audit.summary?.recommendations,
      displayValue: audit.status === 'SIN_HISTORIAL' ? audit.message : `${formatNumber(audit.summary?.recommendations)} recomendaciones`,
      status: normalizeStatus(audit.status),
      importance: audit.status === 'SIN_HISTORIAL' ? 0.36 : 0.62,
      risk: audit.status === 'SIN_HISTORIAL' ? 0.24 : 0.34,
      confidence: audit.confidence,
      data_source: dataSourceLabel,
      sourceEndpoint: '/api/decision-audit',
      generated_at: audit.generated_at,
      metadata: {
        ejecutadas: audit.summary?.executed,
        adopcion_pct: audit.summary?.adoption_rate_pct,
        efectividad_pct: audit.summary?.average_effectiveness_pct,
      },
    })
    addEdge(edges, intelligence, node.id, {
      type: 'audit_feedback',
      weight: 0.36,
      flow: audit.status === 'SIN_HISTORIAL' ? 0.04 : 0.22,
      risk: node.risk,
      active: audit.status !== 'SIN_HISTORIAL',
      category: 'INTELLIGENCE',
      data_source: dataSourceLabel,
    })
  }

  if (sources.monthlyTarget) {
    const monthly = sources.monthlyTarget
    const target = nodeIdFor('MONTHLY_TARGET')
    const production = nodeIdFor('PRODUCTION')
    const dataSourceLabel = monthly.data_source
    const status = monthly.mov_diferencia >= 0 ? 'NORMAL' : 'CRITICAL'
    const targetNode = addNode(nodes, ids, {
      type: 'TARGET',
      category: 'MONTHLY_TARGET',
      label: `Meta ${monthly.period?.label ?? 'mensual'} ${monthly.sector}`,
      value: monthly.cumplimiento_pct,
      displayValue: formatPercent(monthly.cumplimiento_pct, 1),
      status,
      importance: 0.66,
      risk: monthly.mov_diferencia >= 0 ? 0.18 : 0.72,
      data_source: dataSourceLabel,
      sourceEndpoint: '/api/monthly-target',
      generated_at: monthly.generated_at,
      metadata: {
        programado: monthly.mov_programado_acumulado,
        real: monthly.mov_real_acumulado,
        diferencia: monthly.mov_diferencia,
        calidad: monthly.quality,
        program_source: monthly.program_source,
        real_source: monthly.real_source,
        last_updated: monthly.last_updated,
      },
    })
    addEdge(edges, target, targetNode.id, {
      type: 'monthly_target',
      weight: 0.66,
      flow: 0.3,
      risk: targetNode.risk,
      active: true,
      category: 'MONTHLY_TARGET',
      data_source: dataSourceLabel,
    })
    addEdge(edges, production, targetNode.id, {
      type: 'target_vs_real',
      weight: 0.48,
      flow: 0.2,
      risk: targetNode.risk,
      active: true,
      category: 'PRODUCTION',
      data_source: dataSourceLabel,
    })
  }

  addSourceErrorNodes(nodes, edges, ids, sources.errors)

  const modulesRequested = 7
  const modulesLoaded = [
    sources.cockpit,
    sources.profit,
    sources.hiddenLosses,
    sources.operationalNlp,
    sources.dispatcher,
    sources.decisionAudit,
    sources.monthlyTarget,
  ].filter(Boolean).length

  const status: MindMapGraphStatus = modulesLoaded === 0 ? 'NO_DATA' : sources.errors.length > 0 ? 'PARTIAL' : 'OK'

  return {
    status,
    data_source: modulesLoaded === 0 ? 'NO_DATA' : dataSource,
    generated_at: generatedAt,
    nodes,
    edges,
    metadata: {
      source_system: sources.cockpit?.source_system ?? sources.monthlyTarget?.source_system ?? 'NORTHMINE',
      backend_status: sources.cockpit?.backend_status,
      data_source_status: sources.cockpit?.data_source_status,
      last_real_record: sources.cockpit?.last_real_record,
      api_errors: sources.errors,
      modules_loaded: modulesLoaded,
      modules_requested: modulesRequested,
    },
  }
}
