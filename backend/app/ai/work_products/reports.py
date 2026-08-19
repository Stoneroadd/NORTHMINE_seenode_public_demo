from __future__ import annotations

from typing import Any

from app.ai import verifier
from app.ai.investigation_repository import get_investigation
from app.ai.investigation_schemas import EvidenceItem, InvestigationConclusion, InvestigationResult, new_id, now_iso
from app.ai.tools import TOOL_REGISTRY
from app.ai.work_products import report_verifier, templates
from app.ai.work_products.models import (
    Audience,
    ReportChart,
    ReportDraft,
    ReportIdentification,
    ReportScope,
    ReportSection,
    ReportTable,
    ReportType,
)

"""ReportComposer (Etapa 6, secciones 17-21 del brief).

Regla dura: NINGUN valor cuantitativo sale de una llamada al modelo
generativo. Todo numero que aparece en un informe viene de un EvidenceItem
construido a partir de una herramienta de solo lectura ya auditada
(TOOL_REGISTRY) o de un InvestigationResult ya persistido - el composer
solo formatea texto alrededor de esos numeros, nunca los inventa ni los
'redondea con criterio'. Si no hay evidencia para una seccion, la seccion
dice explicitamente que no hay datos - nunca se rellena con una cifra
plausible.
"""


def _run_tool(capability_id: str, args: dict[str, Any] | None = None) -> dict[str, Any] | None:
    tool = TOOL_REGISTRY.get(capability_id)
    if not tool:
        return None
    try:
        return tool.handler(args or {})
    except Exception:  # noqa: BLE001 - una fuente caida no debe tumbar el informe completo
        return None


def _quality_status(quality: dict[str, Any]) -> str:
    score = quality.get("score")
    if not isinstance(score, (int, float)):
        return "unknown"
    if score >= 80:
        return "high"
    if score >= 55:
        return "medium"
    return "low"


def _evidence_from_result(capability_id: str, result: dict[str, Any], entity_ids: list[str]) -> EvidenceItem:
    freshness = result.get("freshness") or {}
    quality = result.get("data_quality") or {}
    return EvidenceItem(
        evidence_id=new_id("evid"), source_type="backend_tool", capability_id=capability_id, label=capability_id,
        value=result, entity_ids=entity_ids, source=str(quality.get("source") or "wenco-sql-live"),
        updated_at=freshness.get("last_updated_at"),
        freshness_status=freshness.get("status") if freshness.get("status") in ("current", "stale") else "unknown",
        quality_status=_quality_status(quality),
    )


def _find(evidence: list[EvidenceItem], capability_id: str) -> EvidenceItem | None:
    return next((e for e in evidence if e.capability_id == capability_id), None)


def _fmt_pct(value: Any) -> str:
    return f"{value:.1f}%" if isinstance(value, (int, float)) else "sin dato"


def gather_evidence(
    *, report_type: ReportType, scope: ReportScope, investigation_id: str | None = None,
) -> tuple[list[EvidenceItem], list[str], InvestigationConclusion | None]:
    evidence: list[EvidenceItem] = []
    investigation_ids: list[str] = []
    args: dict[str, Any] = {"shift": scope.shift} if scope.shift else {}

    if report_type == "INVESTIGATION_REPORT" and investigation_id:
        row = get_investigation(investigation_id)
        if row:
            result = InvestigationResult.model_validate_json(row["result_json"])
            evidence.extend(result.evidence)
            investigation_ids.append(investigation_id)
            return evidence, investigation_ids, result.conclusion
        return evidence, investigation_ids, None

    if report_type in ("SHIFT_REPORT", "EXECUTIVE_SUMMARY", "PRODUCTION_REPORT"):
        result = _run_tool("get_production_kpis", args)
        if result:
            evidence.append(_evidence_from_result("get_production_kpis", result, scope.equipment_ids))
    if report_type in ("SHIFT_REPORT", "EXECUTIVE_SUMMARY", "FLEET_REPORT"):
        result = _run_tool("get_fleet_status", args)
        if result:
            evidence.append(_evidence_from_result("get_fleet_status", result, scope.equipment_ids))
    if report_type in ("SHIFT_REPORT", "PRODUCTION_REPORT"):
        result = _run_tool("get_loading_performance", args)
        if result:
            evidence.append(_evidence_from_result("get_loading_performance", result, scope.equipment_ids))
    if report_type in ("SHIFT_REPORT", "BREAKDOWN_REPORT", "EXECUTIVE_SUMMARY", "FLEET_REPORT"):
        result = _run_tool("get_alerts", {})
        if result:
            evidence.append(_evidence_from_result("get_alerts", result, []))

    result = _run_tool("get_data_quality_status", args)
    if result:
        evidence.append(_evidence_from_result("get_data_quality_status", result, []))

    return evidence, investigation_ids, None


