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
    *, usuario: str, ip: str, session_id: str, command_type: str, confidence: str, source: str = "conversation",
) -> None:
    log_event(
        usuario=usuario, ip=ip, accion="agent_runtime_command", resultado="ok",
        metodo="WS", endpoint="/api/ai-agent/ws",
        detalle={"session_id": session_id, "command_type": command_type, "confidence": confidence, "source": source},
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


def record_perception_capture(
    *, usuario: str, ip: str, capture_id: str, target_type: str, widget_id: str | None,
    image_bytes: int, provider: str, duration_ms: int,
) -> None:
    log_event(
        usuario=usuario, ip=ip, accion="agent_perception_capture", resultado="ok",
        metodo="POST", endpoint="/api/ai-agent/vision/analyze",
        duracion_ms=duration_ms,
        detalle={
            "capture_id": capture_id, "target_type": target_type, "widget_id": widget_id,
            "image_bytes": image_bytes, "provider": provider,
        },
    )


def record_visual_observation(
    *, usuario: str, ip: str, session_id: str, observation_id: str, capture_id: str,
    confidence: str, verification_status: str,
) -> None:
    log_event(
        usuario=usuario, ip=ip, accion="agent_perception_observation", resultado=verification_status,
        metodo="WS", endpoint="/api/ai-agent/ws",
        detalle={
            "session_id": session_id, "observation_id": observation_id, "capture_id": capture_id,
            "confidence": confidence,
        },
    )


def record_perception_conflict(
    *, usuario: str, ip: str, session_id: str, conflict_id: str, widget_id: str | None,
) -> None:
    log_event(
        usuario=usuario, ip=ip, accion="agent_perception_conflict", resultado="detected",
        metodo="WS", endpoint="/api/ai-agent/ws",
        detalle={"session_id": session_id, "conflict_id": conflict_id, "widget_id": widget_id},
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


# ── Etapa 6: memoria, proactividad, work products ──────────────────────────
# Nunca se registra el contenido completo de una investigacion/informe, solo
# identificadores y metadatos (seccion 40 del brief: 'no registrar secretos').

def record_memory_created(*, usuario: str, ip: str, kind: str, ref_id: str, entity: str | None = None) -> None:
    log_event(
        usuario=usuario, ip=ip, accion="agent_memory_created", resultado="ok",
        metodo="WS", endpoint="/api/ai-agent/ws",
        detalle={"kind": kind, "ref_id": ref_id, "entity": entity},
    )


def record_memory_retrieved(*, usuario: str, ip: str, session_id: str, query_entity: str | None, found: bool) -> None:
    log_event(
        usuario=usuario, ip=ip, accion="agent_memory_retrieved", resultado="found" if found else "not_found",
        metodo="WS", endpoint="/api/ai-agent/ws",
        detalle={"session_id": session_id, "query_entity": query_entity},
    )


def record_watch_created(*, usuario: str, ip: str, watch_id: str, entity_ids: list[str], metric: str) -> None:
    log_event(
        usuario=usuario, ip=ip, accion="agent_watch_created", resultado="ok",
        metodo="WS", endpoint="/api/ai-agent/ws",
        detalle={"watch_id": watch_id, "entity_ids": entity_ids, "metric": metric},
    )


def record_watch_triggered(*, usuario: str, ip: str, watch_id: str, proactive_event_id: str) -> None:
    log_event(
        usuario=usuario, ip=ip, accion="agent_watch_triggered", resultado="triggered",
        metodo="WS", endpoint="/api/ai-agent/ws",
        detalle={"watch_id": watch_id, "proactive_event_id": proactive_event_id},
    )


def record_watch_cancelled(*, usuario: str, ip: str, watch_id: str) -> None:
    log_event(
        usuario=usuario, ip=ip, accion="agent_watch_cancelled", resultado="cancelled",
        metodo="POST", endpoint=f"/api/ai-agent/work-products/watches/{watch_id}/cancel",
        detalle={"watch_id": watch_id},
    )


def record_proactive_event_emitted(*, usuario: str | None, ip: str, proactive_event_id: str, event_type: str, severity: str) -> None:
    log_event(
        usuario=usuario or "system", ip=ip, accion="agent_proactive_event_emitted", resultado=severity,
        metodo="WS", endpoint="/api/ai-agent/ws",
        detalle={"proactive_event_id": proactive_event_id, "event_type": event_type},
    )


def record_proactive_event_dismissed(*, usuario: str, ip: str, proactive_event_id: str, status: str) -> None:
    log_event(
        usuario=usuario, ip=ip, accion="agent_proactive_event_dismissed", resultado=status,
        metodo="POST", endpoint=f"/api/ai-agent/work-products/proactive-events/{proactive_event_id}",
        detalle={"proactive_event_id": proactive_event_id, "status": status},
    )


def record_report_generated(*, usuario: str, ip: str, report_id: str, report_type: str) -> None:
    log_event(
        usuario=usuario, ip=ip, accion="agent_report_generated", resultado="ok",
        metodo="WS", endpoint="/api/ai-agent/ws",
        detalle={"report_id": report_id, "report_type": report_type},
    )


def record_report_modified(*, usuario: str, ip: str, report_id: str, version: int, modification_preview: str) -> None:
    log_event(
        usuario=usuario, ip=ip, accion="agent_report_modified", resultado="ok",
        metodo="WS", endpoint="/api/ai-agent/ws",
        detalle={"report_id": report_id, "version": version, "modification_preview": modification_preview[:200]},
    )


def record_report_decision(*, usuario: str, ip: str, report_id: str, decision: str) -> None:
    log_event(
        usuario=usuario, ip=ip, accion="agent_report_decision", resultado=decision,
        metodo="POST", endpoint=f"/api/ai-agent/work-products/reports/{report_id}/{decision}",
        detalle={"report_id": report_id, "decision": decision},
    )


def record_handover_generated(*, usuario: str, ip: str, handover_id: str) -> None:
    log_event(
        usuario=usuario, ip=ip, accion="agent_handover_generated", resultado="ok",
        metodo="WS", endpoint="/api/ai-agent/ws",
        detalle={"handover_id": handover_id},
    )


def record_handover_decision(*, usuario: str, ip: str, handover_id: str, decision: str) -> None:
    log_event(
        usuario=usuario, ip=ip, accion="agent_handover_decision", resultado=decision,
        metodo="POST", endpoint=f"/api/ai-agent/work-products/handovers/{handover_id}/{decision}",
        detalle={"handover_id": handover_id, "decision": decision},
    )


def record_task_draft_created(*, usuario: str, ip: str, task_id: str, investigation_id: str | None) -> None:
    log_event(
        usuario=usuario, ip=ip, accion="agent_task_draft_created", resultado="ok",
        metodo="WS", endpoint="/api/ai-agent/ws",
        detalle={"task_id": task_id, "investigation_id": investigation_id},
    )


def record_task_draft_decision(*, usuario: str, ip: str, task_id: str, decision: str) -> None:
    log_event(
        usuario=usuario, ip=ip, accion="agent_task_draft_decision", resultado=decision,
        metodo="POST", endpoint=f"/api/ai-agent/work-products/tasks/{task_id}/{decision}",
        detalle={"task_id": task_id, "decision": decision},
    )
