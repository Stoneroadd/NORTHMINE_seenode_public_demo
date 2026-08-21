from __future__ import annotations

from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.ai import investigation_router
from app.ai import router as copilot_router
from app.ai.work_products import router as work_product_router
from app.api import routes as api_routes
from app.ai.work_products.models import ReportDraft, ReportScope, TaskDraft
from app.services.cockpit_service import build_cockpit_response
from app.services.data_provenance import resolve_provenance


def _user(*, tenant: str = "Tenant A", site: str = "Site A", identity: str = "alice") -> dict:
    return {"sub": identity, "rol": "supervisor", "empresa": tenant, "faena": site}


def _dataset(source: str, data_source: str) -> dict:
    return {
        "source": source,
        "data_source": data_source,
        "today": "2026-08-21",
        "plan": [],
        "cycles": [],
        "loader_status_durations": [],
        "stale": False,
    }


def test_synthetic_source_cannot_be_promoted_by_conflicting_real_label() -> None:
    provenance = resolve_provenance(_dataset("northmine-demo-synthetic", "REAL"))
    assert provenance["origin"] == "SYNTHETIC"
    assert provenance["demo_context"] is True


def test_cockpit_preserves_synthetic_provenance(monkeypatch) -> None:
    dataset = _dataset("northmine-demo-synthetic", "REAL")
    monkeypatch.setattr(
        "app.services.cockpit_service.build_current_shift_command_center",
        lambda *_args, **_kwargs: {
            "fecha": "2026-08-21", "turno": "DIA", "stale": False,
            "shift_label": "Turno dia", "kpis": {}, "unidades_carguio": [],
        },
    )
    monkeypatch.setattr("app.services.cockpit_service.build_summary", lambda *_args: {})
    monkeypatch.setattr("app.services.cockpit_service.build_operational_alerts", lambda *_args: {"items": [], "counts": {}, "low_caex": []})
    monkeypatch.setattr("app.services.cockpit_service.build_forecast_summary", lambda *_args: {"actual": 0, "forecast": 0, "target": 0, "daily_target": 0, "target_source": "none", "risk": 0, "compliance_pct": 0, "meta_configured": False})
    monkeypatch.setattr("app.services.cockpit_service.current_shift_records", lambda *_args: [])
    monkeypatch.setattr("app.services.cockpit_service.build_delay_breakdown", lambda *_args: {})
    monkeypatch.setattr("app.services.cockpit_service.calculate_average_caex_in_circuit", lambda *_args: 0)
    monkeypatch.setattr("app.services.cockpit_service.build_economics", lambda *_args: ({}, []))
    monkeypatch.setattr("app.services.cockpit_service.find_destination_focus", lambda *_args: None)
    monkeypatch.setattr("app.services.cockpit_service.find_low_loading_unit", lambda *_args: None)
    monkeypatch.setattr("app.services.cockpit_service.build_cause_breakdown", lambda *_args: [{"cause": "none"}])
    monkeypatch.setattr("app.services.cockpit_service.build_happening", lambda *_args: {})
    monkeypatch.setattr("app.services.cockpit_service.build_recommendation", lambda *_args: {"confidence": "LOW"})
    monkeypatch.setattr("app.services.cockpit_service.calculate_health_score", lambda *_args: 100)
    monkeypatch.setattr("app.services.cockpit_service.build_data_quality", lambda *_args: {})
    monkeypatch.setattr("app.services.cockpit_service.health_state", lambda *_args: "STABLE")
    monkeypatch.setattr("app.services.cockpit_service.build_caex_status", lambda *_args: [])
    monkeypatch.setattr("app.services.cockpit_service.build_shovels", lambda *_args: [])
    monkeypatch.setattr("app.services.cockpit_service.build_destinations", lambda *_args: [])
    monkeypatch.setattr("app.services.cockpit_service.build_loader_hourly", lambda *_args: [])
    monkeypatch.setattr("app.services.cockpit_service.calculate_availability", lambda *_args: 0)
    monkeypatch.setattr("app.services.cockpit_service.build_scenario_table", lambda *_args: [])
    payload = build_cockpit_response(dataset, demo_mode=False)
    assert payload["data_source"] == "SYNTHETIC"
    assert payload["is_demo"] is True
    assert payload["last_real_record"] is None
    assert payload["provenance"]["representation"] == "DERIVED"


