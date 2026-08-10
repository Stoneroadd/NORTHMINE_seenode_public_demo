from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any, Protocol

import httpx

from app.core.config import Settings

logger = logging.getLogger("northmine.ai")

ANTHROPIC_MESSAGES_URL = "https://api.anthropic.com/v1/messages"
ANTHROPIC_VERSION = "2023-06-01"


class ProviderError(RuntimeError):
    """El proveedor de IA no pudo responder (red, timeout, sin API key, error upstream)."""


@dataclass
class ProviderResponse:
    content: list[dict[str, Any]]
    stop_reason: str | None
    usage: dict[str, Any]


class AIProvider(Protocol):
    async def generate(
        self,
        *,
        system: str,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]] | None = None,
        tool_choice: dict[str, Any] | None = None,
        max_tokens: int = 1024,
    ) -> ProviderResponse: ...


class AnthropicProvider:
    """Adaptador sobre la Anthropic Messages API via httpx.

    No usa el SDK oficial (no esta instalado en requirements.txt); sigue el
    mismo patron httpx crudo que ya usaba app/services/ai_analysis.py, pero
    lee la API key de Settings en cada llamada (no a nivel de import) para
    que hot-reload de entorno y tests funcionen sin reiniciar el proceso.
    """

    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    async def generate(
        self,
        *,
        system: str,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]] | None = None,
        tool_choice: dict[str, Any] | None = None,
        max_tokens: int = 1024,
    ) -> ProviderResponse:
        api_key = self._settings.anthropic_api_key
        if not api_key:
            raise ProviderError("ANTHROPIC_API_KEY no configurada")
        payload: dict[str, Any] = {
            "model": self._settings.ai_model,
            "max_tokens": max_tokens,
            "system": system,
            "messages": messages,
        }
        if tools:
            payload["tools"] = tools
        if tool_choice:
            payload["tool_choice"] = tool_choice
        try:
            async with httpx.AsyncClient(timeout=self._settings.ai_timeout_seconds) as client:
                resp = await client.post(
                    ANTHROPIC_MESSAGES_URL,
                    headers={
                        "x-api-key": api_key,
                        "anthropic-version": ANTHROPIC_VERSION,
                        "content-type": "application/json",
                    },
                    json=payload,
                )
        except httpx.HTTPError as exc:
            raise ProviderError(f"Fallo de red hacia el proveedor de IA: {exc}") from exc
        if resp.status_code >= 400:
            logger.warning("Anthropic API error status=%s body=%s", resp.status_code, resp.text[:300])
            raise ProviderError(f"El proveedor de IA respondio con estado {resp.status_code}")
        data = resp.json()
        return ProviderResponse(
            content=data.get("content", []),
            stop_reason=data.get("stop_reason"),
            usage=data.get("usage") or {},
        )


class NullProvider:
    """Modo degradado: sin API key configurada, AI_ENABLED=false o proveedor desconocido."""

    async def generate(self, **_kwargs: Any) -> ProviderResponse:
        raise ProviderError("Proveedor de IA no disponible (modo degradado)")


class LocalOperationalProvider:
    """Marcador del motor determinista local.

    La ejecucion vive en orchestrator.py porque usa las mismas herramientas,
    politicas y esquemas que el flujo con modelo externo. Este proveedor no
    llama a red y mantiene util la demo publica sin distribuir API keys.
    """

    async def generate(self, **_kwargs: Any) -> ProviderResponse:  # pragma: no cover - el orquestador lo intercepta
        raise ProviderError("El motor operacional local debe ejecutarse desde el orquestador")


def get_provider(settings: Settings) -> AIProvider:
    if not settings.ai_enabled:
        return NullProvider()
    if not settings.anthropic_api_key:
        return LocalOperationalProvider()
    if settings.ai_provider == "anthropic":
        return AnthropicProvider(settings)
    logger.warning("NORTHMINE_AI_PROVIDER desconocido=%s, usando modo degradado", settings.ai_provider)
    return NullProvider()
