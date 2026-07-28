import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, DatabaseZap, Network, RefreshCcw } from 'lucide-react'
import { northmineApi } from '../../lib/api'
import { MindMapControls } from './MindMapControls'
import { MindMapFilters } from './MindMapFilters'
import { MindMapInspector } from './MindMapInspector'
import { MindMapLegend } from './MindMapLegend'
import { MindMapScene } from './MindMapScene'
import { MindMapSearch } from './MindMapSearch'
import {
  buildOperationalMindMap,
  categoryDefinitions,
  type MindMapCategory,
  type MindMapGraph,
  type MindMapNodeStatus,
  type MindMapQuality,
  type MindMapSources,
  type MindMapViewMode,
} from './mindMapModel'
import { useModuleT } from '../../i18n/useModuleT'
import { mindmap3dT, type MindMap3dT } from '../../i18n/modules/mindmap3d'

type SourceKey = Exclude<keyof MindMapSources, 'errors'>

const sourceRequests: Array<{ key: SourceKey; endpoint: string; run: () => Promise<unknown> }> = [
  { key: 'cockpit', endpoint: '/api/cockpit', run: () => northmineApi.cockpit() },
  { key: 'profit', endpoint: '/api/profit-optimization', run: () => northmineApi.profitOptimization() },
  { key: 'hiddenLosses', endpoint: '/api/hidden-losses', run: () => northmineApi.hiddenLosses() },
  { key: 'operationalNlp', endpoint: '/api/operational-nlp', run: () => northmineApi.operationalNlp() },
  { key: 'dispatcher', endpoint: '/api/dispatcher-advisor', run: () => northmineApi.dispatcherAdvisor() },
  { key: 'decisionAudit', endpoint: '/api/decision-audit', run: () => northmineApi.decisionAudit() },
  { key: 'monthlyTarget', endpoint: '/api/monthly-target', run: () => northmineApi.monthlyTarget() },
]

function errorMessage(t: MindMap3dT, error: unknown): string {
  if (error instanceof Error) return error.message
  return t.page_modulo_no_disponible
}

async function fetchOperationalMindMap(t: MindMap3dT): Promise<MindMapGraph> {
  const results = await Promise.allSettled(sourceRequests.map(request => request.run()))
  const sources: MindMapSources = { errors: [] }

  results.forEach((result, index) => {
    const request = sourceRequests[index]
    if (!request) return
    if (result.status === 'fulfilled') {
      Object.assign(sources, { [request.key]: result.value })
    } else {
      sources.errors.push({ endpoint: request.endpoint, message: errorMessage(t, result.reason) })
    }
  })

  return buildOperationalMindMap(sources)
}

const allCategories = new Set<MindMapCategory | 'ROOT'>(['ROOT', ...categoryDefinitions.map(category => category.id)])
const allStatuses = new Set<MindMapNodeStatus>(['NORMAL', 'ATTENTION', 'CRITICAL', 'INACTIVE', 'UNKNOWN'])

function statusClass(value: string | undefined) {
  const normalized = (value ?? '').toLowerCase()
  if (normalized.includes('connected') || normalized.includes('real') || normalized.includes('ok')) return 'is-real'
  if (normalized.includes('demo')) return 'is-demo'
  if (normalized.includes('stale') || normalized.includes('estimado') || normalized.includes('partial')) return 'is-estimated'
  return 'is-partial'
}

