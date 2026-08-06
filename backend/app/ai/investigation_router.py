from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import Any, AsyncIterator

from fastapi import APIRouter, HTTPException, Request, status
from fastapi.responses import StreamingResponse

from app.ai import conclusion as conclusion_module
from app.ai import executor, hypotheses as hypotheses_module, planner, verifier
from app.ai.audit import record_investigation, record_investigation_ui_step
from app.ai.investigation_repository import get_investigation, list_investigations, save_investigation
from app.ai.investigation_schemas import (
    CreateInvestigationRequest,
    DateRange,
    InvestigationPlan,
    InvestigationResult,
    InvestigationScope,
    InvestigationType,
    OUT_OF_SCOPE_MESSAGE,
    UIStepReportRequest,
    VerificationResult,
)
from app.ai.planner import PlannerRejection
from app.core.dependencies import RequireAny
from app.core.rate_limit import endpoint_limit, limiter

router = APIRouter(prefix="/ai-copilot/investigations", tags=["ai-copilot-investigations"])

"""Endpoints de investigacion (Etapa 3, secciones 9, 16 y 23).

Dos modos de ejecucion (seccion 16 del brief):

- Automatico de solo lectura: POST /investigations construye el plan Y lo
  ejecuta en la misma llamada (todas nuestras capabilities son de solo
  lectura, asi que este modo nunca necesita distinguir escritura).
- Guiado (default): POST /investigations/plan construye el plan y lo
  persiste como 'planned' SIN ejecutar nada; el usuario lo revisa y confirma
  explicitamente; POST /investigations/{id}/execute recien ahi ejecuta el
  plan ya construido. Ninguna investigacion arranca sola en este modo.

Ambos modos comparten _execute_plan_events - no hay dos implementaciones del
pipeline Executor->Verifier->Hypotheses->Conclusion. La ejecucion es NDJSON
(mismo patron que /ai-copilot/chat de Etapa 1): no hay una peticion HTTP
abierta indefinidamente porque los pasos backend son rapidos y locales. Los
pasos 'ui_action' se emiten como eventos separados que el frontend ejecuta
con el AgentActionExecutor ya existente (Etapa 2) y reporta de vuelta via
/ui-steps/{stepId}/report, de forma NO bloqueante (ninguna investigacion
depende de esa confirmacion para concluir - seccion 15 del brief)."""


class OutOfScope(Exception):
    """Solicitud fuera del enum cerrado de 4 tipos - mensaje fijo del brief (seccion 4)."""


def _client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


def _event(investigation_id: str, event_type: str, sequence: int, **payload: Any) -> dict[str, Any]:
    return {
        "eventId": f"evt-{uuid.uuid4().hex[:10]}",
        "investigationId": investigation_id,
        "correlationId": investigation_id,
        "sequence": sequence,
        "type": event_type,
        "timestamp": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        **payload,
    }


def _investigation_type_or_raise(raw_type: str) -> InvestigationType:
    try:
        return InvestigationType(raw_type)
    except ValueError:
        raise OutOfScope from None


def _scope_from_request(payload: CreateInvestigationRequest) -> InvestigationScope:
    return InvestigationScope(
        shift=payload.shift,
        equipment_ids=[payload.equipment_id] if payload.equipment_id else [],
        date_range=DateRange(from_=payload.start_date, to=payload.end_date) if payload.start_date and payload.end_date else None,
    )


def _build_plan_or_raise(payload: CreateInvestigationRequest, role: str) -> tuple[InvestigationType, InvestigationPlan]:
    investigation_type = _investigation_type_or_raise(payload.type)
    scope = _scope_from_request(payload)
    try:
        plan = planner.build_plan(investigation_type, scope, role)
    except PlannerRejection:
        raise OutOfScope from None
    return investigation_type, plan


_UNEXECUTED_VERIFICATION = VerificationResult(
    status="insufficient_data",
    reasons=["La investigacion todavia no se ha ejecutado."],
    limitations=["Plan generado en modo Guiado, pendiente de confirmacion del usuario."],
)


