from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

from app.ai.investigation_schemas import new_id, now_iso

"""Contratos de proactividad (Etapa 6, secciones 8/12/13 del brief).

Todo lo que el agente pueda hacer por iniciativa propia queda tipado aca -
nunca un string libre que el modelo generativo pueda inventar. Los
thresholds de AgentTrigger vienen SIEMPRE de configuracion/reglas
explicitas (seccion 8: 'No permitir que el modelo invente thresholds
ocultos') - se crean via API/seed, nunca los produce el LLM.
"""

QuietMode = Literal["normal", "visual_only", "quiet", "critical_only"]
ProactiveSeverity = Literal["informational", "warning", "high", "critical"]
WatchStatus = Literal["active", "triggered", "expired", "cancelled"]
TriggerCondition = Literal["above", "below", "stale"]


class AgentTrigger(BaseModel):
    trigger_id: str = Field(default_factory=lambda: new_id("trigger"))
    trigger_type: str
    entity_id: str | None = None
    metric: str | None = None
    condition: TriggerCondition
    threshold: float | None = None
    duration_seconds: int | None = None
    severity: ProactiveSeverity
    enabled: bool = True
    created_by: str
    created_at: str = Field(default_factory=now_iso)


class AgentWatch(BaseModel):
    watch_id: str = Field(default_factory=lambda: new_id("watch"))
    user_id: str
    company_id: str | None = None
    site_id: str | None = None
    entity_ids: list[str] = Field(default_factory=list)
    entity_label: str | None = None
    metric: str
    condition: TriggerCondition
    threshold: float | None = None
    baseline_reference: str | None = None
    source_investigation_id: str | None = None
    created_at: str = Field(default_factory=now_iso)
    expires_at: str | None = None
    status: WatchStatus = "active"
    triggered_at: str | None = None


class ProactiveAgentEvent(BaseModel):
    proactive_event_id: str = Field(default_factory=lambda: new_id("proev"))
    event_type: str
    severity: ProactiveSeverity
    title: str
    summary: str
    entity_ids: list[str] = Field(default_factory=list)
    evidence_ids: list[str] = Field(default_factory=list)
    source_event_ids: list[str] = Field(default_factory=list)
    watch_id: str | None = None
    trigger_id: str | None = None
    company_id: str | None = None
    site_id: str | None = None
    user_id: str | None = None
    status: Literal["new", "acknowledged", "investigating", "resolved", "dismissed"] = "new"
    fingerprint: str | None = None
    created_at: str = Field(default_factory=now_iso)
