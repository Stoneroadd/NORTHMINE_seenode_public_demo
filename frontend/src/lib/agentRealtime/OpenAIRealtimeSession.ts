import { secureApi } from '../secureApi'
import { agentSessionClient } from '../agentRuntime/AgentSessionClient'
import { useAgentRuntimeStore } from '../agentRuntime/runtimeStore'
import { speechOutputRouter } from '../agentVoice/SpeechOutputRouter'

export type OpenAIRealtimeState = 'idle' | 'connecting' | 'live' | 'listening' | 'speaking' | 'error'

export interface OpenAIRealtimeAvailability {
  ready: boolean
  mode: 'live' | 'not_configured'
  model: string | null
  missing: string[]
  transport: 'webrtc'
  sideband: boolean
}

export interface OpenAIRealtimeMetrics {
  firstAudioLatencyMs: number | null
  bargeInStopLatencyMs: number | null
  activatedAt: number | null
  lastSpeechStartedAt: number | null
}

type StateHandler = (state: OpenAIRealtimeState) => void
type LevelHandler = (level: number) => void

function appendAgentTranscript(text: string): void {
  const trimmed = text.trim()
  if (!trimmed) return
  useAgentRuntimeStore.setState((state) => ({
    transcript: [
      ...state.transcript,
      { id: `rt-${Date.now()}`, role: 'agent' as const, text: trimmed, timestamp: new Date().toISOString() },
    ].slice(-50),
  }))
}

/**
 * WebRTC conversation transport for the existing NORTHMINE Runtime.
 * The browser only sends SDP and microphone media. Credentials, tools and
 * operational authority remain on the backend sideband.
 */
export class OpenAIRealtimeSession {
  private peer: RTCPeerConnection | null = null
  private channel: RTCDataChannel | null = null
  private audio: HTMLAudioElement | null = null
  private stream: MediaStream | null = null
  private state: OpenAIRealtimeState = 'idle'
  private muted = false
  private stateHandlers = new Set<StateHandler>()
  private levelHandlers = new Set<LevelHandler>()
  private audioContext: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private levelFrame: number | null = null
  private transcriptBuffer = ''
  private metrics: OpenAIRealtimeMetrics = {
    firstAudioLatencyMs: null,
    bargeInStopLatencyMs: null,
    activatedAt: null,
    lastSpeechStartedAt: null,
  }

  isSupported(): boolean {
    return typeof RTCPeerConnection !== 'undefined' && typeof navigator.mediaDevices?.getUserMedia === 'function'
  }

  isActive(): boolean {
    return this.peer !== null && !['idle', 'error'].includes(this.state)
  }

  getState(): OpenAIRealtimeState {
    return this.state
  }

  getMetrics(): OpenAIRealtimeMetrics {
    return { ...this.metrics }
  }

  onState(handler: StateHandler): () => void {
    this.stateHandlers.add(handler)
    handler(this.state)
    return () => this.stateHandlers.delete(handler)
  }

  onInputLevel(handler: LevelHandler): () => void {
    this.levelHandlers.add(handler)
    return () => this.levelHandlers.delete(handler)
  }

  async availability(): Promise<OpenAIRealtimeAvailability> {
    const { data } = await secureApi.get<OpenAIRealtimeAvailability>('/api/ai-agent/realtime/status')
    return data
  }

  async activate(stream: MediaStream): Promise<void> {
    if (this.isActive()) return
    if (!this.isSupported()) throw new Error('WEBRTC_UNSUPPORTED')
    const runtimeSessionId = agentSessionClient.getSessionId()
    if (!runtimeSessionId || agentSessionClient.getStatus() !== 'connected') {
      throw new Error('RUNTIME_SESSION_NOT_READY')
    }

    this._setState('connecting')
    this.stream = stream
    this.metrics = {
      firstAudioLatencyMs: null,
      bargeInStopLatencyMs: null,
      activatedAt: performance.now(),
      lastSpeechStartedAt: null,
    }
    const peer = new RTCPeerConnection()
    this.peer = peer
    const audio = document.createElement('audio')
    audio.autoplay = true
    audio.setAttribute('playsinline', '')
    audio.muted = this.muted
    this.audio = audio
    peer.ontrack = (event) => {
      audio.srcObject = event.streams[0]
      void audio.play().catch(() => this._setState('error'))
    }
    peer.onconnectionstatechange = () => {
      if (peer.connectionState === 'failed' || peer.connectionState === 'closed') this._setState('error')
    }
    stream.getAudioTracks().forEach((track) => peer.addTrack(track, stream))
    this._startLevelMeter(stream)

    const channel = peer.createDataChannel('oai-events')
    this.channel = channel
    channel.onmessage = (event) => this._handleEvent(event.data)

    try {
      const offer = await peer.createOffer()
      await peer.setLocalDescription(offer)
      if (!offer.sdp) throw new Error('EMPTY_SDP')
      const response = await secureApi.post<string>('/api/ai-agent/realtime/session', offer.sdp, {
        headers: {
          'Content-Type': 'application/sdp',
          'X-NORTHMINE-Agent-Session': runtimeSessionId,
        },
        responseType: 'text',
        transformRequest: [(data) => data],
      })
      await peer.setRemoteDescription({ type: 'answer', sdp: response.data })
      await this._waitForDataChannel(channel)
      speechOutputRouter.setExternalRealtimeActive(true)
      this._setState('live')
      this._send({
        type: 'response.create',
        response: { instructions: 'Di solamente: Modo agente activado.' },
      })
    } catch (error) {
      this.deactivate()
      this._setState('error')
      throw error
    }
  }

