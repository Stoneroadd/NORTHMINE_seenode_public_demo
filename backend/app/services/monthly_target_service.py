from __future__ import annotations

import calendar
from collections import defaultdict
from datetime import date, datetime
from typing import Any


MONTHLY_TARGET_API_VERSION = "v1"
F01_DAILY_TARGET = 129_971
REFERENCE_SECTOR = "F01"

MONTH_NAMES = {
    1: "Enero",
    2: "Febrero",
    3: "Marzo",
    4: "Abril",
    5: "Mayo",
    6: "Junio",
    7: "Julio",
    8: "Agosto",
    9: "Septiembre",
    10: "Octubre",
    11: "Noviembre",
    12: "Diciembre",
}


def _now_iso() -> str:
    return datetime.now().isoformat(timespec="seconds")


def _parse_date(value: Any) -> date | None:
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    if isinstance(value, datetime):
        return value.date()
    if not value:
        return None
    try:
        return date.fromisoformat(str(value)[:10])
    except ValueError:
        return None


def _parse_datetime(value: Any) -> datetime | None:
    if isinstance(value, datetime):
        return value
    if not value:
        return None
    raw = str(value).strip()
    try:
        return datetime.fromisoformat(raw)
    except ValueError:
        return None


def _num(value: Any) -> float:
    if isinstance(value, (int, float)):
        return float(value)
    try:
        return float(str(value).replace(",", "."))
    except (TypeError, ValueError):
        return 0.0


def _period_label(year: int, month: int) -> str:
    return f"{MONTH_NAMES.get(month, str(month))} {year}"


def _period(selected: date) -> dict[str, Any]:
    month_end_day = calendar.monthrange(selected.year, selected.month)[1]
    return {
        "month": selected.month,
        "year": selected.year,
        "label": _period_label(selected.year, selected.month),
        "start_date": date(selected.year, selected.month, 1).isoformat(),
        "end_date": selected.isoformat(),
        "month_end_date": date(selected.year, selected.month, month_end_day).isoformat(),
    }


def _month_target(selected: date, sector: str) -> int:
    if sector.upper() != "F01":
        return 0
    days = calendar.monthrange(selected.year, selected.month)[1]
    return F01_DAILY_TARGET * days


def _synthetic_demo_payload(selected: date, sector: str, generated_at: str) -> dict[str, Any]:
    """Monthly view with deliberately complete, above-target demo data.

    This is isolated behind ``demo_mode`` so no synthetic rows can be served
    in a real operational environment.
    """
    month_end_day = calendar.monthrange(selected.year, selected.month)[1]
    daily_breakdown: list[dict[str, Any]] = []
    f01_total = 0
    f02_total = 0
    for day in range(1, month_end_day + 1):
        current = date(selected.year, selected.month, day)
        # Deterministic variation keeps the table believable while every day
        # visibly clears the configured F01 target.
        f01_real = F01_DAILY_TARGET + 2_150 + ((day * 173) % 1_240)
        f02_real = 76_900 + ((day * 211) % 1_050)
        f01_total += f01_real
        f02_total += f02_real
        daily_breakdown.append(
            {
                "date": current.isoformat(),
                "day": day,
                "f01_programmed_tonnes": F01_DAILY_TARGET,
                "f01_real_tonnes": f01_real,
                "f01_difference_tonnes": f01_real - F01_DAILY_TARGET,
                "f01_cumplimiento_pct": round((f01_real / F01_DAILY_TARGET) * 100, 1),
                "f02_real_tonnes": f02_real,
                "total_real_tonnes": f01_real + f02_real,
                "total_vs_f01_target_pct": round(((f01_real + f02_real) / F01_DAILY_TARGET) * 100, 1),
                "status": "SOBRE_META",
                "tone": "BULL",
                "is_future": False,
                "is_synthetic": True,
            }
        )
    programmed = _month_target(selected, sector)
    real = f01_total if sector == "F01" else f02_total
    total_with_f02 = f01_total + f02_total if sector == "F01" else f02_total
    return {
        "status": "OK",
        "api_version": MONTHLY_TARGET_API_VERSION,
        "generated_at": generated_at,
        "data_source": "DEMO",
        "source_system": "NORTHMINE_DEMO",
        "period": _period(selected),
        "sector": sector,
        "daily_target_f01_tonnes": F01_DAILY_TARGET,
        "monthly_target_f01_tonnes": programmed,
        "mov_programado_acumulado": programmed,
        "mov_real_acumulado": f01_total,
        "mov_f02_acumulado": f02_total,
        "mov_total_con_f02": total_with_f02,
        "mov_diferencia": real - programmed,
        "cumplimiento_pct": round((real / programmed) * 100, 1) if programmed else None,
        "quality": "DATOS_SINTETICOS_SUPERAN_META",
        "last_updated": f"{selected.isoformat()}T17:14",
        "program_source": "NORTHMINE_DEMO_PLAN",
        "real_source": "NORTHMINE_DEMO_SYNTHETIC",
        "daily_breakdown": daily_breakdown,
        "stale": False,
        "warnings": ["Datos sintéticos de demostración: todos los días superan la meta F01 configurada."],
    }


