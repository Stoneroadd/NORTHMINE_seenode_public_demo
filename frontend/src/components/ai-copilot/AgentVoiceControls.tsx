import { Loader2, Mic, MicOff, Square, Volume2, VolumeX } from 'lucide-react'

interface Props {
  supported: boolean
  listening: boolean
  speaking: boolean
  requestingPermission: boolean
  permissionState: PermissionState | 'unknown' | 'unavailable'
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
  requestingPermission,
  permissionState,
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
        className={`ai-agent-mic-button${listening ? ' is-listening' : ''}${requestingPermission ? ' is-requesting' : ''}`}
        onClick={onToggleListening}
        disabled={requestingPermission}
        aria-pressed={listening}
        aria-describedby="jarvis-mic-feedback"
        aria-label={listening ? 'Detener micrófono' : requestingPermission ? 'Procesando voz con JARVIS' : 'Permitir y activar micrófono'}
        title={listening ? 'Detener micrófono (Ctrl+Espacio)' : 'Permitir micrófono y hablar (Ctrl+Espacio)'}
      >
        {requestingPermission ? <Loader2 size={16} className="ai-copilot-spin" /> : permissionState === 'denied' ? <MicOff size={16} /> : <Mic size={16} />}
      </button>

      {requestingPermission && <span className="ai-agent-permission-status" role="status">Procesando voz…</span>}

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

      {listening && !requestingPermission && (
        <span className="ai-agent-privacy-indicator" role="status">
          ● Micrófono activo
        </span>
      )}
    </div>
  )
}
