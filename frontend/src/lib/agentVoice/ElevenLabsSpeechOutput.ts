import { useAppStore } from '../../store'
import { settingsService } from '../../services/settingsService'
import type { AgentSpeechOutput, AgentSpeechSegment } from './types'

const BASE_URL = settingsService.apiBaseUrl

/** Etapa 7, seccion 21: MSE permite empezar a reproducir apenas llegan los
 * primeros bytes en vez de esperar el audio/mpeg completo. No todos los
 * navegadores soportan `audio/mpeg` como tipo de MediaSource (Safari no lo
 * hace) - se detecta en tiempo real y, si no esta soportado, se cae de
 * forma honesta al camino anterior (blob completo antes de reproducir) sin
 * romper nada (seccion 21: "documentar la estrategia utilizada"). */
function supportsStreamingMse(): boolean {
  return typeof MediaSource !== 'undefined' && MediaSource.isTypeSupported('audio/mpeg')
}

/**
 * ElevenLabsSpeechOutput (Etapa 4, secciones 16-19; Etapa 7, secciones
 * 21-22): pide el audio al backend (nunca a ElevenLabs directamente - la
 * API key nunca sale del backend), reproduce con un <audio> real, y
 * soporta barge-in real: `stop()` aborta el fetch/lectura en curso
 * (AbortController), pausa el elemento de audio y libera los recursos de
 * inmediato.
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

    if (supportsStreamingMse()) {
      await this._playStreaming(response.body, controller)
    } else {
      await this._playBuffered(response, controller)
    }
  }

  /** Camino anterior (Etapa 4): espera el audio/mpeg completo antes de
   * reproducir - unico camino disponible cuando el navegador no soporta
   * `audio/mpeg` en MediaSource. */
  private async _playBuffered(response: Response, controller: AbortController): Promise<void> {
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

  /** Reproduccion incremental real (Etapa 7, seccion 21): cada chunk que
   * llega del backend (que a su vez ya hace streaming real desde
   * ElevenLabs) se agrega al SourceBuffer apenas esta disponible - la
   * reproduccion empieza con el primer chunk, sin esperar el resto. */
  private async _playStreaming(body: ReadableStream<Uint8Array>, controller: AbortController): Promise<void> {
    const mediaSource = new MediaSource()
    const url = URL.createObjectURL(mediaSource)
    this.objectUrl = url
    const audio = new Audio(url)
    this.audio = audio
    let startedPlaying = false

    await new Promise<void>((resolve, reject) => {
      let settled = false
      const finish = (err?: Error) => {
        if (settled) return
        settled = true
        this._releaseUrl()
        if (err) reject(err)
        else resolve()
      }

      audio.onended = () => finish()
      audio.onerror = () => finish(new Error('Fallo la reproduccion de audio'))

      mediaSource.addEventListener('sourceopen', () => {
        void (async () => {
          let sourceBuffer: SourceBuffer
          try {
            sourceBuffer = mediaSource.addSourceBuffer('audio/mpeg')
          } catch (err) {
            finish(err instanceof Error ? err : new Error('No se pudo iniciar el buffer de audio'))
            return
          }

          const reader = body.getReader()
          const waitUpdateEnd = () => new Promise<void>((res) => {
            if (!sourceBuffer.updating) {
              res()
              return
            }
            sourceBuffer.addEventListener('updateend', () => res(), { once: true })
          })

          try {
            while (true) {
              if (controller.signal.aborted) {
                await reader.cancel().catch(() => undefined)
                finish()
                return
              }
              const { done, value } = await reader.read()
              if (done) break
              await waitUpdateEnd()
              if (controller.signal.aborted) {
                await reader.cancel().catch(() => undefined)
                finish()
                return
              }
              sourceBuffer.appendBuffer(new Uint8Array(value))
              if (!startedPlaying) {
                startedPlaying = true
                audio.play().catch((err) => finish(err instanceof Error ? err : new Error('No se pudo reproducir el audio')))
              }
            }
            await waitUpdateEnd()
            if (mediaSource.readyState === 'open') mediaSource.endOfStream()
          } catch (err) {
            finish(err instanceof Error ? err : new Error('Fallo el streaming de audio'))
          }
        })()
      }, { once: true })
    })
  }
}
