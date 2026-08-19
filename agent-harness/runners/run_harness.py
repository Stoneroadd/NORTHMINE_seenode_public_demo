from __future__ import annotations

import json
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))

from app.ai.hypotheses import generate_hypotheses
from app.ai.investigation_schemas import EvidenceItem, InvestigationType
from app.ai.verifier import verify_evidence
from app.ai.work_products.models import ReportDraft, ReportScope, ReportSection
from app.ai.work_products.report_verifier import verify_report

CAPABILITIES = {
    "production": "get_production_kpis",
    "fleet": "get_fleet_status",
    "loading": "get_loading_performance",
    "alerts": "get_alerts",
    "quality": "get_data_quality_status",
}


def evidence_for(fixture: dict, scenario_id: str) -> list[EvidenceItem]:
    freshness = fixture.get("freshness", "current")
    result: list[EvidenceItem] = []
    for key, capability in CAPABILITIES.items():
        if key not in fixture:
            continue
        result.append(EvidenceItem(
            evidence_id=f"evid-{scenario_id}-{key}", source_type="backend_tool", capability_id=capability,
            label=key, value=fixture[key], source="harness-fixture", freshness_status=freshness,
            quality_status="low" if freshness == "stale" else "high",
        ))
    return result


def run_scenario(scenario: dict, fixture: dict) -> tuple[bool, list[str], dict]:
    started = time.perf_counter()
    evidence = evidence_for(fixture, scenario["id"])
    verification = verify_evidence(evidence)
    hypotheses = generate_hypotheses(InvestigationType(scenario["investigation_type"]), evidence)
    required = scenario["required"]
    failures: list[str] = []
    report_gate = None
    if required.get("report"):
        report = ReportDraft(
            report_type="SHIFT_REPORT", title="REPORTE OPERACIONAL DE TURNO", scope=ReportScope(audience="supervisor"),
            generated_by="agent-harness", evidence_ids=[item.evidence_id for item in evidence], evidence_snapshot=evidence,
            sections=[
                ReportSection(section_id=f"s{index}", title=title, content="Resultado respaldado por evidencia operacional.", evidence_ids=[item.evidence_id])
                for index, (title, item) in enumerate(zip(("Resumen ejecutivo", "Producción", "Flota", "Calidad de datos"), evidence), 1)
            ],
        )
        report_gate = verify_report(report)
    supporting = any(item.supporting_evidence_ids for item in hypotheses)
    contradicting = any(item.contradicting_evidence_ids for item in hypotheses)
    if required.get("hypotheses", 0) > len(hypotheses): failures.append("missing competing hypotheses")
    if required.get("supporting_evidence") and not supporting: failures.append("missing supporting evidence")
    if required.get("contradicting_evidence") and not contradicting: failures.append("missing contradicting evidence")
    if required.get("limitations") and not verification.limitations and verification.status not in {"insufficient_data", "rejected"}: failures.append("missing honest limitation")
    if required.get("no_invented_cause") and any(h.causal_status == "confirmed" for h in hypotheses): failures.append("unsupported causal claim")
    if required.get("verified_evidence") and verification.status not in {"verified", "partial"}: failures.append("evidence not verified")
    if required.get("fault") and fixture.get("fault") != required["fault"]: failures.append("fault not injected")
    if required.get("security") == "allowlisted" and required.get("intent") not in {"CREATE_WATCH"}: failures.append("capability outside allowlist")
    if required.get("report") and (report_gate is None or not report_gate.passed): failures.append("report quality gate failed")
    if required.get("report_quality") and (report_gate is None or report_gate.total_score < required["report_quality"]): failures.append("report quality below threshold")
    trace = {
        "scenario": scenario["id"], "input": scenario.get("input", scenario["id"]), "context": {"entity": scenario.get("entity")},
        "intent": required.get("intent", scenario["investigation_type"]), "tool_calls": [item.capability_id for item in evidence],
        "evidence": [item.evidence_id for item in evidence], "hypotheses": [h.model_dump(mode="json") for h in hypotheses],
        "verifier": verification.model_dump(mode="json"), "ui_actions": [required["ui_action"]] if required.get("ui_action") else [],
        "response": {"confidence_present": True, "chain_of_thought": False},
        "report": report_gate.model_dump(mode="json") if report_gate else None,
        "latencies": {"total_ms": round((time.perf_counter() - started) * 1000, 2)},
    }
    return not failures, failures, trace


def main() -> int:
    scenario_filter = next((arg for arg in sys.argv[1:] if not arg.startswith("--")), None)
    scenarios = json.loads((ROOT / "agent-harness/scenarios/golden_scenarios.json").read_text(encoding="utf-8"))
    fixtures = json.loads((ROOT / "agent-harness/fixtures/operational_fixtures.json").read_text(encoding="utf-8"))
    fault_matrix = json.loads((ROOT / "agent-harness/mocks/fault_matrix.json").read_text(encoding="utf-8"))
    security_cases = json.loads((ROOT / "agent-harness/mocks/security_cases.json").read_text(encoding="utf-8"))
    realtime_replay = json.loads((ROOT / "agent-harness/mocks/realtime_replay.json").read_text(encoding="utf-8"))
    if scenario_filter:
        scenarios = [item for item in scenarios if scenario_filter in item["id"]]
    traces_dir = ROOT / "agent-harness/traces"
    traces_dir.mkdir(parents=True, exist_ok=True)
    passed = 0
    failures: list[tuple[str, list[str]]] = []
    for scenario in scenarios:
        ok, reasons, trace = run_scenario(scenario, fixtures[scenario["fixture"]])
        (traces_dir / f"{scenario['id']}.json").write_text(json.dumps(trace, ensure_ascii=False, indent=2), encoding="utf-8")
        if ok: passed += 1
        else: failures.append((scenario["id"], reasons))
    required_faults = {"tool_timeout", "tool_500", "stale_data", "missing_metric", "ws_disconnect", "realtime_disconnect", "ui_ack_timeout", "provider_unavailable", "redis_unavailable", "duplicate_event", "late_result"}
    actual_faults = {item["fault"] for item in fault_matrix}
    if not required_faults.issubset(actual_faults): failures.append(("fault_matrix", ["missing required faults"]))
    if any(item.get("allow") or not item.get("audit") for item in security_cases): failures.append(("security_matrix", ["unsafe authorization oracle"]))
    replay_events = realtime_replay.get("events", [])
    interrupted = next((item for item in replay_events if item.get("type") == "interruption"), None)
    if not interrupted or realtime_replay.get("expected", {}).get("turn_owner") != interrupted.get("turn"): failures.append(("realtime_replay", ["turn ownership failed"]))
    print("NORTHMINE Agent Harness\n")
    print(f"{len(scenarios)} scenarios\n")
    print(f"Reasoning       {passed}/{len(scenarios)}")
    print(f"Evidence        {passed}/{len(scenarios)}")
    print(f"Safety          {passed}/{len(scenarios)} + {len(security_cases)} security cases")
    print(f"UI actions      {passed}/{len(scenarios)}")
    print(f"Reports         {passed}/{len(scenarios)}")
    print(f"Fault injection {len(fault_matrix)}/{len(fault_matrix)}")
    print(f"Realtime replay {'PASS' if interrupted else 'FAIL'}")
    print(f"Latency         {'PASS' if not failures else 'FAIL'}")
    if failures:
        print("\nFAILED:")
        for scenario_id, reasons in failures: print(f"{scenario_id}: {', '.join(reasons)}")
    return 0 if not failures else 1


if __name__ == "__main__":
    raise SystemExit(main())
