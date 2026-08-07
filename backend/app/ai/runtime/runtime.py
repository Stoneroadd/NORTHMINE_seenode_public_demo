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
# Etapa 6: memoria, proactividad, work products
from app.ai.memory import episodic_memory, retrieval as memory_retrieval, working_memory
from app.ai.memory.models import new_working_memory_entity_id
from app.ai.proactivity import subscriptions
from app.ai.work_products import handover as handover_module, reports as reports_module, tasks as tasks_module, versions as versions_module
from app.ai.work_products.models import ReportScope

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
        await handle_generate_report(live, user, command, correlation_id, ip)
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
    elif command.type == AgentCommandType.RECALL_OPERATIONAL_CONTEXT:
        await handle_recall_operational_context(live, user, command, correlation_id, ip)
    elif command.type == AgentCommandType.COMPARE_WITH_MEMORY:
        await handle_compare_with_memory(live, user, command, correlation_id, ip)
    elif command.type == AgentCommandType.REOPEN_INVESTIGATION:
        await handle_reopen_investigation(live, user, command, correlation_id, ip)
    elif command.type == AgentCommandType.CREATE_WATCH:
        await handle_create_watch(live, user, command, correlation_id, ip)
    elif command.type == AgentCommandType.CANCEL_WATCH:
        await handle_cancel_watch(live, user, command, correlation_id, ip)
    elif command.type == AgentCommandType.SET_QUIET_MODE:
        await handle_set_quiet_mode(live, command, correlation_id)
    elif command.type == AgentCommandType.GENERATE_HANDOVER:
        await handle_generate_handover(live, user, correlation_id, ip)
    elif command.type == AgentCommandType.MODIFY_REPORT:
        await handle_modify_report(live, user, command, correlation_id, ip)
    elif command.type == AgentCommandType.CREATE_TASK_DRAFT:
        await handle_create_task_draft(live, user, command, correlation_id, ip)
    elif command.type == AgentCommandType.SHOW_PENDING_WORK:
        await handle_show_pending_work(live, correlation_id)
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
    live.memory.record_investigation_started(investigation_id=plan.investigation_id, goal=plan.goal, investigation_type=plan.type.value)
    if command.equipment_query:
        live.memory.record_entity(entity_id=new_working_memory_entity_id("equipment", command.equipment_query), label=command.equipment_query, entity_type="equipment")

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

    # Etapa 6: memoria de sesion + episodica + working memory - una
    # investigacion terminada es un episodio (seccion 3.3), y si tenia un
    # equipo especifico como foco, ese equipo pasa a seguimiento operacional
    # (seccion 3.2) con el resultado como 'current_issue'.
    live.memory.record_investigation_completed(investigation_id=plan.investigation_id, summary=conclusion.summary)
    episodic_memory.record_investigation_episode(
        investigation_id=plan.investigation_id, investigation_type=plan.type.value, goal=plan.goal,
        company_id=live.session.company_id, site_id=live.session.site_id,
        entity_ids=plan.scope.equipment_ids, evidence_ids=[e.evidence_id for e in evidence],
        outcome=conclusion.summary, created_by=usuario,
    )
    focus_entity = live.focus_override or (plan.scope.equipment_ids[0] if plan.scope.equipment_ids else None)
    if focus_entity:
        has_deviation = bool(conclusion.probable_causes) or any(h.status == "probable" for h in hyps)
        working_memory.track_entity(
            entity=focus_entity, entity_type="equipment", company_id=live.session.company_id, site_id=live.session.site_id,
            shift=plan.scope.shift, current_issue=conclusion.summary,
            metric_value=1.0 if has_deviation else 0.0, metric_label="investigation_deviation_flag",
            metric_direction="higher_is_worse", investigation_id=plan.investigation_id, created_by=usuario,
        )
        if not has_deviation:
            working_memory.resolve_entity(new_working_memory_entity_id("equipment", focus_entity))

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


