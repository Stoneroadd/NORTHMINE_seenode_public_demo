from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal

from app.ai.investigation_schemas import InvestigationType

"""Capability Registry (Etapa 3, seccion 5 del brief).

Fuente unica de lo que el Planner puede usar. Combina dos mundos
complementarios (seccion "Arquitectura recomendada" del prompt de Etapa 3):

- backend_tool: consulta/calcula/compara/valida datos - fuente analitica
  principal, reusa TOOL_REGISTRY de tools.py (Etapa 1), sin duplicar logica.
- ui_action: navegar/enfocar/mostrar - solo hace visible la investigacion,
  nunca sustituye una tool cuando existe una fuente analitica mas confiable
  (seccion 14). Ninguna investigacion depende de un paso ui_action para
  llegar a una conclusion: son 'optional', el Planner elige la alternativa
  backend cuando el widget no esta disponible (seccion 15).
"""

CapabilityKind = Literal["backend_tool", "ui_action"]
RiskLevel = Literal["READ", "NAVIGATE", "CONFIGURE_VIEW"]


@dataclass(frozen=True)
class CapabilityDefinition:
    id: str
    kind: CapabilityKind
    investigation_types: tuple[InvestigationType, ...]
    read_only: bool
    required_role: Literal["viewer", "operador", "supervisor", "admin"]
    timeout_seconds: int
    module_id: str | None = None
    widget_id: str | None = None
    depends_on: tuple[str, ...] = field(default_factory=tuple)
    description: str = ""


IT = InvestigationType

