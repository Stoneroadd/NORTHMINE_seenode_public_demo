from __future__ import annotations

import calendar
from types import SimpleNamespace

import pytest

from app.api import operational as routes
from app.services.monthly_target_service import (
    F01_DAILY_TARGET,
    build_monthly_target_response,
)


def _cycle(day: int, tons: int, sector: str = "F01") -> dict:
    return {
        "id": f"cycle-{day}-{sector}",
        "datetime": f"2026-07-{day:02d}T10:15:00",
        "fecha_dia": f"2026-07-{day:02d}",
        "fase": sector,
        "origen": f"{sector}/BANCO 2440",
        "destino": "CHANCADO",
        "tonelaje": tons,
    }


def _dataset(plan: bool = True) -> dict:
    return {
        "source": "wenco-sql-live",
        "today": "2026-07-13",
        "stale": False,
        "plan": (
            [{"date": f"2026-07-{day:02d}", "plan_tons": 1000} for day in range(1, 32)]
            if plan
            else []
        ),
        "cycles": [
            _cycle(1, 1000),
            _cycle(2, 1100),
            _cycle(13, 1200),
            _cycle(13, 900, "F02"),
            _cycle(14, 2500),
        ],
    }


def test_monthly_target_demo_mode_returns_complete_above_target_synthetic_data():
    payload = build_monthly_target_response(None, demo_mode=True, selected_date="2026-07-13", sector="F01")

    assert payload["data_source"] == "DEMO"
    assert payload["source_system"] == "NORTHMINE_DEMO"
    assert len(payload["daily_breakdown"]) == 31
    assert all(row["f01_real_tonnes"] > F01_DAILY_TARGET for row in payload["daily_breakdown"])
    assert all(row["status"] == "SOBRE_META" for row in payload["daily_breakdown"])


def test_monthly_target_without_configured_plan_uses_f01_target_config_and_wenco_real():
    payload = build_monthly_target_response(_dataset(plan=False), demo_mode=False, selected_date="2026-07-13", sector="F01")
    expected_programmed = F01_DAILY_TARGET * calendar.monthrange(2026, 7)[1]

    assert payload["data_source"] == "REAL"
    assert payload["quality"] == "F01_TARGET_CONFIG_REAL_WENCO"
    assert payload["program_source"] == "NORTHMINE_F01_DAILY_TARGET_CONFIG"
    assert payload["real_source"] == "WENCO"
    assert payload["mov_programado_acumulado"] == expected_programmed
    assert payload["mov_real_acumulado"] == 3_300
    assert payload["mov_diferencia"] == 3_300 - expected_programmed
    assert payload["mov_f02_acumulado"] == 900
    assert payload["mov_total_con_f02"] == 4_200
    day_13 = payload["daily_breakdown"][12]
    assert day_13["date"] == "2026-07-13"
    assert day_13["f01_programmed_tonnes"] == F01_DAILY_TARGET
    assert day_13["f01_real_tonnes"] == 1_200
    assert day_13["f02_real_tonnes"] == 900
    assert day_13["total_real_tonnes"] == 2_100
    assert "129.971" in payload["warnings"][0]


def test_monthly_target_with_configured_plan_uses_wenco_cycles_and_formula():
    payload = build_monthly_target_response(_dataset(plan=True), demo_mode=False, selected_date="2026-07-13", sector="F01")

    assert payload["status"] == "OK"
    assert payload["data_source"] == "REAL"
    assert payload["source_system"] == "WENCO+NORTHMINE_CONFIG"
    assert payload["quality"] == "PLAN_CONFIGURADO_REAL_WENCO"
    assert payload["mov_programado_acumulado"] == 13_000
    assert payload["mov_real_acumulado"] == 3_300
    assert payload["mov_diferencia"] == -9_700
    assert payload["cumplimiento_pct"] == 25.4
    assert payload["last_updated"] == "2026-07-13T10:15"


def test_monthly_target_sector_filter_is_applied():
    payload = build_monthly_target_response(_dataset(plan=True), demo_mode=False, selected_date="2026-07-13", sector="F02")

    assert payload["data_source"] == "REAL"
    assert payload["sector"] == "F02"
    assert payload["mov_programado_acumulado"] == 13_000
    assert payload["mov_real_acumulado"] == 900
    assert payload["mov_diferencia"] == -12_100


def test_monthly_target_route_loads_month_to_date(monkeypatch):
    calls = []

    def fake_provider_get_dataset(fecha=None, dias=2):
        calls.append((fecha, dias))
        return _dataset(plan=True)

    monkeypatch.setattr(routes, "provider_get_dataset", fake_provider_get_dataset)
    monkeypatch.setattr(routes, "get_settings", lambda: SimpleNamespace(demo_mode=False))

    request = SimpleNamespace(query_params={"date": "2026-07-13", "sector": "F01"})
    payload = routes.monthly_target(request, user={})

    assert payload["data_source"] == "REAL"
    assert payload["period"]["label"] == "Julio 2026"
    assert calls == [("2026-07-13", 13)]
