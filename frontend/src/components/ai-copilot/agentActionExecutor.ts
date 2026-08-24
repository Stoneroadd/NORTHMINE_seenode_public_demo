import { sectionPaths, type SectionId } from '../../lib/appRoutes'
import { useAppStore, type TurnoId } from '../../store'
import { moduleForRoute, NORTHMINE_MODULES } from '../../lib/agentRegistry/modules'
import { agentWidgetRegistry } from '../../lib/agentRegistry/registry'; import { humanizeIdentifier } from '../../lib/presentationSafety'
import { agentEntityNavigator } from '../../lib/agentRegistry/entityNavigator'
import { resolveEquipmentAlias } from '../../lib/agentRegistry/entityResolver'
import type { AgentActionExecutionStatus, AgentActionResult } from '../../lib/agentRegistry/types'
import type { CopilotUIAction } from '../../lib/aiCopilot'
import { agentGuidance } from '../../lib/agentGuidance/guidanceStore'

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
    const guidance = guidanceForAction(item.action)
    if (guidance) agentGuidance.start({ actionId: item.id, ...guidance })
    const result = await executeOne(item.id, item.action)
    if (guidance) agentGuidance.finish(item.id, result.status === 'completed')
    item.onResult(result)
  }
  processing = false
}

function guidanceForAction(action: CopilotUIAction): { targetId: string; effect: NonNullable<CopilotUIAction['guidance']>['effect']; durationMs?: number; label: string } | null {
  const requested = action.guidance
  if (action.action === 'navigate') {
    const module = isSectionId(action.route) ? NORTHMINE_MODULES[action.route] : moduleForRoute(action.route.startsWith('/') ? action.route : `/${action.route}`)
    const moduleId = module?.id ?? action.route
    return { targetId: `module:${moduleId}`, effect: requested?.effect ?? 'sweep', durationMs: requested?.durationMs, label: requested?.label ?? `Abrir ${module?.label ?? action.route}` }
  }
  if (action.action === 'focus_widget' || action.action === 'widget_action') {
    const manifest = agentWidgetRegistry.get(action.widget_id)
    return { targetId: `widget:${humanizeIdentifier(action.widget_id, 'elemento operacional')}`, effect: requested?.effect ?? manifest?.agentGuidance?.preferredEffect ?? 'spotlight', durationMs: requested?.durationMs, label: requested?.label ?? `Enfocar ${manifest?.label ?? humanizeIdentifier(action.widget_id, 'elemento operacional')}` }
  }
  if (action.action === 'select_entity' || action.action === 'open_entity') {
    return { targetId: `entity:${action.entity_type}:${action.entity_id}`, effect: requested?.effect ?? 'glow', durationMs: requested?.durationMs, label: requested?.label ?? `Mostrar ${action.entity_id}` }
  }
  return null
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
        return { actionId, status: 'completed', label: `${verb} ${action.entity_type} ${entityId}`, resolvedEntityId: entityId }
      }
      if (result.status === 'unsupported') {
        return fail('rejected', result.message ?? `No hay soporte para ${action.entity_type} todavia.`)
      }
      return fail('failed', result.message ?? `No se pudo ${wantsOpen ? 'abrir' : 'seleccionar'} ${entityId}`)
    }

    case 'focus_widget': {
      const widget = agentWidgetRegistry.get(action.widget_id)
      const element =
        agentWidgetRegistry.getElement(action.widget_id)
      if (!widget && !element) {
        return fail('rejected', `No pude encontrar el panel ${humanizeIdentifier(action.widget_id, 'elemento operacional')} porque no esta disponible en esta vista.`)
      }
      agentWidgetRegistry.setFocusedWidget(action.widget_id)
      if (widget?.focus) {
        widget.focus()
      } else if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
      return { actionId, status: 'completed', label: `Enfocando ${widget?.label ?? action.widget_id}` }
    }

    case 'widget_action': {
      const widget = agentWidgetRegistry.get(action.widget_id)
      const element = agentWidgetRegistry.getElement(action.widget_id)
      if (!widget || !element) return fail('rejected', `El panel ${humanizeIdentifier(action.widget_id, 'elemento operacional')} no está disponible en esta vista.`)
      if (!widget.supportedActions.includes(action.semantic_action) || !widget.performSemanticAction) {
        return fail('rejected', `${widget.label} no soporta ${humanizeIdentifier(action.semantic_action, 'esta acción')}.`)
      }
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      agentWidgetRegistry.setFocusedWidget(action.widget_id)
      const confirmed = await widget.performSemanticAction(action.semantic_action, action.args)
      return confirmed
        ? { actionId, status: 'completed', label: `Resaltando ${widget.label}` }
        : fail('failed', `No se pudo confirmar ${humanizeIdentifier(action.semantic_action, 'esta acción')} en ${widget.label}`)
    }

    default:
      return fail('rejected', 'Acción no reconocida')
  }
}
