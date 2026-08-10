from __future__ import annotations

import re
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator

ResponseType = Literal[
    "observation",
    "finding",
    "risk",
    "recommendation",
    "simulation",
    "draft",
    "pending_action",
    "information_insufficient",
    "error",
]

ConfidenceLevel = Literal["alta", "media", "baja", "insuficiente"]
FreshnessStatus = Literal["current", "stale", "unknown"]
TaskStatus = Literal["draft", "pending_approval", "approved", "rejected", "completed"]
ReportStatus = Literal["draft", "approved", "discarded"]
ChartType = Literal[
    "bar", "line", "area", "pie", "donut", "scatter", "heatmap", "gauge", "pareto", "table", "kpi_cards", "timeline",
]

# El modelo nunca decide roles/permisos: esta lista es la unica fuente de
# verdad de que "tipo" acepta el endpoint de chat, ver app/ai/policies.py.
_DANGEROUS_SUBSTRINGS = ("<script", "javascript:", "{{", "}}")


class ChatContext(BaseModel):
    """Contexto visible del usuario en el momento de preguntar.

    Nunca se mezcla automaticamente entre faenas/turnos/periodos: el
    orquestador solo consulta con estos valores, no con "todo lo disponible".

    Los campos agregados abajo (route, active_section, ...) amplian esto
    hacia un ApplicationContext real (percepcion Nivel 1 del agente) sin
    romper compatibilidad: todos son opcionales y el /chat original sigue
    funcionando si el cliente no los envia.
    """

    section: str | None = Field(default=None, max_length=60)
    mine: str | None = Field(default=None, max_length=80)
    shift: str | None = Field(default=None, max_length=20)
    selected_date: str | None = Field(default=None, max_length=10)
    filters: dict[str, str] = Field(default_factory=dict)

    # Percepcion Nivel 1 (estado semantico de la app) - ver navigation.py.
    route: str | None = Field(default=None, max_length=120)
    active_section: str | None = Field(default=None, max_length=60)
    selected_equipment_ids: list[str] = Field(default_factory=list, max_length=20)
    focused_widget: str | None = Field(default=None, max_length=80)
    visible_kpis: list[str] = Field(default_factory=list, max_length=20)
    visible_alerts: list[str] = Field(default_factory=list, max_length=20)
    permissions: list[str] = Field(default_factory=list, max_length=30)

    @field_validator("filters")
    @classmethod
    def _bounded_filters(cls, value: dict[str, str]) -> dict[str, str]:
        if len(value) > 20:
            raise ValueError("Demasiados filtros en el contexto")
        for key, val in value.items():
            if len(str(key)) > 50 or len(str(val)) > 200:
                raise ValueError("Filtro de contexto invalido")
        return value


class ChatHistoryItem(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=2000)


class ChatRequest(BaseModel):
    conversation_id: str | None = Field(default=None, max_length=64)
    message: str = Field(min_length=1, max_length=2000)
    context: ChatContext = Field(default_factory=ChatContext)
    history: list[ChatHistoryItem] = Field(default_factory=list, max_length=10)

    @field_validator("message")
    @classmethod
    def _sanitize_message(cls, value: str) -> str:
        lowered = value.lower()
        if any(token in lowered for token in _DANGEROUS_SUBSTRINGS):
            raise ValueError("Mensaje contiene contenido no permitido")
        return value.strip()


class Evidence(BaseModel):
    source: str
    metric: str | None = None
    period: str | None = None
    value: str | None = None
    detail: str
    tool: str | None = None
    generated_at: str | None = None


class ConfidenceInfo(BaseModel):
    level: ConfidenceLevel
    reasons: list[str] = Field(default_factory=list)


class DataFreshness(BaseModel):
    last_updated_at: str | None = None
    status: FreshnessStatus = "unknown"
    age_minutes: int | None = None


class ChartSpec(BaseModel):
    chart_type: ChartType
    title: str
    x_field: str | None = None
    y_field: str | None = None
    unit: str | None = None
    data: list[dict[str, Any]] = Field(default_factory=list, max_length=60)
    source_tool: str | None = None


class TaskDraft(BaseModel):
    id: str
    title: str
    reason: str
    evidence: list[str] = Field(default_factory=list)
    priority: Literal["baja", "media", "alta"] = "media"
    suggested_owner: str | None = None
    status: TaskStatus = "draft"
    linked_finding: str | None = None
    created_by: str | None = None
    created_at: str | None = None


