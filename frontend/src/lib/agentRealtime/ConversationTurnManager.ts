import { agentEquipmentCatalog } from '../agentRegistry/equipmentCatalog'
import { speechOutputRouter } from '../agentVoice/SpeechOutputRouter'
import { AudioCapture } from './AudioCapture'
import { BrowserTranscriptionProvider } from './BrowserTranscriptionProvider'
import type {
  AudioInputProvider, CandidateEntity, ConversationTransport, ConversationTurn,
  MicPermissionState, RealtimeTranscriptionProvider, TurnStatus, VadEvent,
} from './contracts'
import { realtimeConfig } from './realtimeConfig'
import { runtimeConversationTransport } from './RuntimeConversationTransport'
import { VoiceActivityDetector } from './VoiceActivityDetector'

/** Subconjunto de SpeechOutputRouter que el turn manager necesita para
 * barge-in - inyectable para no depender del singleton real en tests. */
export interface SpeechOutputControl {
  isSpeaking(): boolean
  stop(): void
}

/** Subconjunto de VoiceActivityDetector que el turn manager consume -
 * VoiceActivityDetector tiene campos privados (nominal en TS), asi que un
 * doble de prueba no podria "hacerse pasar" por la clase completa; contra
 * esta interfaz si, sin renunciar a nada que ConversationTurnManager use
 * realmente (ver VadStateMachine.test.ts para la maquina de estados sola). */
export interface VadSource {
  onEvent(handler: (event: VadEvent) => void): () => void
  attach(context: AudioContext, stream: MediaStream): Promise<void>
  detach(): void
}

export interface TurnMetrics {
  turnId: string
  speechStartDetectionMs: number | null
  transcriptionPartialLatencyMs: number | null
  transcriptionFinalLatencyMs: number | null
  timeToFirstAudioMs: number | null
  bargeInStopLatencyMs: number | null
  turnTotalLatencyMs: number | null
}

const MAX_INTERRUPTED_TURNS_TRACKED = 30

let turnCounter = 0
function newTurnId(): string {
  turnCounter += 1
  return `turn-${Date.now().toString(36)}-${turnCounter}`
}

/**
 * ConversationTurnManager (Etapa 7, seccion 9 del brief): unico orquestador
 * de la capa realtime. Coordina AudioCapture + VoiceActivityDetector +
 * RealtimeTranscriptionProvider + ConversationTransport, y es el UNICO
 * lugar que decide cuando empieza/termina un turno, cuando hay barge-in, y
 * que segmentos de voz del servidor siguen siendo validos (por turn_id).
 *
 * No reemplaza al Agent Runtime: solo decide CUANDO enviar
 * user.speech.partial/final/agent.interrupt - el Command Router y el
 * Planner/Executor/Verifier del backend siguen siendo la unica autoridad
 * de que hacer con ese texto (seccion 56: la autoridad humana/de decision
 * no cambia).
 */
export class ConversationTurnManager {
  private readonly audio: AudioInputProvider
  private readonly vad: VadSource
  private readonly transcription: RealtimeTranscriptionProvider
  private readonly transport: ConversationTransport
  private readonly speech: SpeechOutputControl

  private active = false
  private currentTurn: ConversationTurn | null = null
  private interruptedTurnIds: string[] = []
  private metricsByTurn = new Map<string, TurnMetrics>()
  private endOfTurnGraceTimer: number | null = null
  private maxTurnTimer: number | null = null

  private turnHandlers = new Set<(turn: ConversationTurn) => void>()
  private candidateHandlers = new Set<(candidates: CandidateEntity[]) => void>()
  private levelUnsubscribe: (() => void) | null = null
  private permissionUnsubscribe: (() => void) | null = null
  private vadUnsubscribe: (() => void) | null = null

