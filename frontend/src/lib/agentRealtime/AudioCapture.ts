import type { AudioInputProvider, MicPermissionState } from './contracts'
import { MIC_CONSTRAINTS } from './micPermission'

/**
 * AudioCapture (Etapa 7, seccion 4 del brief): unico punto de contacto con
 * `getUserMedia`. Nunca guarda audio crudo (no hay MediaRecorder ni buffer
 * persistente aca - solo se analiza el nivel RMS en vivo para el waveform y
 * se expone el grafo de audio para que VoiceActivityDetector conecte su
 * propio AudioWorklet). `pause()`/`resume()` deshabilitan el track en vez
 * de recrear el stream, para que "silencio"/"activa el microfono" (seccion
 * 5) sean instantaneos y no vuelvan a pedir permiso.
 */
export class AudioCapture implements AudioInputProvider {
  private stream: MediaStream | null = null
  private context: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private source: MediaStreamAudioSourceNode | null = null
  private rafId: number | null = null
  private level = 0
  private permission: MicPermissionState = 'idle'
  private levelHandlers = new Set<(level: number) => void>()
  private permissionHandlers = new Set<(state: MicPermissionState) => void>()
  private deviceChangeHandlers = new Set<() => void>()
  private deviceChangeBound = () => this.deviceChangeHandlers.forEach((h) => h())

  /** `existingStream` permite entregar un MediaStream ya obtenido por el
   * modal de onboarding (mic permission) - evita pedir el microfono dos
   * veces (una para el modal, otra aca) y respeta que solo el primer
   * getUserMedia necesita venir de un click real. */
  async start(existingStream?: MediaStream): Promise<void> {
    if (this.stream) return
    try {
      const stream = existingStream ?? await navigator.mediaDevices.getUserMedia(MIC_CONSTRAINTS)
      this.stream = stream
      this._setPermission('granted')

      const AudioContextCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      const context = new AudioContextCtor()
      this.context = context
      const source = context.createMediaStreamSource(stream)
      this.source = source
      const analyser = context.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      this.analyser = analyser

      navigator.mediaDevices.addEventListener?.('devicechange', this.deviceChangeBound)
      this._runLevelLoop()
    } catch (error) {
      const name = (error as DOMException)?.name
      this._setPermission(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'unavailable')
      throw error
    }
  }

  pause(): void {
    this.stream?.getAudioTracks().forEach((track) => {
      track.enabled = false
    })
  }

  resume(): void {
    this.stream?.getAudioTracks().forEach((track) => {
      track.enabled = true
    })
  }

  stop(): void {
    if (this.rafId != null) cancelAnimationFrame(this.rafId)
    this.rafId = null
    this.stream?.getTracks().forEach((track) => track.stop())
    this.stream = null
    this.source?.disconnect()
    this.source = null
    this.analyser = null
    void this.context?.close().catch(() => undefined)
    this.context = null
    navigator.mediaDevices.removeEventListener?.('devicechange', this.deviceChangeBound)
    this.level = 0
    this.levelHandlers.forEach((h) => h(0))
  }

  getLevel(): number {
    return this.level
  }

  getPermissionState(): MicPermissionState {
    return this.permission
  }

  getAudioGraph(): { context: AudioContext; stream: MediaStream } | null {
    if (!this.context || !this.stream) return null
    return { context: this.context, stream: this.stream }
  }

  onLevel(handler: (level: number) => void): () => void {
    this.levelHandlers.add(handler)
    return () => this.levelHandlers.delete(handler)
  }

  onPermissionChange(handler: (state: MicPermissionState) => void): () => void {
    this.permissionHandlers.add(handler)
    return () => this.permissionHandlers.delete(handler)
  }

  onDeviceChange(handler: () => void): () => void {
    this.deviceChangeHandlers.add(handler)
    return () => this.deviceChangeHandlers.delete(handler)
  }

  private _setPermission(state: MicPermissionState): void {
    this.permission = state
    this.permissionHandlers.forEach((h) => h(state))
  }

  private _runLevelLoop(): void {
    const analyser = this.analyser
    if (!analyser) return
    const buffer = new Uint8Array(analyser.frequencyBinCount)
    const tick = () => {
      if (!this.analyser) return
      this.analyser.getByteTimeDomainData(buffer)
      let sumSquares = 0
      for (let i = 0; i < buffer.length; i += 1) {
        const normalized = (buffer[i] - 128) / 128
        sumSquares += normalized * normalized
      }
      this.level = Math.min(1, Math.sqrt(sumSquares / buffer.length) * 4)
      this.levelHandlers.forEach((h) => h(this.level))
      this.rafId = requestAnimationFrame(tick)
    }
    tick()
  }
}
