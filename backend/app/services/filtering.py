from __future__ import annotations

from datetime import date, datetime
from typing import Any, Mapping


FILTER_KEYS = {
    "start_date",
    "end_date",
    "selected_date",
    "shift",
    "equipment_id",
    "model",
    "phase",
    "origin",
    "destination",
    "material",
    "operator_id",
    "status",
    "severity",
    "event_category",
    "delay_category",
    "loading_unit_id",
    "caex_id",
    "min_score",
    "max_score",
    "recurrence_level",
}

OPERATOR_FILTER_OPTIONS = [
    ("OP001", "Luis Araya"),
    ("OP002", "J. Salinas"),
    ("OP003", "M. Torres"),
    ("OP004", "A. Vera"),
    ("OP005", "C. Rojas"),
    ("OP006", "P. Araya"),
    ("OP007", "D. Molina"),
    ("OP008", "R. Fuentes"),
    ("OP009", "L. Tapia"),
    ("OP010", "F. Munoz"),
    ("OP011", "N. Ibarra"),
    ("OP012", "S. Carrasco"),
]
OPERATOR_NAME_TO_ID = {name: operator_id for operator_id, name in OPERATOR_FILTER_OPTIONS}

EMPTY_VALUES = {"", "TODOS", "TODAS", "ALL", "ANY", "NULL", "NONE"}
SHIFT_ALIASES = {
    "DIA": "DIA",
    "DÍA": "DIA",
    "DAY": "DIA",
    "NOCHE": "NOCHE",
    "NIGHT": "NOCHE",
    "ACTUAL": "ACTUAL",
    "CURRENT": "ACTUAL",
    "TODOS": "TODOS",
    "TODAS": "TODOS",
    "ALL": "TODOS",
}
STATUS_ALIASES = {
    "MANTENCIÓN": "MANTENCION",
    "MANTENCION": "MANTENCION",
    "MANTENIMIENTO": "MANTENCION",
    "AVERÍA": "AVERIA",
    "AVERIA": "AVERIA",
    "POSIBLE AVERIA": "AVERIA",
    "OPERATIVO": "ACTIVO",
}


def _clean(value: Any) -> str:
    return str(value or "").strip()


def _norm(value: Any) -> str:
    normalized = _clean(value).upper()
    for src, dst in (("Á", "A"), ("É", "E"), ("Í", "I"), ("Ó", "O"), ("Ú", "U"), ("Ñ", "N")):
        normalized = normalized.replace(src, dst)
    if normalized.startswith("FASE "):
        suffix = normalized.replace("FASE ", "").strip()
        if suffix.isdigit():
            return f"F{int(suffix):02d}"
    return normalized


def _is_empty(value: Any) -> bool:
    return _norm(value) in EMPTY_VALUES


def normalize_shift(value: Any) -> str | None:
    if _is_empty(value):
        return None
    return SHIFT_ALIASES.get(_norm(value), _norm(value))


def _normalize_status(value: Any) -> str:
    normalized = _norm(value)
    return STATUS_ALIASES.get(normalized, normalized)


def normalize_date_range(start: str | None = None, end: str | None = None) -> tuple[date | None, date | None]:
    def parse(raw: str | None) -> date | None:
        if not raw:
            return None
        try:
            return date.fromisoformat(raw[:10])
        except ValueError:
            return None

    start_date = parse(start)
    end_date = parse(end)
    if start_date and end_date and start_date > end_date:
        start_date, end_date = end_date, start_date
    return start_date, end_date