export function OperationalMindMap3D() {
  const t = useModuleT(mindmap3dT)
  const [viewMode, setViewMode] = useState<MindMapViewMode>('CONSTELACION')
  const [quality, setQuality] = useState<MindMapQuality>('ALTA')
  const [paused, setPaused] = useState(false)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>('northmine-root')
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [resetSignal, setResetSignal] = useState(0)
  const [visibleCategories, setVisibleCategories] = useState<Set<MindMapCategory | 'ROOT'>>(() => new Set(allCategories))
  const [visibleStatuses, setVisibleStatuses] = useState<Set<MindMapNodeStatus>>(() => new Set(allStatuses))

  const query = useQuery({
    queryKey: ['operational-mind-map-3d'],
    queryFn: () => fetchOperationalMindMap(t),
    refetchInterval: 60000,
    staleTime: 30000,
  })

  const graph = query.data

  useEffect(() => {
    if (!graph || !selectedNodeId) return
    if (!graph.nodes.some(node => node.id === selectedNodeId)) {
      setSelectedNodeId(graph.nodes[0]?.id ?? null)
    }
  }, [graph, selectedNodeId])

  const selectedNode = useMemo(() => graph?.nodes.find(node => node.id === selectedNodeId) ?? null, [graph, selectedNodeId])

  const alertNodes = useMemo(() => {
    const critical = graph?.nodes.filter(node => node.status === 'CRITICAL') ?? []
    if (critical.length) return { nodes: critical, critical: true }
    return { nodes: graph?.nodes.filter(node => node.status === 'ATTENTION') ?? [], critical: false }
  }, [graph])
  const [alertTourIndex, setAlertTourIndex] = useState(0)

  const handleAlertTour = () => {
    if (!alertNodes.nodes.length) return
    const node = alertNodes.nodes[alertTourIndex % alertNodes.nodes.length]
    if (!node) return
    setSelectedNodeId(node.id)
    setFocusedNodeId(node.id)
    setAlertTourIndex(index => index + 1)
  }

  const toggleCategory = (category: MindMapCategory | 'ROOT') => {
    setVisibleCategories(prev => {
      const next = new Set(prev)
      if (next.has(category) && next.size > 1) next.delete(category)
      else next.add(category)
      return next
    })
  }

  const toggleStatus = (status: MindMapNodeStatus) => {
    setVisibleStatuses(prev => {
      const next = new Set(prev)
      if (next.has(status) && next.size > 1) next.delete(status)
      else next.add(status)
      return next
    })
  }

  const handleFocusNode = (nodeId: string) => {
    setSelectedNodeId(nodeId)
    setFocusedNodeId(nodeId)
  }

  if (query.isLoading || !graph) {
    return (
      <section className="nm-map-page">
        <div className="nm-map-loading">
          <Network size={28} />
          <strong>{t.page_loading_titulo}</strong>
          <span>{t.page_loading_desc}</span>
        </div>
      </section>
    )
  }

  return (
    <section className="nm-map-page">
      <header className="nm-map-header">
        <div>
          <span className="nm-map-kicker">CAP-017 - Dynamic Operational Data Mind Map 3D</span>
          <h1>{t.page_titulo}</h1>
          <p>{t.page_desc}</p>
        </div>
        <div className="nm-map-status-strip">
          <span className={`nm-map-status-pill ${statusClass(graph.metadata.backend_status)}`}>
            {t.page_backend} <strong>{graph.metadata.backend_status ?? t.page_conectado_fallback}</strong>
          </span>
          <span className={`nm-map-status-pill ${statusClass(graph.metadata.data_source_status)}`}>
            {t.page_wenco} <strong>{graph.metadata.data_source_status ?? graph.metadata.source_system ?? 'NORTHMINE'}</strong>
          </span>
          <span className={`nm-map-status-pill ${statusClass(graph.data_source)}`}>
            {t.page_datos} <strong>{graph.data_source}</strong>
          </span>
          <span className="nm-map-status-pill">
            {t.page_actualizado} <strong>{new Date(graph.generated_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</strong>
          </span>
          <button className="nm-map-refresh-button" type="button" onClick={() => query.refetch()} aria-label={t.page_refresh_aria}>
            <RefreshCcw size={15} className={query.isFetching ? 'is-spinning' : ''} />
          </button>
        </div>
      </header>

      {graph.status !== 'OK' && (
        <div className="nm-map-warning">
          <AlertTriangle size={16} />
          <span>
            {t.page_warning(graph.status)}
          </span>
        </div>
      )}

      <div className="nm-map-shell">
        <div className="nm-map-main">
          <MindMapControls
            viewMode={viewMode}
            quality={quality}
            paused={paused}
            alertCount={alertNodes.nodes.length}
            alertsAreCritical={alertNodes.critical}
            onViewModeChange={setViewMode}
            onQualityChange={setQuality}
            onPausedChange={setPaused}
            onReset={() => {
              setResetSignal(value => value + 1)
              setFocusedNodeId(null)
            }}
            onAlertTour={handleAlertTour}
          />
          <MindMapScene
            graph={graph}
            viewMode={viewMode}
            quality={quality}
            paused={paused}
            selectedNodeId={selectedNodeId}
            focusedNodeId={focusedNodeId}
            visibleCategories={visibleCategories}
            visibleStatuses={visibleStatuses}
            resetSignal={resetSignal}
            onSelectNode={node => setSelectedNodeId(node?.id ?? null)}
          />
        </div>

        <div className="nm-map-side">
          <MindMapLegend graph={graph} isFetching={query.isFetching} />
          <MindMapSearch
            nodes={graph.nodes}
            value={search}
            onChange={setSearch}
            onFocusNode={handleFocusNode}
            onClear={() => {
              setSearch('')
              setFocusedNodeId(null)
            }}
          />
          <MindMapFilters
            visibleCategories={visibleCategories}
            visibleStatuses={visibleStatuses}
            onToggleCategory={toggleCategory}
            onToggleStatus={toggleStatus}
          />
          <div className="nm-map-selected-summary">
            <DatabaseZap size={16} />
            <span>{selectedNode ? `${selectedNode.label} - ${selectedNode.data_source}` : t.page_selecciona_nodo}</span>
          </div>
          <MindMapInspector graph={graph} selectedNodeId={selectedNodeId} />
        </div>
      </div>
    </section>
  )
}