async def _execute_plan_events(
    request: Request, plan: InvestigationPlan, investigation_type: InvestigationType, role: str, user: dict, start_seq: int,
) -> AsyncIterator[dict[str, Any]]:
    """A partir de un plan YA construido: ejecuta los pasos 'tool', verifica,
    genera hipotesis/conclusion, persiste y emite los eventos ui_action
    (seccion 9 del brief). Compartido por el modo Automatico (plan+ejecucion
    en una sola llamada) y por el paso 2 del modo Guiado (ejecucion tras
    confirmacion explicita del usuario)."""
    seq = start_seq

    for step in plan.steps:
        if step.kind != "tool":
            continue
        seq += 1
        yield _event(plan.investigation_id, "step.started", seq, stepId=step.step_id, capabilityId=step.capability_id)

    evidence = await executor.run_plan(plan, role=role)

    for step in plan.steps:
        if step.kind != "tool":
            continue
        seq += 1
        event_type = "tool.completed" if step.status == "completed" else "tool.failed"
        yield _event(
            plan.investigation_id, event_type, seq,
            stepId=step.step_id, capabilityId=step.capability_id, status=step.status,
            durationMs=step.duration_ms, error=step.error,
        )

    seq += 1
    yield _event(plan.investigation_id, "verification.started", seq)
    verification = verifier.verify_evidence(evidence)
    seq += 1
    yield _event(plan.investigation_id, "verification.completed", seq, verification=json.loads(verification.model_dump_json()))

    hyps = hypotheses_module.generate_hypotheses(investigation_type, evidence)
    conclusion = conclusion_module.build_conclusion(plan, evidence, verification, hyps)

    for step in plan.steps:
        if step.kind != "ui_action":
            continue
        seq += 1
        capability = planner.capability_for_step(step)
        yield _event(
            plan.investigation_id, "ui_action.requested", seq,
            stepId=step.step_id, capabilityId=step.capability_id,
            moduleId=capability.module_id if capability else None,
            widgetId=capability.widget_id if capability else None,
        )

    result = InvestigationResult(plan=plan, evidence=evidence, verification=verification, hypotheses=hyps, conclusion=conclusion)
    save_investigation(result, created_by=str(user.get("sub") or "anon"), role=role)
    record_investigation(
        usuario=str(user.get("sub") or "anon"),
        ip=_client_ip(request),
        investigation_id=plan.investigation_id,
        investigation_type=investigation_type.value,
        status=plan.status,
        confidence=conclusion.confidence.level,
    )

    seq += 1
    yield _event(
        plan.investigation_id, "investigation.completed", seq,
        result=json.loads(result.model_dump_json()),
    )


async def _automatic_investigation_events(request: Request, payload: CreateInvestigationRequest, user: dict) -> AsyncIterator[dict[str, Any]]:
    role = str(user.get("rol") or "")
    try:
        investigation_type, plan = _build_plan_or_raise(payload, role)
    except OutOfScope:
        yield _event("unknown", "investigation.failed", 1, message=OUT_OF_SCOPE_MESSAGE)
        return

    yield _event(plan.investigation_id, "investigation.started", 1, investigationType=investigation_type.value, goal=plan.goal)
    yield _event(plan.investigation_id, "investigation.plan", 2, plan=json.loads(plan.model_dump_json()))

    async for event in _execute_plan_events(request, plan, investigation_type, role, user, start_seq=2):
        yield event


async def _stream(events: AsyncIterator[dict[str, Any]]) -> AsyncIterator[bytes]:
    async for event in events:
        yield (json.dumps(event, default=str) + "\n").encode("utf-8")


@router.post("")
@limiter.limit(endpoint_limit("/api/ai-copilot/investigations"))
async def create_investigation(request: Request, payload: CreateInvestigationRequest, user: dict = RequireAny) -> StreamingResponse:
    """Modo Automatico de solo lectura (seccion 16): plan + ejecucion en una
    sola llamada, sin pedir confirmacion por paso."""
    return StreamingResponse(
        _stream(_automatic_investigation_events(request, payload, user)),
        media_type="application/x-ndjson",
        headers={"Cache-Control": "no-store", "X-Accel-Buffering": "no"},
    )


