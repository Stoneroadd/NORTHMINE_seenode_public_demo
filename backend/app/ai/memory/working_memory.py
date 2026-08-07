from __future__ import annotations

from typing import Literal

from app.ai.memory import persistence
from app.ai.memory.models import EntityMemoryStatus, WorkingMemoryEntity, new_working_memory_entity_id, now_iso

"""Working memory operacional (Etapa 6, seccion 3.2 del brief).

Una entidad con un problema activo (una pala bajo rendimiento, una
desviacion de produccion), acotada al turno/ventana operacional
(agent_working_memory_window_hours en Settings). No es un log: cada
`track_entity()` actualiza el MISMO registro para esa entidad, derivando
status (new/ongoing/worsening/improving/resolved) a partir del ultimo valor
conocido - asi el agente puede decir 'la desviacion de Pala 03 continua,
pero mejoro respecto de hace veinte minutos' en vez de generar un registro
nuevo cada vez (seccion 11 del brief).
"""

MetricDirection = Literal["higher_is_worse", "lower_is_worse"]


def track_entity(
    *, entity: str, entity_type: str, company_id: str | None, site_id: str | None, shift: str | None,
    current_issue: str, metric_value: float | None = None, metric_label: str | None = None,
    metric_direction: MetricDirection = "higher_is_worse",
    investigation_id: str | None = None, alert_id: str | None = None, watch_id: str | None = None,
    created_by: str | None = None,
) -> WorkingMemoryEntity:
    entity_id = new_working_memory_entity_id(entity_type, entity)
    existing = persistence.get_working_memory_entity(entity_id)
    first_detected_at = existing.first_detected_at if existing else now_iso()
    status = _derive_status(existing, metric_value, metric_direction)

    updated = WorkingMemoryEntity(
        entity_id=entity_id, entity=entity, entity_type=entity_type, company_id=company_id, site_id=site_id,
        shift=shift, current_issue=current_issue, status=status, first_detected_at=first_detected_at,
        last_verified_at=now_iso(),
        related_investigation_ids=_merge(existing.related_investigation_ids if existing else [], investigation_id),
        related_alert_ids=_merge(existing.related_alert_ids if existing else [], alert_id),
        related_watch_ids=_merge(existing.related_watch_ids if existing else [], watch_id),
        last_metric_value=metric_value, last_metric_label=metric_label or (existing.last_metric_label if existing else None),
        created_by=created_by or (existing.created_by if existing else None),
    )
    persistence.upsert_working_memory_entity(updated)
    return updated


def _merge(existing: list[str], new_id: str | None) -> list[str]:
    if not new_id:
        return existing
    return list(dict.fromkeys([*existing, new_id]))


def _derive_status(
    existing: WorkingMemoryEntity | None, metric_value: float | None, direction: MetricDirection,
) -> EntityMemoryStatus:
    if existing is None or existing.status == "resolved":
        return "new"
    if metric_value is None or existing.last_metric_value is None or metric_value == existing.last_metric_value:
        return "ongoing"
    got_worse = metric_value > existing.last_metric_value if direction == "higher_is_worse" else metric_value < existing.last_metric_value
    return "worsening" if got_worse else "improving"


def resolve_entity(entity_id: str) -> WorkingMemoryEntity | None:
    existing = persistence.get_working_memory_entity(entity_id)
    if not existing or existing.status == "resolved":
        return None
    resolved = existing.model_copy(update={"status": "resolved", "last_verified_at": now_iso()})
    persistence.upsert_working_memory_entity(resolved)
    return resolved


def get_entity(entity_id: str) -> WorkingMemoryEntity | None:
    return persistence.get_working_memory_entity(entity_id)


def find_by_label(*, company_id: str | None, site_id: str | None, entity: str) -> WorkingMemoryEntity | None:
    """Busqueda tolerante por texto (p.ej. 'Pala 03' viniendo del Command
    Router) contra las entidades activas de este alcance - sin vector store
    (seccion 38), solo normalizacion simple de mayusculas/espacios."""
    normalized = entity.strip().lower()
    for item in list_active(company_id=company_id, site_id=site_id):
        if item.entity.strip().lower() == normalized:
            return item
    return None


def list_active(*, company_id: str | None, site_id: str | None, limit: int = 200) -> list[WorkingMemoryEntity]:
    return [
        e for e in persistence.list_working_memory_entities(company_id=company_id, site_id=site_id, limit=limit)
        if e.status != "resolved"
    ]


def list_all(*, company_id: str | None, site_id: str | None, status: str | None = None, limit: int = 200) -> list[WorkingMemoryEntity]:
    return persistence.list_working_memory_entities(company_id=company_id, site_id=site_id, status=status, limit=limit)
