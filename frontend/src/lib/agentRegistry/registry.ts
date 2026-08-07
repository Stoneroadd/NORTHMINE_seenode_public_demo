import type { AgentWidgetManifest, AgentWidgetSnapshot } from './types'
import type { PerceivedAlert, PerceivedWidget, WidgetVisibilityLevel, WidgetVisibilityState } from '../agentPerception/types'

/**
 * Registro en memoria de widgets activos. Los widgets aparecen y
 * desaparecen con el ciclo de vida real de React (lazy loading, cambio de
 * tab, seleccion de equipo) - por eso esto es un registro dinamico con
 * register/update/unregister, no una lista estatica calculada una vez.
 *
 * Etapa 5: se agrega seguimiento de visibilidad REAL via IntersectionObserver
 * (seccion 7 del brief: nunca afirmar "el usuario esta viendo esto" solo
 * porque el componente este montado), un resumen semantico deterministico
 * por widget (seccion 6: sin LLM cuando se puede calcular), y estado minimo
 * de drawer/modal activo.
 */

const DEFAULT_VISIBILITY: WidgetVisibilityState = {
  mounted: false,
  visible: false,
  intersectionRatio: 0,
  level: 'offscreen',
}

function visibilityLevel(mounted: boolean, ratio: number): WidgetVisibilityLevel {
  if (!mounted) return 'offscreen'
  if (ratio <= 0) return 'hidden'
  if (ratio >= 0.6) return 'visible'
  return 'partially_visible'
}

function buildSemanticSummary(manifest: AgentWidgetManifest, snapshot: AgentWidgetSnapshot | null): string {
  if (!snapshot) return `${manifest.label}: sin datos disponibles todavia.`
  if (typeof snapshot.semanticSummary === 'string' && snapshot.semanticSummary.trim()) {
    return snapshot.semanticSummary
  }
  const unit = typeof snapshot.unit === 'string' ? ` ${snapshot.unit}` : ''
  const status = typeof snapshot.status === 'string' ? ` (${snapshot.status})` : ''
  if (manifest.type === 'kpi' && 'value' in snapshot) {
    return `${snapshot.label}: ${snapshot.value}${unit}${status}.`
  }
  if (manifest.type === 'table' && typeof snapshot.rowCount === 'number') {
    const visible = typeof snapshot.visibleRowCount === 'number' ? snapshot.visibleRowCount : snapshot.rowCount
    return `${snapshot.label}: ${visible} de ${snapshot.rowCount} filas visibles.`
  }
  if (manifest.type === 'chart' && typeof snapshot.latestValue !== 'undefined') {
    const trend = typeof snapshot.trend === 'string' ? `, tendencia ${snapshot.trend}` : ''
    return `${snapshot.label}: ultimo valor ${snapshot.latestValue}${unit}${trend}.`
  }
  return `${snapshot.label} (${manifest.type}), actualizado ${snapshot.updatedAt ?? 'sin fecha registrada'}.`
}

class AgentWidgetRegistry {
  private widgets = new Map<string, AgentWidgetManifest>()
  private listeners = new Set<() => void>()
  private focusedWidgetId: string | null = null
  private activeDrawer: string | null = null
  private activeModal: string | null = null
  private visibility = new Map<string, WidgetVisibilityState>()
  private elements = new Map<string, HTMLElement>()
  private observer: IntersectionObserver | null = null

  register(manifest: AgentWidgetManifest): void {
    this.widgets.set(manifest.id, manifest)
    this.notify()
  }

  update(id: string, patch: Partial<AgentWidgetManifest>): void {
    const current = this.widgets.get(id)
    if (!current) return
    this.widgets.set(id, { ...current, ...patch })
    this.notify()
  }

  unregister(id: string): void {
    // No se toca elements/visibility aca a proposito: esos los posee el
    // ciclo de vida del ref del DOM (observeElement/unobserveElement), no
    // el del manifest. Bajo StrictMode (dev), el useEffect de useAgentWidget
    // se invoca dos veces (mount->cleanup->mount) SIN que el nodo DOM se
    // desmonte de verdad - si unregister tambien limpiara elements/
    // visibility aca, ese cleanup espurio borraria lo que el ref callback ya
    // habia registrado, y como el ref no vuelve a dispararse (el nodo DOM no
    // cambio), la visibilidad quedaria rota en falso "offscreen" para
    // siempre. El desmontaje real del DOM ya limpia esto via el ref callback
    // (useAgentWidget.ts: `element ? ... : agentWidgetRegistry.unobserveElement(id)`).
    if (this.widgets.delete(id)) this.notify()
  }

