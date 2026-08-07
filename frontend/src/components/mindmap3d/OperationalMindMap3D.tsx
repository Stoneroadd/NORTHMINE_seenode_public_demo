import { lazy, Suspense, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, DatabaseZap, Network, RefreshCcw } from 'lucide-react'
import { FAST_DEMO_MINDMAP, FAST_PUBLIC_DEMO } from '../../demo/fastDemo'
import { northmineApi } from '../../lib/api'
import { MindMapControls } from './MindMapControls'
import { MindMapFilters } from './MindMapFilters'
import { MindMapInspector } from './MindMapInspector'
import { MindMapLegend } from './MindMapLegend'
import { MindMapSearch } from './MindMapSearch'
import { createMindMapLayout, type LayoutNode } from './mindMapLayout'
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
import { useAgentWidget } from '../../lib/agentRegistry/useAgentWidget'
import type { SceneWidgetSnapshot } from '../../lib/agentPerception/sceneContracts'

type SourceKey = Exclude<keyof MindMapSources, 'errors'>

const LazyMindMapScene = lazy(() => import('./MindMapScene').then(module => ({ default: module.MindMapScene })))

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

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error('Tiempo de respuesta agotado')), timeoutMs)
    promise.then(
      value => {
        window.clearTimeout(timer)
        resolve(value)
      },
      error => {
        window.clearTimeout(timer)
        reject(error)
      },
    )
  })
}

