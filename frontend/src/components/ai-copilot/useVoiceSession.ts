import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Pipeline B (desacoplado) del brief: Audio -> Speech-to-Text -> agente ->
 * texto -> Text-to-Speech. Usa las APIs nativas del navegador
 * (SpeechRecognition + SpeechSynthesis) porque no hay proveedor realtime
 * (WebRTC/OpenAI Realtime/Azure/etc.) decidido ni configurado todavia -
 * ver AI_REALTIME_PROVIDER en el diagnostico. Esto es voz real funcionando
 * hoy, sin dependencias nuevas ni claves nuevas, no una maqueta.
 *
 * El permiso se solicita explicitamente desde el clic del usuario mediante
 * getUserMedia. Ese mismo stream alimenta el waveform; solo despues de que
 * el navegador concede acceso se inicia SpeechRecognition. Evita dos
 * solicitudes simultaneas de microfono y permite explicar como recuperarse
 * cuando el permiso quedo bloqueado a nivel del sitio.
 */

type SpeechRecognitionAvailability = 'available' | 'downloadable' | 'downloading' | 'unavailable'

interface SpeechRecognitionOptionsLike {
  langs: string[]
  processLocally: boolean
}

interface SpeechRecognitionCtor {
  new (): SpeechRecognitionLike
  available?: (options: SpeechRecognitionOptionsLike) => Promise<SpeechRecognitionAvailability>
  install?: (options: SpeechRecognitionOptionsLike) => Promise<boolean>
}

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
  processLocally?: boolean
  onstart: (() => void) | null
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
  onspeechend: (() => void) | null
  start: (audioTrack?: MediaStreamTrack) => void
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

function microphoneAllowedByDocumentPolicy(): boolean {
  const documentWithPolicy = document as Document & {
    permissionsPolicy?: { allowsFeature: (feature: string) => boolean }
    featurePolicy?: { allowsFeature: (feature: string) => boolean }
  }
  const policy = documentWithPolicy.permissionsPolicy ?? documentWithPolicy.featurePolicy
  return policy?.allowsFeature('microphone') ?? true
}

function recognitionLanguage(): string {
  const configured = document.documentElement.lang || navigator.language || 'es-CL'
  return configured.toLowerCase() === 'es' ? 'es-ES' : configured
}

async function prepareOnDeviceRecognition(
  RecognitionCtor: SpeechRecognitionCtor,
  lang: string,
): Promise<boolean> {
  if (!RecognitionCtor.available || !RecognitionCtor.install) return false

  const options: SpeechRecognitionOptionsLike = { langs: [lang], processLocally: true }
  try {
    const availability = await RecognitionCtor.available(options)
    if (availability === 'available') return true
    if (availability === 'downloadable' || availability === 'downloading') {
      return await RecognitionCtor.install(options)
    }
  } catch {
    // Algunos Chromium exponen la API antes de habilitar el paquete local.
    // En ese caso se conserva el servicio normal del navegador.
  }
  return false
}

export interface VoiceSession {
  supported: boolean
  listening: boolean
  speaking: boolean
  requestingPermission: boolean
  permissionState: PermissionState | 'unknown' | 'unavailable'
  interimTranscript: string
  audioLevel: number
  micError: string | null
  startListening: () => Promise<void>
  stopListening: () => void
  speak: (text: string) => void
  stopSpeaking: () => void
}

