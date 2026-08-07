from __future__ import annotations

import asyncio
import logging
import time
import uuid
from typing import Any

from app.ai import audit as runtime_audit
from app.ai import conclusion as conclusion_module
from app.ai import hypotheses as hypotheses_module
from app.ai import verifier
from app.ai.capabilities import get_capability
from app.ai.executor import _args_for_step, _evidence_from_tool_result
from app.ai.investigation_repository import save_investigation
from app.ai.investigation_schemas import (
    EvidenceItem,
    InvestigationPlan,
    InvestigationResult,
    InvestigationScope,
    PlanStep,
    new_id,
)
from app.ai import planner
from app.ai.runtime import command_router, findings as findings_module, interruption
from app.ai.runtime.command_router import AgentCommand, AgentCommandType
from app.ai.runtime.event_bus import emit
from app.ai.runtime.session_manager import LiveSession
from app.ai.runtime.state_machine import AgentRuntimeState
from app.ai.runtime.ui_actions import UIActionAcknowledgement, register_wait, wait_for_ack
from app.ai.tools import TOOL_REGISTRY

logger = logging.getLogger("northmine.ai.runtime")

"""Agent Runtime (Etapa 4): orquesta Command Router -> Planner -> Executor
(con acknowledgement real de UI actions requeridas) -> Verifier -> Hipotesis
-> Conclusion -> Findings -> Speech, sobre una sesion persistente. Reusa
integramente los modulos deterministicos de Etapa 3 (planner/verifier/
hypotheses/conclusion/investigation_repository) - no hay una segunda
implementacion de esa logica, solo una nueva capa de orquestacion por
eventos que reemplaza el POST/NDJSON sincrono de Etapa 3 por un WebSocket
persistente con pausa/cancelacion/interrupcion reales.
"""

REQUIRED_UI_ACTION_TIMEOUT_SECONDS = 15.0


async def _set_state(live: LiveSession, target: AgentRuntimeState, *, correlation_id: str) -> None:
    live.set_status(target)
    await emit(
        live, "agent.state.changed", correlation_id=correlation_id,
        payload={"state": target.value},
    )


async def handle_user_text(live: LiveSession, user: dict, text: str, correlation_id: str, ip: str) -> None:
    """Punto de entrada principal para texto (o transcripcion final de voz) -
    seccion 1: 'escucha por voz o recibe texto' -> Command Router -> plan."""
    command = command_router.classify(text, has_active_investigation=bool(live.session.active_investigation_id))
    runtime_audit.record_command(
        usuario=str(user.get("sub") or "anon"), ip=ip, session_id=live.session.session_id,
        command_type=command.type.value, confidence=command.confidence,
    )
    await dispatch_command(live, user, command, correlation_id, ip)


async def dispatch_command(live: LiveSession, user: dict, command: AgentCommand, correlation_id: str, ip: str) -> None:
    if command.type == AgentCommandType.START_INVESTIGATION:
        await start_investigation(live, user, command, correlation_id, ip)
    elif command.type == AgentCommandType.PAUSE:
        await pause_investigation(live, correlation_id)
    elif command.type == AgentCommandType.RESUME:
        await resume_investigation(live, correlation_id)
    elif command.type == AgentCommandType.CANCEL:
        await cancel_investigation(live, user, correlation_id, ip)
    elif command.type == AgentCommandType.INTERRUPT:
        await interrupt_agent(live, user, command, correlation_id, ip)
    elif command.type == AgentCommandType.MODIFY_INVESTIGATION:
        await modify_investigation(live, command, correlation_id)
    elif command.type == AgentCommandType.NAVIGATE:
        await request_presentation_navigate(live, command, correlation_id)
    elif command.type == AgentCommandType.SHOW_EVIDENCE:
        await emit(live, "agent.text.delta", correlation_id=correlation_id, payload={
            "text": "La evidencia de la investigacion activa esta disponible en el workspace.",
        })
    elif command.type == AgentCommandType.GENERATE_REPORT:
        await request_presentation_navigate(live, command.model_copy(update={"target_module": "reportes"}), correlation_id)
    elif command.type == AgentCommandType.SCREEN_CONTEXT:
        await handle_screen_context(live, correlation_id)
    elif command.type == AgentCommandType.EXPLAIN_WIDGET:
        await handle_explain_widget(live, command, correlation_id)
    elif command.type == AgentCommandType.ANALYZE_WIDGET_VISUALLY:
        await handle_analyze_visually(live, command, correlation_id, target_type="widget")
    elif command.type == AgentCommandType.ANALYZE_CURRENT_VIEW:
        await handle_analyze_visually(live, command, correlation_id, target_type="viewport")
    elif command.type == AgentCommandType.FOCUS_VISIBLE_ENTITY:
        await handle_focus_visible_entity(live, command, correlation_id)
    else:
        await emit(live, "agent.error", correlation_id=correlation_id, payload={
            "message": "Esta capacidad todavia no esta disponible en la version actual del agente.",
            "recoverable": True,
        })


