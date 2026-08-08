import type { VadConfig, VadEvent, VadState } from './contracts'
import { VAD_WORKLET_SOURCE } from './vadWorkletSource'

export const DEFAULT_VAD_CONFIG: VadConfig = {
  speechStartThreshold: 0.02,
  speechEndSilenceMs: 700,
  minimumSpeechMs: 200,
}

/**
 * Maquina de estados de VAD (Etapa 7, seccion 8), separada de la conexion
 * real a AudioWorklet para poder testearla sin AudioContext (jsdom/Node no
 * implementan AudioWorklet). `feed()` es pura: mismo nivel + mismo reloj ->
 * misma transicion, sin nada global.
 *
 * `speech_started` se emite apenas el nivel cruza el umbral (barge-in
 * necesita reaccionar YA, seccion 15) pero NO confirma que sea habla real -
 * eso lo hace `speech_active`, solo alcanzable tras `minimumSpeechMs`
 * sostenidos por encima del umbral. Un pico breve que nunca llega a
 * `minimumSpeechMs` vuelve a `silence` sin pasar por `speech_active` ni
 * `speech_ended` - ConversationTurnManager lo trata como ruido, no como fin
 * de turno (evita "cortar al usuario por pausas naturales", seccion 14).
 */
export class VadStateMachine {
  private state: VadState = 'silence'
  private aboveSince: number | null = null
  private belowSince: number | null = null
  private confirmedSpeech = false

  constructor(private config: VadConfig = DEFAULT_VAD_CONFIG) {}

  reset(): void {
    this.state = 'silence'
    this.aboveSince = null
    this.belowSince = null
    this.confirmedSpeech = false
  }

  getState(): VadState {
    return this.state
  }

  feed(level: number, now: number): VadEvent | null {
    const above = level >= this.config.speechStartThreshold

    if (above) {
      this.belowSince = null
      if (this.aboveSince == null) this.aboveSince = now

      if (this.state === 'silence') {
        this.state = 'speech_started'
        return { state: 'speech_started', level, timestamp: now }
      }
      if (this.state === 'speech_started' && !this.confirmedSpeech && now - this.aboveSince >= this.config.minimumSpeechMs) {
        this.confirmedSpeech = true
        this.state = 'speech_active'
        return { state: 'speech_active', level, timestamp: now }
      }
      return null
    }

    // Por debajo del umbral.
    this.aboveSince = null
    if (this.belowSince == null) this.belowSince = now

    if (this.state === 'speech_started' && !this.confirmedSpeech) {
      // Nunca llego a confirmarse como habla real - ruido breve, vuelve a
      // silencio sin disparar speech_active ni speech_ended.
      this.state = 'silence'
      this.confirmedSpeech = false
      return null
    }

    if (this.state === 'speech_active' && now - this.belowSince >= this.config.speechEndSilenceMs) {
      this.state = 'speech_ended'
      this.confirmedSpeech = false
      const event: VadEvent = { state: 'speech_ended', level, timestamp: now }
      // Listo para detectar el proximo turno de inmediato.
      this.state = 'silence'
      return event
    }

    return null
  }
}

/**
 * Conexion real a AudioWorklet (Etapa 7, seccion 7): procesa energia fuera
 * del main thread, solo recibe un numero por frame (~20ms) via
 * MessagePort - nunca las muestras de audio crudas cruzan al hilo
 * principal.
 */
export class VoiceActivityDetector {
  private machine: VadStateMachine
  private workletNode: AudioWorkletNode | null = null
  private moduleLoadedFor: AudioContext | null = null
  private handlers = new Set<(event: VadEvent) => void>()
  private blobUrl: string | null = null

  constructor(config: VadConfig = DEFAULT_VAD_CONFIG) {
    this.machine = new VadStateMachine(config)
  }

  onEvent(handler: (event: VadEvent) => void): () => void {
    this.handlers.add(handler)
    return () => this.handlers.delete(handler)
  }

  getState(): VadState {
    return this.machine.getState()
  }

  async attach(context: AudioContext, stream: MediaStream): Promise<void> {
    if (this.moduleLoadedFor !== context) {
      this.blobUrl = URL.createObjectURL(new Blob([VAD_WORKLET_SOURCE], { type: 'application/javascript' }))
      await context.audioWorklet.addModule(this.blobUrl)
      this.moduleLoadedFor = context
    }
    this.machine.reset()
    const source = context.createMediaStreamSource(stream)
    const node = new AudioWorkletNode(context, 'vad-energy-processor')
    node.port.onmessage = (ev: MessageEvent<{ level: number }>) => {
      const event = this.machine.feed(ev.data.level, performance.now())
      if (event) this.handlers.forEach((h) => h(event))
    }
    source.connect(node)
    this.workletNode = node
  }

  detach(): void {
    this.workletNode?.port.close()
    this.workletNode?.disconnect()
    this.workletNode = null
    this.machine.reset()
    if (this.blobUrl) {
      URL.revokeObjectURL(this.blobUrl)
      this.blobUrl = null
    }
  }
}
