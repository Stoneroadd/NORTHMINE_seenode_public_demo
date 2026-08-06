import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Pipeline B (desacoplado) del brief: Audio -> Speech-to-Text -> agente ->
 * texto -> Text-to-Speech. Usa las APIs nativas del navegador
 * (SpeechRecognition + SpeechSynthesis) porque no hay proveedor realtime
 * (WebRTC/OpenAI Realtime/Azure/etc.) decidido ni configurado todavia -
 * ver AI_REALTIME_PROVIDER en el diagnostico. Esto es voz real funcionando
 * hoy, sin dependencias nuevas ni claves nuevas, no una maqueta.
 *
 * El nivel de audio (para el waveform) se mide con un stream de
 * getUserMedia independiente del que usa SpeechRecognition internamente -
 * es el patron estandar para poder visualizar volumen en vivo, ya que
 * SpeechRecognition no expone amplitud.
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
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

function pickSpanishVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis?.getVoices() ?? []
  return voices.find((voice) => voice.lang?.toLowerCase().startsWith('es')) ?? voices[0] ?? null
}

export interface VoiceSession {
  supported: boolean
  listening: boolean
  speaking: boolean
  interimTranscript: string
  audioLevel: number
  micError: string | null
  startListening: () => void
  stopListening: () => void
  speak: (text: string) => void
  stopSpeaking: () => void
}

export function useVoiceSession(onFinalTranscript: (text: string) => void): VoiceSession {
  const RecognitionCtor = getRecognitionCtor()
  const supported = Boolean(RecognitionCtor) && 'speechSynthesis' in window

  const [listening, setListening] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [interimTranscript, setInterimTranscript] = useState('')
  const [audioLevel, setAudioLevel] = useState(0)
  const [micError, setMicError] = useState<string | null>(null)

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const finalPiecesRef = useRef<string[]>([])
  const speakingRef = useRef(false)
  const streamRef = useRef<MediaStream | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const rafRef = useRef<number | null>(null)
  const onFinalRef = useRef(onFinalTranscript)
  onFinalRef.current = onFinalTranscript

  useEffect(() => {
    speakingRef.current = speaking
  }, [speaking])

  const stopWaveform = useCallback(() => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    audioCtxRef.current?.close().catch(() => undefined)
    audioCtxRef.current = null
    setAudioLevel(0)
  }, [])

  const startWaveform = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const AudioContextCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      const audioCtx = new AudioContextCtor()
      audioCtxRef.current = audioCtx
      const source = audioCtx.createMediaStreamSource(stream)
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      const buffer = new Uint8Array(analyser.frequencyBinCount)

      const tick = () => {
        analyser.getByteTimeDomainData(buffer)
        let sumSquares = 0
        for (let i = 0; i < buffer.length; i += 1) {
          const normalized = (buffer[i] - 128) / 128
          sumSquares += normalized * normalized
        }
        const rms = Math.sqrt(sumSquares / buffer.length)
        setAudioLevel(Math.min(1, rms * 4))
        rafRef.current = requestAnimationFrame(tick)
      }
      tick()
    } catch {
      // Sin permiso de microfono: el reconocimiento de voz seguira
      // fallando por su cuenta (onerror), esto solo afecta al waveform.
    }
  }, [])

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
    setListening(false)
    stopWaveform()
  }, [stopWaveform])

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis?.cancel()
    setSpeaking(false)
  }, [])

  const startListening = useCallback(() => {
    if (!RecognitionCtor) return
    // Barge-in real: si el agente esta hablando y el usuario activa el
    // microfono, se corta la voz de inmediato en vez de superponerse.
    if (speakingRef.current) stopSpeaking()

    setMicError(null)
    setInterimTranscript('')
    finalPiecesRef.current = []

    const recognition = new RecognitionCtor()
    recognition.lang = document.documentElement.lang || 'es-CL'
    recognition.continuous = true
    recognition.interimResults = true

    recognition.onresult = (event) => {
      if (speakingRef.current) stopSpeaking()
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i]
        if (result.isFinal) {
          finalPiecesRef.current.push(result[0].transcript)
        } else {
          interim += result[0].transcript
        }
      }
      setInterimTranscript(interim)
    }

    recognition.onspeechend = () => {
      recognition.stop()
    }

    recognition.onerror = (event) => {
      setMicError(event.error || 'No se pudo acceder al microfono')
      setListening(false)
      stopWaveform()
    }

    recognition.onend = () => {
      setListening(false)
      stopWaveform()
      const finalText = finalPiecesRef.current.join(' ').trim()
      setInterimTranscript('')
      if (finalText) onFinalRef.current(finalText)
    }

    recognitionRef.current = recognition
    recognition.start()
    setListening(true)
    void startWaveform()
  }, [RecognitionCtor, startWaveform, stopSpeaking, stopWaveform])

  const speak = useCallback(
    (text: string) => {
      if (!supported || !text.trim()) return
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = document.documentElement.lang || 'es-CL'
      utterance.rate = 1.02
      const voice = pickSpanishVoice()
      if (voice) utterance.voice = voice
      utterance.onstart = () => setSpeaking(true)
      utterance.onend = () => setSpeaking(false)
      utterance.onerror = () => setSpeaking(false)
      window.speechSynthesis.speak(utterance)
    },
    [supported],
  )

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort()
      window.speechSynthesis?.cancel()
      stopWaveform()
    }
  }, [stopWaveform])

  return {
    supported,
    listening,
    speaking,
    interimTranscript,
    audioLevel,
    micError,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
  }
}
