from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel

from app.ai.capabilities import get_capability
from app.ai.investigation_schemas import InvestigationPlan, PlanStep
from app.ai.runtime import persistence

"""Execution Trace (C6) — reconstruye la observabilidad de un turno a
partir de lo que el sistema YA persiste, en vez de agregar un sistema de
tracing paralelo.

Hallazgo central de la auditoria previa a este modulo: el grafo de
correlacion casi no tenia gaps reales. `correlation_id` ya se propaga
desde el evento disparador (user.text / user.speech.final) a traves de
TODA la cadena de dispatch_command -> start_investigation ->
_run_investigation -> cada _run_tool_step/_run_ui_action_step/
_emit_finding, y `agent_events` (runtime/persistence.py) ya persiste cada
evento con session_id + investigation_id + step_id + correlation_id +
sequence + timestamp reales. Lo que faltaba no era instrumentacion nueva
en cada punto de emision - era la RECONSTRUCCION de ese trace y el
calculo de latencias entre fases, que hoy nadie hacia aunque los datos ya
estaban ahi.

Nunca se agrega aca: razonamiento privado del modelo, prompts, scratchpads
ni chain-of-thought - `agent_events.payload_json` nunca los contuvo (ver
docstring de persistence.py) y este modulo solo LEE esa tabla, no agrega
campos nuevos a lo que se persiste.
"""

# ── Latencia: timestamp de auditoria (agent_events, reloj de pared) vs.
# duracion medida (PlanStep.duration_ms, time.perf_counter() en
# executor.py/runtime.py) NO son lo mismo - se exponen ambas, sin
# mezclarlas. Los deltas de aca son de grano de observabilidad (ms de
# turno completo), no de precision de benchmarking.

# El desglose de latencia (build_execution_trace) compara timestamps de
# los event_type reales de protocol.py (agent.plan.created, tool.started/
# ui_action.requested, verification.completed, investigation.completed) -
# ningun evento nuevo fue agregado para esto (seccion 4: "adaptar a los
# eventos reales existentes").

ErrorCategory = Literal[
    "VALIDATION", "AUTHORIZATION", "CAPABILITY_UNAVAILABLE", "SOURCE_UNAVAILABLE",
    "TIMEOUT", "EXECUTION_ERROR", "UI_ACK_TIMEOUT", "CANCELLED", "DEPENDENCY_ERROR",
]


class TraceEvent(BaseModel):
    event_id: str
    event_type: str
    step_id: str | None
    investigation_id: str | None
    sequence: int
    timestamp: datetime


class CapabilityTraceEntry(BaseModel):
    step_id: str
    capability_id: str
    kind: Literal["tool", "ui_action"]
    status: str
    authorized: bool
    duration_ms: int | None
    evidence_count: int
    error_category: ErrorCategory | None


class ExecutionTrace(BaseModel):
    session_id: str
    correlation_id: str
    investigation_id: str | None
    event_count: int
    events: list[TraceEvent]
    latency_breakdown_ms: dict[str, int]
    capabilities: list[CapabilityTraceEntry]


def _parse_ts(value: Any) -> datetime:
    return value if isinstance(value, datetime) else datetime.fromisoformat(str(value))


def build_execution_trace(session_id: str, correlation_id: str) -> ExecutionTrace | None:
    """Reconstruye el trace completo de un turno/investigacion por ID -
    nunca por busqueda de texto. Devuelve None si no hay eventos (id
    inexistente o sesion distinta) en vez de fabricar un trace vacio con
    apariencia de datos reales."""
    rows = persistence.get_events_by_correlation(session_id, correlation_id)
    if not rows:
        return None

    events = [
        TraceEvent(
            event_id=row["event_id"], event_type=row["event_type"], step_id=row["step_id"],
            investigation_id=row["investigation_id"], sequence=row["sequence"], timestamp=_parse_ts(row["timestamp"]),
        )
        for row in rows
    ]
    investigation_id = next((e.investigation_id for e in events if e.investigation_id), None)

    by_type: dict[str, TraceEvent] = {}
    for e in events:
        by_type.setdefault(e.event_type, e)  # primera ocurrencia de cada tipo

    first_capability = next((e for e in events if e.event_type in ("tool.started", "ui_action.requested")), None)

    latency: dict[str, int] = {}
    if events:
        first_ts, last_ts = events[0].timestamp, events[-1].timestamp
        latency["total_turn_latency_ms"] = max(0, int((last_ts - first_ts).total_seconds() * 1000))
        if "agent.plan.created" in by_type:
            plan_ts = by_type["agent.plan.created"].timestamp
            latency["request_to_plan_ms"] = max(0, int((plan_ts - first_ts).total_seconds() * 1000))
            if first_capability:
                latency["plan_to_first_capability_ms"] = max(0, int((first_capability.timestamp - plan_ts).total_seconds() * 1000))
        if "verification.completed" in by_type and "investigation.completed" in by_type:
            latency["verification_to_conclusion_ms"] = max(
                0, int((by_type["investigation.completed"].timestamp - by_type["verification.completed"].timestamp).total_seconds() * 1000),
            )

    return ExecutionTrace(
        session_id=session_id, correlation_id=correlation_id, investigation_id=investigation_id,
        event_count=len(events), events=events, latency_breakdown_ms=latency, capabilities=[],
    )


