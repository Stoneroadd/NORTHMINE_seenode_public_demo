from __future__ import annotations

from typing import Any

from app.ai.investigation_repository import get_investigation
from app.ai.investigation_schemas import EvidenceItem, InvestigationResult, new_id
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

"""Compositor determinístico de reportes operacionales.

Los números proceden exclusivamente de EvidenceItem. La trazabilidad del
compositor se conserva en metadata excluida del documento visible.
"""


def _run_tool(capability_id: str, args: dict[str, Any] | None = None) -> dict[str, Any] | None:
    tool = TOOL_REGISTRY.get(capability_id)
    if not tool:
        return None
    try:
        return tool.handler(args or {})
    except Exception:
        return None


def _quality_status(quality: dict[str, Any]) -> str:
    score = quality.get("score")
    if not isinstance(score, (int, float)):
        return "unknown"
    return "high" if score >= 80 else "medium" if score >= 55 else "low"


def _evidence_from_result(capability_id: str, result: dict[str, Any], entity_ids: list[str]) -> EvidenceItem:
    freshness = result.get("freshness") or {}
    quality = result.get("data_quality") or {}
    return EvidenceItem(
        evidence_id=new_id("evid"),
        source_type="backend_tool",
        capability_id=capability_id,
        label=capability_id,
        value=result,
        entity_ids=entity_ids,
        source=str(quality.get("source") or "wenco-sql-live"),
        updated_at=freshness.get("last_updated_at"),
        freshness_status=freshness.get("status") if freshness.get("status") in ("current", "stale") else "unknown",
        quality_status=_quality_status(quality),
    )


def gather_evidence(
    *, report_type: ReportType, scope: ReportScope, investigation_id: str | None = None,
) -> tuple[list[EvidenceItem], list[str]]:
    evidence: list[EvidenceItem] = []
    investigation_ids: list[str] = []
    args: dict[str, Any] = {"shift": scope.shift} if scope.shift else {}

    if report_type == "INVESTIGATION_REPORT" and investigation_id:
        row = get_investigation(investigation_id)
        if row:
            result = InvestigationResult.model_validate_json(row["result_json"])
            evidence.extend(result.evidence)
            investigation_ids.append(investigation_id)
        return evidence, investigation_ids

    capability_types: dict[str, tuple[ReportType, ...]] = {
        "get_production_kpis": ("SHIFT_REPORT", "EXECUTIVE_SUMMARY", "PRODUCTION_REPORT"),
        "get_fleet_status": ("SHIFT_REPORT", "EXECUTIVE_SUMMARY", "FLEET_REPORT"),
        "get_loading_performance": ("SHIFT_REPORT", "PRODUCTION_REPORT"),
        "get_alerts": ("SHIFT_REPORT", "BREAKDOWN_REPORT", "EXECUTIVE_SUMMARY", "FLEET_REPORT"),
        "get_data_quality_status": (
            "SHIFT_REPORT", "INVESTIGATION_REPORT", "PRODUCTION_REPORT", "FLEET_REPORT",
            "BREAKDOWN_REPORT", "EXECUTIVE_SUMMARY",
        ),
    }
    for capability_id, report_types in capability_types.items():
        if report_type not in report_types:
            continue
        result = _run_tool(capability_id, {} if capability_id == "get_alerts" else args)
        if result:
            evidence.append(_evidence_from_result(capability_id, result, scope.equipment_ids))
    return evidence, investigation_ids


def _find(evidence: list[EvidenceItem], capability_id: str) -> EvidenceItem | None:
    return next((item for item in evidence if item.capability_id == capability_id), None)


def _fmt_pct(value: Any) -> str:
    return f"{value:.1f}%" if isinstance(value, (int, float)) else "sin dato"


def _section(section_id: str, title: str, content: str, evidence_ids: list[str] | None = None) -> ReportSection:
    return ReportSection(section_id=section_id, title=title, content=content, evidence_ids=evidence_ids or [])