CAPABILITY_REGISTRY: dict[str, CapabilityDefinition] = {
    # ── Backend tools (Etapa 1, reusadas tal cual - ver tools.py) ────────
    "get_current_shift_summary": CapabilityDefinition(
        id="get_current_shift_summary",
        kind="backend_tool",
        investigation_types=(IT.SHIFT_SUMMARY, IT.PRODUCTION_DROP),
        read_only=True,
        required_role="viewer",
        timeout_seconds=10,
        description="Resumen de turno: toneladas, meta, cumplimiento, equipos activos.",
    ),
    "get_production_kpis": CapabilityDefinition(
        id="get_production_kpis",
        kind="backend_tool",
        investigation_types=(IT.PRODUCTION_DROP, IT.CYCLE_TIME_INCREASE, IT.SHIFT_SUMMARY),
        read_only=True,
        required_role="viewer",
        timeout_seconds=10,
        description="Produccion real vs plan, ritmo actual/requerido, tendencia por hora.",
    ),
    "get_fleet_status": CapabilityDefinition(
        id="get_fleet_status",
        kind="backend_tool",
        investigation_types=(IT.PRODUCTION_DROP, IT.CYCLE_TIME_INCREASE, IT.SHIFT_SUMMARY),
        read_only=True,
        required_role="viewer",
        timeout_seconds=10,
        description="Disponibilidad/utilizacion de flota CAEX.",
    ),
    "get_loading_performance": CapabilityDefinition(
        id="get_loading_performance",
        kind="backend_tool",
        investigation_types=(IT.PRODUCTION_DROP, IT.LOADING_UNIT_UNDERPERFORMANCE, IT.SHIFT_SUMMARY),
        read_only=True,
        required_role="viewer",
        timeout_seconds=10,
        description="Tasa de carguio, camiones atendidos y variacion por unidad de carguio.",
    ),
    "get_alerts": CapabilityDefinition(
        id="get_alerts",
        kind="backend_tool",
        investigation_types=(IT.PRODUCTION_DROP, IT.CYCLE_TIME_INCREASE, IT.LOADING_UNIT_UNDERPERFORMANCE, IT.SHIFT_SUMMARY),
        read_only=True,
        required_role="viewer",
        timeout_seconds=10,
        description="Alertas operacionales activas por severidad.",
    ),
    "get_data_quality_status": CapabilityDefinition(
        id="get_data_quality_status",
        kind="backend_tool",
        investigation_types=(IT.PRODUCTION_DROP, IT.CYCLE_TIME_INCREASE, IT.LOADING_UNIT_UNDERPERFORMANCE, IT.SHIFT_SUMMARY),
        read_only=True,
        required_role="viewer",
        timeout_seconds=10,
        description="Completitud, frescura y estado de cache del dataset operacional.",
    ),
    # ── Acciones UI (Etapa 2/2.5, solo visibilidad - nunca bloquean) ─────
    "navigate_production": CapabilityDefinition(
        id="navigate_production", kind="ui_action", investigation_types=(IT.PRODUCTION_DROP, IT.CYCLE_TIME_INCREASE),
        read_only=True, required_role="viewer", timeout_seconds=3, module_id="produccion",
        description="Navega a Produccion para mostrar la desviacion.",
    ),
    "focus_production_chart": CapabilityDefinition(
        id="focus_production_chart", kind="ui_action", investigation_types=(IT.PRODUCTION_DROP, IT.CYCLE_TIME_INCREASE),
        read_only=True, required_role="viewer", timeout_seconds=3, module_id="produccion", widget_id="production-hourly-chart",
        depends_on=("navigate_production",),
        description="Enfoca el grafico de toneladas por hora.",
    ),
    "navigate_loading": CapabilityDefinition(
        id="navigate_loading", kind="ui_action", investigation_types=(IT.PRODUCTION_DROP, IT.LOADING_UNIT_UNDERPERFORMANCE),
        read_only=True, required_role="viewer", timeout_seconds=3, module_id="carguio",
        description="Navega a Carguio.",
    ),
    "focus_loading_chart": CapabilityDefinition(
        id="focus_loading_chart", kind="ui_action", investigation_types=(IT.PRODUCTION_DROP, IT.LOADING_UNIT_UNDERPERFORMANCE),
        read_only=True, required_role="viewer", timeout_seconds=3, module_id="carguio", widget_id="loading-rate-chart",
        depends_on=("navigate_loading",),
        description="Enfoca la tasa de carguio por pala.",
    ),
    "navigate_fleet": CapabilityDefinition(
        id="navigate_fleet", kind="ui_action", investigation_types=(IT.PRODUCTION_DROP, IT.CYCLE_TIME_INCREASE),
        read_only=True, required_role="viewer", timeout_seconds=3, module_id="flota",
        description="Navega a Flota.",
    ),
    "open_affected_equipment": CapabilityDefinition(
        id="open_affected_equipment", kind="ui_action", investigation_types=(IT.PRODUCTION_DROP, IT.CYCLE_TIME_INCREASE),
        read_only=True, required_role="viewer", timeout_seconds=3, module_id="flota",
        depends_on=("navigate_fleet",),
        description="Abre el detalle del equipo mas relevante encontrado.",
    ),
    "navigate_breakdowns": CapabilityDefinition(
        id="navigate_breakdowns", kind="ui_action", investigation_types=(IT.PRODUCTION_DROP, IT.CYCLE_TIME_INCREASE, IT.LOADING_UNIT_UNDERPERFORMANCE),
        read_only=True, required_role="viewer", timeout_seconds=3, module_id="averias",
        description="Navega a Averias.",
    ),
    "focus_breakdowns_list": CapabilityDefinition(
        id="focus_breakdowns_list", kind="ui_action", investigation_types=(IT.PRODUCTION_DROP, IT.CYCLE_TIME_INCREASE, IT.LOADING_UNIT_UNDERPERFORMANCE),
        read_only=True, required_role="viewer", timeout_seconds=3, module_id="averias", widget_id="breakdown-active-list",
        depends_on=("navigate_breakdowns",),
        description="Enfoca la lista de averias activas.",
    ),
    "navigate_comparison": CapabilityDefinition(
        id="navigate_comparison", kind="ui_action", investigation_types=(IT.PRODUCTION_DROP,),
        read_only=True, required_role="viewer", timeout_seconds=3, module_id="comparativa",
        description="Navega a Comparativa contra el periodo anterior.",
    ),
}


def capabilities_for(investigation_type: InvestigationType) -> list[CapabilityDefinition]:
    return [c for c in CAPABILITY_REGISTRY.values() if investigation_type in c.investigation_types]


def get_capability(capability_id: str) -> CapabilityDefinition | None:
    return CAPABILITY_REGISTRY.get(capability_id)
