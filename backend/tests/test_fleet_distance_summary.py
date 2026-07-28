from __future__ import annotations

from app.services.fleet_service import get_caex_distance_summary


def _cycle(caex_id: str, origen: str, destino: str, tonelaje: int, modelo: str = "CAT793F") -> dict:
    return {
        "caex_id": caex_id,
        "camion_modelo": modelo,
        "origen": origen,
        "destino": destino,
        "tonelaje": tonelaje,
    }


def _dataset() -> dict:
    return {
        "source": "wenco-sql-live",
        "cycles": [
            _cycle("CA0001", "F01", "CHANCADO", 200),
            _cycle("CA0001", "F01", "CHANCADO", 210),
            _cycle("CA0002", "F02", "BOT 2440", 190),
        ],
    }


def test_get_caex_distance_summary_returns_a_populated_dict():
    # Regresion: esta funcion quedo truncada (sin return) en un commit
    # anterior y devolvia None, causando un 500 en /api/fleet/distance.
    result = get_caex_distance_summary(_dataset())
    assert result is not None
    assert result["count"] == 2
    assert result["total_distance_km"] > 0
    assert result["avg_distance_per_cycle_km"] > 0
    assert len(result["routes"]) == 2

    by_id = {item["caex_id"]: item for item in result["items"]}
    assert by_id["CA0001"]["ciclos"] == 2
    assert by_id["CA0001"]["toneladas"] == 410
    assert by_id["CA0001"]["distance_km"] > 0
    assert by_id["CA0001"]["avg_distance_km"] > 0
