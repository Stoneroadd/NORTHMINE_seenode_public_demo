import { useEffect, useRef } from 'react'
import { agentEntityNavigator } from './entityNavigator'
import type { AgentEntityHandler, AgentEntityType } from './types'

/**
 * Registra el handler real de un modulo (select/open/isOpen) mientras el
 * componente esta montado. El handler puede cambiar de identidad en cada
 * render (closures frescas sobre el estado del componente) sin volver a
 * registrar/desregistrar - se lee siempre a traves de un ref estable.
 */
export function useAgentEntityHandler(entityType: AgentEntityType, handler: AgentEntityHandler): void {
  const handlerRef = useRef(handler)
  handlerRef.current = handler

  useEffect(() => {
    const stableHandler: AgentEntityHandler = {
      select: (id) => handlerRef.current.select?.(id),
      open: (id) => handlerRef.current.open?.(id),
      isOpen: (id) => handlerRef.current.isOpen?.(id) ?? false,
    }
    return agentEntityNavigator.registerHandler(entityType, stableHandler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType])
}
