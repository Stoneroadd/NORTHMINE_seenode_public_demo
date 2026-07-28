from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class OperatorScoreBreakdown(BaseModel):
    productividad_score: float = Field(ge=0, le=100)
    disponibilidad_score: float = Field(ge=0, le=100)
    utilizacion_score: float = Field(ge=0, le=100)
    control_demoras_score: float = Field(ge=0, le=100)
    seguridad_score: float = Field(ge=0, le=100)
    score_global: float = Field(ge=0, le=100)


class OperatorRecurrence(BaseModel):
    bathroom_over_threshold_shifts: int
    lunch_over_threshold_shifts: int
    shift_change_over_threshold_shifts: int
    no_assignment_over_threshold_shifts: int
    high_delay_shifts: int
    pattern_level: str


class OperatorRankingItem(BaseModel):
    rank: int
    operator_id: str
    operator_name: str
    frequent_equipment_id: str
    score_global: float
    productividad_score: float
    disponibilidad_score: float
    utilizacion_score: float
    control_demoras_score: float
    seguridad_score: float
    toneladas_reales: int
    toneladas_esperadas: int
    ciclos: int
    tph: float
    disponibilidad_percent: float
    utilizacion_percent: float
    total_delay_minutes: int
    manageable_delay_minutes: int
    system_delay_minutes: int
    bathroom_minutes: int
    lunch_minutes: int
    shift_change_minutes: int
    fueling_minutes: int
    no_assignment_minutes: int
    lost_tons_estimated: int
    recurrence_level: str
    main_loss_cause: str
    risk_level: str
    recommendation: str
    recurrence: OperatorRecurrence
    manageable_delay_breakdown: dict[str, int] = Field(default_factory=dict)
    system_delay_breakdown: dict[str, int] = Field(default_factory=dict)


class OperatorRankingSummary(BaseModel):
    best_operator: str
    best_score: float
    average_score: float
    high_risk_count: int
    total_lost_tons_estimated: int
    manageable_delay_minutes: int
    main_loss_cause: str


class OperatorRankingResponse(BaseModel):
    source: str
    data_mode: str
    data_source: str | None = None
    source_system: str | None = None
    generated_at: str | None = None
    filters: dict[str, str] = Field(default_factory=dict)
    count: int
    summary: OperatorRankingSummary
    items: list[OperatorRankingItem]


class OperatorRankingMethodologyResponse(BaseModel):
    source: str
    data_mode: str
    score_formula: dict[str, Any]
    weights: dict[str, float]
    manageable_delays: list[dict[str, Any]]
    system_delays: list[dict[str, Any]]
    thresholds: dict[str, Any]
    interpretation: dict[str, str]
    responsible_use_note: str


class OperatorRankingAuditResponse(BaseModel):
    source: str
    data_mode: str
    generated_at: str
    requested_by: str
    applied_filters: dict[str, str]
    seed_id: str
    operator: dict[str, Any]
    period: dict[str, Any]
    score: dict[str, Any]
    components: dict[str, float]
    raw_values: dict[str, Any]
    normalized_scores: dict[str, float]
    penalties: dict[str, Any]
    thresholds_used: dict[str, Any]
    calculation_trace: list[dict[str, Any]]
    manageable_delay_excess: list[dict[str, Any]]
    recurrence: dict[str, Any]
    system_delays_context: dict[str, int]
    explanation_lines: list[str]
    recommendation: str
    responsible_use_note: str
