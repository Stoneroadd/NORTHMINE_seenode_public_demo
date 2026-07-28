from __future__ import annotations

from app.services import kpis


def _cycle(caex_id: str, loader_id: str, hour: int, tonnes: int) -> dict:
    return {
        "id": f"{caex_id}-{loader_id}-{hour}",
        "datetime": f"2026-07-14T{hour:02d}:10:00",
        "fecha_dia": "2026-07-14",
        "turno_calc": "DIA",
        "hora": hour,
        "caex_id": caex_id,
        "carguio_id": loader_id,
        "tonelaje": tonnes,
        "destino": "BOT 2440 OESTE",
        "origen": "F01",
        "fase": "F01",
        "camion_modelo": "CAT793F",
        "pala_modelo": "EX5600",
        "tiempo_vacio_min": 11.0,
        "tiempo_cargado_min": 16.0,
        "operador_caex": "OPERADOR TEST",
        "operador_pala": "PALA TEST",
    }


def _dataset(stale: bool = False) -> dict:
    return {
        "source": "wenco-sql-live",
        "today": "2026-07-14",
        "plan": [{"date": "2026-07-14", "plan_tons": 140000}],
        "cycles": [
            _cycle("CAEX-01", "EX3600", 7, 420),
            _cycle("CAEX-02", "EX3600", 8, 430),
            _cycle("CAEX-03", "EX3517", 9, 410),
        ],
        "stale": stale,
    }


def test_shift_report_exposes_real_system_metadata(monkeypatch):
    monkeypatch.setattr(kpis, "_provider_get_equipment_status", lambda: {})

    payload = kpis.build_shift_report(_dataset(), turno="DIA")

    assert payload["status"] == "OK"
    assert payload["api_version"] == "v1"
    assert payload["data_source"] == "REAL"
    assert payload["source_system"] == "WENCO"
    assert payload["data_source_status"] == "CONNECTED"
    assert payload["last_real_record"] == "2026-07-14T09:10:00"
    assert payload["toneladas"] == 1260
    assert payload["top_carguio"]["carguio_id"] == "EX3600"


def test_shift_report_marks_cached_real_dataset(monkeypatch):
    monkeypatch.setattr(kpis, "_provider_get_equipment_status", lambda: {})

    payload = kpis.build_shift_report(_dataset(stale=True), turno="DIA")

    assert payload["data_source"] == "REAL"
    assert payload["source_system"] == "WENCO"
    assert payload["data_source_status"] == "CACHE"
    assert payload["stale"] is True
    assert payload["warnings"] == ["Datos WENCO servidos desde cache."]
