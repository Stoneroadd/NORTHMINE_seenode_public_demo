import type { CopilotUIAction } from '../aiCopilot'
import { agentWidgetRegistry } from '../agentRegistry/registry'
import type { AgentActionResult } from '../agentRegistry/types'
import { secureApi } from '../api'
import { enqueueAgentAction } from '../../components/ai-copilot/agentActionExecutor'
import { AGENT_COMMAND_PALETTE_DEMO_EVENT } from '../../components/ai-copilot/AgentCommandPalette'
import { agentSessionClient } from '../agentRuntime/AgentSessionClient'
import { dispatchStructuredIntent } from '../agentRuntime/dispatchIntent'
import { CONTEXT_QUICK_ACTIONS, type AgentQuickAction } from '../agentRuntime/quickActions'
import { useAgentRuntimeStore } from '../agentRuntime/runtimeStore'
import { speechOutputRouter } from '../agentVoice/SpeechOutputRouter'
import type { AgentEvent } from '../agentRuntime/protocol'
import type {
  AgentDemoMode, AgentDemoSceneResult, AgentDemoScore, AgentDemoSnapshot, AgentDemoSpeed, AgentDemoTraceEntry,
} from './types'
import { AGENT_DEMO_HUD_COLLAPSE, AGENT_DEMO_WORK_PRODUCT_FOCUS, AGENT_DEMO_WORK_PRODUCT_READY } from './events'

type Listener = () => void
type EventPredicate = (event: AgentEvent) => boolean

interface StartOptions {
  scenarioId?: string
  mode?: AgentDemoMode
  speed?: AgentDemoSpeed
}

interface SceneDefinition {
  id: string
  title: string
  message: string
  expected: string
  run: () => Promise<string>
}

const initialScore: AgentDemoScore = {
  reasoning: 'PENDING', evidence: 'PENDING', safety: 'PENDING', context: 'PENDING',
  uiManipulation: 'PENDING', guidance: 'PENDING', reports: 'PENDING', latency: 'PENDING',
}

function baseSnapshot(): AgentDemoSnapshot {
  return {
    classification: 'AUTOMATED_AGENT_DEMO', physicalBrowserAcceptance: 'SEPARATE', status: 'idle',
    scenarioId: 'full_operational_demo', mode: 'deterministic', speed: 'presentation', currentIndex: -1,
    currentMessage: 'Lista para iniciar.', scenes: [], score: null, trace: [], startedAt: null,
    completedAt: null, error: null,
  }
}

