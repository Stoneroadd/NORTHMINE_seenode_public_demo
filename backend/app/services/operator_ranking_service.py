from __future__ import annotations

import csv
import io
from collections import Counter, defaultdict
from datetime import date, datetime, timedelta
from typing import Any, Iterable, Mapping

from app.services.data_provider import get_dataset as _provider_get_dataset
from app.services.data_provider import get_equipment_status_history as _provider_get_equipment_status_history
from app.services.operator_score_engine import (
    MANAGEABLE_DELAY_THRESHOLDS,
    build_recommendation,
    build_score_explanation,
    calculate_operator_score,
    main_loss_cause,
)


SHIFT_MINUTES = 12 * 60
DEFAULT_DAYS = 7
MAX_DAYS = 31

REAL_DATA_MODE = "real_wenco_sql"
REAL_SOURCE = "wenco-sql-live"

FILTER_ALIASES = {
    "turno": "shift",
    "fecha_inicio": "start_date",
    "fecha_fin": "end_date",
    "categoria": "delay_category",
    "event_category": "delay_category",
    "caex_id": "equipment_id",
}

FILTER_KEYS = {
    "start_date",
    "end_date",
    "shift",
    "operator_id",
    "equipment_id",
    "loading_unit_id",
    "model",
    "phase",
    "origin",
    "destination",
    "material",
    "delay_category",
    "severity",
    "min_score",
    "max_score",
    "recurrence_level",
}

EMPTY_VALUES = {"", "TODOS", "TODAS", "ALL", "NONE", "NULL"}

MANAGEABLE_STATUS_MAP = {
    "O01": "O01 Cambio de Turno",
    "O02": "O02 Colacion",
    "O03": "O03 Bano",
    "O04": "O04 Petroleando",
    "O11": "O16 Detenido por Combustible",
    "O12": "O12 Sin Postura",
    "O13": "O13 Chequeo Equipo",
    "O16": "O16 Detenido por Combustible",
    "O28": "O01 Cambio de Turno",
}

SYSTEM_STATUS_PREFIXES = ("M", "N", "O", "S")

SYSTEM_STATUS_LABELS = {
    "M10": "M10 Mantenimiento Programado",
    "M20": "M20 Mantencion No Programada",
    "M30": "M30 Averia",
    "M40": "M40 Traslado Mantencion",
    "M50": "M50 Mnt Diario",
    "M60": "M60 Evaluacion",
    "M70": "M70 Pruebas Mecanicas",
    "M80": "M80 Averia radiobase",
    "N00": "N00 Espera en Descarga",
    "N02": "N02 Espera en Pala",
    "N03": "N03 Vacio",
    "N04": "N04 Transportando",
    "N06": "N06 Cola en Pala",
    "N13": "N13 Pala Cargando",
    "N14": "N14 Pala Esperando",
    "N84": "N84 Espera en Chancado",
    "O05": "O05 Tronadura",
    "O09": "O09 Clima",
    "O10": "O10 Averia Otro",
    "O14": "O14 Traslado",
    "O18": "O18 Espera en Chancado",
    "O21": "O21 Espera por Emergencia",
    "O27": "O27 Falla Operacional",
    "O84": "O84 Cola Chancado",
    "S": "S Idle",
    "S01": "S01 Parada Otros",
    "S03": "S03 Pala en Mantenimiento",
    "S99": "S99 Standby",
}


def _now_iso() -> str:
    return datetime.utcnow().isoformat(timespec="seconds") + "Z"


def _norm(value: Any) -> str:
    normalized = str(value or "").strip().upper()
    replacements = (
        ("Á", "A"),
        ("É", "E"),
        ("Í", "I"),
        ("Ó", "O"),
        ("Ú", "U"),
        ("Ñ", "N"),
        ("Ã", "A"),
        ("Ã‰", "E"),
        ("Ã", "I"),
        ("Ã“", "O"),
        ("Ãš", "U"),
        ("Ã‘", "N"),
    )
    for source, target in replacements:
        normalized = normalized.replace(source, target)
    return normalized


def _parse_date(value: Any) -> date | None:
    if not value:
        return None
    try:
        return date.fromisoformat(str(value)[:10])
    except ValueError:
        try:
            return datetime.fromisoformat(str(value)).date()
        except ValueError:
            return None


def _parse_datetime(value: Any) -> datetime | None:
    if not value:
        return None
    if isinstance(value, datetime):
        return value
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00")).replace(tzinfo=None)
    except ValueError:
        return None


