from __future__ import annotations

import pytest

from app.services.cockpit_service import COCKPIT_API_VERSION, build_cockpit_response


def _cycle(
    caex_id: str,
    carguio_id: str,
    hour: int,
    tons: int,
    destino: str = "CHANCADO",
    sector: str = "F01",
    fecha_dia: str = "2026-07-12",
    shift_date: str | None = None,
) -> dict:
    timestamp = f"{fecha_dia}T{hour:02d}:10:00"
    return {
        "id": f"{caex_id}-{carguio_id}-{hour}",
        "datetime": timestamp,
        "fecha_dia": fecha_dia,
        "shift_date": shift_date or fecha_dia,
        "turno_calc": "DIA",
        "hora": hour,
        "caex_id": caex_id,
        "carguio_id": carguio_id,
        "tonelaje": tons,
        "destino": destino,
        "origen": f"{sector}/2280/102/A",
        "fase": sector,
        "camion_modelo": "CAT793F",
        "pala_modelo": "EX5600",
        "tiempo_vacio_min": 11.0,
        "tiempo_cargado_min": 16.0,
        "haul_distance_km": 3.2,
        "empty_distance_km": 1.4,
        "operador_caex": "OPERADOR TEST",
        "operador_pala": "PALA TEST",
    }


def _real_dataset() -> dict:
    cycles = [
        _cycle("CAEX-01", "EX3600", 7, 420),
        _cycle("CAEX-02", "EX3600", 8, 410),
        _cycle("CAEX-03", "EX3517", 9, 390, destino="STOCK", sector="F02"),
        _cycle("CAEX-01", "EX3517", 10, 430),
        _cycle("CAEX-02", "EX3600", 14, 415),
    ]
    return {
        "source": "wenco-sql-live",
        "today": "2026-07-12",
        "plan": [{"date": "2026-07-12", "plan_tons": 3000}],
        "cycles": cycles,
        "loader_status_durations": [
            {
                "loader_id": "EX3600",
                "status_code": "N13",
                "status_desc": "Pala cargando",
                "start_timestamp": "2026-07-12T07:00",
                "end_timestamp": "2026-07-12T07:06",
            },
            {
                "loader_id": "EX3600",
                "status_code": "N13",
                "status_desc": "Pala cargando",
                "start_timestamp": "2026-07-12T07:10",
                "end_timestamp": "2026-07-12T07:18",
            },
            {
                "loader_id": "EX3600",
                "status_code": "N14",
                "status_desc": "Pala esperando",
                "start_timestamp": "2026-07-12T07:20",
                "end_timestamp": "2026-07-12T07:25",
            },
        ],
        "stale": False,
    }


def test_cockpit_demo_mode_is_disabled():
    with pytest.raises(ValueError, match="Modo demo deshabilitado"):
        build_cockpit_response(None, demo_mode=True)


def test_cockpit_real_mode_requires_operational_dataset():
    with pytest.raises(ValueError, match="Dataset operacional requerido"):
        build_cockpit_response(None, demo_mode=False)


