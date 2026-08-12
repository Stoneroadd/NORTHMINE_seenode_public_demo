import { sectionPaths } from '../layout/AppShell'
import type { SectionId } from '../layout/Sidebar'
import { useAppStore, type TurnoId } from '../../store'
import { moduleForRoute, NORTHMINE_MODULES } from '../../lib/agentRegistry/modules'
import { agentWidgetRegistry } from '../../lib/agentRegistry/registry'
import { agentEntityNavigator } from '../../lib/agentRegistry/entityNavigator'
import { resolveEquipmentAlias } from '../../lib/agentRegistry/entityResolver'
import { gsap } from '../../lib/animation/gsap'
import type { AgentActionExecutionStatus, AgentActionResult } from '../../lib/agentRegistry/types'
import type { CopilotUIAction } from '../../lib/aiCopilot'

/**
 * Ejecutor de acciones semanticas con maquina de estados (seccion 9-10 del
 * brief): received -> validated -> executing -> completed|rejected|failed,
 * en una cola secuencial por sesion (una accion a la vez, deduplicada por
 * actionId) que solo reporta 'completed' despues de confirmar el cambio
 * real - nunca antes.
 */

const SECTION_LABELS: Record<string, string> = Object.fromEntries(
  Object.values(NORTHMINE_MODULES).map((module) => [module.id, module.label]),
)

let actionCounter = 0
function nextActionId(): string {
  actionCounter += 1
  return `action-${Date.now()}-${actionCounter}`
}

const seenActionIds = new Set<string>()
const queue: Array<{ id: string; action: CopilotUIAction; onResult: (result: AgentActionResult) => void }> = []
let processing = false

export function enqueueAgentAction(action: CopilotUIAction, onResult: (result: AgentActionResult) => void): void {
  const id = nextActionId()
  queue.push({ id, action, onResult })
  void drainQueue()
}

async function drainQueue(): Promise<void> {
  if (processing) return
  processing = true
  while (queue.length > 0) {
    const item = queue.shift()!
    if (seenActionIds.has(item.id)) continue
    seenActionIds.add(item.id)
    const result = await executeOne(item.id, item.action)
    item.onResult(result)
  }
  processing = false
}

function isSectionId(value: string): value is SectionId {
  return value in sectionPaths
}

function waitFor(check: () => boolean, timeoutMs = 500, intervalMs = 30): Promise<boolean> {
  return new Promise((resolve) => {
    const start = Date.now()
    const tick = () => {
      if (check()) return resolve(true)
      if (Date.now() - start >= timeoutMs) return resolve(false)
      window.setTimeout(tick, intervalMs)
    }
    tick()
  })
}

const TOOL_GUIDANCE_TARGETS: Record<string, { widgetIds: string[]; label: string }> = {
  get_current_shift_summary: { widgetIds: ['cockpit-production-summary', 'shift-summary'], label: 'Lectura del turno' },
  get_production_kpis: { widgetIds: ['cockpit-production-summary', 'production-plan-compliance', 'production-hourly-chart'], label: 'Producción y meta' },
  get_fleet_status: { widgetIds: ['sec-flota', 'fleet-status-table'], label: 'Estado de flota' },
  get_alerts: { widgetIds: ['sec-decisiones', 'alerts-priority-list'], label: 'Riesgos activos' },
  get_data_quality_status: { widgetIds: ['cockpit-production-summary', 'reportes-turno-actual'], label: 'Calidad del dato' },
}

let guidanceSequence: Promise<void> = Promise.resolve()
let guidanceEpoch = 0
const queuedGuidanceTargets = new Set<string>()
let activeGuidanceCleanup: (() => void) | null = null

const GUIDED_VALUE_SELECTOR = [
  '[data-agent-value]',
  '.nmcp-kpi-value',
  '.kpi-value',
  '.ai-copilot-chart-fallback-table td',
  'strong',
  'b',
].join(',')

const GUIDED_CHART_SELECTOR = [
  '.recharts-wrapper',
  '.echarts-for-react',
  '.nmcp-hourly-chart',
  '.ai-copilot-chart',
  'canvas',
].join(',')

