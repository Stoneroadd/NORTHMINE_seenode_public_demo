from __future__ import annotations

import asyncio
import json

import pytest

from app.ai import conclusion as conclusion_module
from app.ai import executor, hypotheses as hypotheses_module, planner, verifier
from app.ai.investigation_repository import get_investigation
from app.ai.investigation_schemas import (
    EvidenceItem,
    InvestigationScope,
    InvestigationType,
    OUT_OF_SCOPE_MESSAGE,
)
from app.ai.planner import PlannerRejection
from tests.conftest import auth_header

"""Tests del motor de investigacion Planner-Executor-Verifier (Etapa 3).

Deterministicos por diseno: el pipeline completo (Planner, Executor para
pasos 'tool', Verifier, motor de hipotesis, Conclusion) no llama a ningun
proveedor de IA - los tests de integracion solo necesitan un dataset fijo
via monkeypatch de provider_get_dataset (mismo patron que
test_ai_copilot.py::test_get_alerts_tool_returns_deterministic_shape), sin
API key ni red.
"""


FAKE_DATASET = {
    "source": "wenco-sql-live",
    "data_source": "REAL",
    "stale": False,
    "today": "2026-07-12",
    "plan": [{"date": "2026-07-12", "plan_tons": 3000}],
    "cycles": [
        {
            "id": f"c{i}",
            "datetime": f"2026-07-12T{8 + i % 10:02d}:10:00",
            "fecha_dia": "2026-07-12",
            "turno_calc": "DIA",
            "hora": 8 + i % 10,
            "caex_id": f"CAEX-{(i % 4) + 1:02d}",
            "carguio_id": f"EX-{(i % 2) + 1:02d}",
            "tonelaje": 180,
            "destino": "CHANCADO",
            "origen": "F01",
            "fase": "F01",
            "camion_modelo": "CAT793F",
            "pala_modelo": "EX5600",
            "tiempo_vacio_min": 10.0,
            "tiempo_cargado_min": 15.0,
        }
        for i in range(12)
    ],
}


@pytest.fixture(autouse=True)
def _deterministic_dataset(monkeypatch):
    from app.ai import tools as tools_module

    monkeypatch.setattr(tools_module, "provider_get_dataset", lambda fecha=None: FAKE_DATASET)


# ── Planner ───────────────────────────────────────────────────────────────

def test_planner_rejects_unsupported_investigation_type():
    with pytest.raises(PlannerRejection):
        planner.build_plan("not_a_real_type", InvestigationScope(), "operador")  # type: ignore[arg-type]


@pytest.mark.parametrize(
    "investigation_type,expected_steps",
    [
        (InvestigationType.PRODUCTION_DROP, 12),
        (InvestigationType.CYCLE_TIME_INCREASE, 10),
        (InvestigationType.LOADING_UNIT_UNDERPERFORMANCE, 8),
        (InvestigationType.SHIFT_SUMMARY, 6),
    ],
)
def test_planner_builds_the_full_template_for_an_authorized_role(investigation_type, expected_steps):
    plan = planner.build_plan(investigation_type, InvestigationScope(), "operador")

    assert plan.type == investigation_type
    assert len(plan.steps) == expected_steps
    assert plan.missing_capabilities == []
    assert all(step.status == "pending" for step in plan.steps)
    # Los primeros pasos siempre son 'tool' y 'required' segun la plantilla base.
    assert plan.steps[0].kind == "tool"
    assert plan.steps[0].requirement == "required"


def test_planner_never_drops_a_mandatory_step_from_the_base_template():
    plan = planner.build_plan(InvestigationType.SHIFT_SUMMARY, InvestigationScope(), "operador")
    required_capabilities = {s.capability_id for s in plan.steps if s.requirement == "required"}
    assert required_capabilities == {
        "get_current_shift_summary",
        "get_production_kpis",
        "get_loading_performance",
        "get_fleet_status",
        "get_alerts",
        "get_data_quality_status",
    }


def test_planner_declares_missing_capabilities_instead_of_silently_failing_later():
    # 'viewer' solo tiene permiso sobre 2 de las 6 capabilities del registro
    # (ver policies.TOOLS_BY_ROLE) - el resto debe declararse como faltante,
    # nunca agregarse como un paso fantasma que el Executor no podria resolver.
    plan = planner.build_plan(InvestigationType.PRODUCTION_DROP, InvestigationScope(), "viewer")

    remaining_tool_capabilities = {s.capability_id for s in plan.steps if s.kind == "tool"}
    assert remaining_tool_capabilities == {"get_data_quality_status"}
    assert len(plan.missing_capabilities) == 4
    assert all("sin permiso" in m for m in plan.missing_capabilities)


# ── Executor ──────────────────────────────────────────────────────────────
# Sin pytest-asyncio en este entorno: se maneja el loop directamente con
# asyncio.run() en tests sincronos en vez de sumar una dependencia nueva al
# venv compartido solo para 3 tests.

