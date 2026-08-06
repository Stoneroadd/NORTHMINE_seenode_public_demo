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

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting'

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

  connect(token: string): void {
    if (this.ws && this.token === token && (this.status === 'connected' || this.status === 'connecting')) return
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
    const ws = new WebSocket(url)
    this.ws = ws

    ws.onopen = () => {
      this.reconnectAttempt = 0
      this._setStatus('connected')
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
      } else if (this.stored) {
        this.stored.lastSequence = Math.max(this.stored.lastSequence, event.sequence)
        saveStored(this.stored)
      }
      this.eventHandlers.forEach((handler) => handler(event))
    }

    ws.onclose = () => {
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
    }
  }

  private _scheduleReconnect(): void {
    this._setStatus('reconnecting')
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
    this.statusHandlers.forEach((handler) => handler(status))
  }
}

/** Singleton de proceso del navegador - una sola conexion WS por pestaña,
 * compartida por AgentPresence y AgentWorkspace. */
export const agentSessionClient = new AgentSessionClient()