  constructor(deps: {
    audio?: AudioInputProvider
    vad?: VadSource
    transcription?: RealtimeTranscriptionProvider
    transport?: ConversationTransport
    speech?: SpeechOutputControl
  } = {}) {
    this.audio = deps.audio ?? new AudioCapture()
    this.vad = deps.vad ?? new VoiceActivityDetector(realtimeConfig.vad)
    this.transcription = deps.transcription ?? new BrowserTranscriptionProvider()
    this.transport = deps.transport ?? runtimeConversationTransport
    this.speech = deps.speech ?? { isSpeaking: () => false, stop: () => undefined }

    this.transcription.onPartial((text, ts) => this._onPartial(text, ts))
    this.transcription.onFinal((text, ts) => this._onFinal(text, ts))
  }

  isSupported(): boolean {
    return this.transcription.isSupported()
  }

  isActive(): boolean {
    return this.active
  }

  getMicPermission(): MicPermissionState {
    return this.audio.getPermissionState()
  }

  getInputLevel(): number {
    return this.audio.getLevel()
  }

  /** Pasa a traves de AudioCapture.onLevel (seccion 26: waveform con nivel
   * real de entrada, nunca una animacion falsa). */
  onInputLevel(handler: (level: number) => void): () => void {
    return this.audio.onLevel(handler)
  }

  getCurrentTurn(): ConversationTurn | null {
    return this.currentTurn
  }

  getMetrics(turnId: string): TurnMetrics | null {
    return this.metricsByTurn.get(turnId) ?? null
  }

  onTurn(handler: (turn: ConversationTurn) => void): () => void {
    this.turnHandlers.add(handler)
    return () => this.turnHandlers.delete(handler)
  }

  onCandidateEntities(handler: (candidates: CandidateEntity[]) => void): () => void {
    this.candidateHandlers.add(handler)
    return () => this.candidateHandlers.delete(handler)
  }

  /** Seccion 33: el servidor estampa turnId en agent.speech.segment - un
   * segmento cuyo turno ya fue interrumpido no debe reproducirse aunque
   * llegue tarde (carrera entre el cierre del turno viejo y el nuevo). */
  isTurnStale(turnId: string | null | undefined): boolean {
    if (!turnId) return false
    return this.interruptedTurnIds.includes(turnId)
  }

  /** runtimeController llama esto cuando un agent.speech.segment llega,
   * para completar time_to_first_audio del turno que lo origino (seccion 22). */
  recordSpeechSegmentReceived(turnId: string | null | undefined): void {
    if (!turnId) return
    const metrics = this.metricsByTurn.get(turnId)
    const turn = this.currentTurn?.turnId === turnId ? this.currentTurn : null
    if (metrics && metrics.timeToFirstAudioMs == null && turn?.finalTranscriptAt != null) {
      metrics.timeToFirstAudioMs = Math.round(performance.now() - turn.finalTranscriptAt)
    }
    if (turn && turn.firstAudioAt == null) {
      turn.firstAudioAt = performance.now()
      this._notifyTurn(turn)
    }
  }

  /** Debe llamarse desde un gesto explicito del usuario (seccion 5: "el
   * microfono solo puede activarse mediante interaccion explicita"). */
  async activate(): Promise<void> {
    if (this.active) return
    await this.audio.start()
    const graph = this.audio.getAudioGraph()
    if (graph) await this.vad.attach(graph.context, graph.stream)
    this.transcription.start()
    this.active = true

    this.vadUnsubscribe = this.vad.onEvent((event) => this._onVadEvent(event))
  }

  deactivate(): void {
    if (!this.active) return
    this.active = false
    this.transcription.stop()
    this.vad.detach()
    this.vadUnsubscribe?.()
    this.vadUnsubscribe = null
    this.levelUnsubscribe?.()
    this.permissionUnsubscribe?.()
    this.audio.stop()
    this._clearTimers()
    if (this.currentTurn && this.currentTurn.status !== 'completed') {
      this._finishTurn('cancelled')
    }
  }

  private _onVadEvent(event: VadEvent): void {
    if (event.state === 'speech_started') {
      this._handleSpeechStarted(event.timestamp)
    } else if (event.state === 'speech_active') {
      this._handleSpeechActive(event.timestamp)
    } else if (event.state === 'speech_ended') {
      this._handleSpeechEnded(event.timestamp)
    }
  }

