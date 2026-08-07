import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  AudioInputProvider, ConversationTransport, ConversationTurn, MicPermissionState,
  RealtimeTranscriptionProvider, VadEvent,
} from './contracts'
import type { ConversationTurnManager as ConversationTurnManagerClass, SpeechOutputControl, VadSource } from './ConversationTurnManager'

/**
 * ConversationTurnManager (Etapa 7, seccion 9) es el orquestador central de
 * la capa realtime - se testea con dobles de prueba para audio/VAD/
 * transcripcion/transporte/salida de voz, igual que SpeechOutputRouter.test.ts
 * lo hace con proveedores de salida (Etapa 4). El modulo tiene un singleton
 * de proceso que en su construccion por defecto instancia
 * BrowserTranscriptionProvider, que a su vez lee `window.SpeechRecognition`
 * en el constructor - eso no existe en el entorno 'node' de vitest, asi que
 * cada test stubea `window`/`navigator` ANTES de importar el modulo
 * (`vi.resetModules()` + import dinamico, mismo patron que
 * AgentSessionClient.test.ts en Etapa 6.1) para que ese singleton pueda
 * construirse sin crashear, aunque el test nunca lo use directamente.
 */

class FakeAudio implements AudioInputProvider {
  started = 0
  paused = 0
  resumed = 0
  stopped = 0
  private permission: MicPermissionState = 'granted'

  async start(): Promise<void> {
    this.started += 1
  }

  pause(): void {
    this.paused += 1
  }

  resume(): void {
    this.resumed += 1
  }

  stop(): void {
    this.stopped += 1
  }

  getLevel(): number {
    return 0
  }

  getPermissionState(): MicPermissionState {
    return this.permission
  }

  onLevel(): () => void {
    return () => undefined
  }

  onPermissionChange(): () => void {
    return () => undefined
  }

  onDeviceChange(): () => void {
    return () => undefined
  }

  getAudioGraph(): { context: AudioContext; stream: MediaStream } | null {
    return { context: {} as AudioContext, stream: {} as MediaStream }
  }
}

class FakeVad implements VadSource {
  private handlers = new Set<(event: VadEvent) => void>()
  attachCalls = 0
  detachCalls = 0

  onEvent(handler: (event: VadEvent) => void): () => void {
    this.handlers.add(handler)
    return () => this.handlers.delete(handler)
  }

  async attach(): Promise<void> {
    this.attachCalls += 1
  }

  detach(): void {
    this.detachCalls += 1
  }

  emit(event: VadEvent): void {
    this.handlers.forEach((h) => h(event))
  }
}

class FakeTranscription implements RealtimeTranscriptionProvider {
  readonly providerName = 'fake'
  startCalls = 0
  stopCalls = 0
  abortCalls = 0
  private partialHandler: ((text: string, ts: number) => void) | null = null
  private finalHandler: ((text: string, ts: number) => void) | null = null

  isSupported(): boolean {
    return true
  }

  start(): void {
    this.startCalls += 1
  }

  stop(): void {
    this.stopCalls += 1
  }

  abort(): void {
    this.abortCalls += 1
  }

  onPartial(handler: (text: string, ts: number) => void): void {
    this.partialHandler = handler
  }

  onFinal(handler: (text: string, ts: number) => void): void {
    this.finalHandler = handler
  }

  onError(): void {}

  firePartial(text: string, ts: number): void {
    this.partialHandler?.(text, ts)
  }

  fireFinal(text: string, ts: number): void {
    this.finalHandler?.(text, ts)
  }
}

class FakeTransport implements ConversationTransport {
  partials: { turnId: string; text: string }[] = []
  finals: { turnId: string; text: string; meta: { language: string; confidence: number | null; durationMs: number; provider: string } }[] = []
  interrupts: string[] = []
  cancelCalls = 0

  sendUserSpeechPartial(turnId: string, text: string): void {
    this.partials.push({ turnId, text })
  }

  sendUserSpeechFinal(turnId: string, text: string, meta: { language: string; confidence: number | null; durationMs: number; provider: string }): void {
    this.finals.push({ turnId, text, meta })
  }

