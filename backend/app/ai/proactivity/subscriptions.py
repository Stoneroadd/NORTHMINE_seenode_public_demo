from __future__ import annotations

from datetime import datetime, timedelta, timezone

from app.ai.investigation_schemas import now_iso
from app.ai.proactivity import persistence
from app.ai.proactivity.models import AgentWatch, TriggerCondition, WatchStatus
from app.core.config import get_settings

"""Watches (Etapa 6, seccion 12 del brief): 'Avisame si vuelve a empeorar'
crea un AgentWatch concreto, con expiracion (nunca indefinido por defecto -
seccion 12: 'No crear watches indefinidos por defecto') y limite por
usuario (agent_watch_limit_per_user, seccion 39)."""


class WatchLimitExceeded(Exception):
    def __init__(self, user_id: str, limit: int):
        self.user_id = user_id
        self.limit = limit
        super().__init__(f"Usuario {user_id} alcanzo el limite de {limit} seguimientos activos")


def create_watch(
    *, user_id: str, company_id: str | None, site_id: str | None, entity_ids: list[str], entity_label: str | None,
    metric: str, condition: TriggerCondition, threshold: float | None = None, baseline_reference: str | None = None,
    source_investigation_id: str | None = None, ttl_hours: float | None = None,
    status: WatchStatus = "active",
) -> AgentWatch:
    settings = get_settings()
    if persistence.count_active_watches(user_id) >= settings.agent_watch_limit_per_user:
        raise WatchLimitExceeded(user_id, settings.agent_watch_limit_per_user)

    effective_ttl = settings.agent_watch_default_ttl_hours if ttl_hours is None else ttl_hours
    expires_at = None
    if effective_ttl and effective_ttl > 0:
        expires_at = (datetime.now(timezone.utc) + timedelta(hours=effective_ttl)).isoformat(timespec="seconds")

    watch = AgentWatch(
        user_id=user_id, company_id=company_id, site_id=site_id, entity_ids=entity_ids, entity_label=entity_label,
        metric=metric, condition=condition, threshold=threshold, baseline_reference=baseline_reference,
        source_investigation_id=source_investigation_id, expires_at=expires_at, status=status,
    )
    persistence.save_watch(watch)
    return watch


def cancel_watch(watch_id: str, user_id: str) -> AgentWatch | None:
    watch = persistence.get_watch(watch_id)
    if not watch or watch.user_id != user_id or watch.status != "active":
        return None
    cancelled = watch.model_copy(update={"status": "cancelled"})
    persistence.save_watch(cancelled)
    return cancelled


def cancel_watch_by_entity(user_id: str, entity_query: str) -> AgentWatch | None:
    normalized = entity_query.strip().lower()
    for watch in persistence.list_watches(user_id=user_id, status="active"):
        label_match = watch.entity_label and watch.entity_label.strip().lower() == normalized
        id_match = normalized in [e.lower() for e in watch.entity_ids]
        if label_match or id_match:
            return cancel_watch(watch.watch_id, user_id)
    return None


def mark_triggered(watch_id: str) -> AgentWatch | None:
    watch = persistence.get_watch(watch_id)
    if not watch:
        return None
    triggered = watch.model_copy(update={"status": "triggered", "triggered_at": now_iso()})
    persistence.save_watch(triggered)
    return triggered


def expire_due_watches() -> list[AgentWatch]:
    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    expired: list[AgentWatch] = []
    for watch in persistence.list_watches(status="active", limit=500):
        if watch.expires_at and watch.expires_at < now:
            updated = watch.model_copy(update={"status": "expired"})
            persistence.save_watch(updated)
            expired.append(updated)
    return expired


def list_active_for_user(user_id: str) -> list[AgentWatch]:
    return persistence.list_watches(user_id=user_id, status="active")


def list_all_active() -> list[AgentWatch]:
    return persistence.list_watches(status="active", limit=500)