def filters_from_query(query: Mapping[str, Any]) -> dict[str, str]:
    filters: dict[str, str] = {}
    aliases = {
        "fecha_inicio": "start_date",
        "fecha_fin": "end_date",
        "fecha": "selected_date",
        "date": "selected_date",
        "selected_date": "selected_date",
        "desde": "start_date",
        "hasta": "end_date",
        "turno": "shift",
        "modelo": "model",
        "fase": "phase",
        "origen": "origin",
        "destino": "destination",
        "material": "material",
        "estado": "status",
        "severidad": "severity",
        "categoria": "event_category",
        "categoria_evento": "event_category",
        "delay_category": "delay_category",
        "categoria_demora": "delay_category",
        "carguio_id": "loading_unit_id",
        "pala_id": "loading_unit_id",
        "camion_id": "caex_id",
    }
    for raw_key, raw_value in query.items():
        key = aliases.get(raw_key, raw_key)
        if key not in FILTER_KEYS:
            continue
        value = _clean(raw_value)
        if not value or _is_empty(value):
            continue
        filters[key] = value
    if "shift" in filters:
        normalized = normalize_shift(filters["shift"])
        if normalized:
            filters["shift"] = normalized
    return filters


def _record_date(item: Mapping[str, Any]) -> date | None:
    raw = item.get("fecha_dia") or item.get("fecha") or item.get("date") or item.get("timestamp") or item.get("datetime") or item.get("ultima_actividad") or item.get("ultimo_registro")
    if not raw:
        return None
    try:
        return date.fromisoformat(str(raw)[:10])
    except ValueError:
        try:
            return datetime.fromisoformat(str(raw)).date()
        except ValueError:
            return None


def _operator_for_record(item: Mapping[str, Any]) -> str | None:
    # HU-11.4: operador real via badge (operador_caex/operador_pala, ver
    # wenco_data.py). Sin registro real disponible para este item puntual,
    # no se inventa un nombre - se devuelve None ("Sin dato" en la UI).
    raw = item.get("operador") or item.get("operador_caex") or item.get("operador_pala") or item.get("operator_id")
    return str(raw) if raw else None


def _values_for(item: Mapping[str, Any], key: str) -> list[str]:
    if key == "equipment_id":
        return [str(item.get(name) or "") for name in ("equipment_id", "caex_id", "carguio_id", "id")]
    if key == "caex_id":
        return [str(item.get(name) or "") for name in ("caex_id", "equipment_id", "id")]
    if key == "loading_unit_id":
        return [str(item.get(name) or "") for name in ("carguio_id", "loading_unit_id", "equipment_id", "id")]
    if key == "model":
        return [str(item.get(name) or "") for name in ("modelo", "camion_modelo", "pala_modelo", "model")]
    if key == "phase":
        return [str(item.get(name) or "") for name in ("fase", "phase")]
    if key == "origin":
        return [str(item.get(name) or "") for name in ("origen", "origin", "ubicacion")]
    if key == "destination":
        return [str(item.get(name) or "") for name in ("destino", "destination", "destino_actual")]
    if key == "material":
        return [str(item.get(name) or "") for name in ("material", "material_type")]
    if key == "operator_id":
        operator = _operator_for_record(item)
        return [operator, OPERATOR_NAME_TO_ID.get(operator, "")]
    if key == "status":
        return [str(item.get(name) or "") for name in ("estado", "status")]
    if key == "severity":
        return [str(item.get(name) or "") for name in ("severidad", "severity")]
    if key in {"event_category", "delay_category"}:
        return [str(item.get(name) or "") for name in ("event_category", "categoria", "modulo", "type", "titulo", "title", "descripcion", "description")]
    if key == "shift":
        return [str(item.get(name) or "") for name in ("turno_calc", "turno", "shift")]
    return [str(item.get(key) or "")]


def matches_filter(item: Mapping[str, Any], key: str, expected: Any) -> bool:
    if _is_empty(expected):
        return True
    expected_norm = _normalize_status(expected) if key == "status" else _norm(expected)
    if key == "shift":
        shift = normalize_shift(expected_norm)
        if not shift or shift == "TODOS" or shift == "ACTUAL":
            return True
        return any(normalize_shift(value) == shift for value in _values_for(item, key))
    if key in {"start_date", "end_date"}:
        return True

    values = _values_for(item, key)
    if key == "status":
        return any(_normalize_status(value) == expected_norm for value in values)
    if key in {"event_category", "delay_category", "origin", "destination"}:
        return any(expected_norm in _norm(value) for value in values if value)
    return any(_norm(value) == expected_norm for value in values if value)