def test_executor_runs_tool_steps_in_order_and_produces_evidence():
    plan = planner.build_plan(InvestigationType.SHIFT_SUMMARY, InvestigationScope(), "operador")
    evidence = asyncio.run(executor.run_plan(plan, role="operador"))

    assert len(evidence) == 6
    assert [e.capability_id for e in evidence] == [s.capability_id for s in plan.steps if s.kind == "tool"]
    assert plan.status == "completed"
    assert all(s.status == "completed" for s in plan.steps if s.kind == "tool")
    assert all(s.status == "pending" for s in plan.steps if s.kind == "ui_action")


def test_executor_is_idempotent_and_never_repeats_a_completed_step():
    plan = planner.build_plan(InvestigationType.SHIFT_SUMMARY, InvestigationScope(), "operador")
    first_pass = asyncio.run(executor.run_plan(plan, role="operador"))
    second_pass = asyncio.run(executor.run_plan(plan, role="operador"))

    assert len(first_pass) == 6
    assert second_pass == []  # nada que ejecutar de nuevo


def test_executor_captures_tool_failures_without_crashing_the_investigation(monkeypatch):
    from app.ai import tools as tools_module

    def _boom(fecha=None):
        raise RuntimeError("WENCO no disponible")

    monkeypatch.setattr(tools_module, "provider_get_dataset", _boom)
    plan = planner.build_plan(InvestigationType.SHIFT_SUMMARY, InvestigationScope(), "operador")
    evidence = asyncio.run(executor.run_plan(plan, role="operador"))

    assert evidence == []
    assert all(s.status == "failed" and s.error for s in plan.steps if s.kind == "tool")
    assert plan.status == "failed"


# ── Verifier ──────────────────────────────────────────────────────────────

def test_verifier_reports_insufficient_data_when_there_is_no_evidence():
    result = verifier.verify_evidence([])
    assert result.status == "insufficient_data"
    assert result.accepted_evidence_ids == []


def test_verifier_rejects_empty_datasets_but_accepts_healthy_ones():
    healthy = EvidenceItem(
        evidence_id="ev-1", source_type="backend_tool", capability_id="get_alerts",
        label="get_alerts", value={"count": 3}, freshness_status="current", quality_status="high",
    )
    empty = EvidenceItem(
        evidence_id="ev-2", source_type="backend_tool", capability_id="get_fleet_status",
        label="get_fleet_status", value={"status": "EMPTY"}, freshness_status="unknown", quality_status="unknown",
    )
    result = verifier.verify_evidence([healthy, empty])

    assert result.status == "partial"
    assert result.accepted_evidence_ids == ["ev-1"]
    assert result.rejected_evidence_ids == ["ev-2"]
    assert healthy.verification_status == "verified"
    assert empty.verification_status == "rejected"


# ── Hipotesis ─────────────────────────────────────────────────────────────

def test_hypotheses_scores_are_bounded_and_documented_as_heuristic():
    evidence = [
        EvidenceItem(
            evidence_id="ev-1", source_type="backend_tool", capability_id="get_fleet_status",
            label="get_fleet_status", value={"disponibilidad_pct": 60}, freshness_status="current", quality_status="high",
        ),
    ]
    hyps = hypotheses_module.generate_hypotheses(InvestigationType.PRODUCTION_DROP, evidence)

    assert hyps  # produccion_drop siempre tiene su lista base de hipotesis
    for h in hyps:
        if h.score is not None:
            assert 0.0 <= h.score <= 1.0
        assert h.status in {"unsupported", "possible", "probable", "insufficient_data"}


def test_shift_summary_has_no_hypotheses_engine():
    # seccion 12 del brief: las hipotesis aplican a los 3 tipos analiticos,
    # no a shift_summary (es un resumen, no una investigacion de causa).
    hyps = hypotheses_module.generate_hypotheses(InvestigationType.SHIFT_SUMMARY, [])
    assert hyps == []


# ── Conclusion: la autoridad de decision nunca la fija el modelo ──────────

def test_conclusion_always_requires_human_approval_and_cannot_be_overridden():
    plan = planner.build_plan(InvestigationType.SHIFT_SUMMARY, InvestigationScope(), "operador")
    verification = verifier.verify_evidence([])
    result = conclusion_module.build_conclusion(plan, [], verification, [])

    assert result.decision_authority == "human"
    assert result.requires_human_approval is True
    # Ni siquiera pasando kwargs explicitos se puede cambiar - son Literal fijos.
    with pytest.raises(Exception):
        type(result)(**{**result.model_dump(), "decision_authority": "model"})


# ── Endpoints HTTP: modo Automatico, modo Guiado, RBAC, no-LLM ────────────

def _events(response) -> list[dict]:
    return [json.loads(line) for line in response.text.splitlines() if line]


def test_investigations_endpoint_requires_authentication(client):
    resp = client.post("/api/ai-copilot/investigations", json={"type": "shift_summary"})
    assert resp.status_code == 401