def capability_trace_for_plan(plan: InvestigationPlan, *, evidence_counts: dict[str, int] | None = None) -> list[CapabilityTraceEntry]:
    """Observabilidad por capability (C5+C6): reusa PlanStep (ya trae
    status/duration_ms medido con time.perf_counter, ver executor.py) en
    vez de duplicar esa informacion en agent_events. Todo step presente en
    plan.steps YA fue autorizado por planner.py (una capability sin
    permiso o inexistente nunca se instancia como PlanStep - queda en
    plan.missing_capabilities, ver denied_capabilities_from_plan) - por
    eso authorized=True es incondicional aca, no una suposicion.
    evidence_counts es opcional: {step_id: cantidad de EvidenceItem que ese
    step produjo} si ya se calculo aparte; por defecto se asume 1 si el
    step 'tool' quedo 'completed', 0 en cualquier otro caso (un tool
    completado siempre produce exactamente un EvidenceItem, ver
    executor.py::run_plan)."""
    counts = evidence_counts or {}
    entries: list[CapabilityTraceEntry] = []
    for step in plan.steps:
        entries.append(
            CapabilityTraceEntry(
                step_id=step.step_id,
                capability_id=step.capability_id,
                kind="tool" if step.kind == "tool" else "ui_action",
                status=step.status,
                authorized=True,
                duration_ms=step.duration_ms,
                evidence_count=counts.get(step.step_id, 1 if (step.kind == "tool" and step.status == "completed") else 0),
                error_category=classify_step_error(step),
            )
        )
    return entries


def denied_capabilities_from_plan(plan: InvestigationPlan) -> list[dict[str, str]]:
    """Complemento de capability_trace_for_plan: las capabilities que
    NUNCA llegaron a ser PlanStep porque planner.py las rechazo antes
    (autorizacion o registro), con su categoria de error real."""
    return [
        {"reason": reason, "error_category": classify_missing_capability_reason(reason)}
        for reason in plan.missing_capabilities
    ]


def classify_missing_capability_reason(reason: str) -> ErrorCategory:
    """Clasifica una entrada de InvestigationPlan.missing_capabilities
    (planner.py) - AUTHORIZATION y CAPABILITY_UNAVAILABLE a nivel de PLAN
    viven aca, no en PlanStep.error, porque una capability no autorizada o
    inexistente nunca llega a instanciarse como PlanStep (ver planner.py::
    build_plan: se declara faltante y se salta, no se agrega un paso)."""
    text = reason.lower()
    if "sin permiso" in text:
        return "AUTHORIZATION"
    if "no registrada" in text:
        return "CAPABILITY_UNAVAILABLE"
    return "EXECUTION_ERROR"


def classify_step_error(step: PlanStep) -> ErrorCategory | None:
    """Taxonomia de error (seccion 9) para un PlanStep que SI se ejecuto:
    reutiliza el texto que executor.py/ui_actions.py YA producen (nunca se
    inventan excepciones nuevas) y lo clasifica en una de las 9 categorias
    pedidas. Un mensaje no reconocido cae en EXECUTION_ERROR en vez de
    quedar sin categoria - nunca None salvo que el step no haya fallado."""
    if step.status not in ("failed", "skipped", "cancelled", "rejected"):
        return None
    error = (step.error or "").lower()
    if not error:
        return None
    if step.status == "cancelled" or "cancelled" in error:
        return "CANCELLED"
    if "no registrada" in error:
        return "CAPABILITY_UNAVAILABLE"
    # ui_actions.py::wait_for_ack produce exactamente "Sin respuesta tras
    # {N}s" para un ACK que expira - se revisa ANTES que "timeout" tools
    # porque ese mismo texto no contiene la palabra "timeout" en espanol.
    if "sin respuesta tras" in error:
        return "UI_ACK_TIMEOUT"
    if "timeout" in error:
        return "TIMEOUT"
    if "wenco" in error or ("configuracion" in error and "incompleta" in error):
        return "SOURCE_UNAVAILABLE"
    if "rejected" in error or step.status == "rejected":
        return "EXECUTION_ERROR"
    # Dependencia: si la capability declara depends_on, un fallo aca casi
    # siempre es consecuencia de que la dependencia no se resolvio antes.
    capability = get_capability(step.capability_id)
    if capability and capability.depends_on:
        return "DEPENDENCY_ERROR"
    return "EXECUTION_ERROR"


# ── Sanitizacion (seccion 10) ─────────────────────────────────────────────

_SENSITIVE_KEY_MARKERS = (
    "api_key", "apikey", "token", "jwt", "password", "secret", "authorization",
    "cookie", "credential", "audio_bytes", "audio_data",
)


def assert_payload_is_sanitized(payload: dict[str, Any]) -> list[str]:
    """No modifica nada - solo detecta si un payload (el que ya se
    persiste en agent_events.payload_json) contiene una clave con nombre
    sensible, en cualquier nivel de anidamiento. Usado por tests, no por
    el runtime en caliente (evitar costo por evento)."""
    findings: list[str] = []

    def _walk(node: Any, path: str) -> None:
        if isinstance(node, dict):
            for key, value in node.items():
                key_lower = str(key).lower()
                if any(marker in key_lower for marker in _SENSITIVE_KEY_MARKERS):
                    findings.append(f"{path}.{key}" if path else str(key))
                _walk(value, f"{path}.{key}" if path else str(key))
        elif isinstance(node, list):
            for index, item in enumerate(node):
                _walk(item, f"{path}[{index}]")

    _walk(payload, "")
    return findings
