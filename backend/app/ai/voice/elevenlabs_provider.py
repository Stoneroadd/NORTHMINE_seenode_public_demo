from __future__ import annotations

import logging
import time
from typing import AsyncIterator

import httpx

from app.ai.voice.protocols import AgentTTSProvider, TTSProviderError, TTSProviderTimeout
from app.core.config import Settings

logger = logging.getLogger("northmine.ai.voice.elevenlabs")

"""ElevenLabsTTSProvider (Etapa 4, seccion 16 del brief).

Usa streaming real de ElevenLabs (endpoint /stream) via httpx.AsyncClient,
nunca guarda el audio, nunca loggea la API key ni el texto completo (solo
su longitud - seccion 17: "auditoria sin guardar texto sensible completo
cuando no sea necesario"). El Voice ID queda centralizado en Settings
(seccion 3), nunca hardcodeado aca ni en el frontend.
"""

_BASE_URL = "https://api.elevenlabs.io/v1/text-to-speech"


class ElevenLabsTTSProvider:
    name = "elevenlabs"

    def __init__(self, settings: Settings):
        if not settings.elevenlabs_available:
            raise ValueError("ElevenLabsTTSProvider requiere ELEVENLABS_ENABLED=true y ELEVENLABS_API_KEY configurada")
        self._api_key = settings.elevenlabs_api_key
        self._voice_id = settings.elevenlabs_voice_id
        self._model_id = settings.elevenlabs_model_id
        self._output_format = settings.elevenlabs_output_format
        self._timeout_seconds = settings.elevenlabs_timeout_seconds
        self._stability = settings.elevenlabs_stability
        self._similarity_boost = settings.elevenlabs_similarity_boost
        self._speed = settings.elevenlabs_speed

    async def stream(self, text: str) -> AsyncIterator[bytes]:
        url = f"{_BASE_URL}/{self._voice_id}/stream"
        params = {"output_format": self._output_format}
        headers = {
            "xi-api-key": self._api_key,
            "Content-Type": "application/json",
            "Accept": "audio/mpeg",
        }
        body = {
            "text": text,
            "model_id": self._model_id,
            "voice_settings": {
                "stability": self._stability,
                "similarity_boost": self._similarity_boost,
                "speed": self._speed,
            },
        }

        started = time.perf_counter()
        chunks_emitted = 0
        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(self._timeout_seconds)) as client:
                async with client.stream("POST", url, params=params, headers=headers, json=body) as response:
                    if response.status_code != 200:
                        # Nunca se propaga el cuerpo crudo del proveedor (podria
                        # incluir detalles de cuenta/plan) - solo el status.
                        logger.warning("ElevenLabs respondio status=%s voice_id=%s", response.status_code, _redact(self._voice_id))
                        raise TTSProviderError(f"ElevenLabs respondio HTTP {response.status_code}")
                    async for chunk in response.aiter_bytes():
                        if chunk:
                            chunks_emitted += 1
                            yield chunk
        except httpx.TimeoutException as exc:
            raise TTSProviderTimeout(f"ElevenLabs timeout tras {self._timeout_seconds}s") from exc
        except httpx.HTTPError as exc:
            raise TTSProviderError("ElevenLabs no disponible") from exc
        finally:
            duration_ms = int((time.perf_counter() - started) * 1000)
            logger.info(
                "ElevenLabs stream chars=%d chunks=%d duration_ms=%d voice_id=%s",
                len(text), chunks_emitted, duration_ms, _redact(self._voice_id),
            )


def _redact(voice_id: str) -> str:
    if len(voice_id) <= 6:
        return "***"
    return f"{voice_id[:4]}…{voice_id[-2:]}"
