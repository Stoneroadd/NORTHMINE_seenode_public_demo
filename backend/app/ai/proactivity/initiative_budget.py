from __future__ import annotations

import hashlib
from datetime import datetime, timedelta, timezone

from app.ai.proactivity import persistence
from app.ai.proactivity.policies import severity_at_least
from app.core.config import get_settings

"""InitiativeBudget (Etapa 6, seccion 10 del brief): el agente NO debe
transformarse en un sistema molesto. Tres filtros independientes, en orden:

1. severidad minima configurada (agent_initiative_minimum_severity)
2. presupuesto por hora (agent_proactive_events_per_hour) por alcance company/site
3. supresion de duplicados/cooldown por fingerprint (misma entidad+metrica+
   condicion) durante max(cooldown, duplicate_suppression) segundos

Nota de diseño: el brief distingue 'cooldown_per_entity' de
'duplicate_suppression_window' como dos conceptos. Se consolidan aca en una
sola ventana (el mayor de los dos) porque el fingerprint ya identifica
entidad+metrica+condicion - dos ventanas separadas sobre la MISMA clave no
agregan proteccion real, solo complejidad. Documentado explicitamente para
que quede claro que es una simplificacion intencional, no un olvido.
"""


def build_fingerprint(*, entity_id: str, metric: str, condition: str, investigation_id: str | None = None) -> str:
    raw = f"{entity_id}|{metric}|{condition}|{investigation_id or ''}"
    return hashlib.sha1(raw.encode("utf-8")).hexdigest()[:16]


class InitiativeDecision:
    def __init__(self, allowed: bool, reason: str | None = None, *, is_duplicate: bool = False):
        self.allowed = allowed
        self.reason = reason
        self.is_duplicate = is_duplicate

    def __bool__(self) -> bool:
        return self.allowed


def evaluate(*, company_id: str | None, site_id: str | None, severity: str, fingerprint: str) -> InitiativeDecision:
    settings = get_settings()

    if not severity_at_least(severity, settings.agent_initiative_minimum_severity):
        return InitiativeDecision(False, "severity_below_minimum")

    now = datetime.now(timezone.utc)
    hour_ago = (now - timedelta(hours=1)).isoformat(timespec="seconds")
    emitted_this_hour = persistence.count_events_since(company_id=company_id, site_id=site_id, since_iso=hour_ago)
    if emitted_this_hour >= settings.agent_proactive_events_per_hour:
        return InitiativeDecision(False, "hourly_budget_exceeded")

    suppression_seconds = max(settings.agent_initiative_cooldown_seconds, settings.agent_initiative_duplicate_suppression_seconds)
    suppression_cutoff = (now - timedelta(seconds=suppression_seconds)).isoformat(timespec="seconds")
    if persistence.last_event_for_fingerprint(fingerprint, since_iso=suppression_cutoff):
        return InitiativeDecision(False, "duplicate_suppressed", is_duplicate=True)

    return InitiativeDecision(True)
