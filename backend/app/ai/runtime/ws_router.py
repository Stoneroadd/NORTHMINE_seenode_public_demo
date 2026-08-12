from __future__ import annotations

import asyncio
import json
import logging
import time
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import ValidationError

from app.ai import audit as runtime_audit
from app.ai.runtime import command_router, persistence, runtime
from app.ai.runtime.command_router import AgentCommand, AgentCommandType
from app.ai.runtime.event_bus import emit
from app.ai.runtime.protocol import AgentEvent, UnknownEventType, now_utc
from app.ai.runtime.session_manager import LiveSession, session_manager
from app.ai.runtime.ui_actions import UIActionAcknowledgement
from app.core.audit import AuditStoreUnavailable, is_token_blacklisted
from app.core.security import verify_access_token
from app.services.user_repository import get_user_repository

logger = logging.getLogger("northmine.ai.runtime.ws")

router = APIRouter(prefix="/ai-agent", tags=["ai-agent-runtime"])

"""WebSocket del Agent Runtime (Etapa 4, seccion 7 del brief): /api/ai-agent/ws.

Autenticacion real (mismo verify_access_token + blacklist que el resto de
NORTHMINE, adaptado a WS: el navegador no puede mandar headers Authorization
en el handshake de WebSocket nativo, asi que el token va en el query string
`?token=`), aislamiento por usuario (session_manager.get_for_user valida
ownership), heartbeat (`session.heartbeat` del cliente + reaper de sesiones
inactivas), reconexion/reanudacion (`session.resume` + replay de eventos
persistidos), deduplicacion por event_id, orden por sequence (lo asigna el
servidor, nunca el cliente), rate limiting simple por sesion, limite de
payload, y rechazo de tipos de evento desconocidos (protocol.py ya valida
esto via Pydantic).
"""

MAX_PAYLOAD_BYTES = 16_384
MAX_MESSAGES_PER_MINUTE = 60
SESSION_IDLE_TIMEOUT_SECONDS = 600
HEARTBEAT_CHECK_INTERVAL_SECONDS = 60


class _RateLimiter:
    """Ventana simple por sesion - suficiente para un WS de un agente
    conversacional (no es un endpoint de alto volumen); no requiere Redis."""

    def __init__(self, limit: int, window_seconds: float = 60.0):
        self._limit = limit
        self._window = window_seconds
        self._timestamps: list[float] = []

    def allow(self) -> bool:
        now = time.monotonic()
        cutoff = now - self._window
        self._timestamps = [t for t in self._timestamps if t > cutoff]
        if len(self._timestamps) >= self._limit:
            return False
        self._timestamps.append(now)
        return True


async def _authenticate(websocket: WebSocket) -> dict | None:
    token = websocket.query_params.get("token")
    if not token:
        return None
    payload = verify_access_token(token)
    if not payload:
        return None
    try:
        if is_token_blacklisted(token):
            return None
    except AuditStoreUnavailable:
        return None
    username = str(payload.get("sub", "")).strip().lower()
    if username:
        user = get_user_repository().get_by_username(username)
        if not user or not user.is_active:
            return None
        if payload.get("auth_version") != user.auth_version:
            return None
    return payload


def _client_ip(websocket: WebSocket) -> str:
    return websocket.client.host if websocket.client else "unknown"


