from __future__ import annotations

import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def main() -> int:
    parser = argparse.ArgumentParser(description="NORTHMINE Agent Demo Tour deterministic preflight")
    parser.add_argument("--scenario", default="full_operational_demo")
    args = parser.parse_args()

    aliases = {"full": "full_operational_demo", "production": "production_investigation_demo", "fleet": "fleet_demo", "report": "report_demo", "failure": "failure_recovery_demo"}
    scenario_id = aliases.get(args.scenario, args.scenario)
    scenarios = json.loads((ROOT / "agent-harness/scenarios/demo_scenarios.json").read_text(encoding="utf-8"))
    fixtures = json.loads((ROOT / "agent-harness/fixtures/operational_fixtures.json").read_text(encoding="utf-8"))
    scenario = next((item for item in scenarios if item["id"] == scenario_id), None)
    failures: list[str] = []
    if scenario is None:
        failures.append(f"scenario missing: {scenario_id}")
    elif scenario.get("fixture") not in fixtures:
        failures.append(f"fixture missing: {scenario.get('fixture')}")
    elif not scenario.get("required_capabilities"):
        failures.append("required_capabilities missing")

    full = next((item for item in scenarios if item["id"] == "full_operational_demo"), {})
    required = set(full.get("required_capabilities", []))
    contract = {
        "context", "reasoning", "hypotheses", "contradictions", "verification", "navigation",
        "ui_manipulation", "guidance", "chart_highlight", "table_highlight", "map_focus_or_degradation",
        "quick_action", "command_palette", "comparison", "report", "report_verifier", "work_product",
        "watch_draft", "honest_degradation",
    }
    missing = sorted(contract - required)
    if missing:
        failures.append("full demo contract missing: " + ", ".join(missing))

    result = {
        "name": "NORTHMINE Agent Demo Tour",
        "classification": "AUTOMATED_AGENT_DEMO",
        "physical_browser_acceptance": "SEPARATE",
        "scenario": scenario_id,
        "fixture": scenario.get("fixture") if scenario else None,
        "contract_checks": len(contract),
        "status": "PASS" if not failures else "FAIL",
        "failures": failures,
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if not failures else 1


if __name__ == "__main__":
    raise SystemExit(main())