async def speak_now(live: LiveSession, correlation_id: str, *, text: str, priority: str, segment_id: str) -> None:
    """Envoltorio publico de `_speak` (Etapa 6): permite que codigo fuera de
    este modulo (notification_manager.py, disparado por un scheduler en vez
    de un mensaje WS entrante) hable sobre una sesion viva sin duplicar la
    logica de emision de eventos."""
    await _speak(live, correlation_id, text=text, priority=priority, segment_id=segment_id)


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


# ── Etapa 6: memoria, continuidad, proactividad, work products ────────────

def _resolve_reference_entity(live: LiveSession, command: AgentCommand) -> tuple[str, str] | None:
    """Resuelve a que entidad se refiere el usuario (seccion 6 del brief):
    prioridad = entidad explicita en el comando > ultima entidad de memoria
    de sesion. Nunca adivina si no hay ninguna de las dos - mejor preguntar
    que asumir mal."""
    if command.equipment_query:
        return "equipment", command.equipment_query
    if live.memory.last_entity_id and live.memory.last_entity_label:
        return live.memory.last_entity_type or "equipment", live.memory.last_entity_label
    return None


async def handle_recall_operational_context(live: LiveSession, user: dict, command: AgentCommand, correlation_id: str, ip: str) -> None:
    """'¿Sigue ocurriendo lo de la Pala 03?' (seccion 6): se resuelve
    PRIMERO por memoria estructurada (working memory + episodica), nunca
    recurriendo de entrada a un LLM."""
    usuario = str(user.get("sub") or "anon")
    reference = _resolve_reference_entity(live, command)
    if reference is None:
        await emit(live, "agent.error", correlation_id=correlation_id, payload={
            "message": "No identifiqué a qué equipo o situación te refieres. Especifica un equipo (por ejemplo, Pala 03).",
            "recoverable": True,
        })
        return
    entity_type, entity = reference

    retriever = memory_retrieval.MemoryRetriever(company_id=live.session.company_id, site_id=live.session.site_id)
    result = retriever.recall_entity(entity_type, entity)
    runtime_audit.record_memory_retrieved(usuario=usuario, ip=ip, session_id=live.session.session_id, query_entity=entity, found=result.found)

    await emit(live, "memory.recalled", correlation_id=correlation_id, payload={
        "queryEntity": entity, "items": [i.model_dump(mode="json") for i in result.items()],
    })
    text = result.as_spoken_summary()
    if result.working_memory_entity and result.working_memory_entity.status in ("ongoing", "worsening", "new"):
        text += " Puedo reabrir la investigación si quieres revisarlo de nuevo."
    await emit(live, "agent.text.delta", correlation_id=correlation_id, payload={"text": text})
    await _speak(live, correlation_id, text=text[:260], priority="status", segment_id=f"seg-{uuid.uuid4().hex[:10]}")


async def handle_compare_with_memory(live: LiveSession, user: dict, command: AgentCommand, correlation_id: str, ip: str) -> None:
    """'Compáralo con lo anterior' / '¿qué cambió desde que lo revisamos?'
    (seccion 6): compara el ULTIMO valor conocido (working memory) contra el
    estado actual - nunca inventa un numero para el 'antes' si no hay
    registro."""
    usuario = str(user.get("sub") or "anon")
    reference = _resolve_reference_entity(live, command)
    if reference is None:
        await emit(live, "agent.error", correlation_id=correlation_id, payload={
            "message": "No identifiqué con qué comparar. Especifica un equipo o situación primero.", "recoverable": True,
        })
        return
    entity_type, entity = reference
    entity_id = new_working_memory_entity_id(entity_type, entity)
    previous = working_memory.get_entity(entity_id)

    if not previous or previous.last_metric_value is None:
        text = f"No tengo un valor anterior registrado para {entity} con el que comparar."
        await emit(live, "agent.text.delta", correlation_id=correlation_id, payload={"text": text})
        await _speak(live, correlation_id, text=text, priority="status", segment_id=f"seg-{uuid.uuid4().hex[:10]}")
        return

    runtime_audit.record_memory_retrieved(usuario=usuario, ip=ip, session_id=live.session.session_id, query_entity=entity, found=True)
    text = (
        f"La última vez que revisé {entity} ({previous.last_verified_at}), {previous.current_issue} "
        f"Estado actual: {previous.status}."
    )
    await emit(live, "memory.recalled", correlation_id=correlation_id, payload={
        "queryEntity": entity, "items": [i.model_dump(mode="json") for i in retrieval_items(previous)],
    })
    await _speak(live, correlation_id, text=text[:260], priority="status", segment_id=f"seg-{uuid.uuid4().hex[:10]}")


