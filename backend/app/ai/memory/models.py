from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

from app.ai.investigation_schemas import new_id, now_iso

"""Contratos de memoria (Etapa 6, secciones 3-4 del brief).

Tres capas, cada una con su propia finalidad y ciclo de vida - nunca una
sola bolsa indiferenciada de "memoria":

- SessionMemorySnapshot: vive en LiveSession (memoria de proceso), ventana
  limitada + resumen estructurado. Se resuelve aca "esa pala"/"lo de hace
  un rato" - nunca texto de conversacion completo.
- WorkingMemoryEntity: persistente pero acotada al turno/ventana
  operacional (agent_working_memory_window_hours). Una entidad con un
  problema activo, no un log.
- OperationalEpisode: persistente, un episodio cerrado (investigacion
  terminada, informe aprobado, tarea completada, handover) - no la
  conversacion que lo produjo.

Aislamiento (seccion 37): toda consulta de memoria persistente DEBE
filtrar por company_id/site_id explicitamente - estos modelos los
declaran, pero la responsabilidad de aplicarlos vive en
working_memory.py/episodic_memory.py/retrieval.py, nunca delegada al
llamador.
"""

EntityMemoryStatus = Literal["new", "ongoing", "worsening", "improving", "resolved"]


class WorkingMemoryEntity(BaseModel):
    entity_id: str
    entity: str
    entity_type: str
    company_id: str | None = None
    site_id: str | None = None
    shift: str | None = None
    current_issue: str
    status: EntityMemoryStatus = "new"
    first_detected_at: str = Field(default_factory=now_iso)
    last_verified_at: str = Field(default_factory=now_iso)
    related_investigation_ids: list[str] = Field(default_factory=list)
    related_alert_ids: list[str] = Field(default_factory=list)
    related_watch_ids: list[str] = Field(default_factory=list)
    last_metric_value: float | None = None
    last_metric_label: str | None = None
    created_by: str | None = None


def new_working_memory_entity_id(entity_type: str, entity: str) -> str:
    return f"{entity_type}:{entity}".lower().replace(" ", "-")


EpisodeType = Literal["investigation", "incident", "report", "task", "handover"]


class OperationalEpisode(BaseModel):
    episode_id: str = Field(default_factory=lambda: new_id("episode"))
    episode_type: EpisodeType
    company_id: str | None = None
    site_id: str | None = None
    title: str
    summary: str
    entity_ids: list[str] = Field(default_factory=list)
    evidence_ids: list[str] = Field(default_factory=list)
    investigation_ids: list[str] = Field(default_factory=list)
    outcome: str | None = None
    human_decision: str | None = None
    started_at: str = Field(default_factory=now_iso)
    ended_at: str | None = None
    created_by: str


SessionMemoryEntryKind = Literal["entity", "widget", "investigation", "finding", "question"]


class SessionMemoryEntry(BaseModel):
    """Un item breve de la ventana de sesion (seccion 3.1) - referencia
    estructurada, no texto de conversacion. `label` es lo que se muestra al
    usuario en la seccion MEMORIA; `ref_id` es lo que resuelve 'esa pala'."""

    kind: SessionMemoryEntryKind
    label: str
    ref_id: str | None = None
    entity_type: str | None = None
    recorded_at: str = Field(default_factory=now_iso)


class SessionMemorySnapshot(BaseModel):
    """Vista serializable de la memoria de sesion actual - lo que viaja al
    frontend (seccion 30: 'MEMORIA' en AgentWorkspace) y lo que usa el
    Command Router para resolver referencias (seccion 6)."""

    active_investigation_id: str | None = None
    active_investigation_summary: str | None = None
    last_widget_label: str | None = None
    last_entity_id: str | None = None
    last_entity_label: str | None = None
    recent_entries: list[SessionMemoryEntry] = Field(default_factory=list)
