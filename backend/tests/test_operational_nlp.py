from __future__ import annotations

import pytest

from app.services.operational_nlp_service import OPERATIONAL_NLP_API_VERSION, build_operational_nlp_response


def _cycle(
    caex_id: str,
    carguio_id: str,
    hour: int,
    tons: int,
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
        "tiempo_vacio_min": 12.0,
        "tiempo_cargado_min": 18.0,
        "operador_caex": "OPERADOR TEST",
        "operador_pala": "PALA TEST",
    }


def _real_dataset() -> dict:
    return {
        "source": "wenco-sql-live",
        "today": "2026-07-12",
        "plan": [{"date": "2026-07-12", "plan_tons": 3000}],
        "cycles": [
            _cycle("CAEX-2915", "EX3600", 7, 420),
            _cycle("CAEX-2916", "EX3600", 8, 410),
            _cycle("CAEX-2918", "EX3517", 9, 390, destino="STOCK"),
            _cycle("CAEX-2915", "EX3517", 10, 430),
            _cycle("CAEX-2916", "EX3600", 14, 415),
            _cycle("CAEX-2918", "EX3600", 15, 120),
        ],
        "novedades": [
            {
                "timestamp": "2026-07-12T07:30:00",
                "turno": "DIA",
                "texto": "Espera por operador en CAEX 2915 antes de ingresar a EX3600.",
                "equipo": "CAEX 2915",
            },
            {
                "timestamp": "2026-07-12T08:40:00",
                "turno": "DIA",
                "texto": "CAEX 2916 sin operador durante relevo, queda en standby.",
                "equipo": "CAEX 2916",
            },
            {
                "timestamp": "2026-07-12T09:50:00",
                "turno": "DIA",
                "texto": "CAEX 2918 esperando operador y con cola en pala EX3600.",
                "equipo": "CAEX 2918",
            },
            {
                "timestamp": "2026-07-12T10:50:00",
                "turno": "DIA",
                "texto": "Espera por operador repetida para CAEX 2915.",
                "equipo": "CAEX 2915",
            },
        ],
        "stale": False,
    }


def test_operational_nlp_demo_mode_is_disabled():
    with pytest.raises(ValueError, match="Modo demo deshabilitado"):
        build_operational_nlp_response(None, demo_mode=True)


def test_operational_nlp_real_mode_requires_dataset():
    with pytest.raises(ValueError, match="Dataset operacional requerido"):
        build_operational_nlp_response(None, demo_mode=False)


def test_operational_nlp_real_dataset_detects_operator_wait_pattern():
    payload = build_operational_nlp_response(_real_dataset(), demo_mode=False)

    assert payload["status"] == "OK"
    assert payload["data_source"] == "REAL"
    assert payload["mode"] == "DATOS_REALES"
    assert payload["source_mix"]["free_texts"] >= 4
    assert payload["summary"]["emerging_pattern"] == "espera por operador"
    assert payload["summary"]["frequency"] >= 3
    assert payload["summary"]["estimated_lost_hours"] > 0
    assert payload["summary"]["estimated_impact_usd"] > 0
    assert "CAEX-2915" in payload["summary"]["associated_equipment"]
    assert payload["patterns"][0]["confidence"] in {"BAJA", "MEDIA", "ALTA"}
    assert payload["recommendations"]