def _executive_summary(evidence: list[EvidenceItem], audience: Audience) -> ReportSection:
    production = _find(evidence, "get_production_kpis")
    fleet = _find(evidence, "get_fleet_status")
    parts: list[str] = []
    ids: list[str] = []
    if production:
        value = production.value
        parts.append(
            f"La producción registra {_fmt_pct(value.get('cumplimiento_pct'))} de cumplimiento: "
            f"{value.get('toneladas_turno')} t frente a una meta de {value.get('meta_turno')} t."
        )
        if audience in ("manager", "executive"):
            parts.append(f"La tendencia verificada es {value.get('tendencia', 'sin dato')}.")
        ids.append(production.evidence_id)
    if fleet:
        value = fleet.value
        parts.append(
            f"La flota presenta {_fmt_pct(value.get('disponibilidad_pct'))} de disponibilidad y "
            f"{_fmt_pct(value.get('utilizacion_pct'))} de utilización."
        )
        ids.append(fleet.evidence_id)
    return _section("resumen_ejecutivo", "Resumen ejecutivo", " ".join(parts), ids)


def _production(evidence: list[EvidenceItem], title: str = "Producción") -> ReportSection:
    item = _find(evidence, "get_production_kpis")
    if not item:
        return _section("produccion", title, "")
    value = item.value
    content = (
        f"Ritmo actual {value.get('ritmo_actual_tph', 'sin dato')} t/h frente a "
        f"{value.get('ritmo_requerido_tph', 'sin dato')} t/h requerido. "
        f"Proyección de cierre {value.get('proyeccion_fin_turno', 'sin dato')} t; "
        f"brecha proyectada {value.get('brecha_proyectada_ton', 'sin dato')} t."
    )
    return _section(title.lower().replace(" ", "_"), title, content, [item.evidence_id])


def _fleet(evidence: list[EvidenceItem], title: str) -> ReportSection:
    item = _find(evidence, "get_fleet_status")
    if not item:
        return _section(title.lower().replace(" ", "_"), title, "")
    value = item.value
    content = (
        f"Disponibilidad {_fmt_pct(value.get('disponibilidad_pct'))}; "
        f"utilización {_fmt_pct(value.get('utilizacion_pct'))}; "
        f"equipos activos {value.get('activos', value.get('equipos_activos', 'sin dato'))}."
    )
    return _section(title.lower().replace(" ", "_"), title, content, [item.evidence_id])


def _loading(evidence: list[EvidenceItem]) -> ReportSection:
    item = _find(evidence, "get_loading_performance")
    units = item.value.get("unidades", []) if item else []
    if not item or not units:
        return _section("carguio", "Carguío", "")
    worst = min(units, key=lambda unit: float(unit.get("variacion_pct") or 0))
    return _section(
        "carguio", "Carguío",
        f"La mayor desviación relativa corresponde a {worst.get('carguio_id', 'unidad sin identificar')}: {worst.get('variacion_pct', 'sin dato')}%.",
        [item.evidence_id],
    )


def _deviations(evidence: list[EvidenceItem]) -> ReportSection:
    findings: list[str] = []
    ids: list[str] = []
    production = _find(evidence, "get_production_kpis")
    if production and isinstance(production.value.get("cumplimiento_pct"), (int, float)) and production.value["cumplimiento_pct"] < 95:
        findings.append(f"Producción: {_fmt_pct(production.value['cumplimiento_pct'])} de cumplimiento.")
        ids.append(production.evidence_id)
    fleet = _find(evidence, "get_fleet_status")
    if fleet and isinstance(fleet.value.get("disponibilidad_pct"), (int, float)) and fleet.value["disponibilidad_pct"] < 85:
        findings.append(f"Flota: disponibilidad {_fmt_pct(fleet.value['disponibilidad_pct'])}.")
        ids.append(fleet.evidence_id)
    loading = _find(evidence, "get_loading_performance")
    if loading:
        weak = [unit for unit in loading.value.get("unidades", []) if isinstance(unit.get("variacion_pct"), (int, float)) and unit["variacion_pct"] < -10]
        findings.extend(f"{unit.get('carguio_id')}: {unit['variacion_pct']:.1f}% de desviación." for unit in weak)
        if weak:
            ids.append(loading.evidence_id)
    return _section("desviaciones_principales", "Desviaciones principales", " ".join(findings), ids)


def _evidence_section(evidence: list[EvidenceItem]) -> ReportSection:
    lines = [f"- {item.capability_id}: frescura {item.freshness_status}; calidad {item.quality_status}." for item in evidence]
    return _section("evidencia_relevante", "Evidencia relevante", "\n".join(lines), [item.evidence_id for item in evidence])


