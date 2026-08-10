from __future__ import annotations

import logging

import httpx

from app.core.config import Settings

OPENAI_TRANSCRIPTIONS_URL = "https://api.openai.com/v1/audio/transcriptions"
SUPPORTED_AUDIO_TYPES = frozenset(
    {
        "audio/webm",
        "audio/ogg",
        "audio/wav",
        "audio/x-wav",
        "audio/mpeg",
        "audio/mp4",
        "audio/flac",
    }
)

logger = logging.getLogger("northmine.ai.transcription")


class TranscriptionUnavailable(RuntimeError):
    """No hay un proveedor de transcripcion configurado en el servidor."""


class TranscriptionFailed(RuntimeError):
    """El proveedor configurado no pudo transcribir el audio."""


async def transcribe_audio(
    *,
    settings: Settings,
    audio: bytes,
    content_type: str,
    language: str = "es",
) -> str:
    if not settings.speech_transcription_enabled or not settings.openai_api_key:
        raise TranscriptionUnavailable("Transcripcion de voz no configurada")

    media_type = content_type.split(";", 1)[0].strip().lower()
    if media_type not in SUPPORTED_AUDIO_TYPES:
        raise ValueError("Formato de audio no soportado")

    extension = {
        "audio/webm": "webm",
        "audio/ogg": "ogg",
        "audio/wav": "wav",
        "audio/x-wav": "wav",
        "audio/mpeg": "mp3",
        "audio/mp4": "mp4",
        "audio/flac": "flac",
    }[media_type]

    try:
        async with httpx.AsyncClient(timeout=settings.speech_transcription_timeout_seconds) as client:
            response = await client.post(
                OPENAI_TRANSCRIPTIONS_URL,
                headers={"Authorization": f"Bearer {settings.openai_api_key}"},
                data={
                    "model": settings.speech_transcription_model,
                    "language": language[:2].lower(),
                    "response_format": "json",
                    "prompt": "NORTHMINE, mineria, produccion, turno, flota, CAEX, pala, carguio, WENCO.",
                },
                files={"file": (f"jarvis.{extension}", audio, media_type)},
            )
    except httpx.HTTPError as exc:
        raise TranscriptionFailed("No fue posible conectar con el proveedor de transcripcion") from exc

    if response.status_code >= 400:
        logger.warning("OpenAI transcription failed status=%s", response.status_code)
        raise TranscriptionFailed(f"El proveedor de transcripcion respondio con estado {response.status_code}")

    try:
        text = str(response.json().get("text") or "").strip()
    except (TypeError, ValueError) as exc:
        raise TranscriptionFailed("Respuesta de transcripcion invalida") from exc
    if not text:
        raise TranscriptionFailed("No se detecto voz en la grabacion")
    return text
