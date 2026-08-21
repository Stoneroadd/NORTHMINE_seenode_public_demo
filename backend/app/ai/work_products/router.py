from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel

from app.ai import policies
from app.ai import audit as runtime_audit
from app.ai.memory import episodic_memory, working_memory
from app.ai.memory.models import OperationalEpisode, WorkingMemoryEntity
from app.ai.proactivity import notification_manager, subscriptions
from app.ai.proactivity.persistence import list_proactive_events
from app.ai.work_products import persistence, tasks as tasks_module, versions
from app.ai.work_products.models import ReportDraft, ShiftHandoverDraft, TaskDraft
from app.core.dependencies import RequireAny
from app.core.request_context import require_resource_scope

router = APIRouter(prefix="/ai-agent/work-products", tags=["ai-agent-work-products"])

"""Endpoints de work products (Etapa 6, secciones 18/24/25/28 del brief).

Toda accion de gobernanza (aprobar/rechazar/versionar) vive aca, en un
endpoint REST auditado y con permiso explicito - NUNCA en el WS
conversacional ni implicita en lo que el modelo genera. `policies.can_approve`
(ya usado en el resto del proyecto para tareas/informes) es la unica puerta:
crear un borrador no requiere este permiso, convertirlo en algo oficial si
(seccion 25)."""


def _client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


def _scope(user: dict) -> tuple[str | None, str | None]:
    return user.get("empresa"), user.get("faena")


def _authorize(user: dict, resource: ReportDraft | ShiftHandoverDraft | TaskDraft) -> None:
    require_resource_scope(user, tenant_id=resource.company_id, site_id=resource.site_id)


class RejectRequest(BaseModel):
    reason: str | None = None


# ── Memoria (seccion 30 del brief: solo memoria util, nunca conceptos
# internos como 'memoria vectorial' o 'embeddings') ───────────────────────

class MemorySummary(BaseModel):
    active_entities: list[WorkingMemoryEntity]
    recent_investigations: list[OperationalEpisode]


@router.get("/memory-summary")
def memory_summary(limit: int = 10, user: dict = RequireAny) -> MemorySummary:
    company_id, site_id = _scope(user)
    return MemorySummary(
        active_entities=working_memory.list_active(company_id=company_id, site_id=site_id, limit=limit),
        recent_investigations=episodic_memory.list_recent(company_id=company_id, site_id=site_id, episode_type="investigation", limit=limit),
    )


# ── Reports ──────────────────────────────────────────────────────────────

@router.get("/reports")
def list_reports(status_filter: str | None = None, limit: int = 20, user: dict = RequireAny) -> list[ReportDraft]:
    company_id, site_id = _scope(user)
    return persistence.list_latest_reports(company_id=company_id, site_id=site_id, status=status_filter, limit=limit)


@router.get("/reports/{report_id}")
def get_report(report_id: str, version: int | None = None, user: dict = RequireAny) -> ReportDraft:
    report = versions.get_version(report_id, version)
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Informe no encontrado")
    _authorize(user, report)
    return report


@router.get("/reports/{report_id}/versions")
def get_report_versions(report_id: str, user: dict = RequireAny) -> list[ReportDraft]:
    reports = versions.history(report_id)
    if not reports:
        return []
    _authorize(user, reports[0])
    return reports


@router.post("/reports/{report_id}/approve")
def approve_report(report_id: str, request: Request, user: dict = RequireAny) -> ReportDraft:
    role = str(user.get("rol") or "")
    if not policies.can_approve(role):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Rol sin permiso de aprobación")
    report = persistence.get_latest_report(report_id)
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Informe no encontrado")
    _authorize(user, report)
    if not report.quality_gate.passed:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "message": "El ReportVerifier rechazó la aprobación.",
                "quality_gate": report.quality_gate.model_dump(),
            },
        )
    approved = report.model_copy(update={"status": "approved", "approved_by": str(user.get("sub") or "anon"), "approved_at": _now()})
    persistence.save_report_version(approved)
    _record_report_episode(approved, human_decision="approved")
    runtime_audit.record_report_decision(
        usuario=str(user.get("sub") or "anon"), ip=_client_ip(request), report_id=report_id, decision="approved",
    )
    return approved


