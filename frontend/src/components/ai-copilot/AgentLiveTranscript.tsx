interface Props {
  phase: 'idle' | 'listening' | 'speaking' | 'analyzing'
  interimText: string
  audioLevel: number
}

/** Instrumento de señal: nivel real del micrófono y estado del canal JARVIS. */
export function AgentLiveTranscript({ phase, interimText, audioLevel }: Props) {
  const bars = Array.from({ length: 9 }, (_, index) => {
    const wobble = Math.sin(Date.now() / 110 + index * 0.72) * 0.18
    return Math.max(0.12, Math.min(1, audioLevel + wobble))
  })

  const state = phase === 'listening'
    ? { code: 'REC', label: 'Escuchando', detail: interimText || 'Diga la orden operacional.' }
    : phase === 'analyzing'
      ? { code: 'CALC', label: 'Analizando', detail: 'Contrastando contexto, datos y permisos.' }
      : phase === 'speaking'
        ? { code: 'OUT', label: 'Respondiendo', detail: 'Síntesis verbal activa. Puede interrumpir.' }
        : { code: 'RDY', label: 'Canal listo', detail: 'Hable o escriba una orden.' }

  return (
    <section className={`ai-agent-transcript is-${phase}`} aria-live="polite" aria-label={`JARVIS ${state.label}`}>
      <div className="ai-agent-transcript-waveform" aria-hidden="true">
        {bars.map((height, index) => (
          <span key={index} style={{ transform: `scaleY(${height})` }} />
        ))}
      </div>
      <div className="ai-agent-transcript-state">
        <span className="ai-agent-transcript-code">{state.code}</span>
        <div>
          <strong className="ai-agent-transcript-label">{state.label}</strong>
          <p className="ai-agent-transcript-text">{state.detail}</p>
        </div>
      </div>
      <span className="ai-agent-transcript-channel" aria-hidden="true">CH / 01</span>
    </section>
  )
}
