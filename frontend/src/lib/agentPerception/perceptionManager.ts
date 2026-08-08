import { agentSessionClient } from '../agentRuntime/AgentSessionClient'
import type { AgentEvent } from '../agentRuntime/protocol'
import { agentWidgetRegistry } from '../agentRegistry/registry'
import { buildSemanticPerceptionSnapshot } from './semanticPerception'
import { detectPerceptionChanges, createChangeDebouncer } from './changeDetector'
import { captureViewport, captureWidget, VisualCaptureUnavailableError } from './visualCapture'
import { analyzeCapture } from './visionApi'
import { usePerceptionStore } from './perceptionStore'
import { getPerceptionMode, isVisualCaptureAllowed } from './privacy'
import { PerceptionRateLimiter, PerceptionCache, buildPerceptionFingerprint } from './cache'
import type { SemanticPerceptionSnapshot, VisualObservation } from './types'

/**
 * Orquestador de percepcion (Etapa 5). Se inicializa UNA vez por pestaña
 * (junto con runtimeController.ts) y:
 *
 * 1. Observa el estado semantico (widgets/filtros/foco) con un throttle
 *    corto y envia SOLO los cambios detectados via `context.update`
 *    (seccion 4-5: nunca reenvia el snapshot completo, nunca cada tick).
 * 2. Escucha `perception.capture_requested` del servidor y ejecuta Nivel 3
 *    (captura + VisionProvider) - nunca automatico, solo cuando el Runtime
 *    lo pide explicitamente o el propio usuario lo dispara desde el
 *    Workspace.
 */

const SEMANTIC_POLL_INTERVAL_MS = 800

let initialized = false
let lastSnapshot: SemanticPerceptionSnapshot | null = null
let pollTimer: number | null = null

const viewportLimiter = new PerceptionRateLimiter(4, 60_000)
const widgetLimiter = new PerceptionRateLimiter(10, 60_000)
const visualCache = new PerceptionCache<VisualObservation>()

function captureFingerprint(targetType: 'widget' | 'viewport', widgetId: string | undefined): string {
  const widget = widgetId ? agentWidgetRegistry.perceivedWidget(widgetId) : null
  return buildPerceptionFingerprint({
    targetType,
    widgetId: widgetId ?? null,
    moduleId: lastSnapshot?.moduleId ?? null,
    semanticSummary: widget?.semanticSummary ?? null,
    activeFilters: lastSnapshot?.activeFilters ?? null,
    selectedEntities: lastSnapshot?.selectedEntities ?? null,
  })
}

function widgetsForPatch(snapshot: SemanticPerceptionSnapshot) {
  return snapshot.visibleWidgets.map((w) => ({
    widgetId: w.widgetId, type: w.type, label: w.label, moduleId: w.moduleId,
    semanticSummary: w.semanticSummary, freshnessStatus: w.freshnessStatus, qualityStatus: w.qualityStatus,
    visualCaptureSupported: w.visualCaptureSupported, visibility: { level: w.visibility.level },
  }))
}

const sendChanges = createChangeDebouncer((changes) => {
  if (!lastSnapshot) return
  const patch: Record<string, unknown> = {}
  const kinds = new Set(changes.map((c) => c.kind))
  const touchedWidgets = changes.some((c) => c.path.startsWith('widget.'))

  if (kinds.has('navigation')) {
    patch.route = lastSnapshot.route
    patch.moduleId = lastSnapshot.moduleId
  }
  if (kinds.has('selection')) patch.selectedEntities = lastSnapshot.selectedEntities
  if (kinds.has('filter')) {
    patch.activeFilters = lastSnapshot.activeFilters
    patch.dateRange = lastSnapshot.dateRange
    patch.shift = lastSnapshot.shift
  }
  if (changes.some((c) => c.path === 'focusedWidgetId')) patch.focusedWidgetId = lastSnapshot.focusedWidgetId
  if (touchedWidgets || kinds.has('metric_change') || kinds.has('data_freshness')) {
    patch.visibleWidgets = widgetsForPatch(lastSnapshot)
  }
  if (kinds.has('alert_change')) {
    // las alertas viven dentro de visibleWidgets del tipo alert-list en el
    // backend tambien, pero se envian aparte para no depender de que el
    // widget alert-list este entre los cambiados.
    patch.visibleWidgets = widgetsForPatch(lastSnapshot)
  }

  if (Object.keys(patch).length > 0) {
    agentSessionClient.send('context.update', { changes: patch })
  }

  usePerceptionStore.getState().setScreenState(lastSnapshot.moduleId, lastSnapshot.focusedWidgetId)
}, 300)

function pollSemanticState(): void {
  const next = buildSemanticPerceptionSnapshot()
  const changes = detectPerceptionChanges(lastSnapshot, next)
  lastSnapshot = next
  if (changes.length) sendChanges(changes)
}