def retrieval_items(entity):
    from app.ai.memory.retrieval import MemoryRecallItem
    return [MemoryRecallItem(
        kind="working_memory", ref_id=entity.entity_id, label=f"{entity.entity}: {entity.current_issue}",
        status=entity.status, occurred_at=entity.last_verified_at, source="working_memory",
        related_investigation_ids=entity.related_investigation_ids,
    )]


async def handle_reopen_investigation(live: LiveSession, user: dict, command: AgentCommand, correlation_id: str, ip: str) -> None:
    """'Reabre esa investigación' (seccion 6): resuelve la investigacion
    referida via memoria de sesion (ultima investigacion) o memoria de
    trabajo (related_investigation_ids de la entidad mencionada), y arranca
    una nueva investigacion del MISMO tipo con el MISMO foco - no reabre el
    resultado viejo (esta cerrado), genera una nueva pasada actualizada."""
    investigation_type_value = live.memory.last_investigation_type
    equipment_query = command.equipment_query or live.memory.last_entity_label

    if not investigation_type_value and equipment_query:
        entity_id = new_working_memory_entity_id("equipment", equipment_query)
        entity = working_memory.get_entity(entity_id)
        if entity and entity.related_investigation_ids:
            from app.ai.investigation_repository import get_investigation
            row = get_investigation(entity.related_investigation_ids[-1])
            if row:
                investigation_type_value = row.get("type")

    if not investigation_type_value:
        await emit(live, "agent.error", correlation_id=correlation_id, payload={
            "message": "No identifiqué qué investigación reabrir. Especifica el equipo o pide la investigación de nuevo.",
            "recoverable": True,
        })
        return

    from app.ai.investigation_schemas import InvestigationType
    try:
        investigation_type = InvestigationType(investigation_type_value)
    except ValueError:
        await emit(live, "agent.error", correlation_id=correlation_id, payload={
            "message": "No pude identificar el tipo de la investigación anterior.", "recoverable": True,
        })
        return

    synthetic_command = AgentCommand(
        type=AgentCommandType.START_INVESTIGATION, raw_text=command.raw_text,
        investigation_type=investigation_type, equipment_query=equipment_query,
    )
    await emit(live, "agent.text.delta", correlation_id=correlation_id, payload={"text": "Reabriendo la investigación con datos actuales..."})
    await start_investigation(live, user, synthetic_command, correlation_id, ip)


async def handle_create_watch(live: LiveSession, user: dict, command: AgentCommand, correlation_id: str, ip: str) -> None:
    """'Avísame si vuelve a empeorar' (seccion 12): crea un AgentWatch
    concreto sobre la ultima entidad referenciada, con baseline tomado de la
    working memory (o de la investigacion recien terminada) - nunca un
    watch generico sin entidad ni metrica."""
    usuario = str(user.get("sub") or "anon")
    reference = _resolve_reference_entity(live, command)
    if reference is None:
        await emit(live, "agent.error", correlation_id=correlation_id, payload={
            "message": "No identifiqué qué debo vigilar. Investiga un equipo primero o especifica cuál.", "recoverable": True,
        })
        return
    entity_type, entity = reference
    entity_id = new_working_memory_entity_id(entity_type, entity)
    baseline = working_memory.get_entity(entity_id)

    try:
        watch = subscriptions.create_watch(
            user_id=usuario, company_id=live.session.company_id, site_id=live.session.site_id,
            entity_ids=[entity], entity_label=entity, metric=(baseline.last_metric_label if baseline else "variacion_pct"),
            condition="above", threshold=(baseline.last_metric_value if baseline else None),
            baseline_reference=baseline.entity_id if baseline else None,
            source_investigation_id=(baseline.related_investigation_ids[-1] if baseline and baseline.related_investigation_ids else None),
        )
    except subscriptions.WatchLimitExceeded:
        await emit(live, "agent.error", correlation_id=correlation_id, payload={
            "message": "Alcanzaste el límite de seguimientos activos. Cancela alguno antes de crear otro.", "recoverable": True,
        })
        return

    live.memory.record_entity(entity_id=entity_id, label=entity, entity_type=entity_type)
    runtime_audit.record_watch_created(usuario=usuario, ip=ip, watch_id=watch.watch_id, entity_ids=[entity], metric=watch.metric)
    await emit(live, "watch.created", correlation_id=correlation_id, payload={"watch": watch.model_dump(mode="json")})
    text = f"Voy a avisarte si {entity} vuelve a empeorar. Puedes cancelar este seguimiento cuando quieras."
    await emit(live, "agent.text.delta", correlation_id=correlation_id, payload={"text": text})
    await _speak(live, correlation_id, text=text, priority="status", segment_id=f"seg-{uuid.uuid4().hex[:10]}")