class ReportDraft(BaseModel):
    id: str
    kind: str
    title: str
    sections: dict[str, str] = Field(default_factory=dict)
    status: ReportStatus = "draft"
    created_by: str | None = None
    created_at: str | None = None


class ToolExecution(BaseModel):
    name: str
    args: dict[str, Any] = Field(default_factory=dict)
    status: Literal["ok", "error", "denied"]
    duration_ms: int = 0
    summary: str | None = None


# ── Acciones semanticas de UI (Etapa 2 base) ─────────────────────────────────
# Nunca coordenadas de mouse: el agente propone una accion tipada, el backend
# la valida (navigation.py/policies.py) y el frontend la ejecuta contra el
# store/router reales. Lo que no valida se descarta antes de llegar al
# cliente, ver orchestrator.py::_validate_ui_actions.

class NavigateAction(BaseModel):
    action: Literal["navigate"] = "navigate"
    route: str = Field(max_length=80)


class SetFilterAction(BaseModel):
    action: Literal["set_filter"] = "set_filter"
    filter_id: Literal["shift", "start_date", "end_date", "equipo"]
    value: str = Field(max_length=40)


class ClearFilterAction(BaseModel):
    action: Literal["clear_filter"] = "clear_filter"
    filter_id: Literal["shift", "start_date", "end_date", "equipo"] | None = None


AgentEntityType = Literal["equipment", "loading_unit", "alert", "report", "task", "operator", "breakdown"]


class SelectEntityAction(BaseModel):
    action: Literal["select_entity"] = "select_entity"
    entity_type: AgentEntityType
    entity_id: str = Field(max_length=40)


class OpenEntityAction(BaseModel):
    action: Literal["open_entity"] = "open_entity"
    entity_type: AgentEntityType
    entity_id: str = Field(max_length=40)


class FocusWidgetAction(BaseModel):
    action: Literal["focus_widget"] = "focus_widget"
    widget_id: str = Field(max_length=80)


UIAction = (
    NavigateAction | SetFilterAction | ClearFilterAction | SelectEntityAction | OpenEntityAction | FocusWidgetAction
)

# Riesgo de cada accion (seccion 18 del brief) - unica fuente de verdad,
# consumida por policies.py y expuesta al frontend para que el overlay
# muestre "aplicando..." (automatica) vs. pedir confirmacion.
UI_ACTION_RISK: dict[str, str] = {
    "navigate": "NAVIGATE",
    "focus_widget": "NAVIGATE",
    "set_filter": "CONFIGURE_VIEW",
    "clear_filter": "CONFIGURE_VIEW",
    "select_entity": "CONFIGURE_VIEW",
    "open_entity": "CONFIGURE_VIEW",
}


DISCLAIMER = (
    "NORTHMINE Intelligence Copilot entrega analisis y recomendaciones basadas "
    "en los datos disponibles. La validacion y decision operacional final "
    "corresponde al usuario autorizado."
)


class CopilotResponse(BaseModel):
    message: str
    response_type: ResponseType
    facts: list[str] = Field(default_factory=list)
    calculations: list[str] = Field(default_factory=list)
    inferences: list[str] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)
    evidence: list[Evidence] = Field(default_factory=list)
    chart_specs: list[ChartSpec] = Field(default_factory=list)
    task_drafts: list[TaskDraft] = Field(default_factory=list)
    report_drafts: list[ReportDraft] = Field(default_factory=list)
    ui_actions: list[UIAction] = Field(default_factory=list)
    confidence: ConfidenceInfo
    data_freshness: DataFreshness
    requires_human_approval: bool = True
    limitations: list[str] = Field(default_factory=list)
    tool_executions: list[ToolExecution] = Field(default_factory=list)
    disclaimer: str = DISCLAIMER
    degraded: bool = False
    conversation_id: str


class TaskActionRequest(BaseModel):
    actor_note: str | None = Field(default=None, max_length=500)


class FeedbackRequest(BaseModel):
    message_id: str = Field(max_length=64)
    rating: Literal["util", "no_util", "correcta", "incorrecta", "incompleta", "riesgosa", "desactualizada"]
    note: str | None = Field(default=None, max_length=500)

    @field_validator("note")
    @classmethod
    def _clean_note(cls, value: str | None) -> str | None:
        if value and re.search(r"[<>{}]", value):
            raise ValueError("Nota de feedback contiene caracteres no permitidos")
        return value
