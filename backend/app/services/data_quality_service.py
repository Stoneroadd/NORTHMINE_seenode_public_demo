from __future__ import annotations

from datetime import datetime
from typing import Any


def _parse_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value)
    except ValueError:
        return None


def build_data_quality(
    dataset: dict[str, Any],
    current: dict[str, Any],
    records: list[dict[str, Any]],
    stale: bool,
) -> dict[str, Any]:
    cycles_total = len(records)
    cycles_with_time = sum(
        1
        for record in records
        if isinstance(record.get("tiempo_vacio_min"), (int, float))
        and isinstance(record.get("tiempo_cargado_min"), (int, float))
    )
    cycles_with_destination = sum(1 for record in records if record.get("destino"))
    cycles_with_loader = sum(1 for record in records if record.get("carguio_id"))
    completeness_denominator = max(cycles_total * 3, 1)
    completeness_pct = round(
        (cycles_with_time + cycles_with_destination + cycles_with_loader) / completeness_denominator * 100,
        1,
    )

    last_record_at = max((str(record.get("datetime")) for record in records if record.get("datetime")), default=None)
    current_time = _parse_datetime(current.get("current_time"))
    last_record_time = _parse_datetime(last_record_at)
    if current_time and last_record_time:
        last_record_age_min = max(0, round((current_time - last_record_time).total_seconds() / 60))
    else:
        last_record_age_min = None

    status = "STALE" if stale else "OK"
    if not cycles_total:
        status = "EMPTY"
    elif last_record_age_min is not None and last_record_age_min > 90:
        status = "STALE"

    score = completeness_pct
    if stale:
        score -= 18
    if status == "EMPTY":
        score = 0
    elif last_record_age_min is not None:
        score -= min(25, max(0, last_record_age_min - 30) * 0.35)

    return {
        "status": status,
        "score": round(max(0, min(100, score)), 1),
        "completeness_pct": completeness_pct,
        "cycles_total": cycles_total,
        "cycles_with_time": cycles_with_time,
        "cycles_with_destination": cycles_with_destination,
        "cycles_with_loader": cycles_with_loader,
        "last_record_at": last_record_at,
        "last_record_age_min": last_record_age_min,
        "stale": stale,
        "source": dataset.get("source", "wenco-sql-live"),
    }
