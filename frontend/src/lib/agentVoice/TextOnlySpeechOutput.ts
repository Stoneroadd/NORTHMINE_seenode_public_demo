import type { AgentSpeechOutput, AgentSpeechSegment } from './types'

/**
 * TextOnlySpeechOutput (Etapa 4, seccion 21): ultimo escalon del fallback -
 * navegador sin soporte de sintesis, o el usuario silencio el audio. No
 * reproduce nada; el segmento ya quedo como subtitulo en el transcript del
 * store (runtimeStore.applyEvent maneja agent.speech.segment). Nunca
 * detiene la investigacion por esto (seccion 20).
 */
export class TextOnlySpeechOutput implements AgentSpeechOutput {
  readonly providerName = 'text_only' as const

  isSpeaking(): boolean {
    return false
  }

  clearQueue(): void {}

  setMuted(): void {}

  stop(): void {}

  async speak(_segment: AgentSpeechSegment): Promise<void> {
    // Sin audio - los subtitulos ya se muestran via el store.
  }
}
