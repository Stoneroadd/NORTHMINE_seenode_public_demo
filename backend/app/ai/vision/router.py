from __future__ import annotations

import base64
import binascii
import logging
import time

from fastapi import APIRouter, HTTPException, Request, status

from app.ai.perception_schemas import AnalyzeImageRequest, VisualObservation
from app.ai.providers import get_provider
from app.ai.vision.configured_provider import ConfiguredVisionProvider
from app.ai.vision.null_provider import NullVisionProvider
from app.ai.vision.protocols import VisionProvider, VisionProviderError, VisionProviderTimeout, VisionProviderUnavailable
from app.ai.vision.rate_limiter import perception_capture_limiter
from app.core.config import Settings, get_settings
from app.core.dependencies import RequireAny
from app.core.rate_limit import endpoint_limit, limiter

logger = logging.getLogger("northmine.ai.vision.router")

router = APIRouter(prefix="/ai-agent/vision", tags=["ai-agent-vision"])

"""Endpoint de analisis visual (Etapa 5, secciones 15-17 y 34 del brief).

POST /api/ai-agent/vision/analyze: recibe la captura YA hecha en el
frontend (base64, con limite de tamano), la decodifica en memoria, la pasa
al VisionProvider, y devuelve la VisualObservation. Los bytes de imagen
NUNCA se escriben a disco ni a la base de datos - viven solo en memoria
durante esta peticion (seccion 34: "no guardar por defecto raw screenshot/
base64/image bytes")."""


def get_vision_provider(settings: Settings) -> VisionProvider:
    if not settings.vision_available:
        return NullVisionProvider()
    ai_provider = get_provider(settings)
    return ConfiguredVisionProvider(ai_provider, mime_type="image/webp", timeout_seconds=settings.vision_timeout_seconds)


@router.post("/analyze")
@limiter.limit(endpoint_limit("/api/ai-agent/vision/analyze"))
async def analyze_capture(request: Request, payload: AnalyzeImageRequest, user: dict = RequireAny) -> VisualObservation:
    settings = get_settings()
    if not settings.vision_available:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Percepcion visual no disponible")

    per_type_limit = (
        settings.perception_max_viewport_captures_per_minute
        if payload.target_type == "viewport"
        else settings.perception_max_widget_captures_per_minute
    )
    if not perception_capture_limiter.allow(str(user.get("sub") or "anon"), payload.target_type, per_type_limit):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Demasiadas capturas de tipo '{payload.target_type}' en el ultimo minuto",
        )

    try:
        image_bytes = base64.b64decode(payload.image_base64, validate=True)
    except (binascii.Error, ValueError):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Imagen invalida") from None

    if len(image_bytes) > settings.vision_max_image_bytes:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Captura demasiado grande")
    if not image_bytes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Imagen vacia")

    provider = get_vision_provider(settings)
    from app.ai.audit import record_perception_capture

    started = time.perf_counter()
    try:
        observation = await provider.analyze(
            image_bytes, capture_id=payload.capture_id, target_type=payload.target_type,
            widget_id=payload.widget_id, context=payload.context,
        )
    except VisionProviderUnavailable as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    except VisionProviderTimeout as exc:
        raise HTTPException(status_code=status.HTTP_504_GATEWAY_TIMEOUT, detail="Tiempo de espera agotado con el proveedor de vision") from exc
    except VisionProviderError as exc:
        logger.warning("Error proveedor vision capture_id=%s error=%s", payload.capture_id, exc)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="El proveedor de vision no esta disponible") from exc
    finally:
        duration_ms = int((time.perf_counter() - started) * 1000)
        record_perception_capture(
            usuario=str(user.get("sub") or "anon"),
            ip=request.client.host if request.client else "unknown",
            capture_id=payload.capture_id,
            target_type=payload.target_type,
            widget_id=payload.widget_id,
            image_bytes=len(image_bytes),
            provider=provider.name,
            duration_ms=duration_ms,
        )

    return observation
