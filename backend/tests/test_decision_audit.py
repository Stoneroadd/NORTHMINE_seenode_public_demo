from __future__ import annotations

from types import SimpleNamespace

import pytest

from app.api import operational as routes
from app.services.decision_audit_service import (
    DECISION_AUDIT_API_VERSION,
    build_decision_audit_history,
    build_decision_audit_response,
    calculate_historical_effectiveness,
    evaluate_decision_effectiveness,
)


def _cycle(caex_id: str, carguio_id: str, hour: int, tons: int, destino: str = "CHANCADO") -> dict:
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
        "tiempo_vacio_min": 13.0,
        "tiempo_cargado_min": 19.0,
        "operador_caex": "OPERADOR TEST",
        "operador_pala": "PALA TEST",
    }


def _dataset(extra: dict | None = None) -> dict:
    dataset = {
        "source": "wenco-sql-live",
        "today": "2026-07-12",
        "plan": [{"date": "2026-07-12", "plan_tons": 3000}],
        "cycles": [
            _cycle("CAEX-01", "EX3600", 7, 420),
            _cycle("CAEX-02", "EX3600", 8, 410),
            _cycle("CAEX-03", "EX3517", 9, 390, destino="STOCK"),
            _cycle("CAEX-01", "EX3517", 10, 430),
            _cycle("CAEX-02", "EX3600", 14, 415),
            _cycle("CAEX-04", "EX3600", 15, 120),
        ],
        "novedades": [
            {"timestamp": "2026-07-12T07:30:00", "turno": "DIA", "texto": "Espera por operador en CAEX 01.", "equipo": "CAEX 01"},
            {"timestamp": "2026-07-12T08:40:00", "turno": "DIA", "texto": "CAEX 02 en standby durante relevo.", "equipo": "CAEX 02"},
        ],
        "stale": False,
    }
    if extra:
        dataset.update(extra)
    return dataset


def _recommendation(decision_id: str, action_type: str = "REDISTRIBUCION_OPERACIONAL") -> dict:
    return {
        "decision_id": decision_id,
        "advisor_recommendation_id": f"advisor-{decision_id}",
        "generated_at": "2026-07-12T08:00:00",
        "source": "DISPATCHER_ADVISOR",
        "situation": "Situacion de prueba",
        "recommended_action": "Accion recomendada",
        "action_type": action_type,
        "expected_impact": {
            "delta_tonnes": 1000,
            "delta_usd": 10000,
            "delta_risk": -0.05,
            "queue_reduction_minutes": 2.0,
        },
        "confidence": "MEDIA",
        "evidence": [],
        "status": "PENDIENTE",
    }


def _actual(decision_id: str, status: str, value: int = 8000, tonnes: int = 850) -> dict:
    return {
        "decision_id": decision_id,
        "execution_status": status,
        "executed_at": "2026-07-12T09:00:00",
        "actual_action": "Accion ejecutada",
        "observed_window": {"start": "2026-07-12T09:00:00", "end": "2026-07-12T11:00:00"},
        "actual_impact": {
            "delta_tonnes": tonnes,
            "delta_usd": value,
            "delta_risk": -0.04,
            "queue_reduction_minutes": 1.5,
        },
        "data_quality": 82,
        "confidence": "MEDIA",
        "evidence": [],
    }


def test_decision_audit_real_without_history_does_not_invent_metrics():
    payload = build_decision_audit_response(_dataset(), demo_mode=False, selected_date="2026-07-12", selected_shift="DIA")

    assert payload["status"] == "SIN_HISTORIAL"
    assert payload["api_version"] == DECISION_AUDIT_API_VERSION == "v1"
    assert payload["data_source"] == "REAL"
    assert payload["source_system"] == "NORTHMINE"
    assert payload["operational_source_system"] == "WENCO"
    assert payload["records"] == []
    assert payload["historical_metrics"] is None
    assert payload["executive_summary"] is None
    assert payload["summary"]["recommendations"] == 0
    assert payload["summary"]["executed"] == 0
    assert payload["current_decision"]["execution_status"] == "PENDIENTE"
    assert payload["current_decision"]["actual_impact"]["delta_usd"] is None
    assert payload["current_decision"]["evaluation"]["status"] == "INSUFICIENTE"
    assert "Sin historial real" in payload["warnings"][0]


def test_decision_audit_demo_mode_is_disabled():
    with pytest.raises(ValueError, match="Modo demo deshabilitado"):
        build_decision_audit_response(None, demo_mode=True)


def test_evaluate_pending_decision_is_insufficient():
    evaluation = evaluate_decision_effectiveness(_recommendation("r1"), None)

    assert evaluation["status"] == "INSUFICIENTE"
    assert evaluation["effectiveness_score"] is None
    assert evaluation["actual_value_usd"] is None