function uniqueElements<T extends Element>(elements: T[]): T[] {
  return [...new Set(elements)]
}

function guidedValues(element: HTMLElement): HTMLElement[] {
  return uniqueElements(Array.from(element.querySelectorAll<HTMLElement>(GUIDED_VALUE_SELECTOR)))
    .filter((candidate) => /\d/.test(candidate.textContent ?? '') && candidate.getClientRects().length > 0)
    .slice(0, 14)
}

function guidedCharts(element: HTMLElement): HTMLElement[] {
  const engines = Array.from(element.querySelectorAll<HTMLElement>('.recharts-wrapper, .echarts-for-react'))
  if (element.matches('.recharts-wrapper, .echarts-for-react')) engines.unshift(element)
  const descendants = engines.length
    ? engines
    : Array.from(element.querySelectorAll<HTMLElement>(GUIDED_CHART_SELECTOR))
  if (!engines.length && element.matches(GUIDED_CHART_SELECTOR)) descendants.unshift(element)
  return uniqueElements(descendants)
    .filter((candidate) => !candidate.matches('canvas') || !candidate.parentElement?.closest('.echarts-for-react'))
    .filter((candidate) => candidate.getClientRects().length > 0)
    .slice(0, 4)
}

/**
 * Convierte el foco semantico del agente en una lectura visual breve: primero
 * el modulo, luego sus cifras y finalmente las marcas del grafico. No altera
 * valores ni inventa datos; solo anima nodos que ya estan renderizados.
 */
function startGuidanceEffects(element: HTMLElement): () => void {
  activeGuidanceCleanup?.()

  const values = guidedValues(element)
  const charts = guidedCharts(element)
  const bars = Array.from(element.querySelectorAll<SVGGraphicsElement>(
    '.recharts-bar-rectangle path, .recharts-bar-rectangle rect',
  )).slice(0, 18)
  const lines = Array.from(element.querySelectorAll<SVGPathElement>('.recharts-line-curve')).slice(0, 4)
  const dots = Array.from(element.querySelectorAll<SVGGraphicsElement>(
    '.recharts-line-dot, .recharts-active-dot, .recharts-scatter-symbol',
  )).slice(0, 18)

  element.dataset.agentEffect = [values.length ? 'values' : '', charts.length ? 'chart' : '']
    .filter(Boolean)
    .join(' ')
  charts.forEach((chart) => chart.classList.add('ai-agent-chart-focus'))

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const cleanupReduced = () => {
      charts.forEach((chart) => chart.classList.remove('ai-agent-chart-focus'))
      delete element.dataset.agentEffect
      if (activeGuidanceCleanup === cleanupReduced) activeGuidanceCleanup = null
    }
    activeGuidanceCleanup = cleanupReduced
    return cleanupReduced
  }

  const timeline = gsap.timeline({ defaults: { ease: 'power3.out', overwrite: 'auto' } })

  if (values.length) {
    timeline.fromTo(values, {
      autoAlpha: 0.42,
      y: 7,
      scale: 0.97,
      willChange: 'transform, opacity',
    }, {
      autoAlpha: 1,
      y: 0,
      scale: 1,
      duration: 0.42,
      stagger: 0.045,
      clearProps: 'transform,opacity,visibility,willChange',
    }, 0.08)
  }

  if (charts.length) {
    timeline.fromTo(charts, {
      filter: 'brightness(0.88) saturate(0.82)',
    }, {
      filter: 'brightness(1.08) saturate(1.08)',
      duration: 0.34,
      stagger: 0.06,
      yoyo: true,
      repeat: 1,
      clearProps: 'filter',
    }, 0.12)
  }

  if (bars.length) {
    timeline.fromTo(bars, {
      autoAlpha: 0.35,
      scaleY: 0.76,
      transformOrigin: '50% 100%',
    }, {
      autoAlpha: 1,
      scaleY: 1,
      duration: 0.46,
      stagger: 0.025,
      clearProps: 'transform,opacity,visibility,transformOrigin',
    }, 0.18)
  }

  lines.forEach((line, index) => {
    let length = 0
    try { length = line.getTotalLength() } catch { length = 0 }
    if (length <= 0) return
    gsap.set(line, { strokeDasharray: length, strokeDashoffset: length })
    timeline.to(line, {
      strokeDashoffset: 0,
      duration: 0.68,
      clearProps: 'strokeDasharray,strokeDashoffset',
    }, 0.22 + index * 0.05)
  })

  if (dots.length) {
    timeline.fromTo(dots, { autoAlpha: 0.3, scale: 0.65, transformOrigin: '50% 50%' }, {
      autoAlpha: 1,
      scale: 1,
      duration: 0.3,
      stagger: 0.025,
      clearProps: 'transform,opacity,visibility,transformOrigin',
    }, 0.42)
  }

  const animatedTargets = [...values, ...charts, ...bars, ...lines, ...dots]
  const cleanup = () => {
    timeline.kill()
    gsap.killTweensOf(animatedTargets)
    gsap.set(animatedTargets, {
      clearProps: 'transform,opacity,visibility,filter,willChange,transformOrigin,strokeDasharray,strokeDashoffset',
    })
    charts.forEach((chart) => chart.classList.remove('ai-agent-chart-focus'))
    delete element.dataset.agentEffect
    if (activeGuidanceCleanup === cleanup) activeGuidanceCleanup = null
  }
  activeGuidanceCleanup = cleanup
  return cleanup
}

