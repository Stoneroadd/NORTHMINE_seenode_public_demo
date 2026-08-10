from __future__ import annotations

import json
import logging
import re
import time
import uuid
from datetime import datetime
from typing import Any

from app.ai import navigation, policies, repository
from app.ai.providers import AIProvider, LocalOperationalProvider, ProviderError, get_provider
from app.ai.schemas import (
    ChartSpec,
    ChatContext,
    ClearFilterAction,
    ConfidenceInfo,
    CopilotResponse,
    DataFreshness,
    Evidence,
    FocusWidgetAction,
    NavigateAction,
    OpenEntityAction,
    ReportDraft,
    SelectEntityAction,
    SetFilterAction,
    TaskDraft,
    ToolExecution,
    UI_ACTION_RISK,
)
from app.ai.tools import TOOL_REGISTRY, anthropic_tool_specs
from app.core.config import Settings, get_settings
from pydantic import ValidationError

logger = logging.getLogger("northmine.ai")

MAX_TOOL_ITERATIONS = 4
_CONFIDENCE_ORDER = {"alta": 3, "media": 2, "baja": 1, "insuficiente": 0}
_FRESHNESS_ORDER = {"current": 2, "unknown": 1, "stale": 0}
_CHART_KEYWORDS = ("grafico", "gráfico", "grafica", "gráfica", "chart", "visualiza", "graficar")

EMIT_RESPONSE_TOOL: dict[str, Any] = {
    "name": "emit_response",
    "description": (
        "Entrega la respuesta final estructurada al usuario. Debes terminar "
        "SIEMPRE llamando esta herramienta exactamente una vez; nunca "
        "respondas solo con texto libre."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "message": {
                "type": "string",
                "description": "Respuesta en español, sin markdown ni asteriscos, para leer directo en la interfaz.",
            },
            "response_type": {
                "type": "string",
                "enum": [
                    "observation", "finding", "risk", "recommendation", "simulation",
                    "draft", "pending_action", "information_insufficient", "error",
                ],
            },
            "facts": {"type": "array", "items": {"type": "string"}, "description": "Hechos comprobados a partir de las herramientas consultadas."},
            "inferences": {"type": "array", "items": {"type": "string"}, "description": "Hipotesis razonadas, marcadas como tales, nunca como hechos."},
            "recommendations": {"type": "array", "items": {"type": "string"}},
            "limitations": {"type": "array", "items": {"type": "string"}, "description": "Que datos faltan o que no se pudo verificar."},
            "requires_human_approval": {"type": "boolean"},
            "propose_task": {
                "type": "object",
                "description": "Solo incluir si corresponde proponer una tarea operacional concreta para evaluacion humana.",
                "properties": {
                    "title": {"type": "string"},
                    "reason": {"type": "string"},
                    "priority": {"type": "string", "enum": ["baja", "media", "alta"]},
                    "suggested_owner": {"type": "string"},
                },
                "required": ["title", "reason"],
            },
            "propose_report": {
                "type": "object",
                "description": "Incluir cuando el usuario pide generar un reporte o informe descargable.",
                "properties": {
                    "kind": {"type": "string"},
                    "title": {"type": "string"},
                    "sections": {
                        "type": "object",
                        "additionalProperties": {"type": "string"},
                        "description": "Secciones del reporte basadas exclusivamente en la evidencia consultada.",
                    },
                },
                "required": ["title", "sections"],
            },
            "ui_actions": {
                "type": "array",
                "description": (
                    "Acciones de interfaz a ejecutar (navegar, filtrar, seleccionar equipo, "
                    "enfocar un widget). Solo incluir si el usuario pidio ver/abrir/filtrar algo "
                    "concreto. Cada accion se valida en el backend; una accion invalida o fuera "
                    "de rol se descarta silenciosamente, asi que nunca prometas en 'message' algo "
                    "que la accion no vaya a lograr con certeza."
                ),
                "items": {
                    "type": "object",
                    "properties": {
                        "action": {
                            "type": "string",
                            "enum": ["navigate", "set_filter", "clear_filter", "select_entity", "open_entity", "focus_widget"],
                        },
                        "route": {"type": "string", "description": "Para 'navigate': seccion o ruta, ej. 'produccion' o '/produccion'."},
                        "filter_id": {"type": "string", "enum": ["shift", "start_date", "end_date", "equipo"]},
                        "value": {"type": "string", "description": "Para 'set_filter'."},
                        "entity_type": {
                            "type": "string",
                            "enum": ["equipment", "loading_unit", "alert", "report", "task", "operator", "breakdown"],
                        },
                        "entity_id": {
                            "type": "string",
                            "description": "ID real de la entidad (no un alias en lenguaje natural como 'Pala 03' - eso lo resuelve el frontend antes de ejecutar).",
                        },
                        "widget_id": {"type": "string"},
                    },
                    "required": ["action"],
                },
            },
        },
        "required": ["message", "response_type", "facts", "recommendations", "limitations", "requires_human_approval"],
    },
}