def _estimated_plan_payload(
    dataset: dict[str, Any],
    *,
    selected: date,
    sector: str,
    generated_at: str,
) -> dict[str, Any]:
    cycles = _month_cycles(dataset, selected, sector)
    f02_cycles = _month_cycles(dataset, selected, "F02")
    daily_breakdown = _daily_breakdown(dataset, selected)
    real = sum(_num(cycle.get("tonelaje")) for cycle in cycles)
    f02_real = sum(_num(cycle.get("tonelaje")) for cycle in f02_cycles)
    total_with_f02 = real + f02_real if sector == "F01" else real
    programmed = _month_target(selected, sector)
    difference = real - programmed
    cumplimiento = (real / programmed * 100) if programmed > 0 else None
    warnings = [
        "Meta mensual F01 usa referencia operacional configurada: 129.971 t/dia.",
        "Mov real acumulado se calcula desde WENCO para no hardcodear produccion real.",
        "F02 se cobra aparte; se muestra en columna propia y se suma en total operacional.",
    ]
    if not cycles:
        warnings.append("No hay ciclos WENCO para el sector y periodo consultado.")
    if dataset.get("stale"):
        warnings.append("Dataset WENCO servido desde cache; revisar frescura del dato.")
    return {
        "status": "OK" if cycles else "SIN_DATOS",
        "api_version": MONTHLY_TARGET_API_VERSION,
        "generated_at": generated_at,
        "data_source": "REAL",
        "source_system": "WENCO+NORTHMINE_TARGET_CONFIG",
        "period": _period(selected),
        "sector": sector,
        "daily_target_f01_tonnes": F01_DAILY_TARGET,
        "monthly_target_f01_tonnes": programmed,
        "mov_programado_acumulado": programmed,
        "mov_real_acumulado": round(real),
        "mov_f02_acumulado": round(f02_real),
        "mov_total_con_f02": round(total_with_f02),
        "mov_diferencia": round(difference),
        "cumplimiento_pct": round(cumplimiento, 1) if cumplimiento is not None else None,
        "quality": "F01_TARGET_CONFIG_REAL_WENCO" if cycles else "F01_TARGET_CONFIG_SIN_CICLOS",
        "last_updated": _latest_record(cycles),
        "program_source": "NORTHMINE_F01_DAILY_TARGET_129971",
        "real_source": "WENCO",
        "daily_breakdown": daily_breakdown,
        "stale": bool(dataset.get("stale")),
        "warnings": warnings,
    }


def _cycle_date(cycle: dict[str, Any]) -> date | None:
    return _parse_date(cycle.get("datetime") or cycle.get("fecha_dia") or cycle.get("shift_date"))


def _cycle_datetime(cycle: dict[str, Any]) -> datetime | None:
    return _parse_datetime(cycle.get("datetime")) or _parse_datetime(cycle.get("fecha_dia"))


