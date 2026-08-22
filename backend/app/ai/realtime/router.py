from __future__ import annotations

from fastapi import APIRouter, Header, HTTPException, Request, Response, status
from pydantic import BaseModel

from app.ai import audit as runtime_audit
from app.ai.realtime.diagnostics import check_openai_realtime_access
from app.ai.realtime.openai_bridge import (
    RealtimeCapacityError,
    RealtimeProviderError,
    create_openai_call,
    sideband_manager,
)
from app.ai.runtime.session_manager import SessionNotFound, SessionOwnershipError
from app.ai.runtime.session_manager import session_manager
from app.core.config import get_settings
from app.core.dependencies import RequireAdmin, RequireAny

router = APIRouter(prefix="/ai-agent/realtime", tags=["ai-agent-realtime"])


class RealtimeDiagnosticsResponse(BaseModel):
    enabled: bool
    api_key_configured: bool
    model_configured: str | None
    access_confirmed: bool
    http_status: int | None
    error_code: str | None
    error_message: str | None


@router.get("/diagnostics", response_model=RealtimeDiagnosticsResponse)
async def realtime_diagnostics(user: dict = RequireAdmin) -> RealtimeDiagnosticsResponse:
    """Validate provider access without exposing the API key or opening audio."""
    settings = get_settings()
    result = await check_openai_realtime_access(settings)
    return RealtimeDiagnosticsResponse(
        enabled=settings.openai_realtime_enabled,
        api_key_configured=result.api_key_configured,
        model_configured=result.model_configured,
        access_confirmed=result.access_confirmed,
        http_status=result.http_status,
        error_code=result.error_code,
        error_message=result.error_message,
    )


@router.get("/status")
async def realtime_status(user: dict = RequireAny) -> dict:
    settings = get_settings()
    return {
        "ready": settings.openai_realtime_available,
        "mode": "live" if settings.openai_realtime_available else "not_configured",
        "model": settings.openai_realtime_model or None,
        "missing": settings.openai_realtime_missing_configuration,
        "transport": "webrtc",
        "sideband": True,
    }


@router.post("/session", response_class=Response)
async def create_realtime_session(
    request: Request,
    user: dict = RequireAny,
    x_northmine_agent_session: str = Header(default="", alias="X-NORTHMINE-Agent-Session"),
) -> Response:
    settings = get_settings()
    if not settings.openai_realtime_available:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "code": "REALTIME_NOT_CONFIGURED",
                "missing": settings.openai_realtime_missing_configuration,
            },
        )
    if request.headers.get("content-type", "").split(";", 1)[0].strip().lower() != "application/sdp":
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="Se requiere application/sdp.")
    offer = (await request.body()).decode("utf-8", errors="strict").strip()
    if not offer.startswith("v=0") or len(offer) > 200_000:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Oferta WebRTC inválida.")
    user_id = str(user.get("sub") or "anon")
    try:
        live = await session_manager.get_for_user(x_northmine_agent_session, user_id)
    except SessionNotFound as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="La sesión Agent Runtime no está disponible.") from exc
    except SessionOwnershipError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="La sesión Agent Runtime no pertenece al usuario.") from exc
    try:
        await sideband_manager.ensure_capacity(user_id, settings)
        answer_sdp, call_id = await create_openai_call(offer_sdp=offer, user_id=user_id, settings=settings)
        await sideband_manager.start(
            call_id=call_id,
            live=live,
            user=user,
            client_ip=request.client.host if request.client else "unknown",
        )
        runtime_audit.record_realtime_event(
            usuario=user_id,
            ip=request.client.host if request.client else "unknown",
            session_id=live.session.session_id,
            event="webrtc_sideband_started",
            status="ok",
        )
    except RealtimeCapacityError as exc:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=str(exc)) from exc
    except RealtimeProviderError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc
    return Response(
        content=answer_sdp,
        media_type="application/sdp",
        headers={
            "Cache-Control": "no-store",
            "X-NORTHMINE-Realtime-Mode": "live",
        },
    )