@router.post("/reports/{report_id}/reject")
def reject_report(report_id: str, body: RejectRequest, request: Request, user: dict = RequireAny) -> ReportDraft:
    role = str(user.get("rol") or "")
    if not policies.can_approve(role):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Rol sin permiso de aprobación")
    report = persistence.get_latest_report(report_id)
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Informe no encontrado")
    _authorize(user, report)
    rejected = report.model_copy(update={
        "status": "rejected", "approved_by": str(user.get("sub") or "anon"), "approved_at": _now(),
        "rejection_reason": body.reason,
    })
    persistence.save_report_version(rejected)
    _record_report_episode(rejected, human_decision="rejected")
    runtime_audit.record_report_decision(
        usuario=str(user.get("sub") or "anon"), ip=_client_ip(request), report_id=report_id, decision="rejected",
    )
    return rejected


def _record_report_episode(report: ReportDraft, *, human_decision: str) -> None:
    from app.ai.memory import episodic_memory
    episodic_memory.record_report_episode(
        report_id=report.report_id, report_type=report.report_type, title=report.title,
        company_id=report.company_id, site_id=report.site_id, entity_ids=report.scope.equipment_ids,
        evidence_ids=report.evidence_ids, investigation_ids=report.investigation_ids,
        human_decision=human_decision, created_by=report.generated_by,
    )


def _now() -> str:
    from app.ai.investigation_schemas import now_iso
    return now_iso()


# ── Handovers ────────────────────────────────────────────────────────────

@router.get("/handovers")
def list_handovers(limit: int = 10, user: dict = RequireAny) -> list[ShiftHandoverDraft]:
    company_id, site_id = _scope(user)
    return persistence.list_handovers(company_id=company_id, site_id=site_id, limit=limit)


@router.get("/handovers/{handover_id}")
def get_handover(handover_id: str, user: dict = RequireAny) -> ShiftHandoverDraft:
    handover = persistence.get_handover(handover_id)
    if not handover:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cambio de turno no encontrado")
    _authorize(user, handover)
    return handover


@router.post("/handovers/{handover_id}/approve")
def approve_handover(handover_id: str, request: Request, user: dict = RequireAny) -> ShiftHandoverDraft:
    role = str(user.get("rol") or "")
    if not policies.can_approve(role):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Rol sin permiso de aprobación")
    handover = persistence.get_handover(handover_id)
    if not handover:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cambio de turno no encontrado")
    _authorize(user, handover)
    approved = handover.model_copy(update={"status": "approved", "approved_by": str(user.get("sub") or "anon"), "approved_at": _now()})
    persistence.save_handover(approved)
    from app.ai.memory import episodic_memory
    episodic_memory.record_handover_episode(
        handover_id=approved.handover_id, title=approved.title, company_id=approved.company_id, site_id=approved.site_id,
        entity_ids=[], investigation_ids=approved.investigation_ids, human_decision="approved", created_by=approved.generated_by,
    )
    runtime_audit.record_handover_decision(usuario=str(user.get("sub") or "anon"), ip=_client_ip(request), handover_id=handover_id, decision="approved")
    return approved


@router.post("/handovers/{handover_id}/reject")
def reject_handover(handover_id: str, body: RejectRequest, request: Request, user: dict = RequireAny) -> ShiftHandoverDraft:
    role = str(user.get("rol") or "")
    if not policies.can_approve(role):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Rol sin permiso de aprobación")
    handover = persistence.get_handover(handover_id)
    if not handover:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cambio de turno no encontrado")
    _authorize(user, handover)
    rejected = handover.model_copy(update={
        "status": "rejected", "approved_by": str(user.get("sub") or "anon"), "approved_at": _now(), "rejection_reason": body.reason,
    })
    persistence.save_handover(rejected)
    runtime_audit.record_handover_decision(usuario=str(user.get("sub") or "anon"), ip=_client_ip(request), handover_id=handover_id, decision="rejected")
    return rejected


# ── Tasks ────────────────────────────────────────────────────────────────

@router.get("/tasks")
def list_tasks(pending_only: bool = True, user: dict = RequireAny) -> list[TaskDraft]:
    company_id, site_id = _scope(user)
    if pending_only:
        return tasks_module.list_pending(company_id=company_id, site_id=site_id)
    return persistence.list_tasks(company_id=company_id, site_id=site_id)


