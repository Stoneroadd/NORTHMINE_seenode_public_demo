import { describe, expect, it } from 'vitest'
import { VadStateMachine } from './VoiceActivityDetector'

/**
 * VadStateMachine (Etapa 7, seccion 8) es la unica pieza de VAD que se
 * puede testear sin un AudioContext real - jsdom/Node no implementan
 * AudioWorklet, y no vale la pena mockearlo por completo para esto (mismo
 * criterio que runtimeStore.test.ts aplico con AgentSessionClient en Etapa
 * 6.1: la maquina de estados pura se testea aislada, la conexion real al
 * hardware se valida en Chrome).
 */

const CONFIG = { speechStartThreshold: 0.1, speechEndSilenceMs: 500, minimumSpeechMs: 200 }

describe('VadStateMachine', () => {
  it('empieza en silence y no emite nada mientras el nivel esta bajo', () => {
    const vad = new VadStateMachine(CONFIG)
    expect(vad.getState()).toBe('silence')
    expect(vad.feed(0.01, 0)).toBeNull()
    expect(vad.getState()).toBe('silence')
  })

  it('cruzar el umbral dispara speech_started de inmediato (barge-in necesita reaccionar ya)', () => {
    const vad = new VadStateMachine(CONFIG)
    const event = vad.feed(0.2, 0)
    expect(event).toEqual({ state: 'speech_started', level: 0.2, timestamp: 0 })
    expect(vad.getState()).toBe('speech_started')
  })

  it('un pico breve que nunca llega a minimumSpeechMs vuelve a silence sin pasar por speech_active', () => {
    const vad = new VadStateMachine(CONFIG)
    vad.feed(0.2, 0) // speech_started
    const event = vad.feed(0.01, 50) // cae antes de los 200ms minimos
    expect(event).toBeNull()
    expect(vad.getState()).toBe('silence')
  })

  it('habla sostenida mas alla de minimumSpeechMs confirma speech_active', () => {
    const vad = new VadStateMachine(CONFIG)
    vad.feed(0.2, 0) // speech_started
    vad.feed(0.2, 100) // sigue arriba, todavia no confirmado
    const event = vad.feed(0.2, 250) // 250ms >= 200ms minimos
    expect(event).toEqual({ state: 'speech_active', level: 0.2, timestamp: 250 })
    expect(vad.getState()).toBe('speech_active')
  })

  it('silencio sostenido tras speech_active dispara speech_ended y vuelve a silence', () => {
    const vad = new VadStateMachine(CONFIG)
    vad.feed(0.2, 0)
    vad.feed(0.2, 250) // speech_active
    expect(vad.feed(0.01, 300)).toBeNull() // silencio recien empieza
    const event = vad.feed(0.01, 850) // 850-300 = 550ms >= 500ms
    expect(event).toEqual({ state: 'speech_ended', level: 0.01, timestamp: 850 })
    expect(vad.getState()).toBe('silence')
  })

  it('una pausa breve (menor a speechEndSilenceMs) NO corta el turno - seccion 14', () => {
    const vad = new VadStateMachine(CONFIG)
    vad.feed(0.2, 0)
    vad.feed(0.2, 250) // speech_active
    vad.feed(0.01, 300) // pausa breve
    const event = vad.feed(0.2, 400) // retoma antes de los 500ms de silencio
    expect(event).toBeNull()
    expect(vad.getState()).toBe('speech_active')
  })

  it('reset() vuelve todo a silence sin importar el estado previo', () => {
    const vad = new VadStateMachine(CONFIG)
    vad.feed(0.2, 0)
    vad.feed(0.2, 250)
    vad.reset()
    expect(vad.getState()).toBe('silence')
    expect(vad.feed(0.2, 1000)).toEqual({ state: 'speech_started', level: 0.2, timestamp: 1000 })
  })
})