def test_cockpit_real_contract_is_composed_from_operational_dataset():
    payload = build_cockpit_response(_real_dataset(), demo_mode=False)

    assert payload["status"] == "OK"
    assert payload["api_version"] == COCKPIT_API_VERSION == "v1"
    assert payload["data_source"] == "REAL"
    assert payload["mode"] == "DATOS_REALES"
    assert payload["production"]["actual_tonnes"] > 0
    assert payload["production"]["target_tonnes"] == 70000
    assert payload["production"]["daily_target_tonnes"] == 140000
    assert payload["production"]["target_source"] == "NORTHMINE_SHIFT_TARGET_TONS"
    assert payload["production"]["cycles"] == 5
    assert payload["production"]["caex_active"] >= 1
    assert payload["production"]["avg_tonnes_per_cycle"] > 0
    assert payload["production"]["avg_caex_in_circuit"] > 0
    sectors = {item["sector"]: item for item in payload["production"]["sectors"]}
    assert sectors["F01"]["actual_tonnes"] == 1675
    assert sectors["F02"]["actual_tonnes"] == 390
    assert sectors["F01"]["forecast_tonnes"] >= sectors["F01"]["actual_tonnes"]
    assert sectors["F02"]["source"] == "WENCO_ORIGIN"
    assert payload["economics"]["source"] == "backend-estimated"
    assert payload["recommendation"]["confidence"] in {"BAJA", "MEDIA", "ALTA"}
    assert payload["scenarios"]
    assert payload["hourly_production"]
    assert payload["hourly_production"][0]["cycles"] >= 0
    assert payload["loader_hourly"]
    first_loader_hour = next(item for item in payload["loader_hourly"] if item["loader_id"] == "EX3600")
    assert first_loader_hour["origin"] == "F01/2280/102/A"
    assert first_loader_hour["destination"] in {"CHANCADO", "Destino sin dato"}
    assert first_loader_hour["avg_distance_km"] == 4.6
    assert first_loader_hour["avg_loading_time_min"] == 7.0
    assert first_loader_hour["avg_loading_time_source"] == "WENCO_N13"
    assert first_loader_hour["avg_caex_wait_time_min"] == 5.0
    assert first_loader_hour["avg_caex_wait_time_source"] == "WENCO_N14"
    assert payload["caex_status"]
    assert payload["shovels"]
    assert payload["shovels"][0]["cycles"] >= 0
    assert payload["data_quality"]["cycles_total"] == 5
    assert payload["data_quality"]["score"] > 0
    assert payload["operational_alerts"]["counts"]
    assert "refresh_policy" in payload


def test_cockpit_uses_operational_shift_target_when_daily_plan_is_missing():
    dataset = _real_dataset()
    dataset["plan"] = []

    payload = build_cockpit_response(dataset, demo_mode=False)

    assert payload["data_source"] == "REAL"
    assert payload["production"]["target_tonnes"] == 70000
    assert payload["production"]["daily_target_tonnes"] == 140000
    assert payload["production"]["target_source"] == "NORTHMINE_SHIFT_TARGET_TONS"
    assert payload["production"]["compliance_pct"] == round(
        payload["production"]["actual_tonnes"] / 70000 * 100,
        1,
    )
    assert not any("Meta de turno no configurada" in warning for warning in payload["warnings"])


def test_cockpit_actual_selected_night_date_includes_post_midnight_operational_records():
    cycles = [
        _cycle(
            "CAEX-01",
            "EX3600",
            0,
            9000,
            sector="F01",
            fecha_dia="2026-07-14",
            shift_date="2026-07-13",
        ),
        _cycle(
            "CAEX-02",
            "EX3600",
            19,
            1000,
            sector="F01",
            fecha_dia="2026-07-14",
            shift_date="2026-07-14",
        ),
        _cycle(
            "CAEX-03",
            "EX3517",
            2,
            2000,
            sector="F02",
            fecha_dia="2026-07-15",
            shift_date="2026-07-14",
        ),
    ]
    for row in cycles:
        row["turno_calc"] = "NOCHE"
    dataset = {
        "source": "wenco-sql-live",
        "today": "2026-07-14",
        "plan": [{"date": "2026-07-14", "plan_tons": 3000}],
        "cycles": cycles,
        "loader_status_durations": [],
        "stale": False,
    }

    payload = build_cockpit_response(
        dataset,
        demo_mode=False,
        selected_date="2026-07-14",
        selected_shift="ACTUAL",
    )

    assert payload["selected_date"] == "2026-07-14"
    assert payload["selected_shift"] == "NOCHE"
    assert payload["shift"]["started_at"] == "2026-07-14T19:00"
    assert payload["shift"]["ends_at"] == "2026-07-15T07:00"
    assert payload["production"]["actual_tonnes"] == 3000
    assert payload["production"]["cycles"] == 2
    sectors = {item["sector"]: item for item in payload["production"]["sectors"]}
    assert sectors["F01"]["actual_tonnes"] == 1000
    assert sectors["F02"]["actual_tonnes"] == 2000
