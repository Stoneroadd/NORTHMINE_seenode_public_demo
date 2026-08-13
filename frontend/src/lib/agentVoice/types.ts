/**
 * Contratos de voz (Etapa 4, seccion 15 del brief). Dos direcciones
 * independientes: entrada (microfono -> texto) y salida (texto -> audio).
 * Cuatro implementaciones de salida intercambiables tras el mismo
 * contrato: ElevenLabsSpeechOutput (principal), BrowserSpeechOutput
 * (respaldo), TextOnlySpeechOutput (subtitulos), y SpeechOutputRouter
 * (las orquesta con fallback automatico - ver seccion 21).
 */

export type SpeechPriority = 'status' | 'finding' | 'warning' | 'result' | 'question'

export interface AgentSpeechSegment {
  segmentId: string
  text: string
  priority: SpeechPriority
  sequence: number
  interruptible: boolean
  kind?: 'STATUS' | 'FINDING' | 'WARNING' | 'RESULT' | 'QUESTION'
  turnId?: string | null
}

export interface AgentSpeechInput {
  start(): Promise<void>
  stop(): Promise<void>
  interrupt(): Promise<void>
  onPartial(callback: (text: string) => void): void
  onFinal(callback: (text: string) => void): void
  isSupported(): boolean
}

export type VoiceOutputProviderName = 'openai_realtime' | 'elevenlabs' | 'browser' | 'text_only'

export interface AgentSpeechOutput {
  readonly providerName: VoiceOutputProviderName
  speak(segment: AgentSpeechSegment): Promise<void>
  stop(): void
  clearQueue(): void
  setMuted(muted: boolean): void
  isSpeaking(): boolean
}

export interface SpeechPlaybackResult {
  segmentId: string
  provider: VoiceOutputProviderName
  result: 'completed' | 'failed' | 'interrupted'
  latencyMs: number | null
  textLength: number
  priority: SpeechPriority
}
