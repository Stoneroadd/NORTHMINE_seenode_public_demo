import { useEffect, useRef, useState } from 'react'
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  Search,
  ShieldAlert,
  X,
} from 'lucide-react'
import {
  INVESTIGATION_TYPES,
  INVESTIGATION_TYPE_LABELS,
  planInvestigation,
  streamAutomaticInvestigation,
  streamExecuteInvestigation,
  investigationsApi,
  type InvestigationPlan,
  type InvestigationResult,
  type InvestigationStreamEvent,
  type InvestigationType,
  type PlanStep,
} from '../../lib/agentInvestigations'
import type { CopilotContext, CopilotUIAction } from '../../lib/aiCopilot'
import { enqueueAgentAction } from './agentActionExecutor'
import type { AgentActionResult } from '../../lib/agentRegistry/types'
import { AgentActionOverlay } from './AgentActionOverlay'

interface Props {
  context: CopilotContext
  onMilestone?: (text: string) => void
}

type Phase = 'select' | 'planning' | 'plan_ready' | 'executing' | 'done' | 'error'
type ExecMode = 'guided' | 'automatic'

/**
 * Mapa capability_id -> accion semantica de UI (Etapa 2). Solo cubre las
 * ui_action registradas en capabilities.py; son 'optional' en las 4
 * plantillas del Planner, asi que esto nunca bloquea una conclusion - es
 * pura visibilidad (seccion 14 del brief).
 */
function actionForCapability(capabilityId: string, equipmentId: string | null): CopilotUIAction | null {
  switch (capabilityId) {
    case 'navigate_production':
      return { action: 'navigate', route: 'produccion' }
    case 'focus_production_chart':
      return { action: 'focus_widget', widget_id: 'production-hourly-chart' }
    case 'navigate_loading':
      return { action: 'navigate', route: 'carguio' }
    case 'focus_loading_chart':
      return { action: 'focus_widget', widget_id: 'loading-rate-chart' }
    case 'navigate_fleet':
      return { action: 'navigate', route: 'flota' }
    case 'open_affected_equipment':
      return equipmentId ? { action: 'open_entity', entity_type: 'equipment', entity_id: equipmentId } : null
    case 'navigate_breakdowns':
      return { action: 'navigate', route: 'averias' }
    case 'focus_breakdowns_list':
      return { action: 'focus_widget', widget_id: 'breakdown-active-list' }
    case 'navigate_comparison':
      return { action: 'navigate', route: 'comparativa' }
    default:
      return null
  }
}

const STEP_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  running: 'En curso',
  completed: 'Completado',
  failed: 'Fallido',
  skipped: 'Omitido',
  cancelled: 'Cancelado',
  rejected: 'Rechazado',
}

function StepRow({ step }: { step: PlanStep }) {
  const icon =
    step.status === 'completed' ? <Check size={13} /> :
    step.status === 'running' ? <Loader2 size={13} className="ai-copilot-spin" /> :
    step.status === 'failed' ? <X size={13} /> :
    <span className="ai-inv-step-dot" />

  return (
    <li className={`ai-inv-step is-${step.status}`}>
      {icon}
      <span className="ai-inv-step-desc">{step.description}</span>
      <span className="ai-inv-step-meta">
        {step.kind === 'ui_action' ? 'visibilidad' : STEP_LABELS[step.status]}
        {step.duration_ms != null ? ` · ${step.duration_ms}ms` : ''}
      </span>
    </li>
  )
}

const HYPOTHESIS_GROUPS: Array<{ status: string; label: string }> = [
  { status: 'probable', label: 'Probables' },
  { status: 'possible', label: 'Posibles' },
  { status: 'unsupported', label: 'Descartadas' },
  { status: 'insufficient_data', label: 'Datos insuficientes' },
]

/**
 * Panel de investigacion operacional (Etapa 3): Objetivo/Plan, hallazgos en
 * vivo, hipotesis y resultado final con validacion humana obligatoria. No es
 * un chat: el usuario elige uno de los 4 tipos cerrados, revisa el plan
 * (modo Guiado, default) y confirma antes de que se consulte cualquier dato.
 */
