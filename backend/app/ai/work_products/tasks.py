from __future__ import annotations

from app.ai.work_products import persistence
from app.ai.work_products.models import TaskDraft, TaskPriority

"""TaskDraft (Etapa 6, secciones 25-26 del brief). La IA puede crear el
borrador, sugerir responsable/prioridad y adjuntar evidencia - nunca
aprobar, asignar oficialmente ni cerrar (seccion 25). Toda tarea generada
desde una investigacion guarda investigation_id/finding_ids/evidence_ids/
hypothesis_ids para trazabilidad completa (seccion 26: '¿por que existe
esta tarea?')."""


def create_task_draft(
    *, title: str, description: str, reason: str, created_by: str,
    entity_ids: list[str] | None = None, evidence_ids: list[str] | None = None,
    investigation_id: str | None = None, finding_ids: list[str] | None = None, hypothesis_ids: list[str] | None = None,
    priority_suggested: TaskPriority = "medium", responsible_suggested: str | None = None, due_at: str | None = None,
    company_id: str | None = None, site_id: str | None = None,
) -> TaskDraft:
    task = TaskDraft(
        title=title, description=description, reason=reason, priority_suggested=priority_suggested,
        responsible_suggested=responsible_suggested, entity_ids=entity_ids or [], evidence_ids=evidence_ids or [],
        investigation_id=investigation_id, finding_ids=finding_ids or [], hypothesis_ids=hypothesis_ids or [],
        due_at=due_at, status="pending_approval", company_id=company_id, site_id=site_id, created_by=created_by,
    )
    persistence.save_task(task)
    return task


def approve_task(task_id: str, *, approved_by: str) -> TaskDraft | None:
    task = persistence.get_task(task_id)
    if not task or task.status != "pending_approval":
        return None
    updated = task.model_copy(update={"status": "approved", "approved_by": approved_by})
    persistence.save_task(updated)
    return updated


def reject_task(task_id: str, *, rejected_by: str, reason: str | None = None) -> TaskDraft | None:
    task = persistence.get_task(task_id)
    if not task or task.status != "pending_approval":
        return None
    updated = task.model_copy(update={"status": "rejected", "approved_by": rejected_by, "rejection_reason": reason})
    persistence.save_task(updated)
    return updated


def complete_task(task_id: str, *, completed_by: str) -> TaskDraft | None:
    task = persistence.get_task(task_id)
    if not task or task.status not in ("approved", "in_progress"):
        return None
    updated = task.model_copy(update={"status": "completed"})
    persistence.save_task(updated)
    return updated


def get_task(task_id: str) -> TaskDraft | None:
    return persistence.get_task(task_id)


def list_pending(*, company_id: str | None, site_id: str | None) -> list[TaskDraft]:
    open_statuses = {"draft", "pending_approval", "approved", "in_progress"}
    return [t for t in persistence.list_tasks(company_id=company_id, site_id=site_id, limit=100) if t.status in open_statuses]
