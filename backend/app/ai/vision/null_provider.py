from __future__ import annotations

from app.ai.perception_schemas import VisionContext, VisualObservation
from app.ai.vision.protocols import VisionProviderUnavailable

"""NullVisionProvider (Etapa 5): usado cuando no hay proveedor generativo
configurado (sin ANTHROPIC_API_KEY, o AI_ENABLED=false). Nunca inventa una
observacion - el endpoint debe responder 503 y el llamador debe usar solo
percepcion semantica (seccion 18: 'semantica antes que vision')."""


class NullVisionProvider:
    name = "null"

    async def analyze(self, image: bytes, *, capture_id: str, target_type: str, widget_id: str | None, context: VisionContext) -> VisualObservation:
        raise VisionProviderUnavailable("No hay un proveedor de vision configurado en este despliegue.")
