from __future__ import annotations

from collections import defaultdict
from datetime import date, datetime, timedelta
from typing import Any

from app.services.data_provider import get_equipment_status as _provider_get_equipment_status
from app.services.kpis import resolve_current_shift_context


SHIFT_COMPARISON_API_VERSION = "v1"
DAY_HOURS = list(range(7, 19))
NIGHT_HOURS = [19, 20, 21, 22, 23, 0, 1, 2, 3, 4, 5, 6]

EQUIPMENT_STATUS_DESCRIPTIONS: dict[str, str] = {
    "M10": "Mantenimiento Programado",
    "M20": "Mantimiento No Programado",
    "M30": "Averia",
    "M40": "Traslado Mantencion",
    "M50": "Mnt Diario",
    "M60": "Evaluacion",
    "M70": "Pruebas Mecanicas",
    "M80": "Averia radiobase",
    "N19": "Face Prep",
    "O21": "Espera por Emergencia",
    "O27": "Falla Operacional",
    "N76": "Trabajos Especiales",
    "023": "Demoras por causa de",
    "O23": "Demora Tercero",
    "N80": "Equipos de Apoyo en el Area",
    "O01": "Cambio de Turno",
    "O02": "Colacion",
    "O03": "Bano",
    "O05": "Tronadura",
    "O06": "Charla De Seguridad",
    "O07": "Capacitacion",
    "O08": "Policlinico",
    "O09": "Clima",
    "O10": "Averia Otro",
    "O11": "Combustible",
    "O12": "Sin Postura",
    "O13": "Chequeo",
    "O14": "Traslado",
    "O15": "Espera Barrera",
    "O17": "Equipo de apoyo en el area",
    "O22": "Traslado Por Tronadura",
    "O24": "Traslado entre Tajos",
    "O25": "Detencion por estrechez pista",
    "72": "Arreglo de Banqueta",
    "N09": "Produccion General",
    "N70": "Barras Pegadas",
    "N71": "Limpieza de Caja/Taludes",
    "N72": "Cambio de Malla",
    "N73": "Cambio Aceros",
    "N77": "Traslado entre Pozos",
    "N78": "Traslado Cargado",
    "N79": "Carga de Perforadoras",
    "N98": "ACOPIO MATERIAL",
    "N04": "Transportando",
    "N15": "Tramming",
    "N30": "Fuelling Vehicle",
    "N31": "Fuel Truck Waiting",
    "N50": "Perforando",
    "N60": "Ripping",
    "N65": "Scraper Waiting",
    "N67": "Humectacion de Circuitos",
    "N69": "Operacion general",
    "N00": "Espera en Descarga",
    "N02": "Espera en Pala",
    "N06": "Cola en Pala",
    "N08": "Spot at Dump",
    "N14": "Pala Esperando",
    "N84": "Espera en chandado",
    "N96": "Cola en Cachimba",
    "O84": "Cola Chancado",
    "N51": "Cambio Pozo",
    "N52": "DRL Tramming",
    "N53": "Nivelando",
    "016": "Auxiliares Frente de Carguio",
    "N75": "Arreglo Banqueta",
    "N83": "Topografia en Area",
    "O04": "Petroleando",
    "O16": "Detenido por Combustible",
    "O18": "Espera en Chancado",
    "O19": "Topografia en el Area",
    "O20": "Relleno de Agua",
    "O26": "Detencion por derrame en pista",
    "O28": "Relevo Operador",
    "N74": "Equipo En Operacion",
    "N86": "PALA CARGANDO CAEX CEN",
    "80": "Cargando Caex Centinela",
    "N01": "Camion Cargando",
    "N13": "Pala Cargando",
    "S": "Idle",
    "N05": "Aculatando en Pala",
    "N11": "Aculatando",
    "N03": "Vacio",
    "N68": "Traslado vacio",
    "N81": "Espera Asig Pala",
    "N82": "Espera Asig Caex",
    "N66": "Cargando agua",
    "N85": "BANQUETA",
    "S03": "Pala en Mantenimiento",
    "N97": "averia otro/cachimba",
    "S01": "Parada Otros",
    "S1": "Espera Asignacion",
    "S10": "Espera de agua",
    "S2": "Espera de Postura",
    "S99": "Standby",
    "N07": "Vaciando",
}


def _now_iso() -> str:
    return datetime.now().isoformat(timespec="seconds")


def _record_shift_date(record: dict[str, Any]) -> str:
    return str(record.get("shift_date") or record.get("fecha_dia") or "")[:10]


def _record_shift(record: dict[str, Any]) -> str:
    value = str(record.get("turno_calc") or record.get("turno") or "").upper()
    return "DIA" if value == "DIA" else "NOCHE" if value == "NOCHE" else value


def _looks_like_caex_id(equipment_id: str) -> bool:
    normalized = str(equipment_id or "").strip().upper()
    return normalized.startswith("CA") or normalized.startswith("CAEX")


def _tons(record: dict[str, Any]) -> int:
    return int(record.get("tonelaje") or record.get("toneladas") or 0)


def _leader(day_value: int, night_value: int) -> str:
    if day_value > night_value:
        return "DIA"
    if night_value > day_value:
        return "NOCHE"
    return "EMPATE"


