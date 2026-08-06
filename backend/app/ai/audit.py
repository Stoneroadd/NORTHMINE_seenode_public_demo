from __future__ import annotations

from typing import Any

from app.core.audit import log_event

"""Envoltorio delgado sobre app.core.audit.log_event para las interacciones
del Copilot: mismo almacen y formato que el resto de NORTHMINE (una sola
tabla de auditoria), con un 'detalle' consistente para poder filtrar por
accion='ai_copilot_*' desde administracion.
"""


def record_chat_interaction(
    *,
    usuario: str,
    ip: str,
    role: str,
    conversation_id: str,
    message_preview: str,
    context: dict[str, Any],
    tools_used: list[str],
    confidence: str,
    requires_approval: bool,
    degraded: bool,
    latency_ms: int,
    status_code: int,
) -> None:
    log_event(
        usuario=usuario,
        ip=ip,
        accion="ai_copilot_chat",
        resultado="degraded" if degraded else ("ok" if status_code < 400 else "error"),
        metodo="POST",
        endpoint="/api/ai-copilot/chat",
        status_code=status_code,
        duracion_ms=latency_ms,
        detalle={
            "role": role,
            "conversation_id": conversation_id,
            "message_preview": message_preview[:200],
            "context": context,
            "tools_used": tools_used,
            "confidence": confidence,
            "requires_approval": requires_approval,
            "degraded": degraded,
        },
    )


def record_task_action(*, usuario: str, ip: str, task_id: str, action: str, status_code: int) -> None:
    log_event(
        usuario=usuario,
        ip=ip,
        accion=f"ai_copilot_task_{action}",
        metodo="POST",
        endpoint=f"/api/ai-copilot/tasks/{task_id}/{action}",
        status_code=status_code,
        detalle={"task_id": task_id, "action": action},
    )


def record_feedback(*, usuario: str, ip: str, message_id: str, rating: str) -> None:
    log_event(
        usuario=usuario,
        ip=ip,
        accion="ai_copilot_feedback",
        metodo="POST",
        endpoint="/api/ai-copilot/feedback",
        status_code=200,
        detalle={"message_id": message_id, "rating": rating},
    )