# ── Iniciar investigacion ───────────────────────────────────────────────

async def start_investigation(live: LiveSession, user: dict, command: AgentCommand, correlation_id: str, ip: str) -> None:
    if live.current_investigation_task is not None and not live.current_investigation_task.done():
        await emit(live, "agent.error", correlation_id=correlation_id, payload={
            "message": "Ya hay una investigacion en curso. Di 'cancela' antes de iniciar otra.",
            "recoverable": True,
        })
        return

    interruption.clear_cancel(live)
    interruption.mark_resume(live)  # asegura que no arranque ya en pausa
    live.focus_override = command.equipment_query

    await _set_state(live, AgentRuntimeState.PLANNING, correlation_id=correlation_id)
    scope = InvestigationScope(equipment_ids=[command.equipment_query] if command.equipment_query else [])
    plan = planner.build_plan(command.investigation_type, scope, live.session.role)
    live.session = live.session.model_copy(update={"active_investigation_id": plan.investigation_id})

    await emit(
        live, "agent.plan.created", correlation_id=correlation_id, investigation_id=plan.investigation_id,
        payload={"plan": _plan_payload(plan)},
    )

    await _set_state(live, AgentRuntimeState.EXECUTING, correlation_id=correlation_id)
    live.current_investigation_task = asyncio.create_task(
        _run_investigation(live, user, plan, correlation_id, ip)
    )


def _plan_payload(plan: InvestigationPlan) -> dict[str, Any]:
    return {
        "investigation_id": plan.investigation_id,
        "type": plan.type.value,
        "goal": plan.goal,
        "status": plan.status,
        "steps": [s.model_dump() for s in plan.steps],
        "missing_capabilities": plan.missing_capabilities,
    }


def _inject_entity_step(plan: InvestigationPlan, equipment_query: str) -> PlanStep:
    """Seccion 10 (Required): 'Resolver y seleccionar la Pala 03' es el
    ejemplo canonico de un paso ui_action REQUERIDO - no forma parte del
    Capability Registry de Etapa 3 (todas sus ui_action son opcionales), asi
    que se inyecta como un paso sintetico al frente del plan cuando el
    comando trae una entidad explicita."""
    step = PlanStep(
        step_id=new_id("step"), kind="ui_action", capability_id="select_equipment_entity",
        description=f"Resolver y seleccionar {equipment_query}", requirement="required",
    )
    plan.steps.insert(0, step)
    return step


