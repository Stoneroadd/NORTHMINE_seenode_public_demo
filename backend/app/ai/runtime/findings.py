from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel

from app.ai.investigation_schemas import EvidenceItem, InvestigationType, OperationalHypothesis
from app.ai.tool_formatting import summarize_tool_result

"""Hallazgos en tiempo real (Etapa 4, seccion 23 del brief).

No se espera al final de la investigacion: cada vez que el Executor termina
un paso 'tool', el Runtime evalua si esa evidencia produce un hallazgo
digno de mencionarse ya mismo. `speak=True` solo en hallazgos realmente
significativos (severity != informational, o la primera hipotesis
probable) - "no todos los hallazgos deben hablarse" (seccion 23).
"""

FindingSeverity = Literal["informational", "warning", "critical"]


class InvestigationFinding(BaseModel):
    finding_id: str
    investigation_id: str
    label: str
    summary: str
    severity: FindingSeverity
    evidence_ids: list[str]
    created_at: datetime
    speak: bool


def new_finding_id() -> str:
    return f"find-{uuid.uuid4().hex[:12]}"


_DEVIATION_KEYS = {
    "get_production_kpis": ("cumplimiento_pct", 95, "warning"),
    "get_fleet_status": ("disponibilidad_pct", 85, "warning"),
    "get_data_quality_status": ("score", 70, "warning"),
}


def finding_from_evidence(investigation_id: str, item: EvidenceItem) -> InvestigationFinding | None:
    """Deriva un hallazgo puntual de UN item de evidencia recien llegado, si
    hay algo real que reportar (no genera relleno por cada tool exitosa)."""
    if not isinstance(item.value, dict):
        return None

    rule = _DEVIATION_KEYS.get(item.capability_id)
    severity: FindingSeverity = "informational"
    if rule:
        key, threshold, sev = rule
        value = item.value.get(key)
        if isinstance(value, (int, float)) and value < threshold:
            severity = sev  # type: ignore[assignment]

    status_value = item.value.get("status")
    if isinstance(status_value, str) and status_value.upper() == "EMPTY":
        severity = "warning"

    summary = summarize_tool_result(item.capability_id, item.value)
    if not summary:
        return None

    return InvestigationFinding(
        finding_id=new_finding_id(),
        investigation_id=investigation_id,
        label=item.label,
        summary=summary,
        severity=severity,
        evidence_ids=[item.evidence_id],
        created_at=datetime.now(timezone.utc),
        speak=severity != "informational",
    )


def finding_from_hypothesis(investigation_id: str, hypothesis: OperationalHypothesis, is_first_probable: bool) -> InvestigationFinding | None:
    if hypothesis.status not in ("probable", "possible"):
        return None
    severity: FindingSeverity = "warning" if hypothesis.status == "probable" else "informational"
    return InvestigationFinding(
        finding_id=new_finding_id(),
        investigation_id=investigation_id,
        label=hypothesis.label,
        summary=f"Hipótesis {hypothesis.status}: {hypothesis.label}.",
        severity=severity,
        evidence_ids=list(hypothesis.supporting_evidence_ids),
        created_at=datetime.now(timezone.utc),
        speak=hypothesis.status == "probable" and is_first_probable,
    )