  private _handleSpeechStarted(timestamp: number): void {
    const bargingIn = this.speech.isSpeaking()
    if (bargingIn && realtimeConfig.bargeInEnabled) {
      // Seccion 15: cortar reproduccion local ANTES que nada mas - la
      // latencia percibida es lo unico que importa aca.
      this.speech.stop()
      const bargeInStopLatencyMs = Math.round(performance.now() - timestamp)
      if (this.currentTurn) {
        this._markInterrupted(this.currentTurn.turnId)
        const metrics = this.metricsByTurn.get(this.currentTurn.turnId)
        if (metrics) metrics.bargeInStopLatencyMs = bargeInStopLatencyMs
      }
    }

    if (!this.currentTurn || this.currentTurn.status === 'completed' || this.currentTurn.status === 'interrupted' || this.currentTurn.status === 'cancelled') {
      this._openTurn(timestamp)
      if (bargingIn) this.transport.sendInterrupt(this.currentTurn!.turnId)
    }
  }

  private _handleSpeechActive(timestamp: number): void {
    const turn = this.currentTurn
    if (!turn) return
    turn.speechStartedAt = turn.speechStartedAt ?? timestamp
    turn.status = 'transcribing'
    const metrics = this.metricsByTurn.get(turn.turnId)
    if (metrics && metrics.speechStartDetectionMs == null) {
      metrics.speechStartDetectionMs = Math.round(timestamp - turn.startedAt)
    }
    this._notifyTurn(turn)
  }

  private _handleSpeechEnded(timestamp: number): void {
    const turn = this.currentTurn
    if (!turn) return
    turn.speechEndedAt = timestamp
    turn.status = 'waiting'
    this._notifyTurn(turn)

    // Seccion 14: combinar VAD + transcript final, sin depender solo de un
    // timeout. Si el proveedor ya entrego el final (isFinal llega casi
    // junto con el silencio), _onFinal ya cerro el turno y este timer no
    // hace nada util - se limpia solo. Si el proveedor tarda o nunca
    // dispara isFinal para esta frase, se usa el ultimo parcial conocido
    // como texto final (mejor una respuesta con texto ligeramente
    // impreciso que un turno que nunca termina).
    this._clearEndOfTurnGrace()
    this.endOfTurnGraceTimer = window.setTimeout(() => {
      if (this.currentTurn?.turnId === turn.turnId && turn.status === 'waiting' && turn.partialText) {
        this._commitFinal(turn.partialText, performance.now())
      }
    }, 1200)
  }

  private _onPartial(text: string, timestamp: number): void {
    const turn = this.currentTurn
    if (!turn) return
    turn.partialText = text
    const metrics = this.metricsByTurn.get(turn.turnId)
    if (metrics && metrics.transcriptionPartialLatencyMs == null) {
      metrics.transcriptionPartialLatencyMs = Math.round(timestamp - turn.startedAt)
    }
    this.transport.sendUserSpeechPartial(turn.turnId, text)
    this._notifyTurn(turn)
    this._resolveCandidates(text)
  }

  private _onFinal(text: string, timestamp: number): void {
    if (!text) return
    this._commitFinal(text, timestamp)
  }

  private _commitFinal(text: string, timestamp: number): void {
    const turn = this.currentTurn
    if (!turn || turn.status === 'completed') return
    this._clearEndOfTurnGrace()
    turn.finalText = text
    turn.finalTranscriptAt = timestamp
    turn.status = 'waiting'
    const metrics = this.metricsByTurn.get(turn.turnId)
    if (metrics) {
      const from = turn.speechEndedAt ?? turn.startedAt
      metrics.transcriptionFinalLatencyMs = Math.round(timestamp - from)
    }
    // Seccion 10/45: SOLO el final compromete intencion ante el Command
    // Router - los parciales ya enviados fueron unicamente para UI/
    // pre-resolucion de entidades.
    this.transport.sendUserSpeechFinal(turn.turnId, text, {
      language: document.documentElement.lang || 'es-CL', confidence: null,
      durationMs: turn.speechStartedAt != null ? Math.round(timestamp - turn.speechStartedAt) : 0,
      provider: this.transcription.providerName,
    })
    this._notifyTurn(turn)
    this._finishTurn('completed')
  }

