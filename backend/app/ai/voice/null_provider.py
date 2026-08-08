from __future__ import annotations

from typing import AsyncIterator

from app.ai.voice.protocols import TTSProviderUnavailable

"""NullTTSProvider (Etapa 4): usado cuando ElevenLabs esta desactivado o sin
API key. Nunca genera audio falso - el endpoint de voz debe responder 503
(seccion 17), y el frontend debe caer a BrowserSpeechOutput o subtitulos
(seccion 21), nunca fingir que hay audio."""


class NullTTSProvider:
    name = "null"

    async def stream(self, text: str) -> AsyncIterator[bytes]:
        raise TTSProviderUnavailable("El proveedor de voz ElevenLabs no esta disponible en este despliegue.")
        yield b""  # pragma: no cover - hace de esto un generador valido, nunca se alcanza
