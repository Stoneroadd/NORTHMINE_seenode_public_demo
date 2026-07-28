from __future__ import annotations

import pytest

from app.services.shift_comparison_service import build_shift_comparison_response


def _cycle(
    *,
    record_id: str,
    shift: str,
    shift_date: str,
    fecha_dia: str,
    hour: int,
    minute: int = 10,
    loader: str,
    truck: str,
    tonnes: int,
    loader_operator: str | None = None,
    truck_operator: str | None = None,
) -> dict:
    return {
        "id": record_id,
        "datetime": f"{fecha_dia}T{hour:02d}:{minute:02d}:00",
        "shift_date": shift_date,
        "fecha_dia": fecha_dia,
        "turno_calc": shift,
        "hora": hour,
        "carguio_id": loader,
        "pala_modelo": "EX5600",
        "caex_id": truck,
        "camion_modelo": "CAT793F",
        "tonelaje": tonnes,
        "origen": "2280 / 103",
        "destino": "BOT 2440 OESTE",
        "operador_pala": loader_operator,
        "operador_caex": truck_operator,
        "haul_distance_km": 2.5,
        "empty_distance_km": 1.2,
        "tiempo_cargado_min": 4.0,
        "tiempo_vacio_min": 2.0,
        "tiempo_ciclo_min": 13.5,
    }


def _dataset_for_reference_time(fecha_dia: str, hour: int, minute: int = 0) -> dict:
    if 7 <= hour < 19:
        shift = "DIA"
        shift_date = fecha_dia
    elif hour >= 19:
        shift = "NOCHE"
        shift_date = fecha_dia
    else:
        shift = "NOCHE"
        year, month, day = (int(part) for part in fecha_dia.split("-"))
        from datetime import date, timedelta

        shift_date = (date(year, month, day) - timedelta(days=1)).isoformat()

    return {
        "source": "wenco-sql-live",
        "today": fecha_dia,
        "stale": False,
        "cycles": [
            _cycle(
                record_id="REF",
                shift=shift,
                shift_date=shift_date,
                fecha_dia=fecha_dia,
                hour=hour,
                minute=minute,
                loader="EX3600",
                truck="CAEX-01",
                tonnes=250,
                loader_operator="Operador EX3600",
                truck_operator="Operador CAEX-01",
            )
        ],
    }


def _dataset() -> dict:
    return {
        "source": "wenco-sql-live",
        "today": "2026-07-13",
        "stale": False,
        "cycles": [
            _cycle(
                record_id="D1",
                shift="DIA",
                shift_date="2026-07-13",
                fecha_dia="2026-07-13",
                hour=7,
                loader="EX3600",
                truck="CAEX-01",
                tonnes=200,
                loader_operator="Juan Pala",
                truck_operator="Ana CAEX",
            ),
            _cycle(
                record_id="D2",
                shift="DIA",
                shift_date="2026-07-13",
                fecha_dia="2026-07-13",
                hour=8,
                loader="EX3517",
                truck="CAEX-02",
                tonnes=300,
                loader_operator="Maria Pala",
                truck_operator="Luis CAEX",
            ),
            _cycle(
                record_id="N1",
                shift="NOCHE",
                shift_date="2026-07-13",
                fecha_dia="2026-07-13",
                hour=19,
                loader="EX3600",
                truck="CAEX-01",
                tonnes=250,
                loader_operator="Juan Pala",
                truck_operator="Ana CAEX",
            ),
            _cycle(
                record_id="N2",
                shift="NOCHE",
                shift_date="2026-07-13",
                fecha_dia="2026-07-14",
                hour=0,
                loader="EX3517",
                truck="CAEX-03",
                tonnes=400,
                loader_operator="Maria Pala",
                truck_operator="Pedro CAEX",
            ),
        ],
        "loader_status_durations": [
            {
                "loader_id": "EX3517",
                "status_code": "N13",
                "status_desc": "Pala cargando",
                "start_timestamp": "2026-07-14T00:01:00",
                "end_timestamp": "2026-07-14T00:05:00",
            },
            {
                "loader_id": "EX3517",
                "status_code": "N14",
                "status_desc": "Pala esperando",
                "start_timestamp": "2026-07-14T00:05:00",
                "end_timestamp": "2026-07-14T00:07:00",
            },
            {
                "loader_id": "EX3517",
                "status_code": "M30",
                "status_desc": "Averia pala",
                "start_timestamp": "2026-07-14T00:07:00",
                "end_timestamp": "2026-07-14T00:10:00",
            },
            {
                "loader_id": "EX3517",
                "status_code": "O02",
                "status_desc": "Colacion",
                "start_timestamp": "2026-07-14T00:10:00",
                "end_timestamp": "2026-07-14T00:12:00",
            },
            {
                "loader_id": "CAEX-03",
                "status_code": "N04",
                "status_desc": "Transportando",
                "start_timestamp": "2026-07-14T00:12:00",
                "end_timestamp": "2026-07-14T00:27:00",
            },
            {
                "loader_id": "CAEX-03",
                "status_code": "N3",
                "status_desc": "Retorno vacio a pala",
                "start_timestamp": "2026-07-14T00:30:00",
                "end_timestamp": "2026-07-14T00:42:00",
            },
            {
                "loader_id": "CAEX-03",
                "status_code": "N06",
                "status_desc": "Espera en pala",
                "start_timestamp": "2026-07-14T00:42:00",
                "end_timestamp": "2026-07-14T00:47:00",
            },
            {
                "loader_id": "CAEX-03",
                "status_code": "N13",
                "status_desc": "Cargando",
                "start_timestamp": "2026-07-14T00:47:00",
                "end_timestamp": "2026-07-14T00:51:00",
            },
            {
                "loader_id": "CAEX-03",
                "status_code": "O16",
                "status_desc": "Detenido por combustible",
                "start_timestamp": "2026-07-14T00:51:00",
                "end_timestamp": "2026-07-14T00:54:00",
            },
        ],
    }