async def _run_investigation(live: LiveSession, user: dict, plan: InvestigationPlan, correlation_id: str, ip: str) -> None:
    usuario = str(user.get("sub") or "anon")
    evidence: list[EvidenceItem] = []
    first_probable_spoken = False

    if live.focus_override:
        _inject_entity_step(plan, live.focus_override)

    plan.status = "running"
    cancelled = False

    for step in plan.steps:
        if interruption.should_cancel(live):
            cancelled = True
            break
        await interruption.wait_while_paused(live)
        if interruption.should_cancel(live):
            cancelled = True
            break

        if live.focus_override and step.kind == "tool" and step.status == "pending":
            plan.scope = plan.scope.model_copy(update={"equipment_ids": [live.focus_override]})

        if step.kind == "ui_action":
            await _run_ui_action_step(live, plan, step, correlation_id, usuario, ip)
            continue

        await _run_tool_step(live, plan, step, evidence, correlation_id)
        if step.status == "completed" and evidence:
            finding = findings_module.finding_from_evidence(plan.investigation_id, evidence[-1])
            if finding:
                await _emit_finding(live, finding, correlation_id)

    live.current_investigation_task = None

    if cancelled:
        plan.status = "cancelled"
        await _set_state(live, AgentRuntimeState.CANCELLED, correlation_id=correlation_id)
        await emit(live, "investigation.cancelled", correlation_id=correlation_id, investigation_id=plan.investigation_id, payload={
            "evidence_collected": len(evidence),
        })
        interruption.clear_cancel(live)
        live.session = live.session.model_copy(update={"active_investigation_id": None})
        await _set_state(live, AgentRuntimeState.IDLE, correlation_id=correlation_id)
        return

    await _set_state(live, AgentRuntimeState.VERIFYING, correlation_id=correlation_id)
    await emit(live, "verification.started", correlation_id=correlation_id, investigation_id=plan.investigation_id)
    verification = verifier.verify_evidence(evidence)
    await emit(
        live, "verification.completed", correlation_id=correlation_id, investigation_id=plan.investigation_id,
        payload={"verification": verification.model_dump()},
    )

    hyps = hypotheses_module.generate_hypotheses(plan.type, evidence)
    if hyps:
        await emit(
            live, "hypothesis.updated", correlation_id=correlation_id, investigation_id=plan.investigation_id,
            payload={"hypotheses": [h.model_dump() for h in hyps]},
        )
        for h in hyps:
            is_first = h.status == "probable" and not first_probable_spoken
            hyp_finding = findings_module.finding_from_hypothesis(plan.investigation_id, h, is_first)
            if hyp_finding:
                if is_first:
                    first_probable_spoken = True
                await _emit_finding(live, hyp_finding, correlation_id)

    tool_required = [s for s in plan.steps if s.kind == "tool" and s.requirement == "required"]
    plan.status = "completed" if all(s.status == "completed" for s in tool_required) else "failed"

    conclusion = conclusion_module.build_conclusion(plan, evidence, verification, hyps)
    result = InvestigationResult(plan=plan, evidence=evidence, verification=verification, hypotheses=hyps, conclusion=conclusion)
    save_investigation(result, created_by=usuario, role=live.session.role)

    runtime_audit.record_command(
        usuario=usuario, ip=ip, session_id=live.session.session_id,
        command_type="investigation_completed", confidence="rule",
    )

    await _set_state(live, AgentRuntimeState.SPEAKING, correlation_id=correlation_id)
    await _speak(live, correlation_id, text=conclusion.summary, priority="result", segment_id=f"seg-{uuid.uuid4().hex[:10]}")

    await emit(
        live, "investigation.completed", correlation_id=correlation_id, investigation_id=plan.investigation_id,
        payload={"result": result.model_dump(mode="json")},
    )
    live.session = live.session.model_copy(update={"active_investigation_id": None})


async def _run_tool_step(live: LiveSession, plan: InvestigationPlan, step: PlanStep, evidence: list[EvidenceItem], correlation_id: str) -> None:
    await emit(live, "step.started", correlation_id=correlation_id, investigation_id=plan.investigation_id, step_id=step.step_id)
    await emit(live, "tool.started", correlation_id=correlation_id, investigation_id=plan.investigation_id, step_id=step.step_id, payload={"capabilityId": step.capability_id})

    capability = get_capability(step.capability_id)
    tool = TOOL_REGISTRY.get(step.capability_id)
    if capability is None or tool is None:
        step.status = "skipped"
        step.error = "capability o tool no registrada"
        await emit(live, "tool.failed", correlation_id=correlation_id, investigation_id=plan.investigation_id, step_id=step.step_id, payload={"error": step.error})
        return

    step.status = "running"
    started = time.perf_counter()
    try:
        args = _args_for_step(step, plan.scope)
        result = await asyncio.wait_for(asyncio.to_thread(tool.handler, args), timeout=capability.timeout_seconds)
        item = _evidence_from_tool_result(step.capability_id, result, plan.scope)
        evidence.append(item)
        step.evidence_ids.append(item.evidence_id)
        step.status = "completed"
        step.duration_ms = int((time.perf_counter() - started) * 1000)
        await emit(
            live, "tool.completed", correlation_id=correlation_id, investigation_id=plan.investigation_id, step_id=step.step_id,
            payload={"durationMs": step.duration_ms, "evidenceId": item.evidence_id},
        )
        await emit(
            live, "step.completed", correlation_id=correlation_id, investigation_id=plan.investigation_id, step_id=step.step_id,
            payload={"status": "completed"},
        )
    except asyncio.TimeoutError:
        step.status = "failed"
        step.error = f"timeout tras {capability.timeout_seconds}s"
        await emit(live, "tool.failed", correlation_id=correlation_id, investigation_id=plan.investigation_id, step_id=step.step_id, payload={"error": step.error})
    except Exception as exc:  # noqa: BLE001 - un paso fallido no debe tumbar la investigacion completa
        step.status = "failed"
        step.error = str(exc)
        logger.exception("Fallo ejecutando %s en investigacion %s", step.capability_id, plan.investigation_id)
        await emit(live, "tool.failed", correlation_id=correlation_id, investigation_id=plan.investigation_id, step_id=step.step_id, payload={"error": step.error})


