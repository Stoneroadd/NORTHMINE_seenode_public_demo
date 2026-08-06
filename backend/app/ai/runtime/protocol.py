from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from pydantic import BaseModel, Field, field_validator

"""Protocolo de eventos del Agent Runtime (Etapa 4, seccion 6 del brief).

Eventos tipados, validados con Pydantic y versionados - el WS rechaza
cualquier `event_type` fuera de las dos listas cerradas de abajo (seccion 7:
"Rechazo de eventos desconocidos"), y cada evento conserva orden real por
`sequence` (entero monotono por sesion, seccion 6: "Todos los eventos deben
conservar orden por sequence").
"""

PROTOCOL_VERSION = "1.0"

# ── Cliente -> servidor ──────────────────────────────────────────────────
CLIENT_EVENT_TYPES: frozenset[str] = frozenset(
    {
        "session.start",
        "session.resume",
        "session.heartbeat",
        "context.update",
        "user.text",
        "user.speech.partial",
        "user.speech.final",
        "agent.pause",
        "agent.resume",
        "agent.cancel",
        "agent.interrupt",
        "ui_action.completed",
        "ui_action.failed",
        "ui_action.rejected",
        "ui_action.cancelled",
        "approval.confirmed",
        "approval.rejected",
        "speech.playback.started",
        "speech.playback.completed",
        "speech.playback.failed",
        "speech.playback.interrupted",
    }
)

# ── Servidor -> cliente ───────────────────────────────────────────────────
SERVER_EVENT_TYPES: frozenset[str] = frozenset(
    {
        "session.ready",
        "agent.state.changed",
        "agent.plan.created",
        "agent.plan.updated",
        "step.started",
        "step.completed",
        "tool.started",
        "tool.completed",
        "tool.failed",
        "ui_action.requested",
        "ui_action.waiting",
        "ui_action.completed",
        "ui_action.failed",
        "verification.started",
        "verification.completed",
        "hypothesis.updated",
        "finding.created",
        "agent.text.delta",
        "agent.speech.segment",
        "agent.speech.stop",
        "investigation.completed",
        "investigation.failed",
        "investigation.cancelled",
        "agent.error",
    }
)

ALL_EVENT_TYPES: frozenset[str] = CLIENT_EVENT_TYPES | SERVER_EVENT_TYPES


class UnknownEventType(Exception):
    def __init__(self, event_type: str):
        self.event_type = event_type
        super().__init__(f"Tipo de evento desconocido: {event_type!r}")


class AgentEvent(BaseModel):
    protocol_version: str = PROTOCOL_VERSION
    event_id: str
    session_id: str
    investigation_id: str | None = None
    step_id: str | None = None
    correlation_id: str
    sequence: int
    timestamp: datetime
    event_type: str
    payload: dict[str, Any] = Field(default_factory=dict)

    @field_validator("event_type")
    @classmethod
    def _event_type_is_known(cls, value: str) -> str:
        if value not in ALL_EVENT_TYPES:
            raise UnknownEventType(value)
        return value


def new_event_id() -> str:
    return f"evt-{uuid.uuid4().hex[:12]}"


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def build_server_event(
    *,
    session_id: str,
    event_type: str,
    sequence: int,
    correlation_id: str,
    investigation_id: str | None = None,
    step_id: str | None = None,
    payload: dict[str, Any] | None = None,
) -> AgentEvent:
    if event_type not in SERVER_EVENT_TYPES:
        raise UnknownEventType(event_type)
    return AgentEvent(
        event_id=new_event_id(),
        session_id=session_id,
        investigation_id=investigation_id,
        step_id=step_id,
        correlation_id=correlation_id,
        sequence=sequence,
        timestamp=now_utc(),
        event_type=event_type,
        payload=payload or {},
    )