def _date_span(filters: Mapping[str, Any]) -> tuple[str | None, int]:
    end = _parse_date(filters.get("end_date")) or date.today()
    start = _parse_date(filters.get("start_date")) or (end - timedelta(days=DEFAULT_DAYS - 1))
    if start > end:
        start, end = end, start
    days = min(MAX_DAYS, max(1, (end - start).days + 1))
    return end.isoformat(), days


def normalize_shift(value: Any) -> str:
    raw = str(value or "").strip().upper()
    if raw in {"DIA", "DAY", "DIURNO"}:
        return "DIA"
    if raw in {"NOCHE", "NIGHT", "NOCTURNO"}:
        return "NOCHE"
    if raw in {"ACTUAL", "CURRENT"}:
        return "ACTUAL"
    return "TODOS" if raw in EMPTY_VALUES else raw


def clean_operator_filters(query: Mapping[str, Any]) -> dict[str, str]:
    filters: dict[str, str] = {}
    for raw_key, raw_value in query.items():
        key = FILTER_ALIASES.get(raw_key, raw_key)
        if key not in FILTER_KEYS:
            continue
        value = str(raw_value or "").strip()
        if not value or value.upper() in EMPTY_VALUES:
            continue
        filters[key] = value
    if "shift" in filters:
        filters["shift"] = normalize_shift(filters["shift"])
    return filters


def _is_empty(value: Any) -> bool:
    return _norm(value) in {"", "TODOS", "TODAS", "ALL", "NONE", "NULL"}


def _matches(value: Any, expected: Any) -> bool:
    if _is_empty(expected):
        return True
    return _norm(value) == _norm(expected)


def _contains(value: Any, expected: Any) -> bool:
    if _is_empty(expected):
        return True
    return _norm(expected) in _norm(value)


def _cycle_shift_date(row: Mapping[str, Any]) -> str:
    return str(row.get("shift_date") or row.get("fecha_dia") or row.get("datetime") or "")[:10]


def _cycle_shift(row: Mapping[str, Any]) -> str:
    return normalize_shift(row.get("turno_calc") or row.get("shift") or row.get("turno") or "TODOS")


def _operator_id(row: Mapping[str, Any]) -> str | None:
    badge = str(row.get("operador_caex_badge") or "").strip()
    name = str(row.get("operador_caex") or "").strip()
    if badge:
        return badge
    return name or None


def _operator_name(row: Mapping[str, Any]) -> str | None:
    name = str(row.get("operador_caex") or "").strip()
    return name or None


def _filter_cycle(row: Mapping[str, Any], filters: Mapping[str, Any]) -> bool:
    start = _parse_date(filters.get("start_date"))
    end = _parse_date(filters.get("end_date"))
    row_date = _parse_date(_cycle_shift_date(row))
    if start and row_date and row_date < start:
        return False
    if end and row_date and row_date > end:
        return False

    shift = normalize_shift(filters.get("shift"))
    if shift not in {"", "TODOS", "ACTUAL"} and shift and _cycle_shift(row) != shift:
        return False

    checks = {
        "operator_id": (_operator_id(row), _operator_name(row)),
        "equipment_id": (row.get("caex_id"),),
        "caex_id": (row.get("caex_id"),),
        "loading_unit_id": (row.get("carguio_id"),),
        "model": (row.get("camion_modelo"),),
        "phase": (row.get("fase"),),
        "origin": (row.get("origen"),),
        "destination": (row.get("destino"),),
        "material": (row.get("material"),),
    }
    for key, values in checks.items():
        expected = filters.get(key)
        if not expected:
            continue
        matcher = _contains if key in {"origin", "destination", "phase"} else _matches
        if not any(matcher(value, expected) for value in values):
            return False
    return True


def _request_real_dataset(filters: Mapping[str, Any]) -> tuple[dict[str, Any], list[dict[str, Any]], int]:
    fecha, days = _date_span(filters)
    dataset = _provider_get_dataset(fecha=fecha, dias=days)
    try:
        status_history = _provider_get_equipment_status_history(dias=days)
    except Exception:
        status_history = []
    return dataset, status_history, days


