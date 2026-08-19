from __future__ import annotations

from datetime import datetime, timezone

from app.ai.demo_tour import available_scenarios, demo_tour_enabled, normalized_tool_result
from app.ai.runtime.command_router import AgentCommandType, classify
from app.ai.runtime.protocol import AgentEvent
from app.ai.proactivity import subscriptions
from app.core.config import get_settings


def test_demo_tour_requires_explicit_non_production_gate(monkeypatch) -> None:
    monkeypatch.setenv("AGENT_DEMO_MODE", "true")
    monkeypatch.setenv("ENVIRONMENT", "demo")
    get_settings.cache_clear()
    assert demo_tour_enabled() is True

    monkeypatch.setenv("ENVIRONMENT", "production")
    get_settings.cache_clear()
    assert demo_tour_enabled() is False
    get_settings.cache_clear()


def test_demo_tour_declares_five_required_scenarios() -> None:
    ids = {scenario["id"] for scenario in available_scenarios()}
    assert {
        "full_operational_demo", "production_investigation_demo", "fleet_demo",
        "report_demo", "failure_recovery_demo",
    }.issubset(ids)


def test_demo_fixture_drives_pala_03_conclusion_inputs() -> None:
    production = normalized_tool_result("production_drop", "get_production_kpis")
    loading = normalized_tool_result("production_drop", "get_loading_performance")
    worst = min(loading["unidades"], key=lambda unit: unit["variacion_pct"])
    assert worst["carguio_id"] == "PALA 03"
    assert production["brecha_ton"] == -4320
    assert production["toneladas_por_hora"][2]["hora"] == "14:00"
    assert production["data_quality"]["source"] == "northmine-agent-demo-fixture"


def test_demo_start_is_part_of_versioned_runtime_protocol() -> None:
    event = AgentEvent(
        event_id="evt-demo", session_id="session-demo", correlation_id="corr-demo",
        sequence=1, timestamp=datetime.now(timezone.utc), event_type="demo.start",
        payload={"scenarioId": "full_operational_demo", "mode": "deterministic"},
    )
    assert event.event_type == "demo.start"


def test_wenco_exact_value_request_degrades_honestly() -> None:
    command = classify("¿Cuál fue el valor exacto obtenido desde WENCO?")
    assert command.type == AgentCommandType.CHECK_EXTERNAL_SOURCE


def test_demo_watch_can_remain_a_non_active_draft() -> None:
    watch = subscriptions.create_watch(
        user_id="agent-demo-test", company_id=None, site_id=None,
        entity_ids=["PALA 03"], entity_label="PALA 03",
        metric="variacion_pct", condition="above", threshold=-12.0,
        status="draft",
    )
    assert watch.status == "draft"
    assert watch not in subscriptions.list_active_for_user("agent-demo-test")