def _top_distribution(distribution: dict[str, int]) -> tuple[str, int, float]:
    if not distribution:
        return "Sin dato", 0, 0.0
    label, tonnes = max(distribution.items(), key=lambda item: item[1])
    total = sum(distribution.values())
    return label, tonnes, round(tonnes / max(total, 1) * 100, 1)


def _record_operator(record: dict[str, Any], id_key: str) -> str | None:
    if id_key == "carguio_id":
        value = record.get("operador_pala") or record.get("operator") or record.get("operador")
    elif id_key == "caex_id":
        value = record.get("operador_caex") or record.get("operator") or record.get("operador")
    else:
        value = record.get("operator") or record.get("operador")
    value = str(value or "").strip()
    return value or None


def _first_number(record: dict[str, Any], keys: tuple[str, ...]) -> float | None:
    for key in keys:
        value = record.get(key)
        if isinstance(value, (int, float)):
            return float(value)
        if value not in (None, ""):
            try:
                return float(value)
            except (TypeError, ValueError):
                continue
    return None


def _average(values: list[float]) -> float | None:
    if not values:
        return None
    return round(sum(values) / len(values), 1)


def _parse_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(str(value))
    except ValueError:
        return None


def _normalize_status_code(value: Any) -> str:
    raw = str(value or "").strip().upper()
    if raw.startswith("N") and raw[1:].isdigit() and len(raw[1:]) == 1:
        return f"N0{raw[1:]}"
    return raw


def _status_description(status_code: str, provided: Any = None) -> str:
    return EQUIPMENT_STATUS_DESCRIPTIONS.get(status_code) or str(provided or status_code).strip() or status_code


def _status_category(status_code: str) -> str:
    if status_code.startswith("M"):
        return "MANTENCION"
    if status_code.startswith("O") or status_code in {"016", "023"}:
        return "OPERACIONAL"
    if status_code.startswith("S"):
        return "STANDBY"
    if status_code.startswith("N") or status_code in {"72", "80"}:
        return "OPERACION"
    return "OTRO"


def _hour_bucket_start(shift_date: date, shift: str, hour: int) -> datetime:
    bucket_date = shift_date
    if shift == "NOCHE" and hour < 7:
        bucket_date = shift_date + timedelta(days=1)
    return datetime.combine(bucket_date, datetime.min.time()).replace(hour=hour)


def _status_minutes_by_hour(dataset: dict[str, Any], selected_date: str) -> dict[tuple[str, str, int], dict[str, Any]]:
    shift_date = date.fromisoformat(selected_date)
    buckets: list[tuple[str, int, datetime, datetime]] = []
    for shift, hours in (("DIA", DAY_HOURS), ("NOCHE", NIGHT_HOURS)):
        for hour in hours:
            started = _hour_bucket_start(shift_date, shift, hour)
            buckets.append((shift, hour, started, started + timedelta(hours=1)))

    durations: dict[tuple[str, str, int], dict[str, Any]] = defaultdict(
        lambda: {
            "N03": [],
            "N04": [],
            "N06": [],
            "N13": [],
            "N14": [],
            "status_breakdown": {},
            "maintenance_minutes": 0.0,
            "maintenance_codes": defaultdict(float),
            "maintenance_desc": {},
        }
    )
    fallback_end = datetime.now()

    for event in dataset.get("loader_status_durations", []):
        status_code = _normalize_status_code(event.get("status_code"))
        if not status_code:
            continue
        equipment_id = str(event.get("loader_id") or "").strip()
        if not equipment_id:
            continue
        started_at = _parse_datetime(event.get("start_timestamp"))
        ended_at = _parse_datetime(event.get("end_timestamp")) or fallback_end
        if not started_at or ended_at <= started_at:
            continue
        for shift, hour, bucket_start, bucket_end in buckets:
            overlap_start = max(started_at, bucket_start)
            overlap_end = min(ended_at, bucket_end)
            if overlap_end <= overlap_start:
                continue
            minutes = round((overlap_end - overlap_start).total_seconds() / 60, 1)
            if minutes <= 0:
                continue
            row = durations[(equipment_id, shift, hour)]
            status_item = row["status_breakdown"].setdefault(
                status_code,
                {
                    "code": status_code,
                    "description": _status_description(status_code, event.get("status_desc")),
                    "category": _status_category(status_code),
                    "minutes": 0.0,
                    "occurrences": 0,
                },
            )
            status_item["minutes"] += minutes
            status_item["occurrences"] += 1
            if status_code in {"N03", "N04", "N06", "N13", "N14"}:
                row[status_code].append(minutes)
            if status_code.startswith("M"):
                row["maintenance_minutes"] += minutes
                row["maintenance_codes"][status_code] += minutes
                row["maintenance_desc"][status_code] = event.get("status_desc") or status_code

    result: dict[tuple[str, str, int], dict[str, Any]] = {}
    for key, values in durations.items():
        status_total = sum(float(item["minutes"]) for item in values["status_breakdown"].values())
        status_breakdown = []
        for item in values["status_breakdown"].values():
            minutes = round(float(item["minutes"]), 1)
            status_breakdown.append(
                {
                    "code": item["code"],
                    "description": item["description"],
                    "category": item["category"],
                    "minutes": minutes,
                    "pct": round(minutes / max(status_total, 0.1) * 100, 1),
                    "occurrences": int(item["occurrences"]),
                }
            )
        status_breakdown = sorted(status_breakdown, key=lambda item: item["minutes"], reverse=True)
        maintenance_codes = values["maintenance_codes"]
        maintenance_code = None
        maintenance_desc = None
        if maintenance_codes:
            maintenance_code = max(maintenance_codes.items(), key=lambda item: item[1])[0]
            maintenance_desc = _status_description(maintenance_code, values["maintenance_desc"].get(maintenance_code))
        n03_avg = _average(values["N03"])
        n04_avg = _average(values["N04"])
        n06_avg = _average(values["N06"])
        n13_avg = _average(values["N13"])
        route_cycle = (
            round(n03_avg + n04_avg, 1)
            if n03_avg is not None and n04_avg is not None
            else None
        )
        caex_cycle = (
            round(route_cycle + (n06_avg or 0.0), 1)
            if route_cycle is not None and (n06_avg is not None or n13_avg is not None)
            else route_cycle
        )
        caex_cycle_source = None
        if caex_cycle is not None:
            if n06_avg is not None and n13_avg is not None:
                caex_cycle_source = "WENCO_N04_N03_N06_TO_N13"
            elif n06_avg is not None:
                caex_cycle_source = "WENCO_N04_N03_N06"
            elif n13_avg is not None:
                caex_cycle_source = "WENCO_N04_N03_TO_N13"
            else:
                caex_cycle_source = "WENCO_N04_N03"
        result[key] = {
            "n03_avg_min": n03_avg,
            "n04_avg_min": n04_avg,
            "n06_avg_min": n06_avg,
            "travel_cycle_avg_min": route_cycle,
            "caex_cycle_avg_min": caex_cycle,
            "caex_cycle_source": caex_cycle_source,
            "n13_avg_min": n13_avg,
            "n14_total_min": round(sum(values["N14"]), 1) if values["N14"] else None,
            "status_breakdown": status_breakdown,
            "maintenance_minutes": round(values["maintenance_minutes"], 1) if values["maintenance_minutes"] else None,
            "maintenance_code": maintenance_code,
            "maintenance_desc": maintenance_desc,
        }
    return result