async function fetchOperationalMindMap(t: MindMap3dT): Promise<MindMapGraph> {
  const results = await Promise.allSettled(sourceRequests.map(request => withTimeout(request.run(), 1800)))
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

const allCategories = new Set<MindMapCategory>(['ROOT', ...categoryDefinitions.map(category => category.id)])
const allStatuses = new Set<MindMapNodeStatus>(['NORMAL', 'ATTENTION', 'CRITICAL', 'INACTIVE', 'UNKNOWN'])

function statusClass(value: string | undefined) {
  const normalized = (value ?? '').toLowerCase()
  if (normalized.includes('connected') || normalized.includes('real') || normalized.includes('ok')) return 'is-real'
  if (normalized.includes('demo')) return 'is-demo'
  if (normalized.includes('stale') || normalized.includes('estimado') || normalized.includes('partial')) return 'is-estimated'
  return 'is-partial'
}

function shouldUseLightMap() {
  if (typeof window === 'undefined' || !FAST_PUBLIC_DEMO) return false
  const width = window.innerWidth
  const smallViewport = width <= 640
  const narrowTouchViewport = width <= 820 && window.matchMedia('(hover: none) and (pointer: coarse)').matches
  // Touch capability alone must not downgrade desktop browsers with a large viewport.
  return smallViewport || narrowTouchViewport
}

function useLightMapPreference() {
  const [lightMap, setLightMap] = useState(shouldUseLightMap)

  useEffect(() => {
    if (typeof window === 'undefined' || !FAST_PUBLIC_DEMO) return undefined
    const queries = [
      window.matchMedia('(max-width: 640px)'),
      window.matchMedia('(max-width: 820px) and (hover: none) and (pointer: coarse)'),
    ]
    const sync = () => setLightMap(shouldUseLightMap())
    sync()
    queries.forEach(query => query.addEventListener('change', sync))
    return () => queries.forEach(query => query.removeEventListener('change', sync))
  }, [])

  return lightMap
}

function pointFromBounds(node: LayoutNode, bounds: { minX: number; minY: number; width: number; height: number }) {
  return {
    x: 8 + ((node.position.x - bounds.minX) / bounds.width) * 84,
    y: 8 + ((node.position.y - bounds.minY) / bounds.height) * 84,
  }
}

interface LiteSceneProps {
  graph: MindMapGraph
  viewMode: MindMapViewMode
  selectedNodeId: string | null
  focusedNodeId: string | null
  visibleCategories: Set<MindMapCategory>
  visibleStatuses: Set<MindMapNodeStatus>
  onSelectNode: (node: LayoutNode | null) => void
}

function MindMapLiteScene({
  graph,
  viewMode,
  selectedNodeId,
  focusedNodeId,
  visibleCategories,
  visibleStatuses,
  onSelectNode,
}: LiteSceneProps) {
  const layout = useMemo(() => createMindMapLayout(graph, viewMode), [graph, viewMode])
  const visibleNodes = useMemo(() => {
    const filtered = layout.nodes.filter(node => visibleCategories.has(node.category) && visibleStatuses.has(node.status))
    const pinned = filtered.filter(node => (
      node.type === 'ROOT' ||
      node.type === 'CATEGORY' ||
      node.id === selectedNodeId ||
      node.id === focusedNodeId
    ))
    const pinnedIds = new Set(pinned.map(node => node.id))
    const rest = filtered
      .filter(node => !pinnedIds.has(node.id))
      .sort((a, b) => (b.importance + b.risk * 0.5) - (a.importance + a.risk * 0.5))
      .slice(0, Math.max(0, 34 - pinned.length))
    return [...pinned, ...rest]
  }, [focusedNodeId, layout.nodes, selectedNodeId, visibleCategories, visibleStatuses])

  const visibleIds = useMemo(() => new Set(visibleNodes.map(node => node.id)), [visibleNodes])
  const visibleEdges = useMemo(
    () => layout.edges
      .filter(edge => visibleIds.has(edge.source) && visibleIds.has(edge.target))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 70),
    [layout.edges, visibleIds],
  )
  const bounds = useMemo(() => {
    const xs = visibleNodes.map(node => node.position.x)
    const ys = visibleNodes.map(node => node.position.y)
    const minX = Math.min(...xs, -260)
    const maxX = Math.max(...xs, 260)
    const minY = Math.min(...ys, -210)
    const maxY = Math.max(...ys, 210)
    return {
      minX,
      minY,
      width: Math.max(1, maxX - minX),
      height: Math.max(1, maxY - minY),
    }
  }, [visibleNodes])
  const focusNodes = useMemo(
    () => visibleNodes
      .filter(node => node.type !== 'ROOT' && node.type !== 'CATEGORY')
      .sort((a, b) => (b.risk + b.importance) - (a.risk + a.importance))
      .slice(0, 3),
    [visibleNodes],
  )

  return (
    <div className="nm-map-scene nm-map-lite-scene" role="application" aria-label="Mapa mental operacional demo">
      <div className="nm-map-lite-topline">
        <span>Mapa demo ligero</span>
        <strong>{graph.metadata.modules_loaded}/{graph.metadata.modules_requested} fuentes</strong>
        <span>{visibleNodes.length} nodos visibles</span>
      </div>
      <div className="nm-map-lite-canvas" onClick={() => onSelectNode(null)}>
        <svg className="nm-map-lite-links" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {visibleEdges.map(edge => {
            const source = pointFromBounds(edge.sourceNode, bounds)
            const target = pointFromBounds(edge.targetNode, bounds)
            return (
              <line
                key={edge.id}
                x1={source.x}
                y1={source.y}
                x2={target.x}
                y2={target.y}
                stroke={edge.targetNode.color}
                strokeOpacity={edge.active ? 0.44 : 0.18}
                strokeWidth={Math.max(0.2, edge.weight * 0.9)}
              />
            )
          })}
        </svg>
        {visibleNodes.map(node => {
          const point = pointFromBounds(node, bounds)
          const selected = node.id === selectedNodeId || node.id === focusedNodeId
          const style = {
            left: `${point.x}%`,
            top: `${point.y}%`,
            '--node-color': node.color,
          } as CSSProperties
          return (
            <button
              key={node.id}
              type="button"
              className={`nm-map-lite-node is-${node.status.toLowerCase()} is-${node.type.toLowerCase()}${selected ? ' is-selected' : ''}`}
              style={style}
              onClick={(event) => {
                event.stopPropagation()
                onSelectNode(node)
              }}
            >
              <span>{node.type}</span>
              <strong>{node.label}</strong>
              {node.displayValue && <em>{node.displayValue}</em>}
            </button>
          )
        })}
      </div>
      <div className="nm-map-lite-summary">
        {focusNodes.map(node => (
          <button key={node.id} type="button" onClick={() => onSelectNode(node)}>
            <span>{node.category}</span>
            <strong>{node.label}</strong>
            <em>{node.displayValue ?? node.status}</em>
          </button>
        ))}
      </div>
      <div className="nm-map-scene-hint">Toca un nodo para inspeccionarlo. Usa filtros y busqueda para enfocar.</div>
    </div>
  )
}

