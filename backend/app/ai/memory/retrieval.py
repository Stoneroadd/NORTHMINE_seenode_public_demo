from __future__ import annotations

from pydantic import BaseModel, Field

from app.ai.memory import episodic_memory, working_memory
from app.ai.memory.models import EpisodeType, OperationalEpisode, WorkingMemoryEntity, new_working_memory_entity_id

"""MemoryRetriever (Etapa 6, seccion 5 del brief).

Consulta por entidad/periodo/tipo/investigacion/equipo/turno/estado -
filtros estructurados sobre IDs/timestamps/entidades, NUNCA similitud
vectorial (seccion 38: 'no agregues infraestructura vectorial compleja si
no es necesaria' - aca no lo es: el volumen y la naturaleza de esta memoria
se resuelven completos con index por company/site/tipo/entidad).

Toda recuperacion devuelve, para cada item, fecha/entidad/fuente/estado/
relacion/evidencia disponible (seccion 5) - nunca solo un texto libre.
"""


class MemoryRecallItem(BaseModel):
    kind: str
    ref_id: str
    label: str
    status: str
    occurred_at: str
    source: str
    related_investigation_ids: list[str] = Field(default_factory=list)
    evidence_ids: list[str] = Field(default_factory=list)


class MemoryRecallResult(BaseModel):
    query_entity: str | None = None
    working_memory_entity: WorkingMemoryEntity | None = None
    episodes: list[OperationalEpisode] = Field(default_factory=list)
    found: bool = False

    def items(self) -> list[MemoryRecallItem]:
        result: list[MemoryRecallItem] = []
        if self.working_memory_entity:
            wm = self.working_memory_entity
            result.append(MemoryRecallItem(
                kind="working_memory", ref_id=wm.entity_id, label=f"{wm.entity}: {wm.current_issue}",
                status=wm.status, occurred_at=wm.last_verified_at, source="working_memory",
                related_investigation_ids=wm.related_investigation_ids,
            ))
        for ep in self.episodes:
            result.append(MemoryRecallItem(
                kind=f"episode:{ep.episode_type}", ref_id=ep.episode_id, label=ep.title,
                status=ep.outcome or "sin resultado registrado", occurred_at=ep.ended_at or ep.started_at,
                source="episodic_memory", related_investigation_ids=ep.investigation_ids, evidence_ids=ep.evidence_ids,
            ))
        return result

    def as_spoken_summary(self) -> str:
        if not self.found:
            return "No tengo antecedentes registrados sobre eso."
        parts: list[str] = []
        if self.working_memory_entity:
            wm = self.working_memory_entity
            status_text = {
                "new": "es una desviacion nueva", "ongoing": "sigue activa", "worsening": "sigue activa y empeoro",
                "improving": "sigue activa pero mejoro", "resolved": "ya se resolvio",
            }.get(wm.status, wm.status)
            parts.append(f"{wm.entity}: {wm.current_issue} - {status_text}, ultima verificacion {wm.last_verified_at}.")
        if self.episodes:
            latest = self.episodes[0]
            parts.append(f"Ultimo antecedente registrado: {latest.title} ({latest.started_at}) - {latest.outcome or 'sin resultado registrado'}.")
        return " ".join(parts)


class MemoryRetriever:
    """Instanciado por sesion/comando con el alcance (company/site) de la
    sesion activa - nunca se construye sin alcance (seccion 37: aislamiento)."""

    def __init__(self, *, company_id: str | None, site_id: str | None):
        self.company_id = company_id
        self.site_id = site_id

    def recall_entity(self, entity_type: str, entity: str, *, limit: int = 5) -> MemoryRecallResult:
        entity_id = new_working_memory_entity_id(entity_type, entity)
        wm = working_memory.get_entity(entity_id)
        if wm and (wm.company_id != self.company_id or wm.site_id != self.site_id):
            wm = None  # aislamiento: nunca devolver memoria de otro alcance
        episodes = episodic_memory.list_recent(
            company_id=self.company_id, site_id=self.site_id, entity_id=entity_id, limit=limit,
        )
        return MemoryRecallResult(query_entity=entity, working_memory_entity=wm, episodes=episodes, found=bool(wm or episodes))

    def recall_by_label(self, entity: str, *, limit: int = 5) -> MemoryRecallResult:
        wm = working_memory.find_by_label(company_id=self.company_id, site_id=self.site_id, entity=entity)
        entity_id = wm.entity_id if wm else None
        episodes = (
            episodic_memory.list_recent(company_id=self.company_id, site_id=self.site_id, entity_id=entity_id, limit=limit)
            if entity_id else []
        )
        return MemoryRecallResult(query_entity=entity, working_memory_entity=wm, episodes=episodes, found=bool(wm or episodes))

    def recall_investigation(self, investigation_id: str) -> MemoryRecallResult:
        episodes = [
            e for e in episodic_memory.list_recent(company_id=self.company_id, site_id=self.site_id, episode_type="investigation", limit=200)
            if investigation_id in e.investigation_ids
        ]
        return MemoryRecallResult(episodes=episodes, found=bool(episodes))

    def recent_episodes(self, *, episode_type: EpisodeType | None = None, limit: int = 20) -> list[OperationalEpisode]:
        return episodic_memory.list_recent(company_id=self.company_id, site_id=self.site_id, episode_type=episode_type, limit=limit)

    def active_entities(self, *, limit: int = 50) -> list[WorkingMemoryEntity]:
        return working_memory.list_active(company_id=self.company_id, site_id=self.site_id, limit=limit)