async def _run_ui_action_step(live: LiveSession, plan: InvestigationPlan, step: PlanStep, correlation_id: str, usuario: str, ip: str) -> None:
    capability = get_capability(step.capability_id)
    action_id = f"action-{uuid.uuid4().hex[:12]}"
    payload = {
        "actionId": action_id,
        "capabilityId": step.capability_id,
        "requirement": step.requirement,
        "moduleId": capability.module_id if capability else None,
        "widgetId": capability.widget_id if capability else None,
        "entityQuery": live.focus_override if step.capability_id == "select_equipment_entity" else None,
    }
    step.status = "running"
    await emit(live, "step.started", correlation_id=correlation_id, investigation_id=plan.investigation_id, step_id=step.step_id)
    await emit(live, "ui_action.requested", correlation_id=correlation_id, investigation_id=plan.investigation_id, step_id=step.step_id, payload=payload)

    if step.requirement != "required":
        # optional / presentation_only (seccion 10): best-effort, nunca bloquea.
        step.status = "completed"
        await emit(live, "step.completed", correlation_id=correlation_id, investigation_id=plan.investigation_id, step_id=step.step_id, payload={"status": "presentation_only"})
        return

    register_wait(live, action_id)
    await emit(live, "ui_action.waiting", correlation_id=correlation_id, investigation_id=plan.investigation_id, step_id=step.step_id, payload={"actionId": action_id, "timeoutSeconds": REQUIRED_UI_ACTION_TIMEOUT_SECONDS})
    ack = await wait_for_ack(live, action_id, REQUIRED_UI_ACTION_TIMEOUT_SECONDS)

    runtime_audit.record_ui_action_ack(
        usuario=usuario, ip=ip, session_id=live.session.session_id, action_id=action_id,
        status=ack.status, requirement=step.requirement,
    )

    if ack.status == "completed":
        step.status = "completed"
        if ack.selected_entity_ids:
            plan.scope = plan.scope.model_copy(update={"equipment_ids": ack.selected_entity_ids})
        await emit(
            live, "ui_action.completed", correlation_id=correlation_id, investigation_id=plan.investigation_id, step_id=step.step_id,
            payload={"actionId": action_id, "contextUpdated": ack.context_updated, "selectedEntityIds": ack.selected_entity_ids},
        )
    else:
        step.status = "failed" if ack.status != "timeout" else "failed"
        step.error = ack.error or f"UI action {ack.status}"
        await emit(
            live, "ui_action.failed", correlation_id=correlation_id, investigation_id=plan.investigation_id, step_id=step.step_id,
            payload={"actionId": action_id, "status": ack.status, "error": step.error},
        )
        # Seccion 10 (Required): sin alternativa backend real para resolver
        # una entidad ambigua - se continua con evidencia incompleta en vez
        # de detener toda la investigacion, y la limitacion queda en el
        # Verifier/Conclusion (plan.missing_capabilities documenta el motivo).
        plan.missing_capabilities.append(f"{step.capability_id}: {step.error}")

    await emit(live, "step.completed", correlation_id=correlation_id, investigation_id=plan.investigation_id, step_id=step.step_id, payload={"status": step.status})