def test_shift_comparison_uses_shift_date_for_night_after_midnight():
    payload = build_shift_comparison_response(_dataset(), demo_mode=False, selected_date="2026-07-13")

    assert payload["status"] == "OK"
    assert payload["data_source"] == "REAL"
    assert payload["source_system"] == "WENCO"
    assert payload["summary"]["dia"]["total_tonnes"] == 500
    assert payload["summary"]["noche"]["total_tonnes"] == 650
    assert payload["summary"]["difference_tonnes"] == -150
    assert payload["summary"]["leader"] == "NOCHE"

    first_hour = payload["hourly"][0]
    assert first_hour["dia_hour"] == "07:00"
    assert first_hour["noche_hour"] == "19:00"
    assert first_hour["dia_tonnes"] == 200
    assert first_hour["noche_tonnes"] == 250

    sixth_hour = payload["hourly"][5]
    assert sixth_hour["noche_hour"] == "00:00"
    assert sixth_hour["noche_tonnes"] == 400
    assert payload["selected_date"] == "2026-07-13"


def test_shift_comparison_builds_loading_unit_and_caex_rankings():
    payload = build_shift_comparison_response(_dataset(), demo_mode=False, selected_date="2026-07-13")

    loaders = {item["id"]: item for item in payload["loading_units"]}
    assert loaders["EX3600"]["dia_tonnes"] == 200
    assert loaders["EX3600"]["noche_tonnes"] == 250
    assert loaders["EX3600"]["assigned_caex"] == 1
    assert loaders["EX3600"]["dia_assigned_caex"] == 1
    assert loaders["EX3600"]["noche_assigned_caex"] == 1
    assert loaders["EX3600"]["operator"] == "Juan Pala"
    assert loaders["EX3600"]["dia_operator"] == "Juan Pala"
    assert loaders["EX3600"]["noche_operator"] == "Juan Pala"
    assert loaders["EX3600"]["main_destination"] == "BOT 2440 OESTE"
    assert loaders["EX3600"]["bench_mesh"] == "2280 / 103"
    assert loaders["EX3517"]["total_tonnes"] == 700
    assert loaders["EX3517"]["dia_operator"] == "Maria Pala"
    assert loaders["EX3517"]["noche_operator"] == "Maria Pala"

    caex = {item["id"]: item for item in payload["caex"]}
    assert caex["CAEX-01"]["total_tonnes"] == 450
    assert caex["CAEX-01"]["operator"] == "Ana CAEX"
    assert caex["CAEX-01"]["dia_operator"] == "Ana CAEX"
    assert caex["CAEX-01"]["noche_operator"] == "Ana CAEX"
    assert caex["CAEX-03"]["noche_tonnes"] == 400
    assert caex["CAEX-03"]["noche_operator"] == "Pedro CAEX"
    assert caex["CAEX-03"]["noche_main_loading_unit"] == "EX3517"
    assert caex["CAEX-03"]["noche_loading_unit_pct"] == 100.0
    assert caex["CAEX-03"]["efficiency_pct"] > 0