def _section(section_id: str, title: str, content: str, evidence_ids: list[str] | None = None) -> ReportSection:
    return ReportSection(section_id=section_id, title=title, content=content, evidence_ids=evidence_ids or [])


def _resumen_ejecutivo(evidence: list[EvidenceItem], audience: Audience) -> ReportSection:
    prod, fleet = _find(evidence, "get_production_kpis"), _find(evidence, "get_fleet_status")
    parts: list[str] = []
    ids: list[str] = []
    if prod:
        v = prod.value
        parts.append(f"Cumplimiento de producción: {_fmt_pct(v.get('cumplimiento_pct'))} ({v.get('toneladas_turno')} t de {v.get('meta_turno')} t de meta).")
        ids.append(prod.evidence_id)
        if audience in ("manager", "executive"):
            parts.append(f"Tendencia: {v.get('tendencia', 'sin dato')}.")
    if fleet:
        v = fleet.value
        parts.append(f"Disponibilidad de flota: {_fmt_pct(v.get('disponibilidad_pct'))}, utilización {_fmt_pct(v.get('utilizacion_pct'))}.")
        ids.append(fleet.evidence_id)
    content = " ".join(parts) if parts else "Sin datos suficientes para construir un resumen ejecutivo en este alcance."
    return _section("resumen_ejecutivo", "Resumen ejecutivo", content, ids)


def _estado_operacional(evidence: list[EvidenceItem]) -> ReportSection:
    prod = _find(evidence, "get_production_kpis")
    if not prod:
        return _section("estado_operacional", "Estado operacional", "Sin datos de producción disponibles para este alcance.")
    v = prod.value
    content = (
        f"Ritmo actual {v.get('ritmo_actual_tph', 'sin dato')} t/h frente a un ritmo requerido de "
        f"{v.get('ritmo_requerido_tph', 'sin dato')} t/h. Proyección de fin de turno: {v.get('proyeccion_fin_turno', 'sin dato')} t "
        f"(brecha proyectada {v.get('brecha_proyectada_ton', 'sin dato')} t)."
    )
    return _section("estado_operacional", "Estado operacional", content, [prod.evidence_id])


def _desviaciones(evidence: list[EvidenceItem]) -> ReportSection:
    findings: list[str] = []
    ids: list[str] = []
    prod = _find(evidence, "get_production_kpis")
    if prod and isinstance(prod.value.get("cumplimiento_pct"), (int, float)) and prod.value["cumplimiento_pct"] < 95:
        findings.append(f"Producción por debajo de meta: {_fmt_pct(prod.value['cumplimiento_pct'])} de cumplimiento.")
        ids.append(prod.evidence_id)
    fleet = _find(evidence, "get_fleet_status")
    if fleet and isinstance(fleet.value.get("disponibilidad_pct"), (int, float)) and fleet.value["disponibilidad_pct"] < 85:
        findings.append(f"Disponibilidad de flota por debajo del rango esperado: {_fmt_pct(fleet.value['disponibilidad_pct'])}.")
        ids.append(fleet.evidence_id)
    loading = _find(evidence, "get_loading_performance")
    if loading:
        for unit in loading.value.get("unidades", []):
            if isinstance(unit.get("variacion_pct"), (int, float)) and unit["variacion_pct"] < -10:
                findings.append(f"{unit.get('carguio_id')}: rendimiento {unit['variacion_pct']:.1f}% bajo plan.")
        if findings:
            ids.append(loading.evidence_id)
    content = " ".join(findings) if findings else "No se detectaron desviaciones relevantes en el alcance consultado."
    return _section("desviaciones", "Desviaciones", content, ids)


def _evidencia_section(evidence: list[EvidenceItem]) -> ReportSection:
    if not evidence:
        return _section("evidencia", "Evidencia", "Sin evidencia estructurada disponible.")
    lines = [f"- {e.capability_id} (frescura: {e.freshness_status}, calidad: {e.quality_status})" for e in evidence]
    return _section("evidencia", "Evidencia", "\n".join(lines), [e.evidence_id for e in evidence])


def _riesgos(evidence: list[EvidenceItem]) -> ReportSection:
    alerts = _find(evidence, "get_alerts")
    if not alerts:
        return _section("riesgos", "Riesgos", "Sin datos de alertas disponibles para evaluar riesgos.")
    counts = alerts.value.get("counts", {})
    critical = counts.get("CRITICAL") or counts.get("critical") or 0
    content = f"{alerts.value.get('count', 0)} alertas activas ({critical} críticas)." if alerts.value.get("count") else "Sin alertas activas registradas."
    return _section("riesgos", "Riesgos", content, [alerts.evidence_id])


