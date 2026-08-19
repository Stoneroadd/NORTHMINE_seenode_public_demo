from __future__ import annotations

import re

from app.ai.work_products.models import ReportDraft, ReportQualityGate

_NUMBER = re.compile(r"(?<![A-Za-z])[-+]?\d[\d.,]*(?:\s*(?:%|t|t/h|h|min|USD))?")
_PLACEHOLDERS = ("sin contenido generado", "parece que", "como ia", "he analizado")


def verify_report(report: ReportDraft) -> ReportQualityGate:
    """Gate deterministico: una inconsistencia numerica nunca se compensa con formato."""
    errors: list[str] = []
    warnings: list[str] = []
    known_ids = set(report.evidence_ids)
    cited_ids = {eid for section in report.sections for eid in section.evidence_ids}
    cited_ids.update(eid for table in report.tables for eid in table.evidence_ids)
    cited_ids.update(eid for chart in report.charts for eid in chart.evidence_ids)
    dangling = sorted(cited_ids - known_ids)
    if dangling:
        errors.append(f"Referencias de evidencia inexistentes: {', '.join(dangling)}")

    evidence_coverage = 25 if known_ids and cited_ids == known_ids else 15 if cited_ids else 0
    if not known_ids:
        errors.append("El reporte no contiene evidencia estructurada.")

    numerical_consistency = 25
    # R2 §8: "alcance" describe el scope pedido por el usuario (equipment_ids
    # como "CAEX-104" matchea el regex numerico) - es la misma naturaleza que
    # "periodo" (metadata estructural, no una cifra derivada de evidencia), y
    # sin esta excepcion CUALQUIER reporte enfocado a un equipo especifico
    # (el caso mas comun y valioso: investigaciones sobre una maquina) fallaba
    # el gate en falso. Confirmado con evidencia real antes de agregarlo:
    # _NUMBER.search("Equipos/entidades: CAEX-104.") matchea "104".
    _STRUCTURAL_SECTION_IDS = {"identificacion", "periodo", "alcance"}
    for section in report.sections:
        if _NUMBER.search(section.content) and not section.evidence_ids and section.section_id not in _STRUCTURAL_SECTION_IDS:
            numerical_consistency = 0
            errors.append(f"La seccion '{section.title}' contiene cifras sin evidencia enlazada.")
    for table in report.tables:
        if table.rows and not table.evidence_ids:
            numerical_consistency = 0
            errors.append(f"La tabla '{table.title}' no enlaza evidencia.")

    scope_correctness = 15
    available_entities = {eid for item in report.evidence_snapshot for eid in item.entity_ids}
    if report.scope.equipment_ids and not all(entity in available_entities for entity in report.scope.equipment_ids):
        scope_correctness = 5
        warnings.append("Una o mas entidades del alcance no aparecen en la evidencia.")

    if not report.evidence_snapshot:
        freshness = 0
    elif any(item.freshness_status == "stale" for item in report.evidence_snapshot):
        freshness = 4
        warnings.append("El reporte contiene datos stale.")
    elif any(item.freshness_status == "unknown" for item in report.evidence_snapshot):
        freshness = 6
        warnings.append("La frescura de una o mas fuentes es desconocida.")
    else:
        freshness = 10

    nonempty_sections = [section for section in report.sections if section.content.strip()]
    completeness = 10 if len(nonempty_sections) >= 4 else 5 if nonempty_sections else 0
    contradictions = 10 if any(section.section_id == "evidencia_contradictoria" for section in report.sections) else 6
    formatting = 5
    for section in report.sections:
        if any(token in section.content.lower() for token in _PLACEHOLDERS):
            formatting = 0
            errors.append(f"Lenguaje no profesional en '{section.title}'.")

    total = evidence_coverage + numerical_consistency + scope_correctness + freshness + completeness + contradictions + formatting
    return ReportQualityGate(
        passed=not errors and numerical_consistency == 25 and total >= 75,
        total_score=total,
        evidence_coverage=evidence_coverage,
        numerical_consistency=numerical_consistency,
        scope_correctness=scope_correctness,
        freshness=freshness,
        completeness=completeness,
        contradictions=contradictions,
        formatting=formatting,
        errors=errors,
        warnings=warnings,
    )
