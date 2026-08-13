from __future__ import annotations

import asyncio
import json

import pytest

from app.ai import conclusion as conclusion_module
from app.ai import executor, hypotheses as hypotheses_module, planner, verifier
from app.ai.investigation_repository import get_investigation
from app.ai.investigation_schemas import (
    EvidenceItem,
    InvestigationConfidence,
    InvestigationScope,
    InvestigationType,
    OperationalHypothesis,
    OUT_OF_SCOPE_MESSAGE,
    VerificationResult,
)
from app.ai.planner import PlannerRejection
from app.ai.schemas import ResponseConfidence
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


# ── C3: semantica de confianza (Evidence Quality / Verification /
#        Hypothesis Score / Assessment Confidence) ─────────────────────────

def _probable_hypothesis() -> OperationalHypothesis:
    return OperationalHypothesis(
        hypothesis_id="hyp-1", label="Disponibilidad de flota baja", status="probable",
        supporting_evidence_ids=["ev-1"], score=0.82,
    )


def test_investigation_confidence_and_response_confidence_are_distinct_types():
    # No deben compartir nombre ni vocabulario de niveles: son dos dominios
    # (investigacion determinista vs. agregacion heuristica de un turno de
    # chat), calculados por caminos de codigo completamente distintos.
    assert InvestigationConfidence is not ResponseConfidence
    assert InvestigationConfidence.model_fields["level"].annotation != ResponseConfidence.model_fields["level"].annotation
    assert InvestigationConfidence(level="high").level == "high"
    assert ResponseConfidence(level="alta").level == "alta"


def test_investigation_confidence_keeps_the_same_wire_shape_after_the_rename():
    # El rename ConfidenceInfo -> InvestigationConfidence es interno; el
    # contrato JSON que ya consume el frontend no debe cambiar de forma.
    dumped = InvestigationConfidence(level="medium").model_dump()
    assert dumped == {"level": "medium", "calculated_by": "backend_rules"}


def test_conclusion_confidence_depends_only_on_verification_status_and_hypotheses():
    # Severity (findings.py) es un concepto de otro modulo, nunca importado
    # por conclusion.py - confirma que no puede modificar la confianza.
    plan = planner.build_plan(InvestigationType.PRODUCTION_DROP, InvestigationScope(), "operador")
    evidence = [
        EvidenceItem(
            evidence_id="ev-1", source_type="backend_tool", capability_id="get_fleet_status",
            label="get_fleet_status", value={"disponibilidad_pct": 60}, freshness_status="current", quality_status="high",
            verification_status="verified",
        ),
    ]
    verification = VerificationResult(status="verified", accepted_evidence_ids=["ev-1"])

    result = conclusion_module.build_conclusion(plan, evidence, verification, [_probable_hypothesis()])
    assert result.confidence.level == "high"


def test_low_quality_evidence_never_reaches_verified_status_and_caps_confidence_at_medium():
    low_quality = EvidenceItem(
        evidence_id="ev-1", source_type="backend_tool", capability_id="get_fleet_status",
        label="get_fleet_status", value={"disponibilidad_pct": 60}, freshness_status="current", quality_status="low",
    )
    verification = verifier.verify_evidence([low_quality])

    assert low_quality.verification_status == "partial"
    assert verification.status == "partial"  # nunca "verified" con evidencia de baja calidad

    plan = planner.build_plan(InvestigationType.PRODUCTION_DROP, InvestigationScope(), "operador")
    result = conclusion_module.build_conclusion(plan, [low_quality], verification, [_probable_hypothesis()])
    # Aunque haya una hipotesis probable, la calidad baja impide "high".
    assert result.confidence.level == "medium"


def test_rejected_verification_never_produces_high_confidence_even_with_a_probable_hypothesis():
    rejected_item = EvidenceItem(
        evidence_id="ev-1", source_type="backend_tool", capability_id="get_fleet_status",
        label="get_fleet_status", value={"status": "EMPTY"}, freshness_status="unknown", quality_status="unknown",
    )
    verification = verifier.verify_evidence([rejected_item])
    assert verification.status == "rejected"

    plan = planner.build_plan(InvestigationType.PRODUCTION_DROP, InvestigationScope(), "operador")
    result = conclusion_module.build_conclusion(plan, [rejected_item], verification, [_probable_hypothesis()])
    assert result.confidence.level == "low"


def test_hypothesis_score_is_never_serialized_as_a_probability_field_name():
    # El campo se sigue llamando "score" (no "probability"/"confidence") en
    # el contrato publico - la Guia Maestra y el frontend dependen de que
    # este nombre no cambie de significado.
    hyp = _probable_hypothesis()
    dumped = hyp.model_dump()
    assert "score" in dumped
    assert "probability" not in dumped
    assert 0.0 <= dumped["score"] <= 1.0


