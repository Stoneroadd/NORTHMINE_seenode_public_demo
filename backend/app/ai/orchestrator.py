from __future__ import annotations

import json
import logging
import re
import time
import uuid
from datetime import datetime
from typing import Any

from app.ai import navigation, policies, repository
from app.ai.providers import AIProvider, ProviderError, get_provider
from app.ai.schemas import (
    ChartSpec,
    ChatContext,
    ClearFilterAction,
    CopilotResponse,
    DataFreshness,
    Evidence,
    FocusWidgetAction,
    NavigateAction,
    OpenEntityAction,
    ResponseConfidence,
    SelectEntityAction,
    SetFilterAction,
    TaskDraft,
    ToolExecution,
    UI_ACTION_RISK,
)
from app.ai.tool_formatting import summarize_tool_result
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


_summarize_tool_result = summarize_tool_result


def _combine_confidence(entries: list[dict[str, Any]]) -> ResponseConfidence:
    if not entries:
        return ResponseConfidence(level="insuficiente", reasons=["No se consultaron datos operacionales para esta respuesta."])
    worst = min(entries, key=lambda item: _CONFIDENCE_ORDER.get(item.get("level"), 0))
    reasons: list[str] = []
    for entry in entries:
        for reason in entry.get("reasons", []):
            if reason not in reasons:
                reasons.append(reason)
    return ResponseConfidence(level=worst.get("level", "baja"), reasons=reasons[:5])


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
        confidence=ResponseConfidence(level="insuficiente", reasons=[reason]),
        data_freshness=DataFreshness(status="unknown"),
        requires_human_approval=False,
        degraded=True,
        conversation_id=conversation_id,
    )


async def run_chat_turn(
    *,
    user: dict[str, Any],
    message: str,
    context: ChatContext,
    conversation_id: str | None,
) -> tuple[CopilotResponse, list[str]]:
    """Ejecuta un turno completo: resolucion de herramientas + sintesis forzada.

    Devuelve la respuesta estructurada y la lista de nombres de herramientas
    efectivamente usadas (para auditoria). Nunca lanza: cualquier fallo del
    proveedor de IA degrada a una respuesta segura en vez de romper el chat.
    """
    settings: Settings = get_settings()
    role = str(user.get("rol") or "").strip().lower()
    conversation_id = conversation_id or f"conv-{uuid.uuid4().hex[:12]}"

    if not policies.can_use_chat(role):
        return _degraded_response(conversation_id, "Rol sin acceso al copiloto."), []

    provider: AIProvider = get_provider(settings)
    allowed_tools = policies.tools_allowed_for_role(role)
    system = _build_system_prompt(role, context, allowed_tools)
    messages: list[dict[str, Any]] = [{"role": "user", "content": message}]
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
