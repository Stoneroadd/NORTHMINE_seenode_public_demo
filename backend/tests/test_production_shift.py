from __future__ import annotations

from app.services.kpis import build_production_shift


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
    }


def _dataset(cycles: list[dict], stale: bool = False) -> dict:
    return {
        "source": "wenco-sql-live",
        "today": "2026-07-14",
        "plan": [{"date": "2026-07-14", "plan_tons": 140000}],
        "cycles": cycles,
        "stale": stale,
    }


def test_production_shift_exposes_real_connection_metadata():
    payload = build_production_shift(
        _dataset([
            _cycle("CAEX-01", "EX3600", 7, 420),
            _cycle("CAEX-02", "EX3600", 8, 430),
        ]),
        turno="DIA",
    )

    assert payload["status"] == "OK"
    assert payload["api_version"] == "v1"
    assert payload["data_source"] == "REAL"
    assert payload["source_system"] == "WENCO"
    assert payload["data_source_status"] == "CONNECTED"
    assert payload["last_real_record"] == "2026-07-14T08:10:00"
    assert payload["toneladas_turno"] == 850
    assert payload["meta_configurada"] is True
    assert payload["meta_source"] == "NORTHMINE_SHIFT_TARGET_TONS"
    assert payload["meta_turno"] == 70000
    assert payload["daily_target_tonnes"] == 140000
    assert payload["meta_horaria"] == 5833.3
    assert payload["expected_tonnes_now"] == 11667
    assert payload["actual_vs_expected_ton"] == -10817
    assert payload["proyeccion_fin_turno"] > payload["toneladas_turno"]
    assert payload["brecha_proyectada_ton"] == payload["proyeccion_fin_turno"] - payload["meta_turno"]
    assert payload["produccion_acumulada"]


def test_production_shift_reports_no_data_without_demo_fallback():
    payload = build_production_shift(_dataset([]), turno="DIA")

    assert payload["status"] == "NO_DATA"
    assert payload["data_source"] == "REAL"
    assert payload["source_system"] == "WENCO"
    assert payload["toneladas_turno"] == 0
    assert payload["produccion_acumulada"] == []


def test_production_shift_marks_cached_real_dataset():
    payload = build_production_shift(
        _dataset([_cycle("CAEX-01", "EX3600", 7, 420)], stale=True),
        turno="DIA",
    )

    assert payload["data_source_status"] == "CACHE"
    assert payload["stale"] is True
    assert payload["warnings"] == ["Datos WENCO servidos desde cache."]
