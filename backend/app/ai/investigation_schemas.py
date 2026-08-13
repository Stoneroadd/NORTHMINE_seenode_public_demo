from __future__ import annotations

import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Literal

from pydantic import BaseModel, Field

"""Esquemas del motor de investigacion Planner-Executor-Verifier (Etapa 3).

Alcance cerrado a proposito (seccion 4 del brief): 4 tipos de investigacion,
nada mas. Una solicitud fuera de este enum se rechaza con un mensaje fijo,
nunca se improvisa un plan generico.
"""


class InvestigationType(str, Enum):
    PRODUCTION_DROP = "production_drop"
    CYCLE_TIME_INCREASE = "cycle_time_increase"
    LOADING_UNIT_UNDERPERFORMANCE = "loading_unit_underperformance"
    SHIFT_SUMMARY = "shift_summary"


OUT_OF_SCOPE_MESSAGE = "Esta capacidad todavia no esta disponible en la version actual del agente."

StepKind = Literal["tool", "ui_action"]
StepStatus = Literal["pending", "running", "completed", "failed", "skipped", "cancelled", "rejected"]
StepRequirement = Literal["required", "optional", "alternative_available"]
InvestigationStatus = Literal["planned", "running", "completed", "failed", "cancelled"]


def new_id(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:12]}"


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


class DateRange(BaseModel):
    from_: str = Field(alias="from")
    to: str

    model_config = {"populate_by_name": True}


class InvestigationScope(BaseModel):
    shift: str | None = None
    site_id: str | None = None
    date_range: DateRange | None = None
    equipment_ids: list[str] = Field(default_factory=list)


class PlanStep(BaseModel):
    step_id: str
    kind: StepKind
    capability_id: str
    description: str
    status: StepStatus = "pending"
    requirement: StepRequirement = "required"
    started_at: str | None = None
    completed_at: str | None = None
    duration_ms: int | None = None
    error: str | None = None
    evidence_ids: list[str] = Field(default_factory=list)


class InvestigationPlan(BaseModel):
    investigation_id: str
    type: InvestigationType
    goal: str
    scope: InvestigationScope
    status: InvestigationStatus = "planned"
    steps: list[PlanStep]
    missing_capabilities: list[str] = Field(default_factory=list)
    created_at: str = Field(default_factory=now_iso)


# ── Evidencia normalizada (seccion 11) ───────────────────────────────────

EvidenceSourceType = Literal["backend_tool", "ui_snapshot", "visual_observation", "calculation", "document"]
FreshnessStatus = Literal["current", "stale", "unknown"]
QualityStatus = Literal["high", "medium", "low", "unknown"]
VerificationStatus = Literal["verified", "partial", "rejected", "insufficient_data", "pending"]


class EvidenceItem(BaseModel):
    evidence_id: str
    source_type: EvidenceSourceType
    capability_id: str
    label: str
    value: Any
    unit: str | None = None
    period: DateRange | None = None
    entity_ids: list[str] = Field(default_factory=list)
    source: str | None = None
    updated_at: str | None = None
    freshness_status: FreshnessStatus = "unknown"
    quality_status: QualityStatus = "unknown"
    verification_status: VerificationStatus = "pending"


class VerificationResult(BaseModel):
    status: Literal["verified", "partial", "rejected", "insufficient_data"]
    reasons: list[str] = Field(default_factory=list)
    accepted_evidence_ids: list[str] = Field(default_factory=list)
    rejected_evidence_ids: list[str] = Field(default_factory=list)
    limitations: list[str] = Field(default_factory=list)


# ── Hipotesis (seccion 12) ───────────────────────────────────────────────

HypothesisStatus = Literal["unsupported", "possible", "probable", "insufficient_data"]


class OperationalHypothesis(BaseModel):
    hypothesis_id: str
    label: str
    status: HypothesisStatus
    supporting_evidence_ids: list[str] = Field(default_factory=list)
    contradicting_evidence_ids: list[str] = Field(default_factory=list)
    # Desempate heuristico interno documentado por regla (ver hypotheses.py),
    # NUNCA una probabilidad estadistica - el status de arriba es lo que
    # realmente expresa certeza operacional.
    score: float | None = None


# ── Conclusion (seccion 13) ──────────────────────────────────────────────

class InvestigationConfidence(BaseModel):
    """Confianza de una InvestigationConclusion, derivada 100% de
    VerificationResult.status y de si hay una hipotesis 'probable' (ver
    conclusion.py::build_conclusion) - nunca del score heuristico de una
    hipotesis individual. Dominio distinto de ResponseConfidence
    (schemas.py), que resume la confianza de un turno de chat."""

    level: Literal["low", "medium", "high"]
    calculated_by: Literal["backend_rules"] = "backend_rules"


class InvestigationConclusion(BaseModel):
    summary: str
    facts: list[str] = Field(default_factory=list)
    probable_causes: list[str] = Field(default_factory=list)
    contradictions: list[str] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)
    limitations: list[str] = Field(default_factory=list)
    confidence: InvestigationConfidence
    # Impuestos por el backend, el modelo no los puede tocar (seccion 13).
    decision_authority: Literal["human"] = "human"
    requires_human_approval: Literal[True] = True


class InvestigationResult(BaseModel):
    plan: InvestigationPlan
    evidence: list[EvidenceItem] = Field(default_factory=list)
    verification: VerificationResult
    hypotheses: list[OperationalHypothesis] = Field(default_factory=list)
    conclusion: InvestigationConclusion | None = None


# ── Request/response de API ──────────────────────────────────────────────

class CreateInvestigationRequest(BaseModel):
    # No usamos InvestigationType aca a proposito: si el modelo fuera un Enum,
    # Pydantic rechazaria un tipo fuera de alcance con un 422 generico antes
    # de llegar al router, y perderiamos el mensaje fijo de fuera-de-alcance
    # exigido por el brief (seccion 4). El router hace la conversion y decide
    # el mensaje.
    type: str = Field(max_length=60)
    shift: str | None = Field(default=None, max_length=20)
    equipment_id: str | None = Field(default=None, max_length=40)
    start_date: str | None = Field(default=None, max_length=10)
    end_date: str | None = Field(default=None, max_length=10)


class UIStepReportRequest(BaseModel):
    status: Literal["completed", "rejected", "failed", "cancelled"]
    label: str | None = Field(default=None, max_length=200)
    context_updated: bool = False
