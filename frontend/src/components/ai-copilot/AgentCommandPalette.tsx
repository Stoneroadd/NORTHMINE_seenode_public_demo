import { Search } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { agentSessionClient } from '../../lib/agentRuntime/AgentSessionClient'
import { actionsForModule, GLOBAL_QUICK_ACTIONS, moduleFromPath } from '../../lib/agentRuntime/quickActions'

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
              agentSessionClient.send('user.intent', { intent: action.intent, scope: 'current_context', module_id: moduleId, source: 'command_palette' })
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
