import { Mic, X } from 'lucide-react'

interface Props {
  requesting: boolean
  onActivate: () => void
  onDismiss: () => void
}

/**
 * Modal de onboarding del microfono: se muestra ANTES del dialogo nativo
 * del navegador, en respuesta a un click fisico real sobre el boton de
 * microfono (nunca automatico). El click en "Activar microfono" de este
 * modal es el gesto que realmente dispara getUserMedia (ver toggleMic en
 * AgentWorkspace.tsx) - este componente es solo la explicacion previa,
 * nunca llama a getUserMedia por su cuenta.
 */
export function MicOnboardingModal({ requesting, onActivate, onDismiss }: Props) {
  return (
    <div className="ai-mic-onboarding-overlay" role="dialog" aria-modal="true" aria-label="Activar conversación por voz">
      <div className="ai-mic-onboarding-backdrop" onClick={requesting ? undefined : onDismiss} />
      <div className="ai-mic-onboarding-card">
        <button type="button" className="ai-mic-onboarding-close" onClick={onDismiss} aria-label="Cerrar" disabled={requesting}>
          <X size={14} />
        </button>
        <div className="ai-mic-onboarding-icon"><Mic size={20} /></div>
        <h3>Activar NORTHMINE AI</h3>
        <p>NORTHMINE necesita acceso al micrófono para conversación por voz.</p>
        <div className="ai-mic-onboarding-actions">
          <button type="button" className="ai-mic-onboarding-later" onClick={onDismiss} disabled={requesting}>
            Ahora no
          </button>
          <button type="button" className="ai-mic-onboarding-activate" onClick={onActivate} disabled={requesting}>
            {requesting ? 'Solicitando permiso…' : 'Activar micrófono'}
          </button>
        </div>
      </div>
    </div>
  )
}
