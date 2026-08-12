import { Search } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { actionsForModule, GLOBAL_QUICK_ACTIONS, moduleFromPath } from '../../lib/agentRuntime/quickActions'
import { dispatchStructuredIntent } from '../../lib/agentRuntime/dispatchIntent'

export const AGENT_COMMAND_PALETTE_DEMO_EVENT = 'northmine:agent-command-palette-demo'

export function AgentCommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const moduleId = moduleFromPath(window.location.pathname)
  const actions = useMemo(() => {
    const candidates = [...actionsForModule(moduleId, 8), ...GLOBAL_QUICK_ACTIONS]
      .filter((item, index, all) => all.findIndex((other) => other.id === item.id) === index)
    const normalized = query.trim().toLocaleLowerCase('es')
    return normalized ? candidates.filter((item) => item.label.toLocaleLowerCase('es').includes(normalized)) : candidates
  }, [moduleId, query])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen((value) => !value)
      } else if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    const openForDemo = (event: Event) => {
      const detail = (event as CustomEvent<{ actionId?: string; entityId?: string }>).detail
      const actionId = detail?.actionId
      const action = [...actionsForModule(moduleFromPath(window.location.pathname), 8), ...GLOBAL_QUICK_ACTIONS]
        .find((candidate) => candidate.id === actionId)
      if (!action) return
      setOpen(true)
      setQuery(action.label)
      // Two animation frames are a render acknowledgement: the palette is
      // visibly present before the same structured-intent path is invoked.
      window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
        dispatchStructuredIntent(action, 'command_palette', moduleFromPath(window.location.pathname), detail?.entityId)
        setOpen(false)
        window.dispatchEvent(new CustomEvent('northmine:agent-command-palette-dispatched', { detail: { actionId } }))
      }))
    }
    window.addEventListener(AGENT_COMMAND_PALETTE_DEMO_EVENT, openForDemo)
    return () => window.removeEventListener(AGENT_COMMAND_PALETTE_DEMO_EVENT, openForDemo)
  }, [])

  useEffect(() => {
    if (open) window.requestAnimationFrame(() => inputRef.current?.focus())
    else setQuery('')
  }, [open])

  if (!open) return null
  return (
    <div className="agent-command-palette" role="dialog" aria-modal="true" aria-label="Acciones de NORTHMINE">
      <button className="agent-command-palette__backdrop" type="button" aria-label="Cerrar" onClick={() => setOpen(false)} />
      <section className="agent-command-palette__panel">
        <label><Search size={16} /><input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Analizar, comparar, navegar o crear reporte" /></label>
        <div role="listbox" aria-label="Acciones disponibles">
          {actions.map((action) => (
            <button key={action.id} type="button" role="option" aria-selected="false" onClick={() => {
              dispatchStructuredIntent(action, 'command_palette', moduleId)
              setOpen(false)
            }}>
              <span>{action.label}</span><small>{action.modules?.includes(moduleId) ? 'Contextual' : 'Global'}</small>
            </button>
          ))}
        </div>
        <footer><kbd>Esc</kbd> cerrar <span /><kbd>Ctrl K</kbd></footer>
      </section>
    </div>
  )
}
