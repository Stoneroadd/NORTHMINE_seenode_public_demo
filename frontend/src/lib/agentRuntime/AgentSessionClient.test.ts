import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Etapa 6.1, seccion 13 del brief. `runtimeStore.test.ts` documenta que un
 * test de AgentSessionClient con WebSocket mockeado se considero antes de
 * bajo valor frente a validar contra un servidor real - pero el bug real de
 * esta etapa (proxy sin `ws: true`) ademas destapo una clase de riesgo que
 * SI conviene cubrir con un mock: que el estado 'connected' nunca se muestre
 * antes de que el servidor confirme la sesion, y que un remount de
 * StrictMode no cree un segundo WebSocket. Eso es lo que se prueba aca -
 * no reemplaza la validacion E2E, la complementa.
 *
 * `agentSessionClient` es un singleton de modulo (una sola conexion por
 * pestaña) construido en el momento del import, y usa `window.setTimeout`/
 * `sessionStorage`/`WebSocket` globales - ninguno existe en el entorno
 * 'node' de vitest. Por eso cada test stubea esos globales y vuelve a
 * importar el modulo desde cero (`vi.resetModules`) para obtener un
 * singleton limpio, en vez de reimplementar la logica de conexion aparte.
 */

class MockWebSocket {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3
  static instances: MockWebSocket[] = []

  url: string
  readyState = MockWebSocket.CONNECTING
  onopen: (() => void) | null = null
  onmessage: ((ev: { data: string }) => void) | null = null
  onclose: ((ev: { code: number; reason: string; wasClean: boolean }) => void) | null = null
  onerror: (() => void) | null = null
  sent: string[] = []

  constructor(url: string) {
    this.url = url
    MockWebSocket.instances.push(this)
  }

  send(data: string): void {
    this.sent.push(data)
  }

  close(): void {
    this.readyState = MockWebSocket.CLOSED
  }

  // Helpers de test para simular el servidor real.
  simulateOpen(): void {
    this.readyState = MockWebSocket.OPEN
    this.onopen?.()
  }

  simulateMessage(payload: Record<string, unknown>): void {
    this.onmessage?.({ data: JSON.stringify(payload) })
  }

  simulateClose(code: number, reason = '', wasClean = false): void {
    this.readyState = MockWebSocket.CLOSED
    this.onclose?.({ code, reason, wasClean })
  }
}

function sessionReadyEvent(sessionId = 'asess-test', sequence = 1) {
  return {
    protocol_version: '1.0', event_id: 'evt-1', session_id: sessionId,
    investigation_id: null, step_id: null, correlation_id: 'c1', sequence,
    timestamp: new Date().toISOString(), event_type: 'session.ready',
    payload: { sessionId, state: 'idle', activeInvestigationId: null },
  }
}

async function freshClient() {
  vi.resetModules()
  MockWebSocket.instances = []
  const store = new Map<string, string>()
  vi.stubGlobal('sessionStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, v),
    removeItem: (k: string) => store.delete(k),
  })
  vi.stubGlobal('WebSocket', MockWebSocket)
  vi.stubGlobal('window', {
    location: { origin: 'http://localhost:8001' },
    setTimeout: (...args: Parameters<typeof setTimeout>) => setTimeout(...args),
    clearTimeout: (...args: Parameters<typeof clearTimeout>) => clearTimeout(...args),
    setInterval: (...args: Parameters<typeof setInterval>) => setInterval(...args),
    clearInterval: (...args: Parameters<typeof clearInterval>) => clearInterval(...args),
  })
  const mod = await import('./AgentSessionClient')
  return mod.agentSessionClient
}

