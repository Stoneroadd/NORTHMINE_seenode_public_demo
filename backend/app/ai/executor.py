from __future__ import annotations

import asyncio
import logging
import time
from typing import Any

from app.ai.capabilities import get_capability
from app.ai.investigation_schemas import (
    EvidenceItem,
    InvestigationPlan,
    InvestigationScope,
    PlanStep,
    new_id,
    now_iso,
)
from app.ai.tools import TOOL_REGISTRY

logger = logging.getLogger("northmine.ai.executor")

"""Executor (Etapa 3, seccion 8 del brief).

Ejecuta SOLO los pasos 'tool' del plan - son los que tienen una fuente
analitica confiable y no dependen de que el frontend este montado. Los
pasos 'ui_action' quedan 'pending' aca a proposito: el backend no puede
ejecutar UI directamente (no hay DOM en el servidor); el router los emite
como eventos separados para que el frontend los resuelva via el
AgentActionExecutor ya existente (Etapa 2) y reporte el resultado real -
ver investigation_router.py. Ninguna investigacion queda bloqueada
esperando eso: todos los pasos 'ui_action' son 'optional' en las 4
plantillas (seccion 15: la UI muestra, el backend concluye).
"""


class ExecutorError(RuntimeError):
    pass


def _quality_status_from_tool_result(result: dict[str, Any]) -> str:
    quality = result.get("data_quality") or {}
    status = str(quality.get("status") or "").upper()
    score = quality.get("score")
    if status == "EMPTY":
        return "unknown"
    if isinstance(score, (int, float)):
        if score >= 80:
            return "high"
        if score >= 55:
            return "medium"
        return "low"
    return "unknown"


def _freshness_status_from_tool_result(result: dict[str, Any]) -> str:
    freshness = result.get("freshness") or {}
    status = str(freshness.get("status") or "unknown")
    return status if status in {"current", "stale", "unknown"} else "unknown"


def _evidence_from_tool_result(capability_id: str, result: dict[str, Any], scope: InvestigationScope) -> EvidenceItem:
    freshness = result.get("freshness") or {}
    return EvidenceItem(
        evidence_id=new_id("ev"),
        source_type="backend_tool",
        capability_id=capability_id,
        label=capability_id,
        value=result,
        unit=None,
        period=None,
        entity_ids=list(scope.equipment_ids),
        source=str(result.get("data_quality", {}).get("source") or "wenco-sql-live"),
        updated_at=freshness.get("last_updated_at"),
        freshness_status=_freshness_status_from_tool_result(result),
        quality_status=_quality_status_from_tool_result(result),
        verification_status="pending",
    )


def _args_for_step(step: PlanStep, scope: InvestigationScope) -> dict[str, Any]:
    args: dict[str, Any] = {}
    if scope.shift:
        args["shift"] = scope.shift
    if scope.date_range:
        args["date"] = scope.date_range.to
    if step.capability_id == "get_loading_performance" and scope.equipment_ids:
        args["loading_unit_id"] = scope.equipment_ids[0]
    if step.capability_id == "get_fleet_status" and scope.equipment_ids:
        pass  # get_fleet_status no filtra por id individual, solo por status_filter
    return args


async def run_plan(plan: InvestigationPlan, *, role: str) -> list[EvidenceItem]:
    """Ejecuta los pasos 'tool' del plan secuencialmente, en orden. Modifica
    `plan.steps` in-place con estado/duracion/error real. Devuelve la
    evidencia normalizada recolectada. Idempotente: un paso ya 'completed'
    (p.ej. si run_plan se invoca de nuevo sobre un plan parcial) no se
    repite."""
    evidence: list[EvidenceItem] = []
    plan.status = "running"

    for step in plan.steps:
        if step.kind != "tool":
            continue  # ui_action: lo maneja el router, no el Executor.
        if step.status == "completed":
            continue  # no repetir pasos ya completados.

        capability = get_capability(step.capability_id)
        tool = TOOL_REGISTRY.get(step.capability_id)
        if capability is None or tool is None:
            step.status = "skipped"
            step.error = "capability o tool no registrada"
            continue

        step.status = "running"
        step.started_at = now_iso()
        started = time.perf_counter()
        try:
            args = _args_for_step(step, plan.scope)
            result = await asyncio.wait_for(
                asyncio.to_thread(tool.handler, args), timeout=capability.timeout_seconds
            )
            item = _evidence_from_tool_result(step.capability_id, result, plan.scope)
            evidence.append(item)
            step.evidence_ids.append(item.evidence_id)
            step.status = "completed"
        except asyncio.TimeoutError:
            step.status = "failed"
            step.error = f"timeout tras {capability.timeout_seconds}s"
            logger.warning("Timeout ejecutando %s en investigacion %s", step.capability_id, plan.investigation_id)
        except Exception as exc:  # noqa: BLE001 - un paso fallido no debe tumbar la investigacion completa
            step.status = "failed"
            step.error = str(exc)
            logger.exception("Fallo ejecutando %s en investigacion %s", step.capability_id, plan.investigation_id)
        finally:
            step.completed_at = now_iso()
            step.duration_ms = int((time.perf_counter() - started) * 1000)

    required_tool_steps = [s for s in plan.steps if s.kind == "tool" and s.requirement == "required"]
    plan.status = "completed" if all(s.status == "completed" for s in required_tool_steps) else "failed"
    return evidence