@router.websocket("/ws")
async def agent_ws(websocket: WebSocket) -> None:
    # Etapa 6.1, seccion 5 del brief: logging sanitizado del handshake -
    # nunca Authorization/Bearer/cookies/API keys/tokens, solo hasta donde
    # llego la conexion. Pensado para diagnosticar "el frontend nunca ve
    # session.ready" sin adivinar en que capa se corto (proxy/red/backend).
    logger.info("WS connection received origin=%s", websocket.headers.get("origin"))
    user = await _authenticate(websocket)
    if not user:
        logger.info("WS auth rejected reason=%s", "no_token" if not websocket.query_params.get("token") else "invalid_or_blacklisted")
        await websocket.close(code=4401, reason="Autenticacion requerida")
        return
    logger.info("WS auth ok user=%s", user.get("sub"))

    await websocket.accept()
    logger.info("WS accepted user=%s", user.get("sub"))
    ip = _client_ip(websocket)
    user_id = str(user.get("sub") or "anon")
    role = str(user.get("rol") or "")

    requested_session_id = websocket.query_params.get("session_id")
    last_known_sequence = int(websocket.query_params.get("since_sequence", "0") or "0")

    live: LiveSession | None = None
    resumed = False
    if requested_session_id:
        live = await session_manager.try_get_for_user(requested_session_id, user_id)
        resumed = live is not None
    if live is None:
        live = await session_manager.create(user_id=user_id, role=role, company_id=user.get("empresa"), site_id=user.get("faena"))
    logger.info("WS session %s user=%s resumed=%s", live.session.session_id, user_id, resumed)

    # Si otra conexion (pestana vieja, reconexion previa que no cerro limpio)
    # ya esta adjunta a esta MISMA sesion, se cierra primero - solo un sender
    # puede drenar `live.outbox` a la vez, o los eventos se entregarian a la
    # conexion equivocada o se perderian entre dos consumidores concurrentes.
    if live.websocket is not None and live.websocket is not websocket:
        try:
            await live.websocket.close(code=4409, reason="Reemplazada por una nueva conexion")
        except Exception:
            pass

    live.websocket = websocket
    live.touch()
    persistence.save_session(live.session)
    runtime_audit.record_session_event(usuario=user_id, ip=ip, session_id=live.session.session_id, event="resumed" if resumed else "started")

    ready_correlation = f"corr-{uuid.uuid4().hex[:10]}"
    from app.ai.runtime.event_bus import emit

    # session.ready y el replay historico se mandan de forma directa y
    # secuencial ANTES de arrancar sender() (que solo consume outbox para
    # eventos EN VIVO desde este punto en adelante) - evita la carrera de
    # mezclar "eventos pasados" con "eventos nuevos" en la misma cola.
    ready_event = await emit(
        live, "session.ready", correlation_id=ready_correlation,
        payload={
            "sessionId": live.session.session_id, "resumed": resumed, "state": live.state_machine.state.value,
            "activeInvestigationId": live.session.active_investigation_id,
        },
        deliver=False,
    )
    await websocket.send_text(ready_event.model_dump_json())
    logger.info("WS session.ready sent session=%s", live.session.session_id)

    last_replayed_sequence = last_known_sequence
    if resumed and last_known_sequence:
        for row in persistence.get_events_since(live.session.session_id, last_known_sequence):
            await websocket.send_text(_row_to_event(row).model_dump_json())
            last_replayed_sequence = max(last_replayed_sequence, row["sequence"])

    # La investigacion sigue corriendo en background mientras el cliente
    # estaba desconectado (seccion 1: el agente trabaja con el workspace
    # cerrado) y nadie consumia `outbox` durante ese hueco, asi que puede
    # tener eventos duplicados (ya cubiertos por el replay de arriba, leido
    # de la persistencia) MEZCLADOS con eventos genuinamente nuevos que se
    # emitieron mientras el replay se enviaba. Se drena y filtra de forma
    # sincrona (sin await entre medio) para que sea atomico frente al loop
    # de un solo hilo: se descartan duplicados, se re-encolan los nuevos.
    _pending: list[AgentEvent] = []
    while not live.outbox.empty():
        try:
            _pending.append(live.outbox.get_nowait())
        except asyncio.QueueEmpty:
            break
    for _event in _pending:
        if _event.sequence > last_replayed_sequence:
            live.outbox.put_nowait(_event)

    rate_limiter = _RateLimiter(MAX_MESSAGES_PER_MINUTE)

    async def sender() -> None:
        while True:
            event: AgentEvent = await live.outbox.get()
            try:
                await websocket.send_text(event.model_dump_json())
                # Starlette/TestClient y algunos ASGI servers pueden completar
                # send_text de inmediato. Ceder explicitamente evita que una
                # rafaga de progreso monopolice el loop y retrase la recepcion
                # de agent.interrupt, que tiene prioridad humana.
                await asyncio.sleep(0)
            except Exception:
                return

    async def reaper() -> None:
        while True:
            await asyncio.sleep(HEARTBEAT_CHECK_INTERVAL_SECONDS)
            idle = (datetime.now(timezone.utc) - live.last_seen).total_seconds()
            if idle > SESSION_IDLE_TIMEOUT_SECONDS:
                logger.info("Sesion %s inactiva %ds, cerrando", live.session.session_id, int(idle))
                try:
                    await websocket.close(code=4408, reason="Sesion inactiva")
                except Exception:
                    pass
                return

    sender_task = asyncio.create_task(sender())
    reaper_task = asyncio.create_task(reaper())

    try:
        while True:
            raw = await websocket.receive_text()
            live.touch()
            if len(raw.encode("utf-8")) > MAX_PAYLOAD_BYTES:
                await emit(live, "agent.error", correlation_id=ready_correlation, payload={"message": "Mensaje demasiado grande", "recoverable": True})
                continue
            if not rate_limiter.allow():
                await emit(live, "agent.error", correlation_id=ready_correlation, payload={"message": "Demasiados mensajes, espera un momento.", "recoverable": True})
                continue

            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                await emit(live, "agent.error", correlation_id=ready_correlation, payload={"message": "JSON invalido", "recoverable": True})
                continue

            data.setdefault("session_id", live.session.session_id)
            data.setdefault("timestamp", now_utc().isoformat())
            data.setdefault("sequence", 0)  # el cliente no fija sequence real - solo el servidor numera su propio flujo
            try:
                event = AgentEvent.model_validate(data)
            except (ValidationError, UnknownEventType) as exc:
                await emit(live, "agent.error", correlation_id=data.get("correlation_id", ready_correlation), payload={"message": f"Evento invalido: {exc}", "recoverable": True})
                continue

            if live.already_seen(event.event_id):
                continue
            live.remember(event.event_id)

            await _dispatch_client_event(live, user, event, ip)
    except WebSocketDisconnect as exc:
        logger.info("WS disconnected session=%s code=%s", live.session.session_id, exc.code)
    finally:
        sender_task.cancel()
        reaper_task.cancel()
        if live.websocket is websocket:
            live.websocket = None
        persistence.save_session(live.session)
        runtime_audit.record_session_event(usuario=user_id, ip=ip, session_id=live.session.session_id, event="disconnected")


