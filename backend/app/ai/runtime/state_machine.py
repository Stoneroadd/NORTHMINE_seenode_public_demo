from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum


class AgentRuntimeState(str, Enum):
    IDLE = "idle"
    LISTENING = "listening"
    PLANNING = "planning"
    EXECUTING = "executing"
    VERIFYING = "verifying"
    SPEAKING = "speaking"
    PAUSED = "paused"
    INTERRUPTED = "interrupted"
    CANCELLED = "cancelled"
    FAILED = "failed"


"""Maquina de estados del Agent Runtime (Etapa 4, seccion 8 del brief).

Fuente unica de verdad del estado de una sesion - el frontend puede derivar
flags visuales (isListening, isSpeaking, etc.) pero nunca los mantiene como
verdad independiente; siempre reflejan `AgentSession.status`, que solo esta
maquina puede cambiar.

El flujo principal documentado en el brief (idle -> listening -> planning ->
executing -> verifying -> speaking -> idle) mas las transiciones adicionales
listadas ahi son el nucleo; se agregan un puñado de aristas de recuperacion
imprescindibles para que una SESION (no solo una investigacion) pueda seguir
funcionando despues de terminar/cancelar/fallar una investigacion, y para
permitir iniciar una investigacion por TEXTO sin pasar por 'listening'
(seccion 1: "escucha por voz O recibe texto"):

  - idle -> planning: comando de texto que ya trae una investigacion clara,
    sin fase de escucha por voz.
  - verifying -> idle: verificacion completada sin nada que hablar (voz
    silenciada, TTS no disponible, o resultado sin milestones que anunciar).
  - interrupted -> idle: el usuario interrumpe y no continua con una nueva
    instruccion (equivalente a cancelar la escucha).
  - cancelled -> idle / failed -> idle: la sesion se recupera para la
    siguiente investigacion en la MISMA sesion persistente.
"""

_ALLOWED_TRANSITIONS: dict[AgentRuntimeState, frozenset[AgentRuntimeState]] = {
    AgentRuntimeState.IDLE: frozenset({AgentRuntimeState.LISTENING, AgentRuntimeState.PLANNING}),
    AgentRuntimeState.LISTENING: frozenset({AgentRuntimeState.PLANNING, AgentRuntimeState.IDLE, AgentRuntimeState.CANCELLED}),
    AgentRuntimeState.PLANNING: frozenset({AgentRuntimeState.EXECUTING, AgentRuntimeState.CANCELLED}),
    AgentRuntimeState.EXECUTING: frozenset({AgentRuntimeState.VERIFYING, AgentRuntimeState.PAUSED, AgentRuntimeState.CANCELLED}),
    AgentRuntimeState.PAUSED: frozenset({AgentRuntimeState.EXECUTING, AgentRuntimeState.CANCELLED}),
    AgentRuntimeState.VERIFYING: frozenset({AgentRuntimeState.SPEAKING, AgentRuntimeState.IDLE}),
    AgentRuntimeState.SPEAKING: frozenset({AgentRuntimeState.IDLE, AgentRuntimeState.INTERRUPTED}),
    AgentRuntimeState.INTERRUPTED: frozenset({AgentRuntimeState.LISTENING, AgentRuntimeState.IDLE, AgentRuntimeState.CANCELLED}),
    AgentRuntimeState.CANCELLED: frozenset({AgentRuntimeState.IDLE}),
    AgentRuntimeState.FAILED: frozenset({AgentRuntimeState.IDLE}),
}


class InvalidStateTransition(Exception):
    def __init__(self, current: AgentRuntimeState, target: AgentRuntimeState):
        self.current = current
        self.target = target
        super().__init__(f"Transicion invalida: {current.value} -> {target.value}")


class AgentStateMachine:
    """Maquina de estados de una sesion. Cada AgentSession posee una."""

    def __init__(self, initial: AgentRuntimeState = AgentRuntimeState.IDLE) -> None:
        self._state = initial
        self.history: list[tuple[AgentRuntimeState, AgentRuntimeState, datetime]] = []

    @property
    def state(self) -> AgentRuntimeState:
        return self._state

    def can_transition(self, target: AgentRuntimeState) -> bool:
        if target == self._state:
            return True  # no-op, siempre permitido
        if target == AgentRuntimeState.FAILED:
            return True  # "any -> failed" (seccion 8)
        return target in _ALLOWED_TRANSITIONS.get(self._state, frozenset())

    def transition(self, target: AgentRuntimeState) -> AgentRuntimeState:
        if not self.can_transition(target):
            raise InvalidStateTransition(self._state, target)
        previous = self._state
        self._state = target
        if previous != target:
            self.history.append((previous, target, datetime.now(timezone.utc)))
        return self._state
