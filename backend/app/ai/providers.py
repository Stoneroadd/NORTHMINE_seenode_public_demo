from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from typing import Any, Protocol

import httpx

from app.core.config import Settings

logger = logging.getLogger("northmine.ai")

ANTHROPIC_MESSAGES_URL = "https://api.anthropic.com/v1/messages"
ANTHROPIC_VERSION = "2023-06-01"
OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses"


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


class OpenAIProvider:
    """Adaptador de Responses API al contrato interno del orquestador.

    El modelo solo propone llamadas. Las herramientas, permisos, datos y
    acciones siguen ejecutandose y validandose dentro del backend NORTHMINE.
    """

    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    @staticmethod
    def _tools(tools: list[dict[str, Any]] | None) -> list[dict[str, Any]]:
        return [
            {
                "type": "function",
                "name": str(tool.get("name") or ""),
                "description": str(tool.get("description") or ""),
                "parameters": tool.get("input_schema") or {"type": "object", "properties": {}},
                "strict": False,
            }
            for tool in tools or []
            if tool.get("name")
        ]

    @staticmethod
    def _input(messages: list[dict[str, Any]]) -> list[dict[str, Any]]:
        converted: list[dict[str, Any]] = []
        for message in messages:
            role = str(message.get("role") or "user")
            content = message.get("content")
            if isinstance(content, str):
                converted.append({"role": role, "content": content})
                continue
            if not isinstance(content, list):
                continue
            text_parts: list[str] = []
            for block in content:
                if not isinstance(block, dict):
                    continue
                block_type = block.get("type")
                if block_type == "text" and block.get("text"):
                    text_parts.append(str(block["text"]))
                elif block_type == "tool_use":
                    converted.append(
                        {
                            "type": "function_call",
                            "call_id": str(block.get("id") or ""),
                            "name": str(block.get("name") or ""),
                            "arguments": json.dumps(block.get("input") or {}, ensure_ascii=False),
                        }
                    )
                elif block_type == "tool_result":
                    converted.append(
                        {
                            "type": "function_call_output",
                            "call_id": str(block.get("tool_use_id") or ""),
                            "output": str(block.get("content") or ""),
                        }
                    )
                elif block_type == "openai_item" and isinstance(block.get("item"), dict):
                    converted.append(block["item"])
            if text_parts:
                converted.append({"role": role, "content": "\n".join(text_parts)})
        return converted

    async def generate(
        self,
        *,
        system: str,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]] | None = None,
        tool_choice: dict[str, Any] | None = None,
        max_tokens: int = 1024,
    ) -> ProviderResponse:
        api_key = self._settings.openai_api_key
        if not api_key:
            raise ProviderError("NORTHMINE_OPENAI_API_KEY no configurada")
        payload: dict[str, Any] = {
            "model": self._settings.ai_model,
            "instructions": system,
            "input": self._input(messages),
            "max_output_tokens": max_tokens,
            "reasoning": {"effort": self._settings.ai_reasoning_effort},
            "text": {"verbosity": "low"},
            "store": False,
        }
        openai_tools = self._tools(tools)
        if openai_tools:
            payload["tools"] = openai_tools
        if tool_choice:
            forced_name = tool_choice.get("name")
            payload["tool_choice"] = (
                {"type": "function", "name": forced_name}
                if forced_name
                else "auto"
            )

        try:
            async with httpx.AsyncClient(timeout=self._settings.ai_timeout_seconds) as client:
                response = await client.post(
                    OPENAI_RESPONSES_URL,
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                    },
                    json=payload,
                )
        except httpx.HTTPError as exc:
            raise ProviderError("Fallo de red hacia el proveedor de IA") from exc
        if response.status_code >= 400:
            logger.warning("OpenAI Responses API error status=%s", response.status_code)
            raise ProviderError(f"El proveedor de IA respondio con estado {response.status_code}")

        try:
            data = response.json()
        except ValueError as exc:
            raise ProviderError("El proveedor de IA entrego una respuesta invalida") from exc

        content: list[dict[str, Any]] = []
        has_tool_call = False
        for item in data.get("output") or []:
            if not isinstance(item, dict):
                continue
            if item.get("type") == "reasoning":
                content.append({"type": "openai_item", "item": item})
            elif item.get("type") == "function_call":
                has_tool_call = True
                try:
                    arguments = json.loads(str(item.get("arguments") or "{}"))
                except json.JSONDecodeError:
                    arguments = {}
                content.append(
                    {
                        "type": "tool_use",
                        "id": str(item.get("call_id") or item.get("id") or ""),
                        "name": str(item.get("name") or ""),
                        "input": arguments,
                    }
                )
            elif item.get("type") == "message":
                for block in item.get("content") or []:
                    if isinstance(block, dict) and block.get("type") == "output_text" and block.get("text"):
                        content.append({"type": "text", "text": str(block["text"])})

        return ProviderResponse(
            content=content,
            stop_reason="tool_use" if has_tool_call else "end_turn",
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
    if settings.ai_provider == "openai":
        return OpenAIProvider(settings) if settings.openai_api_key else LocalOperationalProvider()
    if settings.ai_provider == "anthropic":
        return AnthropicProvider(settings) if settings.anthropic_api_key else LocalOperationalProvider()
    if settings.ai_provider == "local_operational":
        return LocalOperationalProvider()
    logger.warning("NORTHMINE_AI_PROVIDER desconocido=%s, usando modo degradado", settings.ai_provider)
    return NullProvider()
