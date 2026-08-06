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


def record_investigation(
    *,
    usuario: str,
    ip: str,
    investigation_id: str,
    investigation_type: str,
    status: str,
    confidence: str,
) -> None:
    log_event(
        usuario=usuario,
        ip=ip,
        accion="ai_copilot_investigation",
        resultado="ok" if status == "completed" else status,
        metodo="POST",
        endpoint="/api/ai-copilot/investigations",
        status_code=200,
        detalle={
            "investigation_id": investigation_id,
            "type": investigation_type,
            "status": status,
            "confidence": confidence,
        },
    )


def record_investigation_ui_step(
    *,
    usuario: str,
    ip: str,
    investigation_id: str,
    step_id: str,
    status: str,
    context_updated: bool,
) -> None:
    log_event(
        usuario=usuario,
        ip=ip,
        accion="ai_copilot_investigation_ui_step",
        resultado=status,
        metodo="POST",
        endpoint=f"/api/ai-copilot/investigations/{investigation_id}/ui-steps/{step_id}/report",
        status_code=200,
        detalle={
            "investigation_id": investigation_id,
            "step_id": step_id,
            "status": status,
            "context_updated": context_updated,
        },
    )


# ── Etapa 4: Agent Runtime (sesion, eventos, ack, interrupcion, voz) ───────
# Nunca se registra la API key, el JWT, cookies ni headers de autorizacion
# (seccion 26 del brief) - estas funciones solo reciben identificadores,
# duraciones y metadatos, nunca secretos ni el body crudo de una request.

def record_session_event(
    *, usuario: str, ip: str, session_id: str, event: str, status: str | None = None,
) -> None:
    log_event(
        usuario=usuario, ip=ip, accion="agent_runtime_session", resultado=status,
        metodo="WS", endpoint="/api/ai-agent/ws",
        detalle={"session_id": session_id, "event": event},
    )


def record_command(
    *, usuario: str, ip: str, session_id: str, command_type: str, confidence: str,
) -> None:
    log_event(
        usuario=usuario, ip=ip, accion="agent_runtime_command", resultado="ok",
        metodo="WS", endpoint="/api/ai-agent/ws",
        detalle={"session_id": session_id, "command_type": command_type, "confidence": confidence},
    )


def record_ui_action_ack(
    *, usuario: str, ip: str, session_id: str, action_id: str, status: str, requirement: str,
) -> None:
    log_event(
        usuario=usuario, ip=ip, accion="agent_runtime_ui_ack", resultado=status,
        metodo="WS", endpoint="/api/ai-agent/ws",
        detalle={"session_id": session_id, "action_id": action_id, "status": status, "requirement": requirement},
    )


def record_interruption(
    *, usuario: str, ip: str, session_id: str, kind: str, investigation_id: str | None, plan_modified: bool,
) -> None:
    log_event(
        usuario=usuario, ip=ip, accion="agent_runtime_interruption", resultado=kind,
        metodo="WS", endpoint="/api/ai-agent/ws",
        detalle={"session_id": session_id, "investigation_id": investigation_id, "plan_modified": plan_modified},
    )


def record_speech_request(
    *, usuario: str, ip: str, segment_id: str, priority: str, text_length: int, text_preview: str, provider: str,
) -> None:
    log_event(
        usuario=usuario, ip=ip, accion="agent_runtime_speech", resultado="requested",
        metodo="POST", endpoint="/api/ai-agent/speech",
        detalle={
            "segment_id": segment_id, "priority": priority, "text_length": text_length,
            "text_preview": text_preview, "provider": provider,
        },
    )


def record_speech_playback_result(
    *, usuario: str, ip: str, session_id: str, segment_id: str, result: str, latency_ms: int | None,
) -> None:
    log_event(
        usuario=usuario, ip=ip, accion="agent_runtime_speech_playback", resultado=result,
        metodo="WS", endpoint="/api/ai-agent/ws",
        duracion_ms=latency_ms or 0,
        detalle={"session_id": session_id, "segment_id": segment_id},
    )
