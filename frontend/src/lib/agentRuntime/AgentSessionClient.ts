import { settingsService } from '../../services/settingsService'
import type { AgentEvent, ClientEventType } from './protocol'
import { buildClientEvent } from './protocol'

/**
 * Cliente WebSocket persistente del Agent Runtime (Etapa 4, seccion 4-7).
 * Vive FUERA del ciclo de vida de cualquier componente React - se conecta
 * una vez (al iniciar sesion NORTHMINE) y permanece conectado sin importar
 * si AgentWorkspace esta montado o no ("el agente debe poder trabajar
 * aunque el workspace este cerrado"). AgentPresence/AgentWorkspace solo se
 * SUSCRIBEN a sus eventos via `on()`; nunca crean su propia conexion.
 *
 * Reconexion con backoff exponencial, heartbeat periodico, y reanudacion
 * real: guarda `session_id` + ultima `sequence` vista en sessionStorage
 * (por pestaña) para que una reconexion (o F5) recupere exactamente donde
 * quedo, via `since_sequence` en la URL de conexion (ver ws_router.py).
 */

const WS_BASE_URL = settingsService.apiBaseUrl.replace(/^http/, 'ws')
const HEARTBEAT_INTERVAL_MS = 20_000
const MAX_BACKOFF_MS = 15_000
const STORAGE_KEY = 'northmine-agent-session'

type EventHandler = (event: AgentEvent) => void
type StatusHandler = (status: ConnectionStatus) => void

/** Etapa 6.1, seccion 6-7 del brief: 'connected' significa 'el servidor
 * confirmo la sesion' (session.ready recibido), NUNCA solo 'el socket
 * abrio' - un socket que abre pero cuyo servidor nunca contesta debe
 * mostrarse como 'authenticating', no como 'Conectando…' indefinido ni
 * como 'connected' antes de tiempo. */
export type ConnectionStatus = 'disconnected' | 'connecting' | 'authenticating' | 'connected' | 'reconnecting'

/** Etapa 6.1, seccion 12 del brief: diagnostico de desarrollo sanitizado -
 * nunca incluye el token ni ningun dato de sesion, solo metadatos de
 * conexion para poder distinguir "el socket nunca abrio" de "abrio pero el
 * servidor nunca contesto" de "el servidor lo cerro". Expuesto via
 * devBridge (solo import.meta.env.DEV), nunca como UI permanente. */
export interface ConnectionDiagnostics {
  status: ConnectionStatus
  wsUrl: string | null
  lastOpenAt: string | null
  lastCloseCode: number | null
  lastCloseReason: string | null
  lastCloseWasClean: boolean | null
  lastErrorAt: string | null
  retryCount: number
}

interface StoredSession {
  sessionId: string
  lastSequence: number
}

function loadStored(): StoredSession | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as StoredSession) : null
  } catch {
    return null
  }
}

function saveStored(value: StoredSession): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value))
  } catch {
    // sessionStorage no disponible (modo privado estricto, etc.) - la sesion
    // sigue funcionando, solo se pierde la reanudacion entre recargas.
  }
}

class AgentSessionClient {
  private ws: WebSocket | null = null
  private token: string | null = null
  private status: ConnectionStatus = 'disconnected'
  private stored: StoredSession | null = loadStored()
  private eventHandlers = new Set<EventHandler>()
  private statusHandlers = new Set<StatusHandler>()
  private heartbeatTimer: number | null = null
  private reconnectTimer: number | null = null
  private reconnectAttempt = 0
  private outboundQueue: Record<string, unknown>[] = []
  private manuallyClosed = false
  private diagnostics: ConnectionDiagnostics = {
    status: 'disconnected', wsUrl: null, lastOpenAt: null, lastCloseCode: null,
    lastCloseReason: null, lastCloseWasClean: null, lastErrorAt: null, retryCount: 0,
  }

  getDiagnostics(): ConnectionDiagnostics {
    return { ...this.diagnostics }
  }

  connect(token: string): void {
    // 'authenticating' cuenta como "ya intentando" igual que 'connected'/
    // 'connecting' (seccion 9 del brief): sin esto, un remount de
    // StrictMode que llama connect() de nuevo con el MISMO token mientras
    // el socket ya abrio pero espera session.ready crearia un SEGUNDO
    // WebSocket - exactamente el tipo de bug de singleton duplicado que ya
    // aparecio en Etapa 5.
    if (this.ws && this.token === token && (this.status === 'connected' || this.status === 'connecting' || this.status === 'authenticating')) return
    this.token = token
    this.manuallyClosed = false
    this._open()
  }

  disconnect(): void {
    this.manuallyClosed = true
    this._clearTimers()
    this.ws?.close(1000, 'client_disconnect')
    this.ws = null
    this._setStatus('disconnected')
  }