def _record_distance_km(record: dict[str, Any]) -> float | None:
    loaded = _first_number(record, ("haul_distance_km", "loaded_distance_km", "distancia_cargado_km"))
    empty = _first_number(record, ("empty_distance_km", "distancia_vacio_km"))
    if loaded is not None and empty is not None:
        return round(loaded + empty, 2)
    return _first_number(record, ("distance_km", "avg_distance_km", "distancia_km", "distancia_total_km"))


def _record_loaded_distance_km(record: dict[str, Any]) -> float | None:
    return _first_number(record, ("haul_distance_km", "loaded_distance_km", "distancia_cargado_km"))


def _record_loading_time_min(record: dict[str, Any]) -> float | None:
    return _first_number(
        record,
        (
            "avg_loading_time_min",
            "loading_time_min",
            "tiempo_carguio_min",
            "tiempo_carga_min",
        ),
    )


def _record_wait_time_min(record: dict[str, Any]) -> float | None:
    return _first_number(
        record,
        (
            "avg_caex_wait_time_min",
            "caex_wait_time_min",
            "tiempo_espera_caex_min",
            "tiempo_espera_min",
        ),
    )


def _record_cycle_time_min(record: dict[str, Any]) -> float | None:
    direct = _first_number(record, ("cycle_time_min", "tiempo_ciclo_min", "duracion_ciclo_min"))
    if direct is not None:
        return direct
    start = _parse_datetime(record.get("start_datetime"))
    end = _parse_datetime(record.get("datetime"))
    if start and end and end > start:
        return round((end - start).total_seconds() / 60, 1)
    loading = _record_loading_time_min(record)
    wait = _record_wait_time_min(record)
    if loading is not None and wait is not None:
        return round(loading + wait, 1)
    return loading if loading is not None else wait


def _shift_summary(records: list[dict[str, Any]], shift: str) -> dict[str, Any]:
    shift_records = [item for item in records if _record_shift(item) == shift]
    total = sum(_tons(item) for item in shift_records)
    cycles = len(shift_records)
    return {
        "shift": shift,
        "label": "Turno Dia" if shift == "DIA" else "Turno Noche",
        "total_tonnes": total,
        "cycles": cycles,
        "avg_tonnes_per_cycle": round(total / max(cycles, 1), 1),
        "caex_count": len({str(item.get("caex_id") or "") for item in shift_records if item.get("caex_id")}),
        "loading_units_count": len(
            {str(item.get("carguio_id") or "") for item in shift_records if item.get("carguio_id")}
        ),
    }


