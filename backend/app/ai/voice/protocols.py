from __future__ import annotations

from typing import AsyncIterator, Protocol

"""Contrato de proveedor TTS (Etapa 4, seccion 16 del brief). Dos
implementaciones: ElevenLabsTTSProvider (voz real) y NullTTSProvider (modo
degradado / ElevenLabs desactivado) - el resto del backend solo conoce este
Protocol, nunca el proveedor concreto."""


class TTSProviderError(Exception):
    """Error sanitizado de un proveedor TTS - nunca incluye la API key ni
    el cuerpo crudo de la respuesta del proveedor externo."""


class TTSProviderUnavailable(TTSProviderError):
    """El proveedor esta desactivado o sin API key configurada (503)."""


class TTSProviderTimeout(TTSProviderError):
    pass


class AgentTTSProvider(Protocol):
    name: str

    async def stream(self, text: str) -> AsyncIterator[bytes]:
        ...