  on(handler: EventHandler): () => void {
    this.eventHandlers.add(handler)
    return () => this.eventHandlers.delete(handler)
  }

  onStatus(handler: StatusHandler): () => void {
    this.statusHandlers.add(handler)
    handler(this.status)
    return () => this.statusHandlers.delete(handler)
  }

  getStatus(): ConnectionStatus {
    return this.status
  }

  getSessionId(): string | null {
    return this.stored?.sessionId ?? null
  }

  send(eventType: ClientEventType, payload: Record<string, unknown> = {}): void {
    const event = buildClientEvent(eventType, payload)
    const withSession = { ...event, session_id: this.stored?.sessionId }
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(withSession))
    } else {
      this.outboundQueue.push(withSession)
    }
  }

  private _open(): void {
    if (!this.token) return
    this._setStatus(this.reconnectAttempt > 0 ? 'reconnecting' : 'connecting')

    const params = new URLSearchParams({ token: this.token })
    if (this.stored?.sessionId) {
      params.set('session_id', this.stored.sessionId)
      params.set('since_sequence', String(this.stored.lastSequence))
    }
    const url = `${WS_BASE_URL}/api/ai-agent/ws?${params.toString()}`
    // Nunca se guarda el query string real (contiene el token) en
    // diagnostics - solo el origen+path, para que sea seguro mostrar/loguear.
    this.diagnostics.wsUrl = `${WS_BASE_URL}/api/ai-agent/ws`
    const ws = new WebSocket(url)
    this.ws = ws

    ws.onopen = () => {
      this.reconnectAttempt = 0
      this.diagnostics.lastOpenAt = new Date().toISOString()
      // El socket abrio, pero la sesion NO esta lista todavia - eso solo lo
      // confirma el servidor emitiendo session.ready (ver onmessage abajo).
      // Mostrar 'connected' aca seria mentir si el servidor nunca contesta.
      this._setStatus('authenticating')
      this._flushQueue()
      this._startHeartbeat()
    }

    ws.onmessage = (raw) => {
      let event: AgentEvent
      try {
        event = JSON.parse(raw.data as string) as AgentEvent
      } catch {
        return
      }
      if (event.event_type === 'session.ready') {
        const sessionId = String((event.payload as { sessionId?: string }).sessionId ?? '')
        if (sessionId) {
          this.stored = { sessionId, lastSequence: event.sequence }
          saveStored(this.stored)
        }
        this._setStatus('connected')
      } else if (this.stored) {
        this.stored.lastSequence = Math.max(this.stored.lastSequence, event.sequence)
        saveStored(this.stored)
      }
      this.eventHandlers.forEach((handler) => handler(event))
    }

    ws.onclose = (ev) => {
      this.diagnostics.lastCloseCode = ev.code
      this.diagnostics.lastCloseReason = ev.reason || null
      this.diagnostics.lastCloseWasClean = ev.wasClean
      this._clearHeartbeat()
      if (this.manuallyClosed) {
        this._setStatus('disconnected')
        return
      }
      this._scheduleReconnect()
    }

    ws.onerror = () => {
      // onclose se dispara despues de onerror para sockets nativos - la
      // reconexion se maneja ahi, aca no hace falta duplicar logica.
      this.diagnostics.lastErrorAt = new Date().toISOString()
    }
  }

  private _scheduleReconnect(): void {
    this._setStatus('reconnecting')
    this.diagnostics.retryCount += 1
    const delay = Math.min(MAX_BACKOFF_MS, 500 * 2 ** this.reconnectAttempt)
    this.reconnectAttempt += 1
    this.reconnectTimer = window.setTimeout(() => this._open(), delay)
  }

  private _startHeartbeat(): void {
    this._clearHeartbeat()
    this.heartbeatTimer = window.setInterval(() => this.send('session.heartbeat'), HEARTBEAT_INTERVAL_MS)
  }

  private _clearHeartbeat(): void {
    if (this.heartbeatTimer != null) window.clearInterval(this.heartbeatTimer)
    this.heartbeatTimer = null
  }

  private _clearTimers(): void {
    this._clearHeartbeat()
    if (this.reconnectTimer != null) window.clearTimeout(this.reconnectTimer)
    this.reconnectTimer = null
  }

  private _flushQueue(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return
    while (this.outboundQueue.length) {
      const item = this.outboundQueue.shift()
      this.ws.send(JSON.stringify(item))
    }
  }

  private _setStatus(status: ConnectionStatus): void {
    this.status = status
    this.diagnostics.status = status
    this.statusHandlers.forEach((handler) => handler(status))
  }
}

/** Singleton de proceso del navegador - una sola conexion WS por pestaña,
 * compartida por AgentPresence y AgentWorkspace. */
export const agentSessionClient = new AgentSessionClient()
