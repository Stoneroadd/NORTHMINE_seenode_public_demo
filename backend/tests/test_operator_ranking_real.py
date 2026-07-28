from __future__ import annotations

from app.schemas.operator_ranking import OperatorRankingResponse
from app.services import operator_ranking_service as service


def _cycle(
    *,
    rec_id: int,
    operator: str | None,
    badge: str | None,
    caex: str,
    tonnes: int,
    start: str,
    end: str,
    shift_date: str = "2026-07-17",
    shift: str = "DIA",
) -> dict:
    return {
        "id": f"WENCO-{rec_id}",
        "datetime": end,
        "start_datetime": start,
        "shift_date": shift_date,
        "fecha_dia": shift_date,
        "turno_calc": shift,
        "caex_id": caex,
        "camion_modelo": "CAT789D",
        "carguio_id": "EX3600",
        "pala_modelo": "KOMPC5500",
        "fase": "F01",
        "origen": "F01/2280/102/A",
        "destino": "BOT 2440 OESTE",
        "material": "ESTERIL",
        "tonelaje": tonnes,
        "payload_target": 190,
        "operador_caex": operator,
        "operador_caex_badge": badge,
        "tiempo_vacio_min": 8,
        "tiempo_cargado_min": 12,
    }


def test_operator_ranking_uses_real_wenco_operator_data(monkeypatch):
    dataset = {
        "source": "wenco-sql-live",
        "stale": False,
        "cycles": [
            _cycle(
                rec_id=1,
                operator="CLAUDIO ANDRES ROJAS MOYANO",
                badge="B001",
                caex="CA0413",
                tonnes=190,
                start="2026-07-17T07:00:00",
                end="2026-07-17T07:30:00",
            ),
            _cycle(
                rec_id=2,
                operator="CLAUDIO ANDRES ROJAS MOYANO",
                badge="B001",
                caex="CA0413",
                tonnes=190,
                start="2026-07-17T07:40:00",
                end="2026-07-17T08:10:00",
            ),
            _cycle(
                rec_id=3,
                operator="PAULO ANDRES RIQUELME SALAS",
                badge="B002",
                caex="CA0168",
                tonnes=220,
                start="2026-07-17T08:00:00",
                end="2026-07-17T08:35:00",
            ),
        ],
    }
    status_history = [
        {
            "equip_ident": "CA0413",
            "status_code": "O11",
            "status_desc": "Combustible",
            "start_timestamp": "2026-07-17T07:12:00",
            "end_timestamp": "2026-07-17T07:27:00",
        }
    ]

    monkeypatch.setattr(service, "_provider_get_dataset", lambda fecha=None, dias=7: dataset)
    monkeypatch.setattr(service, "_provider_get_equipment_status_history", lambda dias=7: status_history)

    ranking = service.build_global_operator_ranking({"start_date": "2026-07-17", "end_date": "2026-07-17"})
    validated = OperatorRankingResponse.model_validate(ranking)

    assert validated.data_mode == "real_wenco_sql"
    assert validated.source_system == "WENCO_SQL"
    assert validated.count == 2
    names = {item["operator_name"] for item in ranking["items"]}
    assert names == {"CLAUDIO ANDRES ROJAS MOYANO", "PAULO ANDRES RIQUELME SALAS"}
    assert "Luis Araya" not in names

    claudio = next(item for item in ranking["items"] if item["operator_name"] == "CLAUDIO ANDRES ROJAS MOYANO")
    assert claudio["operator_id"] == "B001"
    assert claudio["frequent_equipment_id"] == "CA0413"
    assert claudio["toneladas_reales"] == 380
    assert claudio["ciclos"] == 2
    assert claudio["fueling_minutes"] == 15
    assert claudio["manageable_delay_breakdown"]["O16 Detenido por Combustible"] == 15


def test_operator_ranking_does_not_fabricate_operator_when_wenco_has_no_badge(monkeypatch):
    dataset = {
        "source": "wenco-sql-live",
        "stale": False,
        "cycles": [
            _cycle(
                rec_id=1,
                operator=None,
                badge=None,
                caex="CA0413",
                tonnes=190,
                start="2026-07-17T07:00:00",
                end="2026-07-17T07:30:00",
            )
        ],
    }

    monkeypatch.setattr(service, "_provider_get_dataset", lambda fecha=None, dias=7: dataset)
    monkeypatch.setattr(service, "_provider_get_equipment_status_history", lambda dias=7: [])

    ranking = service.build_global_operator_ranking({"start_date": "2026-07-17", "end_date": "2026-07-17"})

    assert ranking["data_mode"] == "real_wenco_sql"
    assert ranking["count"] == 0
    assert ranking["items"] == []
    assert ranking["summary"]["main_loss_cause"] == "Sin datos reales suficientes"