def _payload_reference(cycles: Iterable[Mapping[str, Any]]) -> dict[str, float]:
    by_model: dict[str, list[float]] = defaultdict(list)
    by_equipment: dict[str, list[float]] = defaultdict(list)
    global_values: list[float] = []
    for row in cycles:
        tonnes = float(row.get("tonelaje") or 0)
        if tonnes <= 0:
            continue
        model = str(row.get("camion_modelo") or "").strip()
        equip = str(row.get("caex_id") or "").strip()
        global_values.append(tonnes)
        if model:
            by_model[model].append(tonnes)
        if equip:
            by_equipment[equip].append(tonnes)
    global_ref = sum(global_values) / max(len(global_values), 1) if global_values else 0.0
    refs = {"__global__": global_ref}
    refs.update({f"model:{key}": sum(values) / len(values) for key, values in by_model.items() if values})
    refs.update({f"equipment:{key}": sum(values) / len(values) for key, values in by_equipment.items() if values})
    return refs


def _expected_payload(row: Mapping[str, Any], refs: Mapping[str, float]) -> float:
    target = float(row.get("payload_target") or 0)
    if target > 0:
        return target
    equip_ref = refs.get(f"equipment:{row.get('caex_id')}")
    if equip_ref:
        return equip_ref
    model_ref = refs.get(f"model:{row.get('camion_modelo')}")
    if model_ref:
        return model_ref
    return float(refs.get("__global__", 0) or row.get("tonelaje") or 0)


def _cycle_minutes(row: Mapping[str, Any]) -> float:
    start = _parse_datetime(row.get("start_datetime"))
    end = _parse_datetime(row.get("datetime"))
    if start and end and end >= start:
        return min(180.0, max(0.0, (end - start).total_seconds() / 60))
    empty = float(row.get("tiempo_vacio_min") or 0)
    loaded = float(row.get("tiempo_cargado_min") or 0)
    return min(180.0, max(0.0, empty + loaded))


def _status_label(code: str, description: Any = None) -> str:
    code = str(code or "").strip().upper()
    if not code:
        return "Estado WENCO"
    desc = str(description or "").strip()
    if desc and _norm(desc) != _norm(code):
        return f"{code} {desc}"
    return SYSTEM_STATUS_LABELS.get(code, code)


def _status_bucket(code: str, description: Any = None) -> tuple[str, str]:
    code = str(code or "").strip().upper()
    if code in MANAGEABLE_STATUS_MAP:
        return "manageable", MANAGEABLE_STATUS_MAP[code]
    if code.startswith(SYSTEM_STATUS_PREFIXES):
        return "system", _status_label(code, description)
    return "system", _status_label(code, description)


def _event_overlap_minutes(event: Mapping[str, Any], start: datetime, end: datetime) -> float:
    event_start = _parse_datetime(event.get("start_timestamp"))
    event_end = _parse_datetime(event.get("end_timestamp")) or end
    if not event_start or event_end <= start or event_start >= end:
        return 0.0
    left = max(start, event_start)
    right = min(end, event_end)
    return max(0.0, (right - left).total_seconds() / 60)


def _status_events_for_windows(
    status_history: Iterable[Mapping[str, Any]],
    windows: Iterable[dict[str, Any]],
) -> dict[tuple[str, str, str, str], dict[str, dict[str, int]]]:
    by_key: dict[tuple[str, str, str, str], dict[str, dict[str, int]]] = {}
    by_equipment: dict[str, list[Mapping[str, Any]]] = defaultdict(list)
    for event in status_history:
        equip = str(event.get("equip_ident") or "").strip()
        if equip:
            by_equipment[equip].append(event)

    for window in windows:
        key = (window["operator_id"], window["equipment_id"], window["fecha"], window["turno"])
        values = by_key.setdefault(key, {"manageable": defaultdict(int), "system": defaultdict(int)})
        for event in by_equipment.get(window["equipment_id"], []):
            minutes = round(_event_overlap_minutes(event, window["start"], window["end"]))
            if minutes <= 0:
                continue
            bucket, label = _status_bucket(str(event.get("status_code") or ""), event.get("status_desc"))
            values[bucket][label] += int(minutes)
    return by_key


def _severity(manageable_minutes: int, system_minutes: int, productive_minutes: float) -> str:
    if system_minutes >= 120 or manageable_minutes >= 120:
        return "CRITICA"
    if system_minutes >= 60 or manageable_minutes >= 60 or productive_minutes < 120:
        return "ALTA"
    if system_minutes >= 20 or manageable_minutes >= 20:
        return "MEDIA"
    return "BAJA"


