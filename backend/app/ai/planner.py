from __future__ import annotations

from app.ai import policies
from app.ai.capabilities import CAPABILITY_REGISTRY, CapabilityDefinition, get_capability
from app.ai.investigation_schemas import (
    InvestigationPlan,
    InvestigationScope,
    InvestigationType,
    PlanStep,
    StepRequirement,
    new_id,
)

"""Planner (Etapa 3, seccion 7 del brief).

Construye un PLAN tipado a partir de una plantilla determinística por tipo
de investigacion - no llama al modelo, no consulta datos, no toca la UI.
Solo decide QUE pasos hacen falta, en que orden, y si el rol actual puede
ejecutarlos. La ejecucion real es responsabilidad exclusiva de executor.py.

Las plantillas espejan la seccion 6 del brief (10/9/10/9 pasos por tipo),
adaptadas a las capabilities REALMENTE registradas - un paso cuya capability
no existe en CAPABILITY_REGISTRY nunca se agrega al plan (se declara en
missing_capabilities en su lugar), en vez de fallar silenciosamente despues.
"""

_TEMPLATES: dict[InvestigationType, list[tuple[str, str, StepRequirement]]] = {
    InvestigationType.PRODUCTION_DROP: [
        ("get_production_kpis", "Obtener produccion real y plan, y determinar magnitud/periodo de la desviacion", "required"),
        ("get_loading_performance", "Revisar rendimiento de carguio", "required"),
        ("get_fleet_status", "Revisar estado y disponibilidad de flota", "required"),
        ("get_alerts", "Revisar alertas relacionadas", "required"),
        ("get_data_quality_status", "Validar calidad y frescura de los datos", "required"),
        ("navigate_production", "Mostrar Produccion", "optional"),
        ("focus_production_chart", "Enfocar el grafico de toneladas por hora", "optional"),
        ("navigate_loading", "Mostrar Carguio", "optional"),
        ("focus_loading_chart", "Enfocar la tasa de carguio", "optional"),
        ("navigate_breakdowns", "Mostrar Averias", "optional"),
        ("focus_breakdowns_list", "Enfocar averias activas", "optional"),
        ("navigate_comparison", "Comparar con el turno anterior", "optional"),
    ],
    InvestigationType.CYCLE_TIME_INCREASE: [
        ("get_production_kpis", "Obtener ritmo actual/requerido como proxy de tiempo de ciclo (no hay tool dedicada de ciclo puro)", "required"),
        ("get_fleet_status", "Revisar flota", "required"),
        ("get_alerts", "Revisar averias y alertas asociadas", "required"),
        ("get_data_quality_status", "Validar calidad de datos", "required"),
        ("navigate_production", "Mostrar Produccion", "optional"),
        ("focus_production_chart", "Enfocar tendencia horaria", "optional"),
        ("navigate_fleet", "Mostrar Flota", "optional"),
        ("open_affected_equipment", "Abrir el equipo mas afectado", "optional"),
        ("navigate_breakdowns", "Mostrar Averias", "optional"),
        ("focus_breakdowns_list", "Enfocar averias activas", "optional"),
    ],
    InvestigationType.LOADING_UNIT_UNDERPERFORMANCE: [
        ("get_loading_performance", "Obtener rendimiento actual de la unidad de carguio y comparar con el promedio de flota", "required"),
        ("get_fleet_status", "Revisar disponibilidad/utilizacion de camiones asociados", "required"),
        ("get_alerts", "Revisar averias y alertas de la unidad", "required"),
        ("get_data_quality_status", "Validar calidad de datos", "required"),
        ("navigate_loading", "Mostrar Carguio", "optional"),
        ("focus_loading_chart", "Enfocar la tasa de carguio por pala", "optional"),
        ("navigate_breakdowns", "Mostrar Averias", "optional"),
        ("focus_breakdowns_list", "Enfocar averias activas", "optional"),
    ],
    InvestigationType.SHIFT_SUMMARY: [
        ("get_current_shift_summary", "Obtener resumen de turno", "required"),
        ("get_production_kpis", "Produccion y cumplimiento", "required"),
        ("get_loading_performance", "Carguio", "required"),
        ("get_fleet_status", "Flota", "required"),
        ("get_alerts", "Averias, demoras y alertas", "required"),
        ("get_data_quality_status", "Calidad de datos", "required"),
    ],
}

_GOALS: dict[InvestigationType, str] = {
    InvestigationType.PRODUCTION_DROP: "Investigar caída de producción",
    InvestigationType.CYCLE_TIME_INCREASE: "Investigar aumento del tiempo de ciclo",
    InvestigationType.LOADING_UNIT_UNDERPERFORMANCE: "Investigar bajo rendimiento de una unidad de carguío",
    InvestigationType.SHIFT_SUMMARY: "Generar resumen de turno",
}


class PlannerRejection(Exception):
    """Solicitud fuera del alcance de las 4 investigaciones soportadas."""


def build_plan(investigation_type: InvestigationType, scope: InvestigationScope, role: str) -> InvestigationPlan:
    template = _TEMPLATES.get(investigation_type)
    if template is None:
        raise PlannerRejection(investigation_type)

    steps: list[PlanStep] = []
    missing: list[str] = []

    for capability_id, description, requirement in template:
        capability = get_capability(capability_id)
        if capability is None:
            # La capability no esta registrada: se declara faltante, nunca
            # se agrega un paso fantasma que el Executor no podria resolver.
            missing.append(f"{capability_id} (no registrada en el Capability Registry)")
            continue
        if capability.kind == "backend_tool" and not policies.is_tool_allowed(role, capability.id):
            missing.append(f"{capability_id} (rol '{role}' sin permiso)")
            continue
        steps.append(
            PlanStep(
                step_id=new_id("step"),
                kind="tool" if capability.kind == "backend_tool" else "ui_action",
                capability_id=capability.id,
                description=description,
                requirement=requirement,
            )
        )

    return InvestigationPlan(
        investigation_id=new_id("inv"),
        type=investigation_type,
        goal=_GOALS[investigation_type],
        scope=scope,
        steps=steps,
        missing_capabilities=missing,
    )


def capability_for_step(step: PlanStep) -> CapabilityDefinition | None:
    return CAPABILITY_REGISTRY.get(step.capability_id)
