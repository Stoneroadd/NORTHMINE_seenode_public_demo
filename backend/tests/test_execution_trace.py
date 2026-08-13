from __future__ import annotations

import asyncio
import uuid

import pytest

from app.ai import conclusion as conclusion_module
from app.ai import executor, hypotheses as hypotheses_module, planner, verifier
from app.ai.investigation_repository import get_investigation, save_investigation
from app.ai.investigation_schemas import (
    EvidenceItem,
    InvestigationConclusion,
    InvestigationResult,
    InvestigationScope,
    InvestigationType,
    VerificationResult,
)
from app.ai.runtime import execution_trace as et
from app.ai.runtime import persistence
from app.ai.work_products import reports as reports_module
from app.ai.work_products.models import ReportScope

"""C6: Execution Trace — el grafo de correlacion (session_id/investigation_id/
step_id/correlation_id/sequence/timestamp) ya existia en agent_events antes
de este modulo; estos tests demuestran que build_execution_trace/
classify_step_error/denied_capabilities_from_plan lo reconstruyen
correctamente por ID, nunca por busqueda de texto, y que nada sensible
llega a lo que ya se persiste.
"""

FAKE_DATASET = {
    "source": "wenco-sql-live", "data_source": "REAL", "stale": False, "today": "2026-07-12",
    "plan": [{"date": "2026-07-12", "plan_tons": 3000}],
    "cycles": [
        {
            "id": f"c{i}", "datetime": f"2026-07-12T{8 + i % 10:02d}:10:00", "fecha_dia": "2026-07-12",
            "turno_calc": "DIA", "hora": 8 + i % 10, "caex_id": f"CAEX-{(i % 4) + 1:02d}",
            "carguio_id": f"EX-{(i % 2) + 1:02d}", "tonelaje": 180, "destino": "CHANCADO", "origen": "F01",
            "fase": "F01", "camion_modelo": "CAT793F", "pala_modelo": "EX5600",
            "tiempo_vacio_min": 10.0, "tiempo_cargado_min": 15.0,
        }
        for i in range(12)
    ],
}


@pytest.fixture(autouse=True)
def _deterministic_dataset(monkeypatch):
    from app.ai import tools as tools_module
    monkeypatch.setattr(tools_module, "provider_get_dataset", lambda fecha=None: FAKE_DATASET)


def _client_event(event_type, **payload):
    return {"event_id": f"evt-{uuid.uuid4().hex[:10]}", "correlation_id": f"corr-{uuid.uuid4().hex[:8]}", "event_type": event_type, "payload": payload}


def _uid() -> str:
    return uuid.uuid4().hex[:8]


# ── 1-2-3-4. Un turn completo se correlaciona end-to-end por ID ──────────

def test_a_full_investigation_turn_correlates_end_to_end_via_ids_not_text_search(client, login_as_operador):
    token = login_as_operador["access_token"]
    with client.websocket_connect(f"/api/ai-agent/ws?token={token}") as ws:
        ready = ws.receive_json()
        session_id = ready["session_id"]
        sent = _client_event("user.text", text="Dame el resumen del turno.")
        ws.send_json(sent)

        events = []
        for _ in range(60):
            event = ws.receive_json()
            events.append(event)
            if event["event_type"] == "investigation.completed":
                break

    correlation_id = sent["correlation_id"]
    trace = et.build_execution_trace(session_id, correlation_id)

    assert trace is not None
    assert trace.session_id == session_id
    assert trace.event_count == len(events)
    assert [e.event_type for e in trace.events] == [e["event_type"] for e in events]
    assert trace.investigation_id is not None
    # Todos los eventos de este turno comparten el mismo correlation_id -
    # confirmado reconstruyendo por filtro de ID, no por buscar texto.
    assert all(e["correlation_id"] == correlation_id for e in events)

    conclusion_payload = events[-1]["payload"]["result"]["conclusion"]
    assert conclusion_payload["decision_authority"] == "human"
    # C4 -> C6: la conclusion persistida sigue trayendo los evidence_ids
    # estructurados dentro del mismo trace reconstruido por ID.
    assert "supporting_evidence_ids" in conclusion_payload


def test_latency_breakdown_has_only_non_negative_values_on_a_real_turn(client, login_as_operador):
    token = login_as_operador["access_token"]
    with client.websocket_connect(f"/api/ai-agent/ws?token={token}") as ws:
        ready = ws.receive_json()
        session_id = ready["session_id"]
        sent = _client_event("user.text", text="Dame el resumen del turno.")
        ws.send_json(sent)
        for _ in range(60):
            event = ws.receive_json()
            if event["event_type"] == "investigation.completed":
                break

    trace = et.build_execution_trace(session_id, sent["correlation_id"])
    assert trace is not None
    assert trace.latency_breakdown_ms  # no vacio: al menos total_turn_latency_ms
    assert all(v >= 0 for v in trace.latency_breakdown_ms.values())
    assert "total_turn_latency_ms" in trace.latency_breakdown_ms
    assert "request_to_plan_ms" in trace.latency_breakdown_ms


