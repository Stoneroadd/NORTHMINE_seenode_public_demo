from __future__ import annotations

import asyncio
from typing import Literal

from pydantic import BaseModel

from app.ai.runtime.session_manager import LiveSession

"""Sincronizacion real de UI actions (Etapa 4, seccion 9 del brief).

Reemplaza el best-effort de Etapa 3: cuando un paso 'ui_action' es
`required`, el Executor NO continua hasta recibir un acknowledgement real
del frontend (o hasta que expire el timeout). Se implementa con un
`asyncio.Future` por `action_id` guardado en la sesion viva - nunca espera
activa (polling): `wait_for_ack` simplemente `await`s el future, que
`resolve_ack` completa cuando llega el evento `ui_action.completed/failed/
rejected/cancelled` del cliente.
"""

UIActionStatus = Literal["completed", "failed", "rejected", "cancelled", "timeout"]


class UIActionAcknowledgement(BaseModel):
    action_id: str
    status: UIActionStatus
    context_updated: bool = False
    resulting_route: str | None = None
    focused_widget_id: str | None = None
    selected_entity_ids: list[str] = []
    error: str | None = None


def register_wait(live: LiveSession, action_id: str) -> asyncio.Future:
    future: asyncio.Future = asyncio.get_running_loop().create_future()
    live.pending_ui_acks[action_id] = future
    return future


def resolve_ack(live: LiveSession, ack: UIActionAcknowledgement) -> bool:
    """Completa el future en espera para `ack.action_id`, si existe.
    Devuelve False si no habia nadie esperando (accion ya expiro o no era
    una accion pendiente conocida) - el llamador debe ignorar el evento."""
    future = live.pending_ui_acks.pop(ack.action_id, None)
    if future is None or future.done():
        return False
    future.set_result(ack)
    return True


async def wait_for_ack(live: LiveSession, action_id: str, timeout_seconds: float) -> UIActionAcknowledgement:
    future = live.pending_ui_acks.get(action_id)
    if future is None:
        future = register_wait(live, action_id)
    try:
        return await asyncio.wait_for(future, timeout=timeout_seconds)
    except asyncio.TimeoutError:
        return UIActionAcknowledgement(action_id=action_id, status="timeout", error=f"Sin respuesta tras {timeout_seconds}s")
    finally:
        live.pending_ui_acks.pop(action_id, None)


def cancel_all_pending(live: LiveSession) -> None:
    """Usado en cancelacion/interrupcion (seccion 12): libera cualquier
    espera de acknowledgement activa para que el Executor no quede colgado."""
    for action_id, future in list(live.pending_ui_acks.items()):
        if not future.done():
            future.set_result(UIActionAcknowledgement(action_id=action_id, status="cancelled"))
        live.pending_ui_acks.pop(action_id, None)
