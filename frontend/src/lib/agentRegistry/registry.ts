import type { AgentWidgetManifest, AgentWidgetSnapshot } from './types'

/**
 * Registro en memoria de widgets activos. Los widgets aparecen y
 * desaparecen con el ciclo de vida real de React (lazy loading, cambio de
 * tab, seleccion de equipo) - por eso esto es un registro dinamico con
 * register/update/unregister, no una lista estatica calculada una vez.
 */
class AgentWidgetRegistry {
  private widgets = new Map<string, AgentWidgetManifest>()
  private listeners = new Set<() => void>()
  private focusedWidgetId: string | null = null

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

  setFocusedWidget(id: string | null): void {
    this.focusedWidgetId = id
    this.notify()
  }

  getFocusedWidget(): string | null {
    return this.focusedWidgetId
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