def _build_system_prompt(role: str, context: ChatContext, allowed_tools: frozenset[str]) -> str:
    now = datetime.now().isoformat(timespec="minutes")
    context_lines = [
        f"Faena: {context.mine or 'MINA CHILE DEMO'}",
        f"Seccion/modulo actual del usuario: {context.section or 'no especificado'}",
        f"Turno filtrado: {context.shift or 'no especificado'}",
        f"Fecha filtrada: {context.selected_date or 'no especificada'}",
        f"Rol del usuario: {role}",
        f"Hora del sistema: {now}",
    ]
    if context.filters:
        context_lines.append(f"Filtros adicionales activos: {json.dumps(context.filters, ensure_ascii=False)}")
    tools_note = (
        ", ".join(sorted(allowed_tools))
        if allowed_tools
        else "ninguna (este rol no tiene herramientas de datos habilitadas)"
    )
    return (
        "Eres NORTHMINE Intelligence Copilot, un sistema de APOYO a la decision "
        "para una operacion minera a rajo abierto. Nunca eres la autoridad final "
        "y nunca ejecutas decisiones operacionales por tu cuenta. La decision "
        "final siempre pertenece a una persona autorizada.\n\n"
        "Reglas obligatorias:\n"
        "- Responde siempre en español, sin markdown, sin asteriscos, tecnico y conciso.\n"
        "- Solo puedes usar las herramientas listadas abajo para obtener datos. "
        "Nunca inventes cifras, nombres de equipos ni fechas: si no tienes el dato, dilo explicitamente.\n"
        "- Diferencia siempre hecho comprobado, calculo, inferencia, hipotesis y recomendacion; "
        "nunca presentes una inferencia como si fuera un hecho.\n"
        "- No uses frases de autoridad como 'he decidido', 'debes hacer esto inmediatamente', "
        "'la accion correcta es' o 'garantizo que'. Usa en su lugar 'los datos sugieren', "
        "'se recomienda evaluar', 'una accion posible es', 'esta conclusion requiere validacion'.\n"
        "- Si los datos son insuficientes o estan desactualizados, dilo antes de recomendar nada.\n"
        "- No mezcles datos de otra faena, turno o periodo distinto al contexto entregado.\n"
        "- Cuando corresponda proponer una tarea operacional, propon SOLO un borrador para "
        "revision humana; nunca la des por asignada, aprobada ni ejecutada.\n\n"
        f"Herramientas disponibles para este rol: {tools_note}.\n\n"
        "Contexto visible del usuario:\n" + "\n".join(f"- {line}" for line in context_lines)
    )


def _summarize_tool_result(name: str, result: dict[str, Any]) -> str:
    try:
        if name == "get_current_shift_summary":
            return (
                f"Turno {result['turno']} ({result['fecha']}): {result['toneladas_turno']:,} t "
                f"vs meta {result['meta_turno']:,} t ({result['cumplimiento_pct']}%), "
                f"{result['caex_activos']} CAEX activos."
            )
        if name == "get_production_kpis":
            return (
                f"Cumplimiento {result['cumplimiento_pct']}%, brecha {result['brecha_ton']:,} t, "
                f"ritmo actual {result['ritmo_actual_tph']} t/h, tendencia {result['tendencia']}."
            )
        if name == "get_fleet_status":
            return (
                f"{result['equipos_activos']}/{result['total_equipos']} CAEX activos, "
                f"utilizacion {result['utilizacion_pct']}%, disponibilidad {result['disponibilidad_pct']}%."
            )
        if name == "get_alerts":
            counts = result.get("counts", {})
            return f"{result['count']} alertas ({counts.get('CRITICA', 0)} criticas, {counts.get('ALTA', 0)} altas)."
        if name == "get_data_quality_status":
            return f"Calidad de dato {result['score']}/100, estado {result['status']}."
    except Exception:  # pragma: no cover - defensivo, nunca debe tumbar la respuesta
        pass
    return json.dumps(result, default=str)[:180]