@router.post("/plan")
@limiter.limit(endpoint_limit("/api/ai-copilot/investigations"))
def create_investigation_plan(request: Request, payload: CreateInvestigationRequest, user: dict = RequireAny) -> dict[str, Any]:
    """Modo Guiado (default, seccion 16): construye el plan y lo persiste
    como 'planned' SIN ejecutar ningun paso. El usuario debe confirmar
    explicitamente via POST /{id}/execute antes de que se consulte cualquier
    dato."""
    role = str(user.get("rol") or "")
    try:
        investigation_type, plan = _build_plan_or_raise(payload, role)
    except OutOfScope:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=OUT_OF_SCOPE_MESSAGE) from None

    stub = InvestigationResult(plan=plan, evidence=[], verification=_UNEXECUTED_VERIFICATION, hypotheses=[], conclusion=None)
    save_investigation(stub, created_by=str(user.get("sub") or "anon"), role=role)
    return {"plan": json.loads(plan.model_dump_json()), "investigationType": investigation_type.value}


@router.post("/{investigation_id}/execute")
@limiter.limit(endpoint_limit("/api/ai-copilot/investigations"))
async def execute_investigation_plan(investigation_id: str, request: Request, user: dict = RequireAny) -> StreamingResponse:
    """Segundo paso del modo Guiado: ejecuta un plan ya construido y
    persistido por POST /plan. Rechaza si ya se ejecuto (idempotencia -
    seccion 8: no repetir una investigacion completada)."""
    record = get_investigation(investigation_id)
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Investigacion no encontrada")
    if record["status"] not in ("planned", "failed"):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Esta investigacion ya fue ejecutada")

    result_data = json.loads(record["result_json"])
    plan = InvestigationPlan.model_validate(result_data["plan"])
    investigation_type = plan.type
    role = str(user.get("rol") or record.get("role") or "")

    async def _events() -> AsyncIterator[dict[str, Any]]:
        yield _event(plan.investigation_id, "investigation.started", 1, investigationType=investigation_type.value, goal=plan.goal)
        async for event in _execute_plan_events(request, plan, investigation_type, role, user, start_seq=1):
            yield event

    return StreamingResponse(
        _stream(_events()),
        media_type="application/x-ndjson",
        headers={"Cache-Control": "no-store", "X-Accel-Buffering": "no"},
    )


@router.get("/{investigation_id}")
def get_investigation_endpoint(investigation_id: str, user: dict = RequireAny) -> dict[str, Any]:
    record = get_investigation(investigation_id)
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Investigacion no encontrada")
    return {**record, "result": json.loads(record["result_json"])}


@router.get("")
def list_investigations_endpoint(user: dict = RequireAny) -> dict[str, Any]:
    items = list_investigations(created_by=str(user.get("sub") or "anon"))
    return {"items": items, "count": len(items)}


@router.post("/{investigation_id}/ui-steps/{step_id}/report")
def report_ui_step(investigation_id: str, step_id: str, request: Request, payload: UIStepReportRequest, user: dict = RequireAny) -> dict[str, str]:
    """El frontend reporta aca el resultado REAL de un paso ui_action que ya
    ejecuto con AgentActionExecutor (Etapa 2). No bloqueante: la investigacion
    ya concluyo antes de que esto se llame; esto solo deja auditoria y,
    cuando corresponde, actualiza el registro persistido para revision."""
    record = get_investigation(investigation_id)
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Investigacion no encontrada")

    result_data = json.loads(record["result_json"])
    for step in result_data.get("plan", {}).get("steps", []):
        if step.get("step_id") == step_id:
            step["status"] = payload.status
            break
    else:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Paso no encontrado en esta investigacion")

    result = InvestigationResult.model_validate(result_data)
    save_investigation(result, created_by=str(user.get("sub") or "anon"), role=str(user.get("rol") or ""))
    record_investigation_ui_step(
        usuario=str(user.get("sub") or "anon"),
        ip=_client_ip(request),
        investigation_id=investigation_id,
        step_id=step_id,
        status=payload.status,
        context_updated=payload.context_updated,
    )
    return {"status": "ok"}