def apply_common_filters(items: list[dict[str, Any]], filters: Mapping[str, Any]) -> list[dict[str, Any]]:
    start, end = normalize_date_range(filters.get("start_date"), filters.get("end_date"))
    filtered = []
    for item in items:
        item_date = _record_date(item)
        if start and item_date and item_date < start:
            continue
        if end and item_date and item_date > end:
            continue
        if any(not matches_filter(item, key, value) for key, value in filters.items() if key not in {"start_date", "end_date"}):
            continue
        filtered.append(item)
    return filtered


def filtered_operational_dataset(dataset: dict[str, Any], filters: Mapping[str, Any]) -> dict[str, Any]:
    if not filters:
        return dataset
    cycle_filters = {
        key: value
        for key, value in filters.items()
        if key not in {"status", "severity", "event_category", "selected_date"}
    }
    cycles = []
    for record in dataset.get("cycles", []):
        enriched = {**record, "operador": _operator_for_record(record), "operator_id": _operator_for_record(record)}
        cycles.append(enriched)
    return {**dataset, "cycles": apply_common_filters(cycles, cycle_filters)}


def filter_fleet_full_response(response: dict[str, Any], filters: Mapping[str, Any]) -> dict[str, Any]:
    rows = response.get("ranking", [])
    filtered = apply_common_filters(rows, filters)
    for index, item in enumerate(filtered):
        item["rank"] = index + 1
    estado = {
        "activo": sum(1 for item in filtered if _normalize_status(item.get("estado")) == "ACTIVO"),
        "sin_actividad": sum(1 for item in filtered if _normalize_status(item.get("estado")) == "SIN ACTIVIDAD"),
        "mantencion": sum(1 for item in filtered if _normalize_status(item.get("estado")) == "MANTENCION"),
        "demora": sum(1 for item in filtered if _normalize_status(item.get("estado")) == "DEMORA"),
    }
    por_modelo: dict[str, list[dict[str, Any]]] = {}
    for item in filtered:
        por_modelo.setdefault(str(item.get("modelo") or "N/D"), []).append(item)
    model_rows = [
        {
            "modelo": model,
            "equipos": len(items),
            "eficiencia_pct": round(sum(float(item.get("eficiencia_pct") or 0) for item in items) / max(len(items), 1), 1),
            "ciclos_hora": round(sum(float(item.get("tph") or 0) for item in items) / max(len(items), 1), 1),
            "t_ciclo_nominal": int(max((item.get("capacidad") or 0) for item in items) if items else 0),
            "t_ciclo_real": round(sum(float(item.get("prom_ciclo") or 0) for item in items) / max(len(items), 1), 1),
            "mejor_caex": max(items, key=lambda item: item.get("toneladas", 0)).get("caex_id") if items else "-",
        }
        for model, items in sorted(por_modelo.items())
    ]
    return {
        **response,
        "ranking": filtered,
        "top5": filtered[:5],
        "tiempo_ciclos": sorted(filtered, key=lambda item: item.get("tiempo_ciclo_min", 0), reverse=True)[:15],
        "por_modelo": model_rows,
        "estado_flota": estado,
        "resumen": {
            **response.get("resumen", {}),
            "total_caex": len(filtered),
            "disponibilidad": round((len(filtered) - estado["mantencion"]) / max(len(filtered), 1) * 100, 1),
            "prom_ciclo": round(sum(float(item.get("prom_ciclo") or 0) for item in filtered) / max(len(filtered), 1), 1),
            "ciclos_hora": round(sum(float(item.get("ciclos") or 0) for item in filtered) / max(len(filtered), 1), 1),
        },
    }


