interface Props {
  section?: string | null
  mine?: string | null
  shift?: string | null
  selectedDate?: string | null
  role: string
}

export function AIContextBar({ section, mine, shift, selectedDate, role }: Props) {
  const items = [
    ['Faena', mine || 'Sin contexto'],
    ['Vista', section || 'General'],
    ['Turno', shift || 'Actual'],
    ['Corte', selectedDate || 'Hoy'],
    ['Autoridad', role],
  ]

  return (
    <dl className="ai-copilot-context-bar" aria-label="Contexto operacional activo">
      {items.map(([label, value]) => (
        <div key={label} className={label === 'Autoridad' ? 'ai-copilot-context-role' : undefined}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  )
}
