import { useEffect, useState } from 'react'
import { agentSessionClient } from '../../lib/agentRuntime/AgentSessionClient'
import type { StructuredIntentId } from '../../lib/agentRuntime/quickActions'
import { agentWidgetRegistry } from '../../lib/agentRegistry/registry'; import { humanizeIdentifier } from '../../lib/presentationSafety'

interface MenuState { x: number; y: number; widgetId: string }

const ACTIONS: Array<{ label: string; intent: StructuredIntentId }> = [
  { label: 'Analizar', intent: 'ANALYZE_SHIFT' },
  { label: 'Comparar', intent: 'COMPARE_SHIFT' },
  { label: 'Mostrar causa', intent: 'WHAT_CHANGED' },
  { label: 'Crear reporte', intent: 'PREPARE_REPORT' },
  { label: 'Seguir', intent: 'CREATE_WATCH' },
]

export function AgentContextMenu() {
  const [menu, setMenu] = useState<MenuState | null>(null)
  useEffect(() => {
    const openFor = (target: Element, x: number, y: number) => {
      const widget = target.closest<HTMLElement>('[data-agent-widget-id]')
      const widgetId = widget?.dataset.agentWidgetId
      if (widgetId) setMenu({ x, y, widgetId })
    }
    const onContext = (event: MouseEvent) => {
      const target = event.target as Element
      if (!target.closest('[data-agent-widget-id]')) return
      event.preventDefault()
      openFor(target, event.clientX, event.clientY)
    }
    const onKey = (event: KeyboardEvent) => {
      if (!(event.shiftKey && event.key === 'F10')) return
      const target = document.activeElement
      if (!(target instanceof HTMLElement) || !target.closest('[data-agent-widget-id]')) return
      event.preventDefault()
      const rect = target.getBoundingClientRect()
      openFor(target, rect.left + 18, rect.top + 18)
    }
    document.addEventListener('contextmenu', onContext)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('contextmenu', onContext); document.removeEventListener('keydown', onKey) }
  }, [])
  useEffect(() => {
    const close = () => setMenu(null)
    window.addEventListener('resize', close)
    window.addEventListener('scroll', close, true)
    return () => { window.removeEventListener('resize', close); window.removeEventListener('scroll', close, true) }
  }, [])
  if (!menu) return null
  const manifest = agentWidgetRegistry.get(menu.widgetId)
  return (
    <div className="agent-context-menu" role="menu" aria-label={`Acciones para ${manifest?.label ?? humanizeIdentifier(menu.widgetId, 'Elemento operacional')}`} style={{ left: Math.min(menu.x, window.innerWidth - 190), top: Math.min(menu.y, window.innerHeight - 230) }}>
      <header><span>Contexto</span><strong>{manifest?.label ?? humanizeIdentifier(menu.widgetId, 'Elemento operacional')}</strong></header>
      {ACTIONS.map((action) => <button key={action.intent} type="button" role="menuitem" onClick={() => {
        agentSessionClient.send('user.intent', { intent: action.intent, scope: 'current_context', module_id: manifest?.moduleId, widget_id: menu.widgetId, source: 'context_action' })
        setMenu(null)
      }}>{action.label}</button>)}
      <button type="button" className="agent-context-menu__close" onClick={() => setMenu(null)}>Cerrar</button>
    </div>
  )
}
