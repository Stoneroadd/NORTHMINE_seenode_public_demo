from __future__ import annotations

import re

from app.ai.investigation_schemas import EvidenceItem, EvidenceSourceType, VerificationResult
from app.ai.perception_schemas import PerceivedWidgetState, PerceptionConflict, VisualObservation

"""Verifier (Etapa 3, seccion 10 del brief; Etapa 5, secciones 26-27).

100% reglas deterministicas - el modelo no interviene en esta pasada (mas
simple de razonar, mas facil de testear, y funciona identico en modo
degradado). Revisa cada EvidenceItem antes de aceptarla: dataset vacio,
frescura, calidad. No valida "empresa/faena coinciden" porque NORTHMINE es
single-tenant (confirmado en Etapa 1) - ese chequeo no tiene nada real que
hacer todavia y no se simula.

Etapa 5 agrega prioridad de evidencia entre tipos de fuente
(operational_data > semantic_ui_snapshot > visual_observation) y deteccion
de conflictos entre lo que la UI muestra y lo que el backend acaba de
calcular - una interpretacion visual NUNCA puede sobrescribir un dato
estructurado confirmado (seccion 26, ejemplo del brief: "Parece que la
produccion cae" vs "Produccion aumento 3%" -> se rechaza la inferencia
visual, nunca se decide automaticamente cual es correcto).
"""

# Mayor = mas autoritativo. calculation/document quedan fuera del ranking
# de 3 niveles que pide el brief (no son evidencia primaria observacional).
EVIDENCE_PRIORITY: dict[EvidenceSourceType, int] = {
    "backend_tool": 3,       # operational_data
    "ui_snapshot": 2,        # semantic_ui_snapshot
    "visual_observation": 1, # nunca sobrescribe a los dos anteriores
    "calculation": 0,
    "document": 0,
}


def evidence_priority(source_type: EvidenceSourceType) -> int:
    return EVIDENCE_PRIORITY.get(source_type, 0)


def sort_by_evidence_priority(evidence: list[EvidenceItem]) -> list[EvidenceItem]:
    """Ordena evidencia de mayor a menor autoridad - usado por Conclusion
    para decidir que fuente citar primero cuando dos evidencias describen
    el mismo hecho de forma distinta."""
    return sorted(evidence, key=lambda item: evidence_priority(item.source_type), reverse=True)


def _dataset_is_empty(value: object) -> bool:
    if not isinstance(value, dict):
        return False
    quality = value.get("data_quality")
    if isinstance(quality, dict) and str(quality.get("status") or "").upper() == "EMPTY":
        return True
    # get_data_quality_status entrega 'status' a nivel raiz, no anidado.
    if str(value.get("status") or "").upper() == "EMPTY":
        return True
    return False


def verify_evidence(evidence: list[EvidenceItem]) -> VerificationResult:
    if not evidence:
        return VerificationResult(
            status="insufficient_data",
            reasons=["No se recolecto evidencia (todos los pasos requeridos fallaron o fueron omitidos)."],
            limitations=["Sin evidencia disponible para esta investigacion."],
        )

    accepted: list[str] = []
    rejected: list[str] = []
    reasons: list[str] = []
    limitations: list[str] = []

    for item in evidence:
        problems: list[str] = []
        if _dataset_is_empty(item.value):
            problems.append("dataset vacio")

        if problems:
            item.verification_status = "rejected"
            rejected.append(item.evidence_id)
            reasons.append(f"{item.capability_id}: {', '.join(problems)}")
            continue

        if item.freshness_status == "stale":
            limitations.append(f"{item.capability_id}: dato servido desde cache, no en vivo.")
        if item.freshness_status == "unknown":
            limitations.append(f"{item.capability_id}: frescura del dato desconocida.")
        if item.quality_status == "low":
            limitations.append(f"{item.capability_id}: calidad de dato baja.")
        elif item.quality_status == "unknown":
            limitations.append(f"{item.capability_id}: calidad de dato no determinada.")

        item.verification_status = "verified" if item.quality_status in ("high", "medium") and item.freshness_status != "stale" else "partial"
        accepted.append(item.evidence_id)

    if not accepted:
        return VerificationResult(
            status="rejected",
            reasons=reasons,
            rejected_evidence_ids=rejected,
            limitations=limitations,
        )

    overall = "verified" if not rejected and all(item.verification_status == "verified" for item in evidence) else "partial"
    return VerificationResult(
        status=overall,
        reasons=reasons,
        accepted_evidence_ids=accepted,
        rejected_evidence_ids=rejected,
        limitations=limitations,
    )