def test_out_of_scope_request_gets_the_exact_fixed_message(client, login_as_operador):
    resp = client.post(
        "/api/ai-copilot/investigations", json={"type": "predict_the_weather"}, headers=auth_header(login_as_operador),
    )
    events = _events(resp)
    assert events[-1]["type"] == "investigation.failed"
    assert events[-1]["message"] == OUT_OF_SCOPE_MESSAGE


def test_out_of_scope_plan_request_returns_400_with_fixed_message(client, login_as_operador):
    resp = client.post(
        "/api/ai-copilot/investigations/plan", json={"type": "predict_the_weather"}, headers=auth_header(login_as_operador),
    )
    assert resp.status_code == 400
    assert resp.json()["detail"] == OUT_OF_SCOPE_MESSAGE


@pytest.mark.parametrize(
    "investigation_type",
    ["production_drop", "cycle_time_increase", "loading_unit_underperformance", "shift_summary"],
)
def test_automatic_mode_runs_plan_and_execution_in_one_call(client, login_as_operador, investigation_type):
    resp = client.post(
        "/api/ai-copilot/investigations", json={"type": investigation_type}, headers=auth_header(login_as_operador),
    )
    assert resp.status_code == 200
    events = _events(resp)
    types = [e["type"] for e in events]

    assert types[0] == "investigation.started"
    assert types[1] == "investigation.plan"
    assert types[-1] == "investigation.completed"

    result = events[-1]["result"]
    assert result["plan"]["status"] == "completed"
    assert result["verification"]["status"] in {"verified", "partial"}
    assert result["conclusion"]["decision_authority"] == "human"
    assert result["conclusion"]["requires_human_approval"] is True


def test_guided_mode_never_queries_data_before_explicit_confirmation(client, login_as_operador):
    plan_resp = client.post(
        "/api/ai-copilot/investigations/plan", json={"type": "production_drop"}, headers=auth_header(login_as_operador),
    )
    assert plan_resp.status_code == 200
    investigation_id = plan_resp.json()["plan"]["investigation_id"]

    stored = get_investigation(investigation_id)
    assert stored["status"] == "planned"
    stored_result = json.loads(stored["result_json"])
    assert stored_result["evidence"] == []
    assert stored_result["conclusion"] is None

    exec_resp = client.post(
        f"/api/ai-copilot/investigations/{investigation_id}/execute", headers=auth_header(login_as_operador),
    )
    assert exec_resp.status_code == 200
    events = _events(exec_resp)
    assert events[-1]["type"] == "investigation.completed"
    assert events[-1]["result"]["plan"]["status"] == "completed"

    # Re-ejecutar un plan ya completado esta prohibido (idempotencia real).
    repeat_resp = client.post(
        f"/api/ai-copilot/investigations/{investigation_id}/execute", headers=auth_header(login_as_operador),
    )
    assert repeat_resp.status_code == 409


def test_execute_unknown_investigation_returns_404(client, login_as_operador):
    resp = client.post(
        "/api/ai-copilot/investigations/does-not-exist/execute", headers=auth_header(login_as_operador),
    )
    assert resp.status_code == 404


def test_ui_step_report_accepts_rejected_status_without_crashing(client, login_as_operador):
    # Regresion: UIStepReportRequest.status permite 'rejected' pero PlanStep.status
    # no lo incluia -> el backend tiraba 500 al re-guardar el resultado completo.
    resp = client.post(
        "/api/ai-copilot/investigations", json={"type": "production_drop"}, headers=auth_header(login_as_operador),
    )
    result = _events(resp)[-1]["result"]
    investigation_id = result["plan"]["investigation_id"]
    ui_step = next(s for s in result["plan"]["steps"] if s["kind"] == "ui_action")

    report_resp = client.post(
        f"/api/ai-copilot/investigations/{investigation_id}/ui-steps/{ui_step['step_id']}/report",
        json={"status": "rejected", "context_updated": False},
        headers=auth_header(login_as_operador),
    )
    assert report_resp.status_code == 200

    stored = get_investigation(investigation_id)
    stored_step = next(s for s in json.loads(stored["result_json"])["plan"]["steps"] if s["step_id"] == ui_step["step_id"])
    assert stored_step["status"] == "rejected"


def test_investigation_pipeline_never_calls_the_ai_provider(client, login_as_operador, monkeypatch):
    # Seccion 19 del brief: si el proveedor IA falla, los planes base
    # deterministicos deben seguir funcionando - aca lo probamos al reves:
    # el proveedor ni siquiera deberia ser consultado.
    def _explode(*args, **kwargs):
        raise AssertionError("El motor de investigacion no deberia llamar a get_provider()")

    monkeypatch.setattr("app.ai.providers.get_provider", _explode)

    resp = client.post(
        "/api/ai-copilot/investigations", json={"type": "shift_summary"}, headers=auth_header(login_as_operador),
    )
    assert resp.status_code == 200
    assert _events(resp)[-1]["type"] == "investigation.completed"
