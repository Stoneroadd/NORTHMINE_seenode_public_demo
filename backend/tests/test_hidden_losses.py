from __future__ import annotations

import pytest

from app.services.hidden_loss_service import HIDDEN_LOSSES_API_VERSION, build_hidden_losses_response


def _cycle(
    caex_id: str,
    carguio_id: str,
    hour: int,
    tons: int,
    *,
    empty_min: float = 13.0,
    loaded_min: float = 18.0,
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
        "tiempo_vacio_min": empty_min,
        "tiempo_cargado_min": loaded_min,
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
            _cycle("CAEX-04", "EX3600", 15, 120, empty_min=19, loaded_min=24),
        ],
        "stale": False,
    }


def test_hidden_losses_demo_mode_is_disabled():
    with pytest.raises(ValueError, match="Modo demo deshabilitado"):
        build_hidden_losses_response(None, demo_mode=True)


def test_hidden_losses_real_mode_requires_dataset():
    with pytest.raises(ValueError, match="Dataset operacional requerido"):
        build_hidden_losses_response(None, demo_mode=False)


def test_hidden_losses_real_dataset_quantifies_hidden_losses():
    payload = build_hidden_losses_response(_real_dataset(), demo_mode=False)

    assert payload["status"] == "OK"
    assert payload["data_source"] == "REAL"
    assert payload["mode"] == "DATOS_REALES"
    assert payload["summary"]["hidden_loss_usd"] > 0
    assert payload["summary"]["potential_tonnes"] > 0
    assert payload["summary"]["lost_hours"] > 0
    assert payload["summary"]["confidence"] in {"BAJA", "MEDIA", "ALTA"}
    assert payload["primary_source"]["loss_usd"] == max(item["loss_usd"] for item in payload["losses"])
    assert payload["data_quality"]["cycles_total"] == 6
    assert payload["recommendations"][0]["recoverable_usd"] > 0
    assert any(item["category"] == "TIEMPO_PERDIDO" for item in payload["losses"])
