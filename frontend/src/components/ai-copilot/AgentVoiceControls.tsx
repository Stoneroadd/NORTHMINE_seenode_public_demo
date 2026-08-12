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

/** Controles del canal de voz: captura, interrupción y salida verbal. */
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
    return <p className="ai-agent-voice-unsupported">Captura de voz no disponible. El canal escrito permanece operativo.</p>
  }

  return (
    <div className="ai-agent-voice-controls">
      <button
        type="button"
        className={`ai-agent-mic-button${listening ? ' is-listening' : ''}${requestingPermission ? ' is-requesting' : ''}`}
        onClick={onToggleListening}
        disabled={requestingPermission}
        aria-pressed={listening}
        aria-label={listening ? 'Detener micrófono' : requestingPermission ? 'Procesando voz con JARVIS' : 'Permitir y activar micrófono'}
        title={listening ? 'Detener micrófono (Ctrl+Espacio)' : 'Permitir micrófono y hablar (Ctrl+Espacio)'}
      >
        {requestingPermission ? <Loader2 size={17} className="ai-copilot-spin" /> : permissionState === 'denied' ? <MicOff size={17} /> : <Mic size={17} />}
        <span className="ai-agent-mic-copy">
          <strong>{listening ? 'DETENER' : 'HABLAR'}</strong>
          <small>{listening ? 'Captura activa' : 'Ctrl + Espacio'}</small>
        </span>
      </button>

      {requestingPermission && <span className="ai-agent-permission-status" role="status">ENTENDIENDO ORDEN</span>}

      {speaking && (
        <button type="button" className="ai-agent-interrupt-button" onClick={onStopSpeaking} aria-label="Interrumpir respuesta verbal">
          <Square size={13} /> INTERRUMPIR
        </button>
      )}

      <button
        type="button"
        className="ai-agent-mute-button"
        onClick={onToggleVoiceOutput}
        aria-pressed={!voiceOutputEnabled}
        aria-label={voiceOutputEnabled ? 'Silenciar respuestas' : 'Activar voz de respuesta'}
        title={voiceOutputEnabled ? 'Silenciar respuestas' : 'Activar voz de respuesta'}
      >
        {voiceOutputEnabled ? <Volume2 size={17} /> : <VolumeX size={17} />}
      </button>

      {listening && !requestingPermission && (
        <span className="ai-agent-privacy-indicator" role="status">MIC ACTIVO</span>
      )}
    </div>
  )
}
