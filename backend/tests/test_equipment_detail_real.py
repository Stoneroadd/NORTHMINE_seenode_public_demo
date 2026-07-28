from __future__ import annotations

from app.services import kpis


def _cycle(
    caex_id: str,
    datetime_str: str,
    tonelaje: int = 200,
    tiempo_vacio_min: float | None = None,
    tiempo_cargado_min: float | None = None,
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
        "operador_caex": "JUAN PEREZ SOTO",
        "operador_pala": None,
        "tiempo_vacio_min": tiempo_vacio_min,
        "tiempo_cargado_min": tiempo_cargado_min,
    }


def _dataset(cycles: list[dict]) -> dict:
    return {
        "source": "wenco-sql-live",
        "today": "2026-07-04",
        "plan": [],
        "cycles": cycles,
    }


def test_build_equipment_detail_uses_real_status(monkeypatch):
    monkeypatch.setattr(
        kpis,
        "_provider_get_equipment_status",
        lambda: {"CA0001": {"status_code": "M30", "status_desc": "Averia", "category": "MANTENCION"}},
    )
    dataset = _dataset([_cycle("CA0001", "2026-07-04T10:00", tiempo_vacio_min=12.0, tiempo_cargado_min=18.0)])
    detail = kpis.build_equipment_detail("CA0001", dataset)
    assert detail["status"] == "MANTENCION"


def test_build_equipment_detail_falls_back_without_real_status(monkeypatch):
    monkeypatch.setattr(kpis, "_provider_get_equipment_status", lambda: {})
    dataset = _dataset([_cycle("CA0001", "2026-07-04T10:00", tiempo_vacio_min=12.0, tiempo_cargado_min=18.0)])
    detail = kpis.build_equipment_detail("CA0001", dataset)
    # Sin estado real disponible: no se fabrica un estado, se aproxima solo
    # con actividad real (mismo criterio que build_fleet_status).
    assert detail["status"] in {"ACTIVO", "SIN ACTIVIDAD"}
    assert detail["delay_minutes"] == 0


def test_build_equipment_detail_cycle_times_are_real_averages(monkeypatch):
    monkeypatch.setattr(kpis, "_provider_get_equipment_status", lambda: {})
    dataset = _dataset(
        [
            _cycle("CA0001", "2026-07-04T10:00", tiempo_vacio_min=10.0, tiempo_cargado_min=20.0),
            _cycle("CA0001", "2026-07-04T11:00", tiempo_vacio_min=12.0, tiempo_cargado_min=22.0),
        ]
    )
    detail = kpis.build_equipment_detail("CA0001", dataset)
    assert detail["cycle_times"]["tiempo_vacio_min"] == 11.0
    assert detail["cycle_times"]["tiempo_cargado_min"] == 21.0
    assert detail["cycle_times"]["total_ciclo"] == 32.0


def test_build_equipment_detail_cycle_times_none_without_real_data(monkeypatch):
    monkeypatch.setattr(kpis, "_provider_get_equipment_status", lambda: {})
    dataset = _dataset([_cycle("CA0001", "2026-07-04T10:00")])
    detail = kpis.build_equipment_detail("CA0001", dataset)
    assert detail["cycle_times"]["tiempo_vacio_min"] is None
    assert detail["cycle_times"]["tiempo_cargado_min"] is None
    assert detail["cycle_times"]["total_ciclo"] is None


def test_build_equipment_detail_no_fabricated_availability_or_speed(monkeypatch):
    monkeypatch.setattr(kpis, "_provider_get_equipment_status", lambda: {})
    dataset = _dataset([_cycle("CA0001", "2026-07-04T10:00", tiempo_vacio_min=10.0, tiempo_cargado_min=20.0)])
    detail = kpis.build_equipment_detail("CA0001", dataset)
    assert detail["disponibilidad_pct"] is None
    assert detail["utilizacion_pct"] is None
    assert detail["velocidad_promedio"] is None
    assert detail["velocidad_maxima"] is None


def test_build_equipment_detail_hourly_history_has_no_fabricated_delay(monkeypatch):
    monkeypatch.setattr(kpis, "_provider_get_equipment_status", lambda: {})
    dataset = _dataset([_cycle("CA0001", "2026-07-04T10:00", tiempo_vacio_min=10.0, tiempo_cargado_min=20.0)])
    detail = kpis.build_equipment_detail("CA0001", dataset)
    assert all("demoras_min" not in point for point in detail["hourly_history"])


def test_build_equipment_detail_events_duration_from_real_cycle_fields(monkeypatch):
    monkeypatch.setattr(kpis, "_provider_get_equipment_status", lambda: {})
    dataset = _dataset([_cycle("CA0001", "2026-07-04T10:00", tiempo_vacio_min=10.0, tiempo_cargado_min=20.0)])
    detail = kpis.build_equipment_detail("CA0001", dataset)
    assert detail["events"][0]["duracion_min"] == 30.0


def test_build_equipment_detail_events_duration_none_without_real_data(monkeypatch):
    monkeypatch.setattr(kpis, "_provider_get_equipment_status", lambda: {})
    dataset = _dataset([_cycle("CA0001", "2026-07-04T10:00")])
    detail = kpis.build_equipment_detail("CA0001", dataset)
    assert detail["events"][0]["duracion_min"] is None