# ── Deteccion de conflictos (Etapa 5, seccion 27) ────────────────────────

_NUMBER_PATTERN = re.compile(r"(-?\d[\d.,]*)\s*%?")
_CONFLICT_RATIO_THRESHOLD = 0.05  # 5% de variacion relativa se considera discrepancia real, no ruido de redondeo


def _extract_number(text: str) -> float | None:
    match = _NUMBER_PATTERN.search(text)
    if not match:
        return None
    normalized = match.group(1).replace(".", "").replace(",", ".")
    try:
        return float(normalized)
    except ValueError:
        return None


def detect_ui_backend_conflict(widget: PerceivedWidgetState, fresh_evidence: EvidenceItem) -> PerceptionConflict | None:
    """Compara el valor que el widget muestra AHORA (snapshot semantico,
    Nivel 1 de percepcion) contra un valor recien obtenido del backend para
    la misma capacidad. Nunca decide cual es correcto - solo reporta la
    discrepancia para que un humano (o una investigacion de seguimiento)
    revise timestamp/frescura/filtros/cache (seccion 27)."""
    if evidence_priority(fresh_evidence.source_type) <= evidence_priority("ui_snapshot"):
        return None  # el backend_tool debe ser estrictamente mas autoritativo para que valga la pena comparar
    ui_value = _extract_number(widget.semantic_summary)
    backend_value = fresh_evidence.value if isinstance(fresh_evidence.value, (int, float)) else _extract_number(str(fresh_evidence.value))
    if ui_value is None or backend_value is None:
        return None
    if ui_value == 0:
        return None
    ratio = abs((float(backend_value) - ui_value) / ui_value)
    if ratio < _CONFLICT_RATIO_THRESHOLD:
        return None
    return PerceptionConflict(
        kind="ui_data_inconsistency",
        description=f"El widget '{widget.label}' muestra un valor distinto al que el backend acaba de calcular para {fresh_evidence.capability_id}.",
        ui_value=ui_value,
        backend_value=backend_value,
        widget_id=widget.widget_id,
        investigated={
            "widget_freshness": widget.freshness_status,
            "evidence_freshness": fresh_evidence.freshness_status,
            "evidence_updated_at": fresh_evidence.updated_at,
        },
    )


_TREND_UP_WORDS = ("sube", "subio", "aumenta", "aumento", "alza", "creciendo", "incrementa")
_TREND_DOWN_WORDS = ("cae", "caida", "caída", "cayo", "cayó", "baja", "bajo", "disminuye", "disminuyo", "descenso", "cayendo")


def _trend_from_text(text: str) -> str | None:
    lowered = text.lower()
    if any(word in lowered for word in _TREND_DOWN_WORDS):
        return "down"
    if any(word in lowered for word in _TREND_UP_WORDS):
        return "up"
    return None


def detect_visual_semantic_conflict(widget: PerceivedWidgetState, observation: VisualObservation) -> PerceptionConflict | None:
    """Compara la tendencia que el modelo de vision CREE ver contra la
    tendencia que el propio resumen semantico (estructurado) ya conoce. Una
    observacion visual jamas se acepta como hecho si contradice el dato
    estructurado (seccion 26) - esto es lo que produce ese rechazo: un
    conflicto que el Verifier reporta en vez de fusionar silenciosamente."""
    ui_trend = _trend_from_text(widget.semantic_summary)
    if ui_trend is None:
        return None
    visual_texts = [observation.summary, *observation.possible_anomalies]
    visual_trend = next((t for text in visual_texts if (t := _trend_from_text(text)) is not None), None)
    if visual_trend is None or visual_trend == ui_trend:
        return None
    return PerceptionConflict(
        kind="ui_data_inconsistency",
        description=f"La observacion visual sugiere una tendencia distinta a la que confirman los datos estructurados de '{widget.label}'.",
        ui_value=ui_trend,
        backend_value=visual_trend,
        widget_id=widget.widget_id,
        investigated={"note": "La interpretacion visual se rechaza como hecho; se conserva como observacion no confirmada.", "observation_confidence": observation.confidence},
    )
