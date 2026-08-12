from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

from app.ai.investigation_schemas import DateRange, EvidenceItem, new_id, now_iso

"""Contratos de work products (Etapa 6, secciones 17-26 del brief).

Un informe/handover/tarea es un OBJETO PERSISTENTE, no una respuesta de
chat (seccion 18) - se abre, edita, versiona y aprueba/rechaza como
cualquier otro recurso del sistema. `decision_authority`/
`requires_human_approval` se declaran aca como literales fijos (mismo
patron que InvestigationConclusion en investigation_schemas.py) - el
backend los impone, nunca dependen de lo que el modelo generativo
'decida' escribir (seccion 34).
"""

ReportType = Literal[
    "SHIFT_REPORT", "INVESTIGATION_REPORT", "PRODUCTION_REPORT",
    "FLEET_REPORT", "BREAKDOWN_REPORT", "EXECUTIVE_SUMMARY",
]
WorkProductStatus = Literal["draft", "review", "approved", "rejected"]
Audience = Literal["dispatcher", "supervisor", "manager", "executive"]


class ReportScope(BaseModel):
    shift: str | None = None
    date_range: DateRange | None = None
    equipment_ids: list[str] = Field(default_factory=list)
    audience: Audience = "supervisor"


class ReportSection(BaseModel):
    section_id: str
    title: str
    content: str
    evidence_ids: list[str] = Field(default_factory=list)


class ReportIdentification(BaseModel):
    site: str | None = None
    pit: str | None = None
    date: str | None = None
    shift: str | None = None
    period: str | None = None


class ReportTable(BaseModel):
    table_id: str
    title: str
    question: str
    columns: list[str]
    rows: list[dict[str, str | int | float | None]]
    evidence_ids: list[str] = Field(default_factory=list)


class ReportChart(BaseModel):
    chart_id: str
    title: str
    question: str
    chart_type: Literal["bar", "line", "area"]
    x_field: str
    y_fields: list[str]
    data: list[dict[str, str | int | float | None]]
    evidence_ids: list[str] = Field(default_factory=list)


class ReportQualityGate(BaseModel):
    passed: bool = False
    total_score: int = 0
    evidence_coverage: int = 0
    numerical_consistency: int = 0
    scope_correctness: int = 0
    freshness: int = 0
    completeness: int = 0
    contradictions: int = 0
    formatting: int = 0
    errors: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


class ReportDraft(BaseModel):
    report_id: str = Field(default_factory=lambda: new_id("report"))
    report_type: ReportType
    title: str
    scope: ReportScope
    status: WorkProductStatus = "draft"
    sections: list[ReportSection] = Field(default_factory=list)
    identification: ReportIdentification = Field(default_factory=ReportIdentification)
    tables: list[ReportTable] = Field(default_factory=list)
    charts: list[ReportChart] = Field(default_factory=list)
    evidence_ids: list[str] = Field(default_factory=list)
    evidence_snapshot: list[EvidenceItem] = Field(default_factory=list, exclude=True)
    investigation_ids: list[str] = Field(default_factory=list)
    company_id: str | None = None
    site_id: str | None = None
    generated_by: str
    generated_at: str = Field(default_factory=now_iso)
    updated_at: str = Field(default_factory=now_iso)
    version: int = 1
    change_log: list[str] = Field(default_factory=list)
    conceptual_diff: list[str] = Field(default_factory=list)
    quality_gate: ReportQualityGate = Field(default_factory=ReportQualityGate)
    generation_metadata: dict[str, str] = Field(default_factory=dict, exclude=True)
    approved_by: str | None = None
    approved_at: str | None = None
    rejection_reason: str | None = None
    # Impuestos por el backend (seccion 34) - el modelo/composer no los toca.
    requires_human_approval: Literal[True] = True
    decision_authority: Literal["human"] = "human"


class HandoverSection(BaseModel):
    section_id: str
    title: str
    content: str


class ShiftHandoverDraft(BaseModel):
    handover_id: str = Field(default_factory=lambda: new_id("handover"))
    title: str
    shift: str | None = None
    status: WorkProductStatus = "draft"
    sections: list[HandoverSection] = Field(default_factory=list)
    pending_for_next_shift: list[str] = Field(default_factory=list)
    resolved_this_shift: list[str] = Field(default_factory=list)
    investigation_ids: list[str] = Field(default_factory=list)
    task_ids: list[str] = Field(default_factory=list)
    watch_ids: list[str] = Field(default_factory=list)
    data_quality_notes: list[str] = Field(default_factory=list)
    company_id: str | None = None
    site_id: str | None = None
    generated_by: str
    generated_at: str = Field(default_factory=now_iso)
    version: int = 1
    approved_by: str | None = None
    approved_at: str | None = None
    rejection_reason: str | None = None
    requires_human_approval: Literal[True] = True
    decision_authority: Literal["human"] = "human"


TaskPriority = Literal["low", "medium", "high"]
TaskStatus = Literal["draft", "pending_approval", "approved", "rejected", "in_progress", "completed", "cancelled"]


class TaskDraft(BaseModel):
    task_id: str = Field(default_factory=lambda: new_id("task"))
    title: str
    description: str
    reason: str
    priority_suggested: TaskPriority = "medium"
    responsible_suggested: str | None = None
    entity_ids: list[str] = Field(default_factory=list)
    evidence_ids: list[str] = Field(default_factory=list)
    investigation_id: str | None = None
    finding_ids: list[str] = Field(default_factory=list)
    hypothesis_ids: list[str] = Field(default_factory=list)
    due_at: str | None = None
    status: TaskStatus = "draft"
    company_id: str | None = None
    site_id: str | None = None
    created_by: str
    created_at: str = Field(default_factory=now_iso)
    approved_by: str | None = None
    rejection_reason: str | None = None
    requires_human_approval: Literal[True] = True
    decision_authority: Literal["human"] = "human"