def _row_to_event(row: dict) -> AgentEvent:
    return AgentEvent(
        event_id=row["event_id"], session_id=row["session_id"], investigation_id=row["investigation_id"],
        step_id=row["step_id"], correlation_id=row["correlation_id"], sequence=row["sequence"],
        timestamp=row["timestamp"], event_type=row["event_type"], payload=json.loads(row["payload_json"]),
    )


async def _dispatch_client_event(live: LiveSession, user: dict, event: AgentEvent, ip: str) -> None:
    event_type = event.event_type
    payload = event.payload

    if event_type == "demo.start":
        from app.ai.demo_tour import demo_tour_enabled, fixture_for

        if not demo_tour_enabled():
            await emit(live, "agent.error", correlation_id=event.correlation_id, payload={
                "message": "La demostración automática no está habilitada en este entorno.",
                "recoverable": False,
            })
            return
        scenario_id = str(payload.get("scenarioId") or "full_operational_demo")
        mode = str(payload.get("mode") or "deterministic")
        if mode not in {"deterministic", "live"}:
            return
        try:
            fixture_id, _ = fixture_for(scenario_id)
        except KeyError:
            await emit(live, "agent.error", correlation_id=event.correlation_id, payload={
                "message": "El escenario de demostración solicitado no existe.",
                "recoverable": False,
            })
            return
        from app.ai.demo_tour import live_demo_available, seed_demo_memory
        effective_mode = mode if mode != "live" or live_demo_available() else "deterministic"
        live.demo_mode = effective_mode
        live.demo_scenario_id = scenario_id
        live.demo_fixture_id = fixture_id if effective_mode == "deterministic" else None
        if live.demo_fixture_id:
            seed_demo_memory(fixture_id=live.demo_fixture_id, user=user)
        runtime_audit.record_command(
            usuario=str(user.get("sub") or "anon"), ip=ip, session_id=live.session.session_id,
            command_type="automated_agent_demo_started", confidence="rule", source="demo_tour",
        )
        await emit(live, "demo.ready", correlation_id=event.correlation_id, payload={
            "scenarioId": scenario_id,
            "mode": effective_mode,
            "requestedMode": mode,
            "fallbackReason": "OpenAI Realtime no está configurado; se usa demo determinística." if effective_mode != mode else None,
            "fixtureId": live.demo_fixture_id,
            "classification": "AUTOMATED_AGENT_DEMO",
        })
        return

    # Etapa 7, secciones 9/32-34: turn_id lo asigna el cliente
    # (ConversationTurnManager). Solo eventos de CONTENIDO de una nueva
    # elocucion (texto/voz del usuario) cambian de dueño el turno activo -
    # deliberadamente NO se toma el turnId de agent.interrupt aca: ese
    # turnId identifica el turno NUEVO que arranca (todavia sin texto), y si
    # se aplicara antes de emitir agent.speech.stop, el evento de "se
    # detuvo" terminaria describiendo el turno equivocado (el que recien
    # empieza, no el que se esta cortando). interrupt_agent() lee el turno
    # viejo de live.current_turn_id ANTES de que nada lo pise.
    if event_type in ("user.text", "user.speech.partial", "user.speech.final"):
        turn_id = payload.get("turnId")
        if isinstance(turn_id, str) and turn_id:
            live.current_turn_id = turn_id

    if event_type in ("user.text", "user.speech.final"):
        text = str(payload.get("text", "")).strip()
        if text:
            await runtime.handle_user_text(live, user, text, event.correlation_id, ip)
        return

    if event_type == "user.intent":
        try:
            structured = command_router.StructuredAgentIntent.model_validate(payload)
        except ValidationError:
            return
        await runtime.handle_structured_intent(live, user, structured, event.correlation_id, ip)
        return

    if event_type == "user.speech.partial":
        return  # solo relevante para UI en vivo del propio cliente, el servidor no actua sobre parciales

    if event_type == "agent.pause":
        await runtime.pause_investigation(live, event.correlation_id)
        return
    if event_type == "agent.resume":
        await runtime.resume_investigation(live, event.correlation_id)
        return
    if event_type == "agent.cancel":
        await runtime.cancel_investigation(live, user, event.correlation_id, ip)
        return
    if event_type == "agent.interrupt":
        command = AgentCommand(
            type=AgentCommandType.INTERRUPT, raw_text=str(payload.get("text", "")),
            equipment_query=payload.get("equipmentQuery"),
        )
        await runtime.interrupt_agent(live, user, command, event.correlation_id, ip)
        return

    if event_type.startswith("ui_action."):
        status = event_type.split(".", 1)[1]
        try:
            ack = UIActionAcknowledgement(
                action_id=str(payload.get("actionId", "")), status=status,
                context_updated=bool(payload.get("contextUpdated", False)),
                resulting_route=payload.get("resultingRoute"),
                focused_widget_id=payload.get("focusedWidgetId"),
                selected_entity_ids=list(payload.get("selectedEntityIds", [])),
                error=payload.get("error"),
            )
        except ValidationError:
            return
        await runtime.handle_ui_action_ack(live, ack, user, ip)
        return

    if event_type in ("approval.confirmed", "approval.rejected"):
        runtime_audit.record_command(
            usuario=str(user.get("sub") or "anon"), ip=ip, session_id=live.session.session_id,
            command_type=event_type, confidence="rule",
        )
        return

    if event_type.startswith("speech.playback."):
        await _handle_speech_playback(live, user, event, ip)
        return

    if event_type == "context.update":
        changes = payload.get("changes")
        if isinstance(changes, dict):
            runtime.handle_context_update(live, changes)
        return

    if event_type == "perception.observation_reported":
        await runtime.handle_visual_observation_reported(live, user, payload, event.correlation_id, ip)
        return

    if event_type == "perception.capture_unavailable":
        runtime_audit.record_command(
            usuario=str(user.get("sub") or "anon"), ip=ip, session_id=live.session.session_id,
            command_type="perception_capture_unavailable", confidence="rule",
        )
        return

    if event_type in ("session.start", "session.resume", "session.heartbeat"):
        return  # manejados en el handshake / no requieren accion adicional


async def _handle_speech_playback(live: LiveSession, user: dict, event: AgentEvent, ip: str) -> None:
    from app.ai.runtime.event_bus import emit
    from app.ai.runtime.state_machine import AgentRuntimeState

    result = event.event_type.split(".", 2)[-1]
    segment_id = str(event.payload.get("segmentId", ""))
    latency_ms = event.payload.get("latencyMs")

    persistence.save_speech_playback(
        segment_id=segment_id, session_id=live.session.session_id, text_length=int(event.payload.get("textLength", 0)),
        priority=str(event.payload.get("priority", "status")), provider=str(event.payload.get("provider", "unknown")),
        latency_ms=latency_ms, result=result,
    )
    runtime_audit.record_speech_playback_result(
        usuario=str(user.get("sub") or "anon"), ip=ip, session_id=live.session.session_id,
        segment_id=segment_id, result=result, latency_ms=latency_ms,
    )

    if live.state_machine.state == AgentRuntimeState.SPEAKING and result in ("completed", "failed", "interrupted"):
        live.set_status(AgentRuntimeState.IDLE)
        await emit(live, "agent.state.changed", correlation_id=event.correlation_id, payload={"state": AgentRuntimeState.IDLE.value})
