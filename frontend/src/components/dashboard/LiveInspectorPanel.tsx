import { Activity, AlertTriangle, CheckCircle2, RadioTower } from 'lucide-react'
import type { InspectorItem } from '../../hooks/useHoverInspector'
import { StatusPill } from '../ui/StatusPill'

function toneFromState(state?: InspectorItem['state']) {
  if (state === 'critical') return 'critical'
  if (state === 'warning') return 'warning'
  if (state === 'success') return 'success'
  return 'info'
}

export function LiveInspectorPanel({ item }: { item: InspectorItem }) {
  const tone = toneFromState(item.state)

  return (
    <aside className="live-inspector-panel">
      <div className="live-inspector-head">
        <span><RadioTower size={15} /> Live Inspector</span>
        <StatusPill tone={tone}>{item.state ?? 'normal'}</StatusPill>
      </div>
      <div className="live-inspector-body">
        <span className="module-eyebrow">{item.module}</span>
        <h3>{item.title}</h3>
        <strong>{item.kpi}</strong>
      </div>
      <div className="live-inspector-grid">
        <span><CheckCircle2 size={14} /> {item.recommendation ?? 'Monitorear continuidad operacional.'}</span>
        <span><AlertTriangle size={14} /> {item.risk ?? 'Riesgo operacional bajo.'}</span>
        <span><Activity size={14} /> {item.timestamp ?? 'Sin timestamp real'}</span>
      </div>
    </aside>
  )
}

