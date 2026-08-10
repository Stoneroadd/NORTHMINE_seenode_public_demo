import { useCallback, useEffect, useRef, useState } from 'react'
import { copilotApi } from '../../lib/aiCopilot'

type SpeechRecognitionAvailability = 'available' | 'downloadable' | 'downloading' | 'unavailable'

interface SpeechRecognitionOptionsLike {
  langs: string[]
  processLocally: boolean
}

interface SpeechRecognitionCtor {
  new (): SpeechRecognitionLike
  available?: (options: SpeechRecognitionOptionsLike) => Promise<SpeechRecognitionAvailability>
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
  const browser = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
  return browser.SpeechRecognition ?? browser.webkitSpeechRecognition ?? null
}

function pickSpanishVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis?.getVoices() ?? []
  return voices.find((voice) => voice.lang?.toLowerCase().startsWith('es-cl'))
    ?? voices.find((voice) => voice.lang?.toLowerCase().startsWith('es'))
    ?? voices[0]
    ?? null
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

function createPcmWavBlob(chunks: Float32Array[], sampleRate: number): Blob | null {
  const sampleCount = chunks.reduce((total, chunk) => total + chunk.length, 0)
  if (!sampleCount || !Number.isFinite(sampleRate) || sampleRate <= 0) return null

  const bytesPerSample = 2
  const buffer = new ArrayBuffer(44 + sampleCount * bytesPerSample)
  const view = new DataView(buffer)
  const writeAscii = (offset: number, value: string) => {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(offset + index, value.charCodeAt(index))
    }
  }

  writeAscii(0, 'RIFF')
  view.setUint32(4, 36 + sampleCount * bytesPerSample, true)
  writeAscii(8, 'WAVE')
  writeAscii(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * bytesPerSample, true)
  view.setUint16(32, bytesPerSample, true)
  view.setUint16(34, 16, true)
  writeAscii(36, 'data')
  view.setUint32(40, sampleCount * bytesPerSample, true)

  let offset = 44
  for (const chunk of chunks) {
    for (let index = 0; index < chunk.length; index += 1) {
      const sample = Math.max(-1, Math.min(1, chunk[index]))
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true)
      offset += bytesPerSample
    }
  }
  return new Blob([buffer], { type: 'audio/wav' })
}

async function onDeviceRecognitionAvailable(
  RecognitionCtor: SpeechRecognitionCtor,
  lang: string,
): Promise<boolean> {
  if (!RecognitionCtor.available) return false
  try {
    const availability = await Promise.race([
      RecognitionCtor.available({ langs: [lang], processLocally: true }),
      new Promise<SpeechRecognitionAvailability>((resolve) => {
        window.setTimeout(() => resolve('unavailable'), 600)
      }),
    ])
    return availability === 'available'
  } catch {
    return false
  }
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
  cancelListening: () => void
  speak: (text: string, onEnd?: () => void) => void
  stopSpeaking: () => void
}