# ── C4: Evidence Traceability (tool result -> EvidenceItem -> Hypothesis ->
#        Conclusion -> Report), con IDs reales, nunca strings sueltos ──────

def test_evidence_id_survives_from_tool_result_into_supporting_hypothesis():
    evidence = [
        EvidenceItem(
            evidence_id="ev-fleet-1", source_type="backend_tool", capability_id="get_fleet_status",
            label="get_fleet_status", value={"disponibilidad_pct": 55}, freshness_status="current", quality_status="high",
        ),
    ]
    hyps = hypotheses_module.generate_hypotheses(InvestigationType.PRODUCTION_DROP, evidence)
    fleet_hyp = next(h for h in hyps if h.label == "Menor disponibilidad de camiones")

    assert fleet_hyp.status == "probable"  # disponibilidad 55% -> score alto
    assert fleet_hyp.supporting_evidence_ids == ["ev-fleet-1"]
    assert fleet_hyp.contradicting_evidence_ids == []


def test_evidence_id_survives_into_contradicting_hypothesis_when_unsupported():
    evidence = [
        EvidenceItem(
            evidence_id="ev-fleet-2", source_type="backend_tool", capability_id="get_fleet_status",
            label="get_fleet_status", value={"disponibilidad_pct": 98}, freshness_status="current", quality_status="high",
        ),
    ]
    hyps = hypotheses_module.generate_hypotheses(InvestigationType.PRODUCTION_DROP, evidence)
    fleet_hyp = next(h for h in hyps if h.label == "Menor disponibilidad de camiones")

    assert fleet_hyp.status == "unsupported"  # disponibilidad 98% -> score bajo
    assert fleet_hyp.contradicting_evidence_ids == ["ev-fleet-2"]
    assert fleet_hyp.supporting_evidence_ids == []


def test_hypothesis_evidence_ids_never_overlap_between_supporting_and_contradicting():
    evidence = [
        EvidenceItem(
            evidence_id="ev-fleet-3", source_type="backend_tool", capability_id="get_fleet_status",
            label="get_fleet_status", value={"disponibilidad_pct": 70, "equipos_en_demora": 2, "total_equipos": 10}, freshness_status="current", quality_status="high",
        ),
        EvidenceItem(
            evidence_id="ev-loading-1", source_type="backend_tool", capability_id="get_loading_performance",
            label="get_loading_performance", value={"unidades": [{"variacion_pct": -25}]}, freshness_status="current", quality_status="high",
        ),
    ]
    for h in hypotheses_module.generate_hypotheses(InvestigationType.PRODUCTION_DROP, evidence):
        assert not (set(h.supporting_evidence_ids) & set(h.contradicting_evidence_ids))


def test_conclusion_supporting_evidence_ids_trace_back_to_the_evidence_that_backed_the_probable_hypothesis():
    plan = planner.build_plan(InvestigationType.PRODUCTION_DROP, InvestigationScope(), "operador")
    fleet_evidence = EvidenceItem(
        evidence_id="ev-fleet-4", source_type="backend_tool", capability_id="get_fleet_status",
        label="get_fleet_status", value={"disponibilidad_pct": 55}, freshness_status="current", quality_status="high",
        verification_status="verified",
    )
    verification = VerificationResult(status="verified", accepted_evidence_ids=["ev-fleet-4"])
    hyps = hypotheses_module.generate_hypotheses(InvestigationType.PRODUCTION_DROP, [fleet_evidence])

    result = conclusion_module.build_conclusion(plan, [fleet_evidence], verification, hyps)

    assert result.confidence.level == "high"
    assert "ev-fleet-4" in result.supporting_evidence_ids


def test_rejected_evidence_never_appears_as_a_fact_or_a_supporting_evidence_id():
    accepted = EvidenceItem(
        evidence_id="ev-ok", source_type="backend_tool", capability_id="get_production_kpis",
        label="get_production_kpis", value={"cumplimiento_pct": 80, "brecha_ton": -500}, freshness_status="current", quality_status="high",
    )
    rejected = EvidenceItem(
        evidence_id="ev-rejected", source_type="backend_tool", capability_id="get_fleet_status",
        label="get_fleet_status", value={"status": "EMPTY"}, freshness_status="unknown", quality_status="unknown",
    )
    verification = verifier.verify_evidence([accepted, rejected])
    assert rejected.verification_status == "rejected"

    plan = planner.build_plan(InvestigationType.PRODUCTION_DROP, InvestigationScope(), "operador")
    result = conclusion_module.build_conclusion(plan, [accepted, rejected], verification, [])

    assert "ev-rejected" not in result.supporting_evidence_ids
    assert not any("ev-rejected" in fact for fact in result.facts)


