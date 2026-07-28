from __future__ import annotations

from app.services.kpis import build_loading_units_summary


def _cycle(carguio_id: str, tonelaje: int, hora: int = 10) -> dict:
    return {
        "id": f"{carguio_id}-{hora}-{tonelaje}",
        "datetime": f"2026-07-04T{hora:02d}:00",
        "fecha_dia": "2026-07-04",
        "turno_calc": "DIA",
        "hora": hora,
        "caex_id": "CA0001",
        "camion_modelo": "CAT793F",
        "carguio_id": carguio_id,
        "pala_modelo": "PC5500",
        "material": "MINERAL",
        "origen": "F01",
        "destino": "CHANCADO",
        "fase": "F01",
        "tonelaje": tonelaje,
        "viajes": 1,
    }


def test_loading_units_summary_estado_reflects_real_deviation_from_average():
    # EX3600 rinde muy por debajo del promedio real de las palas del turno -
    # antes esto se decidia por index % N, ahora por desviacion real de tph.
    dataset = {
        "source": "wenco-sql-live",
        "today": "2026-07-04",
        "plan": [],
        "cycles": [
            _cycle("EX_ALTA", 2400),
            _cycle("EX_ALTA2", 2400),
            _cycle("EX3600", 200),
        ],
    }
    result = build_loading_units_summary(dataset, turno="DIA")
    by_id = {item["carguio_id"]: item for item in result["items"]}
    assert by_id["EX3600"]["estado"] == "BAJO RENDIMIENTO"
    assert by_id["EX3600"]["variacion_pct"] < 0
    assert by_id["EX_ALTA"]["estado"] == "ACTIVO"


def test_loading_units_summary_all_equal_are_all_activo():
    dataset = {
        "source": "wenco-sql-live",
        "today": "2026-07-04",
        "plan": [],
        "cycles": [
            _cycle("EX3600", 1200),
            _cycle("EX3470", 1200),
        ],
    }
    result = build_loading_units_summary(dataset, turno="DIA")
    assert all(item["estado"] == "ACTIVO" for item in result["items"])
    assert all(item["variacion_pct"] == 0 for item in result["items"])