def _shift_rows_from_dataset(filters: Mapping[str, Any] | None = None) -> list[dict[str, Any]]:
    filters = clean_operator_filters(filters or {})
    dataset, status_history, _days = _request_real_dataset(filters)
    raw_cycles = [row for row in dataset.get("cycles", []) if _operator_id(row) and _operator_name(row)]
    refs = _payload_reference(raw_cycles)
    cycles = [row for row in raw_cycles if _filter_cycle(row, filters)]

    grouped: dict[tuple[str, str, str, str], list[dict[str, Any]]] = defaultdict(list)
    for row in cycles:
        operator_id = _operator_id(row)
        operator_name = _operator_name(row)
        equipment_id = str(row.get("caex_id") or "").strip()
        shift_date = _cycle_shift_date(row)
        shift = _cycle_shift(row)
        if not operator_id or not operator_name or not equipment_id or not shift_date:
            continue
        grouped[(operator_id, operator_name, equipment_id, shift_date, shift)].append(dict(row))

    windows = []
    for (operator_id, operator_name_value, equipment_id, shift_date, shift), rows in grouped.items():
        starts = [_parse_datetime(row.get("start_datetime") or row.get("datetime")) for row in rows]
        ends = [_parse_datetime(row.get("datetime")) for row in rows]
        valid_starts = [value for value in starts if value]
        valid_ends = [value for value in ends if value]
        if not valid_starts or not valid_ends:
            continue
        windows.append(
            {
                "operator_id": operator_id,
                "equipment_id": equipment_id,
                "fecha": shift_date,
                "turno": shift,
                "start": min(valid_starts),
                "end": max(valid_ends) + timedelta(minutes=10),
            }
        )

    status_by_window = _status_events_for_windows(status_history, windows)
    rows: list[dict[str, Any]] = []
    for (operator_id, operator_name, equipment_id, shift_date, shift), cycle_rows in grouped.items():
        tonnes = sum(float(row.get("tonelaje") or 0) for row in cycle_rows)
        cycles_count = len(cycle_rows)
        expected = sum(_expected_payload(row, refs) for row in cycle_rows)
        cycle_minutes = sum(_cycle_minutes(row) for row in cycle_rows)
        start_times = [_parse_datetime(row.get("start_datetime") or row.get("datetime")) for row in cycle_rows]
        end_times = [_parse_datetime(row.get("datetime")) for row in cycle_rows]
        valid_starts = [value for value in start_times if value]
        valid_ends = [value for value in end_times if value]
        observed = 60.0
        if valid_starts and valid_ends:
            observed = max(60.0, min(float(SHIFT_MINUTES), (max(valid_ends) - min(valid_starts)).total_seconds() / 60 + 10))

        status_values = status_by_window.get((operator_id, equipment_id, shift_date, shift), {})
        manageable = dict(status_values.get("manageable", {}))
        system = dict(status_values.get("system", {}))
        manageable_minutes = sum(manageable.values())
        system_minutes = sum(system.values())

        available_minutes = max(1.0, min(float(SHIFT_MINUTES), max(observed, cycle_minutes + manageable_minutes + system_minutes)))
        operating_minutes = min(available_minutes, max(0.0, cycle_minutes))
        productive_minutes = operating_minutes
        first = cycle_rows[0]
        loader_counts = Counter(str(row.get("carguio_id") or "") for row in cycle_rows if row.get("carguio_id"))
        origin_counts = Counter(str(row.get("origen") or "") for row in cycle_rows if row.get("origen"))
        destination_counts = Counter(str(row.get("destino") or "") for row in cycle_rows if row.get("destino"))
        material_counts = Counter(str(row.get("material") or "") for row in cycle_rows if row.get("material"))
        phase_counts = Counter(str(row.get("fase") or "") for row in cycle_rows if row.get("fase"))

        row = {
            "fecha": shift_date,
            "turno": shift,
            "operator_id": operator_id,
            "operator_name": operator_name,
            "equipment_id": equipment_id,
            "loading_unit_id": loader_counts.most_common(1)[0][0] if loader_counts else str(first.get("carguio_id") or ""),
            "model": str(first.get("camion_modelo") or "N/D"),
            "phase": phase_counts.most_common(1)[0][0] if phase_counts else str(first.get("fase") or "N/D"),
            "origin": origin_counts.most_common(1)[0][0] if origin_counts else str(first.get("origen") or "N/D"),
            "destination": destination_counts.most_common(1)[0][0] if destination_counts else str(first.get("destino") or "N/D"),
            "material": material_counts.most_common(1)[0][0] if material_counts else str(first.get("material") or "N/D"),
            "severity": _severity(manageable_minutes, system_minutes, productive_minutes),
            "shift_minutes": available_minutes,
            "available_minutes": available_minutes,
            "operating_minutes": operating_minutes,
            "productive_minutes": productive_minutes,
            "manageable_delay_minutes": manageable_minutes,
            "system_delay_minutes": system_minutes,
            "manageable_delays": {category: int(manageable.get(category, 0)) for category in MANAGEABLE_DELAY_THRESHOLDS},
            "system_delays": system,
            "toneladas_reales": tonnes,
            "toneladas_esperadas": max(expected, tonnes),
            "ciclos": cycles_count,
            "speed_events": 0,
            "critical_events": 0,
            "source_system": "WENCO",
            "dataset_stale": bool(dataset.get("stale")),
        }
        if _passes_delay_filter(row, filters):
            rows.append(row)
    return rows