@router.post("/tasks/{task_id}/approve")
def approve_task(task_id: str, request: Request, user: dict = RequireAny) -> TaskDraft:
    role = str(user.get("rol") or "")
    if not policies.can_approve(role):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Rol sin permiso de aprobación")
    task = tasks_module.get_task(task_id)
    if task:
        _authorize(user, task)
    task = tasks_module.approve_task(task_id, approved_by=str(user.get("sub") or "anon"))
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tarea no encontrada o no pendiente de aprobación")
    runtime_audit.record_task_draft_decision(usuario=str(user.get("sub") or "anon"), ip=_client_ip(request), task_id=task_id, decision="approved")
    return task


@router.post("/tasks/{task_id}/reject")
def reject_task(task_id: str, body: RejectRequest, request: Request, user: dict = RequireAny) -> TaskDraft:
    role = str(user.get("rol") or "")
    if not policies.can_approve(role):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Rol sin permiso de aprobación")
    task = tasks_module.get_task(task_id)
    if task:
        _authorize(user, task)
    task = tasks_module.reject_task(task_id, rejected_by=str(user.get("sub") or "anon"), reason=body.reason)
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tarea no encontrada o no pendiente de aprobación")
    runtime_audit.record_task_draft_decision(usuario=str(user.get("sub") or "anon"), ip=_client_ip(request), task_id=task_id, decision="rejected")
    return task


@router.post("/tasks/{task_id}/complete")
def complete_task(task_id: str, request: Request, user: dict = RequireAny) -> TaskDraft:
    task = tasks_module.get_task(task_id)
    if task:
        _authorize(user, task)
    task = tasks_module.complete_task(task_id, completed_by=str(user.get("sub") or "anon"))
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tarea no encontrada o no aprobada")
    from app.ai.memory import episodic_memory
    episodic_memory.record_task_episode(
        task_id=task.task_id, title=task.title, company_id=task.company_id, site_id=task.site_id,
        entity_ids=task.entity_ids, evidence_ids=task.evidence_ids,
        investigation_ids=[task.investigation_id] if task.investigation_id else [],
        outcome="completed", created_by=str(user.get("sub") or "anon"),
    )
    runtime_audit.record_task_draft_decision(usuario=str(user.get("sub") or "anon"), ip=_client_ip(request), task_id=task_id, decision="completed")
    return task


# ── Watches ──────────────────────────────────────────────────────────────

@router.get("/watches")
def list_watches(user: dict = RequireAny) -> list:
    return subscriptions.list_active_for_user(str(user.get("sub") or "anon"))


@router.post("/watches/{watch_id}/cancel")
def cancel_watch(watch_id: str, request: Request, user: dict = RequireAny):
    watch = subscriptions.cancel_watch(watch_id, str(user.get("sub") or "anon"))
    if not watch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Seguimiento no encontrado")
    runtime_audit.record_watch_cancelled(usuario=str(user.get("sub") or "anon"), ip=_client_ip(request), watch_id=watch_id)
    return watch


# ── Proactive events ─────────────────────────────────────────────────────

@router.get("/proactive-events")
def list_proactive_events_endpoint(status_filter: str | None = None, limit: int = 50, user: dict = RequireAny) -> list:
    company_id, site_id = _scope(user)
    return list_proactive_events(company_id=company_id, site_id=site_id, status=status_filter, limit=limit)


@router.post("/proactive-events/{proactive_event_id}/acknowledge")
def acknowledge_proactive_event(proactive_event_id: str, request: Request, user: dict = RequireAny):
    company_id, site_id = _scope(user)
    event = notification_manager.acknowledge(proactive_event_id, status="acknowledged", company_id=company_id, site_id=site_id)
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evento no encontrado")
    runtime_audit.record_proactive_event_dismissed(usuario=str(user.get("sub") or "anon"), ip=_client_ip(request), proactive_event_id=proactive_event_id, status="acknowledged")
    return event


@router.post("/proactive-events/{proactive_event_id}/dismiss")
def dismiss_proactive_event(proactive_event_id: str, request: Request, user: dict = RequireAny):
    company_id, site_id = _scope(user)
    event = notification_manager.acknowledge(proactive_event_id, status="dismissed", company_id=company_id, site_id=site_id)
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evento no encontrado")
    runtime_audit.record_proactive_event_dismissed(usuario=str(user.get("sub") or "anon"), ip=_client_ip(request), proactive_event_id=proactive_event_id, status="dismissed")
    return event
