import { useEffect, useState, useSyncExternalStore } from 'react'
import { Check, ChevronLeft, ChevronRight, CircleStop, Pause, Play, RotateCcw, SkipForward, TriangleAlert, X } from 'lucide-react'
import { secureApi } from '../../lib/api'
import { agentDemoController } from '../../lib/agentDemo/AgentDemoController'
import type { AgentDemoMode, AgentDemoSpeed } from '../../lib/agentDemo/types'
import { AGENT_DEMO_HUD_COLLAPSE } from '../../lib/agentDemo/events'
import '../../styles/agent-demo-tour.css'

interface DemoStatus {
  enabled: boolean
  live_available: boolean
  scenarios: Array<{ id: string; label: string }>
}

export function AgentDemoTour() {
  const demo = useSyncExternalStore(agentDemoController.subscribe, agentDemoController.getSnapshot)
  const [availability, setAvailability] = useState<DemoStatus | null>(null)
  const [launcherOpen, setLauncherOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [scenarioId, setScenarioId] = useState('full_operational_demo')
  const [mode, setMode] = useState<AgentDemoMode>('deterministic')
  const [speed, setSpeed] = useState<AgentDemoSpeed>('presentation')

  useEffect(() => {
    const setDemoCollapse = (event: Event) => setCollapsed(Boolean((event as CustomEvent<{ collapsed?: boolean }>).detail?.collapsed))
    window.addEventListener(AGENT_DEMO_HUD_COLLAPSE, setDemoCollapse)
    return () => window.removeEventListener(AGENT_DEMO_HUD_COLLAPSE, setDemoCollapse)
  }, [])

  useEffect(() => {
    secureApi.get('/api/ai-agent/demo/status').then(({ data }) => setAvailability(data)).catch(() => setAvailability(null))
  }, [])

  useEffect(() => {
    if (!availability?.enabled) return
    const params = new URLSearchParams(window.location.search)
    if (params.get('agent_demo') !== '1') return
    const requestedMode = params.get('mode') === 'live' ? 'live' : 'deterministic'
    const requestedSpeed = ['normal', 'fast', 'presentation'].includes(params.get('speed') ?? '')
      ? params.get('speed') as AgentDemoSpeed : 'presentation'
    void agentDemoController.start({ scenarioId: params.get('scenario') ?? 'full_operational_demo', mode: requestedMode, speed: requestedSpeed })
  }, [availability?.enabled])

  if (!availability?.enabled) return null

  const active = !['idle', 'aborted'].includes(demo.status)
  const completedCount = demo.scenes.filter((scene) => scene.status === 'passed').length
  const current = demo.scenes[demo.currentIndex]

  return (
    <>
      {!active && (
        <button type="button" className="agent-demo-launcher" onClick={() => setLauncherOpen(true)}>
          <Play size={14} /> Iniciar demostración
        </button>
      )}

      {launcherOpen && !active && (
        <section className="agent-demo-start" role="dialog" aria-modal="true" aria-label="Demostración de NORTHMINE AI">
          <button type="button" className="agent-demo-start__backdrop" aria-label="Cerrar" onClick={() => setLauncherOpen(false)} />
          <div className="agent-demo-start__panel">
            <button type="button" className="agent-demo-close" onClick={() => setLauncherOpen(false)} aria-label="Cerrar"><X size={17} /></button>
            <h2>Demostración de NORTHMINE AI</h2>
            <p>Una historia operacional continua, ejecutada por el Runtime y validada con evidencia determinística.</p>
            <label>Recorrido
              <select value={scenarioId} onChange={(event) => setScenarioId(event.target.value)}>
                {availability.scenarios.map((scenario) => <option key={scenario.id} value={scenario.id}>{scenario.label}</option>)}
              </select>
            </label>
            <div className="agent-demo-start__row">
              <label>Modo
                <select value={mode} onChange={(event) => setMode(event.target.value as AgentDemoMode)}>
                  <option value="deterministic">Determinístico</option>
                  <option value="live" disabled={!availability.live_available}>Live{availability.live_available ? '' : ' · no disponible'}</option>
                </select>
              </label>
              <label>Velocidad
                <select value={speed} onChange={(event) => setSpeed(event.target.value as AgentDemoSpeed)}>
                  <option value="presentation">Presentación</option>
                  <option value="normal">Normal</option>
                  <option value="fast">Rápida</option>
                </select>
              </label>
            </div>
            <div className="agent-demo-disclosure">
              <TriangleAlert size={15} />
              <span>Demo automatizada. No certifica micrófono, parlantes ni permisos nativos de Chrome.</span>
            </div>
            <button type="button" className="agent-demo-start__action" onClick={() => {
              setLauncherOpen(false)
              void agentDemoController.start({ scenarioId, mode, speed })
            }}><Play size={15} /> Iniciar recorrido</button>
          </div>
        </section>
      )}

      {active && (
        <aside className={`agent-demo-hud${collapsed ? ' is-collapsed' : ''}`} aria-label="NORTHMINE AI · Demostración" aria-live="polite">
          <header>
            <div>
              <strong>NORTHMINE AI · Demostración</strong>
              <span>{demo.mode === 'deterministic' ? 'Modo determinístico' : 'Modo live'} · {completedCount}/{demo.scenes.length}</span>
            </div>
            <button type="button" onClick={() => setCollapsed((value) => !value)} aria-label={collapsed ? 'Expandir' : 'Contraer'}>
              {collapsed ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
            </button>
          </header>
          {!collapsed && (
            <>
              <div className="agent-demo-progress" aria-hidden="true"><i style={{ width: `${demo.scenes.length ? completedCount / demo.scenes.length * 100 : 0}%` }} /></div>
              <div className="agent-demo-current">
                <span>{current?.title ?? 'Preparando'}</span>
                <p>{demo.currentMessage}</p>
                {demo.error && <small>{demo.error}</small>}
              </div>
              <ol className="agent-demo-scenes">
                {demo.scenes.map((scene, index) => (
                  <li key={scene.id} className={`is-${scene.status}${index === demo.currentIndex ? ' is-current' : ''}`}>
                    <span>{scene.status === 'passed' ? <Check size={12} /> : index + 1}</span>
                    <b>{scene.title}</b>
                    {scene.latencyMs != null && <small>{(scene.latencyMs / 1000).toFixed(1)} s</small>}
                  </li>
                ))}
              </ol>
              {demo.score && (
                <dl className="agent-demo-score">
                  {Object.entries(demo.score).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}
                </dl>
              )}
              <footer>
                {demo.status === 'paused' ? <button type="button" onClick={() => agentDemoController.resume()}><Play size={14} /> Continuar</button>
                  : demo.status === 'failed' ? <button type="button" onClick={() => void agentDemoController.retry()}><RotateCcw size={14} /> Reintentar</button>
                    : <button type="button" onClick={() => agentDemoController.pause()} disabled={demo.status !== 'running'}><Pause size={14} /> Pausar</button>}
                <button type="button" onClick={() => agentDemoController.previous()} disabled={demo.status !== 'paused' || demo.currentIndex <= 0}><ChevronLeft size={14} /> Anterior</button>
                <button type="button" onClick={() => agentDemoController.next()} disabled={demo.status !== 'paused'}><SkipForward size={14} /> Siguiente</button>
                {demo.status === 'failed' && <button type="button" onClick={() => agentDemoController.continueAfterFailure()}>Continuar</button>}
                <button type="button" className="is-danger" onClick={() => agentDemoController.abort()}><CircleStop size={14} /> Abortar</button>
              </footer>
            </>
          )}
        </aside>
      )}
    </>
  )
}
