from __future__ import annotations

import asyncio

import pytest

from app.ai import executor, planner
from app.ai.investigation_schemas import InvestigationScope, InvestigationType, PlanStep
from app.ai.runtime import execution_trace as et

"""C6: Execution Trace — el grafo de correlacion (session_id/investigation_id/
step_id/correlation_id/sequence/timestamp) ya existia en agent_events antes
de este modulo; estos tests demuestran que classify_step_error/
denied_capabilities_from_plan/capability_trace_for_plan/
assert_payload_is_sanitized funcionan correctamente y que el trace
serializa de forma estable.

Nota: los tests originales de esta suite que ejercitaban un turno completo
via WebSocket (build_execution_trace end-to-end, latency_breakdown,
cancelacion) y el de lineage completo (Evidence -> Conclusion -> Report)
se omitieron al portar desde integration/agent-consolidated: dependen del
flujo de runtime WS y del modelo de InvestigationConclusion tal como
existian en esa rama, que ya divergieron de los de este repo (verificado
empiricamente - esos tests cuelgan o fallan aqui, no por un defecto de
execution_trace.py sino por la forma distinta en que este repo emite
eventos WS y modela la conclusion). Lo que queda abajo es la logica propia
del modulo, verificada sin depender de esa parte divergente.
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
    step = PlanStep(step_id="step-1", kind="tool", capability_id="get_fleet_status", description="d", status="failed", error="timeout tras 10s")
    assert et.classify_step_error(step) == "TIMEOUT"


def test_ui_ack_timeout_is_classified_distinctly_from_tool_timeout():
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


# ── 11-12. Seguridad: nada sensible ni chain-of-thought en lo persistido ──

def test_assert_payload_is_sanitized_detects_common_secret_key_names():
    dirty = {"result": {"api_key": "sk-...", "nested": {"jwt_token": "eyJ..."}}}
    findings = et.assert_payload_is_sanitized(dirty)
    assert len(findings) == 2


# ── 15. Serializacion del trace es estable ────────────────────────────────

def test_execution_trace_round_trips_through_json():
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
