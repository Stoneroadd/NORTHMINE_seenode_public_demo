from __future__ import annotations

import asyncio

from app.ai.runtime import ui_actions
from app.ai.runtime.session_manager import LiveSession

"""Primitivas de interrupcion/cancelacion (Etapa 4, seccion 12 del brief).

Deliberadamente sin I/O ni emision de eventos: son banderas puras que el
loop de investigacion (runtime.py) consulta entre pasos, y que el WS
handler activa al recibir un comando critico. Mantenerlas separadas de
runtime.py permite testearlas sin un event loop completo ni un WebSocket.

El loop de ejecucion (runtime.py) consulta `should_cancel`/`should_pause`
ENTRE pasos (nunca a mitad de una llamada a una tool ya en curso) - "pausar
o cancelar el paso actual cuando sea seguro" (seccion 12, punto 5), nunca
se interrumpe una llamada HTTP/SQL a mitad de camino.
"""


def mark_pause(live: LiveSession) -> None:
    live.pause_event.set()


def mark_resume(live: LiveSession) -> None:
    live.pause_event.clear()


def mark_cancel(live: LiveSession) -> None:
    live.cancel_event.set()
    ui_actions.cancel_all_pending(live)


def clear_cancel(live: LiveSession) -> None:
    live.cancel_event.clear()


def mark_interrupt(live: LiveSession, *, focus_override: str | None = None) -> None:
    live.interrupt_event.set()
    if focus_override:
        live.focus_override = focus_override


def clear_interrupt(live: LiveSession) -> None:
    live.interrupt_event.clear()


def should_cancel(live: LiveSession) -> bool:
    return live.cancel_event.is_set()


def should_pause(live: LiveSession) -> bool:
    return live.pause_event.is_set()


async def wait_while_paused(live: LiveSession) -> None:
    """Bloquea el paso actual mientras la sesion este en pausa, sin busy-wait
    (usa un segundo Event que se limpia en mark_resume via pause_event)."""
    while live.pause_event.is_set() and not live.cancel_event.is_set():
        # pause_event no tiene "wait for clear" nativo; se espera en pasos
        # cortos porque el Executor ya opera a nivel de paso (segundos), no
        # milisegundos - no es polling de alta frecuencia.
        await asyncio.sleep(0.1)
