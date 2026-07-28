from __future__ import annotations

import pytest

from app.core.cache import invalidate_cache
from app.services import kpis
from app.services.wenco_data import _status_category


@pytest.mark.parametrize(
    ("status_code", "expected"),
    [
        ("N03", "PRODUCTIVO"),
        ("N04", "PRODUCTIVO"),
        ("M30", "MANTENCION"),
        ("M10", "MANTENCION"),
        ("O01", "DEMORA_OPERACIONAL"),
        ("S99", "STANDBY"),
        ("", "SIN_DATO"),
        (None, "SIN_DATO"),
        ("80", "SIN_DATO"),
    ],
)
def test_status_category_by_prefix(status_code, expected):
    assert _status_category(status_code) == expected


def _cycle(
    caex_id: str,
    datetime_str: str,
    tonelaje: int = 100,
    operador_caex: str | None = None,
    operador_pala: str | None = None,
) -> dict:
    return {
        "id": f"{caex_id}-{datetime_str}",
        "datetime": datetime_str,
        "fecha_dia": datetime_str[:10],
        "turno_calc": "DIA",
        "hora": int(datetime_str[11:13]),
        "caex_id": caex_id,
        "camion_modelo": "CAT793F",
        "carguio_id": "EX3600",
        "pala_modelo": "PC5500",
        "material": "MINERAL",
        "origen": "F01",
        "destino": "CHANCADO",
        "fase": "F01",
        "tonelaje": tonelaje,
        "viajes": 1,
        "operador_caex": operador_caex,
        "operador_pala": operador_pala,
    }


def _dataset() -> dict:
    return {
        "source": "wenco-sql-live",
        "today": "2026-07-04",
        "plan": [],
        "cycles": [
            _cycle("CA0001", "2026-07-04T10:00"),
            _cycle("CA0002", "2026-07-04T10:00"),
        ],
    }


def test_build_fleet_status_uses_real_equipment_status(monkeypatch):
    monkeypatch.setattr(
        kpis,
        "_provider_get_equipment_status",
        lambda: {
            "CA0001": {"status_code": "M30", "status_desc": "Averia", "category": "MANTENCION"},
        },
    )
    rows = kpis.build_fleet_status(_dataset())
    by_id = {row["caex_id"]: row for row in rows}
    assert by_id["CA0001"]["estado"] == "MANTENCION"
    assert by_id["CA0001"]["status_code"] == "M30"
    assert by_id["CA0001"]["alerta"] == "Averia"


def test_build_fleet_status_falls_back_when_no_real_status(monkeypatch):
    monkeypatch.setattr(kpis, "_provider_get_equipment_status", lambda: {})
    rows = kpis.build_fleet_status(_dataset())
    by_id = {row["caex_id"]: row for row in rows}
    # Sin estado real disponible: no se fabrica un estado por indice, se
    # aproxima solo con el tiempo real desde el ultimo ciclo.
    assert by_id["CA0002"]["status_code"] is None
    assert by_id["CA0002"]["estado"] in {"ACTIVO", "SIN ACTIVIDAD"}


def test_build_fleet_status_uses_real_operator_name(monkeypatch):
    monkeypatch.setattr(kpis, "_provider_get_equipment_status", lambda: {})
    dataset = {
        "source": "wenco-sql-live",
        "today": "2026-07-04",
        "plan": [],
        "cycles": [_cycle("CA0001", "2026-07-04T10:00", operador_caex="JUAN PEREZ SOTO")],
    }
    rows = kpis.build_fleet_status(dataset)
    assert rows[0]["operador"] == "JUAN PEREZ SOTO"


def test_build_fleet_status_separates_standby_from_inactivity(monkeypatch):
    invalidate_cache("build_fleet")
    monkeypatch.setattr(
        kpis,
        "_provider_get_equipment_status",
        lambda: {
            "CA0001": {
                "status_code": "S99",
                "status_desc": "Standby",
                "category": "STANDBY",
                "start_timestamp": "2026-07-04T09:30",
                "end_timestamp": None,
            },
        },
    )
    dataset = _dataset()
    rows = kpis.build_fleet_status(dataset)
    by_id = {row["caex_id"]: row for row in rows}

    assert by_id["CA0001"]["estado"] == "STANDBY"
    assert by_id["CA0001"]["status_category"] == "STANDBY"
    assert by_id["CA0001"]["gestion_flota"] == "STANDBY_JUSTIFICADO"

    overview = kpis.build_fleet_overview(dataset)
    assert overview["equipos_standby"] == 1
    assert overview["equipos_sin_actividad"] == 0

    alerts = kpis._status_based_alerts(rows, [])
    assert all(alert["equipment_id"] != "CA0001" for alert in alerts)


def test_build_fleet_status_operator_is_none_without_badge_match(monkeypatch):
    monkeypatch.setattr(kpis, "_provider_get_equipment_status", lambda: {})
    dataset = {
        "source": "wenco-sql-live",
        "today": "2026-07-04",
        "plan": [],
        "cycles": [_cycle("CA0001", "2026-07-04T10:00")],
    }
    rows = kpis.build_fleet_status(dataset)
    # Sin match de badge -> None, nunca un nombre inventado (HU-11.4).
    assert rows[0]["operador"] is None
