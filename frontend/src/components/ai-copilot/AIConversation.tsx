import { useEffect, useRef } from 'react'
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
        <span className="ai-copilot-empty-code">CANAL OPERACIONAL / 01</span>
        <div className="ai-copilot-empty-copy">
          <strong>Hola, jefe.</strong>
          <p>¿Qué necesita decidir, comprobar o abrir?</p>
        </div>
        <div className="ai-copilot-empty-verbs" aria-label="Capacidades disponibles">
          <span>ANALIZAR</span><span>NAVEGAR</span><span>REPORTAR</span><span>EXPLICAR</span>
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
