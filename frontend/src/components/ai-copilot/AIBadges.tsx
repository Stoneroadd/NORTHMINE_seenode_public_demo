import { CheckCircle2, Clock3, Loader2, ShieldQuestion, XCircle } from 'lucide-react'
import type { CopilotConfidence, CopilotFreshness, CopilotToolExecution } from '../../lib/aiCopilot'

const CONFIDENCE_LABEL: Record<CopilotConfidence['level'], string> = {
  alta: 'Confianza alta',
  media: 'Confianza media',
  baja: 'Confianza baja',
  insuficiente: 'Informacion insuficiente',
}

export function AIConfidenceBadge({ confidence }: { confidence: CopilotConfidence }) {
  return (
    <span
      className={`ai-copilot-badge ai-copilot-badge--confidence is-${confidence.level}`}
      title={confidence.reasons.join(' · ') || undefined}
    >
      <ShieldQuestion size={12} />
      {CONFIDENCE_LABEL[confidence.level]}
    </span>
  )
}

export function AIDataFreshnessBadge({ freshness }: { freshness: CopilotFreshness }) {
  const label =
    freshness.status === 'current'
      ? 'Dato vigente'
      : freshness.status === 'stale'
        ? 'Dato en cache'
        : 'Frescura desconocida'
  const age = freshness.age_minutes != null ? ` · hace ${freshness.age_minutes} min` : ''
  return (
    <span className={`ai-copilot-badge ai-copilot-badge--freshness is-${freshness.status}`}>
      <Clock3 size={12} />
      {label}
      {age}
    </span>
  )
}

export function AIToolExecutionStatus({ executions }: { executions: CopilotToolExecution[] }) {
  if (!executions.length) return null
  return (
    <ul className="ai-copilot-tool-list">
      {executions.map((execution, index) => (
        <li key={`${execution.name}-${index}`} className={`is-${execution.status}`}>
          {execution.status === 'ok' && <CheckCircle2 size={13} />}
          {execution.status === 'error' && <XCircle size={13} />}
          {execution.status === 'denied' && <ShieldQuestion size={13} />}
          <span className="ai-copilot-tool-name">{execution.name}</span>
          {execution.summary && <span className="ai-copilot-tool-summary">{execution.summary}</span>}
          <span className="ai-copilot-tool-duration">{execution.duration_ms} ms</span>
        </li>
      ))}
    </ul>
  )
}

export function AIThinkingIndicator({ phase }: { phase: string }) {
  const labels: Record<string, string> = {
    analyzing_intent: 'Analizando intencion...',
    consulting_data: 'Consultando datos operacionales...',
    preparing_recommendation: 'Preparando recomendacion...',
    insufficient_information: 'Evaluando informacion disponible...',
    awaiting_approval: 'Esperando validacion humana',
    done: 'Listo',
  }
  return (
    <div className="ai-copilot-thinking">
      <Loader2 size={14} className="ai-copilot-spin" />
      <span>{labels[phase] ?? phase}</span>
    </div>
  )
}
