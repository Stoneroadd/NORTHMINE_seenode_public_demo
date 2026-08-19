from __future__ import annotations

import asyncio
from typing import Any

from app.ai.runtime.protocol import AgentEvent, build_server_event
from app.ai.runtime.session_manager import LiveSession

"""Event bus por sesion (Etapa 4, seccion 6-7 del brief).

No es un bus global: cada LiveSession tiene su propia cola de salida
(`outbox`) y su propio contador de `sequence` monotono - dos sesiones nunca
comparten numeracion, y el WS handler es el unico consumidor de `outbox`
(seccion 7: "Una sesion por dispositivo o cliente"). Cada evento emitido se
persiste antes de encolarse para que una reconexion pueda reproducir lo que
el cliente se perdio (`get_events_since`, ver persistence.py).
"""


async def emit(
    live: LiveSession,
    event_type: str,
    *,
    correlation_id: str,
    investigation_id: str | None = None,
    step_id: str | None = None,
    payload: dict[str, Any] | None = None,
    deliver: bool = True,
) -> AgentEvent:
    """Construye, persiste y (por defecto) encola el evento para el sender()
    de la sesion. `deliver=False` se usa solo en el handshake (session.ready)
    cuando el WS handler necesita mandarlo el mismo, de forma sincrona,
    ANTES de que exista un sender() drenando `outbox` - evita mezclar ese
    envio inicial con el replay historico o con eventos en vivo."""
    from app.ai.runtime import persistence  # import diferido: evita ciclo con persistence -> protocol

    event = build_server_event(
        session_id=live.session.session_id,
        event_type=event_type,
        sequence=live.allocate_sequence(),
        correlation_id=correlation_id,
        investigation_id=investigation_id or live.session.active_investigation_id,
        step_id=step_id,
        payload=payload,
    )
    persistence.save_event(event)
    for observer in tuple(live.event_observers):
        try:
            observer.put_nowait(event)
        except asyncio.QueueFull:
            # An optional observer must never block the authoritative Runtime
            # or the browser's event stream.
            pass
    if deliver:
        await live.outbox.put(event)
    return event
