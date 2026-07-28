from __future__ import annotations

from collections import defaultdict
from datetime import date, datetime, time, timedelta
from typing import Any

import pytest

from app.core.cache import invalidate_cache
from app.services.cockpit_service import build_cockpit_response


def _shift_window(shift_date: str, shift_name: str) -> tuple[datetime, datetime]:
    base_date = date.fromisoformat(shift_date)
    if shift_name == "DIA":
        start = datetime.combine(base_date, time(hour=7))
        return start, datetime.combine(base_date, time(hour=19))
    start = datetime.combine(base_date, time(hour=19))
    return start, start + timedelta(hours=12)


def _cycle(
    timestamp: str,
    caex_id: str,
    loader_id: str,
    tons: int,
    *,
    destino: str = "CHANCADO",
    truck_model: str = "CAT793F",
    loader_model: str = "EX3600",
) -> dict[str, Any]:
    parsed = datetime.fromisoformat(timestamp)
    return {
        "id": f"{caex_id}-{loader_id}-{timestamp}",
        "datetime": parsed.isoformat(timespec="seconds"),
        "fecha_dia": parsed.date().isoformat(),
        "turno_calc": "DIA" if 7 <= parsed.hour < 19 else "NOCHE",
        "hora": parsed.hour,
        "caex_id": caex_id,
        "carguio_id": loader_id,
        "tonelaje": tons,
        "destino": destino,
        "origen": "F01",
        "fase": "F01",
        "camion_modelo": truck_model,
        "pala_modelo": loader_model,
        "tiempo_vacio_min": 11.0,
        "tiempo_cargado_min": 16.0,
        "operador_caex": "OPERADOR TEST",
        "operador_pala": "PALA TEST",
    }


def _shared_dataset() -> dict[str, Any]:
    return {
        "source": "wenco-sql-live",
        "today": "2026-07-14",
        "plan": [{"date": "2026-07-13", "plan_tons": 3000}],
        "stale": False,
        "cycles": [
            _cycle("2026-07-13T08:00:00", "CAEX-99", "EX3600", 220),
            _cycle("2026-07-13T19:10:00", "CAEX-01", "EX3600", 220),
            _cycle("2026-07-13T20:20:00", "CAEX-02", "EX3600", 220),
            _cycle("2026-07-13T20:35:00", "CAEX-03", "EX3517", 380, truck_model="KOM980E"),
            _cycle("2026-07-13T22:40:00", "CAEX-01", "EX3517", 220),
            _cycle("2026-07-14T00:15:00", "CAEX-03", "EX3517", 380, truck_model="KOM980E"),
            _cycle("2026-07-14T06:30:00", "CAEX-04", "EX3600", 190, truck_model="CAT789D"),
            _cycle("2026-07-14T07:05:00", "CAEX-88", "EX3600", 220),
        ],
    }


def _streamlit_style_metrics(dataset: dict[str, Any], selected_date: str, selected_shift: str) -> dict[str, Any]:
    start, end = _shift_window(selected_date, selected_shift)
    records = [
        record
        for record in dataset["cycles"]
        if start <= datetime.fromisoformat(record["datetime"]) < end
    ]
    hourly: dict[str, dict[str, int]] = defaultdict(lambda: {"tons": 0, "cycles": 0})
    loader_hourly: dict[tuple[str, str], dict[str, int]] = defaultdict(lambda: {"tons": 0, "cycles": 0})
    caex_by_hour: dict[int, set[str]] = defaultdict(set)

    for record in records:
        label = f"{int(record['hora']):02d}:00"
        hourly[label]["tons"] += int(record["tonelaje"])
        hourly[label]["cycles"] += 1
        loader_hourly[(str(record["carguio_id"]), label)]["tons"] += int(record["tonelaje"])
        loader_hourly[(str(record["carguio_id"]), label)]["cycles"] += 1
        caex_by_hour[int(record["hora"])].add(str(record["caex_id"]))

    total_tons = sum(int(record["tonelaje"]) for record in records)
    cycles = len(records)
    return {
        "tons": total_tons,
        "cycles": cycles,
        "caex_active": len({record["caex_id"] for record in records}),
        "avg_tonnes_per_cycle": round(total_tons / cycles, 1),
        "avg_caex_in_circuit": round(sum(len(items) for items in caex_by_hour.values()) / len(caex_by_hour), 1),
        "hourly": dict(hourly),
        "loader_hourly": dict(loader_hourly),
        "caex_ids": {record["caex_id"] for record in records},
        "loader_ids": {record["carguio_id"] for record in records},
    }