def _sector_match(cycle: dict[str, Any], sector: str) -> bool:
    if not sector:
        return True
    target = sector.strip().upper()
    fields = (
        cycle.get("fase"),
        cycle.get("origen"),
        cycle.get("destino"),
        cycle.get("load_location"),
        cycle.get("block"),
    )
    return any(target in str(field or "").upper() for field in fields)


def _cycle_sector(cycle: dict[str, Any]) -> str | None:
    fields = (
        cycle.get("fase"),
        cycle.get("origen"),
        cycle.get("destino"),
        cycle.get("load_location"),
        cycle.get("block"),
    )
    normalized = " ".join(str(field or "").upper() for field in fields)
    if "F02" in normalized:
        return "F02"
    if "F01" in normalized:
        return "F01"
    return None


def _month_cycles(dataset: dict[str, Any], selected: date, sector: str) -> list[dict[str, Any]]:
    start = date(selected.year, selected.month, 1)
    rows: list[dict[str, Any]] = []
    for cycle in dataset.get("cycles", []) or []:
        current = _cycle_date(cycle)
        if current is None or current < start or current > selected:
            continue
        if not _sector_match(cycle, sector):
            continue
        rows.append(cycle)
    return rows


def _month_cycles_all(dataset: dict[str, Any], selected: date) -> list[dict[str, Any]]:
    start = date(selected.year, selected.month, 1)
    rows: list[dict[str, Any]] = []
    for cycle in dataset.get("cycles", []) or []:
        current = _cycle_date(cycle)
        if current is None or current < start or current > selected:
            continue
        rows.append(cycle)
    return rows


def _daily_breakdown(dataset: dict[str, Any], selected: date) -> list[dict[str, Any]]:
    month_end_day = calendar.monthrange(selected.year, selected.month)[1]
    daily: dict[date, dict[str, float]] = defaultdict(lambda: {"F01": 0.0, "F02": 0.0})
    for cycle in _month_cycles_all(dataset, selected):
        current = _cycle_date(cycle)
        sector = _cycle_sector(cycle)
        if current is None or sector not in {"F01", "F02"}:
            continue
        daily[current][sector] += _num(cycle.get("tonelaje"))

    rows: list[dict[str, Any]] = []
    for day in range(1, month_end_day + 1):
        current = date(selected.year, selected.month, day)
        f01_real = round(daily[current]["F01"])
        f02_real = round(daily[current]["F02"])
        total = f01_real + f02_real
        is_future = current > selected
        cumplimiento = None if is_future else round((f01_real / F01_DAILY_TARGET) * 100, 1)
        difference = None if is_future else f01_real - F01_DAILY_TARGET
        if is_future:
            status = "PENDIENTE"
            tone = "PENDING"
        elif f01_real >= F01_DAILY_TARGET:
            status = "SOBRE_META"
            tone = "BULL"
        elif f01_real >= F01_DAILY_TARGET * 0.95:
            status = "CERCA_META"
            tone = "FLAT"
        else:
            status = "BAJO_META"
            tone = "BEAR"
        rows.append(
            {
                "date": current.isoformat(),
                "day": day,
                "f01_programmed_tonnes": F01_DAILY_TARGET,
                "f01_real_tonnes": f01_real,
                "f01_difference_tonnes": difference,
                "f01_cumplimiento_pct": cumplimiento,
                "f02_real_tonnes": f02_real,
                "total_real_tonnes": total,
                "total_vs_f01_target_pct": None if is_future else round((total / F01_DAILY_TARGET) * 100, 1),
                "status": status,
                "tone": tone,
                "is_future": is_future,
            }
        )
    return rows


def _plan_accumulated(dataset: dict[str, Any], selected: date) -> float | None:
    start = date(selected.year, selected.month, 1)
    plan_rows = dataset.get("plan", []) or []
    total = 0.0
    matched = False
    for item in plan_rows:
        item_date = _parse_date(item.get("date"))
        if item_date is None or item_date < start or item_date > selected:
            continue
        value = _num(item.get("plan_tons"))
        if value <= 0:
            continue
        total += value
        matched = True
    return total if matched else None