function guidanceElement(widgetIds: string[]): HTMLElement | null {
  for (const widgetId of widgetIds) {
    const element = document.getElementById(widgetId)
      ?? document.querySelector<HTMLElement>(`[data-agent-widget-id="${widgetId}"]`)
    if (element) return element
  }
  return null
}

function guidanceCopy(target: { widgetIds: string[]; label: string }, fallback: string): string {
  for (const widgetId of target.widgetIds) {
    const snapshot = agentWidgetRegistry.snapshot(widgetId)
    if (!snapshot || snapshot.value === undefined || snapshot.value === null) continue
    const unit = typeof snapshot.unit === 'string' && snapshot.unit ? ` ${snapshot.unit}` : ''
    return `${target.label} · ${snapshot.label}: ${String(snapshot.value)}${unit}`
  }
  return `${target.label} · ${fallback}`
}

async function showGuidance(
  epoch: number,
  target: { widgetIds: string[]; label: string },
  summary: string,
): Promise<void> {
  if (epoch !== guidanceEpoch) return
  const found = await waitFor(() => Boolean(guidanceElement(target.widgetIds)), 900)
  if (!found || epoch !== guidanceEpoch) return
  const element = guidanceElement(target.widgetIds)
  if (!element) return

  const widgetId = target.widgetIds.find((id) => element.id === id || element.dataset.agentWidgetId === id)
  if (widgetId) agentWidgetRegistry.setFocusedWidget(widgetId)
  const rect = element.getBoundingClientRect()
  if (rect.top < 80 || rect.bottom > window.innerHeight - 80) {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    await new Promise((resolve) => window.setTimeout(resolve, 320))
  }
  if (epoch !== guidanceEpoch) return

  element.dataset.agentCue = guidanceCopy(target, summary).slice(0, 150)
  element.classList.add('ai-agent-guided-highlight')
  const cleanupEffects = startGuidanceEffects(element)
  await new Promise((resolve) => window.setTimeout(resolve, 1800))
  cleanupEffects()
  element.classList.remove('ai-agent-guided-highlight')
  delete element.dataset.agentCue
}

/** Guía visual en vivo: conecta cada fuente consultada con su panel real. */
export function guideAgentTool(toolName: string, summary?: string | null): string | null {
  const target = TOOL_GUIDANCE_TARGETS[toolName]
  if (!target) return null
  const targetKey = target.widgetIds.join('|')
  const copy = guidanceCopy(target, summary?.trim() || 'Consultando el parámetro visible')
  if (queuedGuidanceTargets.has(targetKey)) return copy
  queuedGuidanceTargets.add(targetKey)
  const epoch = guidanceEpoch
  guidanceSequence = guidanceSequence
    .then(() => showGuidance(epoch, target, summary?.trim() || 'Consultando el parámetro visible'))
    .finally(() => queuedGuidanceTargets.delete(targetKey))
  return copy
}

