from __future__ import annotations

import asyncio
import logging
from typing import Literal

from fastapi import APIRouter, HTTPException, Request, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.ai.voice.elevenlabs_provider import ElevenLabsTTSProvider
from app.ai.voice.null_provider import NullTTSProvider
from app.ai.voice.protocols import AgentTTSProvider, TTSProviderError, TTSProviderTimeout
from app.core.config import Settings, get_settings
from app.core.dependencies import RequireAny
from app.core.rate_limit import endpoint_limit, limiter

logger = logging.getLogger("northmine.ai.voice.router")

router = APIRouter(prefix="/ai-agent", tags=["ai-agent-voice"])

"""Endpoint de audio (Etapa 4, seccion 17 del brief).

POST /api/ai-agent/speech: streaming autenticado de audio/mpeg. Nunca
guarda audio, nunca expone la API key, responde 503 limpio (antes de
enviar cualquier byte de respuesta) cuando ElevenLabs esta desactivado -
por eso la disponibilidad se chequea ANTES de construir el StreamingResponse,
en vez de dejar que NullTTSProvider falle a mitad de un stream ya iniciado
con status 200.

Etapa 4.1: el mismo principio se aplica al proveedor ElevenLabs real. Un
StreamingResponse compromete el status 200 apenas Starlette empieza a
iterar el generador - si el proveedor externo falla (API key invalida,
rate limit, timeout, etc.) DESPUES de ese punto, el cliente ya recibio
200 + audio/mpeg y no hay forma de corregir el status code. Por eso se
'espia' el primer chunk ANTES de construir la respuesta: si esa primera
llamada falla, el endpoint devuelve un error real (502/504) en vez de un
200 con cuerpo vacio (bug detectado en la validacion manual de Etapa 4.1:
un 200 indistinguible de un audio silenciosamente vacio)."""


def get_provider(settings: Settings) -> AgentTTSProvider:
    if settings.elevenlabs_available:
        return ElevenLabsTTSProvider(settings)
    return NullTTSProvider()


class AgentSpeechRequest(BaseModel):
    segment_id: str = Field(max_length=80)
    text: str = Field(min_length=1, max_length=500)
    priority: Literal["status", "finding", "warning", "result"]
    sequence: int
    interruptible: bool = True


def _preview(text: str, limit: int = 60) -> str:
    return text if len(text) <= limit else text[:limit] + "…"


@router.post("/speech")
@limiter.limit(endpoint_limit("/api/ai-agent/speech"))
async def synthesize_speech(request: Request, payload: AgentSpeechRequest, user: dict = RequireAny) -> StreamingResponse:
    settings = get_settings()
    if not settings.elevenlabs_available:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Voz ElevenLabs no disponible")

    provider = get_provider(settings)
    text = payload.text.strip()
    if not text:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Texto vacio")

    from app.ai.audit import record_speech_request

    record_speech_request(
        usuario=str(user.get("sub") or "anon"),
        ip=request.client.host if request.client else "unknown",
        segment_id=payload.segment_id,
        priority=payload.priority,
        text_length=len(text),
        text_preview=_preview(text),
        provider=provider.name,
    )

    stream_iter = provider.stream(text).__aiter__()
    try:
        first_chunk = await asyncio.wait_for(stream_iter.__anext__(), timeout=settings.elevenlabs_timeout_seconds)
    except StopAsyncIteration:
        logger.warning("Proveedor TTS no genero audio segment_id=%s provider=%s", payload.segment_id, provider.name)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="El proveedor de voz no genero audio") from None
    except asyncio.TimeoutError:
        logger.warning("Timeout ElevenLabs segment_id=%s", payload.segment_id)
        raise HTTPException(status_code=status.HTTP_504_GATEWAY_TIMEOUT, detail="Tiempo de espera agotado con el proveedor de voz") from None
    except TTSProviderTimeout:
        logger.warning("Timeout ElevenLabs segment_id=%s", payload.segment_id)
        raise HTTPException(status_code=status.HTTP_504_GATEWAY_TIMEOUT, detail="Tiempo de espera agotado con el proveedor de voz") from None
    except TTSProviderError as exc:
        logger.warning("Error proveedor TTS segment_id=%s error=%s", payload.segment_id, exc)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="El proveedor de voz no esta disponible") from None

    async def _stream():
        yield first_chunk
        try:
            async for chunk in stream_iter:
                yield chunk
        except (TTSProviderTimeout, TTSProviderError) as exc:
            # A esta altura el status 200 ya se envio (Starlette lo comete al
            # empezar a iterar) - lo unico posible es truncar el stream; el
            # cliente (ElevenLabsSpeechOutput) trata un audio truncado que no
            # dispara onerror como reproduccion parcial, y el barge-in/cola ya
            # tolera eso. No es un caso perfecto, pero es infrecuente (falla a
            # mitad de un audio ya en curso) frente al caso comun (falla
            # inmediata, ahora si cubierto por el status code correcto arriba).
            logger.warning("Error de proveedor TTS a mitad de stream segment_id=%s error=%s", payload.segment_id, exc)
            return

    return StreamingResponse(
        _stream(),
        media_type="audio/mpeg",
        headers={"Cache-Control": "no-store", "X-Accel-Buffering": "no"},
    )
