from __future__ import annotations

from typing import Protocol

from app.ai.perception_schemas import VisionContext, VisualObservation

"""Contrato de proveedor visual (Etapa 5, seccion 15 del brief). Ninguna
implementacion concreta (Anthropic, OpenAI, etc.) queda hardcodeada fuera
de este modulo - el resto del backend solo conoce `VisionProvider`."""


class VisionProviderError(Exception):
    """Error sanitizado - nunca incluye la API key ni el cuerpo crudo de la
    respuesta del proveedor externo."""


class VisionProviderUnavailable(VisionProviderError):
    """Sin proveedor configurado (503) - modo degradado (seccion 15/24)."""


class VisionProviderTimeout(VisionProviderError):
    pass


class VisionProvider(Protocol):
    name: str

    async def analyze(self, image: bytes, *, capture_id: str, target_type: str, widget_id: str | None, context: VisionContext) -> VisualObservation:
        ...
