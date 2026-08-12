from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

from app.ai.realtime.diagnostics import check_openai_realtime_access
from app.core.config import get_settings
from app.core.dependencies import RequireAdmin

router = APIRouter(prefix="/ai-agent/realtime", tags=["ai-agent-realtime"])

"""Endpoints de OpenAI Realtime (Modo JARVIS full-duplex). Por ahora solo
el diagnostico previo a la implementacion completa (seccion "prueba
autenticada server-side minima" del brief) - la sesion WebRTC/sideband en
si todavia no esta implementada."""


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
    """Solo admin - nunca expone la API key, solo booleans/status/codigo de
    error saneado (ver diagnostics.py). No abre ninguna sesion de audio."""
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
