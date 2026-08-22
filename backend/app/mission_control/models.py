from __future__ import annotations

from datetime import datetime
from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel, Field


class AssertionType(StrEnum):
    FACT = "FACT"
    DERIVED = "DERIVED"
    HYPOTHESIS = "HYPOTHESIS"


class OperationalCondition(StrEnum):
    NORMAL = "NORMAL"
    ATTENTION = "ATTENTION"
    CRITICAL = "CRITICAL"
    RECOVERING = "RECOVERING"
    UNKNOWN = "UNKNOWN"


class DataQuality(StrEnum):
    FRESH = "FRESH"
    STALE = "STALE"
    INCOMPLETE = "INCOMPLETE"
    CONFLICTING = "CONFLICTING"
    UNAVAILABLE = "UNAVAILABLE"


class Provenance(BaseModel):
    origin: str = "SYNTHETIC"
    representation: str
    source_system: str = "NORTHMINE_SCENARIO_HARNESS"
    source_id: str = "scenario-s01-ph03-stop-v1"
    demo_context: bool = True


class FlowEvidence(BaseModel):
    evidence_id: str
    assertion_type: AssertionType
    label: str
    value: str
    observed_at: datetime
    provenance: Provenance


class FlowNode(BaseModel):
    node_id: str
    entity_id: UUID | None = None
    external_id: str | None = None
    node_role: str
    entity_kind: str
    semantic_group: str
    label: str
    summary: str
    condition: OperationalCondition
    assertion_type: AssertionType
    data_quality: DataQuality = DataQuality.FRESH
    evidence_ids: list[str] = Field(default_factory=list)


class FlowRelationship(BaseModel):
    relationship_id: str
    source_node_id: str
    target_node_id: str
    relationship_type: str
    label: str
    assertion_type: AssertionType
    effective_from: datetime
    effective_to: datetime | None = None
    condition: OperationalCondition
    data_quality: DataQuality = DataQuality.FRESH
    confidence: float | None = Field(default=None, ge=0, le=1)
    impacted: bool = False
    provenance: Provenance


class FlowEvent(BaseModel):
    event_id: str
    event_type: str
    title: str
    severity: str
    status: str
    detected_at: datetime
    normalized_at: datetime | None = None
    primary_node_id: str
    affected_node_ids: list[str]
    evidence_ids: list[str]


class FlowMoment(BaseModel):
    label: str
    effective_at: datetime


class OperationalFlowSnapshot(BaseModel):
    schema_version: str = "mission-control.operational-flow.v1"
    tenant_id: str
    site_id: str
    shift_id: str
    shift_label: str
    site_timezone: str
    temporal_mode: str = "DEMO"
    effective_at: datetime
    generated_at: datetime
    provenance: Provenance
    data_quality: DataQuality
    scenario: str
    scenario_label: str
    stable_summary: str
    impact_summary: str
    scenario_moments: list[FlowMoment]
    nodes: list[FlowNode]
    relationships: list[FlowRelationship]
    evidence: list[FlowEvidence]
    active_event: FlowEvent | None = None
