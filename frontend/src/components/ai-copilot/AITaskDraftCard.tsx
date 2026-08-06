import { useState } from 'react'
import { Check, X } from 'lucide-react'
import { copilotApi } from '../../lib/aiCopilot'
import type { CopilotTaskDraft, TaskStatus } from '../../lib/aiCopilot'

const STATUS_LABEL: Record<TaskStatus, string> = {
  draft: 'Borrador · pendiente de aprobacion',
  pending_approval: 'Pendiente de aprobacion',
  approved: 'Aprobada',
  rejected: 'Rechazada',
  completed: 'Completada',
}

interface Props {
  task: CopilotTaskDraft
  canApprove: boolean
}

export function AITaskDraftCard({ task, canApprove }: Props) {
  const [current, setCurrent] = useState(task)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const act = async (action: 'approve' | 'reject' | 'complete') => {
    setBusy(true)
    setError(null)
    try {
      const updated =
        action === 'approve'
          ? await copilotApi.approveTask(current.id)
          : action === 'reject'
            ? await copilotApi.rejectTask(current.id)
            : await copilotApi.completeTask(current.id)
      setCurrent(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar la tarea')
    } finally {
      setBusy(false)
    }
  }

  return (
    <article className={`ai-copilot-task-card is-${current.status}`}>
      <header>
        <span className={`ai-copilot-task-priority is-${current.priority}`}>{current.priority}</span>
        <strong>{current.title}</strong>
      </header>
      <p className="ai-copilot-task-reason">{current.reason}</p>
      {current.evidence.length > 0 && (
        <ul className="ai-copilot-task-evidence">
          {current.evidence.slice(0, 3).map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      )}
      <footer>
        <span className="ai-copilot-task-owner">
          Responsable sugerido: {current.suggested_owner || 'no especificado'}
        </span>
        <span className="ai-copilot-task-status">{STATUS_LABEL[current.status]}</span>
      </footer>
      {error && <p className="ai-copilot-task-error">{error}</p>}
      {canApprove && current.status === 'draft' && (
        <div className="ai-copilot-task-actions">
          <button type="button" disabled={busy} onClick={() => act('approve')}>
            <Check size={14} /> Aprobar
          </button>
          <button type="button" disabled={busy} className="is-danger" onClick={() => act('reject')}>
            <X size={14} /> Rechazar
          </button>
        </div>
      )}
      {canApprove && current.status === 'approved' && (
        <div className="ai-copilot-task-actions">
          <button type="button" disabled={busy} onClick={() => act('complete')}>
            <Check size={14} /> Marcar completada
          </button>
        </div>
      )}
    </article>
  )
}