async def _emit_finding(live: LiveSession, finding: findings_module.InvestigationFinding, correlation_id: str) -> None:
    from app.ai.runtime import persistence

    persistence.save_finding(
        finding_id=finding.finding_id, investigation_id=finding.investigation_id, label=finding.label,
        summary=finding.summary, severity=finding.severity, evidence_ids=finding.evidence_ids, spoken=finding.speak,
    )
    await emit(
        live, "finding.created", correlation_id=correlation_id, investigation_id=finding.investigation_id,
        payload=finding.model_dump(mode="json"),
    )
    if finding.speak:
        await _speak(live, correlation_id, text=finding.summary, priority="finding", segment_id=finding.finding_id)


async def _speak(live: LiveSession, correlation_id: str, *, text: str, priority: str, segment_id: str) -> None:
    await emit(
        live, "agent.speech.segment", correlation_id=correlation_id,
        payload={"segmentId": segment_id, "text": text, "priority": priority, "sequence": live.next_sequence, "interruptible": True},
    )


# ── Pausa / reanudacion / cancelacion / interrupcion ───────────────────

async def pause_investigation(live: LiveSession, correlation_id: str) -> None:
    if live.state_machine.state != AgentRuntimeState.EXECUTING:
        await emit(live, "agent.error", correlation_id=correlation_id, payload={"message": "No hay una investigacion en curso para pausar.", "recoverable": True})
        return
    interruption.mark_pause(live)
    await _set_state(live, AgentRuntimeState.PAUSED, correlation_id=correlation_id)


async def resume_investigation(live: LiveSession, correlation_id: str) -> None:
    if live.state_machine.state != AgentRuntimeState.PAUSED:
        await emit(live, "agent.error", correlation_id=correlation_id, payload={"message": "No hay una investigacion pausada para continuar.", "recoverable": True})
        return
    interruption.mark_resume(live)
    await _set_state(live, AgentRuntimeState.EXECUTING, correlation_id=correlation_id)


async def cancel_investigation(live: LiveSession, user: dict, correlation_id: str, ip: str) -> None:
    interruption.mark_cancel(live)
    interruption.mark_resume(live)  # libera un posible pause-wait para que el loop note el cancel
    await emit(live, "agent.speech.stop", correlation_id=correlation_id, payload={"reason": "cancelled"})
    runtime_audit.record_interruption(
        usuario=str(user.get("sub") or "anon"), ip=ip, session_id=live.session.session_id,
        kind="cancel", investigation_id=live.session.active_investigation_id, plan_modified=False,
    )
    if live.current_investigation_task is None:
        # No hay loop corriendo (p.ej. estabamos en verifying/speaking): forzar cierre limpio.
        await _set_state(live, AgentRuntimeState.CANCELLED, correlation_id=correlation_id)
        interruption.clear_cancel(live)
        live.session = live.session.model_copy(update={"active_investigation_id": None})
        await _set_state(live, AgentRuntimeState.IDLE, correlation_id=correlation_id)


async def interrupt_agent(live: LiveSession, user: dict, command: AgentCommand, correlation_id: str, ip: str) -> None:
    """Seccion 12: interrupcion real - detiene voz, no reinicia toda la
    investigacion si no es necesario, conserva evidencia, permite un nuevo
    foco (equipment_query) que se aplica a los pasos AUN NO ejecutados."""
    was_speaking = live.state_machine.state == AgentRuntimeState.SPEAKING
    await emit(live, "agent.speech.stop", correlation_id=correlation_id, payload={"reason": "interrupted"})

    plan_modified = bool(command.equipment_query)
    if command.equipment_query:
        interruption.mark_interrupt(live, focus_override=command.equipment_query)
        live.focus_override = command.equipment_query

    runtime_audit.record_interruption(
        usuario=str(user.get("sub") or "anon"), ip=ip, session_id=live.session.session_id,
        kind="interrupt", investigation_id=live.session.active_investigation_id, plan_modified=plan_modified,
    )

    if was_speaking:
        await _set_state(live, AgentRuntimeState.INTERRUPTED, correlation_id=correlation_id)
        await _set_state(live, AgentRuntimeState.LISTENING, correlation_id=correlation_id)
        await _set_state(live, AgentRuntimeState.IDLE, correlation_id=correlation_id)
    interruption.clear_interrupt(live)