def _combine_confidence(entries: list[dict[str, Any]]) -> ConfidenceInfo:
    if not entries:
        return ConfidenceInfo(level="insuficiente", reasons=["No se consultaron datos operacionales para esta respuesta."])
    worst = min(entries, key=lambda item: _CONFIDENCE_ORDER.get(item.get("level"), 0))
    reasons: list[str] = []
    for entry in entries:
        for reason in entry.get("reasons", []):
            if reason not in reasons:
                reasons.append(reason)
    return ConfidenceInfo(level=worst.get("level", "baja"), reasons=reasons[:5])


def _combine_freshness(entries: list[dict[str, Any]]) -> DataFreshness:
    if not entries:
        return DataFreshness(status="unknown")
    worst = min(entries, key=lambda item: _FRESHNESS_ORDER.get(item.get("status"), 1))
    return DataFreshness(**worst)


def _maybe_build_chart(message: str, tool_outputs: list[tuple[str, dict[str, Any], dict[str, Any]]]) -> list[ChartSpec]:
    if not any(keyword in message.lower() for keyword in _CHART_KEYWORDS):
        return []
    for name, _args, result in tool_outputs:
        if name == "get_production_kpis" and result.get("toneladas_por_hora"):
            rows = [{"hora": row["hora"], "toneladas": row["toneladas"]} for row in result["toneladas_por_hora"]]
            return [ChartSpec(chart_type="bar", title="Toneladas por hora - turno actual", x_field="hora", y_field="toneladas", unit="t", data=rows[:24], source_tool=name)]
        if name == "get_fleet_status" and result.get("equipos"):
            rows = [{"caex_id": item["caex_id"], "toneladas": item.get("toneladas", 0)} for item in result["equipos"]]
            return [ChartSpec(chart_type="bar", title="Toneladas por CAEX", x_field="caex_id", y_field="toneladas", unit="t", data=rows[:20], source_tool=name)]
        if name == "get_alerts" and result.get("counts"):
            rows = [{"severidad": key, "cantidad": value} for key, value in result["counts"].items()]
            return [ChartSpec(chart_type="bar", title="Alertas por severidad", x_field="severidad", y_field="cantidad", unit="alertas", data=rows, source_tool=name)]
    return []


_VALID_SHIFT_VALUES = {"DIA", "NOCHE", "TODOS", "AMBOS", "ACTUAL"}
_DATE_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}$")
_ENTITY_ID_PATTERN = re.compile(r"^[A-Za-z0-9_\-]{1,40}$")


def _is_valid_entity_id(entity_id: str) -> bool:
    """Seccion 11: 'Entity ID o formato' se valida en el backend. El
    resolver de alias (frontend) ya convierte texto libre a un ID real
    antes de llegar aca - esto solo rechaza formato imposible/inyeccion,
    no confirma que la entidad EXISTA (eso lo hace el modulo real que la
    abre, contra su propio dataset)."""
    return bool(_ENTITY_ID_PATTERN.match(entity_id.strip()))


def _is_valid_filter_value(filter_id: Any, value: str) -> bool:
    """Seccion 15: 'Valor valido' se valida en el backend, no solo en el
    frontend - defensa en profundidad, el frontend hace su propia
    normalizacion/validacion tambien antes de aplicar el filtro."""
    if filter_id == "shift":
        return value.strip().upper() in _VALID_SHIFT_VALUES
    if filter_id in ("start_date", "end_date"):
        return bool(_DATE_PATTERN.match(value.strip()))
    if filter_id == "equipo":
        return 0 < len(value.strip()) <= 40
    return False


