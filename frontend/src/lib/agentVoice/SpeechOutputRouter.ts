import { BrowserSpeechOutput } from './BrowserSpeechOutput'
import { ElevenLabsSpeechOutput } from './ElevenLabsSpeechOutput'
import { TextOnlySpeechOutput } from './TextOnlySpeechOutput'
import type { AgentSpeechOutput, AgentSpeechSegment, SpeechPlaybackResult, SpeechPriority, VoiceOutputProviderName } from './types'

/**
 * SpeechOutputRouter (Etapa 4, secciones 19-21 del brief): cola por
 * prioridad + fallback automatico ElevenLabs -> BrowserSpeechOutput ->
 * TextOnlySpeechOutput + barge-in real. Es lo unico que AgentPresence
 * conoce del lado de salida de voz - nunca habla directo con un provider.
 */

const PRIORITY_RANK: Record<SpeechPriority, number> = { warning: 0, question: 1, result: 1, finding: 2, status: 3 }

export class SpeechOutputRouter {
  private readonly elevenlabs: AgentSpeechOutput
  private readonly browser: AgentSpeechOutput
  private readonly textOnly: AgentSpeechOutput
  private queue: AgentSpeechSegment[] = []
  private seenSegmentIds = new Set<string>()
  private activeProvider: AgentSpeechOutput | null = null
  private muted = false
  private forcedTextOnly = false
  private externalRealtimeActive = false
  private elevenLabsDegraded = false
  private processing = false
  private stopRequested = false
  private resultHandler: ((result: SpeechPlaybackResult) => void) | null = null
  private providerHandler: ((provider: VoiceOutputProviderName) => void) | null = null

  /** Providers inyectables (por defecto los reales) - permite testear la
   * logica de cola/prioridad/fallback con dobles de prueba, sin tocar
   * Audio/fetch/speechSynthesis reales. */
  constructor(
    elevenlabs: AgentSpeechOutput = new ElevenLabsSpeechOutput(),
    browser: AgentSpeechOutput = new BrowserSpeechOutput(),
    textOnly: AgentSpeechOutput = new TextOnlySpeechOutput(),
  ) {
    this.elevenlabs = elevenlabs
    this.browser = browser
    this.textOnly = textOnly
  }

  onPlaybackResult(handler: (result: SpeechPlaybackResult) => void): void {
    this.resultHandler = handler
  }

  onProviderChanged(handler: (provider: VoiceOutputProviderName) => void): void {
    this.providerHandler = handler
  }

  isSpeaking(): boolean {
    return this.activeProvider?.isSpeaking() ?? false
  }

  currentProvider(): VoiceOutputProviderName | null {
    return (this.activeProvider?.providerName as VoiceOutputProviderName | undefined) ?? null
  }

  /** Solo para tests: copia superficial de la cola pendiente, para verificar
   * orden de prioridad sin depender de temporizacion real. */
  peekQueue(): AgentSpeechSegment[] {
    return [...this.queue]
  }

  setMuted(muted: boolean): void {
    this.muted = muted
    if (muted) this.stop()
  }

  /** Automated demo/CI visual mode: keep captions and playback ACKs while
   * avoiding physical speakers and external TTS providers. This is never
   * reported as physical voice acceptance. */
  setForcedTextOnly(enabled: boolean): void {
    this.forcedTextOnly = enabled
    if (enabled) {
      this.elevenlabs.stop()
      this.browser.stop()
    }
  }

  /** OpenAI Realtime renders the same Runtime speech over WebRTC. While it
   * is active, acknowledge Runtime speech segments without replaying them
   * through ElevenLabs/browser speech (which would create duplicate audio). */
  setExternalRealtimeActive(enabled: boolean): void {
    this.externalRealtimeActive = enabled
    if (enabled) {
      this.stop()
      this.providerHandler?.('openai_realtime')
    }
  }

  clearQueue(): void {
    this.queue = []
  }

  /** Barge-in (seccion 20): detiene lo que se este reproduciendo AHORA
   * mismo y descarta cualquier segmento obsoleto en cola. */
  stop(): void {
    this.stopRequested = true
    this.elevenlabs.stop()
    this.browser.stop()
    this.clearQueue()
  }

  enqueue(segment: AgentSpeechSegment): void {
    if (this.muted) return
    if (this.seenSegmentIds.has(segment.segmentId)) return
    this.seenSegmentIds.add(segment.segmentId)
    if (this.externalRealtimeActive) {
      this.providerHandler?.('openai_realtime')
      this.resultHandler?.({
        segmentId: segment.segmentId,
        provider: 'openai_realtime',
        result: 'completed',
        latencyMs: 0,
        textLength: segment.text.length,
        priority: segment.priority,
      })
      return
    }

    if (segment.priority === 'warning' && this.isSpeaking()) {
      // Una advertencia interrumpe lo que se este diciendo (seccion 19).
      this.elevenlabs.stop()
      this.browser.stop()
    }
    if (segment.priority === 'result') {
      // Un resultado reemplaza estados pendientes en cola (seccion 19).
      this.queue = this.queue.filter((s) => s.priority !== 'status')
    }

    this.queue.push(segment)
    this.queue.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || a.sequence - b.sequence)
    void this._drain()
  }

  private async _drain(): Promise<void> {
    if (this.processing) return
    this.processing = true
    while (this.queue.length > 0 && !this.muted) {
      const segment = this.queue.shift()!
      await this._playWithFallback(segment)
    }
    this.processing = false
  }

  private async _playWithFallback(segment: AgentSpeechSegment): Promise<void> {
    const started = performance.now()
    this.stopRequested = false

    let provider: AgentSpeechOutput = this.forcedTextOnly
      ? this.textOnly
      : this.elevenLabsDegraded ? this.browser : this.elevenlabs
    this.activeProvider = provider
    this.providerHandler?.(provider.providerName)

    try {
      await provider.speak(segment)
      this._report(segment, provider, 'completed', started)
      return
    } catch {
      if (this.stopRequested) {
        this._report(segment, provider, 'interrupted', started)
        return
      }
    }

    if (!this.forcedTextOnly && provider === this.elevenlabs) {
      this.elevenLabsDegraded = true
      provider = this.browser
      this.activeProvider = provider
      this.providerHandler?.(provider.providerName)
      try {
        await provider.speak(segment)
        this._report(segment, provider, 'completed', started)
        return
      } catch {
        if (this.stopRequested) {
          this._report(segment, provider, 'interrupted', started)
          return
        }
      }
    }

    provider = this.textOnly
    this.activeProvider = provider
    this.providerHandler?.(provider.providerName)
    await provider.speak(segment)
    this._report(segment, provider, 'completed', started)
  }

  private _report(segment: AgentSpeechSegment, provider: AgentSpeechOutput, result: 'completed' | 'failed' | 'interrupted', started: number): void {
    this.activeProvider = null
    this.resultHandler?.({
      segmentId: segment.segmentId, provider: provider.providerName, result,
      latencyMs: Math.round(performance.now() - started), textLength: segment.text.length, priority: segment.priority,
    })
  }
}

export const speechOutputRouter = new SpeechOutputRouter()