async def modify_investigation(live: LiveSession, command: AgentCommand, correlation_id: str) -> None:
    if not live.session.active_investigation_id:
        await emit(live, "agent.error", correlation_id=correlation_id, payload={"message": "No hay una investigacion activa para modificar.", "recoverable": True})
        return
    live.focus_override = command.equipment_query
    await emit(
        live, "agent.plan.updated", correlation_id=correlation_id, investigation_id=live.session.active_investigation_id,
        payload={"focus": command.equipment_query, "reason": "modify_investigation"},
    )


async def request_presentation_navigate(live: LiveSession, command: AgentCommand, correlation_id: str) -> None:
    action_id = f"action-{uuid.uuid4().hex[:12]}"
    await emit(
        live, "ui_action.requested", correlation_id=correlation_id,
        payload={"actionId": action_id, "capabilityId": "navigate_direct", "requirement": "presentation_only", "moduleId": command.target_module},
    )


async def handle_ui_action_ack(live: LiveSession, ack: UIActionAcknowledgement, user: dict, ip: str) -> None:
    from app.ai.runtime.ui_actions import resolve_ack

    resolved = resolve_ack(live, ack)
    if not resolved:
        runtime_audit.record_ui_action_ack(
            usuario=str(user.get("sub") or "anon"), ip=ip, session_id=live.session.session_id,
            action_id=ack.action_id, status=f"{ack.status}_unmatched", requirement="optional",
        )


# ── Percepcion (Etapa 5) ─────────────────────────────────────────────────
# Nivel 1 (semantic) siempre disponible sin tocar el DOM; Nivel 3 (visual)
# solo se activa cuando el comando lo requiere explicitamente, y la captura
# en si la hace el FRONTEND (el backend no tiene DOM) - aca solo se pide
# (`perception.capture_requested`) y se recibe el resultado
# (`perception.observation_reported`, manejado en ws_router.py).

def _widget_summary_or_none(live: LiveSession) -> str | None:
    widget = live.perception.focused_widget()
    if widget:
        return widget.semantic_summary
    return None


async def handle_screen_context(live: LiveSession, correlation_id: str) -> None:
    state = live.perception
    parts: list[str] = []
    if state.module_id:
        parts.append(f"Estoy viendo {state.module_id}")
        if state.selected_entities:
            entity = state.selected_entities[0]
            parts[-1] += f" con {entity.get('id', '')} seleccionado"
        parts[-1] += "."
    else:
        parts.append("Todavia no tengo contexto de que modulo estas viendo.")
    focused = state.focused_widget()
    if focused:
        parts.append(f"El widget enfocado es {focused.label}: {focused.semantic_summary}")
    await emit(live, "agent.text.delta", correlation_id=correlation_id, payload={"text": " ".join(parts)})
    await _speak(live, correlation_id, text=" ".join(parts)[:220], priority="status", segment_id=f"seg-{uuid.uuid4().hex[:10]}")


async def handle_explain_widget(live: LiveSession, command: AgentCommand, correlation_id: str) -> None:
    """Seccion 18: semantica ANTES que vision - explicar un widget usa
    SOLO el resumen semantico ya calculado, nunca dispara una captura."""
    summary = _widget_summary_or_none(live)
    if not summary:
        await emit(live, "agent.error", correlation_id=correlation_id, payload={
            "message": "No tengo un widget enfocado para explicar. Enfoca un grafico o indicador primero.", "recoverable": True,
        })
        return
    await emit(live, "agent.text.delta", correlation_id=correlation_id, payload={"text": summary})
    await _speak(live, correlation_id, text=summary[:220], priority="status", segment_id=f"seg-{uuid.uuid4().hex[:10]}")