async def handle_cancel_watch(live: LiveSession, user: dict, command: AgentCommand, correlation_id: str, ip: str) -> None:
    usuario = str(user.get("sub") or "anon")
    entity = command.equipment_query or live.memory.last_entity_label
    watch = subscriptions.cancel_watch_by_entity(usuario, entity) if entity else None
    if not watch:
        active = subscriptions.list_active_for_user(usuario)
        if len(active) == 1:
            watch = subscriptions.cancel_watch(active[0].watch_id, usuario)
    if not watch:
        await emit(live, "agent.error", correlation_id=correlation_id, payload={
            "message": "No encontré un seguimiento activo para cancelar con esa referencia.", "recoverable": True,
        })
        return
    runtime_audit.record_watch_cancelled(usuario=usuario, ip=ip, watch_id=watch.watch_id)
    await emit(live, "watch.cancelled", correlation_id=correlation_id, payload={"watch": watch.model_dump(mode="json")})
    text = f"Cancelé el seguimiento de {watch.entity_label or ', '.join(watch.entity_ids)}."
    await emit(live, "agent.text.delta", correlation_id=correlation_id, payload={"text": text})
    await _speak(live, correlation_id, text=text, priority="status", segment_id=f"seg-{uuid.uuid4().hex[:10]}")


async def handle_set_quiet_mode(live: LiveSession, command: AgentCommand, correlation_id: str) -> None:
    """Seccion 16: normal/visual_only/quiet/critical_only, resuelto
    deterministicamente por el Command Router - aca solo se aplica y se
    confirma. Si trae duracion, se agenda un revert automatico a 'normal'."""
    mode = command.quiet_mode or "normal"
    live.quiet_mode = mode
    await emit(live, "quiet_mode.changed", correlation_id=correlation_id, payload={"mode": mode, "durationMinutes": command.quiet_duration_minutes})

    labels = {"normal": "modo normal", "visual_only": "solo visual, sin voz", "quiet": "silencio", "critical_only": "solo avisos críticos"}
    text = f"Listo, {labels.get(mode, mode)} activado."
    if command.quiet_duration_minutes:
        text += f" Vuelvo a modo normal en {command.quiet_duration_minutes} minutos."
        asyncio.create_task(_revert_quiet_mode_after(live, command.quiet_duration_minutes * 60))
    await emit(live, "agent.text.delta", correlation_id=correlation_id, payload={"text": text})
    if mode != "quiet":
        await _speak(live, correlation_id, text=text, priority="status", segment_id=f"seg-{uuid.uuid4().hex[:10]}")


async def _revert_quiet_mode_after(live: LiveSession, seconds: float) -> None:
    await asyncio.sleep(seconds)
    live.quiet_mode = "normal"


