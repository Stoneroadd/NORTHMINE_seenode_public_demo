import { AlertTriangle } from 'lucide-react'
import { AIConfidenceBadge, AIDataFreshnessBadge, AIThinkingIndicator, AIToolExecutionStatus } from './AIBadges'
import { AIEvidencePanel } from './AIEvidencePanel'
import { AIChartRenderer } from './AIChartRenderer'
import { AITaskDraftCard } from './AITaskDraftCard'
import { AIReportDraftCard } from './AIReportDraftCard'
import type { CopilotContext } from '../../lib/aiCopilot'
import type { ChatTurn } from './types'

const RESPONSE_TYPE_LABEL: Record<string, string> = {
  observation: 'Observacion',
  finding: 'Hallazgo',
  risk: 'Riesgo detectado',
  recommendation: 'Recomendacion',
  simulation: 'Simulacion',
  draft: 'Borrador',
  pending_action: 'Accion pendiente de aprobacion',
  information_insufficient: 'Informacion insuficiente',
  error: 'Error controlado',
}

export function AIMessage({ turn, canApprove, context }: { turn: ChatTurn; canApprove: boolean; context: CopilotContext }) {
  if (turn.role === 'user') {
    return (
      <div className="ai-copilot-message is-user">
        <span className="ai-copilot-message-author">ORDEN</span>
        <p>{turn.text}</p>
      </div>
    )
  }

  if (turn.status === 'streaming') {
    return (
      <div className="ai-copilot-message is-assistant">
        <div className="ai-copilot-message-body">
          <AIThinkingIndicator phase={turn.phase} />
          {turn.toolExecutions.length > 0 && <AIToolExecutionStatus executions={turn.toolExecutions} />}
          {turn.text && <p className="ai-copilot-message-text">{turn.text}</p>}
        </div>
      </div>
    )
  }

  if (turn.status === 'error') {
    return (
      <div className="ai-copilot-message is-assistant is-error">
        <div className="ai-copilot-message-body">
          <AlertTriangle size={14} />
          <p>{turn.error}</p>
        </div>
      </div>
    )
  }

  const response = turn.response

  return (
    <div className={`ai-copilot-message is-assistant${response.degraded ? ' is-degraded' : ''}`}>
      <div className="ai-copilot-message-body">
        <span className="ai-copilot-message-author">JARVIS / RESPUESTA VERIFICADA</span>
        <div className="ai-copilot-message-tags">
          <span className="ai-copilot-badge ai-copilot-badge--type">{RESPONSE_TYPE_LABEL[response.response_type] ?? response.response_type}</span>
          <AIConfidenceBadge confidence={response.confidence} />
          <AIDataFreshnessBadge freshness={response.data_freshness} />
        </div>

        <p className="ai-copilot-message-text">{response.message}</p>

        {response.facts.length > 0 && (
          <div className="ai-copilot-block">
            <span className="ai-copilot-block-title">Hechos comprobados</span>
            <ul>{response.facts.map((item, index) => <li key={index}>{item}</li>)}</ul>
          </div>
        )}
        {response.inferences.length > 0 && (
          <div className="ai-copilot-block">
            <span className="ai-copilot-block-title">Inferencias</span>
            <ul>{response.inferences.map((item, index) => <li key={index}>{item}</li>)}</ul>
          </div>
        )}
        {response.recommendations.length > 0 && (
          <div className="ai-copilot-block">
            <span className="ai-copilot-block-title">Recomendaciones</span>
            <ul>{response.recommendations.map((item, index) => <li key={index}>{item}</li>)}</ul>
          </div>
        )}
        {response.limitations.length > 0 && (
          <div className="ai-copilot-block ai-copilot-block--limitations">
            <span className="ai-copilot-block-title">Limitaciones</span>
            <ul>{response.limitations.map((item, index) => <li key={index}>{item}</li>)}</ul>
          </div>
        )}

        {response.chart_specs.map((spec, index) => (
          <AIChartRenderer key={index} spec={spec} />
        ))}

        {response.task_drafts.map((task) => (
          <AITaskDraftCard key={task.id} task={task} canApprove={canApprove} />
        ))}

        {response.report_drafts.map((report) => (
          <AIReportDraftCard key={report.id} report={report} context={context} />
        ))}

        <AIEvidencePanel evidence={response.evidence} />
        <AIToolExecutionStatus executions={response.tool_executions} />

        {response.requires_human_approval && !response.degraded && (
          <p className="ai-copilot-approval-note">
            Esta respuesta requiere validacion de un usuario autorizado antes de convertirse en accion.
          </p>
        )}
      </div>
    </div>
  )
}
