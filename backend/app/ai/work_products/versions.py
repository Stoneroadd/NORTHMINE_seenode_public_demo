from __future__ import annotations

from app.ai.investigation_schemas import now_iso
from app.ai.work_products import persistence
from app.ai.work_products.models import ReportDraft, ReportSection

"""Versionado de informes (Etapa 6, secciones 20/24 del brief). Cada
modificacion crea una nueva version con un change_log auditable - nunca se
sobrescribe una version existente en su lugar."""


def apply_modification(
    report: ReportDraft, *, modification_summary: str, modified_by: str,
    new_sections: list[ReportSection] | None = None, status: str | None = None,
) -> ReportDraft:
    next_version = report.version + 1
    updated = report.model_copy(update={
        "version": next_version,
        "sections": new_sections if new_sections is not None else report.sections,
        "updated_at": now_iso(),
        "change_log": [*report.change_log, f"v{next_version}: {modification_summary} (por {modified_by})"],
        "status": status or "draft",
        "approved_by": None,
        "approved_at": None,
    })
    persistence.save_report_version(updated)
    return updated


def get_version(report_id: str, version: int | None = None) -> ReportDraft | None:
    if version is None:
        return persistence.get_latest_report(report_id)
    return persistence.get_report_version(report_id, version)


def history(report_id: str) -> list[ReportDraft]:
    return persistence.list_report_versions(report_id)
