from __future__ import annotations

import asyncio
import logging
from typing import Any

from app.ai.memory import working_memory
from app.ai.memory.models import WorkingMemoryEntity, new_working_memory_entity_id
from app.ai.proactivity import initiative_budget, notification_manager, subscriptions, trigger_engine
from app.ai.proactivity.models import AgentTrigger, AgentWatch, ProactiveAgentEvent
from app.ai.tools import TOOL_REGISTRY
from app.core.config import get_settings

logger = logging.getLogger("northmine.ai.proactivity.event_monitor")

"""EventMonitor (Etapa 6, seccion 7 del brief): scheduler controlado (un
solo loop periodico, NO polling agresivo desde cada componente) que evalua
TriggerEngine + AgentWatch contra datos reales via TOOL_REGISTRY - las
mismas herramientas de solo lectura que ya usa el motor de investigacion,
nunca una fuente de datos paralela.

Alcance de esta implementacion: el dataset operacional de NORTHMINE no esta
particionado por company/site en las herramientas actuales (demo
single-tenant, seccion 37 del brief: 'aunque demo sea single-tenant,
preparar contratos') - los triggers de faena se evaluan una vez por tick
sobre el dataset global y se emiten con company_id/site_id=None; los
AgentWatch si llevan el alcance de su usuario y se respeta al entregar.
"""

_TRIGGER_METRIC_SOURCE: dict[str, str] = {
    "production_below_plan": "get_production_kpis",
    "fleet_availability_low": "get_fleet_status",
    "data_quality_low": "get_data_quality_status",
}


def _call_tool(name: str) -> dict[str, Any] | None:
    tool = TOOL_REGISTRY.get(name)
    if not tool:
        return None
    try:
        return tool.handler({})
    except Exception:  # noqa: BLE001 - una herramienta fallida no debe tumbar el tick completo
        logger.exception("Event monitor tool call failed tool=%s", name)
        return None


def _issue_label(trigger: AgentTrigger, value: float) -> str:
    labels = {
        "production_below_plan": f"Cumplimiento de producción en {value:.1f}%, bajo el {trigger.threshold:.0f}% esperado.",
        "fleet_availability_low": f"Disponibilidad de flota en {value:.1f}%, bajo el {trigger.threshold:.0f}% esperado.",
        "data_quality_low": f"Calidad de datos en {value:.0f}/100, bajo el {trigger.threshold:.0f} esperado.",
    }
    return labels.get(trigger.trigger_type, f"{trigger.metric}: {value}")


def _phrase(entity: WorkingMemoryEntity) -> str:
    if entity.status == "worsening":
        return f"{entity.current_issue} Sigue activo y empeoró desde la última verificación."
    if entity.status == "improving":
        return f"{entity.current_issue} Sigue activo pero mejoró desde la última verificación."
    if entity.status == "new":
        return entity.current_issue
    return f"{entity.current_issue} Continúa sin cambios relevantes."


async def _apply_trigger_result(
    *, trigger: AgentTrigger, entity: str, entity_type: str, met: bool, value: float | None,
    metric_label: str | None, issue_label: str,
) -> None:
    entity_id = new_working_memory_entity_id(entity_type, entity)
    existing = working_memory.get_entity(entity_id)

    if not met:
        if existing and existing.status != "resolved":
            resolved = working_memory.resolve_entity(entity_id)
            if resolved:
                await notification_manager.deliver(ProactiveAgentEvent(
                    event_type=f"{trigger.trigger_type}_resolved", severity="informational",
                    title=f"{resolved.entity}: resuelto", trigger_id=trigger.trigger_id,
                    summary=f"{resolved.entity}: {resolved.current_issue} volvió al rango normal.",
                    entity_ids=[resolved.entity_id],
                ))
        return

    updated = working_memory.track_entity(
        entity=entity, entity_type=entity_type, company_id=None, site_id=None, shift=None,
        current_issue=issue_label, metric_value=value, metric_label=metric_label,
        metric_direction="lower_is_worse" if trigger.condition == "below" else "higher_is_worse",
        created_by="event_monitor",
    )

    fingerprint = initiative_budget.build_fingerprint(
        entity_id=entity_id, metric=metric_label or trigger.trigger_type, condition=trigger.condition,
    )
    decision = initiative_budget.evaluate(company_id=None, site_id=None, severity=trigger.severity, fingerprint=fingerprint)
    if not decision.allowed:
        return

    await notification_manager.deliver(ProactiveAgentEvent(
        event_type=trigger.trigger_type, severity=trigger.severity, title=issue_label, summary=_phrase(updated),
        entity_ids=[entity_id], trigger_id=trigger.trigger_id, fingerprint=fingerprint,
    ))


