interface Props {
  section?: string | null
  mine?: string | null
  shift?: string | null
  selectedDate?: string | null
  role: string
}

export function AIContextBar({ section, mine, shift, selectedDate, role }: Props) {
  return (
    <div className="ai-copilot-context-bar">
      <span>{mine || 'Faena'}</span>
      <span>{section || 'General'}</span>
      <span>{shift || 'Turno actual'}</span>
      <span>{selectedDate || 'Fecha actual'}</span>
      <span className="ai-copilot-context-role">{role}</span>
    </div>
  )
}
