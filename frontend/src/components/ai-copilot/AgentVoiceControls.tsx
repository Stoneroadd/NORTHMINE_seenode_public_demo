import { Mic, MicOff, Square, Volume2, VolumeX } from 'lucide-react'

interface Props {
  supported: boolean
  listening: boolean
  speaking: boolean
  voiceOutputEnabled: boolean
  onToggleListening: () => void
  onStopSpeaking: () => void
  onToggleVoiceOutput: () => void
}

/** Controles de voz: microfono, interrumpir mientras habla, silenciar salida. */
export function AgentVoiceControls({
  supported,
  listening,
  speaking,
  voiceOutputEnabled,
  onToggleListening,
  onStopSpeaking,
  onToggleVoiceOutput,
}: Props) {
  if (!supported) {
    return <p className="ai-agent-voice-unsupported">Este navegador no soporta voz — use texto.</p>
  }

  return (
    <div className="ai-agent-voice-controls">
      <button
        type="button"
        className={`ai-agent-mic-button${listening ? ' is-listening' : ''}`}
        onClick={onToggleListening}
        aria-pressed={listening}
        aria-label={listening ? 'Detener microfono' : 'Activar microfono'}
        title={listening ? 'Detener microfono (Ctrl+Espacio)' : 'Hablar (Ctrl+Espacio)'}
      >
        {listening ? <Mic size={16} /> : <MicOff size={16} />}
      </button>

      {speaking && (
        <button type="button" className="ai-agent-interrupt-button" onClick={onStopSpeaking} aria-label="Interrumpir">
          <Square size={13} /> Interrumpir
        </button>
      )}

      <button
        type="button"
        className="ai-agent-mute-button"
        onClick={onToggleVoiceOutput}
        aria-pressed={!voiceOutputEnabled}
        title={voiceOutputEnabled ? 'Silenciar respuestas' : 'Activar voz de respuesta'}
      >
        {voiceOutputEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
      </button>

      {listening && (
        <span className="ai-agent-privacy-indicator" role="status">
          ● Micrófono activo
        </span>
      )}
    </div>
  )
}