async def _evaluate_scalar_trigger(trigger: AgentTrigger) -> None:
    source = _TRIGGER_METRIC_SOURCE.get(trigger.trigger_type)
    if not source or not trigger.metric:
        return
    result = await asyncio.to_thread(_call_tool, source)
    if not result:
        return
    value = result.get(trigger.metric)
    if not isinstance(value, (int, float)):
        return
    met = trigger_engine.condition_met(trigger, float(value))
    await _apply_trigger_result(
        trigger=trigger, entity=trigger.trigger_type, entity_type="shift", met=met, value=float(value),
        metric_label=trigger.metric, issue_label=_issue_label(trigger, float(value)),
    )


async def _evaluate_loading_units(trigger: AgentTrigger) -> None:
    result = await asyncio.to_thread(_call_tool, "get_loading_performance")
    if not result:
        return
    for unit in result.get("unidades", []):
        value = unit.get("variacion_pct")
        unit_id = str(unit.get("carguio_id") or "")
        if not isinstance(value, (int, float)) or not unit_id:
            continue
        met = trigger_engine.condition_met(trigger, float(value))
        await _apply_trigger_result(
            trigger=trigger, entity=unit_id, entity_type="loading_unit", met=met, value=float(value),
            metric_label="variacion_pct", issue_label=f"Rendimiento de {unit_id} {value:.1f}% bajo plan.",
        )


async def _evaluate_critical_alerts(trigger: AgentTrigger) -> None:
    result = await asyncio.to_thread(_call_tool, "get_alerts")
    if not result:
        return
    for item in result.get("items", []):
        if str(item.get("severidad", "")).upper() != "CRITICAL":
            continue
        entity = str(item.get("id") or item.get("equipo") or "alerta-critica")
        await _apply_trigger_result(
            trigger=trigger, entity=entity, entity_type="alert", met=True, value=None, metric_label=None,
            issue_label=str(item.get("mensaje") or item.get("titulo") or "Alerta crítica activa."),
        )


async def _evaluate_site_triggers() -> None:
    for trigger in trigger_engine.list_effective_triggers():
        if trigger.trigger_type == "alert_critical_created":
            await _evaluate_critical_alerts(trigger)
        elif trigger.trigger_type == "loading_unit_underperformance":
            await _evaluate_loading_units(trigger)
        else:
            await _evaluate_scalar_trigger(trigger)


async def _evaluate_one_watch(watch: AgentWatch) -> None:
    if not watch.entity_ids:
        return
    entity = watch.entity_ids[0]
    result = await asyncio.to_thread(_call_tool, "get_loading_performance")
    if not result:
        return
    unit = next((u for u in result.get("unidades", []) if str(u.get("carguio_id", "")).upper() == entity.upper()), None)
    if not unit:
        return
    value = unit.get(watch.metric, unit.get("variacion_pct"))
    if not isinstance(value, (int, float)) or watch.threshold is None:
        return
    met = value < watch.threshold if watch.condition == "below" else value > watch.threshold
    if not met:
        return

    entity_id = new_working_memory_entity_id("loading_unit", entity)
    fingerprint = initiative_budget.build_fingerprint(
        entity_id=entity_id, metric=watch.metric, condition=watch.condition, investigation_id=watch.source_investigation_id,
    )
    decision = initiative_budget.evaluate(company_id=watch.company_id, site_id=watch.site_id, severity="warning", fingerprint=fingerprint)
    if not decision.allowed:
        return

    subscriptions.mark_triggered(watch.watch_id)
    await notification_manager.deliver(ProactiveAgentEvent(
        event_type="watch_triggered", severity="warning", title=f"Seguimiento activado: {watch.entity_label or entity}",
        summary=f"{watch.entity_label or entity} volvió a superar el umbral observado ({value:.1f}). Puedo reabrir la investigación.",
        entity_ids=[entity_id], watch_id=watch.watch_id, company_id=watch.company_id, site_id=watch.site_id,
        user_id=watch.user_id, fingerprint=fingerprint,
    ))


async def _evaluate_watches() -> None:
    for watch in subscriptions.list_all_active():
        await _evaluate_one_watch(watch)


async def _tick() -> None:
    for watch in subscriptions.expire_due_watches():
        logger.info("Watch expired watch_id=%s", watch.watch_id)
    await _evaluate_site_triggers()
    await _evaluate_watches()


_task: asyncio.Task | None = None


async def run_forever() -> None:
    settings = get_settings()
    interval = max(5.0, settings.agent_event_monitor_interval_seconds)
    logger.info("Event monitor started interval_seconds=%s", interval)
    while True:
        try:
            await _tick()
        except Exception:  # noqa: BLE001 - un tick fallido no debe tumbar el loop
            logger.exception("Event monitor tick failed")
        await asyncio.sleep(interval)


def start() -> None:
    """Debe llamarse desde un contexto async con loop corriendo (main.py::startup)."""
    global _task
    if _task is not None and not _task.done():
        return
    _task = asyncio.create_task(run_forever())


def stop() -> None:
    global _task
    if _task is not None:
        _task.cancel()
        _task = None