  sendInterrupt(turnId: string): void {
    this.interrupts.push(turnId)
  }

  sendCancel(): void {
    this.cancelCalls += 1
  }
}

class FakeSpeech implements SpeechOutputControl {
  speaking = false
  stopCalls = 0

  isSpeaking(): boolean {
    return this.speaking
  }

  stop(): void {
    this.stopCalls += 1
    this.speaking = false
  }
}

async function buildManager() {
  vi.resetModules()
  // Objeto minimo, NO globalThis: un `window` "verdadero" pero incompleto
  // confunde la deteccion de plataforma de axios (importado
  // transitivamente via agentEquipmentCatalog -> fleetService -> api.ts),
  // que asume que si `window` existe tambien existe `window.location.href`
  // real - mismo criterio que AgentSessionClient.test.ts en Etapa 6.1.
  vi.stubGlobal('window', {
    location: { origin: 'http://localhost:8001' },
    setTimeout: (...args: Parameters<typeof setTimeout>) => setTimeout(...args),
    clearTimeout: (...args: Parameters<typeof clearTimeout>) => clearTimeout(...args),
    setInterval: (...args: Parameters<typeof setInterval>) => setInterval(...args),
    clearInterval: (...args: Parameters<typeof clearInterval>) => clearInterval(...args),
  })
  vi.stubGlobal('document', { documentElement: { lang: 'es-CL' } })
  vi.stubGlobal('navigator', { mediaDevices: {} })
  const mod = await import('./ConversationTurnManager')
  const audio = new FakeAudio()
  const vad = new FakeVad()
  const transcription = new FakeTranscription()
  const transport = new FakeTransport()
  const speech = new FakeSpeech()
  const manager: ConversationTurnManagerClass = new mod.ConversationTurnManager({ audio, vad, transcription, transport, speech })
  return { manager, audio, vad, transcription, transport, speech }
}