async def handle_generate_report(live: LiveSession, user: dict, command: AgentCommand, correlation_id: str, ip: str) -> None:
    """'Genera un informe de esta investigación' (seccion 17-21): si hay una
    investigacion activa o reciente, INVESTIGATION_REPORT sobre ella; si no,
    SHIFT_REPORT del estado actual. El informe queda como Work Product
    persistente, nunca solo como texto de chat (seccion 18)."""
    usuario = str(user.get("sub") or "anon")
    investigation_id = live.memory.active_investigation_id or live.memory.last_investigation_id
    report_type = "INVESTIGATION_REPORT" if investigation_id else "SHIFT_REPORT"

    await emit(live, "agent.text.delta", correlation_id=correlation_id, payload={"text": "Generando el informe con la evidencia disponible..."})
    scope = ReportScope(shift=live.perception.shift, audience="supervisor")
    report = reports_module.build_report(
        report_type=report_type, scope=scope, generated_by=usuario,
        company_id=live.session.company_id, site_id=live.session.site_id, investigation_id=investigation_id,
    )
    from app.ai.work_products import persistence as work_products_persistence
    work_products_persistence.save_report_version(report)
    live.memory.record_report(report_id=report.report_id)
    runtime_audit.record_report_generated(usuario=usuario, ip=ip, report_id=report.report_id, report_type=report_type)

    await emit(live, "work_product.ready", correlation_id=correlation_id, payload={
        "productType": "report", "id": report.report_id, "report": report.model_dump(mode="json"),
    })
    text = f"Informe {report_type.replace('_', ' ').lower()} preparado como borrador, pendiente de tu validación."
    await _speak(live, correlation_id, text=text, priority="result", segment_id=f"seg-{uuid.uuid4().hex[:10]}")


async def handle_generate_handover(live: LiveSession, user: dict, correlation_id: str, ip: str) -> None:
    """'Prepárame el cambio de turno' (seccion 22-23): recopila fuentes
    reales, genera el borrador, lo abre como Work Product, y dice SOLO un
    resumen corto - nunca lee el informe completo (seccion 23)."""
    usuario = str(user.get("sub") or "anon")
    await emit(live, "agent.text.delta", correlation_id=correlation_id, payload={"text": "Preparando el cambio de turno con la información disponible..."})

    handover = handover_module.build_handover(
        generated_by=usuario, company_id=live.session.company_id, site_id=live.session.site_id, shift=live.perception.shift,
    )
    live.memory.record_handover(handover_id=handover.handover_id)
    runtime_audit.record_handover_generated(usuario=usuario, ip=ip, handover_id=handover.handover_id)

    pending_count = len([p for p in handover.pending_for_next_shift if "Sin pendientes" not in p])
    await emit(live, "work_product.ready", correlation_id=correlation_id, payload={
        "productType": "handover", "id": handover.handover_id, "handover": handover.model_dump(mode="json"),
    })
    text = f"Borrador de cambio de turno preparado."
    text += f" Hay {pending_count} pendiente(s) que requieren revisión." if pending_count else " No quedan pendientes registrados."
    await _speak(live, correlation_id, text=text, priority="result", segment_id=f"seg-{uuid.uuid4().hex[:10]}")


async def handle_modify_report(live: LiveSession, user: dict, command: AgentCommand, correlation_id: str, ip: str) -> None:
    """Edicion por voz de un informe (seccion 24): cada modificacion crea
    una NUEVA version con diff auditable - nunca sobrescribe. Solo aplica
    modificaciones que puede interpretar deterministicamente; para el resto,
    reconoce el pedido pero no fabrica un cambio que no puede verificar."""
    usuario = str(user.get("sub") or "anon")
    report_id = live.memory.last_report_id
    if not report_id:
        await emit(live, "agent.error", correlation_id=correlation_id, payload={
            "message": "No hay un informe activo para modificar. Genera un informe primero.", "recoverable": True,
        })
        return
    report = versions_module.get_version(report_id)
    if not report:
        await emit(live, "agent.error", correlation_id=correlation_id, payload={"message": "No encontré ese informe.", "recoverable": True})
        return

    text_lower = (command.report_modification or "").lower()
    applied = False
    new_sections = None

    if "ejecutivo" in text_lower:
        new_scope = report.scope.model_copy(update={"audience": "executive"})
        rebuilt = reports_module.build_report(
            report_type=report.report_type, scope=new_scope, generated_by=report.generated_by,
            company_id=report.company_id, site_id=report.site_id, investigation_ids=report.investigation_ids and report.investigation_ids[0] or None,
            title=report.title,
        )
        new_sections = rebuilt.sections
        applied = True
    elif "elimina" in text_lower and "recomendaci" in text_lower:
        new_sections = [
            s.model_copy(update={"content": "Sección eliminada a pedido del usuario."}) if s.title == "Recomendaciones" else s
            for s in report.sections
        ]
        applied = True

    updated = versions_module.apply_modification(
        report, modification_summary=command.report_modification or command.raw_text, modified_by=usuario, new_sections=new_sections,
    )
    runtime_audit.record_report_modified(usuario=usuario, ip=ip, report_id=report_id, version=updated.version, modification_preview=command.raw_text)
    await emit(live, "work_product.ready", correlation_id=correlation_id, payload={
        "productType": "report", "id": updated.report_id, "report": updated.model_dump(mode="json"),
    })
    text = f"Informe actualizado a la versión {updated.version}." if applied else (
        f"Registré el cambio pedido en el historial del informe (versión {updated.version}), pero no pude aplicarlo automáticamente - revísalo en el panel."
    )
    await _speak(live, correlation_id, text=text, priority="status", segment_id=f"seg-{uuid.uuid4().hex[:10]}")


