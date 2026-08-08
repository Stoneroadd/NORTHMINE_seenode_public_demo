import type { AgentSpeechOutput, AgentSpeechSegment } from './types'

/**
 * BrowserSpeechOutput (Etapa 4, seccion 15 y 21): respaldo cuando
 * ElevenLabs no esta disponible (sin API key, timeout, error, sin saldo).
 * Usa window.speechSynthesis - la misma tecnologia que useVoiceSession.ts
 * usaba como UNICA voz en Etapa 2; aca queda explicitamente como
 * secundaria, nunca la voz principal.
 */
export class BrowserSpeechOutput implements AgentSpeechOutput {
  readonly providerName = 'browser' as const
  private muted = false
  private speaking = false

  isSpeaking(): boolean {
    return this.speaking
  }

  clearQueue(): void {
    window.speechSynthesis?.cancel()
  }

  setMuted(muted: boolean): void {
    this.muted = muted
    if (muted) this.stop()
  }

  stop(): void {
    window.speechSynthesis?.cancel()
    this.speaking = false
  }

  private _pickVoice(): SpeechSynthesisVoice | null {
    const voices = window.speechSynthesis?.getVoices() ?? []
    return voices.find((v) => v.lang?.toLowerCase().startsWith('es')) ?? voices[0] ?? null
  }

  async speak(segment: AgentSpeechSegment): Promise<void> {
    if (this.muted || !('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()

    return new Promise<void>((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(segment.text)
      utterance.lang = document.documentElement.lang || 'es-CL'
      utterance.rate = 1.02
      const voice = this._pickVoice()
      if (voice) utterance.voice = voice
      utterance.onstart = () => {
        this.speaking = true
      }
      utterance.onend = () => {
        this.speaking = false
        resolve()
      }
      utterance.onerror = () => {
        this.speaking = false
        reject(new Error('Fallo la sintesis de voz del navegador'))
      }
      window.speechSynthesis.speak(utterance)
    })
  }
}