def _calidad_de_datos(evidence: list[EvidenceItem]) -> ReportSection:
    quality = _find(evidence, "get_data_quality_status")
    if not quality:
        return _section("calidad_de_datos", "Calidad de datos", "Sin evaluación de calidad de datos disponible.")
    v = quality.value
    content = f"Score de calidad {v.get('score', 'sin dato')}/100, completitud {_fmt_pct(v.get('completeness_pct'))}, fuente {v.get('source', 'sin dato')}."
    return _section("calidad_de_datos", "Calidad de datos", content, [quality.evidence_id])


def _limitaciones(evidence: list[EvidenceItem]) -> ReportSection:
    stale = [e.capability_id for e in evidence if e.freshness_status != "current"]
    low_quality = [e.capability_id for e in evidence if e.quality_status in ("low", "unknown")]
    parts = []
    if stale:
        parts.append(f"Datos no confirmados como en vivo: {', '.join(stale)}.")
    if low_quality:
        parts.append(f"Calidad de dato baja o desconocida: {', '.join(low_quality)}.")
    if not evidence:
        parts.append("No se pudo reunir evidencia estructurada para este alcance.")
    return _section("limitaciones", "Limitaciones", " ".join(parts) if parts else "Sin limitaciones relevantes detectadas.")


def _fuentes(evidence: list[EvidenceItem]) -> ReportSection:
    sources = sorted({e.source for e in evidence if e.source})
    return _section("fuentes", "Fuentes", ", ".join(sources) if sources else "Sin fuentes registradas.")


def _report_tables(evidence: list[EvidenceItem]) -> list[ReportTable]:
    """R2 §8 (integrado desde feature/operational-agent-hardening): tabla
    derivada de get_loading_performance, con evidence_ids reales - nunca
    fabrica filas, si no hay unidades no hay tabla."""
    loading = _find(evidence, "get_loading_performance")
    units = loading.value.get("unidades", []) if loading else []
    if not loading or not units:
        return []
    rows = [{
        "Equipo": unit.get("carguio_id"),
        "Indicador": "Rendimiento de carguío",
        "Real": unit.get("rendimiento_tph"),
        "Desviación": unit.get("variacion_pct"),
        "Estado": unit.get("estado"),
    } for unit in units]
    return [ReportTable(
        table_id="rendimiento_carguio",
        title="Rendimiento por unidad de carguío",
        question="¿Qué unidad concentra la mayor desviación de carguío?",
        columns=["Equipo", "Indicador", "Real", "Desviación", "Estado"],
        rows=rows,
        evidence_ids=[loading.evidence_id],
    )]


def _report_charts(evidence: list[EvidenceItem]) -> list[ReportChart]:
    """R2 §8: grafico horario derivado de get_production_kpis, solo si el
    dataset trae series por hora - nunca inventa puntos."""
    production = _find(evidence, "get_production_kpis")
    hourly = production.value.get("hourly", production.value.get("serie_horaria", [])) if production else []
    if not production or not isinstance(hourly, list) or not hourly:
        return []
    y_fields = [field for field in ("real", "plan") if any(field in row for row in hourly)]
    if not y_fields:
        return []
    return [ReportChart(
        chart_id="produccion_hora",
        title="Producción horaria",
        question="¿En qué intervalo se concentra la desviación frente al plan?",
        chart_type="line",
        x_field="hora",
        y_fields=y_fields,
        data=hourly,
        evidence_ids=[production.evidence_id],
    )]


_SECTION_BUILDERS = {
    "Resumen ejecutivo": lambda ev, aud: _resumen_ejecutivo(ev, aud),
    "Estado operacional": lambda ev, aud: _estado_operacional(ev),
    "Desviaciones": lambda ev, aud: _desviaciones(ev),
    "Evidencia": lambda ev, aud: _evidencia_section(ev),
    "Riesgos": lambda ev, aud: _riesgos(ev),
    "Calidad de datos": lambda ev, aud: _calidad_de_datos(ev),
    "Limitaciones": lambda ev, aud: _limitaciones(ev),
    "Fuentes": lambda ev, aud: _fuentes(ev),
}


def _causas_probables(section_id: str, title: str, conclusion: InvestigationConclusion | None) -> ReportSection:
    # C4: si hay una InvestigationConclusion real, el reporte cita sus
    # probable_causes reales (con los evidence_ids que ya las respaldan) en
    # vez de un texto generico que ignora lo que la investigacion concluyo.
    if conclusion is not None and conclusion.probable_causes:
        content = " ".join(conclusion.probable_causes)
        return _section(section_id, title, content, list(conclusion.supporting_evidence_ids))
    return _section(section_id, title, "Ver sección Desviaciones y evidencia asociada — no se infieren causas sin evidencia que las respalde.")