describe('ConversationTurnManager', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('un turno completo: partial actualiza UI, solo el final compromete intencion ante el Command Router', async () => {
    const { manager, vad, transcription, transport } = await buildManager()
    await manager.activate()

    vad.emit({ state: 'speech_started', level: 0.2, timestamp: 0 })
    vad.emit({ state: 'speech_active', level: 0.2, timestamp: 250 })
    transcription.firePartial('revisa la produ', 300)
    transcription.firePartial('revisa la producción de pala tres', 500)

    // Seccion 10/45: los parciales SOLO informan UI, nunca comprometen intencion.
    expect(transport.finals).toHaveLength(0)
    expect(transport.partials.map((p) => p.text)).toEqual(['revisa la produ', 'revisa la producción de pala tres'])

    transcription.fireFinal('revisa la producción de pala tres durante las últimas dos horas', 900)

    expect(transport.finals).toHaveLength(1)
    expect(transport.finals[0].text).toBe('revisa la producción de pala tres durante las últimas dos horas')
    expect(transport.finals[0].turnId).toBe(transport.partials[0].turnId)

    const turn = manager.getCurrentTurn()
    expect(turn?.status).toBe('completed')
  })

  it('barge-in: si el agente esta hablando, speech_started corta audio YA y abre un turno nuevo interrumpiendo el anterior', async () => {
    const { manager, vad, transcription, transport, speech } = await buildManager()
    await manager.activate()

    // Turno 1 completo, agente ahora "hablando" la respuesta.
    vad.emit({ state: 'speech_started', level: 0.2, timestamp: 0 })
    vad.emit({ state: 'speech_active', level: 0.2, timestamp: 250 })
    transcription.fireFinal('revisa produccion', 900)
    const firstTurnId = transport.finals[0].turnId

    speech.speaking = true
    vad.emit({ state: 'speech_started', level: 0.2, timestamp: 2000 })

    expect(speech.stopCalls).toBe(1)
    expect(transport.interrupts).toEqual([expect.any(String)])
    expect(transport.interrupts[0]).not.toBe(firstTurnId)
    expect(manager.isTurnStale(firstTurnId)).toBe(true)
  })

  it('isTurnStale es false para un turno que nunca fue interrumpido', async () => {
    const { manager } = await buildManager()
    expect(manager.isTurnStale('turn-nunca-existio')).toBe(false)
    expect(manager.isTurnStale(null)).toBe(false)
  })

  it('deactivate() cancela un turno abierto y libera audio/VAD/transcripcion', async () => {
    const { manager, vad, transcription, audio, vad: vadRef } = await buildManager()
    await manager.activate()
    vad.emit({ state: 'speech_started', level: 0.2, timestamp: 0 })

    manager.deactivate()

    expect(manager.getCurrentTurn()?.status).toBe('cancelled')
    expect(audio.stopped).toBe(1)
    expect(transcription.stopCalls).toBe(1)
    expect(vadRef.detachCalls).toBe(1)
    expect(manager.isActive()).toBe(false)
  })

  it('fin de turno por VAD (speech_ended) sin final del proveedor: el grace timeout usa el ultimo parcial conocido', async () => {
    const { manager, vad, transcription, transport } = await buildManager()
    await manager.activate()

    vad.emit({ state: 'speech_started', level: 0.2, timestamp: 0 })
    vad.emit({ state: 'speech_active', level: 0.2, timestamp: 250 })
    transcription.firePartial('compara con el turno anterior', 600)
    vad.emit({ state: 'speech_ended', level: 0.01, timestamp: 1200 })

    expect(transport.finals).toHaveLength(0)
    await vi.advanceTimersByTimeAsync(1300)

    expect(transport.finals).toHaveLength(1)
    expect(transport.finals[0].text).toBe('compara con el turno anterior')
    expect(manager.getCurrentTurn()?.status).toBe('completed')
  })

  it('metricas: speechStartDetectionMs y transcriptionPartialLatencyMs se registran durante el turno', async () => {
    const { manager, vad, transcription } = await buildManager()
    await manager.activate()

    vad.emit({ state: 'speech_started', level: 0.2, timestamp: 100 })
    const turnId = manager.getCurrentTurn()!.turnId
    vad.emit({ state: 'speech_active', level: 0.2, timestamp: 350 })
    transcription.firePartial('pala tres', 400)

    const metrics = manager.getMetrics(turnId)
    expect(metrics?.speechStartDetectionMs).toBe(250)
    expect(metrics?.transcriptionPartialLatencyMs).toBe(300)
    expect(metrics?.bargeInStopLatencyMs).toBeNull()
  })

  it('recordSpeechSegmentReceived completa timeToFirstAudioMs una vez que el turno tiene finalTranscriptAt', async () => {
    // recordSpeechSegmentReceived mide contra performance.now() REAL en el
    // momento en que se llama (es una latencia en vivo: "cuanto paso desde
    // que se supo el texto final hasta que llego el primer audio"), asi que
    // se controla el reloj con un spy para que la resta sea deterministica
    // en vez de depender de cuanto tarda el test en ejecutarse.
    const nowSpy = vi.spyOn(performance, 'now')
    nowSpy.mockReturnValue(1000)
    const { manager, vad, transcription } = await buildManager()
    await manager.activate()

    vad.emit({ state: 'speech_started', level: 0.2, timestamp: 1000 })
    vad.emit({ state: 'speech_active', level: 0.2, timestamp: 1250 })
    transcription.fireFinal('dame el resumen del turno', 1900)
    const turnId = manager.getCurrentTurn()!.turnId

    nowSpy.mockReturnValue(2400) // 500ms despues del final transcrito
    manager.recordSpeechSegmentReceived(turnId)

    const metrics = manager.getMetrics(turnId)
    expect(metrics?.timeToFirstAudioMs).toBe(500)
    nowSpy.mockRestore()
  })

  it('recordSpeechSegmentReceived con turnId nulo o de un turno ya cerrado no revienta', async () => {
    const { manager } = await buildManager()
    expect(() => manager.recordSpeechSegmentReceived(null)).not.toThrow()
    expect(() => manager.recordSpeechSegmentReceived('turn-que-no-existe')).not.toThrow()
  })
})
