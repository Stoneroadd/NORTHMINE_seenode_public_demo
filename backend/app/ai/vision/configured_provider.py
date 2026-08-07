from __future__ import annotations

import logging
import time

from app.ai.perception_schemas import VisionContext, VisualObservation, new_id
from app.ai.providers import AIProvider, ProviderError
from app.ai.vision.protocols import VisionProviderError

logger = logging.getLogger("northmine.ai.vision.configured")

"""ConfiguredVisionProvider (Etapa 5, secciones 15 y 17 del brief): reusa el
`AIProvider` generativo YA configurado en NORTHMINE (Etapa 1, app/ai/
providers.py) en vez de anadir una segunda API key/vendor nuevo - Claude
soporta imagenes de forma nativa via la misma Messages API que el chat.

Se fuerza un tool call con un schema fijo para que el parseo de la
respuesta sea deterministico (nunca se interpreta texto libre del modelo
para extraer los campos de VisualObservation)."""

_TOOL_NAME = "report_visual_observation"
_TOOL_SCHEMA = {
    "name": _TOOL_NAME,
    "description": "Reporta lo observado en la captura visual de NORTHMINE, sin inventar valores que no puedas leer.",
    "input_schema": {
        "type": "object",
        "properties": {
            "summary": {"type": "string", "description": "Descripcion breve de la estructura visual y tendencia observada."},
            "detected_elements": {"type": "array", "items": {"type": "string"}, "description": "Elementos destacados visibles (series, leyendas, marcadores)."},
            "possible_anomalies": {"type": "array", "items": {"type": "string"}, "description": "Anomalias evidentes, sin asumir causalidad."},
            "uncertainty": {"type": "array", "items": {"type": "string"}, "description": "Limitaciones de lo que se puede leer con certeza en la imagen."},
            "confidence": {"type": "string", "enum": ["low", "medium", "high"], "description": "Confianza propia en la lectura visual, no en los datos de NORTHMINE."},
        },
        "required": ["summary", "detected_elements", "possible_anomalies", "uncertainty", "confidence"],
    },
}


def _build_prompt(context: VisionContext, target_type: str) -> str:
    lines = [
        "Estas analizando una captura perteneciente a NORTHMINE (mineria a cielo abierto).",
        "",
        f"Objetivo capturado: {target_type}.",
    ]
    if context.module_id:
        lines.append(f"Modulo: {context.module_id}")
    if context.widget_label:
        lines.append(f"Widget: {context.widget_label}")
    if context.period:
        lines.append(f"Periodo: {context.period}")
    if context.equipment_id:
        lines.append(f"Equipo: {context.equipment_id}")
    if context.semantic_summary:
        lines.append(f"Dato estructurado ya conocido por NORTHMINE: {context.semantic_summary}")
    lines += [
        "",
        "Analiza UNICAMENTE lo visible en la imagen.",
        "No inventes valores que no puedas leer con claridad.",
        "No asumas causalidad.",
        "Describe: estructura visual, tendencia, anomalias evidentes, elementos destacados, limitaciones.",
        "Los datos estructurados proporcionados por NORTHMINE (si existen) tienen prioridad sobre tu interpretacion visual: si contradicen lo que ves, dilo como una limitacion, no como un hecho.",
    ]
    return "\n".join(lines)


class ConfiguredVisionProvider:
    name = "configured"

    def __init__(self, ai_provider: AIProvider, mime_type: str, timeout_seconds: float):
        self._ai_provider = ai_provider
        self._mime_type = mime_type
        self._timeout_seconds = timeout_seconds

    async def analyze(self, image: bytes, *, capture_id: str, target_type: str, widget_id: str | None, context: VisionContext) -> VisualObservation:
        import base64

        started = time.perf_counter()
        image_b64 = base64.b64encode(image).decode("ascii")
        messages = [
            {
                "role": "user",
                "content": [
                    {"type": "image", "source": {"type": "base64", "media_type": self._mime_type, "data": image_b64}},
                    {"type": "text", "text": _build_prompt(context, target_type)},
                ],
            }
        ]
        try:
            response = await self._ai_provider.generate(
                system="Eres el subsistema de percepcion visual de NORTHMINE AI. Solo describes lo que ves; nunca decides acciones operacionales.",
                messages=messages,
                tools=[_TOOL_SCHEMA],
                tool_choice={"type": "tool", "name": _TOOL_NAME},
                max_tokens=600,
            )
        except ProviderError as exc:
            raise VisionProviderError(str(exc)) from exc
        finally:
            duration_ms = int((time.perf_counter() - started) * 1000)
            logger.info("Vision analyze capture_id=%s target=%s duration_ms=%d", capture_id, target_type, duration_ms)

        tool_use = next((block for block in response.content if block.get("type") == "tool_use" and block.get("name") == _TOOL_NAME), None)
        if not tool_use:
            raise VisionProviderError("El proveedor de vision no devolvio una observacion estructurada.")

        payload = tool_use.get("input", {})
        return VisualObservation(
            observation_id=new_id("vobs"),
            capture_id=capture_id,
            target_type=target_type,  # type: ignore[arg-type]
            widget_id=widget_id,
            summary=str(payload.get("summary", "")).strip() or "Sin descripcion.",
            detected_elements=[str(x) for x in payload.get("detected_elements", [])][:10],
            possible_anomalies=[str(x) for x in payload.get("possible_anomalies", [])][:10],
            uncertainty=[str(x) for x in payload.get("uncertainty", [])][:10],
            confidence=payload.get("confidence") if payload.get("confidence") in ("low", "medium", "high") else "low",
        )