def _validate_ui_actions(raw_actions: Any, role: str) -> list[Any]:
    """Filtra las acciones que el modelo propuso contra navigation.py/policies.py.

    Nunca se confia en lo que el modelo mando: una accion mal formada, con un
    filtro fuera de la lista cerrada, apuntando a una seccion restringida
    para el rol actual, o de riesgo CRITICAL, se descarta en silencio (no
    rompe la respuesta) y queda fuera de lo que el frontend puede ejecutar.
    """
    if not isinstance(raw_actions, list):
        return []
    validated: list[Any] = []
    for item in raw_actions[:5]:
        if not isinstance(item, dict):
            continue
        action_name = item.get("action")
        risk = UI_ACTION_RISK.get(str(action_name), "CRITICAL")
        if policies.is_risk_prohibited(risk):
            continue
        try:
            if action_name == "navigate":
                route = str(item.get("route") or "")
                if not navigation.is_navigation_allowed(route, role):
                    continue
                validated.append(NavigateAction(route=route))
            elif action_name == "set_filter":
                filter_id = item.get("filter_id")
                value = str(item.get("value") or "")
                if not _is_valid_filter_value(filter_id, value):
                    continue
                validated.append(SetFilterAction(filter_id=filter_id, value=value))
            elif action_name == "clear_filter":
                validated.append(ClearFilterAction(filter_id=item.get("filter_id")))
            elif action_name == "select_entity":
                entity_id = str(item.get("entity_id") or "")
                if not _is_valid_entity_id(entity_id):
                    continue
                validated.append(SelectEntityAction(entity_type=item.get("entity_type"), entity_id=entity_id))
            elif action_name == "open_entity":
                entity_id = str(item.get("entity_id") or "")
                if not _is_valid_entity_id(entity_id):
                    continue
                validated.append(OpenEntityAction(entity_type=item.get("entity_type"), entity_id=entity_id))
            elif action_name == "focus_widget":
                widget_id = str(item.get("widget_id") or "")
                if not navigation.is_widget_known(widget_id):
                    continue
                validated.append(FocusWidgetAction(widget_id=widget_id))
        except ValidationError:
            continue
    return validated


def _degraded_response(conversation_id: str, reason: str) -> CopilotResponse:
    return CopilotResponse(
        message=policies.DEGRADED_MODE_NOTICE,
        response_type="information_insufficient",
        limitations=[reason],
        confidence=ConfidenceInfo(level="insuficiente", reasons=[reason]),
        data_freshness=DataFreshness(status="unknown"),
        requires_human_approval=False,
        degraded=True,
        conversation_id=conversation_id,
    )


def _normalized(text: str) -> str:
    import unicodedata

    return "".join(
        character for character in unicodedata.normalize("NFKD", text.lower())
        if not unicodedata.combining(character)
    )


def _local_tool_plan(message: str, allowed_tools: frozenset[str]) -> list[str]:
    text = _normalized(message)
    wants_report = any(word in text for word in ("reporte", "informe", "pdf"))
    wants_analysis = any(word in text for word in ("analiza", "analisis", "diagnostica", "que esta pasando"))
    planned: list[str] = []
    rules = (
        ("get_current_shift_summary", ("turno", "resumen", "estado", "analiza", "hola", "jarvis")),
        ("get_production_kpis", ("produccion", "plan", "brecha", "ritmo", "tonel", "proyeccion", "grafico")),
        ("get_fleet_status", ("flota", "equipo", "caex", "camion", "rendimiento", "disponibilidad")),
        ("get_alerts", ("alerta", "riesgo", "critica", "problema", "anomalo", "anormal")),
        ("get_data_quality_status", ("calidad", "dato", "fuente", "actualiz", "analiza")),
    )
    for name, keywords in rules:
        if name in allowed_tools and (wants_report or wants_analysis or any(keyword in text for keyword in keywords)):
            planned.append(name)
    if not planned and "get_current_shift_summary" in allowed_tools:
        planned.append("get_current_shift_summary")
    return planned


