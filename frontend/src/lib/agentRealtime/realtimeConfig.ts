import { DEFAULT_VAD_CONFIG } from './VoiceActivityDetector'

/**
 * Configuracion del runtime conversacional (Etapa 7, seccion 40). Sin
 * secretos - la unica clave real (ElevenLabs) ya vive exclusivamente en el
 * backend desde la Etapa 4 y sigue asi. Lee de import.meta.env con
 * defaults conservadores, nunca hardcodea comportamiento agresivo (seccion
 * 8).
 */

function envFlag(value: string | undefined, fallback: boolean): boolean {
  if (value == null || value === '') return fallback
  return value.toLowerCase() === 'true'
}

function envNumber(value: string | undefined, fallback: number): number {
  const parsed = value != null ? Number(value) : NaN
  return Number.isFinite(parsed) ? parsed : fallback
}

export const realtimeConfig = {
  realtimeVoiceEnabled: envFlag(import.meta.env.VITE_REALTIME_VOICE_ENABLED, true),
  vadEnabled: envFlag(import.meta.env.VITE_VAD_ENABLED, true),
  bargeInEnabled: envFlag(import.meta.env.VITE_BARGE_IN_ENABLED, true),
  browserFallbackEnabled: envFlag(import.meta.env.VITE_BROWSER_FALLBACK_ENABLED, true),
  endOfTurnSilenceMs: envNumber(import.meta.env.VITE_END_OF_TURN_SILENCE_MS, DEFAULT_VAD_CONFIG.speechEndSilenceMs),
  maxTurnSeconds: envNumber(import.meta.env.VITE_MAX_TURN_SECONDS, 45),
  speechSegmentMaxChars: envNumber(import.meta.env.VITE_SPEECH_SEGMENT_MAX_CHARS, 220),
  vad: {
    speechStartThreshold: envNumber(import.meta.env.VITE_VAD_START_THRESHOLD, DEFAULT_VAD_CONFIG.speechStartThreshold),
    speechEndSilenceMs: envNumber(import.meta.env.VITE_END_OF_TURN_SILENCE_MS, DEFAULT_VAD_CONFIG.speechEndSilenceMs),
    minimumSpeechMs: envNumber(import.meta.env.VITE_VAD_MIN_SPEECH_MS, DEFAULT_VAD_CONFIG.minimumSpeechMs),
  },
}