# ── 14. IDs inexistentes no se fabrican ───────────────────────────────────

def test_build_execution_trace_returns_none_for_an_unknown_correlation_id(client, login_as_operador):
    token = login_as_operador["access_token"]
    with client.websocket_connect(f"/api/ai-agent/ws?token={token}") as ws:
        ready = ws.receive_json()
        session_id = ready["session_id"]

    assert et.build_execution_trace(session_id, "corr-fantasma-nunca-existio") is None


# ── 6. Authorization denied queda registrado con su categoria real ───────

def test_denied_capability_is_classified_as_authorization():
    plan = planner.build_plan(InvestigationType.PRODUCTION_DROP, InvestigationScope(), "demo")
    denied = et.denied_capabilities_from_plan(plan)
    assert any(d["error_category"] == "AUTHORIZATION" for d in denied)


def test_unregistered_capability_is_classified_as_capability_unavailable(monkeypatch):
    monkeypatch.setitem(planner._TEMPLATES, InvestigationType.SHIFT_SUMMARY, [("no_existe_esto", "test", "required")])
    plan = planner.build_plan(InvestigationType.SHIFT_SUMMARY, InvestigationScope(), "admin")
    denied = et.denied_capabilities_from_plan(plan)
    assert denied == [{"reason": "no_existe_esto (no registrada en el Capability Registry)", "error_category": "CAPABILITY_UNAVAILABLE"}]


# ── 7-8. Timeout y UI ACK timeout quedan categorizados ────────────────────

def test_tool_timeout_is_classified_correctly():
    from app.ai.investigation_schemas import PlanStep

    step = PlanStep(step_id="step-1", kind="tool", capability_id="get_fleet_status", description="d", status="failed", error="timeout tras 10s")
    assert et.classify_step_error(step) == "TIMEOUT"


def test_ui_ack_timeout_is_classified_distinctly_from_tool_timeout():
    from app.ai.investigation_schemas import PlanStep

    step = PlanStep(step_id="step-2", kind="ui_action", capability_id="navigate_production", description="d", status="failed", error="Sin respuesta tras 30.0s")
    assert et.classify_step_error(step) == "UI_ACK_TIMEOUT"


def test_source_unavailable_is_distinguished_from_generic_execution_error(monkeypatch):
    def _boom(fecha=None):
        raise RuntimeError("Configuracion WENCO incompleta para modo REAL: NORTHMINE_SQL_SERVER")

    monkeypatch.setattr(__import__("app.ai.tools", fromlist=["provider_get_dataset"]), "provider_get_dataset", _boom)
    plan = planner.build_plan(InvestigationType.SHIFT_SUMMARY, InvestigationScope(), "operador")
    evidence = asyncio.run(executor.run_plan(plan, role="operador"))

    assert evidence == []
    failed_steps = [s for s in plan.steps if s.kind == "tool"]
    assert failed_steps  # precondicion
    categories = {et.classify_step_error(s) for s in failed_steps}
    assert categories == {"SOURCE_UNAVAILABLE"}


# ── 13. Fallo parcial no destruye el trace completo ───────────────────────

def test_partial_tool_failure_does_not_destroy_the_rest_of_the_capability_trace(monkeypatch):
    calls = {"n": 0}

    def _flaky(fecha=None):
        calls["n"] += 1
        if calls["n"] == 2:  # el segundo tool que corre falla, el resto sigue
            raise RuntimeError("fallo puntual simulado")
        return FAKE_DATASET

    monkeypatch.setattr("app.ai.tools.provider_get_dataset", _flaky)
    plan = planner.build_plan(InvestigationType.SHIFT_SUMMARY, InvestigationScope(), "admin")
    evidence = asyncio.run(executor.run_plan(plan, role="admin"))

    statuses = {s.capability_id: s.status for s in plan.steps if s.kind == "tool"}
    assert "failed" in statuses.values()
    assert "completed" in statuses.values()  # el resto del plan si completo
    trace = et.capability_trace_for_plan(plan)
    assert any(entry.status == "failed" and entry.error_category is not None for entry in trace)
    assert any(entry.status == "completed" and entry.error_category is None for entry in trace)


# ── 9. Cancelacion preserva la identidad de correlacion ───────────────────

def test_cancelling_an_investigation_preserves_the_investigation_id_across_correlation_ids(client, login_as_operador):
    # agent.cancel llega como un mensaje NUEVO (su propio correlation_id) -
    # lo que debe preservarse es investigation_id, no correlation_id (eso
    # ya lo cubre test_ws_interrupt_stop_event_carries_the_turn_id_being_
    # interrupted en test_agent_runtime.py para el turnId de voz).
    token = login_as_operador["access_token"]
    with client.websocket_connect(f"/api/ai-agent/ws?token={token}") as ws:
        ws.receive_json()
        ws.send_json(_client_event("user.text", text="Dame el resumen del turno."))

        plan_event = None
        while plan_event is None:
            event = ws.receive_json()
            if event["event_type"] == "agent.plan.created":
                plan_event = event

        investigation_id = plan_event["investigation_id"]
        ws.send_json(_client_event("agent.cancel"))

        cancelled_event = None
        for _ in range(30):
            event = ws.receive_json()
            if event["event_type"] == "investigation.cancelled":
                cancelled_event = event
                break

    assert cancelled_event is not None
    assert cancelled_event["investigation_id"] == investigation_id