def _hourly_rows(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    totals: dict[tuple[str, int], dict[str, int]] = defaultdict(lambda: {"tonnes": 0, "cycles": 0})
    for record in records:
        shift = _record_shift(record)
        if shift not in {"DIA", "NOCHE"}:
            continue
        hour = int(record.get("hora") or 0)
        totals[(shift, hour)]["tonnes"] += _tons(record)
        totals[(shift, hour)]["cycles"] += 1

    rows = []
    for index, (day_hour, night_hour) in enumerate(zip(DAY_HOURS, NIGHT_HOURS), start=1):
        day = totals[("DIA", day_hour)]
        night = totals[("NOCHE", night_hour)]
        day_tonnes = int(day["tonnes"])
        night_tonnes = int(night["tonnes"])
        rows.append(
            {
                "slot": index,
                "label": f"H+{index}",
                "dia_hour": f"{day_hour:02d}:00",
                "noche_hour": f"{night_hour:02d}:00",
                "dia_tonnes": day_tonnes,
                "noche_tonnes": night_tonnes,
                "difference_tonnes": day_tonnes - night_tonnes,
                "dia_cycles": int(day["cycles"]),
                "noche_cycles": int(night["cycles"]),
                "leader": _leader(day_tonnes, night_tonnes),
            }
        )
    return rows


def _distribution_breakdown(tonnes_map: dict[str, int], cycles_map: dict[str, int]) -> list[dict[str, Any]]:
    """Distribucion completa (no solo el top) de toneladas y descargas por clave."""
    total = sum(tonnes_map.values())
    return [
        {
            "name": name,
            "tonnes": int(tonnes),
            "cycles": int(cycles_map.get(name, 0)),
            "pct": round(tonnes / total * 100, 1) if total else 0.0,
        }
        for name, tonnes in sorted(tonnes_map.items(), key=lambda item: item[1], reverse=True)
        if tonnes > 0
    ]


def _equipment_rows(records: list[dict[str, Any]], id_key: str, model_key: str) -> list[dict[str, Any]]:
    rows: dict[str, dict[str, Any]] = {}
    for record in records:
        equipment_id = str(record.get(id_key) or "").strip()
        if not equipment_id:
            continue
        row = rows.setdefault(
            equipment_id,
            {
                "id": equipment_id,
                "model": str(record.get(model_key) or "N/D"),
                "dia_tonnes": 0,
                "noche_tonnes": 0,
                "dia_cycles": 0,
                "noche_cycles": 0,
                "destinations": defaultdict(int),
                "dia_destinations": defaultdict(int),
                "noche_destinations": defaultdict(int),
                "destination_cycles": defaultdict(int),
                "dia_destination_cycles": defaultdict(int),
                "noche_destination_cycles": defaultdict(int),
                "origins": defaultdict(int),
                "dia_origins": defaultdict(int),
                "noche_origins": defaultdict(int),
                "origin_cycles": defaultdict(int),
                "dia_origin_cycles": defaultdict(int),
                "noche_origin_cycles": defaultdict(int),
                "operators": defaultdict(int),
                "dia_operators": defaultdict(int),
                "noche_operators": defaultdict(int),
                "caex_ids": set(),
                "dia_caex_ids": set(),
                "noche_caex_ids": set(),
                "loading_unit_ids": set(),
                "dia_loading_unit_ids": set(),
                "noche_loading_unit_ids": set(),
                "loading_units_distribution": defaultdict(int),
                "dia_loading_units_distribution": defaultdict(int),
                "noche_loading_units_distribution": defaultdict(int),
                "distances": [],
                "dia_distances": [],
                "noche_distances": [],
            },
        )
        shift = _record_shift(record)
        if shift == "DIA":
            row["dia_tonnes"] += _tons(record)
            row["dia_cycles"] += 1
        elif shift == "NOCHE":
            row["noche_tonnes"] += _tons(record)
            row["noche_cycles"] += 1
        if row["model"] == "N/D" and record.get(model_key):
            row["model"] = str(record[model_key])
        destination = str(record.get("destino") or "Sin destino")
        origin = str(record.get("origen") or "Sin banco / malla")
        tonnes = _tons(record)
        row["destinations"][destination] += tonnes
        row["destination_cycles"][destination] += 1
        row["origins"][origin] += tonnes
        row["origin_cycles"][origin] += 1
        operator = _record_operator(record, id_key)
        if operator:
            row["operators"][operator] += tonnes
        distance = _record_distance_km(record)
        if distance is not None:
            row["distances"].append(distance)
            if shift == "DIA":
                row["dia_distances"].append(distance)
            elif shift == "NOCHE":
                row["noche_distances"].append(distance)
        if shift == "DIA":
            row["dia_destinations"][destination] += tonnes
            row["dia_destination_cycles"][destination] += 1
            row["dia_origins"][origin] += tonnes
            row["dia_origin_cycles"][origin] += 1
            if operator:
                row["dia_operators"][operator] += tonnes
        elif shift == "NOCHE":
            row["noche_destinations"][destination] += tonnes
            row["noche_destination_cycles"][destination] += 1
            row["noche_origins"][origin] += tonnes
            row["noche_origin_cycles"][origin] += 1
            if operator:
                row["noche_operators"][operator] += tonnes
        if record.get("caex_id"):
            row["caex_ids"].add(str(record["caex_id"]))
            if shift == "DIA":
                row["dia_caex_ids"].add(str(record["caex_id"]))
            elif shift == "NOCHE":
                row["noche_caex_ids"].add(str(record["caex_id"]))
        if record.get("carguio_id"):
            loading_unit = str(record["carguio_id"])
            row["loading_unit_ids"].add(loading_unit)
            row["loading_units_distribution"][loading_unit] += tonnes
            if shift == "DIA":
                row["dia_loading_unit_ids"].add(loading_unit)
                row["dia_loading_units_distribution"][loading_unit] += tonnes
            elif shift == "NOCHE":
                row["noche_loading_unit_ids"].add(loading_unit)
                row["noche_loading_units_distribution"][loading_unit] += tonnes

    items = []
    for row in rows.values():
        day_tonnes = int(row["dia_tonnes"])
        night_tonnes = int(row["noche_tonnes"])
        day_cycles = int(row["dia_cycles"])
        night_cycles = int(row["noche_cycles"])
        main_destination, _, destination_pct = _top_distribution(row["destinations"])
        dia_destination, _, dia_destination_pct = _top_distribution(row["dia_destinations"])
        noche_destination, _, noche_destination_pct = _top_distribution(row["noche_destinations"])
        main_origin, _, origin_pct = _top_distribution(row["origins"])
        dia_origin, _, dia_origin_pct = _top_distribution(row["dia_origins"])
        noche_origin, _, noche_origin_pct = _top_distribution(row["noche_origins"])
        loading_unit, _, loading_unit_pct = _top_distribution(row["loading_units_distribution"])
        dia_loading_unit, _, dia_loading_unit_pct = _top_distribution(row["dia_loading_units_distribution"])
        noche_loading_unit, _, noche_loading_unit_pct = _top_distribution(row["noche_loading_units_distribution"])
        operator, _, _ = _top_distribution(row["operators"])
        dia_operator, _, _ = _top_distribution(row["dia_operators"])
        noche_operator, _, _ = _top_distribution(row["noche_operators"])
        items.append(
            {
                "id": row["id"],
                "model": row["model"],
                "operator": None if operator == "Sin dato" else operator,
                "dia_operator": None if dia_operator == "Sin dato" else dia_operator,
                "noche_operator": None if noche_operator == "Sin dato" else noche_operator,
                "dia_tonnes": day_tonnes,
                "noche_tonnes": night_tonnes,
                "dia_cycles": day_cycles,
                "noche_cycles": night_cycles,
                "total_tonnes": day_tonnes + night_tonnes,
                "total_cycles": day_cycles + night_cycles,
                "difference_tonnes": day_tonnes - night_tonnes,
                "leader": _leader(day_tonnes, night_tonnes),
                "assigned_caex": len(row["caex_ids"]),
                "dia_assigned_caex": len(row["dia_caex_ids"]),
                "noche_assigned_caex": len(row["noche_caex_ids"]),
                "caex_id_list": sorted(row["caex_ids"]),
                "dia_caex_id_list": sorted(row["dia_caex_ids"]),
                "noche_caex_id_list": sorted(row["noche_caex_ids"]),
                "loading_units": len(row["loading_unit_ids"]),
                "dia_loading_units": len(row["dia_loading_unit_ids"]),
                "noche_loading_units": len(row["noche_loading_unit_ids"]),
                "main_loading_unit": None if loading_unit == "Sin dato" else loading_unit,
                "loading_unit_pct": loading_unit_pct,
                "dia_main_loading_unit": None if dia_loading_unit == "Sin dato" else dia_loading_unit,
                "dia_loading_unit_pct": dia_loading_unit_pct,
                "noche_main_loading_unit": None if noche_loading_unit == "Sin dato" else noche_loading_unit,
                "noche_loading_unit_pct": noche_loading_unit_pct,
                "avg_caex_in_circuit": round(len(row["caex_ids"]) / 2, 1) if id_key == "carguio_id" else None,
                "dia_avg_caex_in_circuit": round(len(row["dia_caex_ids"]) / 2, 1) if id_key == "carguio_id" else None,
                "noche_avg_caex_in_circuit": round(len(row["noche_caex_ids"]) / 2, 1) if id_key == "carguio_id" else None,
                "main_destination": main_destination,
                "destination_pct": destination_pct,
                "dia_main_destination": dia_destination,
                "dia_destination_pct": dia_destination_pct,
                "noche_main_destination": noche_destination,
                "noche_destination_pct": noche_destination_pct,
                "destination_breakdown": _distribution_breakdown(row["destinations"], row["destination_cycles"]),
                "dia_destination_breakdown": _distribution_breakdown(row["dia_destinations"], row["dia_destination_cycles"]),
                "noche_destination_breakdown": _distribution_breakdown(row["noche_destinations"], row["noche_destination_cycles"]),
                "bench_mesh": main_origin,
                "bench_mesh_pct": origin_pct,
                "dia_bench_mesh": dia_origin,
                "dia_bench_mesh_pct": dia_origin_pct,
                "noche_bench_mesh": noche_origin,
                "noche_bench_mesh_pct": noche_origin_pct,
                "origin_breakdown": _distribution_breakdown(row["origins"], row["origin_cycles"]),
                "dia_origin_breakdown": _distribution_breakdown(row["dia_origins"], row["dia_origin_cycles"]),
                "noche_origin_breakdown": _distribution_breakdown(row["noche_origins"], row["noche_origin_cycles"]),
                "avg_distance_km": _average(row["distances"]),
                "dia_avg_distance_km": _average(row["dia_distances"]),
                "noche_avg_distance_km": _average(row["noche_distances"]),
            }
        )
    items = sorted(items, key=lambda item: item["total_tonnes"], reverse=True)
    return _with_efficiency(items)


def _with_efficiency(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    max_total = max((int(item["total_tonnes"]) for item in items), default=0)
    for item in items:
        item["efficiency_pct"] = round(int(item["total_tonnes"]) / max(max_total, 1) * 100, 1) if max_total else 0.0
    return items


def _equipment_reference(dataset: dict[str, Any], id_key: str) -> dict[str, dict[str, Any]]:
    references: dict[str, dict[str, Any]] = {}
    for record in dataset.get("cycles", []):
        equipment_id = str(record.get(id_key) or "").strip()
        if not equipment_id:
            continue
        current = references.get(equipment_id)
        current_ts = str(current.get("datetime") or "") if current else ""
        record_ts = str(record.get("datetime") or "")
        if current is None or record_ts > current_ts:
            references[equipment_id] = record
    return references


def _zero_equipment_row(
    equipment_id: str,
    record: dict[str, Any],
    id_key: str,
    model_key: str,
    status_info: dict[str, Any] | None = None,
) -> dict[str, Any]:
    operator = _record_operator(record, id_key)
    origin = str(record.get("origen") or "Sin dato")
    destination = str(record.get("destino") or "Sin dato")
    loading_unit = str(record.get("carguio_id") or "").strip() if id_key == "caex_id" else None
    return {
        "id": equipment_id,
        "model": str(record.get(model_key) or "N/D"),
        "operator": operator,
        "dia_operator": None,
        "noche_operator": None,
        "dia_tonnes": 0,
        "noche_tonnes": 0,
        "dia_cycles": 0,
        "noche_cycles": 0,
        "total_tonnes": 0,
        "total_cycles": 0,
        "difference_tonnes": 0,
        "leader": "EMPATE",
        "assigned_caex": 0,
        "dia_assigned_caex": 0,
        "noche_assigned_caex": 0,
        "caex_id_list": [],
        "dia_caex_id_list": [],
        "noche_caex_id_list": [],
        "loading_units": 1 if loading_unit else 0,
        "dia_loading_units": 0,
        "noche_loading_units": 0,
        "main_loading_unit": loading_unit or None,
        "loading_unit_pct": 0.0,
        "dia_main_loading_unit": None,
        "dia_loading_unit_pct": 0.0,
        "noche_main_loading_unit": None,
        "noche_loading_unit_pct": 0.0,
        "avg_caex_in_circuit": None,
        "dia_avg_caex_in_circuit": None,
        "noche_avg_caex_in_circuit": None,
        "main_destination": destination,
        "destination_pct": 0.0,
        "dia_main_destination": None,
        "dia_destination_pct": 0.0,
        "noche_main_destination": None,
        "noche_destination_pct": 0.0,
        "destination_breakdown": [],
        "dia_destination_breakdown": [],
        "noche_destination_breakdown": [],
        "bench_mesh": origin,
        "bench_mesh_pct": 0.0,
        "dia_bench_mesh": None,
        "dia_bench_mesh_pct": 0.0,
        "noche_bench_mesh": None,
        "noche_bench_mesh_pct": 0.0,
        "origin_breakdown": [],
        "dia_origin_breakdown": [],
        "noche_origin_breakdown": [],
        "avg_distance_km": _record_distance_km(record),
        "dia_avg_distance_km": None,
        "noche_avg_distance_km": None,
        "status_code": status_info.get("status_code") if status_info else None,
        "status_desc": status_info.get("status_desc") if status_info else None,
        "status_category": status_info.get("category") if status_info else None,
        "status_started_at": status_info.get("start_timestamp") if status_info else None,
    }


def _complete_equipment_rows(
    records: list[dict[str, Any]],
    dataset: dict[str, Any],
    id_key: str,
    model_key: str,
    *,
    include_status_inventory: bool = True,
) -> list[dict[str, Any]]:
    items = _equipment_rows(records, id_key, model_key)
    existing = {str(item["id"]) for item in items}
    for equipment_id, record in _equipment_reference(dataset, id_key).items():
        if equipment_id not in existing:
            items.append(_zero_equipment_row(equipment_id, record, id_key, model_key))
            existing.add(equipment_id)

    if id_key == "caex_id" and include_status_inventory:
        for equipment_id, status_info in _provider_get_equipment_status(dias=1).items():
            if equipment_id not in existing and _looks_like_caex_id(equipment_id):
                items.append(_zero_equipment_row(equipment_id, {}, id_key, model_key, status_info))
                existing.add(equipment_id)

    items = sorted(items, key=lambda item: (-int(item["total_tonnes"]), str(item["id"])))
    return _with_efficiency(items)


def _equipment_hourly_rows(
    records: list[dict[str, Any]],
    id_key: str,
    dataset: dict[str, Any],
    selected_date: str,
) -> list[dict[str, Any]]:
    status_minutes = _status_minutes_by_hour(dataset, selected_date)
    totals: dict[tuple[str, str, int], dict[str, Any]] = defaultdict(
        lambda: {
            "tonnes": 0,
            "cycles": 0,
            "operators": defaultdict(int),
            "origins": defaultdict(int),
            "destinations": defaultdict(int),
            "distances": [],
            "loaded_distances": [],
            "loading_times": [],
            "wait_times": [],
            "cycle_times": [],
        }
    )
    equipment_ids: set[str] = set()
    for record in records:
        equipment_id = str(record.get(id_key) or "").strip()
        shift = _record_shift(record)
        if not equipment_id or shift not in {"DIA", "NOCHE"}:
            continue
        hour = int(record.get("hora") or 0)
        equipment_ids.add(equipment_id)
        totals[(equipment_id, shift, hour)]["tonnes"] += _tons(record)
        totals[(equipment_id, shift, hour)]["cycles"] += 1
        tonnes = _tons(record)
        origin = str(record.get("origen") or "Sin origen")
        destination = str(record.get("destino") or "Sin destino")
        totals[(equipment_id, shift, hour)]["origins"][origin] += tonnes
        totals[(equipment_id, shift, hour)]["destinations"][destination] += tonnes
        distance = _record_distance_km(record)
        if distance is not None:
            totals[(equipment_id, shift, hour)]["distances"].append(distance)
        loaded_distance = _record_loaded_distance_km(record)
        if loaded_distance is not None:
            totals[(equipment_id, shift, hour)]["loaded_distances"].append(loaded_distance)
        loading_time = _record_loading_time_min(record)
        if loading_time is not None:
            totals[(equipment_id, shift, hour)]["loading_times"].append(loading_time)
        wait_time = _record_wait_time_min(record)
        if wait_time is not None:
            totals[(equipment_id, shift, hour)]["wait_times"].append(wait_time)
        cycle_time = _record_cycle_time_min(record)
        if cycle_time is not None:
            totals[(equipment_id, shift, hour)]["cycle_times"].append(cycle_time)
        operator = _record_operator(record, id_key)
        if operator:
            totals[(equipment_id, shift, hour)]["operators"][operator] += _tons(record)

    rows = []
    for equipment_id in sorted(equipment_ids):
        for index, (day_hour, night_hour) in enumerate(zip(DAY_HOURS, NIGHT_HOURS), start=1):
            day = totals[(equipment_id, "DIA", day_hour)]
            night = totals[(equipment_id, "NOCHE", night_hour)]
            day_tonnes = int(day["tonnes"])
            night_tonnes = int(night["tonnes"])
            day_operator, _, _ = _top_distribution(day["operators"])
            night_operator, _, _ = _top_distribution(night["operators"])
            day_origin, _, _ = _top_distribution(day["origins"])
            night_origin, _, _ = _top_distribution(night["origins"])
            day_destination, _, _ = _top_distribution(day["destinations"])
            night_destination, _, _ = _top_distribution(night["destinations"])
            day_status = status_minutes.get((equipment_id, "DIA", day_hour), {})
            night_status = status_minutes.get((equipment_id, "NOCHE", night_hour), {})
            day_loading = day_status.get("n13_avg_min")
            night_loading = night_status.get("n13_avg_min")
            day_wait = day_status.get("n14_total_min")
            night_wait = night_status.get("n14_total_min")
            day_transport = day_status.get("n04_avg_min")
            night_transport = night_status.get("n04_avg_min")
            day_empty_return = day_status.get("n03_avg_min")
            night_empty_return = night_status.get("n03_avg_min")
            day_shovel_wait = day_status.get("n06_avg_min")
            night_shovel_wait = night_status.get("n06_avg_min")
            rows.append(
                {
                    "equipment_id": equipment_id,
                    "slot": index,
                    "label": f"H+{index}",
                    "dia_hour": f"{day_hour:02d}:00",
                    "noche_hour": f"{night_hour:02d}:00",
                    "dia_tonnes": day_tonnes,
                    "noche_tonnes": night_tonnes,
                    "difference_tonnes": day_tonnes - night_tonnes,
                    "dia_cycles": int(day["cycles"]),
                    "noche_cycles": int(night["cycles"]),
                    "dia_operator": None if day_operator == "Sin dato" else day_operator,
                    "noche_operator": None if night_operator == "Sin dato" else night_operator,
                    "dia_origin": None if day_origin == "Sin dato" else day_origin,
                    "noche_origin": None if night_origin == "Sin dato" else night_origin,
                    "dia_destination": None if day_destination == "Sin dato" else day_destination,
                    "noche_destination": None if night_destination == "Sin dato" else night_destination,
                    "dia_distance_km": _average(day["distances"]),
                    "noche_distance_km": _average(night["distances"]),
                    "dia_loaded_distance_km": _average(day["loaded_distances"]),
                    "noche_loaded_distance_km": _average(night["loaded_distances"]),
                    "dia_loading_time_min": day_loading if day_loading is not None else _average(day["loading_times"]),
                    "noche_loading_time_min": (
                        night_loading if night_loading is not None else _average(night["loading_times"])
                    ),
                    "dia_loading_time_source": (
                        "WENCO_N13" if day_loading is not None else "CYCLE_EXPLICIT" if day["loading_times"] else None
                    ),
                    "noche_loading_time_source": (
                        "WENCO_N13"
                        if night_loading is not None
                        else "CYCLE_EXPLICIT" if night["loading_times"] else None
                    ),
                    "dia_caex_wait_time_min": day_wait if day_wait is not None else _average(day["wait_times"]),
                    "noche_caex_wait_time_min": night_wait if night_wait is not None else _average(night["wait_times"]),
                    "dia_caex_wait_time_source": (
                        "WENCO_N14" if day_wait is not None else "CYCLE_EXPLICIT" if day["wait_times"] else None
                    ),
                    "noche_caex_wait_time_source": (
                        "WENCO_N14" if night_wait is not None else "CYCLE_EXPLICIT" if night["wait_times"] else None
                    ),
                    "dia_transport_time_min": day_transport,
                    "noche_transport_time_min": night_transport,
                    "dia_transport_time_source": "WENCO_N04" if day_transport is not None else None,
                    "noche_transport_time_source": "WENCO_N04" if night_transport is not None else None,
                    "dia_empty_return_time_min": day_empty_return,
                    "noche_empty_return_time_min": night_empty_return,
                    "dia_empty_return_time_source": "WENCO_N03" if day_empty_return is not None else None,
                    "noche_empty_return_time_source": "WENCO_N03" if night_empty_return is not None else None,
                    "dia_travel_cycle_time_min": day_status.get("travel_cycle_avg_min"),
                    "noche_travel_cycle_time_min": night_status.get("travel_cycle_avg_min"),
                    "dia_travel_cycle_time_source": (
                        "WENCO_N04_N03" if day_status.get("travel_cycle_avg_min") is not None else None
                    ),
                    "noche_travel_cycle_time_source": (
                        "WENCO_N04_N03" if night_status.get("travel_cycle_avg_min") is not None else None
                    ),
                    "dia_shovel_wait_time_min": day_shovel_wait,
                    "noche_shovel_wait_time_min": night_shovel_wait,
                    "dia_shovel_wait_time_source": "WENCO_N06" if day_shovel_wait is not None else None,
                    "noche_shovel_wait_time_source": "WENCO_N06" if night_shovel_wait is not None else None,
                    "dia_caex_cycle_time_min": day_status.get("caex_cycle_avg_min"),
                    "noche_caex_cycle_time_min": night_status.get("caex_cycle_avg_min"),
                    "dia_caex_cycle_time_source": day_status.get("caex_cycle_source"),
                    "noche_caex_cycle_time_source": night_status.get("caex_cycle_source"),
                    "dia_cycle_time_min": _average(day["cycle_times"]),
                    "noche_cycle_time_min": _average(night["cycle_times"]),
                    "dia_status_breakdown": day_status.get("status_breakdown", []),
                    "noche_status_breakdown": night_status.get("status_breakdown", []),
                    "dia_maintenance_code": day_status.get("maintenance_code"),
                    "noche_maintenance_code": night_status.get("maintenance_code"),
                    "dia_maintenance_desc": day_status.get("maintenance_desc"),
                    "noche_maintenance_desc": night_status.get("maintenance_desc"),
                    "dia_maintenance_minutes": day_status.get("maintenance_minutes"),
                    "noche_maintenance_minutes": night_status.get("maintenance_minutes"),
                    "leader": _leader(day_tonnes, night_tonnes),
                }
            )
    return rows


def build_shift_comparison_response(
    dataset: dict[str, Any] | None,
    *,
    demo_mode: bool,
    selected_date: str | None = None,
) -> dict[str, Any]:
    resolved_date = selected_date[:10] if selected_date else None
    if demo_mode:
        raise ValueError("Modo demo deshabilitado: comparativa de turnos solo acepta datos reales WENCO.")
    if dataset is None:
        raise ValueError("Dataset operacional requerido cuando NORTHMINE_DEMO_MODE=false")
    operational_context = (
        resolve_current_shift_context(dataset, fecha=resolved_date)
        if resolved_date
        else resolve_current_shift_context(dataset)
    )
    resolved_date = resolved_date or str(operational_context["fecha_operacional"])[:10]

    records = [
        item for item in dataset.get("cycles", [])
        if _record_shift_date(item) == resolved_date and _record_shift(item) in {"DIA", "NOCHE"}
    ]
    day = _shift_summary(records, "DIA")
    night = _shift_summary(records, "NOCHE")
    difference = int(day["total_tonnes"]) - int(night["total_tonnes"])
    warnings = []
    if not records:
        warnings.append("No existen ciclos WENCO para comparar turnos en la fecha seleccionada.")
    if dataset.get("stale"):
        warnings.append("Datos WENCO servidos desde cache: validar frescura antes de comparar turnos.")

    return {
        "status": "OK" if records else "NO_DATA",
        "api_version": SHIFT_COMPARISON_API_VERSION,
        "data_source": "REAL",
        "source_system": "WENCO",
        "source": dataset.get("source", "wenco-sql-live"),
        "selected_date": resolved_date,
        "operational_context": operational_context,
        "generated_at": _now_iso(),
        "stale": bool(dataset.get("stale")),
        "summary": {
            "dia": day,
            "noche": night,
            "difference_tonnes": difference,
            "leader": _leader(int(day["total_tonnes"]), int(night["total_tonnes"])),
        },
        "hourly": _hourly_rows(records),
        "loading_units": _equipment_rows(records, "carguio_id", "pala_modelo"),
        "loading_unit_hourly": _equipment_hourly_rows(records, "carguio_id", dataset, resolved_date),
        "caex": _complete_equipment_rows(
            records,
            dataset,
            "caex_id",
            "camion_modelo",
            include_status_inventory=not demo_mode,
        ),
        "caex_hourly": _equipment_hourly_rows(records, "caex_id", dataset, resolved_date),
        "warnings": warnings,
    }
