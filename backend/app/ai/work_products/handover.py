from __future__ import annotations

from app.ai.memory import episodic_memory, working_memory
from app.ai.proactivity import subscriptions
from app.ai.work_products import persistence, reports
from app.ai.work_products.models import HandoverSection, ReportScope, ShiftHandoverDraft
from app.services import averias_import_service

"""ShiftHandoverDraft (Etapa 6, seccion 22 del brief). Recopila
automaticamente produccion/flota/carguio/averias/alertas/investigaciones/
tareas/watches - todo desde fuentes reales ya existentes (TOOL_REGISTRY,
averias_import_service, memoria de trabajo/episodica, proactividad). Nunca
se envia solo: siempre queda como WorkProduct pendiente de aprobacion
(seccion 22: 'BORRADOR IA - REQUIERE VALIDACION').
"""


def _section(section_id: str, title: str, content: str) -> HandoverSection:
    return HandoverSection(section_id=section_id, title=title, content=content)


def _breakdowns_section() -> tuple[HandoverSection, list[str]]:
    try:
        breakdown = averias_import_service.get_fleet_breakdown(days=1)
    except Exception:  # noqa: BLE001 - fuente opcional, no debe tumbar el handover
        return _section("averias", "Averías", "Sin datos de averías disponibles para las últimas 24 horas."), []

    equipment = breakdown.get("equipment") if isinstance(breakdown, dict) else None
    if not equipment:
        return _section("averias", "Averías", "Sin averías registradas en las últimas 24 horas."), []
    lines = [
        f"- {info.get('equipment_id')}: {info.get('events')} evento(s), {info.get('criticas', 0)} crítico(s), "
        f"{round(info.get('total_min', 0))} min de detención."
        for info in equipment.values()
    ]
    return _section("averias", "Averías", "\n".join(lines)), [str(k) for k in equipment.keys()]


def build_handover(*, generated_by: str, company_id: str | None, site_id: str | None, shift: str | None) -> ShiftHandoverDraft:
    scope = ReportScope(shift=shift, audience="supervisor")
    evidence, _ = reports.gather_evidence(report_type="SHIFT_REPORT", scope=scope)
    prod = next((e for e in evidence if e.capability_id == "get_production_kpis"), None)
    fleet = next((e for e in evidence if e.capability_id == "get_fleet_status"), None)
    loading = next((e for e in evidence if e.capability_id == "get_loading_performance"), None)
    alerts = next((e for e in evidence if e.capability_id == "get_alerts"), None)
    quality = next((e for e in evidence if e.capability_id == "get_data_quality_status"), None)

    sections: list[HandoverSection] = []

    if prod:
        v = prod.value
        sections.append(_section("produccion", "Producción", f"{v.get('toneladas_turno')} t de {v.get('meta_turno')} t de meta ({v.get('cumplimiento_pct')}% cumplimiento). Tendencia: {v.get('tendencia', 'sin dato')}."))
    else:
        sections.append(_section("produccion", "Producción", "Sin datos de producción disponibles."))

    if loading:
        v = loading.value
        sections.append(_section("carguio", "Carguío", f"{v.get('total_toneladas')} t movidas, rendimiento promedio {v.get('rendimiento_promedio_tph')} t/h en {len(v.get('unidades', []))} unidad(es)."))
    else:
        sections.append(_section("carguio", "Carguío", "Sin datos de carguío disponibles."))

    if fleet:
        v = fleet.value
        sections.append(_section("transporte", "Transporte", f"Disponibilidad {v.get('disponibilidad_pct')}%, utilización {v.get('utilizacion_pct')}%. {v.get('equipos_en_demora', 0)} equipo(s) en demora, {v.get('equipos_sin_actividad', 0)} sin actividad."))
    else:
        sections.append(_section("transporte", "Transporte", "Sin datos de flota disponibles."))

    active_entities = working_memory.list_active(company_id=company_id, site_id=site_id)
    critical_label = "; ".join(f"{e.entity}: {e.current_issue} ({e.status})" for e in active_entities) or "Sin equipos en seguimiento activo."
    sections.append(_section("equipos_criticos", "Equipos críticos", critical_label))

    breakdown_section, breakdown_entity_ids = _breakdowns_section()
    sections.append(breakdown_section)

    if alerts:
        v = alerts.value
        sections.append(_section("alertas", "Alertas", f"{v.get('count', 0)} alerta(s) activa(s). Distribución: {v.get('counts', {})}."))
    else:
        sections.append(_section("alertas", "Alertas", "Sin datos de alertas disponibles."))

    recent_investigations = episodic_memory.list_recent(company_id=company_id, site_id=site_id, episode_type="investigation", limit=5)
    investigation_ids = [inv_id for ep in recent_investigations for inv_id in ep.investigation_ids]
    sections.append(_section(
        "investigaciones", "Investigaciones",
        "\n".join(f"- {ep.title}: {ep.outcome or 'sin resultado registrado'}" for ep in recent_investigations) or "Sin investigaciones recientes registradas.",
    ))

    open_tasks = persistence.list_tasks(company_id=company_id, site_id=site_id, limit=50)
    open_tasks = [t for t in open_tasks if t.status not in ("completed", "cancelled", "rejected")]
    sections.append(_section(
        "seguimiento", "Acciones en seguimiento",
        "\n".join(f"- {t.title} ({t.status})" for t in open_tasks) or "Sin tareas abiertas registradas.",
    ))

    active_watches = [w for w in subscriptions.list_all_active() if w.company_id == company_id and w.site_id == site_id]
    pending = [f"Seguimiento activo: {w.entity_label or ', '.join(w.entity_ids)}" for w in active_watches]
    pending.extend(f"Tarea pendiente: {t.title}" for t in open_tasks)
    pending.extend(f"{e.entity}: {e.current_issue}" for e in active_entities if e.status in ("new", "ongoing", "worsening"))

    resolved = [f"{e.entity}: {e.current_issue}" for e in working_memory.list_all(company_id=company_id, site_id=site_id, status="resolved", limit=20)]

    if quality:
        sections.append(_section("calidad_de_datos", "Calidad de datos", f"Score {quality.value.get('score', 'sin dato')}/100, fuente {quality.value.get('source', 'sin dato')}."))
    else:
        sections.append(_section("calidad_de_datos", "Calidad de datos", "Sin evaluación de calidad de datos disponible."))

    handover = ShiftHandoverDraft(
        title=f"Cambio de turno — {shift or 'turno actual'}",
        shift=shift, sections=sections,
        pending_for_next_shift=pending or ["Sin pendientes registrados para el próximo turno."],
        resolved_this_shift=resolved or ["Sin problemas marcados como resueltos en este turno."],
        investigation_ids=investigation_ids, task_ids=[t.task_id for t in open_tasks],
        watch_ids=[w.watch_id for w in active_watches],
        data_quality_notes=[s.content for s in sections if s.section_id == "calidad_de_datos"],
        company_id=company_id, site_id=site_id, generated_by=generated_by,
    )
    persistence.save_handover(handover)
    return handover