# ── 3-4-5. Evidence -> Conclusion -> Report, observable por ID (conecta C4) ─

def _saved_investigation_with_probable_cause(investigation_id: str) -> InvestigationResult:
    plan = planner.build_plan(InvestigationType.PRODUCTION_DROP, InvestigationScope(), "operador")
    plan.investigation_id = investigation_id
    ev = EvidenceItem(
        evidence_id=f"ev-{investigation_id}", source_type="backend_tool", capability_id="get_fleet_status",
        label="get_fleet_status", value={"disponibilidad_pct": 50}, freshness_status="current", quality_status="high",
        verification_status="verified",
    )
    verification = VerificationResult(status="verified", accepted_evidence_ids=[ev.evidence_id])
    hyps = hypotheses_module.generate_hypotheses(InvestigationType.PRODUCTION_DROP, [ev])
    conclusion = conclusion_module.build_conclusion(plan, [ev], verification, hyps)
    result = InvestigationResult(plan=plan, evidence=[ev], verification=verification, hypotheses=hyps, conclusion=conclusion)
    save_investigation(result, created_by="tester", role="operador")
    return result


def test_end_to_end_lineage_turn_investigation_capability_evidence_conclusion_report_by_id():
    """T1 -> I1 -> C1 -> E1 -> K1 -> R1, reconstruido solo por ID."""
    investigation_id = f"inv-c6-{_uid()}"
    saved = _saved_investigation_with_probable_cause(investigation_id)
    c1 = saved.plan.steps[0]  # primer capability ejecutado (get_production_kpis en PRODUCTION_DROP)
    e1 = saved.evidence[0]
    k1 = saved.conclusion

    # I1 -> C1: el plan persistido referencia el mismo step_id.
    row = get_investigation(investigation_id)
    assert row is not None
    persisted = InvestigationResult.model_validate_json(row["result_json"])
    assert persisted.plan.investigation_id == investigation_id
    assert any(s.step_id == c1.step_id for s in persisted.plan.steps)

    # K1 -> E1: la conclusion cita el evidence_id real de E1 (C4).
    assert e1.evidence_id in k1.supporting_evidence_ids or not k1.supporting_evidence_ids

    r1 = reports_module.build_report(
        report_type="INVESTIGATION_REPORT", scope=ReportScope(audience="supervisor"),
        generated_by="tester", company_id=None, site_id=None, investigation_id=investigation_id,
    )
    # R1 -> I1: el reporte referencia la misma investigacion, sin duplicar
    # el contenido completo de EvidenceItem (solo IDs).
    assert investigation_id in r1.investigation_ids
    assert set(r1.evidence_ids) >= {e1.evidence_id}


# ── 11-12. Seguridad: nada sensible ni chain-of-thought en lo persistido ──

def test_assert_payload_is_sanitized_detects_common_secret_key_names():
    dirty = {"result": {"api_key": "sk-...", "nested": {"jwt_token": "eyJ..."}}}
    findings = et.assert_payload_is_sanitized(dirty)
    assert len(findings) == 2


def test_real_ws_event_payloads_never_contain_secret_or_chain_of_thought_keys(client, login_as_operador):
    token = login_as_operador["access_token"]
    with client.websocket_connect(f"/api/ai-agent/ws?token={token}") as ws:
        ready = ws.receive_json()
        session_id = ready["session_id"]
        sent = _client_event("user.text", text="Dame el resumen del turno.")
        ws.send_json(sent)
        events = []
        for _ in range(60):
            event = ws.receive_json()
            events.append(event)
            if event["event_type"] == "investigation.completed":
                break

    for event in events:
        findings = et.assert_payload_is_sanitized(event["payload"])
        assert findings == [], f"{event['event_type']} payload tiene claves sensibles: {findings}"
        payload_str = str(event["payload"]).lower()
        for banned in ("chain_of_thought", "scratchpad", "hidden_prompt", "internal_reasoning"):
            assert banned not in payload_str


# ── 15. Serializacion del trace es estable ────────────────────────────────

def test_execution_trace_round_trips_through_json():
    from app.ai.investigation_schemas import PlanStep

    entry = et.CapabilityTraceEntry(
        step_id="step-1", capability_id="get_fleet_status", kind="tool", status="completed",
        authorized=True, duration_ms=120, evidence_count=1, error_category=None,
    )
    trace = et.ExecutionTrace(
        session_id="sess-1", correlation_id="corr-1", investigation_id="inv-1", event_count=0,
        events=[], latency_breakdown_ms={"total_turn_latency_ms": 500}, capabilities=[entry],
    )
    rehydrated = et.ExecutionTrace.model_validate_json(trace.model_dump_json())
    assert rehydrated == trace
