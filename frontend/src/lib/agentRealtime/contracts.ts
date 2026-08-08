/**
 * Contratos de la capa realtime (Etapa 7, seccion 3 del brief). El Runtime
 * (ConversationTurnManager) programa contra estas interfaces, nunca contra
 * un vendor concreto - hoy la unica implementacion disponible de
 * transcripcion es BrowserTranscriptionProvider (Web Speech API, porque no
 * hay proveedor STT realtime por audio configurado en este entorno), y la
 * de salida de voz sigue siendo AgentSpeechOutput/SpeechOutputRouter de la
 * Etapa 4 (ElevenLabs -> browser -> texto). Cambiar de proveedor manana
 * significa escribir una nueva clase que implemente estos contratos, no
 * tocar ConversationTurnManager.
 */

import type { AgentSpeechOutput } from '../agentVoice/types'

// ── Voice Activity Detection (secciones 7-8) ────────────────────────────

export type VadState = 'silence' | 'speech_started' | 'speech_active' | 'speech_ended'

export interface VadConfig {
  /** RMS (0-1) por encima del cual se considera que empezo a hablar. */
  speechStartThreshold: number
  /** Silencio sostenido (ms) por debajo del threshold para cerrar el turno. */
  speechEndSilenceMs: number
  /** Duracion minima (ms) de habla real para no reaccionar a un ruido breve. */
  minimumSpeechMs: number
}

export interface VadEvent {
  state: VadState
  level: number
  timestamp: number
}

// ── Turnos conversacionales (seccion 9) ──────────────────────────────────

export type TurnStatus =
  | 'listening' | 'transcribing' | 'waiting' | 'planning' | 'executing' | 'verifying'
  | 'speaking' | 'interrupted' | 'cancelled' | 'failed' | 'completed'

export interface ConversationTurn {
  turnId: string
  sessionId: string | null
  startedAt: number
  speechStartedAt: number | null
  speechEndedAt: number | null
  transcriptionStartedAt: number | null
  finalTranscriptAt: number | null
  agentStartedAt: number | null
  firstAudioAt: number | null
  completedAt: number | null
  status: TurnStatus
  partialText: string
  finalText: string | null
}

// ── Entidades candidatas durante partial (seccion 13) ────────────────────

export interface CandidateEntity {
  query: string
  entityId: string
  label: string
}

// ── Transcripcion (secciones 10-12) ──────────────────────────────────────

export interface TranscriptPartialEvent {
  turnId: string
  text: string
  timestamp: number
}

export interface TranscriptFinalEvent {
  turnId: string
  text: string
  language: string
  /** null si el proveedor no entrega una medida util (seccion 11: "no
   * inventar confidence si el proveedor no la entrega"). */
  confidence: number | null
  durationMs: number
  provider: string
  timestamp: number
}

/**
 * El proveedor de transcripcion es deliberadamente ajeno al concepto de
 * "turno" - solo escucha de forma continua y emite texto con su timestamp.
 * ConversationTurnManager es quien decide a que turn_id pertenece cada
 * evento (segun su propio VAD), asi el proveedor se puede reemplazar sin
 * que arrastre logica de turnos consigo (seccion 3).
 */
export interface RealtimeTranscriptionProvider {
  readonly providerName: string
  isSupported(): boolean
  start(): void
  stop(): void
  /** Corta el reconocimiento sin esperar su cierre natural. */
  abort(): void
  onPartial(handler: (text: string, timestamp: number) => void): void
  onFinal(handler: (text: string, timestamp: number) => void): void
  onError(handler: (message: string) => void): void
}

// ── Salida de voz (reusa el contrato de Etapa 4, sin duplicarlo) ────────

export type RealtimeSpeechProvider = AgentSpeechOutput

// ── Audio de entrada (secciones 4-7) ─────────────────────────────────────

export type MicPermissionState = 'idle' | 'granted' | 'denied' | 'unavailable'

export interface AudioInputProvider {
  start(): Promise<void>
  pause(): void
  resume(): void
  stop(): void
  /** Nivel RMS (0-1) del frame mas reciente, para el waveform (seccion 26). */
  getLevel(): number
  getPermissionState(): MicPermissionState
  onLevel(handler: (level: number) => void): () => void
  onPermissionChange(handler: (state: MicPermissionState) => void): () => void
  onDeviceChange(handler: () => void): () => void
  /** Grafo de audio en vivo, para que VoiceActivityDetector conecte su
   * AudioWorklet sin que AudioCapture conozca nada de VAD (separacion de
   * seccion 3). null mientras no hay captura activa. */
  getAudioGraph(): { context: AudioContext; stream: MediaStream } | null
}

// ── Salud de proveedor (seccion 39) ──────────────────────────────────────

export type ProviderHealthStatus = 'available' | 'degraded' | 'unavailable'

export interface ProviderHealth {
  status: ProviderHealthStatus
  checkedAt: number
}

// ── Transporte hacia el Agent Runtime (seccion 3) ────────────────────────

/** ConversationTurnManager nunca llama a agentSessionClient directo - pasa
 * por este contrato, que ademas de nombre existe para poder testear el
 * turn manager con un doble simple en vez de mockear todo el WebSocket. */
export interface ConversationTransport {
  sendUserSpeechPartial(turnId: string, text: string): void
  sendUserSpeechFinal(turnId: string, text: string, meta: { language: string; confidence: number | null; durationMs: number; provider: string }): void
  sendInterrupt(newTurnId: string): void
  sendCancel(): void
}