def _passes_delay_filter(row: Mapping[str, Any], filters: Mapping[str, Any]) -> bool:
    severity = filters.get("severity")
    if severity and not _matches(row.get("severity"), severity):
        return False

    expected = filters.get("delay_category")
    if not expected:
        return True
    merged = {**row.get("manageable_delays", {}), **row.get("system_delays", {})}
    return any(minutes > 0 and _contains(category, expected) for category, minutes in merged.items())


def generate_operator_shift_rows(filters: Mapping[str, Any] | None = None) -> list[dict[str, Any]]:
    return _shift_rows_from_dataset(filters)


def _aggregate_rows(rows: Iterable[dict[str, Any]]) -> list[dict[str, Any]]:
    grouped: dict[str, dict[str, Any]] = {}
    shifts_by_operator: dict[str, list[dict[str, Any]]] = defaultdict(list)
    equipment_counts: dict[str, Counter[str]] = defaultdict(Counter)

    for row in rows:
        operator_id = row["operator_id"]
        shifts_by_operator[operator_id].append(row)
        equipment_counts[operator_id][row["equipment_id"]] += 1
        agg = grouped.setdefault(
            operator_id,
            {
                "operator_id": operator_id,
                "operator_name": row["operator_name"],
                "toneladas_reales": 0.0,
                "toneladas_esperadas": 0.0,
                "ciclos": 0,
                "total_shift_minutes": 0.0,
                "available_minutes": 0.0,
                "operating_minutes": 0.0,
                "productive_minutes": 0.0,
                "manageable_delay_minutes": 0,
                "system_delay_minutes": 0,
                "total_delay_minutes": 0,
                "safety_events": 0,
                "critical_events": 0,
                "delay_totals": defaultdict(int),
                "manageable_totals": defaultdict(int),
                "system_totals": defaultdict(int),
            },
        )
        for key in [
            "toneladas_reales",
            "toneladas_esperadas",
            "ciclos",
            "shift_minutes",
            "available_minutes",
            "operating_minutes",
            "productive_minutes",
            "manageable_delay_minutes",
            "system_delay_minutes",
            "speed_events",
            "critical_events",
        ]:
            target = "total_shift_minutes" if key == "shift_minutes" else ("safety_events" if key == "speed_events" else key)
            agg[target] += row.get(key, 0)
        agg["total_delay_minutes"] += row.get("manageable_delay_minutes", 0) + row.get("system_delay_minutes", 0)
        for category, minutes in row.get("manageable_delays", {}).items():
            agg["delay_totals"][category] += int(minutes)
            agg["manageable_totals"][category] += int(minutes)
        for category, minutes in row.get("system_delays", {}).items():
            agg["delay_totals"][category] += int(minutes)
            agg["system_totals"][category] += int(minutes)

    items: list[dict[str, Any]] = []
    for operator_id, agg in grouped.items():
        shift_rows = shifts_by_operator[operator_id]
        scoring = calculate_operator_score(agg, shift_rows)
        delay_totals = dict(agg["delay_totals"])
        manageable_totals = dict(agg["manageable_totals"])
        system_totals = dict(agg["system_totals"])
        frequent_equipment = equipment_counts[operator_id].most_common(1)[0][0]
        lost_tons = max(0, int(round(agg["toneladas_esperadas"] - agg["toneladas_reales"])))
        item = {
            "operator_id": operator_id,
            "operator_name": agg["operator_name"],
            "frequent_equipment_id": frequent_equipment,
            "toneladas_reales": int(round(agg["toneladas_reales"])),
            "toneladas_esperadas": int(round(agg["toneladas_esperadas"])),
            "ciclos": int(agg["ciclos"]),
            "tph": round(agg["toneladas_reales"] / max(agg["total_shift_minutes"] / 60, 1), 1),
            "disponibilidad_percent": round(agg["productive_minutes"] / max(agg["total_shift_minutes"], 1) * 100, 1),
            "utilizacion_percent": round(agg["operating_minutes"] / max(agg["available_minutes"], 1) * 100, 1),
            "total_delay_minutes": int(agg["total_delay_minutes"]),
            "manageable_delay_minutes": int(agg["manageable_delay_minutes"]),
            "system_delay_minutes": int(agg["system_delay_minutes"]),
            "bathroom_minutes": int(manageable_totals.get("O03 Bano", 0)),
            "lunch_minutes": int(manageable_totals.get("O02 Colacion", 0)),
            "shift_change_minutes": int(manageable_totals.get("O01 Cambio de Turno", 0)),
            "fueling_minutes": int(manageable_totals.get("O04 Petroleando", 0) + manageable_totals.get("O16 Detenido por Combustible", 0)),
            "no_assignment_minutes": int(manageable_totals.get("O12 Sin Postura", 0)),
            "lost_tons_estimated": lost_tons,
            "main_loss_cause": main_loss_cause(delay_totals),
            "manageable_delay_breakdown": manageable_totals,
            "system_delay_breakdown": system_totals,
            **{
                key: scoring[key]
                for key in [
                    "productividad_score",
                    "disponibilidad_score",
                    "utilizacion_score",
                    "control_demoras_score",
                    "seguridad_score",
                    "score_global",
                    "risk_level",
                    "recurrence",
                    "manageable_excess_minutes",
                    "raw_values",
                    "normalized_scores",
                    "penalties",
                    "thresholds_used",
                    "calculation_trace",
                    "risk_reason",
                    "recommendation_reason",
                ]
            },
        }
        item["recurrence_level"] = str(item["recurrence"]["pattern_level"])
        item["recommendation"] = build_recommendation(item)
        items.append(item)
    return items