def _evidencia_contradictoria(section_id: str, title: str, conclusion: InvestigationConclusion | None) -> ReportSection:
    if conclusion is not None and conclusion.contradictions:
        content = " ".join(conclusion.contradictions)
        return _section(section_id, title, content, list(conclusion.contradicting_evidence_ids))
    return _section(section_id, title, "No se detectaron contradicciones entre fuentes de evidencia en este alcance.")


def _static_section(
    title: str, scope: ReportScope, report_type: ReportType, conclusion: InvestigationConclusion | None = None,
) -> ReportSection:
    section_id = title.lower().replace(" ", "_").replace("ó", "o").replace("é", "e")
    if title == "Objetivo":
        return _section(section_id, title, f"Reportar el estado operacional relevante para {templates.audience_label(scope.audience)}.")
    if title == "Alcance":
        equip = ", ".join(scope.equipment_ids) if scope.equipment_ids else "toda la operación en el alcance del turno"
        return _section(section_id, title, f"Equipos/entidades: {equip}.")
    if title == "Periodo":
        if scope.date_range:
            return _section(section_id, title, f"Del {scope.date_range.from_} al {scope.date_range.to}.")
        return _section(section_id, title, f"Turno: {scope.shift or 'no especificado'}.")
    if title == "Causas probables":
        return _causas_probables(section_id, title, conclusion)
    if title == "Evidencia contradictoria":
        return _evidencia_contradictoria(section_id, title, conclusion)
    if title == "Recomendaciones":
        return _section(section_id, title, "Revisar las desviaciones listadas y evaluar apertura de investigación o tarea de seguimiento si corresponde.")
    if title == "Acciones propuestas":
        return _section(section_id, title, "Sin acciones propuestas automáticamente — requiere criterio humano sobre las desviaciones reportadas.")
    if title == "Responsable de validación":
        return _section(section_id, title, "Este borrador requiere validación humana antes de considerarse oficial.")
    return _section(section_id, title, "Sin contenido generado para esta sección.")


def build_report(
    *, report_type: ReportType, scope: ReportScope, generated_by: str, company_id: str | None, site_id: str | None,
    investigation_id: str | None = None, title: str | None = None,
) -> ReportDraft:
    evidence, investigation_ids, conclusion = gather_evidence(
        report_type=report_type, scope=scope, investigation_id=investigation_id,
    )
    sections: list[ReportSection] = []
    for section_title in templates.sections_for(report_type):
        builder = _SECTION_BUILDERS.get(section_title)
        sections.append(builder(evidence, scope.audience) if builder else _static_section(section_title, scope, report_type, conclusion))

    draft = ReportDraft(
        report_type=report_type,
        title=title or f"{templates.REPORT_TITLE_PREFIX} — {report_type.replace('_', ' ').title()}",
        scope=scope, sections=sections, evidence_ids=[e.evidence_id for e in evidence],
        investigation_ids=investigation_ids, company_id=company_id, site_id=site_id, generated_by=generated_by,
        # R2 §8 (integrado desde feature/operational-agent-hardening):
        # identification/tables/charts/evidence_snapshot/generation_metadata
        # son presentacion y trazabilidad interna adicionales - ninguno
        # reemplaza evidence_ids/investigation_ids/conclusion (C4), que
        # siguen siendo la fuente real del lineage Capability->Evidence->
        # Hypothesis->Conclusion->Report.
        identification=ReportIdentification(
            site=site_id,
            shift=scope.shift,
            date=scope.date_range.to if scope.date_range else None,
            period=f"{scope.date_range.from_} — {scope.date_range.to}" if scope.date_range else None,
        ),
        tables=_report_tables(evidence),
        charts=_report_charts(evidence),
        evidence_snapshot=evidence,
        generation_metadata={"composer": "northmine-report-composer", "traceability": "internal-audit-only"},
    )

    # Verifier (seccion 33): cualquier cita colgante o falta de evidencia se
    # anexa a la seccion Limitaciones ya existente - nunca se oculta.
    verifier_notes = verifier.verify_report_evidence(draft)
    if verifier_notes:
        draft = draft.model_copy(update={
            "sections": [
                s.model_copy(update={"content": f"{s.content}\n" + "\n".join(verifier_notes)}) if s.title == "Limitaciones" else s
                for s in draft.sections
            ],
        })

    # R2 §8: quality_gate real (report_verifier.py), calculado sobre el
    # draft YA completo (secciones + tablas + evidencia) - informativo por
    # ahora, ver router.py::_guard_report_quality_gate sobre por que
    # todavia no bloquea approve_report en produccion.
    draft = draft.model_copy(update={"quality_gate": report_verifier.verify_report(draft)})

    return draft