def _risks(evidence: list[EvidenceItem]) -> ReportSection:
    alerts = _find(evidence, "get_alerts")
    if not alerts:
        return _section("riesgos_operacionales", "Riesgos operacionales", "")
    counts = alerts.value.get("counts", {})
    critical = counts.get("CRITICA", counts.get("CRITICAL", counts.get("critical", 0)))
    return _section(
        "riesgos_operacionales", "Riesgos operacionales",
        f"{alerts.value.get('count', 0)} alertas activas; {critical} críticas.",
        [alerts.evidence_id],
    )


def _quality(evidence: list[EvidenceItem]) -> ReportSection:
    item = _find(evidence, "get_data_quality_status")
    if not item:
        return _section("calidad_de_datos", "Calidad de datos", "")
    value = item.value
    return _section(
        "calidad_de_datos", "Calidad de datos",
        f"Calidad {value.get('score', 'sin dato')}/100; completitud {_fmt_pct(value.get('completeness_pct'))}; fuente {value.get('source', 'sin dato')}.",
        [item.evidence_id],
    )


def _sources(evidence: list[EvidenceItem]) -> ReportSection:
    sources = sorted({item.source for item in evidence if item.source})
    return _section("anexos", "Anexos", "Fuentes: " + ", ".join(sources) if sources else "", [item.evidence_id for item in evidence])


def _recommendations(evidence: list[EvidenceItem]) -> ReportSection:
    deviations = _deviations(evidence)
    if not deviations.content:
        return _section("acciones_y_recomendaciones", "Acciones y recomendaciones", "")
    return _section(
        "acciones_y_recomendaciones",
        "Acciones y recomendaciones",
        "Priorizar la verificación operacional de las desviaciones cuantificadas y mantener seguimiento hasta confirmar recuperación.",
        deviations.evidence_ids,
    )


def _empty_section(title: str) -> ReportSection:
    return _section(title.lower().replace(" ", "_"), title, "")


def _section_for(title: str, evidence: list[EvidenceItem], audience: Audience) -> ReportSection:
    builders = {
        "Resumen ejecutivo": lambda: _executive_summary(evidence, audience),
        "Resultado operacional": lambda: _production(evidence, "Resultado operacional"),
        "Producción": lambda: _production(evidence),
        "Carguío": lambda: _loading(evidence),
        "Transporte": lambda: _fleet(evidence, "Transporte"),
        "Utilización y disponibilidad": lambda: _fleet(evidence, "Utilización y disponibilidad"),
        "Desviaciones principales": lambda: _deviations(evidence),
        "Evidencia relevante": lambda: _evidence_section(evidence),
        "Riesgos operacionales": lambda: _risks(evidence),
        "Acciones y recomendaciones": lambda: _recommendations(evidence),
        "Calidad de datos": lambda: _quality(evidence),
        "Anexos": lambda: _sources(evidence),
    }
    return builders.get(title, lambda: _empty_section(title))()


def _report_tables(evidence: list[EvidenceItem]) -> list[ReportTable]:
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


def build_report(
    *, report_type: ReportType, scope: ReportScope, generated_by: str,
    company_id: str | None, site_id: str | None,
    investigation_id: str | None = None, title: str | None = None,
) -> ReportDraft:
    evidence, investigation_ids = gather_evidence(
        report_type=report_type, scope=scope, investigation_id=investigation_id,
    )
    sections = [
        section for section_title in templates.sections_for(report_type)
        if (section := _section_for(section_title, evidence, scope.audience)).content.strip()
    ]
    draft = ReportDraft(
        report_type=report_type,
        title=title or templates.report_title(report_type),
        scope=scope,
        identification=ReportIdentification(
            site=site_id,
            shift=scope.shift,
            date=scope.date_range.to if scope.date_range else None,
            period=f"{scope.date_range.from_} — {scope.date_range.to}" if scope.date_range else None,
        ),
        sections=sections,
        tables=_report_tables(evidence),
        charts=_report_charts(evidence),
        evidence_ids=[item.evidence_id for item in evidence],
        evidence_snapshot=evidence,
        investigation_ids=investigation_ids,
        company_id=company_id,
        site_id=site_id,
        generated_by=generated_by,
        generation_metadata={"composer": "northmine-report-composer", "traceability": "internal-audit-only"},
    )
    return draft.model_copy(update={"quality_gate": report_verifier.verify_report(draft)})