def _filter_ranked_items(items: list[dict[str, Any]], filters: Mapping[str, Any]) -> list[dict[str, Any]]:
    min_score = _float_or_none(filters.get("min_score"))
    max_score = _float_or_none(filters.get("max_score"))
    recurrence = filters.get("recurrence_level")

    filtered = []
    for item in items:
        if min_score is not None and item["score_global"] < min_score:
            continue
        if max_score is not None and item["score_global"] > max_score:
            continue
        if recurrence and _norm(item["recurrence_level"]) != _norm(recurrence):
            continue
        filtered.append(item)
    return filtered


def _float_or_none(value: Any) -> float | None:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _empty_summary() -> dict[str, Any]:
    return {
        "best_operator": "-",
        "best_score": 0,
        "average_score": 0,
        "high_risk_count": 0,
        "total_lost_tons_estimated": 0,
        "manageable_delay_minutes": 0,
        "main_loss_cause": "Sin datos reales suficientes",
    }


def build_global_operator_ranking(filters: Mapping[str, Any] | None = None) -> dict[str, Any]:
    filters = clean_operator_filters(filters or {})
    rows = generate_operator_shift_rows(filters)
    items = _filter_ranked_items(_aggregate_rows(rows), filters)
    items.sort(key=lambda item: item["score_global"], reverse=True)
    for index, item in enumerate(items, 1):
        item["rank"] = index

    cause_totals: dict[str, int] = defaultdict(int)
    for item in items:
        cause_totals[item["main_loss_cause"]] += item["lost_tons_estimated"]
    summary = _empty_summary()
    if items:
        summary = {
            "best_operator": items[0]["operator_name"],
            "best_score": items[0]["score_global"],
            "average_score": round(sum(item["score_global"] for item in items) / len(items), 1),
            "high_risk_count": sum(1 for item in items if item["risk_level"] in {"RIESGO_ALTO", "CRITICO"}),
            "total_lost_tons_estimated": sum(item["lost_tons_estimated"] for item in items),
            "manageable_delay_minutes": sum(item["manageable_delay_minutes"] for item in items),
            "main_loss_cause": max(cause_totals.items(), key=lambda item: item[1])[0] if cause_totals else "Sin causa dominante",
        }
    return {
        "source": "operator_ranking",
        "data_mode": REAL_DATA_MODE,
        "data_source": "REAL",
        "source_system": "WENCO_SQL",
        "generated_at": _now_iso(),
        "filters": filters,
        "count": len(items),
        "summary": summary,
        "items": items,
    }