def test_get_evidence_for_conclusion_resolves_real_items_and_never_fabricates_missing_ones(caplog):
    from app.ai.investigation_schemas import InvestigationResult

    plan = planner.build_plan(InvestigationType.PRODUCTION_DROP, InvestigationScope(), "operador")
    real_item = EvidenceItem(
        evidence_id="ev-real", source_type="backend_tool", capability_id="get_alerts",
        label="get_alerts", value={"count": 3}, freshness_status="current", quality_status="high",
    )
    conclusion = conclusion_module.build_conclusion(
        plan, [real_item], VerificationResult(status="verified", accepted_evidence_ids=["ev-real"]), [],
    )
    # Se inyecta a proposito un id que nunca existio, simulando corrupcion/bug.
    conclusion = conclusion.model_copy(update={"supporting_evidence_ids": [*conclusion.supporting_evidence_ids, "ev-fantasma"]})
    result = InvestigationResult(plan=plan, evidence=[real_item], verification=VerificationResult(status="verified"), hypotheses=[], conclusion=conclusion)

    with caplog.at_level("WARNING"):
        resolved = conclusion_module.get_evidence_for_conclusion(result)

    assert [e.evidence_id for e in resolved] == ["ev-real"]  # nunca se fabrica un EvidenceItem para "ev-fantasma"
    assert any("ev-fantasma" in r.message for r in caplog.records)


def test_investigation_result_round_trip_preserves_evidence_lineage():
    from app.ai.investigation_schemas import InvestigationResult

    plan = planner.build_plan(InvestigationType.PRODUCTION_DROP, InvestigationScope(), "operador")
    fleet_evidence = EvidenceItem(
        evidence_id="ev-rt-1", source_type="backend_tool", capability_id="get_fleet_status",
        label="get_fleet_status", value={"disponibilidad_pct": 55}, freshness_status="current", quality_status="high",
        verification_status="verified",
    )
    verification = VerificationResult(status="verified", accepted_evidence_ids=["ev-rt-1"])
    hyps = hypotheses_module.generate_hypotheses(InvestigationType.PRODUCTION_DROP, [fleet_evidence])
    conclusion = conclusion_module.build_conclusion(plan, [fleet_evidence], verification, hyps)
    result = InvestigationResult(plan=plan, evidence=[fleet_evidence], verification=verification, hypotheses=hyps, conclusion=conclusion)

    rehydrated = InvestigationResult.model_validate_json(result.model_dump_json())

    assert rehydrated.conclusion.supporting_evidence_ids == conclusion.supporting_evidence_ids
    assert [h.supporting_evidence_ids for h in rehydrated.hypotheses] == [h.supporting_evidence_ids for h in hyps]


def test_investigation_conclusion_persisted_before_c4_still_parses_without_the_new_fields():
    # Contrato antiguo: filas ya guardadas en ai_investigations.result_json
    # antes de este cambio no tienen supporting_evidence_ids/
    # contradicting_evidence_ids - deben seguir parseando (defaults a []).
    old_json = json.dumps({
        "summary": "s", "facts": ["f1"], "probable_causes": [], "contradictions": [],
        "recommendations": [], "limitations": [], "confidence": {"level": "low", "calculated_by": "backend_rules"},
        "decision_authority": "human", "requires_human_approval": True,
    })
    parsed = conclusion_module.InvestigationConclusion.model_validate_json(old_json)
    assert parsed.supporting_evidence_ids == []
    assert parsed.contradicting_evidence_ids == []


def test_end_to_end_lineage_tool_result_to_evidence_to_hypothesis_to_conclusion_without_text_search():
    """tool result -> E1 -> H1 -> C1: navega la relacion por id, nunca
    reconstruyendola con `in`/regex sobre texto."""
    plan = planner.build_plan(InvestigationType.PRODUCTION_DROP, InvestigationScope(), "operador")
    e1 = EvidenceItem(
        evidence_id="ev-e2e-1", source_type="backend_tool", capability_id="get_fleet_status",
        label="get_fleet_status", value={"disponibilidad_pct": 50}, freshness_status="current", quality_status="high",
        verification_status="verified",
    )
    verification = VerificationResult(status="verified", accepted_evidence_ids=["ev-e2e-1"])
    hyps = hypotheses_module.generate_hypotheses(InvestigationType.PRODUCTION_DROP, [e1])
    h1 = next(h for h in hyps if h.label == "Menor disponibilidad de camiones")
    c1 = conclusion_module.build_conclusion(plan, [e1], verification, hyps)

    # C1 -> H1: la conclusion cita el mismo evidence_id que ya sustentaba H1.
    assert set(h1.supporting_evidence_ids) <= set(c1.supporting_evidence_ids)
    # H1 -> E1: navegacion por id, no por busqueda de texto en el label.
    assert h1.supporting_evidence_ids == [e1.evidence_id]


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
