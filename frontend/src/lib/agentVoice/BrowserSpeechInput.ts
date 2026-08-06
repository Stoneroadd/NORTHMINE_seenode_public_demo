import type { AgentSpeechInput } from './types'

/**
 * BrowserSpeechInput (Etapa 4, seccion 15): implementacion de entrada de
 * voz sobre la Web Speech API nativa - la misma tecnologia que ya usaba
 * useVoiceSession.ts en Etapa 2, ahora detras del contrato AgentSpeechInput
 * para que el Runtime del agente no conozca la API del navegador
 * directamente. Sigue siendo la unica opcion de entrada disponible (no hay
 * proveedor STT realtime configurado) - documentado, no presentado como
 * "reconocimiento de voz empresarial".
 */

type SpeechRecognitionCtor = new () => SpeechRecognitionLike

interface SpeechRecognitionResultLike {
  isFinal: boolean
  0: { transcript: string }
}

interface SpeechRecognitionEventLike {
  resultIndex: number
  results: ArrayLike<SpeechRecognitionResultLike>
}

interface SpeechRecognitionLike extends EventTarget {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
  onspeechend: (() => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  const w = window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export class BrowserSpeechInput implements AgentSpeechInput {
  private recognition: SpeechRecognitionLike | null = null
  private finalPieces: string[] = []
  private partialCallback: ((text: string) => void) | null = null
  private finalCallback: ((text: string) => void) | null = null
  private readonly Ctor = getRecognitionCtor()

  isSupported(): boolean {
    return Boolean(this.Ctor)
  }

  onPartial(callback: (text: string) => void): void {
    this.partialCallback = callback
  }

  onFinal(callback: (text: string) => void): void {
    this.finalCallback = callback
  }

  async start(): Promise<void> {
    if (!this.Ctor) return
    this.finalPieces = []
    const recognition = new this.Ctor()
    recognition.lang = document.documentElement.lang || 'es-CL'
    recognition.continuous = true
    recognition.interimResults = true

    recognition.onresult = (event) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i]
        if (result.isFinal) this.finalPieces.push(result[0].transcript)
        else interim += result[0].transcript
      }
      this.partialCallback?.(interim)
    }
    recognition.onspeechend = () => recognition.stop()
    recognition.onerror = () => {
      this.recognition = null
    }
    recognition.onend = () => {
      const text = this.finalPieces.join(' ').trim()
      this.finalPieces = []
      if (text) this.finalCallback?.(text)
      this.recognition = null
    }

    this.recognition = recognition
    recognition.start()
  }

  async stop(): Promise<void> {
    this.recognition?.stop()
  }

  async interrupt(): Promise<void> {
    this.recognition?.abort()
    this.recognition = null
    this.finalPieces = []
  }
}
