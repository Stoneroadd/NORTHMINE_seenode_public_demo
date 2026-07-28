from __future__ import annotations

from app.services import averias_service


def _cycle(caex_id: str, datetime_str: str, camion_modelo: str = "CAT793F") -> dict:
    return {
        "id": f"{caex_id}-{datetime_str}",
        "datetime": datetime_str,
        "caex_id": caex_id,
        "camion_modelo": camion_modelo,
        "carguio_id": "EX3600",
        "origen": "F01",
        "destino": "CHANCADO",
        "tonelaje": 100,
    }


def _dataset(source: str = "wenco-sql-live", stale: bool = False) -> dict:
    return {
        "source": source,
        "stale": stale,
        "today": "2026-07-04",
        "plan": [],
        "cycles": [_cycle("CA0001", "2026-07-04T10:00")],
    }


def test_get_breakdown_history_uses_real_status_transitions(monkeypatch):
    monkeypatch.setattr(
        averias_service,
        "_provider_get_equipment_status_history",
        lambda dias=7: [
            {
                "equip_ident": "CA0001",
                "status_code": "M30",
                "status_desc": "Averia mecanica",
                "category": "MANTENCION",
                "start_timestamp": "2026-07-04T08:00",
                "end_timestamp": "2026-07-04T09:15",
            },
            {
                "equip_ident": "CA0002",
                "status_code": "O01",
                "status_desc": "Espera de frente",
                "category": "DEMORA_OPERACIONAL",
                "start_timestamp": "2026-07-04T09:00",
                "end_timestamp": None,
            },
            {
                "equip_ident": "CA0003",
                "status_code": "N03",
                "status_desc": "Ciclo normal",
                "category": "PRODUCTIVO",
                "start_timestamp": "2026-07-04T07:00",
                "end_timestamp": "2026-07-04T07:30",
            },
        ],
    )

    result = averias_service.get_breakdown_history(_dataset())

    assert result["source"] == "wenco-sql-live"
    assert result["stale"] is False
    by_id = {item["equipment_id"]: item for item in result["items"]}

    # Solo se conservan transiciones MANTENCION/DEMORA_OPERACIONAL; PRODUCTIVO se descarta.
    assert set(by_id) == {"CA0001", "CA0002"}

    mantencion = by_id["CA0001"]
    assert mantencion["status"] == "MANTENCION"
    assert mantencion["severity"] == "CRITICA"
    assert mantencion["duration_min"] == 75
    assert mantencion["description"] == "Averia mecanica"
    assert mantencion["model"] == "CAT793F"

    demora = by_id["CA0002"]
    assert demora["status"] == "DEMORA"
    assert demora["severity"] == "ALTA"
    # Sin end_timestamp (aun abierta): no se fabrica una duracion fija.
    assert demora["duration_min"] >= 0


def test_get_breakdown_history_reflects_stale_dataset(monkeypatch):
    monkeypatch.setattr(averias_service, "_provider_get_equipment_status_history", lambda dias=7: [])
    result = averias_service.get_breakdown_history(_dataset(stale=True))
    assert result["stale"] is True
    assert result["items"] == []


def test_get_breakdown_history_no_random_fabrication(monkeypatch):
    """Regresion: antes generaba eventos con `random`/`index % 17` sin relacion a datos reales."""
    calls: list[int] = []

    def fake_history(dias: int = 7) -> list[dict]:
        calls.append(dias)
        return []

    monkeypatch.setattr(averias_service, "_provider_get_equipment_status_history", fake_history)
    result = averias_service.get_breakdown_history(_dataset())
    assert calls == [7]
    assert result["source"] != "demo"
