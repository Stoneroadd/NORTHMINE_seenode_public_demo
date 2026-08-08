/**
 * Codigo fuente del AudioWorkletProcessor de VAD (Etapa 7, seccion 7 del
 * brief: "preferir AudioWorklet sobre mecanismos antiguos... no bloquear
 * main thread"). Vive como string (cargado via Blob URL en
 * VoiceActivityDetector.ts) en vez de un archivo .js estatico separado
 * para no depender de configuracion adicional de Vite para servir assets
 * del worklet - el propio modulo que lo usa lo empaqueta.
 *
 * Corre en el hilo de audio real, fuera del main thread: acumula ~20ms de
 * muestras, calcula energia RMS, y postea SOLO ese numero (nunca las
 * muestras crudas) de vuelta - la deteccion de estados (silence/started/
 * active/ended) vive en VoiceActivityDetector.ts, en el main thread, donde
 * es mas simple de testear sin un AudioContext real.
 */
export const VAD_WORKLET_SOURCE = `
class VadEnergyProcessor extends AudioWorkletProcessor {
  constructor() {
    super()
    this._frameSamples = Math.round(sampleRate * 0.02)
    this._buffer = []
  }

  process(inputs) {
    const input = inputs[0]
    const channel = input && input[0]
    if (!channel) return true

    for (let i = 0; i < channel.length; i += 1) {
      this._buffer.push(channel[i])
      if (this._buffer.length >= this._frameSamples) {
        let sumSquares = 0
        for (let j = 0; j < this._buffer.length; j += 1) {
          sumSquares += this._buffer[j] * this._buffer[j]
        }
        const rms = Math.sqrt(sumSquares / this._buffer.length)
        this.port.postMessage({ level: rms })
        this._buffer = []
      }
    }
    return true
  }
}
registerProcessor('vad-energy-processor', VadEnergyProcessor)
`
