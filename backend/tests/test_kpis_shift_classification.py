from __future__ import annotations

from datetime import date, timedelta

from app.services.kpis import _current_shift_records, _preferred_date


def _cycle(fecha_dia: str, turno_calc: str, hora: int, tonelaje: int, minute: int = 0) -> dict:
    return {
        "id": f"{fecha_dia}-{turno_calc}-{hora}-{minute}",
        "datetime": f"{fecha_dia}T{hora:02d}:{minute:02d}",
        "fecha_dia": fecha_dia,
        "turno_calc": turno_calc,
        "hora": hora,
        "caex_id": "CAEX-01",
        "carguio_id": "PALA-01",
        "material": "MINERAL",
        "origen": "F01",
        "destino": "CHANCADO",
        "fase": "F01",
        "tonelaje": tonelaje,
        "viajes": 1,
    }


def _dataset(today: str, cycles: list[dict]) -> dict:
    return {"source": "wenco-sql-live", "today": today, "plan": [], "cycles": cycles}


def test_noche_shift_crossing_midnight_uses_its_own_date_not_today():
    # Turno noche del 30/06: ciclos antes y despues de medianoche, todos con
    # fecha_dia = 2026-06-30 (asi los guarda WENCO via START_SHIFT_DATE).
    cycles = [
        _cycle("2026-06-30", "NOCHE", 19, 220),
        _cycle("2026-06-30", "NOCHE", 23, 210),
        _cycle("2026-06-30", "NOCHE", 3, 205),  # post-medianoche, mismo turno
        _cycle("2026-06-30", "NOCHE", 6, 195),  # post-medianoche, mismo turno
    ]
    # Dataset filtrado a un rango historico: "today" del dataset ya no
    # coincide con la fecha de los ciclos filtrados (caso reporte historico).
    dataset = _dataset(today="2026-07-01", cycles=cycles)

    records, fecha, turno = _current_shift_records(dataset, turno="NOCHE")

    assert turno == "NOCHE"
    assert fecha == "2026-06-30"
    assert len(records) == 4
    assert sum(r["tonelaje"] for r in records) == 830


def test_explicit_shift_defaults_to_today_when_present():
    # Caso normal sin filtro de fecha: si 'today' tiene ciclos para el turno
    # solicitado, se debe preferir 'today' (comportamiento previo intacto).
    cycles = [
        _cycle("2026-06-30", "NOCHE", 20, 999),  # noche de ayer, no debe mezclarse
        _cycle("2026-07-01", "NOCHE", 19, 220),
        _cycle("2026-07-01", "NOCHE", 20, 210),
    ]
    dataset = _dataset(today="2026-07-01", cycles=cycles)

    records, fecha, turno = _current_shift_records(dataset, turno="NOCHE")

    assert fecha == "2026-07-01"
    assert len(records) == 2
    assert sum(r["tonelaje"] for r in records) == 430


def test_preferred_date_falls_back_to_latest_when_today_absent():
    records = [
        {"fecha_dia": "2026-06-28"},
        {"fecha_dia": "2026-06-30"},
        {"fecha_dia": "2026-06-29"},
    ]
    assert _preferred_date(records, today="2026-07-01") == "2026-06-30"


def test_preferred_date_prefers_today_when_present():
    records = [{"fecha_dia": "2026-06-30"}, {"fecha_dia": "2026-07-01"}]
    assert _preferred_date(records, today="2026-07-01") == "2026-07-01"


def test_preferred_date_empty_records_returns_today():
    assert _preferred_date([], today="2026-07-01") == "2026-07-01"
