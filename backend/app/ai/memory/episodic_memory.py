from __future__ import annotations

from app.ai.memory import persistence
from app.ai.memory.models import EpisodeType, OperationalEpisode, now_iso

"""Memoria episodica (Etapa 6, seccion 3.3 del brief). Persistente, guarda
EPISODIOS cerrados (investigacion terminada, informe aprobado, tarea
completada, handover) - nunca la conversacion completa que los produjo.
Cada `record_*` de este modulo se llama desde el punto exacto donde ese
episodio realmente termina (runtime.py al completar una investigacion,
work_products/*.py al aprobar/completar), no de forma especulativa.
"""


def record_investigation_episode(
    *, investigation_id: str, investigation_type: str, goal: str, company_id: str | None, site_id: str | None,
    entity_ids: list[str], evidence_ids: list[str], outcome: str, created_by: str,
) -> OperationalEpisode:
    episode = OperationalEpisode(
        episode_type="investigation",
        company_id=company_id, site_id=site_id,
        title=f"Investigación: {goal}",
        summary=outcome,
        entity_ids=entity_ids,
        evidence_ids=evidence_ids,
        investigation_ids=[investigation_id],
        outcome=outcome,
        ended_at=now_iso(),
        created_by=created_by,
    )
    persistence.save_episode(episode)
    return episode


def record_report_episode(
    *, report_id: str, report_type: str, title: str, company_id: str | None, site_id: str | None,
    entity_ids: list[str], evidence_ids: list[str], investigation_ids: list[str], human_decision: str,
    created_by: str,
) -> OperationalEpisode:
    episode = OperationalEpisode(
        episode_type="report",
        company_id=company_id, site_id=site_id,
        title=f"Informe: {title}",
        summary=f"{report_type} — {human_decision}",
        entity_ids=entity_ids, evidence_ids=evidence_ids, investigation_ids=investigation_ids,
        outcome=human_decision, human_decision=human_decision,
        ended_at=now_iso(), created_by=created_by,
    )
    persistence.save_episode(episode)
    return episode


def record_handover_episode(
    *, handover_id: str, title: str, company_id: str | None, site_id: str | None,
    entity_ids: list[str], investigation_ids: list[str], human_decision: str, created_by: str,
) -> OperationalEpisode:
    episode = OperationalEpisode(
        episode_type="handover",
        company_id=company_id, site_id=site_id,
        title=title,
        summary=f"Cambio de turno — {human_decision}",
        entity_ids=entity_ids, investigation_ids=investigation_ids,
        outcome=human_decision, human_decision=human_decision,
        ended_at=now_iso(), created_by=created_by,
    )
    persistence.save_episode(episode)
    return episode


def record_task_episode(
    *, task_id: str, title: str, company_id: str | None, site_id: str | None,
    entity_ids: list[str], evidence_ids: list[str], investigation_ids: list[str],
    outcome: str, created_by: str,
) -> OperationalEpisode:
    episode = OperationalEpisode(
        episode_type="task",
        company_id=company_id, site_id=site_id,
        title=f"Tarea: {title}",
        summary=outcome,
        entity_ids=entity_ids, evidence_ids=evidence_ids, investigation_ids=investigation_ids,
        outcome=outcome, ended_at=now_iso(), created_by=created_by,
    )
    persistence.save_episode(episode)
    return episode


def list_recent(
    *, company_id: str | None, site_id: str | None, episode_type: EpisodeType | None = None,
    entity_id: str | None = None, limit: int = 20,
) -> list[OperationalEpisode]:
    return persistence.list_episodes(
        company_id=company_id, site_id=site_id, episode_type=episode_type, entity_id=entity_id, limit=limit,
    )


def get(episode_id: str) -> OperationalEpisode | None:
    return persistence.get_episode(episode_id)
