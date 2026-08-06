import { useAppStore } from '../../store'
import { settingsService } from '../../services/settingsService'
import type { AgentSpeechOutput, AgentSpeechSegment } from './types'

const BASE_URL = settingsService.apiBaseUrl

/**
 * ElevenLabsSpeechOutput (Etapa 4, seccion 16-17-18-19 del brief): pide el
 * audio al backend (nunca a ElevenLabs directamente - la API key nunca
 * sale del backend), reproduce con un <audio> real, y soporta barge-in
 * real: `stop()` aborta el fetch en curso (AbortController), pausa el
 * elemento de audio y libera el object URL de inmediato.
 */
export class ElevenLabsSpeechOutput implements AgentSpeechOutput {
  readonly providerName = 'elevenlabs' as const
  private audio: HTMLAudioElement | null = null
  private objectUrl: string | null = null
  private abortController: AbortController | null = null
  private muted = false

  isSpeaking(): boolean {
    return this.audio != null && !this.audio.paused && !this.audio.ended
  }

  clearQueue(): void {
    // La cola vive en SpeechOutputRouter - este metodo existe para cumplir
    // el contrato AgentSpeechOutput, aca no hay nada propio que vaciar.
  }

  setMuted(muted: boolean): void {
    this.muted = muted
    if (muted) this.stop()
  }

  stop(): void {
    this.abortController?.abort()
    this.abortController = null
    if (this.audio) {
      this.audio.onended = null
      this.audio.onerror = null
      this.audio.pause()
      this.audio.src = ''
    }
    this.audio = null
    this._releaseUrl()
  }

  private _releaseUrl(): void {
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl)
      this.objectUrl = null
    }
  }

  async speak(segment: AgentSpeechSegment): Promise<void> {
    if (this.muted) return
    this.stop()

    const controller = new AbortController()
    this.abortController = controller
    const token = useAppStore.getState().usuario?.token ?? null

    const response = await fetch(`${BASE_URL}/api/ai-agent/speech`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        segment_id: segment.segmentId, text: segment.text, priority: segment.priority,
        sequence: segment.sequence, interruptible: segment.interruptible,
      }),
    })

    if (!response.ok || !response.body) {
      throw new Error(`ElevenLabs no disponible (HTTP ${response.status})`)
    }

    const blob = await response.blob()
    if (controller.signal.aborted) return
    const url = URL.createObjectURL(blob)
    this.objectUrl = url
    const audio = new Audio(url)
    this.audio = audio

    await new Promise<void>((resolve, reject) => {
      audio.onended = () => {
        this._releaseUrl()
        resolve()
      }
      audio.onerror = () => {
        this._releaseUrl()
        reject(new Error('Fallo la reproduccion de audio'))
      }
      audio.play().catch(reject)
    })
  }
}
