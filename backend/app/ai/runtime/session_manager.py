from __future__ import annotations

import asyncio
import uuid
from datetime import datetime, timezone

from pydantic import BaseModel

from app.ai.memory.session_memory import SessionMemory
from app.ai.perception_schemas import SemanticPerceptionState
from app.ai.runtime.state_machine import AgentRuntimeState, AgentStateMachine

"""Sesiones del Agent Runtime (Etapa 4, seccion 5 del brief).

Una AgentSession sobrevive apertura/cierre del workspace, navegacion,
reapertura del orbe y reconexion temporal - vive en AgentSessionManager
(memoria de proceso) mientras el proceso backend corre, y se persiste
(runtime/persistence.py) para que una reconexion pueda recuperar el ultimo
estado conocido. Nunca se mezclan sesiones de usuarios distintos: el
manager indexa por session_id pero SIEMPRE valida user_id antes de devolver
o mutar una sesion (ver get_session_for_user).
"""


def new_session_id() -> str:
    return f"asess-{uuid.uuid4().hex[:16]}"


class AgentSession(BaseModel):
    session_id: str
    user_id: str
    role: str
    company_id: str | None = None
    site_id: str | None = None
    status: AgentRuntimeState = AgentRuntimeState.IDLE
    active_investigation_id: str | None = None
    created_at: datetime
    updated_at: datetime


class SessionNotFound(Exception):
    pass


class SessionOwnershipError(Exception):
    """Se intento acceder a una sesion que pertenece a otro usuario."""


_DEDUP_WINDOW = 500


class LiveSession:
    """Estado en memoria de una sesion activa: modelo persistible +
    maquina de estados + lock de serializacion + conexion WS actual."""

    __slots__ = (
        "session", "state_machine", "lock", "websocket", "last_seen", "next_sequence",
        "outbox", "seen_client_event_ids", "current_investigation_task", "pending_ui_acks",
        "event_observers",
        "pause_event", "cancel_event", "interrupt_event", "focus_override", "perception",
        "memory", "quiet_mode", "current_turn_id",
    )

    def __init__(self, session: AgentSession):
        self.session = session
        self.state_machine = AgentStateMachine(session.status)
        self.lock = asyncio.Lock()
        self.websocket = None
        self.last_seen = datetime.now(timezone.utc)
        self.next_sequence = 1
        self.outbox: asyncio.Queue = asyncio.Queue()
        self.seen_client_event_ids: list[str] = []
        self.current_investigation_task: asyncio.Task | None = None
        self.pending_ui_acks: dict[str, asyncio.Future] = {}
        # Read-only taps for server-side transports (for example OpenAI
        # Realtime sideband). Observers receive copies of public AgentEvents;
        # they never drain the browser WebSocket outbox or bypass persistence.
        self.event_observers: set[asyncio.Queue] = set()
        self.pause_event = asyncio.Event()
        self.cancel_event = asyncio.Event()
        self.interrupt_event = asyncio.Event()
        self.focus_override: str | None = None
        # Etapa 5: ultimo estado semantico conocido (Nivel 1 de percepcion),
        # actualizado via parches incrementales `context.update` - nunca se
        # reconstruye completo en cada mensaje.
        self.perception = SemanticPerceptionState()
        # Etapa 6: memoria de sesion (seccion 3.1) y modo de proactividad
        # (seccion 16) - ambos viven en proceso, se pierden al cerrar la
        # sesion (nunca se persisten como tales).
        self.memory = SessionMemory()
        self.quiet_mode: str = "normal"
        # Etapa 7: identificador de turno conversacional (asignado por el
        # cliente, nunca por el servidor - ver ConversationTurnManager en el
        # frontend). Vive en memoria, no se persiste: sirve solo para que
        # `_speak()` estampe a que turno pertenece cada segmento de voz, y
        # asi el cliente pueda descartar audio de un turno ya interrumpido
        # (secciones 19, 32-33 del brief) sin que el servidor necesite su
        # propio concepto de "turno" duplicando el de investigation_id.
        self.current_turn_id: str | None = None

    def already_seen(self, event_id: str) -> bool:
        return event_id in self.seen_client_event_ids

    def remember(self, event_id: str) -> None:
        self.seen_client_event_ids.append(event_id)
        if len(self.seen_client_event_ids) > _DEDUP_WINDOW:
            self.seen_client_event_ids.pop(0)

    def touch(self) -> None:
        self.last_seen = datetime.now(timezone.utc)

    def allocate_sequence(self) -> int:
        seq = self.next_sequence
        self.next_sequence += 1
        return seq

    def set_status(self, status: AgentRuntimeState) -> None:
        self.state_machine.transition(status)
        self.session = self.session.model_copy(update={"status": status, "updated_at": datetime.now(timezone.utc)})


class AgentSessionManager:
    """Registro de sesiones vivas del proceso. Un usuario puede tener varias
    sesiones (una por dispositivo/pestaña); cada session_id es independiente."""

    def __init__(self) -> None:
        self._sessions: dict[str, LiveSession] = {}
        self._lock = asyncio.Lock()

    async def create(self, *, user_id: str, role: str, company_id: str | None, site_id: str | None) -> LiveSession:
        now = datetime.now(timezone.utc)
        session = AgentSession(
            session_id=new_session_id(),
            user_id=user_id,
            role=role,
            company_id=company_id,
            site_id=site_id,
            status=AgentRuntimeState.IDLE,
            created_at=now,
            updated_at=now,
        )
        live = LiveSession(session)
        async with self._lock:
            self._sessions[session.session_id] = live
        return live

    async def get_for_user(self, session_id: str, user_id: str) -> LiveSession:
        async with self._lock:
            live = self._sessions.get(session_id)
        if live is None:
            raise SessionNotFound(session_id)
        if live.session.user_id != user_id:
            raise SessionOwnershipError(session_id)
        return live

    async def try_get_for_user(self, session_id: str, user_id: str) -> LiveSession | None:
        try:
            return await self.get_for_user(session_id, user_id)
        except (SessionNotFound, SessionOwnershipError):
            return None

    async def remove(self, session_id: str) -> None:
        async with self._lock:
            self._sessions.pop(session_id, None)

    async def sessions_for_user(self, user_id: str) -> list[LiveSession]:
        async with self._lock:
            return [s for s in self._sessions.values() if s.session.user_id == user_id]

    async def sessions_for_scope(self, company_id: str | None, site_id: str | None) -> list[LiveSession]:
        """Etapa 6: entrega de eventos proactivos no ligados a un watch de
        usuario especifico (p.ej. un trigger de faena) - todas las sesiones
        vivas de ese company/site, no solo la que disparo el evento."""
        async with self._lock:
            return [
                s for s in self._sessions.values()
                if s.session.company_id == company_id and s.session.site_id == site_id
            ]

    def count(self) -> int:
        return len(self._sessions)


# Singleton de proceso - un solo registro de sesiones vivas por instancia del
# backend (igual que el resto de repositorios/registries del proyecto).
session_manager = AgentSessionManager()
