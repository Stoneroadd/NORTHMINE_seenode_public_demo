from __future__ import annotations

from datetime import datetime, timedelta, timezone

from app.mission_control.models import (
    AssertionType,
    DataQuality,
    FlowDetail,
    FlowEvent,
    FlowEvidence,
    FlowMoment,
    FlowNode,
    FlowRelationship,
    OperationalCondition,
    OperationalFlowSnapshot,
    Provenance,
)


SITE_TZ = timezone(timedelta(hours=-4))
SCENARIO_START = datetime(2026, 8, 20, 10, 24, tzinfo=SITE_TZ)
EVENT_DETECTED = datetime(2026, 8, 20, 10, 31, tzinfo=SITE_TZ)
ACTION_RECORDED = datetime(2026, 8, 20, 10, 38, tzinfo=SITE_TZ)
EVENT_NORMALIZED = datetime(2026, 8, 20, 10, 52, tzinfo=SITE_TZ)
SCENARIO_END = datetime(2026, 8, 20, 11, 0, tzinfo=SITE_TZ)
DEFAULT_AT = datetime(2026, 8, 20, 10, 45, tzinfo=SITE_TZ)

SOURCE_PROVENANCE = Provenance(representation="SOURCE")
DERIVED_PROVENANCE = Provenance(representation="DERIVED")


def _phase(at: datetime) -> str:
    if at < EVENT_DETECTED:
        return "STABLE"
    if at < ACTION_RECORDED:
        return "CRITICAL"
    if at < EVENT_NORMALIZED:
        return "RECOVERING"
    return "NORMALIZED"


def _node(
    node_id: str,
    *,
    entity_id: str | None,
    external_id: str | None,
    node_role: str,
    entity_kind: str,
    semantic_group: str,
    label: str,
    summary: str,
    condition: OperationalCondition,
    assertion_type: AssertionType,
    evidence_ids: list[str],
    technical_details: list[FlowDetail] | None = None,
) -> FlowNode:
    return FlowNode(
        node_id=node_id,
        entity_id=entity_id,
        external_id=external_id,
        node_role=node_role,
        entity_kind=entity_kind,
        semantic_group=semantic_group,
        label=label,
        summary=summary,
        condition=condition,
        assertion_type=assertion_type,
        evidence_ids=evidence_ids,
        technical_details=technical_details or [],
    )


def _detail(
    detail_id: str,
    *,
    group: str,
    label: str,
    value: str,
    observed_at: datetime,
    assertion_type: AssertionType = AssertionType.FACT,
    unit: str | None = None,
    evidence_id: str | None = None,
    available: bool = True,
) -> FlowDetail:
    return FlowDetail(
        detail_id=detail_id,
        group=group,
        label=label,
        value=value,
        unit=unit,
        assertion_type=assertion_type,
        data_quality=DataQuality.FRESH if available else DataQuality.UNAVAILABLE,
        observed_at=observed_at,
        evidence_id=evidence_id,
        provenance=SOURCE_PROVENANCE if assertion_type is AssertionType.FACT else DERIVED_PROVENANCE,
    )