async def handle_analyze_visually(live: LiveSession, command: AgentCommand, correlation_id: str, *, target_type: str) -> None:
    """Dispara Nivel 3 de percepcion (seccion 10-11): pide al frontend que
    capture el widget enfocado (o el viewport completo si no hay foco /
    se pidio explicitamente 'esta pantalla') y lo analice. No bloquea el
    Runtime esperando el resultado - `perception.observation_reported`
    llega de forma asincrona y se procesa en ws_router.py."""
    widget = live.perception.focused_widget()
    effective_target = target_type
    if target_type == "widget" and widget is None:
        effective_target = "viewport"

    await emit(live, "agent.text.delta", correlation_id=correlation_id, payload={
        "text": "Estoy revisando visualmente esa vista..." if effective_target == "viewport" else f"Estoy analizando visualmente {widget.label if widget else 'el widget enfocado'}...",
    })
    await emit(
        live, "perception.capture_requested", correlation_id=correlation_id,
        payload={"targetType": effective_target, "widgetId": widget.widget_id if widget else None},
    )


async def handle_focus_visible_entity(live: LiveSession, command: AgentCommand, correlation_id: str) -> None:
    """'Muestrame ese equipo' fuera del contexto de una investigacion activa
    - reusa el mismo mecanismo ui_action.requested que Etapa 3/4 ya usan
    para resolver y seleccionar una entidad, sin necesitar un plan completo."""
    if not command.equipment_query:
        await emit(live, "agent.error", correlation_id=correlation_id, payload={
            "message": "No identifique que equipo quieres ver. Especifica un ID (por ejemplo, Pala 03).", "recoverable": True,
        })
        return
    action_id = f"action-{uuid.uuid4().hex[:12]}"
    await emit(
        live, "ui_action.requested", correlation_id=correlation_id,
        payload={"actionId": action_id, "capabilityId": "select_equipment_entity", "requirement": "optional", "entityQuery": command.equipment_query},
    )


def handle_context_update(live: LiveSession, changes: dict[str, Any]) -> None:
    """Aplica un parche incremental de contexto semantico (seccion 4). No
    emite eventos - es puramente actualizacion de estado interno, consumido
    por SCREEN_CONTEXT/EXPLAIN_WIDGET/ANALYZE_WIDGET_VISUALLY y por
    get_current_screen_context."""
    live.perception.apply_patch(changes)


async def handle_visual_observation_reported(live: LiveSession, user: dict, payload: dict[str, Any], correlation_id: str, ip: str) -> None:
    """Recibe la VisualObservation que el frontend ya obtuvo del endpoint
    /api/ai-agent/vision/analyze (seccion 16). El Runtime NUNCA acepta la
    interpretacion visual como hecho por si sola: la contrasta contra el
    snapshot semantico del mismo widget (si existe) y, si hay contradiccion,
    emite un hallazgo de conflicto en vez de fusionar silenciosamente
    (seccion 26-27)."""
    from app.ai.perception_schemas import VisualObservation

    try:
        observation = VisualObservation.model_validate(payload.get("observation") or payload)
    except Exception:  # noqa: BLE001 - payload malformado del cliente, no debe tumbar la sesion
        return

    usuario = str(user.get("sub") or "anon")
    widget = live.perception.resolve_widget(observation.widget_id)

    runtime_audit.record_visual_observation(
        usuario=usuario, ip=ip, session_id=live.session.session_id,
        observation_id=observation.observation_id, capture_id=observation.capture_id,
        confidence=observation.confidence, verification_status="visual_observation",
    )

    conflict = verifier.detect_visual_semantic_conflict(widget, observation) if widget else None
    summary_parts = [f"Observación visual (no confirmada, confianza {observation.confidence}): {observation.summary}"]

    if conflict:
        runtime_audit.record_perception_conflict(
            usuario=usuario, ip=ip, session_id=live.session.session_id,
            conflict_id=conflict.conflict_id, widget_id=conflict.widget_id,
        )
        summary_parts.append(f"Los datos estructurados de '{widget.label}' no confirman esta lectura visual - se mantiene como observación no verificada.")
        await emit(
            live, "perception.conflict_detected", correlation_id=correlation_id,
            payload={"conflict": conflict.model_dump(mode="json")},
        )

    await emit(
        live, "perception.snapshot_updated", correlation_id=correlation_id,
        payload={"observation": observation.model_dump(mode="json"), "conflict": conflict.model_dump(mode="json") if conflict else None},
    )
    await _speak(live, correlation_id, text=" ".join(summary_parts)[:260], priority="finding", segment_id=f"seg-{uuid.uuid4().hex[:10]}")