def _local_ui_actions(message: str, role: str) -> list[Any]:
    text = _normalized(message)
    if not any(verb in text for verb in ("abre", "ir a", "llevame", "muevete", "muestra", "navega")):
        return []
    routes = (
        (("reporte", "informe"), "reportes"),
        (("produccion",), "produccion"),
        (("flota", "equipos", "caex"), "flota"),
        (("alerta", "riesgo"), "alertas"),
        (("turno",), "turno"),
        (("carguio", "pala"), "carguio"),
        (("averia", "mantencion"), "averias"),
        (("rendimiento",), "rendimiento"),
        (("comparativa", "comparar"), "comparativa"),
        (("simulador", "simular"), "simulador"),
        (("cockpit", "centro de decision"), "cockpit"),
        (("resumen", "dashboard"), "dashboard"),
    )
    for keywords, route in routes:
        if any(keyword in text for keyword in keywords):
            return _validate_ui_actions([{"action": "navigate", "route": route}], role)
    return []


def _run_local_operational_turn(
    *, user: dict[str, Any], message: str, context: ChatContext, conversation_id: str,
    allowed_tools: frozenset[str], history: list[dict[str, str]],
) -> tuple[CopilotResponse, list[str]]:
    normalized_message = _normalized(message)
    asks_about_agent = any(
        phrase in normalized_message
        for phrase in (
            "de donde saca los datos",
            "de donde vienen los datos",
            "como razona",
            "que modelo",
            "eres una ia",
            "motor de ia",
        )
    )
    if asks_about_agent:
        return CopilotResponse(
            message=(
                "En este momento estoy usando el motor operacional local NORTHMINE. "
                "Consulto herramientas autorizadas del demo y aplico reglas verificables; "
                "no soy todavía un modelo generativo conectado en esta sesión. Cuando el "
                "servidor habilita OpenAI, el modelo razona y solicita esas mismas herramientas, "
                "pero los datos y las acciones siguen siendo validados por NORTHMINE."
            ),
            response_type="observation",
            facts=[
                "La demo pública usa datos sintéticos y representativos.",
                "Las cifras provienen de herramientas internas autorizadas, no del conocimiento del modelo.",
                "El backend valida el rol, la herramienta y cualquier acción antes de ejecutarla.",
            ],
            limitations=[
                "El motor local tiene razonamiento acotado por reglas y no reemplaza un modelo generativo amplio.",
                "La demo pública no está conectada a SQL ni WENCO.",
            ],
            confidence=ConfidenceInfo(level="alta", reasons=["Estado del proveedor y origen de datos conocidos por el backend."]),
            data_freshness=DataFreshness(status="current", age_minutes=0),
            requires_human_approval=False,
            conversation_id=conversation_id,
        ), []
    is_follow_up = len(normalized_message) < 100 and any(
        token in normalized_message for token in ("por que", "con eso", "y eso", "tambien", "ahora", "ese", "esa")
    )
    planning_message = " ".join(item.get("content", "") for item in history[-4:]) + " " + message if is_follow_up else message
    args = {"shift": context.shift, "date": context.selected_date}
    outputs: list[tuple[str, dict[str, Any], dict[str, Any]]] = []
    executions: list[ToolExecution] = []
    for name in _local_tool_plan(planning_message, allowed_tools):
        started = time.perf_counter()
        try:
            tool_args = {key: value for key, value in args.items() if value}
            result = TOOL_REGISTRY[name].handler(tool_args)
            outputs.append((name, tool_args, result))
            executions.append(ToolExecution(
                name=name, args=tool_args, status="ok",
                duration_ms=int((time.perf_counter() - started) * 1000),
                summary=_summarize_tool_result(name, result),
            ))
        except Exception as exc:  # noqa: BLE001 - una fuente parcial no tumba el dialogo
            logger.exception("Fallo en herramienta local %s", name)
            executions.append(ToolExecution(
                name=name, args={}, status="error",
                duration_ms=int((time.perf_counter() - started) * 1000), summary=str(exc)[:200],
            ))

    facts = [_summarize_tool_result(name, result) for name, _args, result in outputs]
    recommendations: list[str] = []
    inferences: list[str] = []
    limitations: list[str] = []
    for name, _tool_args, result in outputs:
        if name == "get_production_kpis":
            if float(result.get("brecha_ton") or 0) > 0:
                recommendations.append(
                    f"Evaluar un ritmo de {result.get('ritmo_requerido_tph', 0):,.0f} t/h para cerrar la brecha del turno."
                )
            inferences.append(
                f"La proyeccion disponible es {result.get('proyeccion_fin_turno', 0):,.0f} t; requiere validacion con la continuidad operacional."
            )
        elif name == "get_alerts" and int(result.get("count") or 0) > 0:
            recommendations.append("Priorizar la revision humana de las alertas criticas y altas antes de cambiar asignaciones.")
        elif name == "get_data_quality_status" and result.get("stale"):
            limitations.append("La fuente reporta datos desactualizados; las conclusiones deben tomarse como referenciales.")

    text = _normalized(message)
    wants_report = any(word in text for word in ("reporte", "informe", "pdf"))
    ui_actions = _local_ui_actions(message, str(user.get("rol") or ""))
    report_drafts: list[ReportDraft] = []
    if wants_report and facts:
        title = f"Reporte operacional {context.selected_date or 'turno actual'}"
        sections = {
            "Alcance": f"{context.mine or 'MINA CHILE DEMO'} · turno {context.shift or 'actual'} · datos sintéticos de demostración.",
            "Resumen ejecutivo": "\n".join(facts),
            "Inferencias": "\n".join(inferences) or "No se generaron inferencias adicionales.",
            "Recomendaciones": "\n".join(recommendations) or "Mantener monitoreo y validar las decisiones con un usuario autorizado.",
            "Limitaciones": "\n".join(limitations) or "Este reporte usa datos disponibles en la demo pública y no está conectado a SQL/WENCO.",
        }
        record = repository.create_report_draft(
            conversation_id=conversation_id, kind="operational_shift", title=title,
            sections=sections, created_by=str(user.get("sub") or "anon"),
        )
        report_drafts.append(ReportDraft(**record))

    confidence = _combine_confidence([result.get("confidence", {}) for _n, _a, result in outputs])
    freshness = _combine_freshness([result.get("freshness", {}) for _n, _a, result in outputs])
    if not facts:
        message_text = "Puedo conversar, navegar por NORTHMINE, analizar el turno y generar reportes, pero este rol no tiene una fuente autorizada para esa consulta."
        limitations.append("No hay herramientas de datos autorizadas para el rol actual.")
    elif wants_report:
        message_text = "Generé un borrador de reporte PDF con la evidencia disponible. Puedes revisarlo y descargarlo desde esta conversación."
    elif ui_actions:
        message_text = "Entendido. Abriré el módulo solicitado y mantendré esta conversación disponible."
    else:
        message_text = "Revisé los datos disponibles del contexto actual. Estos son los hallazgos verificables para apoyar la decisión."

    response = CopilotResponse(
        message=message_text,
        response_type="draft" if report_drafts else ("finding" if facts else "information_insufficient"),
        facts=facts, inferences=inferences, recommendations=recommendations,
        limitations=limitations, evidence=[
            Evidence(
                source=name, metric=name,
                period=str(tool_args.get("date") or tool_args.get("shift") or context.selected_date or "turno actual"),
                detail=_summarize_tool_result(name, result), tool=name,
                generated_at=datetime.now().isoformat(timespec="seconds"),
            ) for name, tool_args, result in outputs
        ],
        chart_specs=_maybe_build_chart(message, outputs), report_drafts=report_drafts,
        ui_actions=ui_actions, confidence=confidence, data_freshness=freshness,
        requires_human_approval=bool(recommendations), tool_executions=executions,
        degraded=False, conversation_id=conversation_id,
    )
    return response, [name for name, _args, _result in outputs]


