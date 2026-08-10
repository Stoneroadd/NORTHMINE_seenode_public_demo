import { useEffect, useRef } from 'react'
import { Bot } from 'lucide-react'
import { AIMessage } from './AIMessage'
import type { ChatTurn } from './types'

export function AIConversation({ turns, canApprove }: { turns: ChatTurn[]; canApprove: boolean }) {
  const bottomRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [turns.length, turns[turns.length - 1]])

  if (turns.length === 0) {
    return (
      <div className="ai-copilot-empty">
        <Bot size={28} />
        <div>
          <strong>Hola, jefe. ¿En qué necesitas que te ayude?</strong>
          <p>Estoy listo para analizar el turno, revisar alertas, moverme por NORTHMINE o generar un reporte.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="ai-copilot-conversation">
      {turns.map((turn) => (
        <AIMessage key={turn.id} turn={turn} canApprove={canApprove} />
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