@pytest.fixture(autouse=True)
def _clear_service_cache():
    invalidate_cache()
    yield
    invalidate_cache()


def test_cockpit_matches_streamlit_turno_noche_window_across_midnight():
    dataset = _shared_dataset()
    expected = _streamlit_style_metrics(dataset, "2026-07-13", "NOCHE")

    payload = build_cockpit_response(
        dataset,
        demo_mode=False,
        selected_date="2026-07-13",
        selected_shift="NOCHE",
    )

    assert payload["data_source"] == "REAL"
    assert payload["source_system"] == "WENCO"
    assert payload["selected_date"] == "2026-07-13"
    assert payload["selected_shift"] == "NOCHE"
    assert payload["production"]["actual_tonnes"] == expected["tons"]
    assert payload["production"]["cycles"] == expected["cycles"]
    assert payload["production"]["caex_active"] == expected["caex_active"]
    assert payload["production"]["avg_tonnes_per_cycle"] == pytest.approx(expected["avg_tonnes_per_cycle"], abs=0.1)
    assert payload["production"]["avg_caex_in_circuit"] == pytest.approx(expected["avg_caex_in_circuit"], abs=0.1)

    actual_hourly = {
        item["hour"]: {"tons": item["tons"], "cycles": item["cycles"]}
        for item in payload["hourly_production"]
        if item["tons"] or item["cycles"]
    }
    assert actual_hourly == expected["hourly"]

    actual_loader_hourly = {
        (item["loader_id"], item["hour"]): {"tons": item["tons"], "cycles": item["cycles"]}
        for item in payload["loader_hourly"]
        if item["tons"] or item["cycles"]
    }
    assert actual_loader_hourly == expected["loader_hourly"]

    assert {item["caex_id"] for item in payload["caex_status"]} == expected["caex_ids"]
    assert {item["id"] for item in payload["shovels"]} == expected["loader_ids"]


def test_cockpit_actual_uses_latest_real_record_not_system_clock():
    dataset = _shared_dataset()

    payload = build_cockpit_response(dataset, demo_mode=False, selected_shift="ACTUAL")

    assert payload["data_source"] == "REAL"
    assert payload["selected_date"] == "2026-07-14"
    assert payload["selected_shift"] == "DIA"
    assert payload["production"]["actual_tonnes"] == 220
    assert payload["production"]["cycles"] == 1


def test_cockpit_actual_with_calendar_date_matches_streamlit_after_midnight():
    dataset = _shared_dataset()
    dataset["cycles"] = [
        item for item in dataset["cycles"]
        if item["datetime"] != "2026-07-14T07:05:00"
    ]
    expected = _streamlit_style_metrics(dataset, "2026-07-13", "NOCHE")

    payload = build_cockpit_response(
        dataset,
        demo_mode=False,
        selected_date="2026-07-14",
        selected_shift="ACTUAL",
    )

    assert payload["selected_date"] == "2026-07-13"
    assert payload["selected_shift"] == "NOCHE"
    assert payload["production"]["actual_tonnes"] == expected["tons"]
    assert payload["production"]["cycles"] == expected["cycles"]
    assert payload["production"]["caex_active"] == expected["caex_active"]