  private _openTurn(timestamp: number): void {
    const turnId = newTurnId()
    this.currentTurn = {
      turnId, sessionId: null, startedAt: timestamp, speechStartedAt: null, speechEndedAt: null,
      transcriptionStartedAt: null, finalTranscriptAt: null, agentStartedAt: null, firstAudioAt: null,
      completedAt: null, status: 'listening', partialText: '', finalText: null,
    }
    this.metricsByTurn.set(turnId, {
      turnId, speechStartDetectionMs: null, transcriptionPartialLatencyMs: null,
      transcriptionFinalLatencyMs: null, timeToFirstAudioMs: null, bargeInStopLatencyMs: null, turnTotalLatencyMs: null,
    })
    this._clearMaxTurnTimer()
    this.maxTurnTimer = window.setTimeout(() => {
      if (this.currentTurn?.turnId === turnId) this._finishTurn('failed')
    }, realtimeConfig.maxTurnSeconds * 1000)
    this._notifyTurn(this.currentTurn)
  }

  private _finishTurn(status: TurnStatus): void {
    const turn = this.currentTurn
    if (!turn) return
    turn.status = status
    turn.completedAt = performance.now()
    const metrics = this.metricsByTurn.get(turn.turnId)
    if (metrics) metrics.turnTotalLatencyMs = Math.round(turn.completedAt - turn.startedAt)
    this._clearTimers()
    this._notifyTurn(turn)
  }

  private _markInterrupted(turnId: string): void {
    if (this.currentTurn?.turnId === turnId) this._finishTurn('interrupted')
    this.interruptedTurnIds.push(turnId)
    if (this.interruptedTurnIds.length > MAX_INTERRUPTED_TURNS_TRACKED) this.interruptedTurnIds.shift()
  }

  private _resolveCandidates(partialText: string): void {
    // Seccion 13: heuristica honesta - ultimas 1 a 3 palabras del parcial
    // como ventana deslizante contra el catalogo real de equipos, no NLU
    // completo. Suficiente para "pala tres"/"caex quince" al final de la
    // frase, documentado como limitacion (no reconoce entidades a mitad de
    // oracion todavia).
    if (agentEquipmentCatalog.getStatus() !== 'ready') return
    const words = partialText.trim().split(/\s+/).filter(Boolean)
    if (words.length === 0) return

    for (const windowSize of [3, 2, 1]) {
      if (words.length < windowSize) continue
      const phrase = words.slice(-windowSize).join(' ')
      const result = agentEquipmentCatalog.resolve(phrase)
      if (result.status === 'resolved') {
        const candidate: CandidateEntity = { query: phrase, entityId: result.candidates[0].entityId, label: result.candidates[0].label }
        this.candidateHandlers.forEach((h) => h([candidate]))
        return
      }
    }
  }

  private _notifyTurn(turn: ConversationTurn): void {
    this.turnHandlers.forEach((h) => h({ ...turn }))
  }

  private _clearEndOfTurnGrace(): void {
    if (this.endOfTurnGraceTimer != null) window.clearTimeout(this.endOfTurnGraceTimer)
    this.endOfTurnGraceTimer = null
  }

  private _clearMaxTurnTimer(): void {
    if (this.maxTurnTimer != null) window.clearTimeout(this.maxTurnTimer)
    this.maxTurnTimer = null
  }

  private _clearTimers(): void {
    this._clearEndOfTurnGrace()
    this._clearMaxTurnTimer()
  }
}

/** Singleton de proceso, igual que agentSessionClient/speechOutputRouter -
 * conectado a la cola de voz REAL (nunca al stub no-op por defecto del
 * constructor) para que el barge-in por VAD corte audio de verdad. */
export const conversationTurnManager = new ConversationTurnManager({ speech: speechOutputRouter })
