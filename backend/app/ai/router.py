from __future__ import annotations

import asyncio
import json
import time
from typing import Any, AsyncIterator

from fastapi import APIRouter, HTTPException, Request, status
from fastapi.responses import StreamingResponse

from app.ai import audit, policies, repository
from app.ai.orchestrator import run_chat_turn
from app.ai.schemas import ChatRequest, FeedbackRequest, TaskActionRequest
from app.core.config import get_settings
from app.core.dependencies import RequireAny, RequireOperador
from app.core.request_context import require_resource_owner
from app.core.rate_limit import endpoint_limit, limiter

router = APIRouter(prefix="/ai-copilot", tags=["ai-copilot"])


def _client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


@router.get("/status")
def copilot_status(user: dict = RequireAny) -> dict[str, Any]:
    settings = get_settings()
    available = bool(settings.ai_enabled and settings.anthropic_api_key)
    return {
        "ai_enabled": settings.ai_enabled,
        "available": available,
        "provider": settings.ai_provider,
        "model": settings.ai_model if available else None,
        "message": None if available else policies.DEGRADED_MODE_NOTICE,
        "disclaimer": policies.DEGRADED_MODE_NOTICE if not available else None,
    }


async def _stream_response(payload_iter: AsyncIterator[dict[str, Any]]) -> AsyncIterator[bytes]:
    async for event in payload_iter:
        yield (json.dumps(event, default=str) + "\n").encode("utf-8")


async def _chat_events(request: Request, payload: ChatRequest, user: dict) -> AsyncIterator[dict[str, Any]]:
    started = time.perf_counter()
    yield {"type": "status", "phase": "analyzing_intent"}
    yield {"type": "status", "phase": "consulting_data"}

    response, tools_used = await run_chat_turn(
        user=user,
        message=payload.message,
        context=payload.context,
        conversation_id=payload.conversation_id,
    )

    for execution in response.tool_executions:
        yield {
            "type": "tool_execution",
            "name": execution.name,
            "status": execution.status,
            "duration_ms": execution.duration_ms,
            "summary": execution.summary,
        }

    for action in response.ui_actions:
        yield {"type": "agent.action.proposed", "action": action.model_dump()}

    yield {"type": "status", "phase": "preparing_recommendation" if not response.degraded else "insufficient_information"}

    text = response.message
    chunk_size = 48
    for i in range(0, len(text), chunk_size):
        yield {"type": "token", "text": text[i : i + chunk_size]}
        await asyncio.sleep(0.012)

    yield {"type": "status", "phase": "awaiting_approval" if response.requires_human_approval else "done"}
    yield {"type": "final", "response": response.model_dump()}

    latency_ms = int((time.perf_counter() - started) * 1000)
    audit.record_chat_interaction(
        usuario=str(user.get("sub") or "anon"),
        ip=_client_ip(request),
        role=str(user.get("rol") or ""),
        conversation_id=response.conversation_id,
        message_preview=payload.message,
        context=payload.context.model_dump(),
        tools_used=tools_used,
        confidence=response.confidence.level,
        requires_approval=response.requires_human_approval,
        degraded=response.degraded,
        latency_ms=latency_ms,
        status_code=200,
    )


@router.post("/chat")
@limiter.limit(endpoint_limit("/api/ai-copilot/chat"))
async def chat(request: Request, payload: ChatRequest, user: dict = RequireAny) -> StreamingResponse:
    if not policies.can_use_chat(str(user.get("rol") or "")):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Rol sin acceso al copiloto de IA")
    return StreamingResponse(
        _stream_response(_chat_events(request, payload, user)),
        media_type="application/x-ndjson",
        headers={"Cache-Control": "no-store", "X-Accel-Buffering": "no"},
    )


@router.get("/tasks")
def list_tasks(request: Request, status_filter: str | None = None, user: dict = RequireAny) -> dict[str, Any]:
    items = repository.list_task_drafts(status=status_filter, created_by=str(user.get("sub") or "anon"))
    return {"items": items, "count": len(items)}


@router.post("/tasks/{task_id}/approve")
def approve_task(task_id: str, request: Request, payload: TaskActionRequest, user: dict = RequireOperador) -> dict[str, Any]:
    return _transition_task(task_id, "approved", request, user)


@router.post("/tasks/{task_id}/reject")
def reject_task(task_id: str, request: Request, payload: TaskActionRequest, user: dict = RequireOperador) -> dict[str, Any]:
    return _transition_task(task_id, "rejected", request, user)


@router.post("/tasks/{task_id}/complete")
def complete_task(task_id: str, request: Request, payload: TaskActionRequest, user: dict = RequireOperador) -> dict[str, Any]:
    return _transition_task(task_id, "completed", request, user)


def _transition_task(task_id: str, new_status: str, request: Request, user: dict) -> dict[str, Any]:
    actor = str(user.get("sub") or "anon")
    current = repository.get_task_draft(task_id)
    if current:
        require_resource_owner(user, owner_id=current.get("created_by"))
    try:
        updated = repository.update_task_status(task_id, new_status, actor)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tarea no encontrada")
    audit.record_task_action(usuario=actor, ip=_client_ip(request), task_id=task_id, action=new_status, status_code=200)
    return updated


@router.post("/feedback")
def submit_feedback(request: Request, payload: FeedbackRequest, user: dict = RequireAny) -> dict[str, str]:
    actor = str(user.get("sub") or "anon")
    repository.save_feedback(
        message_id=payload.message_id,
        rating=payload.rating,
        note=payload.note,
        created_by=actor,
        context={"role": user.get("rol")},
    )
    audit.record_feedback(usuario=actor, ip=_client_ip(request), message_id=payload.message_id, rating=payload.rating)
    return {"status": "ok"}