export function AgentInvestigationPanel({ context, onMilestone }: Props) {
  const [phase, setPhase] = useState<Phase>('select')
  const [execMode, setExecMode] = useState<ExecMode>('guided')
  const [selectedType, setSelectedType] = useState<InvestigationType | null>(null)
  const [plan, setPlan] = useState<InvestigationPlan | null>(null)
  const [result, setResult] = useState<InvestigationResult | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [uiActionResults, setUiActionResults] = useState<AgentActionResult[]>([])
  const [evidenceOpen, setEvidenceOpen] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const reportedStepsRef = useRef<Set<string>>(new Set())

  useEffect(() => () => abortRef.current?.abort(), [])

  function applyStepEvent(stepId: string, patch: Partial<PlanStep>) {
    setPlan((current) => {
      if (!current) return current
      return { ...current, steps: current.steps.map((s) => (s.step_id === stepId ? { ...s, ...patch } : s)) }
    })
  }

  function handleUiAction(stepId: string, capabilityId: string, investigationId: string) {
    const equipmentId = plan?.scope.equipment_ids[0] ?? context.selected_equipment_ids?.[0] ?? null
    const action = actionForCapability(capabilityId, equipmentId)
    if (!action) {
      applyStepEvent(stepId, { status: 'skipped', error: 'Sin equipo identificado para abrir el detalle.' })
      return
    }
    enqueueAgentAction(action, (uiResult) => {
      setUiActionResults((list) => [...list, uiResult].slice(-4))
      applyStepEvent(stepId, { status: uiResult.status === 'completed' ? 'completed' : 'failed', error: uiResult.error ?? null })
      if (!reportedStepsRef.current.has(stepId)) {
        reportedStepsRef.current.add(stepId)
        const reportStatus = uiResult.status === 'completed' ? 'completed' : uiResult.status === 'rejected' ? 'rejected' : 'failed'
        void investigationsApi.reportUiStep(investigationId, stepId, {
          status: reportStatus,
          context_updated: uiResult.status === 'completed',
          label: uiResult.label,
        })
      }
    })
  }

  function onStreamEvent(event: InvestigationStreamEvent) {
    switch (event.type) {
      case 'investigation.plan':
        setPlan(event.plan)
        break
      case 'step.started':
        applyStepEvent(event.stepId, { status: 'running' })
        break
      case 'tool.completed':
      case 'tool.failed':
        applyStepEvent(event.stepId, { status: event.status, duration_ms: event.durationMs, error: event.error })
        break
      case 'ui_action.requested':
        handleUiAction(event.stepId, event.capabilityId, event.investigationId)
        break
      case 'investigation.completed':
        setResult(event.result)
        setPlan(event.result.plan)
        setPhase('done')
        onMilestone?.(event.result.conclusion?.summary ?? 'Investigación completada.')
        break
      case 'investigation.failed':
        setErrorMessage(event.message)
        setPhase('error')
        break
      default:
        break
    }
  }

  async function startAutomatic(type: InvestigationType) {
    setPhase('executing')
    reportedStepsRef.current = new Set()
    const controller = new AbortController()
    abortRef.current = controller
    onMilestone?.(`Iniciando investigación: ${INVESTIGATION_TYPE_LABELS[type]}.`)
    try {
      await streamAutomaticInvestigation(
        { type, shift: context.shift ?? null },
        { onEvent: onStreamEvent, signal: controller.signal },
      )
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'No se pudo ejecutar la investigación.')
      setPhase('error')
    }
  }

  async function buildPlan(type: InvestigationType) {
    setSelectedType(type)
    setPhase('planning')
    setErrorMessage(null)
    try {
      const { plan: builtPlan } = await planInvestigation({ type, shift: context.shift ?? null })
      setPlan(builtPlan)
      setPhase('plan_ready')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'No se pudo construir el plan.')
      setPhase('error')
    }
  }

  function selectType(type: InvestigationType) {
    if (execMode === 'automatic') {
      setSelectedType(type)
      void startAutomatic(type)
    } else {
      void buildPlan(type)
    }
  }

  async function confirmExecution() {
    if (!plan) return
    setPhase('executing')
    reportedStepsRef.current = new Set()
    const controller = new AbortController()
    abortRef.current = controller
    onMilestone?.('Investigación en curso.')
    try {
      await streamExecuteInvestigation(plan.investigation_id, { onEvent: onStreamEvent, signal: controller.signal })
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'No se pudo ejecutar la investigación.')
      setPhase('error')
    }
  }

  function reset() {
    abortRef.current?.abort()
    setPhase('select')
    setSelectedType(null)
    setPlan(null)
    setResult(null)
    setErrorMessage(null)
    setUiActionResults([])
    setEvidenceOpen(false)
  }

  const toolSteps = plan?.steps.filter((s) => s.kind === 'tool') ?? []
  const uiSteps = plan?.steps.filter((s) => s.kind === 'ui_action') ?? []
  const conclusion = result?.conclusion ?? null

  return (
    <div className="ai-investigation-panel">
      {phase === 'select' && (
        <>
          <p className="ai-inv-intro">
            Elige qué investigar. El agente construye un plan auditable, consulta solo herramientas de solo lectura y
            entrega un resultado que requiere tu validación.
          </p>
          <div className="ai-inv-mode-toggle" role="radiogroup" aria-label="Modo de ejecución">
            <button type="button" className={execMode === 'guided' ? 'is-active' : ''} onClick={() => setExecMode('guided')}>
              Guiado (revisar plan)
            </button>
            <button type="button" className={execMode === 'automatic' ? 'is-active' : ''} onClick={() => setExecMode('automatic')}>
              Automático de solo lectura
            </button>
          </div>
          <div className="ai-inv-type-grid">
            {INVESTIGATION_TYPES.map((type) => (
              <button key={type} type="button" className="ai-inv-type-card" onClick={() => selectType(type)}>
                <Search size={16} />
                <span>{INVESTIGATION_TYPE_LABELS[type]}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {phase === 'planning' && (
        <div className="ai-copilot-thinking">
          <Loader2 size={14} className="ai-copilot-spin" />
          Construyendo plan de investigación…
        </div>
      )}

      {phase === 'plan_ready' && plan && (
        <div className="ai-inv-plan">
          <header>
            <strong>{plan.goal}</strong>
            <span className="ai-copilot-badge">{plan.steps.length} pasos</span>
          </header>
          {plan.missing_capabilities.length > 0 && (
            <p className="ai-inv-warning">
              <AlertTriangle size={12} /> {plan.missing_capabilities.length} capacidad(es) no disponible(s), se omitieron del plan.
            </p>
          )}
          <ul className="ai-inv-step-list">
            {toolSteps.map((step) => <StepRow key={step.step_id} step={step} />)}
          </ul>
          {uiSteps.length > 0 && (
            <p className="ai-inv-ui-steps-note">+ {uiSteps.length} acciones de visibilidad en UI (opcionales, no bloquean la conclusión).</p>
          )}
          <div className="ai-inv-actions">
            <button type="button" className="ai-inv-primary" onClick={confirmExecution}>
              Iniciar investigación
            </button>
            <button type="button" className="ai-inv-secondary" onClick={reset}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {(phase === 'executing' || phase === 'done') && plan && (
        <div className="ai-inv-plan">
          <header>
            <strong>{plan.goal}</strong>
            {phase === 'executing' && <Loader2 size={14} className="ai-copilot-spin" />}
          </header>
          <ul className="ai-inv-step-list">
            {toolSteps.map((step) => <StepRow key={step.step_id} step={step} />)}
          </ul>

          {result && (
            <>
              <div className="ai-inv-evidence-toggle">
                <button type="button" onClick={() => setEvidenceOpen((v) => !v)}>
                  {evidenceOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  Ver evidencia ({result.evidence.length})
                </button>
              </div>
              {evidenceOpen && (
                <ul className="ai-copilot-evidence-list">
                  {result.evidence.map((item) => (
                    <li key={item.evidence_id}>
                      <span className="ai-copilot-evidence-source">{item.capability_id}</span>
                      <span className={`ai-copilot-badge ai-copilot-badge--freshness is-${item.freshness_status}`}>{item.freshness_status}</span>
                      <span className="ai-copilot-badge">calidad {item.quality_status}</span>
                      <span className="ai-copilot-badge">{item.verification_status}</span>
                    </li>
                  ))}
                </ul>
              )}

              {result.hypotheses.length > 0 && (
                <div className="ai-inv-hypotheses">
                  <p className="ai-copilot-block-title">Hipótesis operacionales</p>
                  {HYPOTHESIS_GROUPS.map((group) => {
                    const items = result.hypotheses.filter((h) => h.status === group.status)
                    if (!items.length) return null
                    return (
                      <div key={group.status} className="ai-inv-hypothesis-group">
                        <span className="ai-inv-hypothesis-group-label">{group.label}</span>
                        <ul>
                          {items.map((h) => (
                            <li key={h.hypothesis_id}>
                              {h.label}
                              {h.score != null && <span className="ai-inv-hypothesis-score">{Math.round(h.score * 100)}%</span>}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )
                  })}
                  <p className="ai-inv-hypothesis-caption">Puntaje heurístico interno, no es una probabilidad estadística.</p>
                </div>
              )}

              {conclusion && (
                <div className="ai-inv-conclusion">
                  <p className="ai-copilot-block-title">Resultado</p>
                  <p className="ai-inv-summary">{conclusion.summary}</p>
                  {conclusion.probable_causes.length > 0 && (
                    <div className="ai-copilot-block">
                      <span className="ai-copilot-block-title">Causas probables</span>
                      <ul>{conclusion.probable_causes.map((c, i) => <li key={i}>{c}</li>)}</ul>
                    </div>
                  )}
                  {conclusion.recommendations.length > 0 && (
                    <div className="ai-copilot-block">
                      <span className="ai-copilot-block-title">Recomendaciones</span>
                      <ul>{conclusion.recommendations.map((c, i) => <li key={i}>{c}</li>)}</ul>
                    </div>
                  )}
                  {conclusion.limitations.length > 0 && (
                    <div className="ai-copilot-block ai-copilot-block--limitations">
                      <span className="ai-copilot-block-title">Limitaciones</span>
                      <ul>{conclusion.limitations.map((c, i) => <li key={i}>{c}</li>)}</ul>
                    </div>
                  )}
                  <p className="ai-inv-approval">
                    <ShieldAlert size={13} /> Requiere validación humana antes de tomar acción operacional.
                  </p>
                </div>
              )}

              <div className="ai-inv-actions">
                <button type="button" className="ai-inv-secondary" onClick={reset}>
                  Nueva investigación
                </button>
              </div>
            </>
          )}

          <AgentActionOverlay actions={uiActionResults} />
        </div>
      )}

      {phase === 'error' && (
        <div className="ai-inv-error">
          <AlertTriangle size={14} />
          <span>{errorMessage}</span>
          <button type="button" className="ai-inv-secondary" onClick={reset}>
            Volver
          </button>
        </div>
      )}
    </div>
  )
}