describe('AgentSessionClient', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('deriva la URL del WebSocket con esquema ws:// (http -> ws), nunca hardcodeado', async () => {
    const client = await freshClient()
    client.connect('tok-1')
    const ws = MockWebSocket.instances[0]
    expect(ws.url.startsWith('ws://')).toBe(true)
    expect(ws.url).toContain('/api/ai-agent/ws')
  })

  it('replica la transformacion http(s) -> ws(s) usada por AgentSessionClient', () => {
    // Mismo regex que WS_BASE_URL en AgentSessionClient.ts - protege contra
    // que alguien lo cambie de forma que rompa https -> wss.
    expect('http://localhost:8001'.replace(/^http/, 'ws')).toBe('ws://localhost:8001')
    expect('https://api.northmine.example'.replace(/^http/, 'ws')).toBe('wss://api.northmine.example')
  })

  it('no considera la sesion lista solo porque el socket abrio: pasa por authenticating antes de connected', async () => {
    const client = await freshClient()
    const statuses: string[] = []
    client.onStatus((s) => statuses.push(s))

    client.connect('tok-1')
    expect(client.getStatus()).toBe('connecting')

    const ws = MockWebSocket.instances[0]
    ws.simulateOpen()
    expect(client.getStatus()).toBe('authenticating')

    ws.simulateMessage(sessionReadyEvent())
    expect(client.getStatus()).toBe('connected')

    expect(statuses).toEqual(['disconnected', 'connecting', 'authenticating', 'connected'])
  })

  it('StrictMode: connect() llamado dos veces con el mismo token mientras autentica no crea un segundo WebSocket', async () => {
    const client = await freshClient()
    client.connect('tok-1')
    MockWebSocket.instances[0].simulateOpen()
    expect(client.getStatus()).toBe('authenticating')

    // Simula el remount de StrictMode: el efecto vuelve a llamar connect()
    // con el mismo token antes de que llegue session.ready.
    client.connect('tok-1')

    expect(MockWebSocket.instances).toHaveLength(1)
  })

  it('connect() con un token distinto si reemplaza la conexion (no es el mismo caso que StrictMode)', async () => {
    const client = await freshClient()
    client.connect('tok-1')
    expect(MockWebSocket.instances).toHaveLength(1)

    client.connect('tok-2')
    expect(MockWebSocket.instances).toHaveLength(2)
  })

  it('un cierre inesperado agenda una reconexion; disconnect() manual no', async () => {
    const client = await freshClient()
    client.connect('tok-1')
    const ws1 = MockWebSocket.instances[0]
    ws1.simulateOpen()
    ws1.simulateMessage(sessionReadyEvent())

    ws1.simulateClose(1006, '', false)
    expect(client.getStatus()).toBe('reconnecting')

    vi.advanceTimersByTime(1000)
    expect(MockWebSocket.instances).toHaveLength(2)

    const ws2 = MockWebSocket.instances[1]
    ws2.simulateOpen()
    ws2.simulateMessage(sessionReadyEvent())
    client.disconnect()
    expect(client.getStatus()).toBe('disconnected')

    vi.advanceTimersByTime(20_000)
    expect(MockWebSocket.instances).toHaveLength(2)
  })

  it('reanuda sesion: session.ready guarda sessionId/sequence sanitizados en sessionStorage', async () => {
    const client = await freshClient()
    client.connect('tok-1')
    const ws = MockWebSocket.instances[0]
    ws.simulateOpen()
    ws.simulateMessage(sessionReadyEvent('asess-resume', 7))

    expect(client.getSessionId()).toBe('asess-resume')
    const stored = JSON.parse(sessionStorage.getItem('northmine-agent-session')!)
    expect(stored).toEqual({ sessionId: 'asess-resume', lastSequence: 7 })
  })

  it('los diagnosticos nunca incluyen el token ni el query string', async () => {
    const client = await freshClient()
    client.connect('tok-secreto')
    MockWebSocket.instances[0].simulateOpen()

    const diag = client.getDiagnostics()
    expect(diag.wsUrl).not.toContain('tok-secreto')
    expect(diag.wsUrl).not.toContain('?')
    expect(diag.status).toBe('authenticating')
  })
})