def test_shift_comparison_builds_loading_unit_hourly_detail():
    payload = build_shift_comparison_response(_dataset(), demo_mode=False, selected_date="2026-07-13")

    hourly = [
        item for item in payload["loading_unit_hourly"]
        if item["equipment_id"] == "EX3517"
    ]
    assert len(hourly) == 12
    assert hourly[1]["dia_hour"] == "08:00"
    assert hourly[1]["dia_tonnes"] == 300
    assert hourly[1]["dia_operator"] == "Maria Pala"
    assert hourly[5]["noche_hour"] == "00:00"
    assert hourly[5]["noche_tonnes"] == 400
    assert hourly[5]["noche_operator"] == "Maria Pala"
    assert hourly[5]["noche_origin"] == "2280 / 103"
    assert hourly[5]["noche_destination"] == "BOT 2440 OESTE"
    assert hourly[5]["noche_distance_km"] == 3.7
    assert hourly[5]["noche_loaded_distance_km"] == 2.5
    assert hourly[5]["noche_loading_time_min"] == 4.0
    assert hourly[5]["noche_loading_time_source"] == "WENCO_N13"
    assert hourly[5]["noche_caex_wait_time_min"] == 2.0
    assert hourly[5]["noche_caex_wait_time_source"] == "WENCO_N14"
    assert hourly[5]["noche_cycle_time_min"] == 13.5
    assert hourly[5]["noche_maintenance_code"] == "M30"
    assert hourly[5]["noche_maintenance_desc"] == "Averia"
    assert hourly[5]["noche_maintenance_minutes"] == 3.0
    status_codes = {item["code"]: item for item in hourly[5]["noche_status_breakdown"]}
    assert status_codes["N13"]["description"] == "Pala Cargando"
    assert status_codes["N14"]["description"] == "Pala Esperando"
    assert status_codes["M30"]["category"] == "MANTENCION"
    assert status_codes["O02"]["description"] == "Colacion"
    assert status_codes["O02"]["minutes"] == 2.0
    assert hourly[5]["leader"] == "NOCHE"


def test_shift_comparison_builds_caex_n04_n03_route_cycle_detail():
    payload = build_shift_comparison_response(_dataset(), demo_mode=False, selected_date="2026-07-13")

    hourly = [
        item for item in payload["caex_hourly"]
        if item["equipment_id"] == "CAEX-03"
    ]
    assert len(hourly) == 12
    assert hourly[5]["noche_hour"] == "00:00"
    assert hourly[5]["noche_transport_time_min"] == 15.0
    assert hourly[5]["noche_transport_time_source"] == "WENCO_N04"
    assert hourly[5]["noche_distance_km"] == 3.7
    assert hourly[5]["noche_loaded_distance_km"] == 2.5
    assert hourly[5]["noche_empty_return_time_min"] == 12.0
    assert hourly[5]["noche_empty_return_time_source"] == "WENCO_N03"
    assert hourly[5]["noche_travel_cycle_time_min"] == 27.0
    assert hourly[5]["noche_travel_cycle_time_source"] == "WENCO_N04_N03"
    assert hourly[5]["noche_shovel_wait_time_min"] == 5.0
    assert hourly[5]["noche_shovel_wait_time_source"] == "WENCO_N06"
    assert hourly[5]["noche_caex_cycle_time_min"] == 32.0
    assert hourly[5]["noche_caex_cycle_time_source"] == "WENCO_N04_N03_N06_TO_N13"
    status_codes = {item["code"]: item for item in hourly[5]["noche_status_breakdown"]}
    assert status_codes["N04"]["description"] == "Transportando"
    assert status_codes["N03"]["description"] == "Vacio"
    assert status_codes["N06"]["description"] == "Cola en Pala"
    assert status_codes["O16"]["description"] == "Detenido por Combustible"
    assert status_codes["O16"]["category"] == "OPERACIONAL"


def test_shift_comparison_demo_mode_is_disabled():
    with pytest.raises(ValueError, match="Modo demo deshabilitado"):
        build_shift_comparison_response(None, demo_mode=True, selected_date="2026-07-13")


def test_shift_comparison_resolves_pre_dawn_operational_date():
    payload = build_shift_comparison_response(
        _dataset_for_reference_time("2026-07-14", 2),
        demo_mode=False,
    )

    assert payload["selected_date"] == "2026-07-13"
    assert payload["operational_context"]["turno_nombre"] == "NOCHE"
    assert payload["operational_context"]["fecha_operacional"] == "2026-07-13"
    assert payload["operational_context"]["turno_inicio"] == "2026-07-13T19:00"
    assert payload["operational_context"]["turno_fin"] == "2026-07-14T07:00"
    assert payload["summary"]["noche"]["total_tonnes"] == 250


def test_shift_comparison_resolves_pre_seven_boundary():
    payload = build_shift_comparison_response(
        _dataset_for_reference_time("2026-07-14", 6, 59),
        demo_mode=False,
    )

    assert payload["selected_date"] == "2026-07-13"
    assert payload["operational_context"]["turno_nombre"] == "NOCHE"


def test_shift_comparison_resolves_day_shift_boundary():
    payload = build_shift_comparison_response(
        _dataset_for_reference_time("2026-07-14", 7),
        demo_mode=False,
    )

    assert payload["selected_date"] == "2026-07-14"
    assert payload["operational_context"]["turno_nombre"] == "DIA"
    assert payload["operational_context"]["fecha_operacional"] == "2026-07-14"


def test_shift_comparison_resolves_evening_night_shift():
    payload = build_shift_comparison_response(
        _dataset_for_reference_time("2026-07-14", 19, 30),
        demo_mode=False,
    )

    assert payload["selected_date"] == "2026-07-14"
    assert payload["operational_context"]["turno_nombre"] == "NOCHE"
    assert payload["operational_context"]["fecha_operacional"] == "2026-07-14"
