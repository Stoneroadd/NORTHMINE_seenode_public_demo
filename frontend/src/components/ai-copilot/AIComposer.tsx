import { useState, type KeyboardEvent } from 'react'
import { Send } from 'lucide-react'

const QUICK_ACTIONS = [
  'Analiza el desempeno del turno actual',
  'Genera un reporte PDF del turno',
  'Abre el modulo de reportes',
  'Muestra un grafico del turno',
  'Explica la calidad de los datos',
]

interface Props {
  disabled: boolean
  onSend: (message: string) => void
}

export function AIComposer({ disabled, onSend }: Props) {
  const [value, setValue] = useState('')

  const send = () => {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setValue('')
  }

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      send()
    }
  }

  return (
    <div className="ai-copilot-composer">
      <div className="ai-copilot-quick-actions">
        {QUICK_ACTIONS.map((action) => (
          <button key={action} type="button" disabled={disabled} onClick={() => onSend(action)}>
            {action}
          </button>
        ))}
      </div>
      <div className="ai-copilot-composer-input">
        <textarea
          value={value}
          disabled={disabled}
          placeholder="Pregunte sobre el turno, la flota, alertas o pida un informe..."
          rows={2}
          maxLength={2000}
          aria-label="Mensaje para JARVIS"
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={onKeyDown}
        />
        <button type="button" aria-label="Enviar" disabled={disabled || !value.trim()} onClick={send}>
          <Send size={16} />
        </button>
      </div>
    </div>
  )
}
