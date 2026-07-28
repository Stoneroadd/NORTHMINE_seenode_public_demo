from __future__ import annotations

import pytest

from app.services.profit_optimization_service import (
    PROFIT_OPTIMIZATION_API_VERSION,
    build_profit_optimization_response,
)


def _cycle(
    caex_id: str,
    carguio_id: str,
    hour: int,
    tons: int,
    destino: str = "CHANCADO",
) -> dict:
    timestamp = f"2026-07-12T{hour:02d}:10:00"
    return {
        "id": f"{caex_id}-{carguio_id}-{hour}",
        "datetime": timestamp,
        "fecha_dia": "2026-07-12",
        "turno_calc": "DIA",
        "hora": hour,
        "caex_id": caex_id,
        "carguio_id": carguio_id,
        "tonelaje": tons,
        "destino": destino,
        "origen": "F01",
        "fase": "F01",
        "camion_modelo": "CAT793F",
        "pala_modelo": "EX5600",
        "tiempo_vacio_min": 11.0,
        "tiempo_cargado_min": 16.0,
        "operador_caex": "OPERADOR TEST",
        "operador_pala": "PALA TEST",
    }


def _real_dataset() -> dict:
    return {
        "source": "wenco-sql-live",
        "today": "2026-07-12",
        "plan": [{"date": "2026-07-12", "plan_tons": 3000}],
        "cycles": [
            _cycle("CAEX-01", "EX3600", 7, 420),
            _cycle("CAEX-02", "EX3600", 8, 410),
            _cycle("CAEX-03", "EX3517", 9, 390, destino="STOCK"),
            _cycle("CAEX-01", "EX3517", 10, 430),
            _cycle("CAEX-02", "EX3600", 14, 415),
        ],
        "stale": False,
    }


def test_profit_optimization_demo_mode_is_disabled():
    with pytest.raises(ValueError, match="Modo demo deshabilitado"):
        build_profit_optimization_response(None, demo_mode=True)


def test_profit_optimization_real_mode_requires_dataset():
    with pytest.raises(ValueError, match="Dataset operacional requerido"):
        build_profit_optimization_response(None, demo_mode=False)


def test_profit_optimization_real_dataset_ranks_by_risk_adjusted_value():
    payload = build_profit_optimization_response(_real_dataset(), demo_mode=False)

    assert payload["status"] == "OK"
    assert payload["data_source"] == "REAL"
    assert payload["mode"] == "DATOS_REALES"
    assert payload["baseline"]["production_tonnes"] > 0
    assert payload["scenarios"]
    assert payload["data_quality"]["cycles_total"] == 5

    scenarios = payload["scenarios"]
    best = max(scenarios, key=lambda item: item["risk_adjusted_value_usd"])
    highest_production = max(scenarios, key=lambda item: item["production_tonnes"])

    assert payload["best_scenario_id"] == best["id"]
    assert payload["best"]["highest_risk_adjusted_value"] == best["id"]
    assert payload["best"]["highest_production"] == highest_production["id"]
    assert payload["ranking"][0]["scenario_id"] == best["id"]
    assert "highest_production" in payload["best"]
    assert "lowest_cost_per_tonne" in payload["best"]
    assert "highest_margin" in payload["best"]
    assert any("mayor produccion" in item.lower() for item in payload["insights"])
