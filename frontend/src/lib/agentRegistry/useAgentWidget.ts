import { useCallback, useEffect, useRef } from 'react'
import { agentWidgetRegistry } from './registry'
import type { AgentActionType, AgentGuidanceManifest, AgentModuleId, AgentWidgetSnapshot, AgentWidgetType } from './types'

export interface UseAgentWidgetOptions {
  id: string
  moduleId: AgentModuleId
  sectionId?: string
  type: AgentWidgetType
  label: string
  description: string
  supportedActions: AgentActionType[]
  agentGuidance?: AgentGuidanceManifest
  getSnapshot?: () => AgentWidgetSnapshot
  performSemanticAction?: (action: AgentActionType, args?: Record<string, unknown>) => Promise<boolean> | boolean
}

/**
 * Registra un widget real en el Agent UI Registry mientras el componente
 * esta montado, y lo desregistra al desmontar - asi el agente nunca ve un
 * widget "fantasma" de un componente que ya no existe (lazy load, cambio de
 * tab, seleccion de equipo). Devuelve un ref callback opcional que solo
 * agrega `data-agent-widget-id` como apoyo visual/testing; la fuente de
 * verdad sigue siendo el registro en memoria, no el atributo DOM.
 */
export function useAgentWidget(options: UseAgentWidgetOptions) {
  const optionsRef = useRef(options)
  optionsRef.current = options

  useEffect(() => {
    agentWidgetRegistry.register({
      id: options.id,
      moduleId: options.moduleId,
      sectionId: options.sectionId,
      type: options.type,
      label: options.label,
      description: options.description,
      supportedActions: options.supportedActions,
      agentGuidance: options.agentGuidance,
      getSnapshot: options.getSnapshot ? () => optionsRef.current.getSnapshot!() : undefined,
      performSemanticAction: options.performSemanticAction
        ? (action, args) => optionsRef.current.performSemanticAction!(action, args)
        : undefined,
    })
    return () => agentWidgetRegistry.unregister(options.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.id, options.moduleId, options.sectionId])

  const ref = useCallback(
    (element: HTMLElement | null) => {
      if (element) {
        element.setAttribute('data-agent-widget-id', options.id)
        if (!element.hasAttribute('tabindex')) element.tabIndex = 0
        // Etapa 5: visibilidad real via IntersectionObserver (seccion 7) -
        // registrar el nodo DOM real, no solo el manifest en memoria.
        agentWidgetRegistry.observeElement(options.id, element)
      } else {
        agentWidgetRegistry.unobserveElement(options.id)
      }
    },
    [options.id],
  )

  return { ref }
}