export function initPerceptionManager(): void {
  if (initialized) return
  initialized = true

  usePerceptionStore.getState().setMode(getPerceptionMode())
  pollTimer = window.setInterval(pollSemanticState, SEMANTIC_POLL_INTERVAL_MS)
  agentWidgetRegistry.subscribe(pollSemanticState)
  pollSemanticState() // primer envio: siempre navigation (previous=null)

  agentSessionClient.on(handleServerEvent)
}

function handleServerEvent(event: AgentEvent): void {
  if (event.event_type === 'perception.capture_requested') {
    const payload = event.payload as { targetType: 'widget' | 'viewport'; widgetId: string | null }
    void performCaptureAndAnalyze(payload.targetType, payload.widgetId ?? undefined)
    return
  }
  if (event.event_type === 'perception.conflict_detected') {
    const payload = event.payload as { conflict: { conflict_id: string; description: string; ui_value: unknown; backend_value: unknown; widget_id: string | null } }
    usePerceptionStore.getState().setConflict({
      conflictId: payload.conflict.conflict_id, description: payload.conflict.description,
      uiValue: payload.conflict.ui_value, backendValue: payload.conflict.backend_value, widgetId: payload.conflict.widget_id,
    })
  }
}

/** Punto de entrada UNICO para Nivel 3 - usado tanto por el flujo dirigido
 * por el servidor (`perception.capture_requested`) como por un boton del
 * Workspace ("Analizar de nuevo"). Ambos caminos reportan el resultado de
 * vuelta al Runtime via WS para que el Verifier/auditoria lo vean siempre. */
export async function performCaptureAndAnalyze(targetType: 'widget' | 'viewport', widgetId?: string): Promise<void> {
  const store = usePerceptionStore.getState()

  if (!isVisualCaptureAllowed()) {
    agentSessionClient.send('perception.capture_unavailable', { reason: 'privacy_disabled', targetType, widgetId })
    store.setCaptureError({ reason: 'privacy_disabled', message: 'La percepción visual está desactivada.' })
    return
  }

  // Cache (seccion 30-31): si nada cambio desde la ultima observacion de
  // este mismo objetivo (widget/filtros/entidad/dato subyacente), se
  // reutiliza sin volver a capturar ni a llamar al VisionProvider, y sin
  // consumir el limite de tasa - no hubo captura nueva que limitar.
  const cacheKey = `${targetType}:${widgetId ?? 'viewport'}`
  const fingerprint = captureFingerprint(targetType, widgetId)
  const cached = visualCache.get(cacheKey, fingerprint)
  if (cached) {
    store.setObservation(cached)
    return
  }

  const limiter = targetType === 'viewport' ? viewportLimiter : widgetLimiter
  if (!limiter.allow()) {
    agentSessionClient.send('perception.capture_unavailable', { reason: 'rate_limited', targetType, widgetId })
    store.setCaptureError({ reason: 'rate_limited', message: 'Demasiadas capturas visuales en poco tiempo, espera un momento.' })
    return
  }

  store.setCapturing(true)
  try {
    const capture = targetType === 'widget' && widgetId ? await captureWidget(widgetId) : await captureViewport()
    store.setCapturing(false)
    store.setCaptureUrl(URL.createObjectURL(capture.blob))
    store.setAnalyzing(true)

    const widget = widgetId ? agentWidgetRegistry.perceivedWidget(widgetId) : null
    const observation = await analyzeCapture(capture, {
      moduleId: lastSnapshot?.moduleId ?? null,
      widgetLabel: widget?.label ?? null,
      semanticSummary: widget?.semanticSummary ?? null,
      equipmentId: lastSnapshot?.selectedEntities[0]?.id ?? null,
    })

    store.setAnalyzing(false)
    store.setObservation(observation)
    visualCache.set(cacheKey, fingerprint, observation)
    agentSessionClient.send('perception.observation_reported', {
      observation: {
        observation_id: observation.observationId, capture_id: observation.captureId, target_type: observation.targetType,
        widget_id: observation.widgetId ?? null, summary: observation.summary, detected_elements: observation.detectedElements,
        possible_anomalies: observation.possibleAnomalies, uncertainty: observation.uncertainty, confidence: observation.confidence,
      },
    })
  } catch (error) {
    store.setCapturing(false)
    store.setAnalyzing(false)
    if (error instanceof VisualCaptureUnavailableError) {
      agentSessionClient.send('perception.capture_unavailable', { reason: error.reason, targetType, widgetId })
      store.setCaptureError({ reason: error.reason, message: error.message })
      return
    }
    const message = error instanceof Error ? error.message : 'No se pudo analizar la captura.'
    agentSessionClient.send('perception.capture_unavailable', { reason: 'capture_failed', targetType, widgetId })
    store.setCaptureError({ reason: 'capture_failed', message })
  }
}

export function stopPerceptionManager(): void {
  if (pollTimer != null) window.clearInterval(pollTimer)
  pollTimer = null
  initialized = false
  lastSnapshot = null
}