def build_operator_detail(filters: Mapping[str, Any] | None = None) -> dict[str, Any]:
    filters = clean_operator_filters(filters or {})
    operator_id = filters.get("operator_id")
    ranking = build_global_operator_ranking(filters)
    item = ranking["items"][0] if ranking["items"] else None
    if operator_id:
        item = next((row for row in ranking["items"] if _matches(row["operator_id"], operator_id) or _matches(row["operator_name"], operator_id)), item)
    rows = generate_operator_shift_rows({**filters, "operator_id": operator_id or (item or {}).get("operator_id", "")})
    all_ranking = build_global_operator_ranking({key: value for key, value in filters.items() if key != "operator_id"})
    fleet_avg = all_ranking["summary"]["average_score"]
    explanation = build_score_explanation(item, fleet_avg) if item else ["No hay datos WENCO/SQL reales para los filtros seleccionados."]

    delay_categories = []
    if item:
        for category, minutes in sorted(item.get("manageable_delay_breakdown", {}).items(), key=lambda pair: pair[1], reverse=True):
            if int(minutes) > 0:
                delay_categories.append({"category": category, "type": "gestionable", "minutes": int(minutes)})
        for category, minutes in sorted(item.get("system_delay_breakdown", {}).items(), key=lambda pair: pair[1], reverse=True):
            if int(minutes) > 0:
                delay_categories.append({"category": category, "type": "sistemica", "minutes": int(minutes)})

    timeline = []
    for row in rows:
        for category, minutes in {**row.get("manageable_delays", {}), **row.get("system_delays", {})}.items():
            if int(minutes) <= 0:
                continue
            timeline.append(
                {
                    "fecha": row["fecha"],
                    "turno": row["turno"],
                    "equipment_id": row["equipment_id"],
                    "category": category,
                    "type": "gestionable" if category in MANAGEABLE_DELAY_THRESHOLDS else "sistemica",
                    "minutes": int(minutes),
                    "severity": row["severity"],
                }
            )

    return {
        "source": "operator_ranking",
        "data_mode": REAL_DATA_MODE,
        "data_source": "REAL",
        "source_system": "WENCO_SQL",
        "operator": item,
        "score_breakdown": {
            key: item[key] if item else 0
            for key in ["productividad_score", "disponibilidad_score", "utilizacion_score", "control_demoras_score", "seguridad_score", "score_global"]
        },
        "delay_categories": delay_categories,
        "timeline": sorted(timeline, key=lambda row: (row["fecha"], row["turno"], row["equipment_id"]))[:160],
        "fleet_average": {
            "score_global": fleet_avg,
            "productividad_score": round(sum(row["productividad_score"] for row in all_ranking["items"]) / max(len(all_ranking["items"]), 1), 1),
            "manageable_delay_minutes": round(sum(row["manageable_delay_minutes"] for row in all_ranking["items"]) / max(len(all_ranking["items"]), 1), 1),
        },
        "trend": build_operator_trends(filters)["items"],
        "lost_tons_estimated": item["lost_tons_estimated"] if item else 0,
        "explanation": explanation,
        "recommendation": item["recommendation"] if item else "Revisar filtros aplicados o disponibilidad de operador real en WENCO.",
        "privacy_note": "Uso orientado a analisis operacional. Validar contexto antes de tomar decisiones.",
    }