def _technical_details(phase: str, observed_at: datetime) -> dict[str, list[FlowDetail]]:
    values = {
        "STABLE": {
            "state_since": "10:24", "loading_time": "4,8", "truck_state": "6 en ciclo",
            "speed": "29", "haul_time": "12,0", "cycle_time": "28,4", "destination_queue": "1",
            "feed_rate": "5.980", "actual_tonnes": "19.800", "plan_to_time": "20.400",
            "gap": "−600", "projection": "69.840", "completion": "97",
        },
        "CRITICAL": {
            "state_since": "10:31", "loading_time": "No aplica", "truck_state": "4 en espera · 2 cargados",
            "speed": "11", "haul_time": "18,8", "cycle_time": "41,6", "destination_queue": "0",
            "feed_rate": "3.420", "actual_tonnes": "20.350", "plan_to_time": "21.100",
            "gap": "−2.800", "projection": "66.240", "completion": "92",
        },
        "RECOVERING": {
            "state_since": "10:31", "loading_time": "5,3", "truck_state": "4 reasignados · 2 retomando ciclo",
            "speed": "22", "haul_time": "15,1", "cycle_time": "34,2", "destination_queue": "1",
            "feed_rate": "4.860", "actual_tonnes": "20.700", "plan_to_time": "22.500",
            "gap": "−1.800", "projection": "67.680", "completion": "94",
        },
        "NORMALIZED": {
            "state_since": "10:52", "loading_time": "4,9", "truck_state": "6 reasignaciones registradas",
            "speed": "28", "haul_time": "12,8", "cycle_time": "29,2", "destination_queue": "1",
            "feed_rate": "5.760", "actual_tonnes": "21.350", "plan_to_time": "23.200",
            "gap": "−1.850", "projection": "69.120", "completion": "96",
        },
    }[phase]

    return {
        "front-f03": [
            _detail("front-bench", group="Ubicación", label="Banco", value="3180", unit="m", observed_at=observed_at),
            _detail("front-material", group="Material", label="Material", value="Mineral sulfurado", observed_at=observed_at),
            _detail("front-phase", group="Ubicación", label="Fase", value="Norte", observed_at=observed_at),
            _detail("front-destination", group="Plan", label="Destino planificado", value="Chancador 01", observed_at=observed_at),
        ],
        "loading-ph03": [
            _detail("shovel-model", group="Equipo", label="Modelo escenario", value="P&H 4100XPC", observed_at=observed_at),
            _detail("shovel-state", group="Estado", label="Estado escenario", value="DEMORA MECÁNICA" if phase in {"CRITICAL", "RECOVERING"} else "OPERATIVA", observed_at=observed_at, evidence_id="ev-source-ph03-state"),
            _detail("shovel-state-since", group="Estado", label="Estado desde", value=values["state_since"], observed_at=observed_at),
            _detail("shovel-assigned", group="Asignación", label="CAEX asignados", value="6", observed_at=observed_at, evidence_id="ev-source-assignments"),
            _detail(
                "shovel-loading-time", group="Rendimiento", label="Tiempo medio de carguío",
                value=values["loading_time"], unit=None if values["loading_time"] == "No aplica" else "min",
                observed_at=observed_at, assertion_type=AssertionType.DERIVED,
            ),
        ],
        "truck-group-ph03": [
            _detail("trucks-identities", group="Asignación", label="Equipos", value="CA101 · CA102 · CA103 · CA104 · CA105 · CA106", observed_at=observed_at, evidence_id="ev-source-assignments"),
            _detail("trucks-model", group="Equipo", label="Modelo escenario", value="CAT 793F", observed_at=observed_at),
            _detail("trucks-state", group="Ciclo", label="Distribución operacional", value=values["truck_state"], observed_at=observed_at, assertion_type=AssertionType.DERIVED),
            _detail("trucks-payload-target", group="Ciclo", label="Carga objetivo escenario", value="240", unit="t/CAEX", observed_at=observed_at),
        ],
        "route-north": [
            _detail("route-length", group="Ruta", label="Distancia cargado", value="5,8", unit="km", observed_at=observed_at),
            _detail("route-speed-reference", group="Velocidad", label="Velocidad de referencia", value="29", unit="km/h", observed_at=observed_at, assertion_type=AssertionType.DERIVED),
            _detail("route-speed-current", group="Velocidad", label="Velocidad observada", value=values["speed"], unit="km/h", observed_at=observed_at),
            _detail("route-haul-time", group="Ciclo", label="Tiempo cargado", value=values["haul_time"], unit="min", observed_at=observed_at, assertion_type=AssertionType.DERIVED),
        ],
        "destination-crusher": [
            _detail("destination-queue", group="Cola", label="CAEX en cola", value=values["destination_queue"], observed_at=observed_at),
            _detail("destination-feed", group="Producción", label="Ritmo de alimentación", value=values["feed_rate"], unit="t/h", observed_at=observed_at, assertion_type=AssertionType.DERIVED),
            _detail("destination-material", group="Material", label="Material recibido", value="Mineral sulfurado", observed_at=observed_at),
        ],
        "metric-cycle": [
            _detail("cycle-median", group="Ciclo", label="Ciclo mediano", value=values["cycle_time"], unit="min", observed_at=observed_at, assertion_type=AssertionType.DERIVED, evidence_id="ev-derived-cycle"),
            _detail("cycle-loaded", group="Ciclo", label="Acarreo cargado", value=values["haul_time"], unit="min", observed_at=observed_at, assertion_type=AssertionType.DERIVED),
            _detail("cycle-speed", group="Velocidad", label="Velocidad cargado", value=values["speed"], unit="km/h", observed_at=observed_at, assertion_type=AssertionType.DERIVED),
            _detail("cycle-baseline", group="Referencia", label="Ciclo de referencia", value="28,4", unit="min", observed_at=observed_at, assertion_type=AssertionType.DERIVED),
        ],
        "metric-tonnage": [
            _detail("tonnage-actual", group="Producción", label="Tonelaje a la hora", value=values["actual_tonnes"], unit="t", observed_at=observed_at, assertion_type=AssertionType.DERIVED),
            _detail("tonnage-plan", group="Producción", label="Plan a la hora", value=values["plan_to_time"], unit="t", observed_at=observed_at, assertion_type=AssertionType.DERIVED),
            _detail("tonnage-gap", group="Producción", label="Brecha estimada", value=values["gap"], unit="t", observed_at=observed_at, assertion_type=AssertionType.DERIVED, evidence_id="ev-derived-tonnage"),
        ],
        "plan-shift": [
            _detail("plan-total", group="Plan", label="Plan del turno", value="72.000", unit="t", observed_at=observed_at),
            _detail("plan-projection", group="Proyección", label="Proyección de cierre", value=values["projection"], unit="t", observed_at=observed_at, assertion_type=AssertionType.DERIVED, evidence_id="ev-derived-tonnage"),
            _detail("plan-completion", group="Proyección", label="Cumplimiento proyectado", value=values["completion"], unit="%", observed_at=observed_at, assertion_type=AssertionType.DERIVED),
        ],
        "cost-impact": [
            _detail("cost-status", group="Costo", label="Estado del cálculo", value="No calculado", observed_at=observed_at, assertion_type=AssertionType.HYPOTHESIS, available=False),
            _detail("cost-missing-rate", group="Limitación", label="Variable faltante", value="Tarifa operacional homologada", observed_at=observed_at, assertion_type=AssertionType.HYPOTHESIS, available=False),
            _detail("cost-confidence", group="Limitación", label="Confianza de relación", value="0,35", observed_at=observed_at, assertion_type=AssertionType.HYPOTHESIS),
        ],
    }