  deactivate(): void {
    speechOutputRouter.setExternalRealtimeActive(false)
    this.channel?.close()
    this.peer?.close()
    this.stream?.getTracks().forEach((track) => track.stop())
    this.channel = null
    this.peer = null
    this.stream = null
    if (this.audio) {
      this.audio.pause()
      this.audio.srcObject = null
    }
    this.audio = null
    this._stopLevelMeter()
    this._setState('idle')
  }

  setMuted(muted: boolean): void {
    this.muted = muted
    if (this.audio) this.audio.muted = muted
  }

  interrupt(): void {
    const started = performance.now()
    this._send({ type: 'response.cancel' })
    this._send({ type: 'output_audio_buffer.clear' })
    if (this.audio) this.audio.pause()
    this.metrics.bargeInStopLatencyMs = Math.round(performance.now() - started)
    agentSessionClient.send('agent.interrupt', {})
    this._setState('listening')
  }

  private _handleEvent(raw: unknown): void {
    let event: Record<string, unknown>
    try {
      event = JSON.parse(String(raw)) as Record<string, unknown>
    } catch {
      return
    }
    const type = String(event.type ?? '')
    if (type === 'input_audio_buffer.speech_started') {
      this.metrics.lastSpeechStartedAt = performance.now()
      if (this.state === 'speaking') this.interrupt()
      this._setState('listening')
      return
    }
    if (type === 'conversation.item.input_audio_transcription.completed') {
      const transcript = String(event.transcript ?? '').trim()
      if (transcript) useAgentRuntimeStore.getState().addUserTranscript(transcript)
      return
    }
    if (type === 'response.created') {
      this.transcriptBuffer = ''
      return
    }
    if (type === 'response.output_audio_transcript.delta' || type === 'response.audio_transcript.delta') {
      this.transcriptBuffer += String(event.delta ?? '')
      return
    }
    if (type === 'response.output_audio_transcript.done' || type === 'response.audio_transcript.done') {
      const transcript = String(event.transcript ?? this.transcriptBuffer).trim()
      appendAgentTranscript(transcript)
      this.transcriptBuffer = ''
      return
    }
    if (type === 'output_audio_buffer.started') {
      if (this.metrics.firstAudioLatencyMs == null && this.metrics.lastSpeechStartedAt != null) {
        this.metrics.firstAudioLatencyMs = Math.round(performance.now() - this.metrics.lastSpeechStartedAt)
      }
      this._setState('speaking')
      return
    }
    if (type === 'output_audio_buffer.stopped' || type === 'response.done') {
      this._setState('live')
      if (this.audio?.paused && !this.muted) void this.audio.play().catch(() => undefined)
      return
    }
    if (type === 'error') this._setState('error')
  }

  private _send(event: Record<string, unknown>): void {
    if (this.channel?.readyState === 'open') this.channel.send(JSON.stringify(event))
  }

  private _waitForDataChannel(channel: RTCDataChannel): Promise<void> {
    if (channel.readyState === 'open') return Promise.resolve()
    return new Promise((resolve, reject) => {
      const timeout = window.setTimeout(() => reject(new Error('REALTIME_DATA_CHANNEL_TIMEOUT')), 10_000)
      channel.onopen = () => {
        window.clearTimeout(timeout)
        resolve()
      }
      channel.onerror = () => {
        window.clearTimeout(timeout)
        reject(new Error('REALTIME_DATA_CHANNEL_FAILED'))
      }
    })
  }

  private _startLevelMeter(stream: MediaStream): void {
    const AudioContextCtor = window.AudioContext
    if (!AudioContextCtor) return
    const context = new AudioContextCtor()
    const analyser = context.createAnalyser()
    analyser.fftSize = 256
    context.createMediaStreamSource(stream).connect(analyser)
    this.audioContext = context
    this.analyser = analyser
    const samples = new Uint8Array(analyser.fftSize)
    const update = () => {
      if (!this.analyser) return
      this.analyser.getByteTimeDomainData(samples)
      let sum = 0
      for (const sample of samples) {
        const normalized = (sample - 128) / 128
        sum += normalized * normalized
      }
      const level = Math.min(1, Math.sqrt(sum / samples.length) * 3)
      this.levelHandlers.forEach((handler) => handler(level))
      this.levelFrame = window.requestAnimationFrame(update)
    }
    update()
  }

  private _stopLevelMeter(): void {
    if (this.levelFrame != null) window.cancelAnimationFrame(this.levelFrame)
    this.levelFrame = null
    void this.audioContext?.close()
    this.audioContext = null
    this.analyser = null
    this.levelHandlers.forEach((handler) => handler(0))
  }

  private _setState(state: OpenAIRealtimeState): void {
    this.state = state
    this.stateHandlers.forEach((handler) => handler(state))
  }
}

export const openAIRealtimeSession = new OpenAIRealtimeSession()