export function cancelAgentGuidance(): void {
  guidanceEpoch += 1
  guidanceSequence = Promise.resolve()
  queuedGuidanceTargets.clear()
  activeGuidanceCleanup?.()
  document.querySelectorAll<HTMLElement>('.ai-agent-guided-highlight').forEach((element) => {
    element.classList.remove('ai-agent-guided-highlight')
    delete element.dataset.agentCue
  })
}

function navigateToPath(path: string): void {
  if (window.location.pathname !== path) {
    window.history.pushState(null, '', path)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }
}

function normalizeShift(value: string): TurnoId | null {
  const normalized = value.trim().toUpperCase()
  if (normalized === 'DIA') return 'DIA'
  if (normalized === 'NOCHE') return 'NOCHE'
  if (['TODOS', 'AMBOS', 'ACTUAL', ''].includes(normalized)) return 'AMBOS'
  return null
}

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value.trim())
}

async function executeOne(actionId: string, action: CopilotUIAction): Promise<AgentActionResult> {
  const fail = (status: AgentActionExecutionStatus, label: string, error?: string): AgentActionResult => ({
    actionId,
    status,
    label,
    error,
  })

  switch (action.action) {
    case 'navigate': {
      if (!isSectionId(action.route)) {
        const module = moduleForRoute(action.route.startsWith('/') ? action.route : `/${action.route}`)
        if (!module) return fail('rejected', `Ruta desconocida: ${action.route}`)
        if (module.agentAccess === 'unavailable') return fail('rejected', `${module.label} no esta disponible para el agente`)
        navigateToPath(module.route)
        const confirmed = await waitFor(() => window.location.pathname === module.route)
        return confirmed
          ? { actionId, status: 'completed', label: `Abriendo ${module.label}` }
          : fail('failed', `No se pudo confirmar la apertura de ${module.label}`)
      }
      const module = NORTHMINE_MODULES[action.route]
      if (!module || module.agentAccess === 'unavailable') {
        return fail('rejected', `Sección no disponible: ${action.route}`)
      }
      const targetPath = sectionPaths[action.route]
      navigateToPath(targetPath)
      const confirmed = await waitFor(() => window.location.pathname === targetPath)
      return confirmed
        ? { actionId, status: 'completed', label: `Abriendo ${SECTION_LABELS[action.route] ?? action.route}` }
        : fail('failed', `No se pudo confirmar la apertura de ${SECTION_LABELS[action.route] ?? action.route}`)
    }

    case 'set_filter': {
      const store = useAppStore.getState()
      if (action.filter_id === 'shift') {
        const shift = normalizeShift(action.value)
        if (!shift) return fail('rejected', `Turno no reconocido: ${action.value}`)
        store.setFiltro({ turno: shift })
        const confirmed = await waitFor(() => useAppStore.getState().filtro.turno === shift)
        return confirmed
          ? { actionId, status: 'completed', label: `Aplicando turno ${shift}` }
          : fail('failed', 'No se pudo confirmar el filtro de turno')
      }
      if (action.filter_id === 'start_date' || action.filter_id === 'end_date') {
        if (!isIsoDate(action.value)) return fail('rejected', 'Fecha inválida')
        const patch = action.filter_id === 'start_date' ? { fechaDesde: action.value } : { fechaHasta: action.value }
        store.setFiltro(patch)
        const confirmed = await waitFor(() =>
          action.filter_id === 'start_date'
            ? useAppStore.getState().filtro.fechaDesde === action.value
            : useAppStore.getState().filtro.fechaHasta === action.value,
        )
        return confirmed
          ? { actionId, status: 'completed', label: `Ajustando ${action.filter_id === 'start_date' ? 'fecha desde' : 'fecha hasta'} a ${action.value}` }
          : fail('failed', 'No se pudo confirmar el filtro de fecha')
      }
      store.setFiltro({ equipo: action.value })
      const confirmed = await waitFor(() => useAppStore.getState().filtro.equipo === action.value)
      return confirmed
        ? { actionId, status: 'completed', label: `Filtrando por equipo ${action.value}` }
        : fail('failed', 'No se pudo confirmar el filtro de equipo')
    }

    case 'clear_filter': {
      const store = useAppStore.getState()
      if (!action.filter_id) {
        store.resetFiltro()
        return { actionId, status: 'completed', label: 'Limpiando filtros' }
      }
      if (action.filter_id === 'shift') store.setFiltro({ turno: 'AMBOS' })
      else if (action.filter_id === 'equipo') store.setFiltro({ equipo: undefined })
      else return fail('rejected', 'No se puede limpiar ese filtro individualmente')
      return { actionId, status: 'completed', label: `Limpiando filtro ${action.filter_id}` }
    }

    case 'select_entity':
    case 'open_entity': {
      const wantsOpen = action.action === 'open_entity'

      // Resolucion de alias (seccion 8): solo existe catalogo real para
      // 'equipment' hoy (fleet-status-table). El modelo nunca elige el ID
      // interno - si hay mas de una coincidencia, no se resuelve en
      // silencio.
      let entityId = action.entity_id
      if (action.entity_type === 'equipment') {
        const resolution = resolveEquipmentAlias(action.entity_id)
        if (resolution.status === 'ambiguous') {
          const options = resolution.candidates.map((c) => c.label).join(', ')
          return fail('failed', `"${action.entity_id}" es ambiguo: podria ser ${options}. Se necesita precisar cual.`)
        }
        if (resolution.status === 'resolved') {
          entityId = resolution.candidates[0].entityId
        }
        // 'not_found': puede que ya sea un ID real (no un alias) - se deja
        // pasar tal cual y que el handler del modulo confirme o no.
      }

      // Si nadie tiene handler para este tipo de entidad todavia, el unico
      // fallback conocido es navegar a Flota para equipment (su handler se
      // registra al montar). Para el resto de tipos sin handler, es
      // 'unsupported' honesto - no se finge una navegacion que no abre nada.
      if (!agentEntityNavigator.hasHandler(action.entity_type)) {
        if (action.entity_type !== 'equipment') {
          return fail('rejected', `"${action.entity_type}" no tiene un detalle real disponible todavia.`)
        }
        navigateToPath(sectionPaths.flota)
        const registered = await waitFor(() => agentEntityNavigator.hasHandler('equipment'), 1500)
        if (!registered) return fail('failed', `No pude confirmar que Flota cargara a tiempo para abrir ${entityId}.`)
      }

      const result = wantsOpen
        ? await agentEntityNavigator.openEntity(action.entity_type, entityId)
        : await agentEntityNavigator.selectEntity(action.entity_type, entityId)

      const verb = wantsOpen ? 'Abriendo' : 'Seleccionando'
      if (result.status === 'completed') {
        return { actionId, status: 'completed', label: `${verb} ${action.entity_type} ${entityId}` }
      }
      if (result.status === 'unsupported') {
        return fail('rejected', result.message ?? `No hay soporte para ${action.entity_type} todavia.`)
      }
      return fail('failed', result.message ?? `No se pudo ${wantsOpen ? 'abrir' : 'seleccionar'} ${entityId}`)
    }

    case 'focus_widget': {
      const widget = agentWidgetRegistry.get(action.widget_id)
      const element =
        document.getElementById(action.widget_id) ?? document.querySelector(`[data-agent-widget-id="${action.widget_id}"]`)
      if (!widget && !element) {
        return fail('rejected', `No pude encontrar el panel ${action.widget_id} porque no esta disponible en esta vista.`)
      }
      agentWidgetRegistry.setFocusedWidget(action.widget_id)
      if (widget?.focus) {
        widget.focus()
      } else if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        element.classList.add('ai-agent-highlight')
        const cleanupEffects = startGuidanceEffects(element as HTMLElement)
        window.setTimeout(() => {
          cleanupEffects()
          element.classList.remove('ai-agent-highlight')
        }, 1600)
      }
      return { actionId, status: 'completed', label: `Enfocando ${widget?.label ?? action.widget_id}` }
    }

    default:
      return fail('rejected', 'Acción no reconocida')
  }
}
