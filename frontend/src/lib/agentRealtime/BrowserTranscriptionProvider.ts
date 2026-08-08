import type { RealtimeTranscriptionProvider } from './contracts'

/**
 * BrowserTranscriptionProvider (Etapa 7, secciones 10-12 del brief): unica
 * implementacion de RealtimeTranscriptionProvider sobre la Web Speech API
 * nativa - reemplaza la logica duplicada que antes vivia por separado en
 * BrowserSpeechInput.ts y useVoiceSession.ts (Etapa 2/4, ninguna de las dos
 * corria en modo continuo ni separaba turnos). Sigue siendo honestamente lo
 * unico disponible: no hay proveedor de transcripcion realtime por audio
 * configurado en este entorno (seccion 38, fallback: Realtime provider ->
 * browser speech recognition -> texto - aca ya estamos en el segundo
 * escalon).
 *
 * `continuous: true` mantiene el reconocimiento corriendo entre multiples
 * resultados finales (una pausa produce un resultado final pero el
 * reconocedor sigue activo) - el limite de turno lo decide
 * ConversationTurnManager con su propio VAD, no el auto-stop del navegador.
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
  start: () => void
  stop: () => void
  abort: () => void
}

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  const w = window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export class BrowserTranscriptionProvider implements RealtimeTranscriptionProvider {
  readonly providerName = 'browser_speech_recognition'
  private readonly Ctor = getRecognitionCtor()
  private recognition: SpeechRecognitionLike | null = null
  private manuallyStopped = false
  private partialHandler: ((text: string, timestamp: number) => void) | null = null
  private finalHandler: ((text: string, timestamp: number) => void) | null = null
  private errorHandler: ((message: string) => void) | null = null

  isSupported(): boolean {
    return Boolean(this.Ctor)
  }

  onPartial(handler: (text: string, timestamp: number) => void): void {
    this.partialHandler = handler
  }

  onFinal(handler: (text: string, timestamp: number) => void): void {
    this.finalHandler = handler
  }

  onError(handler: (message: string) => void): void {
    this.errorHandler = handler
  }

  start(): void {
    if (!this.Ctor || this.recognition) return
    this.manuallyStopped = false
    const recognition = new this.Ctor()
    recognition.lang = document.documentElement.lang || 'es-CL'
    recognition.continuous = true
    recognition.interimResults = true

    recognition.onresult = (event) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i]
        if (result.isFinal) {
          this.finalHandler?.(result[0].transcript.trim(), performance.now())
        } else {
          interim += result[0].transcript
        }
      }
      if (interim.trim()) this.partialHandler?.(interim.trim(), performance.now())
    }

    recognition.onerror = (event) => {
      // 'no-speech' y 'aborted' son parte normal del ciclo continuo (el
      // reconocedor a veces se cierra solo tras silencio largo) - solo se
      // reporta como error real algo que impide seguir funcionando.
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        this.errorHandler?.(event.error)
      }
    }

    recognition.onend = () => {
      this.recognition = null
      // El navegador puede cerrar el reconocimiento por su cuenta (silencio
      // largo, limite interno) sin que el usuario haya pedido detenerlo -
      // se reinicia para mantener la escucha continua, salvo que stop()/
      // abort() lo haya pedido explicitamente.
      if (!this.manuallyStopped) this.start()
    }

    this.recognition = recognition
    recognition.start()
  }

  stop(): void {
    this.manuallyStopped = true
    this.recognition?.stop()
    this.recognition = null
  }

  abort(): void {
    this.manuallyStopped = true
    this.recognition?.abort()
    this.recognition = null
  }
}