def build_operator_trends(filters: Mapping[str, Any] | None = None) -> dict[str, Any]:
    filters = clean_operator_filters(filters or {})
    rows = generate_operator_shift_rows(filters)
    grouped: dict[tuple[str, str], list[dict[str, Any]]] = defaultdict(list)
    for row in rows:
        grouped[(row["fecha"], row["turno"])].append(row)

    items = []
    for (day, shift), shift_rows in sorted(grouped.items()):
        ranked = _aggregate_rows(shift_rows)
        if not ranked:
            continue
        items.append(
            {
                "fecha": day,
                "turno": shift,
                "score_global": round(sum(row["score_global"] for row in ranked) / len(ranked), 1),
                "toneladas": sum(row["toneladas_reales"] for row in ranked),
                "disponibilidad": round(sum(row["disponibilidad_percent"] for row in ranked) / len(ranked), 1),
                "utilizacion": round(sum(row["utilizacion_percent"] for row in ranked) / len(ranked), 1),
                "demoras_gestionables": sum(row["manageable_delay_minutes"] for row in ranked),
                "demoras_sistema": sum(row["system_delay_minutes"] for row in ranked),
                "tonelaje_perdido": sum(row["lost_tons_estimated"] for row in ranked),
            }
        )
    return {"source": "operator_ranking", "data_mode": REAL_DATA_MODE, "data_source": "REAL", "source_system": "WENCO_SQL", "count": len(items), "items": items}


def build_delay_patterns(filters: Mapping[str, Any] | None = None) -> dict[str, Any]:
    filters = clean_operator_filters(filters or {})
    ranking = build_global_operator_ranking(filters)
    patterns = []
    for item in ranking["items"]:
        recurrence = item["recurrence"]
        categories = [
            ("O03 Bano", recurrence["bathroom_over_threshold_shifts"]),
            ("O02 Colacion", recurrence["lunch_over_threshold_shifts"]),
            ("O01 Cambio de Turno", recurrence["shift_change_over_threshold_shifts"]),
            ("O12 Sin Postura", recurrence["no_assignment_over_threshold_shifts"]),
        ]
        category, events = max(categories, key=lambda pair: pair[1])
        if events <= 0 and item["recurrence_level"] == "BAJO":
            continue
        patterns.append(
            {
                "operator_id": item["operator_id"],
                "operator_name": item["operator_name"],
                "category": category,
                "over_threshold_shifts": int(events),
                "pattern_level": item["recurrence_level"],
                "manageable_delay_minutes": item["manageable_delay_minutes"],
                "lost_tons_estimated": item["lost_tons_estimated"],
                "recommendation": build_recommendation(item),
            }
        )
    patterns.sort(key=lambda item: (item["pattern_level"] != "ALTO", -item["over_threshold_shifts"], -item["manageable_delay_minutes"]))
    return {"source": "operator_ranking", "data_mode": REAL_DATA_MODE, "data_source": "REAL", "source_system": "WENCO_SQL", "count": len(patterns), "items": patterns}


def build_score_explanation_response(filters: Mapping[str, Any] | None = None) -> dict[str, Any]:
    filters = clean_operator_filters(filters or {})
    operator_id = filters.get("operator_id")
    detail = build_operator_detail(filters)
    operator = detail.get("operator") or {}
    return {
        "source": "operator_ranking",
        "data_mode": REAL_DATA_MODE,
        "data_source": "REAL",
        "source_system": "WENCO_SQL",
        "operator_id": operator.get("operator_id", operator_id or ""),
        "operator_name": operator.get("operator_name", "-"),
        "score_global": operator.get("score_global", 0),
        "explanation": detail["explanation"],
        "recommendation": detail["recommendation"],
    }


def ranking_to_csv(filters: Mapping[str, Any] | None = None) -> str:
    ranking = build_global_operator_ranking(filters)
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["data_mode", ranking["data_mode"]])
    writer.writerow(["source_system", ranking.get("source_system", "WENCO_SQL")])
    writer.writerow(["generated_at", ranking.get("generated_at", "")])
    for key, value in ranking.get("filters", {}).items():
        writer.writerow([f"filter_{key}", value])
    writer.writerow([])
    columns = [
        "rank",
        "operator_id",
        "operator_name",
        "score_global",
        "productividad_score",
        "disponibilidad_score",
        "utilizacion_score",
        "control_demoras_score",
        "seguridad_score",
        "toneladas_reales",
        "toneladas_esperadas",
        "ciclos",
        "tph",
        "manageable_delay_minutes",
        "system_delay_minutes",
        "bathroom_minutes",
        "lunch_minutes",
        "shift_change_minutes",
        "lost_tons_estimated",
        "recurrence_level",
        "risk_level",
        "main_loss_cause",
        "recommendation",
    ]
    writer.writerow(columns)
    for item in ranking["items"]:
        writer.writerow([item.get(column, "") for column in columns])
    return buffer.getvalue()