def test_direct_report_id_cannot_cross_tenant(monkeypatch) -> None:
    report = ReportDraft(
        report_type="SHIFT_REPORT", title="B", scope=ReportScope(), generated_by="bob",
        company_id="Tenant B", site_id="Site B",
    )
    monkeypatch.setattr(
        work_product_router.persistence,
        "get_latest_report_in_scope",
        lambda _id, *, company_id, site_id: report if (company_id, site_id) == ("Tenant B", "Site B") else None,
    )
    with pytest.raises(HTTPException) as exc:
        work_product_router.get_report(report.report_id, user=_user())
    assert exc.value.status_code == 404


def test_direct_report_id_cannot_cross_site(monkeypatch) -> None:
    report = ReportDraft(
        report_type="SHIFT_REPORT", title="A2", scope=ReportScope(), generated_by="bob",
        company_id="Tenant A", site_id="Site B",
    )
    monkeypatch.setattr(
        work_product_router.persistence,
        "get_latest_report_in_scope",
        lambda _id, *, company_id, site_id: report if (company_id, site_id) == ("Tenant A", "Site B") else None,
    )
    with pytest.raises(HTTPException) as exc:
        work_product_router.get_report(report.report_id, user=_user())
    assert exc.value.status_code == 404


def test_direct_task_id_is_authorized_before_mutation(monkeypatch) -> None:
    task = TaskDraft(title="B", description="x", reason="x", created_by="bob", company_id="Tenant B", site_id="Site B")
    monkeypatch.setattr(
        work_product_router.persistence,
        "get_task_in_scope",
        lambda _id, *, company_id, site_id: task if (company_id, site_id) == ("Tenant B", "Site B") else None,
    )
    called = False

    def _mutate(*_args, **_kwargs):
        nonlocal called
        called = True
        return task

    monkeypatch.setattr(work_product_router.tasks_module, "approve_task", _mutate)
    with pytest.raises(HTTPException) as exc:
        work_product_router.approve_task(task.task_id, SimpleNamespace(client=None), user=_user())
    assert exc.value.status_code == 404
    assert called is False


def test_investigation_direct_id_is_owner_scoped(monkeypatch) -> None:
    monkeypatch.setattr(
        investigation_router,
        "get_investigation_for_owner",
        lambda _id, owner: {"created_by": "bob", "result_json": "{}"} if owner == "bob" else None,
    )
    with pytest.raises(HTTPException) as exc:
        investigation_router.get_investigation_endpoint("inv-b", user=_user(identity="alice"))
    assert exc.value.status_code == 404


def test_legacy_copilot_task_id_is_owner_scoped_before_mutation(monkeypatch) -> None:
    monkeypatch.setattr(
        copilot_router.repository,
        "get_task_draft_for_owner",
        lambda _id, owner: {"id": "task-b", "created_by": "bob"} if owner == "bob" else None,
    )
    called = False

    def _mutate(*_args, **_kwargs):
        nonlocal called
        called = True
        return None

    monkeypatch.setattr(copilot_router.repository, "update_task_status", _mutate)
    with pytest.raises(HTTPException) as exc:
        copilot_router._transition_task("task-b", "approved", SimpleNamespace(client=None), _user(identity="alice"))
    assert exc.value.status_code == 404
    assert called is False


def test_admin_direct_user_id_cannot_cross_site(monkeypatch) -> None:
    target = SimpleNamespace(id="u-b", empresa="Tenant A", faena="Site B")
    repository = SimpleNamespace(get_user_by_id=lambda *_args: target)
    monkeypatch.setattr(api_routes, "get_user_repository", lambda: repository)
    with pytest.raises(HTTPException) as exc:
        api_routes.admin_get_user("u-b", SimpleNamespace(client=None), user=_user())
    assert exc.value.status_code == 404
