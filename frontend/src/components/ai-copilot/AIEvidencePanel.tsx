import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { CopilotEvidence } from '../../lib/aiCopilot'

export function AIEvidencePanel({ evidence }: { evidence: CopilotEvidence[] }) {
  const [open, setOpen] = useState(false)
  if (!evidence.length) return null

  return (
    <div className="ai-copilot-evidence">
      <button type="button" className="ai-copilot-evidence-toggle" onClick={() => setOpen((value) => !value)}>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        Ver evidencia ({evidence.length})
      </button>
      {open && (
        <ul className="ai-copilot-evidence-list">
          {evidence.map((item, index) => (
            <li key={index}>
              <span className="ai-copilot-evidence-source">{item.source}</span>
              <span className="ai-copilot-evidence-detail">{item.detail}</span>
              {item.period && <span className="ai-copilot-evidence-period">{item.period}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
