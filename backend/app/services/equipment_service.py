from __future__ import annotations

from datetime import date, datetime, time, timedelta
from typing import Any


def destination_name(item: dict[str, Any]) -> str:
    return str(item.get("destino") or item.get("destination") or "Destino sin dato")


def destination_tons(item: dict[str, Any]) -> int:
    return int(item.get("tonelaje") or item.get("tons") or 0)


def _record_datetime_for_shift(record: dict[str, Any], target_date: str, target_shift: str) -> datetime:
    record_dt = datetime.fromisoformat(str(record.get("datetime")))
    if (
        target_shift == "NOCHE"
        and str(record.get("turno_calc", "")).upper() == "NOCHE"
        and str(record.get("fecha_dia")) == target_date
        and int(record.get("hora") or record_dt.hour) < 7
        and record_dt.date() == date.fromisoformat(target_date)
    ):
        return record_dt + timedelta(days=1)
    return record_dt


def current_shift_records(dataset: dict[str, Any], fecha: str, turno: str) -> list[dict[str, Any]]:
    if turno == "TODOS":
        return [record for record in dataset.get("cycles", []) if record.get("fecha_dia") == fecha]
    shift_date = date.fromisoformat(fecha)
    if turno == "DIA":
        started_at = datetime.combine(shift_date, time(hour=7))
        ends_at = datetime.combine(shift_date, time(hour=19))
    else:
        started_at = datetime.combine(shift_date, time(hour=19))
        ends_at = started_at + timedelta(hours=12)
    return [
        record
        for record in dataset.get("cycles", [])
        if started_at <= _record_datetime_for_shift(record, fecha, turno) < ends_at
    ]


def calculate_average_caex_in_circuit(records: list[dict[str, Any]]) -> float:
    caex_by_hour: dict[int, set[str]] = {}
    for record in records:
        hour = int(record.get("hora") or 0)
        caex_id = str(record.get("caex_id") or "").strip()
        if not caex_id:
            continue
        caex_by_hour.setdefault(hour, set()).add(caex_id)
    if not caex_by_hour:
        return 0.0
    return round(sum(len(items) for items in caex_by_hour.values()) / len(caex_by_hour), 1)


def find_destination_focus(alerts: dict[str, Any], threshold_pct: float = 60.0) -> dict[str, Any] | None:
    destination_distribution = alerts.get("destination_distribution") or []
    return next(
        (item for item in destination_distribution if float(item.get("porcentaje") or 0) >= threshold_pct),
        None,
    )


def find_low_loading_unit(current: dict[str, Any]) -> dict[str, Any] | None:
    loading_units = current.get("loading_units") or []
    avg_tph = sum(float(item.get("rendimiento_tph") or 0) for item in loading_units) / max(len(loading_units), 1)
    return min(
        [item for item in loading_units if avg_tph and float(item.get("rendimiento_tph") or 0) < avg_tph * 0.82],
        key=lambda item: item.get("rendimiento_tph") or 0,
        default=None,
    )


def build_destinations(summary: dict[str, Any], alerts: dict[str, Any]) -> list[dict[str, Any]]:
    destinations: list[dict[str, Any]] = []
    destination_distribution = alerts.get("destination_distribution") or []
    for item in destination_distribution:
        destinations.append(
            {
                "destination": destination_name(item),
                "pct": float(item.get("porcentaje") or 0),
                "tons": destination_tons(item),
            }
        )
    if destinations:
        return destinations[:6]

    summary_destinations = summary.get("destinations", [])
    destination_total = sum(destination_tons(item) for item in summary_destinations)
    for item in summary_destinations[:4]:
        tons = destination_tons(item)
        destinations.append(
            {
                "destination": destination_name(item),
                "pct": round(tons / max(destination_total, 1) * 100, 1),
                "tons": tons,
            }
        )
    return destinations[:6]


def _top_destination_for_loader(records: list[dict[str, Any]], loader_id: str) -> tuple[str, float]:
    totals: dict[str, int] = {}
    for record in records:
        if str(record.get("carguio_id")) != loader_id:
            continue
        destination = str(record.get("destino") or "Destino sin dato")
        totals[destination] = totals.get(destination, 0) + destination_tons(record)
    total_tons = sum(totals.values())
    if not totals or total_tons <= 0:
        return "Destino sin dato", 0.0
    destination, tons = max(totals.items(), key=lambda item: item[1])
    return destination, round(tons / total_tons * 100, 1)


def build_caex_status(current: dict[str, Any]) -> list[dict[str, Any]]:
    return [
        {
            "caex_id": item["caex_id"],
            "model": item.get("modelo") or "N/D",
            "status": item.get("estado") or "SIN DATO",
            "tons": int(item.get("toneladas") or 0),
            "cycles": int(item.get("ciclos") or 0),
            "last_activity": item.get("ultima_actividad"),
            "minutes_inactive": int(item.get("minutos_sin_actividad") or 0),
            "operator": item.get("operador"),
            "loading_unit": item.get("carguio_actual"),
            "destination": item.get("destino_actual"),
        }
        for item in current.get("caex_status", [])
    ]


def build_shovels(current: dict[str, Any], records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    loading_units = current.get("loading_units", [])[:6]
    avg_tph = sum(float(item.get("rendimiento_tph") or 0) for item in loading_units) / max(len(loading_units), 1)
    shovels: list[dict[str, Any]] = []
    for item in loading_units:
        tons = int(item.get("toneladas") or 0)
        cycles = int(item.get("ciclos") or 0)
        tph = float(item.get("rendimiento_tph") or 0)
        destination, destination_pct = _top_destination_for_loader(records, item["carguio_id"])
        shovels.append(
            {
                "id": item["carguio_id"],
                "model": item.get("modelo") or "N/D",
                "status": item["estado"],
                "queue_min": round(max(0, item.get("minutos_sin_actividad", 0)) / 10, 1),
                "tons": tons,
                "cycles": cycles,
                "avg_tonnes_per_cycle": round(tons / max(cycles, 1), 1) if cycles else 0.0,
                "efficiency_pct": round(tph / max(avg_tph, 1) * 100, 1),
                "front": item.get("ubicacion") or "Sin frente",
                "destination": destination,
                "destination_pct": destination_pct,
                "last_activity": item.get("ultima_actividad"),
                "minutes_inactive": int(item.get("minutos_sin_actividad") or 0),
                "operator": item.get("operador"),
            }
        )
    return shovels


def build_loader_hourly(current: dict[str, Any]) -> list[dict[str, Any]]:
    return [
        {
            "loader_id": item["carguio_id"],
            "hour": item["label"],
            "tons": int(item.get("toneladas") or 0),
            "cycles": int(item.get("ciclos") or 0),
            "origin": item.get("origin"),
            "destination": item.get("destination"),
            "avg_distance_km": item.get("avg_distance_km"),
            "avg_loading_time_min": item.get("avg_loading_time_min"),
            "avg_loading_time_source": item.get("avg_loading_time_source"),
            "avg_caex_wait_time_min": item.get("avg_caex_wait_time_min"),
            "avg_caex_wait_time_source": item.get("avg_caex_wait_time_source"),
        }
        for item in current.get("loader_hourly", [])
    ]


def calculate_availability(current: dict[str, Any]) -> float:
    total_caex = len(current.get("caex_status") or [])
    available_caex = total_caex - int(current.get("caex_posible_averia") or 0)
    return round(available_caex / max(total_caex, 1) * 100, 1)
