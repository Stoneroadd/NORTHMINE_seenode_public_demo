from __future__ import annotations

from datetime import datetime, timezone

from app.ai.proactivity import persistence
from app.ai.proactivity.models import AgentTrigger

"""Trigger Engine (Etapa 6, seccion 8 del brief). Reglas tipadas, con
thresholds que SIEMPRE vienen de configuracion/reglas explicitas - nunca
inventados por el modelo generativo (este modulo no llama a ningun LLM).

DEFAULT_TRIGGERS documenta los 5 ejemplos del brief como reglas reales del
sistema (created_by='system', visibles y auditables, no ocultas en el
prompt). Un despliegue real reemplazaria/ampliaria esto con triggers
creados por un usuario autorizado via `register_trigger` - el contrato ya
lo soporta (creado_by es siempre un usuario real, nunca 'system' para los
que se agreguen despues).
"""

DEFAULT_TRIGGERS: list[AgentTrigger] = [
    # Mismos thresholds que runtime/findings.py::_DEVIATION_KEYS (Etapa 4) -
    # una desviacion que amerita un hallazgo dentro de una investigacion
    # amerita la misma severidad como evento proactivo, sin dos escalas
    # distintas para el mismo numero.
    AgentTrigger(
        trigger_type="production_below_plan", metric="cumplimiento_pct", condition="below", threshold=95.0,
        duration_seconds=900, severity="warning", created_by="system",
    ),
    AgentTrigger(
        trigger_type="fleet_availability_low", metric="disponibilidad_pct", condition="below", threshold=85.0,
        duration_seconds=0, severity="warning", created_by="system",
    ),
    AgentTrigger(
        trigger_type="data_quality_low", metric="score", condition="below", threshold=70.0,
        duration_seconds=0, severity="warning", created_by="system",
    ),
    # Rendimiento de unidad de carguio bajo plan (seccion 8 del brief) -
    # variacion_pct de get_loading_performance, evaluado por unidad.
    AgentTrigger(
        trigger_type="loading_unit_underperformance", metric="variacion_pct", condition="below", threshold=-10.0,
        duration_seconds=1200, severity="warning", created_by="system",
    ),
    AgentTrigger(
        trigger_type="alert_critical_created", metric=None, condition="above", threshold=None,
        duration_seconds=0, severity="critical", created_by="system",
    ),
]

_STALE_TRIGGER = AgentTrigger(
    trigger_type="equipment_data_stale", metric="age_seconds", condition="stale", threshold=600,
    duration_seconds=0, severity="warning", created_by="system",
)


def condition_met(trigger: AgentTrigger, value: float | None) -> bool:
    if trigger.threshold is None or value is None:
        return False
    if trigger.condition == "above":
        return value > trigger.threshold
    if trigger.condition == "below":
        return value < trigger.threshold
    return False


def is_stale(updated_at_iso: str | None, *, max_age_seconds: float | None = None) -> bool:
    if not updated_at_iso:
        return True
    limit = max_age_seconds if max_age_seconds is not None else (_STALE_TRIGGER.threshold or 600)
    try:
        updated_at = datetime.fromisoformat(updated_at_iso.replace("Z", "+00:00"))
    except ValueError:
        return True
    if updated_at.tzinfo is None:
        updated_at = updated_at.replace(tzinfo=timezone.utc)
    age = (datetime.now(timezone.utc) - updated_at).total_seconds()
    return age > limit


def register_trigger(trigger: AgentTrigger) -> None:
    persistence.save_trigger(trigger)


def disable_trigger(trigger_id: str) -> None:
    persistence.delete_trigger(trigger_id)


def list_effective_triggers() -> list[AgentTrigger]:
    custom = {t.trigger_type: t for t in persistence.list_triggers(enabled_only=True)}
    defaults = {t.trigger_type: t for t in DEFAULT_TRIGGERS}
    defaults.update(custom)
    return list(defaults.values())