def test_evaluate_executed_decision_calculates_value_recovery_and_accuracy():
    evaluation = evaluate_decision_effectiveness(_recommendation("r1"), _actual("r1", "EJECUTADA", value=8200, tonnes=900))

    assert evaluation["status"] == "OK"
    assert evaluation["expected_value_usd"] == 10000
    assert evaluation["actual_value_usd"] == 8200
    assert evaluation["value_recovery_ratio"] == pytest.approx(82.0)
    assert evaluation["tonnage_accuracy"] == pytest.approx(90.0)
    assert evaluation["overall_accuracy"] > 0


def test_evaluate_partial_and_negative_result_keeps_negative_value_visible():
    evaluation = evaluate_decision_effectiveness(_recommendation("r1"), _actual("r1", "PARCIAL", value=-500, tonnes=100))

    assert evaluation["status"] == "OK"
    assert evaluation["actual_value_usd"] == -500
    assert evaluation["deviation"]["value_usd"] == -10500
    assert any("negativo" in item for item in evaluation["warnings"])
    assert any("parcialmente" in item for item in evaluation["warnings"])


def test_evaluate_incomplete_result_uses_available_metrics():
    actual = _actual("r1", "EJECUTADA", value=0, tonnes=920)
    actual["actual_impact"].pop("delta_usd")

    evaluation = evaluate_decision_effectiveness(_recommendation("r1"), actual)

    assert evaluation["status"] == "OK"
    assert evaluation["economic_accuracy"] is None
    assert evaluation["tonnage_accuracy"] == pytest.approx(92.0)
    assert evaluation["overall_accuracy"] is not None


def test_history_empty_returns_sin_historial():
    history = build_decision_audit_history([_recommendation("r1")], None)

    assert history["status"] == "SIN_HISTORIAL"
    assert history["records"] == []
    assert "Aun no existen" in history["message"]


def test_historical_metrics_require_minimum_evaluated_records():
    history = build_decision_audit_history([_recommendation("r1")], [_actual("r1", "EJECUTADA")])
    metrics = calculate_historical_effectiveness(history["records"])

    assert metrics["status"] == "INSUFICIENTE"
    assert metrics["evaluated"] == 1
    assert metrics["average_effectiveness_pct"] is None


def test_historical_metrics_calculate_effectiveness_with_sufficient_records():
    recommendations = [
        _recommendation("r1", "REDISTRIBUCION_OPERACIONAL"),
        _recommendation("r2", "REDISTRIBUCION_OPERACIONAL"),
        _recommendation("r3", "OPTIMIZACION_COSTO"),
        _recommendation("r4", "BALANCE_CARGUIO"),
    ]
    history = build_decision_audit_history(
        recommendations,
        [
            _actual("r1", "EJECUTADA", value=9000, tonnes=950),
            _actual("r2", "PARCIAL", value=5000, tonnes=600),
            _actual("r3", "EJECUTADA", value=12000, tonnes=800),
            _actual("r4", "NO_EJECUTADA", value=0, tonnes=0),
        ],
    )
    metrics = calculate_historical_effectiveness(history["records"])

    assert metrics["status"] == "OK"
    assert metrics["recommendations"] == 4
    assert metrics["executed"] == 2
    assert metrics["partial"] == 1
    assert metrics["not_executed"] == 1
    assert metrics["adoption_rate_pct"] == pytest.approx(75.0)
    assert metrics["expected_value_usd"] == 40000
    assert metrics["actual_value_usd"] == 26000
    assert metrics["value_recovery_ratio_pct"] == pytest.approx(65.0)
    assert metrics["best_action_type"]
    assert metrics["worst_action_type"]


def test_decision_audit_real_with_history_uses_provided_execution_records():
    recommendations = [_recommendation("r1"), _recommendation("r2"), _recommendation("r3")]
    payload = build_decision_audit_response(
        _dataset(
            {
                "advisor_recommendations": recommendations,
                "decision_execution_history": [
                    _actual("r1", "EJECUTADA"),
                    _actual("r2", "PARCIAL", value=4000, tonnes=500),
                    _actual("r3", "EJECUTADA", value=11000, tonnes=1000),
                ],
            }
        ),
        demo_mode=False,
        selected_date="2026-07-12",
        selected_shift="DIA",
    )

    assert payload["status"] == "OK"
    assert payload["data_source"] == "REAL"
    assert len(payload["records"]) == 3
    assert payload["historical_metrics"]["status"] == "OK"
    assert payload["executive_summary"]["advisor_accuracy_pct"] > 0


def test_decision_audit_endpoint_contract(monkeypatch, client, login_as_admin):
    monkeypatch.setattr(routes, "get_settings", lambda: SimpleNamespace(demo_mode=False))
    monkeypatch.setattr(routes, "_cockpit_dataset", lambda request: (_dataset(), "2026-07-12", "DIA"))

    response = client.get(
        "/api/decision-audit?date=2026-07-12&shift=DIA",
        headers={"Authorization": f"Bearer {login_as_admin['access_token']}"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["api_version"] == "v1"
    assert payload["data_source"] == "REAL"
    assert payload["advisor_source"] == "AI_DISPATCHER_ADVISOR"