  get(id: string): AgentWidgetManifest | undefined {
    return this.widgets.get(id)
  }

  listForModule(moduleId: string): AgentWidgetManifest[] {
    return Array.from(this.widgets.values()).filter((widget) => widget.moduleId === moduleId)
  }

  visibleWidgetIds(moduleId: string): string[] {
    return this.listForModule(moduleId).map((widget) => widget.id)
  }

  snapshot(id: string): AgentWidgetSnapshot | null {
    const widget = this.widgets.get(id)
    if (!widget?.getSnapshot) return null
    try {
      return widget.getSnapshot()
    } catch {
      return null
    }
  }

  /** Nivel 1+2 de percepcion combinados para UN widget (Etapa 5, seccion 6). */
  perceivedWidget(id: string): PerceivedWidget | null {
    const manifest = this.widgets.get(id)
    if (!manifest) return null
    const snapshot = this.snapshot(id)
    return {
      widgetId: id,
      type: manifest.type,
      label: manifest.label,
      moduleId: manifest.moduleId,
      semanticSummary: buildSemanticSummary(manifest, snapshot),
      freshnessStatus: (snapshot?.freshnessStatus as PerceivedWidget['freshnessStatus']) ?? 'unknown',
      qualityStatus: (snapshot?.qualityStatus as PerceivedWidget['qualityStatus']) ?? 'unknown',
      visualCaptureSupported: this.elements.has(id),
      visibility: this.visibility.get(id) ?? DEFAULT_VISIBILITY,
    }
  }

  /** Alertas activas conocidas via widgets tipo 'alert-list' que exponen `items`. */
  currentAlerts(): PerceivedAlert[] {
    const alerts: PerceivedAlert[] = []
    for (const manifest of this.widgets.values()) {
      if (manifest.type !== 'alert-list') continue
      const snapshot = this.snapshot(manifest.id)
      const items = Array.isArray(snapshot?.items) ? (snapshot!.items as Array<Record<string, unknown>>) : []
      for (const item of items) {
        const alertId = String(item.id ?? item.alertId ?? '')
        if (!alertId) continue
        alerts.push({
          alertId,
          severity: String(item.severity ?? item.priority ?? 'unknown'),
          label: String(item.label ?? item.title ?? alertId),
          entityId: typeof item.entityId === 'string' ? item.entityId : undefined,
          isOpen: this.activeModal === alertId || this.activeDrawer === alertId,
        })
      }
    }
    return alerts
  }

  setFocusedWidget(id: string | null): void {
    this.focusedWidgetId = id
    this.notify()
  }

  getFocusedWidget(): string | null {
    return this.focusedWidgetId
  }

  setActiveDrawer(id: string | null): void {
    this.activeDrawer = id
    this.notify()
  }

  getActiveDrawer(): string | null {
    return this.activeDrawer
  }

  setActiveModal(id: string | null): void {
    this.activeModal = id
    this.notify()
  }

  getActiveModal(): string | null {
    return this.activeModal
  }

  // ── Visibilidad real (Etapa 5, seccion 7) ──────────────────────────────

  private getObserver(): IntersectionObserver | null {
    if (typeof IntersectionObserver === 'undefined') return null
    if (this.observer) return this.observer
    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).getAttribute('data-agent-widget-id')
          if (!id) continue
          const rect = entry.boundingClientRect
          this.visibility.set(id, {
            mounted: true,
            visible: entry.isIntersecting,
            intersectionRatio: entry.intersectionRatio,
            boundingBox: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
            level: visibilityLevel(true, entry.intersectionRatio),
          })
        }
        this.notify()
      },
      { threshold: [0, 0.25, 0.6, 1] },
    )
    return this.observer
  }

  observeElement(id: string, element: HTMLElement): void {
    this.elements.set(id, element)
    this.visibility.set(id, { ...(this.visibility.get(id) ?? DEFAULT_VISIBILITY), mounted: true })
    const observer = this.getObserver()
    observer?.observe(element)
  }

  unobserveElement(id: string): void {
    const element = this.elements.get(id)
    if (element) this.observer?.unobserve(element)
    this.elements.delete(id)
  }

  getElement(id: string): HTMLElement | null {
    return this.elements.get(id) ?? null
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener())
  }
}

export const agentWidgetRegistry = new AgentWidgetRegistry()
