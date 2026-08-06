interface Props {
  listening: boolean
  interimText: string
  audioLevel: number
}

/** Onda de audio real (nivel RMS del microfono) + transcripcion parcial en vivo. */
export function AgentLiveTranscript({ listening, interimText, audioLevel }: Props) {
  if (!listening) return null

  const bars = Array.from({ length: 5 }, (_, index) => {
    const wobble = Math.sin(Date.now() / 120 + index) * 0.15
    const height = Math.max(0.12, Math.min(1, audioLevel + wobble))
    return height
  })

  return (
    <div className="ai-agent-transcript">
      <div className="ai-agent-transcript-waveform" aria-hidden="true">
        {bars.map((height, index) => (
          <span key={index} style={{ transform: `scaleY(${height})` }} />
        ))}
      </div>
      <span className="ai-agent-transcript-label">Escuchando…</span>
      <p className="ai-agent-transcript-text">{interimText || 'Diga lo que necesita revisar.'}</p>
    </div>
  )
}
