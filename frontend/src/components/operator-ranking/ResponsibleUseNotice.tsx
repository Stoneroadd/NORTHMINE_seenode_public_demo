import { ShieldAlert } from 'lucide-react'

export function ResponsibleUseNotice({ note, compact = false }: { note: string; compact?: boolean }) {
  return (
    <div className={`operator-responsible-notice ${compact ? 'compact' : ''}`}>
      <ShieldAlert size={18} />
      <span>{note}</span>
    </div>
  )
}