export function useVoiceSession(onFinalTranscript: (text: string) => void): VoiceSession {
  const RecognitionCtor = getRecognitionCtor()
  const canCapture = Boolean(navigator.mediaDevices?.getUserMedia)
  const canTranscribe = Boolean(RecognitionCtor) || 'MediaRecorder' in window
  const supported = canCapture && canTranscribe

  const [listening, setListening] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [requestingPermission, setRequestingPermission] = useState(false)
  const [permissionState, setPermissionState] = useState<PermissionState | 'unknown' | 'unavailable'>('unknown')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [audioLevel, setAudioLevel] = useState(0)
  const [micError, setMicError] = useState<string | null>(null)

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const pcmProcessorRef = useRef<ScriptProcessorNode | null>(null)
  const pcmSourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const pcmSilentGainRef = useRef<GainNode | null>(null)
  const pcmChunksRef = useRef<Float32Array[]>([])
  const pcmSampleRateRef = useRef(0)
  const rafRef = useRef<number | null>(null)
  const maxRecordingTimerRef = useRef<number | null>(null)
  const finalPiecesRef = useRef<string[]>([])
  const fallbackModeRef = useRef(false)
  const discardRecordingRef = useRef(false)
  const speechDetectedRef = useRef(false)
  const lastVoiceAtRef = useRef(0)
  const recordingStartedAtRef = useRef(0)
  const requestingRef = useRef(false)
  const requestAttemptRef = useRef(0)
  const speakingRef = useRef(false)
  const speechRequestRef = useRef(0)
  const onFinalRef = useRef(onFinalTranscript)
  onFinalRef.current = onFinalTranscript

  useEffect(() => {
    speakingRef.current = speaking
  }, [speaking])

  useEffect(() => {
    if (!navigator.permissions?.query) return
    let active = true
    let permission: PermissionStatus | null = null
    void navigator.permissions.query({ name: 'microphone' as PermissionName })
      .then((result) => {
        if (!active) return
        permission = result
        setPermissionState(result.state)
        result.onchange = () => setPermissionState(result.state)
      })
      .catch(() => {
        if (active) setPermissionState('unknown')
      })
    return () => {
      active = false
      if (permission) permission.onchange = null
    }
  }, [])

  const clearRecordingTimer = useCallback(() => {
    if (maxRecordingTimerRef.current != null) window.clearTimeout(maxRecordingTimerRef.current)
    maxRecordingTimerRef.current = null
  }, [])

  const stopAudioCapture = useCallback(() => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    clearRecordingTimer()
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    pcmProcessorRef.current?.disconnect()
    pcmProcessorRef.current = null
    pcmSourceRef.current?.disconnect()
    pcmSourceRef.current = null
    pcmSilentGainRef.current?.disconnect()
    pcmSilentGainRef.current = null
    audioCtxRef.current?.close().catch(() => undefined)
    audioCtxRef.current = null
    setAudioLevel(0)
  }, [clearRecordingTimer])

  const finishServerTranscription = useCallback(async (blob: Blob) => {
    requestingRef.current = true
    setRequestingPermission(true)
    setListening(false)
    setInterimTranscript('Entendiendo tu solicitud…')
    stopAudioCapture()
    try {
      const result = await copilotApi.transcribe(blob, recognitionLanguage())
      const text = result.text.trim()
      setMicError(null)
      setInterimTranscript('')
      if (text) onFinalRef.current(text)
    } catch (error) {
      setInterimTranscript('')
      setMicError(error instanceof Error ? error.message : 'No pude transcribir la grabación. Continúe por texto.')
    } finally {
      requestingRef.current = false
      setRequestingPermission(false)
      fallbackModeRef.current = false
      mediaRecorderRef.current = null
    }
  }, [stopAudioCapture])

  const stopRecorder = useCallback((transcribe: boolean) => {
    const recorder = mediaRecorderRef.current
    if (!recorder || recorder.state === 'inactive') return
    discardRecordingRef.current = !transcribe
    fallbackModeRef.current = transcribe
    if (transcribe) {
      setListening(false)
      setInterimTranscript('Entendiendo tu solicitud…')
    }
    recorder.stop()
  }, [])

  const startBackupRecorder = useCallback((stream: MediaStream, fallbackImmediately: boolean): boolean => {
    if (!('MediaRecorder' in window)) return false
    try {
      const preferredType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus']
        .find((type) => MediaRecorder.isTypeSupported(type))
      const recorder = new MediaRecorder(stream, preferredType ? { mimeType: preferredType } : undefined)
      recordedChunksRef.current = []
      discardRecordingRef.current = false
      fallbackModeRef.current = fallbackImmediately
      recordingStartedAtRef.current = performance.now()
      speechDetectedRef.current = false
      lastVoiceAtRef.current = 0

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) recordedChunksRef.current.push(event.data)
      }
      recorder.onerror = () => {
        setMicError('No pude capturar el audio. Puede continuar escribiendo en el chat.')
        setListening(false)
        stopAudioCapture()
      }
      recorder.onstop = () => {
        const chunks = recordedChunksRef.current
        recordedChunksRef.current = []
        mediaRecorderRef.current = null
        if (discardRecordingRef.current) return
        const wavBlob = createPcmWavBlob(pcmChunksRef.current, pcmSampleRateRef.current)
        const blob = wavBlob ?? new Blob(chunks, { type: recorder.mimeType || 'audio/webm' })
        if (blob.size === 0) {
          setInterimTranscript('')
          setMicError('No detecté audio. Pulse el micrófono e inténtelo nuevamente.')
          stopAudioCapture()
          return
        }
        void finishServerTranscription(blob)
      }
      mediaRecorderRef.current = recorder
      recorder.start(100)
      maxRecordingTimerRef.current = window.setTimeout(() => {
        fallbackModeRef.current = true
        stopRecorder(true)
      }, 15_000)
      return true
    } catch {
      return false
    }
  }, [finishServerTranscription, stopAudioCapture, stopRecorder])

  const startWaveform = useCallback((stream: MediaStream) => {
    try {
      streamRef.current = stream
      const AudioContextCtor = window.AudioContext
        ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      const audioContext = new AudioContextCtor()
      audioCtxRef.current = audioContext
      const source = audioContext.createMediaStreamSource(stream)
      pcmSourceRef.current = source
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      pcmChunksRef.current = []
      pcmSampleRateRef.current = audioContext.sampleRate
      const processor = audioContext.createScriptProcessor(4096, 1, 1)
      const silentGain = audioContext.createGain()
      silentGain.gain.value = 0
      processor.onaudioprocess = (event) => {
        pcmChunksRef.current.push(new Float32Array(event.inputBuffer.getChannelData(0)))
      }
      source.connect(processor)
      processor.connect(silentGain)
      silentGain.connect(audioContext.destination)
      pcmProcessorRef.current = processor
      pcmSilentGainRef.current = silentGain
      const buffer = new Uint8Array(analyser.frequencyBinCount)

      const tick = () => {
        analyser.getByteTimeDomainData(buffer)
        let sumSquares = 0
        for (let index = 0; index < buffer.length; index += 1) {
          const normalized = (buffer[index] - 128) / 128
          sumSquares += normalized * normalized
        }
        const rms = Math.sqrt(sumSquares / buffer.length)
        setAudioLevel(Math.min(1, rms * 4))

        const now = performance.now()
        if (rms > 0.035) {
          speechDetectedRef.current = true
          lastVoiceAtRef.current = now
        } else if (
          fallbackModeRef.current
          && speechDetectedRef.current
          && now - lastVoiceAtRef.current > 700
          && now - recordingStartedAtRef.current > 900
        ) {
          stopRecorder(true)
          return
        }
        rafRef.current = requestAnimationFrame(tick)
      }
      tick()
    } catch {
      setAudioLevel(0)
    }
  }, [stopRecorder])

  const stopSpeaking = useCallback(() => {
    speechRequestRef.current += 1
    window.speechSynthesis?.cancel()
    setSpeaking(false)
  }, [])

  const stopListening = useCallback(() => {
    requestAttemptRef.current += 1
    const recognition = recognitionRef.current
    recognitionRef.current = null
    if (recognition) {
      recognition.stop()
      return
    }
    if (mediaRecorderRef.current?.state !== 'inactive') {
      stopRecorder(true)
      return
    }
    setListening(false)
    setInterimTranscript('')
    stopAudioCapture()
  }, [stopAudioCapture, stopRecorder])

  const cancelListening = useCallback(() => {
    requestAttemptRef.current += 1
    recognitionRef.current?.abort()
    recognitionRef.current = null
    stopRecorder(false)
    setListening(false)
    setInterimTranscript('')
    stopAudioCapture()
  }, [stopAudioCapture, stopRecorder])

  const startListening = useCallback(async () => {
    if (requestingRef.current || listening) return
    if (speakingRef.current) stopSpeaking()
    setMicError(null)
    setInterimTranscript('Preparando micrófono…')
    finalPiecesRef.current = []

    if (!window.isSecureContext) {
      setPermissionState('unavailable')
      setInterimTranscript('')
      setMicError('El micrófono requiere HTTPS o localhost. Abra NORTHMINE desde una conexión segura.')
      return
    }
    if (!microphoneAllowedByDocumentPolicy()) {
      setPermissionState('unavailable')
      setInterimTranscript('')
      setMicError('La política de esta página bloquea el micrófono. Abra NORTHMINE directamente, fuera de un iframe.')
      return
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setPermissionState('unavailable')
      setInterimTranscript('')
      setMicError('Este navegador no permite abrir el micrófono. Puede continuar por texto.')
      return
    }

    requestingRef.current = true
    const attempt = requestAttemptRef.current + 1
    requestAttemptRef.current = attempt
    setRequestingPermission(true)
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      })
      if (attempt !== requestAttemptRef.current) {
        stream.getTracks().forEach((track) => track.stop())
        return
      }
      setPermissionState('granted')
    } catch (error) {
      const name = error instanceof DOMException ? error.name : ''
      setInterimTranscript('')
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        setPermissionState('denied')
        setMicError('El navegador bloqueó el micrófono. En el candado de la barra, seleccione Micrófono > Permitir y pulse Reintentar.')
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        setPermissionState('unavailable')
        setMicError('No encontré un micrófono disponible. Conecte uno y pulse Reintentar.')
      } else if (name === 'NotReadableError' || name === 'TrackStartError') {
        setPermissionState('unavailable')
        setMicError('Otra aplicación está usando el micrófono. Libérelo y pulse Reintentar.')
      } else {
        setPermissionState('unknown')
        setMicError('No pude abrir el micrófono. Revise el permiso del sitio y pulse Reintentar.')
      }
      return
    } finally {
      requestingRef.current = false
      setRequestingPermission(false)
    }

    startWaveform(stream)
    const hasRecorder = startBackupRecorder(stream, !RecognitionCtor)
    if (!RecognitionCtor) {
      if (!hasRecorder) {
        setMicError('Este navegador no dispone de reconocimiento ni grabación de voz. Puede continuar por texto.')
        stopAudioCapture()
        return
      }
      setListening(true)
      setInterimTranscript('Te escucho…')
      return
    }

    const lang = recognitionLanguage()
    const useOnDeviceRecognition = await onDeviceRecognitionAvailable(RecognitionCtor, lang)
    if (attempt !== requestAttemptRef.current) {
      stopRecorder(false)
      stopAudioCapture()
      return
    }

    const recognition = new RecognitionCtor()
    recognition.lang = lang
    recognition.continuous = false
    recognition.interimResults = true
    if ('processLocally' in recognition) recognition.processLocally = useOnDeviceRecognition

    recognition.onstart = () => {
      setListening(true)
      setInterimTranscript('Te escucho…')
      setMicError(null)
    }
    recognition.onresult = (event) => {
      if (speakingRef.current) stopSpeaking()
      let interim = ''
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index]
        if (result.isFinal) finalPiecesRef.current.push(result[0].transcript)
        else interim += result[0].transcript
      }
      setInterimTranscript(interim || 'Te escucho…')
    }
    recognition.onspeechend = () => recognition.stop()
    recognition.onerror = (event) => {
      if (event.error === 'network' && hasRecorder) {
        fallbackModeRef.current = true
        recognitionRef.current = null
        setListening(true)
        setMicError(null)
        setInterimTranscript('Te escucho…')
        return
      }

      recognitionRef.current = null
      setListening(false)
      stopRecorder(false)
      stopAudioCapture()
      setInterimTranscript('')
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setPermissionState('denied')
        setMicError('El navegador bloqueó el reconocimiento. Permita el micrófono para este sitio y pulse Reintentar.')
      } else if (event.error === 'audio-capture') {
        setMicError('El navegador perdió el micrófono. Compruebe que no esté ocupado y pulse Reintentar.')
      } else if (event.error === 'no-speech') {
        setMicError('No detecté voz. Pulse Reintentar y hable después de escuchar “Te escucho”.')
      } else if (event.error === 'language-not-supported') {
        setMicError(`Este navegador no reconoce ${lang}. Puede continuar por texto.`)
      } else if (event.error !== 'aborted') {
        setMicError(`No pude iniciar el reconocimiento (${event.error}). Puede continuar por texto.`)
      }
    }
    recognition.onend = () => {
      if (fallbackModeRef.current) return
      recognitionRef.current = null
      const finalText = finalPiecesRef.current.join(' ').trim()
      setListening(false)
      setInterimTranscript('')
      if (finalText) {
        stopRecorder(false)
        stopAudioCapture()
        onFinalRef.current(finalText)
      } else if (hasRecorder && speechDetectedRef.current) {
        stopRecorder(true)
      } else {
        stopRecorder(false)
        stopAudioCapture()
      }
    }

    recognitionRef.current = recognition
    try {
      const track = stream.getAudioTracks()[0]
      if (!track) throw new DOMException('No hay una pista de audio activa.', 'NotFoundError')
      recognition.start(track)
      setListening(true)
      setInterimTranscript('Te escucho…')
    } catch (error) {
      recognitionRef.current = null
      if (hasRecorder) {
        fallbackModeRef.current = true
        setListening(true)
        setInterimTranscript('Te escucho…')
      } else {
        stopAudioCapture()
        const detail = error instanceof DOMException ? error.name : 'Error interno'
        setMicError(`No pude iniciar el reconocimiento (${detail}). Puede continuar por texto.`)
      }
    }
  }, [RecognitionCtor, listening, startBackupRecorder, startWaveform, stopAudioCapture, stopRecorder, stopSpeaking])

  const speak = useCallback((text: string, onEnd?: () => void) => {
    if (!('speechSynthesis' in window) || !text.trim()) {
      onEnd?.()
      return
    }
    speechRequestRef.current += 1
    const request = speechRequestRef.current
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = document.documentElement.lang || 'es-CL'
    utterance.rate = 1.08
    utterance.pitch = 0.96
    const voice = pickSpanishVoice()
    if (voice) utterance.voice = voice
    utterance.onstart = () => setSpeaking(true)
    utterance.onend = () => {
      if (request !== speechRequestRef.current) return
      setSpeaking(false)
      onEnd?.()
    }
    utterance.onerror = () => {
      if (request !== speechRequestRef.current) return
      setSpeaking(false)
      onEnd?.()
    }
    window.speechSynthesis.speak(utterance)
  }, [])

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort()
      const recorder = mediaRecorderRef.current
      if (recorder && recorder.state !== 'inactive') {
        recorder.onstop = null
        recorder.stop()
      }
      window.speechSynthesis?.cancel()
      stopAudioCapture()
    }
  }, [stopAudioCapture])

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
    cancelListening,
    speak,
    stopSpeaking,
  }
}