export function OperationalMindMap3D() {
  const t = useModuleT(mindmap3dT)
  const [viewMode, setViewMode] = useState<MindMapViewMode>('CONSTELACION')
  const [quality, setQuality] = useState<MindMapQuality>('MEDIA')
  const [paused, setPaused] = useState(false)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>('northmine-root')
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [resetSignal, setResetSignal] = useState(0)
  const [visibleCategories, setVisibleCategories] = useState<Set<MindMapCategory>>(() => new Set(allCategories))
  const [visibleStatuses, setVisibleStatuses] = useState<Set<MindMapNodeStatus>>(() => new Set(allStatuses))
  const lightMap = useLightMapPreference()

  const query = useQuery({
    queryKey: ['operational-mind-map-3d'],
    queryFn: () => fetchOperationalMindMap(t),
    enabled: !FAST_PUBLIC_DEMO,
    initialData: FAST_PUBLIC_DEMO ? FAST_DEMO_MINDMAP : undefined,
    refetchInterval: FAST_PUBLIC_DEMO ? false : 60000,
    refetchOnMount: !FAST_PUBLIC_DEMO,
    refetchOnReconnect: !FAST_PUBLIC_DEMO,
    refetchOnWindowFocus: !FAST_PUBLIC_DEMO,
    staleTime: FAST_PUBLIC_DEMO ? Infinity : 30000,
    gcTime: FAST_PUBLIC_DEMO ? Infinity : 30 * 60000,
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

  // Contrato semantico Etapa 5 (Mapa Operacional 3D): grafo de conocimiento
  // operacional en Three.js, NO una escena georreferenciada de terreno/
  // equipos - ver sceneContracts.ts. `nodesVisibleCount` replica el mismo
  // filtro categoria/estado que usa la escena real, sin duplicar el layout.
  const { ref: sceneWidgetRef } = useAgentWidget({
    id: 'mindmap3d-scene',
    moduleId: 'operationalMap3d',
    type: 'canvas',
    label: 'Mapa Operacional 3D',
    description: 'Grafo de conocimiento operacional (modulos y metricas de NORTHMINE) en Three.js.',
    supportedActions: ['navigate', 'focus_widget', 'explain_widget'],
    getSnapshot: (): SceneWidgetSnapshot => {
      const nodesVisibleCount = graph
        ? graph.nodes.filter(node => visibleCategories.has(node.category) && visibleStatuses.has(node.status)).length
        : 0
      return {
        widgetId: 'mindmap3d-scene',
        type: 'canvas',
        label: 'Mapa Operacional 3D',
        updatedAt: graph?.generated_at ?? new Date().toISOString(),
        viewMode,
        quality,
        paused,
        selectedNodeId,
        selectedNodeLabel: selectedNode?.label ?? null,
        focusedNodeId,
        nodesVisibleCount,
        nodesTotalCount: graph?.nodes.length ?? 0,
        alertCount: alertNodes.nodes.length,
        alertsCritical: alertNodes.critical,
        dataSource: graph?.data_source,
        backendStatus: graph?.metadata.backend_status,
        freshnessStatus: query.isError ? 'unknown' : 'current',
        qualityStatus: graph ? 'high' : 'unknown',
        semanticSummary: !graph
          ? 'Mapa Operacional 3D: sin datos cargados todavia.'
          : `Mapa Operacional 3D: modo ${viewMode}, ${nodesVisibleCount} de ${graph.nodes.length} nodos visibles${selectedNode ? `, nodo seleccionado "${selectedNode.label}" (${selectedNode.status})` : ', sin nodo seleccionado'}${alertNodes.nodes.length ? `, ${alertNodes.nodes.length} nodos en ${alertNodes.critical ? 'estado critico' : 'atencion'}` : ''}.`,
      }
    },
  })

  const handleAlertTour = () => {
    if (!alertNodes.nodes.length) return
    const node = alertNodes.nodes[alertTourIndex % alertNodes.nodes.length]
    if (!node) return
    setSelectedNodeId(node.id)
    setFocusedNodeId(node.id)
    setAlertTourIndex(index => index + 1)
  }

  const toggleCategory = (category: MindMapCategory) => {
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

  const liteScene = graph ? (
    <MindMapLiteScene
      graph={graph}
      viewMode={viewMode}
      selectedNodeId={selectedNodeId}
      focusedNodeId={focusedNodeId}
      visibleCategories={visibleCategories}
      visibleStatuses={visibleStatuses}
      onSelectNode={node => setSelectedNodeId(node?.id ?? null)}
    />
  ) : null

  if ((!FAST_PUBLIC_DEMO && query.isLoading) || !graph) {
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
          <span className={`nm-map-status-pill ${statusClass(FAST_PUBLIC_DEMO ? 'DEMO LOCAL' : graph.metadata.backend_status)}`}>
            {t.page_backend} <strong>{FAST_PUBLIC_DEMO ? 'DEMO LOCAL' : graph.metadata.backend_status ?? t.page_conectado_fallback}</strong>
          </span>
          <span className={`nm-map-status-pill ${statusClass(FAST_PUBLIC_DEMO ? 'DEMO SIN WENCO' : graph.metadata.data_source_status)}`}>
            {t.page_wenco} <strong>{FAST_PUBLIC_DEMO ? 'SIN WENCO' : graph.metadata.data_source_status ?? graph.metadata.source_system ?? 'NORTHMINE'}</strong>
          </span>
          <span className={`nm-map-status-pill ${statusClass(graph.data_source)}`}>
            {t.page_datos} <strong>{graph.data_source}</strong>
          </span>
          <span className="nm-map-status-pill">
            {t.page_actualizado} <strong>{new Date(graph.generated_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</strong>
          </span>
          <span className={`nm-map-status-pill ${FAST_PUBLIC_DEMO ? 'is-demo' : ''}`}>
            Módulos <strong>{graph.metadata.modules_loaded}/{graph.metadata.modules_requested}</strong>
          </span>
          <button
            className="nm-map-refresh-button"
            type="button"
            onClick={() => {
              if (!FAST_PUBLIC_DEMO) void query.refetch()
            }}
            aria-label={t.page_refresh_aria}
            title={FAST_PUBLIC_DEMO ? 'Demo instantanea: datos locales' : t.page_refresh_aria}
          >
            <RefreshCcw size={15} className={!FAST_PUBLIC_DEMO && query.isFetching ? 'is-spinning' : ''} />
          </button>
        </div>
      </header>

      {!FAST_PUBLIC_DEMO && graph.status !== 'OK' && (
        <div className="nm-map-warning">
          <AlertTriangle size={16} />
          <span>
            {t.page_warning(graph.status)}
          </span>
        </div>
      )}

      <div className="nm-map-shell">
        <div className="nm-map-main" ref={sceneWidgetRef}>
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
          {lightMap && liteScene ? liteScene : (
            <Suspense fallback={<div className="nm-map-scene nm-map-scene-loading"><Network size={28} /><strong>{t.page_loading_titulo}</strong><span>{t.page_loading_desc}</span></div>}>
              <LazyMindMapScene
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
            </Suspense>
          )}
        </div>

        <div className="nm-map-side">
          <MindMapLegend graph={graph} isFetching={!FAST_PUBLIC_DEMO && query.isFetching} />
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