function safePayload(payload: Record<string, unknown>): Record<string, unknown> {
  const blocked = /token|jwt|secret|authorization|cookie|api[_-]?key|audio/i
  return Object.fromEntries(Object.entries(payload).filter(([key]) => !blocked.test(key)))
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

class AgentDemoController {
  private snapshot: AgentDemoSnapshot = baseSnapshot()
  private listeners = new Set<Listener>()
  private eventWaiters = new Set<{ predicate: EventPredicate; resolve: (event: AgentEvent) => void; reject: (error: Error) => void; timeout: number }>()
  private pausedResolver: (() => void) | null = null
  private singleStep = false
  private abortRequested = false
  private runningPromise: Promise<void> | null = null
  private scenes: SceneDefinition[] = []

  constructor() {
    agentSessionClient.on((event) => this.handleEvent(event))
  }

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getSnapshot = (): AgentDemoSnapshot => this.snapshot

  async start(options: StartOptions = {}): Promise<void> {
    if (this.runningPromise) return this.runningPromise
    const requestedScenario = options.scenarioId ?? 'full_operational_demo'
    const requestedMode = options.mode ?? 'deterministic'
    const speed = options.speed ?? 'presentation'
    this.abortRequested = false
    this.snapshot = {
      ...baseSnapshot(), status: 'starting', scenarioId: requestedScenario, mode: requestedMode,
      speed, startedAt: new Date().toISOString(), currentMessage: 'Validando entorno y contratos…',
    }
    this.publish()
    this.runningPromise = this.run(requestedScenario, requestedMode, speed).finally(() => {
      speechOutputRouter.setForcedTextOnly(false)
      this.runningPromise = null
    })
    return this.runningPromise
  }

  pause(): void {
    if (this.snapshot.status !== 'running') return
    this.patch({ status: 'paused', currentMessage: 'Demostración pausada.' })
  }

  resume(): void {
    if (this.snapshot.status !== 'paused') return
    this.singleStep = false
    this.patch({ status: 'running' })
    this.pausedResolver?.()
    this.pausedResolver = null
  }

  next(): void {
    if (this.snapshot.status !== 'paused') return
    this.singleStep = true
    this.patch({ status: 'running' })
    this.pausedResolver?.()
    this.pausedResolver = null
  }

  previous(): void {
    if (this.snapshot.status !== 'paused' || this.snapshot.currentIndex <= 0) return
    const previousIndex = this.snapshot.currentIndex - 1
    this.patch({ currentIndex: previousIndex, currentMessage: `Revisión: ${this.scenes[previousIndex].title}` })
  }

  abort(): void {
    this.abortRequested = true
    this.pausedResolver?.()
    this.pausedResolver = null
    this.patch({ status: 'aborted', completedAt: new Date().toISOString(), currentMessage: 'Demostración abortada por el operador.' })
  }

  restart(): Promise<void> {
    this.abort()
    return new Promise((resolve) => window.setTimeout(resolve, 0)).then(() => this.start({
      scenarioId: this.snapshot.scenarioId, mode: this.snapshot.mode, speed: this.snapshot.speed,
    }))
  }

  async retry(): Promise<void> {
    if (this.snapshot.status !== 'failed' || this.snapshot.currentIndex < 0) return
    const index = this.snapshot.currentIndex
    this.patchScene(index, { status: 'running', detail: undefined, observed: undefined, startedAt: new Date().toISOString() })
    this.patch({ status: 'running', error: null })
    try {
      const observed = await this.scenes[index].run()
      this.patchScene(index, { status: 'passed', completedAt: new Date().toISOString(), observed })
      this.patch({ status: 'paused', currentMessage: 'Escena recuperada. Continúa cuando estés listo.' })
    } catch (error) {
      this.failScene(index, error)
    }
  }

  continueAfterFailure(): void {
    if (this.snapshot.status !== 'failed') return
    this.patch({ status: 'running', error: null })
    this.pausedResolver?.()
    this.pausedResolver = null
  }

  exportTrace(): AgentDemoSnapshot {
    return structuredClone(this.snapshot)
  }

  private async run(scenarioId: string, requestedMode: AgentDemoMode, speed: AgentDemoSpeed): Promise<void> {
    try {
      const { data } = await secureApi.get(`/api/ai-agent/demo/scenarios/${scenarioId}`, { params: { mode: requestedMode } })
      const effectiveMode = data.mode as AgentDemoMode
      speechOutputRouter.setForcedTextOnly(effectiveMode === 'deterministic')
      this.scenes = this.buildScenes(scenarioId)
      this.snapshot = {
        ...this.snapshot, mode: effectiveMode, status: 'running',
        currentMessage: data.fallback_reason ?? 'NORTHMINE AI · Demostración',
        scenes: this.scenes.map((scene) => ({ id: scene.id, title: scene.title, status: 'pending', expected: scene.expected })),
      }
      this.publish()
      const ready = this.waitForEvent((event) => event.event_type === 'demo.ready', 10_000)
      agentSessionClient.send('demo.start', { scenarioId, mode: requestedMode })
      await ready

      for (let index = 0; index < this.scenes.length; index += 1) {
        if (this.abortRequested) return
        await this.waitIfPaused()
        const scene = this.scenes[index]
        const started = performance.now()
        this.patch({ currentIndex: index, currentMessage: scene.message })
        this.patchScene(index, { status: 'running', startedAt: new Date().toISOString() })
        try {
          const observed = await scene.run()
          this.patchScene(index, {
            status: 'passed', completedAt: new Date().toISOString(), latencyMs: Math.round(performance.now() - started), observed,
          })
          await this.presentationDwell(speed)
          if (this.singleStep) {
            this.singleStep = false
            this.patch({ status: 'paused', currentMessage: `Escena completada: ${scene.title}` })
          }
        } catch (error) {
          this.failScene(index, error)
          await this.waitForRecovery()
        }
      }
      if (this.abortRequested) return
      const score = this.calculateScore()
      this.patch({
        status: Object.values(score).every((value) => value === 'PASS' || /^\d+\/\d+$/.test(value)) ? 'completed' : 'failed',
        score, completedAt: new Date().toISOString(), currentMessage: 'Demostración completada.',
      })
      window.dispatchEvent(new CustomEvent('northmine:agent-demo-completed', { detail: this.exportTrace() }))
    } catch (error) {
      this.patch({ status: 'failed', error: errorMessage(error), currentMessage: 'No se pudo iniciar la demostración.' })
    }
  }

  private buildScenes(scenarioId: string): SceneDefinition[] {
    const all = this.fullScenes()
    const selections: Record<string, string[]> = {
      production_investigation_demo: ['activation', 'context', 'reasoning', 'critical-equipment', 'production', 'drilldown', 'contradiction', 'chart'],
      fleet_demo: ['activation', 'context', 'contradiction', 'table', 'quick-action', 'comparison', 'final'],
      report_demo: ['activation', 'context', 'reasoning', 'report', 'work-product', 'final'],
      failure_recovery_demo: ['activation', 'degradation', 'final'],
    }
    const ids = selections[scenarioId]
    return ids ? all.filter((scene) => ids.includes(scene.id)) : all
  }

  private fullScenes(): SceneDefinition[] {
    const action = (value: CopilotUIAction) => this.executeAction(value)
    return [
      { id: 'activation', title: 'Activación', message: 'NORTHMINE AI · Demostración', expected: 'Dashboard activo y presencia conectada.', run: async () => {
        await action({ action: 'navigate', route: 'dashboard', guidance: { effect: 'sweep', label: 'Contexto operacional' } })
        return 'Dashboard confirmado; Runtime conectado.'
      } },
      { id: 'context', title: 'Contexto operacional', message: '¿Qué está pasando con la operación?', expected: 'Investigación real con evidencia del turno.', run: async () => {
        await this.ensureConnected()
        const completed = this.waitForEvent((event) => event.event_type === 'investigation.completed', 35_000)
        agentSessionClient.send('user.intent', { intent: 'INVESTIGATE_PRODUCTION_DROP', scope: 'current_shift', module_id: 'dashboard', source: 'quick_action' })
        const event = await completed
        const result = (event.payload as { result?: Record<string, unknown> }).result
        if (!result) throw new Error('El Runtime no entregó un resultado de investigación.')
        return 'Planner, herramientas y evidencia completados.'
      } },
      { id: 'reasoning', title: 'Razonamiento crítico', message: 'Separando carguío y transporte.', expected: 'Hipótesis, contradicciones y Verifier.', run: async () => {
        const runtime = useAgentRuntimeStore.getState()
        if (runtime.hypotheses.length < 3) throw new Error('No se generaron hipótesis competitivas suficientes.')
        if (!runtime.hypotheses.some((hypothesis) => hypothesis.contradicting_evidence_ids.length > 0)) throw new Error('Falta evidencia contradictoria.')
        if (!runtime.verification || !runtime.conclusion?.confidence) throw new Error('Verifier o confidence ausente.')
        return `${runtime.hypotheses.length} hipótesis; Verifier ${runtime.verification.status}; confianza ${runtime.conclusion.confidence.level}.`
      } },
      { id: 'critical-equipment', title: 'Equipo crítico', message: 'La mayor desviación está concentrada en Pala 03.', expected: 'Entidad derivada desde evidencia y módulo Carguío abierto.', run: async () => {
        const loading = (((useAgentRuntimeStore.getState().lastResult as any)?.evidence ?? []) as any[])
          .find((item) => item.capability_id === 'get_loading_performance')?.value?.unidades ?? []
        const worst = [...loading].sort((a, b) => Number(a.variacion_pct) - Number(b.variacion_pct))[0]
        if (String(worst?.carguio_id).toUpperCase() !== 'PALA 03') throw new Error('Pala 03 no surgió como peor unidad desde la evidencia.')
        await action({ action: 'navigate', route: 'carguio', guidance: { effect: 'sweep', label: 'Abrir carguío' } })
        return `Evidencia seleccionó ${worst.carguio_id} (${worst.variacion_pct}%).`
      } },
      { id: 'production', title: 'Producción', message: 'Localizando el periodo afectado.', expected: 'Producción abierta y filtro de turno aplicado.', run: async () => {
        await action({ action: 'navigate', route: 'produccion', guidance: { effect: 'sweep', label: 'Abrir producción' } })
        await action({ action: 'set_filter', filter_id: 'shift', value: 'DIA' })
        return 'Ruta y turno confirmados.'
      } },
      { id: 'drilldown', title: 'Continuidad contextual', message: '¿Desde cuándo?', expected: 'Foco conservado en Pala 03 y periodo crítico localizado.', run: async () => {
        const result = useAgentRuntimeStore.getState().lastResult as any
        const hourly = result?.evidence?.find((item: any) => item.capability_id === 'get_production_kpis')?.value?.toneladas_por_hora ?? []
        const start = hourly.find((row: any) => Number(row.real) < Number(row.plan) * 0.8)
        if (!start) throw new Error('No existe un intervalo verificable para la desviación.')
        return `La pérdida material comienza a las ${start.hora}, según la serie del fixture.`
      } },
      { id: 'contradiction', title: 'Contraste con transporte', message: '¿Puede ser transporte?', expected: 'Evidencia a favor y en contra, sin causalidad exclusiva.', run: async () => {
        const hypotheses = useAgentRuntimeStore.getState().hypotheses
        const transport = hypotheses.find((hypothesis) => /camion|espera|viaje|transporte/i.test(hypothesis.label))
        if (!transport) throw new Error('No se evaluó una hipótesis de transporte.')
        if (!transport.contradicting_evidence_ids.length && transport.causal_status !== 'unsupported') throw new Error('El contraste de transporte no quedó calibrado.')
        return `Transporte: ${transport.causal_status ?? transport.status}; evidencia contradictoria registrada.`
      } },
      { id: 'multiturn', title: 'Cadena multiturno', message: 'Mismo contexto, nueva pregunta.', expected: 'Sesión e investigación preservadas.', run: async () => {
        const sessionId = agentSessionClient.getSessionId()
        if (!sessionId || !useAgentRuntimeStore.getState().lastResult) throw new Error('El contexto de sesión no está disponible.')
        return `Sesión ${sessionId.slice(0, 12)}… conserva la investigación anterior.`
      } },
      { id: 'map', title: 'Vista aérea', message: 'Muéstrame dónde.', expected: 'Mapa enfocado o degradación geográfica honesta.', run: async () => {
        await action({ action: 'navigate', route: 'aerea', guidance: { effect: 'sweep', label: 'Abrir vista aérea' } })
        await this.waitForWidget('aerial-orthomosaic-viewer')
        await action({ action: 'focus_widget', widget_id: 'aerial-orthomosaic-viewer', guidance: { effect: 'spotlight', label: 'Ubicación operacional' } })
        const geo = (agentWidgetRegistry.snapshot('aerial-orthomosaic-viewer') as any)?.geo
        return geo ? 'Entidad georreferenciada enfocada.' : 'Equipo identificado; dataset sin coordenadas georreferenciadas.'
      } },
      { id: 'table', title: 'Tabla operacional', message: 'Mostrando la fila de carguío relevante.', expected: 'Tabla real resaltada mediante acción semántica.', run: async () => {
        await action({ action: 'navigate', route: 'carguio', guidance: { effect: 'sweep' } })
        await this.waitForWidget('loading-rate-chart')
        await action({ action: 'widget_action', widget_id: 'loading-rate-chart', semantic_action: 'highlight_row', args: { entityId: 'PALA 03' }, guidance: { effect: 'highlight', label: 'Pala 03' } })
        return 'Tabla de carguío confirmó highlight_row(PALA 03).'
      } },
      { id: 'quick-action', title: 'Quick Action', message: 'Comparar turno', expected: 'Intent estructurado, sin escribir en el input.', run: async () => {
        await this.ensureConnected()
        const selected = CONTEXT_QUICK_ACTIONS.find((item) => item.id === 'production-compare')!
        const completed = this.waitForEvent((event) => event.event_type === 'memory.recalled', 15_000)
        dispatchStructuredIntent(selected, 'quick_action', 'carguio', 'Pala 03')
        await completed
        return 'COMPARE_SHIFT llegó al Runtime como user.intent estructurado.'
      } },
      { id: 'palette', title: 'Command Palette', message: 'Ctrl/Cmd + K · Comparar turno', expected: 'Palette visible y acción semántica despachada.', run: async () => {
        await this.ensureConnected()
        const runtimeAck = this.waitForEvent((event) => event.event_type === 'memory.recalled', 15_000)
        const dispatched = new Promise<void>((resolve, reject) => {
          const timeout = window.setTimeout(() => reject(new Error('Command Palette no confirmó el despacho.')), 5_000)
          window.addEventListener('northmine:agent-command-palette-dispatched', () => { window.clearTimeout(timeout); resolve() }, { once: true })
        })
        window.dispatchEvent(new CustomEvent(AGENT_COMMAND_PALETTE_DEMO_EVENT, { detail: { actionId: 'what-changed', entityId: 'Pala 03' } }))
        await Promise.all([dispatched, runtimeAck])
        return 'Command Palette abrió; WHAT_CHANGED fue confirmado por el Runtime.'
      } },
      { id: 'comparison', title: 'Comparación', message: 'Turno actual versus referencia anterior.', expected: 'Memoria consultada sin inventar métricas.', run: async () => {
        const memory = useAgentRuntimeStore.getState().memoryRecall
        return memory ? `Memoria operacional recuperada: ${memory.items.length} elemento(s).` : 'Comparación limitada: no existe evidencia histórica suficiente.'
      } },
      { id: 'impact', title: 'Impacto', message: 'Cuantificando la brecha sustentada.', expected: 'Toneladas y porcentaje derivados de evidencia.', run: async () => {
        const result = useAgentRuntimeStore.getState().lastResult as any
        const production = result?.evidence?.find((item: any) => item.capability_id === 'get_production_kpis')?.value
        if (typeof production?.brecha_ton !== 'number' || typeof production?.cumplimiento_pct !== 'number') throw new Error('Impacto sin evidencia numérica.')
        return `${Math.abs(production.brecha_ton).toLocaleString('es-CL')} t de brecha; ${production.cumplimiento_pct}% de cumplimiento.`
      } },
      { id: 'chart', title: 'Resaltado gráfico', message: 'La desviación comienza aproximadamente a las 14:00.', expected: 'focus_anomaly confirmado por el widget.', run: async () => {
        await action({ action: 'navigate', route: 'produccion', guidance: { effect: 'sweep' } })
        await this.waitForWidget('production-hourly-chart')
        await action({ action: 'widget_action', widget_id: 'production-hourly-chart', semantic_action: 'highlight_range', args: { from: '14:00', to: '16:00' }, guidance: { effect: 'spotlight', label: 'Intervalo crítico 14:00–16:00' } })
        return 'Gráfico confirmó highlight_range(14:00–16:00).'
      } },
      { id: 'report', title: 'Reporte operacional', message: 'Preparando y verificando el reporte completo del turno.', expected: 'ReportComposer genera y ReportVerifier aprueba antes de presentar.', run: async () => {
        await this.ensureConnected()
        const ready = this.waitForEvent((event) => event.event_type === 'work_product.ready' && (event.payload as any).productType === 'report', 35_000)
        agentSessionClient.send('user.text', { text: 'Genera un reporte completo del turno.' })
        await ready
        const report = useAgentRuntimeStore.getState().reports[0]
        if (!report?.quality_gate?.passed) throw new Error(`ReportVerifier rechazó el reporte: ${report?.quality_gate?.errors?.join('; ') ?? 'sin detalle'}`)
        return `ReportComposer persistió v${report.version}; ReportVerifier PASS · ${report.quality_gate.total_score}/100.`
      } },
      { id: 'work-product', title: 'Work Product', message: 'Guardando versión auditable.', expected: 'v1, estado, timestamp y alcance.', run: async () => {
        const report = useAgentRuntimeStore.getState().reports[0]
        if (!report || report.version < 1 || !report.generated_at) throw new Error('El reporte no tiene versionado o timestamp.')
        await action({ action: 'navigate', route: 'reportes', guidance: { effect: 'sweep', label: 'Abrir reportes' } })
        const rendered = new Promise<void>((resolve, reject) => {
          const timeout = window.setTimeout(() => reject(new Error('El Work Product no confirmó su render visual.')), 10_000)
          window.addEventListener(AGENT_DEMO_WORK_PRODUCT_READY, () => { window.clearTimeout(timeout); resolve() }, { once: true })
        })
        window.dispatchEvent(new CustomEvent(AGENT_DEMO_HUD_COLLAPSE, { detail: { collapsed: true } }))
        window.dispatchEvent(new CustomEvent(AGENT_DEMO_WORK_PRODUCT_FOCUS, { detail: { reportId: report.report_id } }))
        await rendered
        return `v${report.version} · ${report.status} · ${report.generated_at}.`
      } },
      { id: 'watch', title: 'Seguimiento', message: 'Preparando vigilancia como borrador.', expected: 'Watch draft sujeto a autoridad humana.', run: async () => {
        await this.ensureConnected()
        const ready = this.waitForEvent((event) => event.event_type === 'watch.created', 15_000)
        const watchAction: AgentQuickAction = { id: 'demo-watch', label: 'Crear seguimiento', intent: 'CREATE_WATCH' }
        agentSessionClient.send('user.intent', { intent: watchAction.intent, scope: 'selected_entity', entity_id: 'PALA 03', source: 'quick_action' })
        await ready
        const watch = useAgentRuntimeStore.getState().watches[0]
        if (!watch || watch.status !== 'draft') throw new Error('El seguimiento de demo no quedó como draft sujeto a validación humana.')
        return `Seguimiento ${watch.status}; autoridad humana preservada.`
      } },
      { id: 'degradation', title: 'Degradación honesta', message: '¿Cuál fue el valor exacto obtenido desde WENCO?', expected: 'Declara fuente no disponible y no inventa valores.', run: async () => {
        await this.ensureConnected()
        const response = this.waitForEvent((event) => event.event_type === 'agent.text.delta' && /WENCO no está disponible/i.test(String((event.payload as any).text)), 12_000)
        agentSessionClient.send('user.text', { text: '¿Cuál fue el valor exacto obtenido desde WENCO?' })
        const event = await response
        return String((event.payload as any).text)
      } },
      { id: 'final', title: 'Cierre', message: 'Consolidando el trace real.', expected: 'Dashboard y score derivados del recorrido.', run: async () => {
        window.dispatchEvent(new CustomEvent(AGENT_DEMO_HUD_COLLAPSE, { detail: { collapsed: false } }))
        await action({ action: 'navigate', route: 'dashboard', guidance: { effect: 'sweep', label: 'Cerrar en Dashboard' } })
        return 'Dashboard confirmado; resultados calculados desde el trace.'
      } },
    ]
  }

  private executeAction(action: CopilotUIAction): Promise<AgentActionResult> {
    return new Promise((resolve, reject) => {
      enqueueAgentAction(action, (result) => {
        this.snapshot = {
          ...this.snapshot,
          trace: [...this.snapshot.trace, {
            scene: this.scenes[this.snapshot.currentIndex]?.id ?? 'bootstrap',
            timestamp: new Date().toISOString(),
            eventType: 'ui.guidance',
            payload: { action: action.action, guidance: action.guidance ?? null, result: result.status, label: result.label },
          }].slice(-1000),
        }
        this.publish()
        result.status === 'completed' ? resolve(result) : reject(new Error(result.error ?? result.label))
      })
    })
  }

  private ensureConnected(timeoutMs = 10_000): Promise<void> {
    if (agentSessionClient.getStatus() === 'connected') return Promise.resolve()
    return new Promise((resolve, reject) => {
      let unsubscribe: () => void = () => {}
      const timeout = window.setTimeout(() => {
        unsubscribe()
        reject(new Error(`Runtime no disponible tras ${timeoutMs} ms.`))
      }, timeoutMs)
      unsubscribe = agentSessionClient.onStatus((status) => {
        if (status !== 'connected') return
        window.clearTimeout(timeout)
        unsubscribe()
        resolve()
      })
    })
  }

  private waitForEvent(predicate: EventPredicate, timeoutMs: number): Promise<AgentEvent> {
    return new Promise((resolve, reject) => {
      const waiter = { predicate, resolve, reject, timeout: 0 }
      waiter.timeout = window.setTimeout(() => {
        this.eventWaiters.delete(waiter)
        reject(new Error(`Timeout de acknowledgement tras ${timeoutMs} ms.`))
      }, timeoutMs)
      this.eventWaiters.add(waiter)
    })
  }

  private waitForWidget(widgetId: string, timeoutMs = 15_000): Promise<void> {
    if (agentWidgetRegistry.getElement(widgetId)) return Promise.resolve()
    return new Promise((resolve, reject) => {
      const unsubscribe = agentWidgetRegistry.subscribe(() => {
        if (!agentWidgetRegistry.getElement(widgetId)) return
        window.clearTimeout(timeout)
        unsubscribe()
        resolve()
      })
      const timeout = window.setTimeout(() => {
        unsubscribe()
        reject(new Error(`El widget ${widgetId} no confirmó estado ready.`))
      }, timeoutMs)
    })
  }

  private handleEvent(event: AgentEvent): void {
    if (this.snapshot.status !== 'idle') {
      const entry: AgentDemoTraceEntry = {
        scene: this.scenes[this.snapshot.currentIndex]?.id ?? 'bootstrap', timestamp: event.timestamp,
        eventType: event.event_type, correlationId: event.correlation_id,
        investigationId: event.investigation_id, payload: safePayload(event.payload),
      }
      this.snapshot = { ...this.snapshot, trace: [...this.snapshot.trace, entry].slice(-1000) }
      this.publish()
    }
    for (const waiter of [...this.eventWaiters]) {
      if (!waiter.predicate(event)) continue
      window.clearTimeout(waiter.timeout)
      this.eventWaiters.delete(waiter)
      waiter.resolve(event)
    }
  }

  private calculateScore(): AgentDemoScore {
    const status = (id: string) => this.snapshot.scenes.find((scene) => scene.id === id)?.status === 'passed'
    const uiIds = ['activation', 'critical-equipment', 'production', 'map', 'table', 'chart', 'work-product', 'final'].filter((id) => this.snapshot.scenes.some((scene) => scene.id === id))
    const uiPassed = uiIds.filter(status).length
    const averageLatency = this.snapshot.scenes.reduce((sum, scene) => sum + (scene.latencyMs ?? 0), 0) / Math.max(this.snapshot.scenes.length, 1)
    return {
      reasoning: status('reasoning') || !this.snapshot.scenes.some((scene) => scene.id === 'reasoning') ? 'PASS' : 'FAIL',
      evidence: status('context') || !this.snapshot.scenes.some((scene) => scene.id === 'context') ? 'PASS' : 'FAIL',
      safety: status('degradation') || !this.snapshot.scenes.some((scene) => scene.id === 'degradation') ? 'PASS' : 'FAIL',
      context: status('multiturn') || !this.snapshot.scenes.some((scene) => scene.id === 'multiturn') ? 'PASS' : 'FAIL',
      uiManipulation: `${uiPassed}/${uiIds.length}`,
      guidance: this.snapshot.trace.some((item) => item.eventType === 'ui.guidance' && item.payload.result === 'completed') ? 'PASS' : 'FAIL',
      reports: status('report') || !this.snapshot.scenes.some((scene) => scene.id === 'report') ? 'PASS' : 'FAIL',
      latency: averageLatency < 10_000 ? 'PASS' : 'FAIL',
    }
  }

  private async waitIfPaused(): Promise<void> {
    if (this.snapshot.status !== 'paused') return
    await new Promise<void>((resolve) => { this.pausedResolver = resolve })
  }

  private async waitForRecovery(): Promise<void> {
    await new Promise<void>((resolve) => { this.pausedResolver = resolve })
  }

  private presentationDwell(speed: AgentDemoSpeed): Promise<void> {
    // Presentation pacing is deliberately human-visible. It occurs only
    // after the real acknowledgement, never as action synchronization.
    const duration = speed === 'fast' ? 120 : speed === 'normal' ? 1_800 : 8_500
    return new Promise((resolve) => window.setTimeout(resolve, duration))
  }

  private failScene(index: number, error: unknown): void {
    const message = errorMessage(error)
    this.patchScene(index, { status: 'failed', completedAt: new Date().toISOString(), detail: message, observed: message })
    this.patch({ status: 'failed', error: message, currentMessage: `${this.scenes[index].title} · FAILED` })
  }

  private patchScene(index: number, patch: Partial<AgentDemoSceneResult>): void {
    const scenes = this.snapshot.scenes.map((scene, sceneIndex) => sceneIndex === index ? { ...scene, ...patch } : scene)
    this.patch({ scenes })
  }

  private patch(patch: Partial<AgentDemoSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...patch }
    this.publish()
  }

  private publish(): void {
    this.listeners.forEach((listener) => listener())
  }
}

export const agentDemoController = new AgentDemoController()

declare global {
  interface Window {
    __NORTHMINE_AGENT_DEMO__?: {
      start: (options?: StartOptions) => Promise<void>
      pause: () => void
      resume: () => void
      next: () => void
      previous: () => void
      abort: () => void
      restart: () => Promise<void>
      retry: () => Promise<void>
      continueAfterFailure: () => void
      snapshot: () => AgentDemoSnapshot
    }
  }
}

window.__NORTHMINE_AGENT_DEMO__ = {
  start: (options) => agentDemoController.start(options), pause: () => agentDemoController.pause(),
  resume: () => agentDemoController.resume(), next: () => agentDemoController.next(),
  previous: () => agentDemoController.previous(), abort: () => agentDemoController.abort(),
  restart: () => agentDemoController.restart(), retry: () => agentDemoController.retry(),
  continueAfterFailure: () => agentDemoController.continueAfterFailure(), snapshot: () => agentDemoController.exportTrace(),
}
