import type { AgentModuleId, AgentSelectedEntity, AgentWidgetType } from '../agentRegistry/types'

/**
 * Contratos de percepcion (Etapa 5, seccion 3 del brief). Percepcion
 * jerarquica en 3 niveles:
 *
 *   Nivel 1 (semantic): estado de aplicacion + widgets - siempre disponible,
 *   sin costo, sin captura de nada. Es lo que ya existia como
 *   AgentApplicationContext (Etapa 2), ahora envuelto en un snapshot con
 *   identidad/frescura propias.
 *
 *   Nivel 2: datos estructurados de cada widget (AgentWidgetSnapshot,
 *   extendido aca con semanticSummary/freshness/quality deterministicos).
 *
 *   Nivel 3 (visual): captura bajo demanda + VisionProvider - nunca
 *   automatica, nunca continua (seccion 29: "no usar screenshots cada
 *   segundo").
 */

// ── Nivel 1: estado semantico ────────────────────────────────────────────

export type PerceptionFreshnessStatus = 'current' | 'delayed' | 'stale' | 'unknown'

export interface PerceptionFreshness {
  sourceTimestamp?: string
  captureTimestamp: string
  ageSeconds: number | null
  status: PerceptionFreshnessStatus
}

export type WidgetVisibilityLevel = 'mounted' | 'visible' | 'partially_visible' | 'hidden' | 'offscreen'

export interface DOMRectLike {
  x: number
  y: number
  width: number
  height: number
}

export interface WidgetVisibilityState {
  mounted: boolean
  visible: boolean
  intersectionRatio: number
  boundingBox?: DOMRectLike
  level: WidgetVisibilityLevel
}

export interface PerceivedWidget {
  widgetId: string
  type: AgentWidgetType
  label: string
  moduleId: string
  semanticSummary: string
  freshnessStatus: PerceptionFreshnessStatus
  qualityStatus: 'high' | 'medium' | 'low' | 'unknown'
  visualCaptureSupported: boolean
  visibility: WidgetVisibilityState
}

export interface PerceivedAlert {
  alertId: string
  severity: string
  label: string
  entityId?: string
  isOpen: boolean
}

export interface SemanticPerceptionSnapshot {
  route: string
  moduleId: AgentModuleId | null
  sectionId?: string
  shift: string | null
  dateRange: { from: string; to: string } | null
  companyId?: string
  siteId?: string
  activeFilters: Record<string, unknown>
  selectedEntities: AgentSelectedEntity[]
  focusedWidgetId: string | null
  visibleWidgets: PerceivedWidget[]
  visibleAlerts: PerceivedAlert[]
  activeDrawer: string | null
  activeModal: string | null
  userRole: string
}

// ── Nivel 3: percepcion visual ───────────────────────────────────────────

export type VisualObservationConfidence = 'low' | 'medium' | 'high'

export interface VisualObservation {
  observationId: string
  captureId: string
  targetType: 'widget' | 'viewport'
  widgetId?: string
  summary: string
  detectedElements: string[]
  possibleAnomalies: string[]
  uncertainty: string[]
  confidence: VisualObservationConfidence
  createdAt: string
}

export interface VisualPerceptionSnapshot {
  captureId: string
  targetType: 'widget' | 'viewport'
  widgetId?: string
  observation?: VisualObservation
  unavailableReason?: string
  freshness: PerceptionFreshness
}

// ── Snapshot combinado ────────────────────────────────────────────────────

export interface AgentPerceptionSnapshot {
  snapshotId: string
  sessionId: string
  route: string
  moduleId: string | null
  sectionId?: string
  semantic: SemanticPerceptionSnapshot
  visual?: VisualPerceptionSnapshot
  selectedEntities: AgentSelectedEntity[]
  activeFilters: Record<string, unknown>
  focusedWidgetId?: string
  visibleWidgets: PerceivedWidget[]
  visibleAlerts: PerceivedAlert[]
  dataFreshness: PerceptionFreshness
  generatedAt: string
}

// ── Cambios (seccion 5) ───────────────────────────────────────────────────

export type PerceptionChangeKind =
  | 'navigation' | 'selection' | 'filter' | 'widget_visibility'
  | 'metric_change' | 'alert_change' | 'data_freshness' | 'visual_change'

export interface PerceptionChange {
  kind: PerceptionChangeKind
  path: string
  previous: unknown
  next: unknown
  detectedAt: string
}

// ── Captura visual (seccion 10) ──────────────────────────────────────────

export type VisualCaptureMimeType = 'image/webp' | 'image/jpeg' | 'image/png'

export interface VisualCaptureResult {
  captureId: string
  targetType: 'widget' | 'viewport'
  widgetId?: string
  width: number
  height: number
  mimeType: VisualCaptureMimeType
  capturedAt: string
  redactionsApplied: string[]
  blob: Blob
}

export type VisualCaptureFailureReason =
  | 'privacy_disabled' | 'target_not_found' | 'target_not_visible'
  | 'capture_unsupported' | 'rate_limited' | 'capture_failed'

export interface VisualCaptureUnavailable {
  reason: VisualCaptureFailureReason
  message: string
}

// ── Modos de percepcion (seccion 32) ──────────────────────────────────────

export type PerceptionMode = 'semantic_only' | 'semantic_plus_visual_on_demand' | 'visual_disabled'