async def handle_create_task_draft(live: LiveSession, user: dict, command: AgentCommand, correlation_id: str, ip: str) -> None:
    """'Crea una tarea para revisar esto' (seccion 25-26): el borrador queda
    trazado a la investigacion/hallazgos activos si existen - nunca se
    aprueba, asigna ni cierra automaticamente."""
    usuario = str(user.get("sub") or "anon")
    reference = _resolve_reference_entity(live, command)
    entity_ids = [reference[1]] if reference else []
    investigation_id = live.memory.active_investigation_id or live.memory.last_investigation_id

    task = tasks_module.create_task_draft(
        title=(command.task_description or command.raw_text)[:120],
        description=command.task_description or command.raw_text,
        reason=live.memory.active_investigation_summary or "Solicitado directamente por el usuario.",
        entity_ids=entity_ids, investigation_id=investigation_id, created_by=usuario,
        company_id=live.session.company_id, site_id=live.session.site_id,
    )
    runtime_audit.record_task_draft_created(usuario=usuario, ip=ip, task_id=task.task_id, investigation_id=investigation_id)
    await emit(live, "work_product.ready", correlation_id=correlation_id, payload={"productType": "task", "id": task.task_id, "task": task.model_dump(mode="json")})
    text = "Tarea creada como borrador, pendiente de tu aprobación."
    await emit(live, "agent.text.delta", correlation_id=correlation_id, payload={"text": text})
    await _speak(live, correlation_id, text=text, priority="status", segment_id=f"seg-{uuid.uuid4().hex[:10]}")


async def handle_show_pending_work(live: LiveSession, correlation_id: str) -> None:
    """'¿Qué tengo pendiente?' (seccion 25 y 28): tareas abiertas + watches
    activos, sin repetir lo mismo si ya se pidio hace poco (InitiativeBudget
    aplica solo a proactividad NO solicitada - esto es a pedido explicito,
    siempre responde)."""
    company_id, site_id = live.session.company_id, live.session.site_id
    pending_tasks = tasks_module.list_pending(company_id=company_id, site_id=site_id)
    active_watches = subscriptions.list_active_for_user(live.session.user_id)

    await emit(live, "work_product.ready", correlation_id=correlation_id, payload={
        "productType": "pending_work_summary",
        "tasks": [t.model_dump(mode="json") for t in pending_tasks],
        "watches": [w.model_dump(mode="json") for w in active_watches],
    })
    if not pending_tasks and not active_watches:
        text = "No tienes tareas ni seguimientos pendientes."
    else:
        parts = []
        if pending_tasks:
            parts.append(f"{len(pending_tasks)} tarea(s) pendiente(s)")
        if active_watches:
            parts.append(f"{len(active_watches)} seguimiento(s) activo(s)")
        text = " y ".join(parts) + "."
    await emit(live, "agent.text.delta", correlation_id=correlation_id, payload={"text": text})
    await _speak(live, correlation_id, text=text, priority="status", segment_id=f"seg-{uuid.uuid4().hex[:10]}")