def _latest_record(cycles: list[dict[str, Any]]) -> str | None:
    timestamps = [item for item in (_cycle_datetime(cycle) for cycle in cycles) if item is not None]
    if not timestamps:
        return None
    return max(timestamps).isoformat(timespec="minutes")


def build_monthly_target_response(
    dataset: dict[str, Any] | None,
    *,
    demo_mode: bool = False,
    selected_date: str | None = None,
    sector: str = REFERENCE_SECTOR,
) -> dict[str, Any]:
    generated_at = _now_iso()
    selected = _parse_date(selected_date) or _parse_date((dataset or {}).get("today")) or date.today()
    sector = (sector or REFERENCE_SECTOR).strip().upper()

    if demo_mode:
        return _synthetic_demo_payload(selected, sector, generated_at)

    if not dataset:
        raise ValueError("Dataset operacional requerido para calcular meta mensual real.")

    programmed = _plan_accumulated(dataset, selected)
    if programmed is None:
        payload = _estimated_plan_payload(
            dataset,
            selected=selected,
            sector=sector,
            generated_at=generated_at,
        )
        payload["data_source"] = "REAL"
        payload["source_system"] = "WENCO+NORTHMINE_CONFIG"
        payload["quality"] = "F01_TARGET_CONFIG_REAL_WENCO"
        payload["program_source"] = "NORTHMINE_F01_DAILY_TARGET_CONFIG"
        payload["warnings"] = [
            warning
            for warning in payload.get("warnings", [])
            if "referencia manual" not in str(warning).lower() and "estimado" not in str(warning).lower()
        ]
        payload["warnings"].append("Plan SQL mensual no disponible; se usa meta operacional F01 configurada.")
        return payload

    cycles = _month_cycles(dataset, selected, sector)
    f02_cycles = _month_cycles(dataset, selected, "F02")
    daily_breakdown = _daily_breakdown(dataset, selected)
    real = sum(_num(cycle.get("tonelaje")) for cycle in cycles)
    f02_real = sum(_num(cycle.get("tonelaje")) for cycle in f02_cycles)
    total_with_f02 = real + f02_real if sector == "F01" else real
    difference = real - programmed
    cumplimiento = (real / programmed * 100) if programmed > 0 else None
    last_updated = _latest_record(cycles)
    warnings: list[str] = []
    if not cycles:
        warnings.append("No hay ciclos WENCO para el sector y periodo consultado.")
    if dataset.get("stale"):
        warnings.append("Dataset WENCO servido desde cache; revisar frescura del dato.")

    return {
        "status": "OK" if cycles else "SIN_DATOS",
        "api_version": MONTHLY_TARGET_API_VERSION,
        "generated_at": generated_at,
        "data_source": "REAL",
        "source_system": "WENCO+NORTHMINE_CONFIG",
        "period": _period(selected),
        "sector": sector,
        "daily_target_f01_tonnes": F01_DAILY_TARGET,
        "monthly_target_f01_tonnes": round(programmed),
        "mov_programado_acumulado": round(programmed),
        "mov_real_acumulado": round(real),
        "mov_f02_acumulado": round(f02_real),
        "mov_total_con_f02": round(total_with_f02),
        "mov_diferencia": round(difference),
        "cumplimiento_pct": round(cumplimiento, 1) if cumplimiento is not None else None,
        "quality": "PLAN_CONFIGURADO_REAL_WENCO" if cycles else "PLAN_CONFIGURADO_SIN_CICLOS",
        "last_updated": last_updated,
        "program_source": "NORTHMINE_MONTHLY_TARGET_TONS",
        "real_source": "WENCO",
        "daily_breakdown": daily_breakdown,
        "stale": bool(dataset.get("stale")),
        "warnings": warnings,
    }