def filter_alert_response(response: dict[str, Any], filters: Mapping[str, Any]) -> dict[str, Any]:
    items = apply_common_filters(response.get("items", []), filters)
    counts = {severity: 0 for severity in ["CRITICA", "ALTA", "MEDIA", "BAJA"]}
    for item in items:
        severity = _norm(item.get("severidad") or item.get("severity"))
        if severity in counts:
            counts[severity] += 1
    return {**response, "items": items, "count": len(items), "counts": counts or response.get("counts", {})}


def build_filter_catalog(dataset: dict[str, Any]) -> dict[str, Any]:
    cycles = dataset.get("cycles", [])
    caex_ids = sorted({record["caex_id"] for record in cycles})
    loading_units = sorted({record["carguio_id"] for record in cycles})
    models = sorted({record.get("camion_modelo") for record in cycles} | {record.get("pala_modelo") for record in cycles})
    phases = sorted({record.get("fase") for record in cycles if record.get("fase")})
    origins = sorted({record.get("origen") for record in cycles if record.get("origen")})
    destinations = sorted({record.get("destino") for record in cycles if record.get("destino")})
    materials = sorted({record.get("material") for record in cycles if record.get("material")})
    operators = sorted(
        {
            (
                str(record.get("operador_caex_badge") or record.get("operador_caex") or "").strip(),
                str(record.get("operador_caex") or "").strip(),
            )
            for record in cycles
            if record.get("operador_caex")
        },
        key=lambda item: item[1],
    )
    return {
        "source": dataset.get("source", "wenco-sql-live"),
        "shifts": [
            {"value": "TODOS", "label": "Todos"},
            {"value": "DIA", "label": "Dia"},
            {"value": "NOCHE", "label": "Noche"},
            {"value": "ACTUAL", "label": "Actual"},
        ],
        "equipment_ids": [{"value": value, "label": value} for value in sorted(set(caex_ids) | set(loading_units))],
        "caex_ids": [{"value": value, "label": value} for value in caex_ids],
        "loading_units": [{"value": value, "label": value} for value in loading_units],
        "models": [{"value": value, "label": value} for value in models if value],
        "phases": [{"value": value, "label": value} for value in phases],
        "origins": [{"value": value, "label": value} for value in origins],
        "destinations": [{"value": value, "label": value} for value in destinations],
        "materials": [{"value": value, "label": value} for value in materials],
        "operators": [
            {"value": operator_id or name, "label": f"{name} ({operator_id})" if operator_id and operator_id != name else name}
            for operator_id, name in operators
        ],
        "statuses": [{"value": value, "label": value} for value in ["ACTIVO", "DEMORA", "SIN ACTIVIDAD", "MANTENCION", "AVERIA"]],
        "severities": [{"value": value, "label": value.title()} for value in ["CRITICA", "ALTA", "MEDIA", "BAJA"]],
        "event_categories": [
            {"value": value, "label": value}
            for value in [
                "Demora",
                "O03 Bano",
                "O02 Colacion",
                "O01 Cambio de Turno",
                "O04 Petroleando",
                "O12 Sin Postura",
                "O13 Chequeo Equipo",
                "O16 Detenido por Combustible",
                "Exceso de Velocidad",
                "Averia",
                "Espera en Pala",
                "Espera en Chancado",
                "Combustible",
                "Tronadura",
                "Flota",
                "Carguio",
                "Sistema",
            ]
        ],
        "delay_categories": [
            {"value": value, "label": value}
            for value in [
                "O01 Cambio de Turno",
                "O02 Colacion",
                "O03 Bano",
                "O04 Petroleando",
                "O12 Sin Postura",
                "O13 Chequeo Equipo",
                "O16 Detenido por Combustible",
                "S01 Espera en Pala",
                "S02 Espera en Chancado",
                "S03 Mantencion",
                "S04 Averia",
                "S05 Tronadura",
                "S06 Clima",
            ]
        ],
        "recurrence_levels": [{"value": value, "label": value.title()} for value in ["BAJO", "OBSERVACION", "SEGUIMIENTO", "ALTO"]],
    }