export function useVoiceSession(onFinalTranscript: (text: string) => void): VoiceSession {
  const RecognitionCtor = getRecognitionCtor()
  const supported = Boolean(RecognitionCtor) && 'speechSynthesis' in window

  const [listening, setListening] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [requestingPermission, setRequestingPermission] = useState(false)
  const [permissionState, setPermissionState] = useState<PermissionState | 'unknown' | 'unavailable'>('unknown')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [audioLevel, setAudioLevel] = useState(0)
  const [micError, setMicError] = useState<string | null>(null)

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const finalPiecesRef = useRef<string[]>([])
  const speakingRef = useRef(false)
  const streamRef = useRef<MediaStream | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const rafRef = useRef<number | null>(null)
  const requestingRef = useRef(false)
  const requestAttemptRef = useRef(0)
  const onFinalRef = useRef(onFinalTranscript)
  onFinalRef.current = onFinalTranscript

  useEffect(() => {
    speakingRef.current = speaking
  }, [speaking])

  useEffect(() => {
    if (!navigator.permissions?.query) return
    let active = true
    let status: PermissionStatus | null = null
    const readPermission = async () => {
      try {
        status = await navigator.permissions.query({ name: 'microphone' as PermissionName })
        if (!active) return
        setPermissionState(status.state)
        status.onchange = () => setPermissionState(status?.state ?? 'unknown')
      } catch {
        if (active) setPermissionState('unknown')
      }
    }
    void readPermission()
    return () => {
      active = false
      if (status) status.onchange = null
    }
  }, [])

  const stopWaveform = useCallback(() => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    audioCtxRef.current?.close().catch(() => undefined)
    audioCtxRef.current = null
    setAudioLevel(0)
  }, [])

  const startWaveform = useCallback((stream: MediaStream) => {
    try {
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
      setAudioLevel(0)
    }
  }, [])

  const stopListening = useCallback(() => {
    requestAttemptRef.current += 1
    recognitionRef.current?.stop()
    setListening(false)
    stopWaveform()
  }, [stopWaveform])

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis?.cancel()
    setSpeaking(false)
  }, [])

  const startListening = useCallback(async () => {
    if (!RecognitionCtor || requestingRef.current || listening) return
    // Barge-in real: si el agente esta hablando y el usuario activa el
    // microfono, se corta la voz de inmediato en vez de superponerse.
    if (speakingRef.current) stopSpeaking()

    setMicError(null)
    setInterimTranscript('')
    finalPiecesRef.current = []

    if (!window.isSecureContext) {
      setPermissionState('unavailable')
      setMicError('El micrófono requiere HTTPS o localhost. Abra NORTHMINE desde una conexión segura y vuelva a intentarlo.')
      return
    }
    if (!microphoneAllowedByDocumentPolicy()) {
      setPermissionState('unavailable')
      setMicError('La configuración de seguridad de esta página deshabilita el micrófono. Abra NORTHMINE directamente, fuera de un visor o iframe, y vuelva a intentarlo.')
      return
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setPermissionState('unavailable')
      setMicError('Este navegador no permite solicitar acceso al micrófono. Puede continuar usando el chat de texto.')
      return
    }

    requestingRef.current = true
    const requestAttempt = requestAttemptRef.current + 1
    requestAttemptRef.current = requestAttempt
    setRequestingPermission(true)
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      })
      if (requestAttempt !== requestAttemptRef.current) {
        stream.getTracks().forEach((track) => track.stop())
        requestingRef.current = false
        setRequestingPermission(false)
        return
      }
      setPermissionState('granted')
    } catch (error) {
      const name = error instanceof DOMException ? error.name : ''
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        setPermissionState('denied')
        setMicError('El navegador bloqueó el micrófono para este sitio. Abra el candado de la barra de direcciones, cambie Micrófono a Permitir y pulse Reintentar.')
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        setPermissionState('unavailable')
        setMicError('No se encontró un micrófono disponible. Conecte uno y pulse Reintentar.')
      } else if (name === 'NotReadableError' || name === 'TrackStartError') {
        setPermissionState('unavailable')
        setMicError('El micrófono está siendo usado por otra aplicación. Libérelo y pulse Reintentar.')
      } else {
        setPermissionState('unknown')
        setMicError('No se pudo abrir el micrófono. Revise el permiso del sitio y pulse Reintentar.')
      }
      requestingRef.current = false
      setRequestingPermission(false)
      return
    }

    const lang = recognitionLanguage()
    const useOnDeviceRecognition = await prepareOnDeviceRecognition(RecognitionCtor, lang)
    if (requestAttempt !== requestAttemptRef.current) {
      stream.getTracks().forEach((track) => track.stop())
      requestingRef.current = false
      setRequestingPermission(false)
      return
    }

    const recognition = new RecognitionCtor()
    recognition.lang = lang
    recognition.continuous = true
    recognition.interimResults = true
    if ('processLocally' in recognition) recognition.processLocally = useOnDeviceRecognition

    recognition.onstart = () => {
      setListening(true)
      setMicError(null)
    }

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
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setPermissionState('denied')
        setMicError('El reconocimiento de voz fue bloqueado. Abra el candado de la barra de direcciones, permita el micrófono y pulse Reintentar.')
      } else if (event.error === 'audio-capture') {
        setMicError('El navegador perdió acceso al micrófono. Compruebe que no esté ocupado y pulse Reintentar.')
      } else if (event.error === 'network') {
        setMicError(useOnDeviceRecognition
          ? 'El reconocimiento local no pudo completar la transcripcion. Pulse Reintentar o continue por texto.'
          : 'El servicio de voz del navegador no respondio. JARVIS conserva el permiso del microfono; pulse Reintentar. Para voz sin depender de este servicio, use un navegador con reconocimiento local disponible.')
      } else if (event.error === 'language-not-supported') {
        setMicError(`El navegador no tiene instalado reconocimiento para ${lang}. Actualice el navegador o continue por texto.`)
      } else if (event.error !== 'aborted' && event.error !== 'no-speech') {
        setMicError(`No se pudo iniciar el reconocimiento de voz (${event.error}). Pulse Reintentar.`)
      }
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
    startWaveform(stream)
    try {
      const audioTrack = stream.getAudioTracks()[0]
      if (!audioTrack) throw new DOMException('No hay una pista de audio activa.', 'NotFoundError')
      // La misma pista alimenta el medidor y el reconocedor. Esto evita que
      // SpeechRecognition intente abrir una segunda captura del microfono.
      recognition.start(audioTrack)
      setListening(true)
    } catch (error) {
      stopWaveform()
      const detail = error instanceof DOMException ? error.name : 'Error interno'
      setMicError(`El reconocimiento de voz no pudo iniciarse (${detail}). Pulse Reintentar o continue por texto.`)
    } finally {
      requestingRef.current = false
      setRequestingPermission(false)
    }
  }, [RecognitionCtor, listening, startWaveform, stopSpeaking, stopWaveform])

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
    requestingPermission,
    permissionState,
    interimTranscript,
    audioLevel,
    micError,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
  }
}