def build_demo_operational_flow_snapshot(
    *,
    tenant_id: str,
    site_id: str,
    at: datetime | None = None,
) -> OperationalFlowSnapshot:
    """Build the deterministic S01 read model without pretending it is Wenco truth."""
    effective_at = (at or DEFAULT_AT).astimezone(SITE_TZ)
    if not SCENARIO_START <= effective_at <= SCENARIO_END:
        raise ValueError("El timestamp debe pertenecer a la ventana demo 2026-08-20 10:24-11:00 America/Santiago")

    phase = _phase(effective_at)
    technical_details = _technical_details(phase, effective_at)
    is_stable = phase == "STABLE"
    is_critical = phase in {"CRITICAL", "RECOVERING"}
    is_recovering = phase == "RECOVERING"
    is_normalized = phase == "NORMALIZED"

    evidence = [
        FlowEvidence(
            evidence_id="ev-source-ph03-state",
            assertion_type=AssertionType.FACT,
            label="Estado de unidad de carguío",
            value="DEMORA MECÁNICA" if is_critical else "OPERATIVA",
            observed_at=effective_at,
            provenance=SOURCE_PROVENANCE,
        ),
        FlowEvidence(
            evidence_id="ev-source-assignments",
            assertion_type=AssertionType.FACT,
            label="Asignaciones vigentes",
            value="6 CAEX asignados a PH03",
            observed_at=effective_at,
            provenance=SOURCE_PROVENANCE,
        ),
        FlowEvidence(
            evidence_id="ev-derived-cycle",
            assertion_type=AssertionType.DERIVED,
            label="Continuidad de ciclos",
            value="6 ciclos cargados sin continuidad" if is_critical else "Continuidad dentro de referencia",
            observed_at=effective_at,
            provenance=DERIVED_PROVENANCE,
        ),
        FlowEvidence(
            evidence_id="ev-derived-tonnage",
            assertion_type=AssertionType.DERIVED,
            label="Proyección de tonelaje",
            value="−2.800 t frente al plan" if is_critical else "Dentro de banda de plan",
            observed_at=effective_at,
            provenance=DERIVED_PROVENANCE,
        ),
    ]

    if is_stable:
        shovel_condition = truck_condition = OperationalCondition.NORMAL
        downstream_condition = OperationalCondition.NORMAL
        shovel_summary = "Operativa"
        truck_summary = "6 asignados · en ciclo"
        route_summary = "Flujo cargado normal"
        cycle_summary = "Referencia 29 km/h"
        tonnage_summary = "Dentro de banda"
        plan_summary = "97% proyectado"
    elif is_recovering:
        shovel_condition = truck_condition = OperationalCondition.RECOVERING
        downstream_condition = OperationalCondition.ATTENTION
        shovel_summary = "Recuperando"
        truck_summary = "Redistribución en curso"
        route_summary = "Flujo restableciéndose"
        cycle_summary = "Ciclos retomándose"
        tonnage_summary = "Brecha reduciéndose"
        plan_summary = "94% proyectado"
    elif is_normalized:
        shovel_condition = truck_condition = OperationalCondition.NORMAL
        downstream_condition = OperationalCondition.NORMAL
        shovel_summary = "Operativa · evento normalizado"
        truck_summary = "6 reasignaciones registradas"
        route_summary = "Flujo normalizado"
        cycle_summary = "Continuidad recuperada"
        tonnage_summary = "Brecha preservada en historia"
        plan_summary = "96% proyectado"
    else:
        shovel_condition = truck_condition = OperationalCondition.CRITICAL
        downstream_condition = OperationalCondition.ATTENTION
        elapsed = max(0, int((effective_at - EVENT_DETECTED).total_seconds() // 60))
        shovel_summary = f"Detenida · {elapsed} min"
        truck_summary = "6 afectados · sin ciclo"
        route_summary = "Flujo cargado interrumpido"
        cycle_summary = "Ciclos sin cierre"
        tonnage_summary = "−2.800 t proyectadas"
        plan_summary = "92% proyectado"

    nodes = [
        _node(
            "front-f03", entity_id="0eae36d8-f141-4a0e-bab8-1ea896ae6960", external_id="F03",
            node_role="ENTITY", entity_kind="FRONT", semantic_group="EXTRACTION", label="Frente 03",
            summary="Mineral · fase norte", condition=OperationalCondition.NORMAL,
            assertion_type=AssertionType.FACT, evidence_ids=[], technical_details=technical_details["front-f03"],
        ),
        _node(
            "loading-ph03", entity_id="f8e241f5-499b-46a8-9275-b3be728f8f94", external_id="PH03",
            node_role="ENTITY", entity_kind="LOADING_UNIT", semantic_group="LOADING", label="PH03",
            summary=shovel_summary, condition=shovel_condition,
            assertion_type=AssertionType.FACT, evidence_ids=["ev-source-ph03-state"], technical_details=technical_details["loading-ph03"],
        ),
        _node(
            "truck-group-ph03", entity_id=None, external_id=None,
            node_role="AGGREGATE", entity_kind="TRUCK_GROUP", semantic_group="TRANSPORT", label="6 CAEX",
            summary=truck_summary, condition=truck_condition,
            assertion_type=AssertionType.DERIVED, evidence_ids=["ev-source-assignments"], technical_details=technical_details["truck-group-ph03"],
        ),
        _node(
            "route-north", entity_id="149b6157-7640-453d-a6af-bd44c9e9da99", external_id="ROUTE_NORTH",
            node_role="ENTITY", entity_kind="ROUTE", semantic_group="TRANSPORT", label="Ruta Norte",
            summary=route_summary, condition=downstream_condition,
            assertion_type=AssertionType.FACT, evidence_ids=["ev-source-assignments"], technical_details=technical_details["route-north"],
        ),
        _node(
            "destination-crusher", entity_id="b026a320-5df6-4c35-8b7a-59a11f9ab81c", external_id="CRUSHER_01",
            node_role="ENTITY", entity_kind="DESTINATION", semantic_group="DESTINATION", label="Chancador 01",
            summary="Alimentación reducida" if is_critical else "Recepción operativa",
            condition=downstream_condition, assertion_type=AssertionType.FACT,
            evidence_ids=["ev-source-assignments"], technical_details=technical_details["destination-crusher"],
        ),
        _node(
            "metric-cycle", entity_id=None, external_id=None,
            node_role="OUTCOME", entity_kind="METRIC", semantic_group="PERFORMANCE", label="Velocidad / ciclo",
            summary=cycle_summary, condition=downstream_condition,
            assertion_type=AssertionType.DERIVED, evidence_ids=["ev-derived-cycle"], technical_details=technical_details["metric-cycle"],
        ),
        _node(
            "metric-tonnage", entity_id=None, external_id=None,
            node_role="OUTCOME", entity_kind="METRIC", semantic_group="PRODUCTION", label="Tonelaje",
            summary=tonnage_summary, condition=downstream_condition,
            assertion_type=AssertionType.DERIVED, evidence_ids=["ev-derived-tonnage"], technical_details=technical_details["metric-tonnage"],
        ),
        _node(
            "plan-shift", entity_id=None, external_id="PLAN_DAY_2026-08-20",
            node_role="OUTCOME", entity_kind="PLAN", semantic_group="PLAN", label="Plan turno",
            summary=plan_summary, condition=downstream_condition,
            assertion_type=AssertionType.DERIVED, evidence_ids=["ev-derived-tonnage"], technical_details=technical_details["plan-shift"],
        ),
        _node(
            "cost-impact", entity_id=None, external_id=None,
            node_role="OUTCOME", entity_kind="COST", semantic_group="VALUE", label="Impacto costo",
            summary="Sin cálculo autorizado", condition=OperationalCondition.UNKNOWN,
            assertion_type=AssertionType.HYPOTHESIS, evidence_ids=[], technical_details=technical_details["cost-impact"],
        ),
    ]

    relationship_specs = [
        ("rel-front-load", "front-f03", "loading-ph03", "FEEDS", "alimenta", AssertionType.FACT, 1.0),
        ("rel-load-trucks", "loading-ph03", "truck-group-ph03", "LOADS", "carga", AssertionType.FACT, 1.0),
        ("rel-trucks-route", "truck-group-ph03", "route-north", "TRAVELS_VIA", "transita", AssertionType.FACT, 1.0),
        ("rel-route-destination", "route-north", "destination-crusher", "DELIVERS_TO", "entrega", AssertionType.FACT, 1.0),
        ("rel-route-cycle", "route-north", "metric-cycle", "MEASURED_BY", "afecta ciclo", AssertionType.DERIVED, 1.0),
        ("rel-destination-tonnage", "destination-crusher", "metric-tonnage", "CONTRIBUTES_TO", "contribuye", AssertionType.DERIVED, 1.0),
        ("rel-cycle-tonnage", "metric-cycle", "metric-tonnage", "CONSTRAINS", "condiciona", AssertionType.DERIVED, 1.0),
        ("rel-tonnage-plan", "metric-tonnage", "plan-shift", "MEASURED_AGAINST", "contra plan", AssertionType.DERIVED, 1.0),
        ("rel-plan-cost", "plan-shift", "cost-impact", "MAY_AFFECT_COST", "por validar", AssertionType.HYPOTHESIS, 0.35),
    ]
    relationships = [
        FlowRelationship(
            relationship_id=relationship_id,
            source_node_id=source,
            target_node_id=target,
            relationship_type=relationship_type,
            label=label,
            assertion_type=assertion_type,
            effective_from=SCENARIO_START,
            effective_to=None,
            condition=(OperationalCondition.RECOVERING if is_recovering and source != "front-f03" else downstream_condition)
            if is_critical or is_normalized
            else OperationalCondition.NORMAL,
            confidence=confidence if assertion_type is AssertionType.HYPOTHESIS else None,
            impacted=(
                is_critical
                and source != "front-f03"
                and assertion_type is not AssertionType.HYPOTHESIS
            ),
            provenance=DERIVED_PROVENANCE if assertion_type is not AssertionType.FACT else SOURCE_PROVENANCE,
        )
        for relationship_id, source, target, relationship_type, label, assertion_type, confidence in relationship_specs
    ]

    active_event = None
    if not is_stable:
        active_event = FlowEvent(
            event_id="evt-s01-ph03-stop-20260820T1031",
            event_type="LOADING_UNIT_MECHANICAL_STOP",
            title="PH03 detenida",
            severity="CRITICAL" if not is_normalized else "INFORMATIONAL",
            status=("CONFIRMED" if phase == "CRITICAL" else "RECOVERING" if is_recovering else "NORMALIZED"),
            detected_at=EVENT_DETECTED,
            normalized_at=EVENT_NORMALIZED if is_normalized else None,
            primary_node_id="loading-ph03",
            affected_node_ids=[
                node.node_id
                for node in nodes
                if node.node_id != "front-f03" and node.assertion_type is not AssertionType.HYPOTHESIS
            ],
            evidence_ids=[item.evidence_id for item in evidence],
        )

    return OperationalFlowSnapshot(
        tenant_id=tenant_id,
        site_id=site_id,
        shift_id="demo-day-2026-08-20",
        shift_label="DÍA · 07:00–19:00",
        site_timezone="America/Santiago",
        effective_at=effective_at,
        generated_at=effective_at,
        provenance=DERIVED_PROVENANCE,
        data_quality=DataQuality.FRESH,
        scenario="S01",
        scenario_label="Detención mecánica de pala",
        stable_summary="No hay condiciones relevantes en este instante.",
        impact_summary="6 CAEX afectados · propagación operacional visible",
        scenario_moments=[
            FlowMoment(label="Estable", effective_at=SCENARIO_START),
            FlowMoment(label="Evento", effective_at=EVENT_DETECTED),
            FlowMoment(label="Impacto", effective_at=DEFAULT_AT),
            FlowMoment(label="Recuperada", effective_at=EVENT_NORMALIZED),
        ],
        nodes=nodes,
        relationships=relationships,
        evidence=evidence,
        active_event=active_event,
    )