async def run_chat_turn(
    *,
    user: dict[str, Any],
    message: str,
    context: ChatContext,
    conversation_id: str | None,
    history: list[dict[str, str]] | None = None,
) -> tuple[CopilotResponse, list[str]]:
    """Ejecuta un turno completo: resolucion de herramientas + sintesis forzada.

    Devuelve la respuesta estructurada y la lista de nombres de herramientas
    efectivamente usadas (para auditoria). Nunca lanza: cualquier fallo del
    proveedor de IA degrada a una respuesta segura en vez de romper el chat.
    """
    settings: Settings = get_settings()
    role = str(user.get("rol") or "").strip().lower()
    conversation_id = conversation_id or f"conv-{uuid.uuid4().hex[:12]}"
    history = history or []

    if not policies.can_use_chat(role):
        return _degraded_response(conversation_id, "Rol sin acceso al copiloto."), []

    provider: AIProvider = get_provider(settings)
    allowed_tools = policies.tools_allowed_for_role(role)
    if isinstance(provider, LocalOperationalProvider):
        return _run_local_operational_turn(
            user=user, message=message, context=context, conversation_id=conversation_id,
            allowed_tools=allowed_tools, history=history,
        )
    system = _build_system_prompt(role, context, allowed_tools)
    messages: list[dict[str, Any]] = [
        {"role": item["role"], "content": item["content"]}
        for item in history[-10:]
        if item.get("role") in {"user", "assistant"} and item.get("content")
    ]
    messages.append({"role": "user", "content": message})
    tool_executions: list[ToolExecution] = []
    tool_outputs: list[tuple[str, dict[str, Any], dict[str, Any]]] = []
    used_tool_names: list[str] = []

    try:
        tool_specs = anthropic_tool_specs(allowed_tools) if allowed_tools else None
        for _ in range(MAX_TOOL_ITERATIONS):
            response = await provider.generate(
                system=system,
                messages=messages,
                tools=tool_specs,
                max_tokens=settings.ai_max_output_tokens,
            )
            messages.append({"role": "assistant", "content": response.content})
            tool_use_blocks = [block for block in response.content if block.get("type") == "tool_use"]
            if response.stop_reason != "tool_use" or not tool_use_blocks:
                break

            tool_result_content: list[dict[str, Any]] = []
            for block in tool_use_blocks:
                name = str(block.get("name") or "")
                tool_id = str(block.get("id") or "")
                args = block.get("input") or {}
                started = time.perf_counter()
                if not policies.is_tool_allowed(role, name):
                    tool_executions.append(ToolExecution(name=name, args=args, status="denied", duration_ms=0, summary="Herramienta no autorizada para este rol."))
                    tool_result_content.append({"type": "tool_result", "tool_use_id": tool_id, "content": "Herramienta no autorizada para el rol actual.", "is_error": True})
                    continue
                try:
                    result = TOOL_REGISTRY[name].handler(args)
                    duration_ms = int((time.perf_counter() - started) * 1000)
                    tool_outputs.append((name, args, result))
                    used_tool_names.append(name)
                    tool_executions.append(ToolExecution(name=name, args=args, status="ok", duration_ms=duration_ms, summary=_summarize_tool_result(name, result)))
                    tool_result_content.append({"type": "tool_result", "tool_use_id": tool_id, "content": json.dumps(result, default=str)[:4000]})
                except Exception as exc:  # noqa: BLE001 - defensivo: una herramienta no debe tumbar el chat
                    duration_ms = int((time.perf_counter() - started) * 1000)
                    logger.exception("Fallo ejecutando herramienta %s", name)
                    tool_executions.append(ToolExecution(name=name, args=args, status="error", duration_ms=duration_ms, summary=str(exc)[:200]))
                    tool_result_content.append({"type": "tool_result", "tool_use_id": tool_id, "content": f"Error ejecutando herramienta: {exc}", "is_error": True})
            messages.append({"role": "user", "content": tool_result_content})

        messages.append({"role": "user", "content": "Entrega ahora la respuesta final llamando emit_response exactamente una vez."})
        synthesis = await provider.generate(
            system=system,
            messages=messages,
            tools=[EMIT_RESPONSE_TOOL],
            tool_choice={"type": "tool", "name": "emit_response"},
            max_tokens=settings.ai_max_output_tokens,
        )
    except ProviderError as exc:
        logger.warning("Copilot en modo degradado: %s", exc)
        return _degraded_response(conversation_id, str(exc)), used_tool_names

    emit_block = next(
        (block for block in synthesis.content if block.get("type") == "tool_use" and block.get("name") == "emit_response"),
        None,
    )
    if not emit_block:
        return _degraded_response(conversation_id, "El modelo no entrego una respuesta estructurada."), used_tool_names

    payload = emit_block.get("input") or {}
    evidence = [
        Evidence(
            source=name,
            metric=name,
            period=str(args.get("date") or args.get("shift") or context.selected_date or "turno actual"),
            value=None,
            detail=_summarize_tool_result(name, result),
            tool=name,
            generated_at=datetime.now().isoformat(timespec="seconds"),
        )
        for name, args, result in tool_outputs
    ]
    confidence = _combine_confidence([result.get("confidence", {}) for _n, _a, result in tool_outputs])
    freshness = _combine_freshness([result.get("freshness", {}) for _n, _a, result in tool_outputs])
    chart_specs = _maybe_build_chart(message, tool_outputs)

    task_drafts: list[TaskDraft] = []
    propose_task = payload.get("propose_task")
    if isinstance(propose_task, dict) and propose_task.get("title") and propose_task.get("reason"):
        try:
            record = repository.create_task_draft(
                conversation_id=conversation_id,
                title=str(propose_task["title"]),
                reason=str(propose_task["reason"]),
                evidence=[item.detail for item in evidence][:5],
                priority=str(propose_task.get("priority") or "media"),
                suggested_owner=propose_task.get("suggested_owner"),
                linked_finding=None,
                created_by=str(user.get("sub") or "anon"),
            )
            task_drafts.append(
                TaskDraft(
                    id=record["id"],
                    title=record["title"],
                    reason=record["reason"],
                    evidence=record["evidence"],
                    priority=record["priority"],
                    suggested_owner=record.get("suggested_owner"),
                    status=record["status"],
                    linked_finding=record.get("linked_finding"),
                    created_by=record.get("created_by"),
                    created_at=record.get("created_at"),
                )
            )
        except Exception:  # noqa: BLE001 - una tarea borrador que falla no debe romper el chat
            logger.exception("No se pudo guardar el borrador de tarea propuesto por el copiloto")

    report_drafts: list[ReportDraft] = []
    propose_report = payload.get("propose_report")
    if isinstance(propose_report, dict) and propose_report.get("title") and isinstance(propose_report.get("sections"), dict):
        try:
            record = repository.create_report_draft(
                conversation_id=conversation_id,
                kind=str(propose_report.get("kind") or "operational"),
                title=str(propose_report["title"]),
                sections={str(key): str(value) for key, value in propose_report["sections"].items()},
                created_by=str(user.get("sub") or "anon"),
            )
            report_drafts.append(ReportDraft(**record))
        except Exception:  # noqa: BLE001 - el chat puede responder aunque el borrador no persista
            logger.exception("No se pudo guardar el borrador de reporte propuesto por el copiloto")

    message_text = policies.soften_language(str(payload.get("message") or ""))
    validated_ui_actions = _validate_ui_actions(payload.get("ui_actions"), role)
    try:
        result = CopilotResponse(
            message=message_text,
            response_type=payload.get("response_type", "observation"),
            facts=[str(item) for item in payload.get("facts") or []],
            inferences=[policies.soften_language(str(item)) for item in payload.get("inferences") or []],
            recommendations=[policies.soften_language(str(item)) for item in payload.get("recommendations") or []],
            limitations=[str(item) for item in payload.get("limitations") or []],
            evidence=evidence,
            chart_specs=chart_specs,
            task_drafts=task_drafts,
            report_drafts=report_drafts,
            ui_actions=validated_ui_actions,
            confidence=confidence,
            data_freshness=freshness,
            requires_human_approval=bool(payload.get("requires_human_approval", True)),
            tool_executions=tool_executions,
            degraded=False,
            conversation_id=conversation_id,
        )
    except ValidationError:
        logger.exception("Respuesta del copiloto no cumplio el esquema, degradando")
        return _degraded_response(conversation_id, "La respuesta generada no cumplio el formato esperado."), used_tool_names

    return result, used_tool_names
