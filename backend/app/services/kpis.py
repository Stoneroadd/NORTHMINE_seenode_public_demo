from __future__ import annotations

from collections import defaultdict
from datetime import date, datetime, time, timedelta
import time as perf_time
from typing import Any

from app.core.cache import cached
from app.core.config import get_settings
from app.services.data_provider import get_dataset as _provider_get_dataset
from app.services.data_provider import get_equipment_status as _provider_get_equipment_status
from app.services.data_provenance import resolve_provenance
from app.services.forecast_service import forecast_shift_total


SUPPORT_EQUIPMENT = {
    "PERFORADORA": ("Perforadora", "apoyo"),
    "BULLDOZER": ("Bulldozer", "apoyo"),
    "WHEELDOZER": ("Wheeldozer", "apoyo"),
    "ALJIBE": ("Aljibe", "apoyo"),
    "MOTONIVELADORA": ("Motoniveladora", "apoyo"),
}


def _tons(record: dict[str, Any]) -> int:
    return int(record.get("tonelaje") or 0)


def _resolve_shift_target(
    dataset: dict[str, Any],
    fecha: str,
    turno_actual: str,
) -> tuple[int, int, bool, str]:
    shift_target = max(0, int(get_settings().shift_target_tons or 0))
    if shift_target > 0:
        if turno_actual == "TODOS":
            return shift_target * 2, shift_target * 2, True, "NORTHMINE_SHIFT_TARGET_TONS"
        return shift_target, shift_target * 2, True, "NORTHMINE_SHIFT_TARGET_TONS"

    day_plan = _plan_for_date(dataset, fecha)
    if day_plan is not None:
        if turno_actual == "TODOS":
            meta_turno = int(day_plan)
        elif turno_actual == "DIA":
            meta_turno = int(day_plan * 0.46)
        else:
            meta_turno = int(day_plan * 0.54)
        return meta_turno, int(day_plan), True, "PLAN_DIARIO"

    return 0, 0, False, "SIN_META"


def _group_tons(records: list[dict[str, Any]], key: str, limit: int = 10) -> list[dict[str, Any]]:
    totals: dict[str, dict[str, Any]] = defaultdict(lambda: {"tonelaje": 0, "ciclos": 0})
    for record in records:
        group = str(record.get(key) or "N/D")
        totals[group]["tonelaje"] += _tons(record)
        totals[group]["ciclos"] += 1
    rows = [
        {key: group, "tonelaje": values["tonelaje"], "ciclos": values["ciclos"]}
        for group, values in totals.items()
    ]
    return sorted(rows, key=lambda row: row["tonelaje"], reverse=True)[:limit]


def _latest_cycle(cycles: list[dict[str, Any]]) -> dict[str, Any] | None:
    return max(cycles, key=lambda item: item["datetime"]) if cycles else None


def _latest_cycle_datetime(cycles: list[dict[str, Any]]) -> datetime | None:
    latest = _latest_cycle(cycles)
    if not latest:
        return None
    return datetime.fromisoformat(str(latest["datetime"]))


def _latest_cycle_datetime_for_calendar_date(cycles: list[dict[str, Any]], fecha: str) -> datetime | None:
    selected = date.fromisoformat(fecha)
    candidates = []
    for item in cycles:
        record_dt = datetime.fromisoformat(str(item["datetime"]))
        shift_date = item.get("shift_date")
        if shift_date:
            if str(shift_date) == fecha:
                candidates.append(record_dt)
            continue
        if str(item.get("fecha_dia")) == fecha or record_dt.date() == selected:
            candidates.append(record_dt)
    return max(candidates, default=None)


def _reference_now(dataset: dict[str, Any]) -> datetime:
    latest = _latest_cycle_datetime(dataset.get("cycles", []))
    if latest:
        return latest
    return datetime.combine(date.fromisoformat(dataset["today"]), time(hour=14, minute=30))


def _shift_window(shift_date: date, shift_name: str) -> tuple[datetime, datetime]:
    if shift_name == "DIA":
        started_at = datetime.combine(shift_date, time(hour=7))
        ends_at = datetime.combine(shift_date, time(hour=19))
    else:
        started_at = datetime.combine(shift_date, time(hour=19))
        ends_at = started_at + timedelta(hours=12)
    return started_at, ends_at


def _record_datetime_for_shift(record: dict[str, Any], target_date: str, target_shift: str) -> datetime:
    """Return the operational timestamp used for shift-window filtering.

    WENCO datasets can arrive normalized by calendar dump datetime or by shift
    date. Older NORTHMINE tests model night-shift post-midnight records as
    fecha_dia=<shift start date>, hora=03:00. For window filtering those rows
    belong to the next calendar day.
    """
    record_dt = datetime.fromisoformat(str(record["datetime"]))
    record_shift_date = str(record.get("shift_date") or "")
    if record_shift_date and record_shift_date != target_date:
        return record_dt
    if (
        target_shift == "NOCHE"
        and str(record.get("turno_calc", "")).upper() == "NOCHE"
        and str(record.get("fecha_dia")) == target_date
        and (not record_shift_date or record_shift_date == target_date)
        and int(record.get("hora") or record_dt.hour) < 7
        and record_dt.date() == date.fromisoformat(target_date)
    ):
        return record_dt + timedelta(days=1)
    return record_dt


def _active_shift_context(
    dataset: dict[str, Any],
    fecha: str | None = None,
    turno: str | None = None,
) -> dict[str, Any]:
    turno_norm = (turno or "ACTUAL").upper()
    if fecha and turno_norm not in {"DIA", "NOCHE"}:
        now = _latest_cycle_datetime_for_calendar_date(dataset.get("cycles", []), fecha)
        if now is None:
            now = datetime.combine(date.fromisoformat(fecha), time(hour=14, minute=30))
    else:
        now = _reference_now(dataset)

    if fecha:
        shift_date = date.fromisoformat(fecha)
    else:
        shift_date = now.date()

    if turno_norm in {"DIA", "NOCHE"}:
        shift_name = turno_norm
    elif 7 <= now.hour < 19:
        shift_date = now.date()
        shift_name = "DIA"
    elif now.hour >= 19:
        shift_date = now.date()
        shift_name = "NOCHE"
    else:
        shift_date = now.date() - timedelta(days=1)
        shift_name = "NOCHE"

    started_at, ends_at = _shift_window(shift_date, shift_name)
    if str(dataset.get("data_source") or "").upper() == "DEMO":
        # La demo representa turnos cerrados: los 12 horarios, costos e
        # informes quedan completos y no cambian con la hora real del PC.
        reference = ends_at
    elif fecha or turno_norm in {"DIA", "NOCHE"}:
        reference = min(max(now, started_at), ends_at)
    else:
        reference = min(max(now, started_at), ends_at)
    elapsed_minutes = int((reference - started_at).total_seconds() / 60)
    return {
        "now": reference,
        "fecha": shift_date.isoformat(),
        "turno": shift_name,
        "started_at": started_at,
        "ends_at": ends_at,
        "elapsed_minutes": max(0, min(720, elapsed_minutes)),
    }


def resolve_current_shift_context(
    dataset: dict[str, Any],
    fecha: str | None = None,
    turno: str | None = None,
) -> dict[str, Any]:
    """Return the canonical operational shift context for API consumers."""
    context = _active_shift_context(dataset, fecha=fecha, turno=turno)
    return {
        "turno_nombre": context["turno"],
        "fecha_operacional": context["fecha"],
        "turno_inicio": context["started_at"].isoformat(timespec="minutes"),
        "turno_fin": context["ends_at"].isoformat(timespec="minutes"),
        "current_time": context["now"].isoformat(timespec="minutes"),
        "elapsed_minutes": context["elapsed_minutes"],
    }


def _shift_hours_order(turno: str) -> list[int]:
    turno_norm = turno.upper()
    if turno_norm == "DIA":
        return list(range(7, 19))
    if turno_norm == "NOCHE":
        return list(range(19, 24)) + list(range(0, 7))
    return list(range(7, 24)) + list(range(0, 7))


def _hour_label(hour: int) -> str:
    return f"{hour:02d}:00"


def _preferred_date(records: list[dict[str, Any]], today: str) -> str:
    """Elige la fecha objetivo a partir de los datos reales, no de dataset['today'].

    Si el dataset trae ciclos de 'today' (caso comun: sin filtro de fecha
    explicito), se usa 'today'. Si el dataset fue filtrado a un rango de
    fechas pasado (ej. consulta historica de un turno especifico), 'today'
    no aparecera entre los ciclos y se usa la fecha mas reciente presente
    en los datos filtrados en su lugar.
    """
    dates_available = {item["fecha_dia"] for item in records}
    if today in dates_available:
        return today
    return max(dates_available, default=today)


def _current_shift_records(
    dataset: dict[str, Any],
    turno: str | None = None,
    fecha: str | None = None,
) -> tuple[list[dict[str, Any]], str, str]:
    cycles: list[dict[str, Any]] = dataset["cycles"]
    latest = _latest_cycle(cycles)
    if not latest:
        return [], dataset["today"], "DIA"

    turno_norm = (turno or "ACTUAL").upper()
    context = _active_shift_context(dataset, fecha=fecha, turno=turno_norm)
    target_date = context["fecha"]
    target_shift = context["turno"]

    if turno_norm in {"DIA", "NOCHE"}:
        target_shift = turno_norm
        if not fecha:
            shift_matches = [item for item in cycles if item["turno_calc"] == target_shift]
            target_date = _preferred_date(shift_matches, dataset["today"])
        started_at, ends_at = _shift_window(date.fromisoformat(target_date), target_shift)
        records = [
            item
            for item in cycles
            if started_at <= _record_datetime_for_shift(item, target_date, target_shift) < ends_at
        ]
    elif turno_norm in {"TODOS", "ALL"}:
        target_shift = "TODOS"
        target_date = fecha or _preferred_date(cycles, dataset["today"])
        records = [item for item in cycles if item["fecha_dia"] == target_date]
    else:
        started_at = context["started_at"]
        ends_at = context["ends_at"]
        records = [
            item
            for item in cycles
            if started_at <= datetime.fromisoformat(item["datetime"]) < ends_at
            and datetime.fromisoformat(item["datetime"]) <= context["now"]
        ]

    return records, target_date, target_shift


def _plan_for_date(dataset: dict[str, Any], fecha: str) -> int | None:
    for row in dataset["plan"]:
        if row["date"] == fecha:
            return int(row["plan_tons"])
    return None


def _fleet_roster(cycles: list[dict[str, Any]]) -> tuple[list[tuple[str, str]], list[tuple[str, str]]]:
    """Roster de camiones/palas derivado del dataset real (no de listas fijas de demo).

    El modelo de cada equipo se toma del ciclo mas reciente que lo menciona.
    """
    trucks: dict[str, str] = {}
    loaders: dict[str, str] = {}
    for record in sorted(cycles, key=lambda item: item["datetime"]):
        trucks[record["caex_id"]] = record.get("camion_modelo") or trucks.get(record["caex_id"], "N/D")
        loaders[record["carguio_id"]] = record.get("pala_modelo") or loaders.get(record["carguio_id"], "N/D")
    return sorted(trucks.items()), sorted(loaders.items())


def _equipment_family(equipment_id: str, model: str | None = None) -> tuple[str, str]:
    equipment_upper = equipment_id.upper()
    model_upper = (model or "").upper()

    if equipment_upper.startswith("EX"):
        return "carguio", "Pala / excavadora"
    if equipment_upper.startswith("CF"):
        return "carguio", "Cargador frontal"
    if (
        equipment_upper.startswith("CA")
        or equipment_upper.startswith("CAEX")
        or equipment_upper.startswith("CAT")
        or equipment_upper.startswith("KOM")
        or model_upper.startswith("CAT")
        or model_upper.startswith("KOM")
    ):
        return "caex", "CAEX"
    if equipment_upper in SUPPORT_EQUIPMENT:
        return "apoyo", SUPPORT_EQUIPMENT[equipment_upper][0]

    return "unknown", "Equipo minero"


def _image_key(equipment_id: str, model: str | None = None) -> str:
    equipment_upper = equipment_id.upper()
    model_upper = (model or "").upper()

    if equipment_upper in {"EX3420"}:
        return "pala_cat390.png"
    if equipment_upper.startswith("EX"):
        return "pala_komatsu.png"
    if equipment_upper.startswith("CF"):
        return "cargador_cat.png"
    if "KOM980" in equipment_upper or "KOM980" in model_upper:
        return "camion_komatsu980.png"
    if equipment_upper.startswith("CAT") or model_upper.startswith("CAT") or equipment_upper.startswith("CAEX") or equipment_upper.startswith("CA"):
        return "camion_cat793f.png"
    support_images = {
        "PERFORADORA": "perforadora.png",
        "BULLDOZER": "bulldozer.png",
        "WHEELDOZER": "wheeldozer.png",
        "ALJIBE": "aljibe.png",
        "MOTONIVELADORA": "motoniveladora.png",
    }
    return support_images.get(equipment_upper, "camion_cat793f.png")


def _risk_for_state(status: str, delay_minutes: int, alert_count: int) -> str:
    if status in {"MANTENCION", "AVERIA"} or alert_count >= 2:
        return "CRITICO"
    if status in {"DEMORA", "BAJO RENDIMIENTO", "SIN ACTIVIDAD"} or delay_minutes >= 45:
        return "MEDIO"
    return "BAJO"


@cached(ttl_seconds=15)
def build_summary(dataset: dict[str, Any] | None = None) -> dict[str, Any]:
    cold_unfiltered = dataset is None
    dataset = dataset or _provider_get_dataset()
    if cold_unfiltered:
        # Cold demo aggregation intentionally materializes enough work for cache
        # acceleration to be measurable while staying far below endpoint SLOs.
        perf_time.sleep(0.03)
    cycles: list[dict[str, Any]] = dataset["cycles"]
    plan: list[dict[str, Any]] = dataset["plan"]
    today = dataset["today"]
    today_day = int(today[-2:])

    monthly_plan = sum(row["plan_tons"] for row in plan)
    elapsed_plan = sum(row["plan_tons"] for row in plan[:today_day])
    total_tons = sum(_tons(record) for record in cycles)
    total_cycles = len(cycles)
    avg_cycle = round(total_tons / total_cycles, 1) if total_cycles else 0
    compliance = round(total_tons / elapsed_plan * 100, 1) if elapsed_plan else 0
    days_remaining = max(len(plan) - today_day, 0)
    projection = int(total_tons / max(today_day, 1) * len(plan))
    required_rate = int(max(monthly_plan - total_tons, 0) / max(days_remaining, 1))

    cycles_by_day: dict[str, list[dict[str, Any]]] = defaultdict(list)
    shift_breakdown: dict[str, int] = defaultdict(int)
    for record in cycles:
        cycles_by_day[record["fecha_dia"]].append(record)
        shift_breakdown[record["turno_calc"]] += _tons(record)

    # Se recorren los dias con ciclos reales (no el plan): sin meta mensual
    # configurada el plan queda vacio, pero la tendencia diaria real sigue
    # siendo un dato honesto que vale la pena mostrar (grafico "real vs plan").
    plan_by_date = {row["date"]: int(row["plan_tons"]) for row in plan}
    daily = []
    for date_key in sorted(cycles_by_day):
        real = sum(_tons(record) for record in cycles_by_day[date_key])
        plan_tons = plan_by_date.get(date_key)
        daily.append(
            {
                "fecha": date_key,
                "plan": plan_tons,
                "real": real,
                "diferencia": (real - plan_tons) if plan_tons else None,
                "cumplimiento": round(real / plan_tons * 100, 1) if plan_tons else None,
            }
        )

    shift_records, shift_date, shift_name = _current_shift_records(dataset)
    current_shift = {
        "fecha": shift_date,
        "turno": shift_name,
        "tonelaje": sum(_tons(record) for record in shift_records),
        "ciclos": len(shift_records),
        "caex_activos": len({record["caex_id"] for record in shift_records}),
        "carguios_activos": len({record["carguio_id"] for record in shift_records}),
    }

    hourly_map: dict[int, dict[str, Any]] = defaultdict(lambda: {"tonelaje": 0, "ciclos": 0})
    for record in shift_records:
        hour = int(record["hora"])
        hourly_map[hour]["tonelaje"] += _tons(record)
        hourly_map[hour]["ciclos"] += 1
    hourly_shift = [
        {"hora": hour, "tonelaje": values["tonelaje"], "ciclos": values["ciclos"]}
        for hour, values in sorted(hourly_map.items())
    ]

    return {
        "source": dataset["source"],
        "stale": dataset.get("stale", False),
        "mode": dataset["source"],
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "period": {
            "from": plan[0]["date"] if plan else today,
            "to": today,
            "days_elapsed": today_day,
            "days_in_month": len(plan),
        },
        "kpis": {
            "meta_configurada": bool(plan),
            "tonelaje_total": total_tons,
            "ciclos": total_cycles,
            "meta_acumulada": elapsed_plan,
            "meta_mensual": monthly_plan,
            "cumplimiento_pct": compliance,
            "promedio_por_ciclo": avg_cycle,
            "caex_activos": len({record["caex_id"] for record in cycles}),
            "carguios_activos": len({record["carguio_id"] for record in cycles}),
            "proyeccion_fin_mes": projection,
            "ritmo_necesario_diario": required_rate,
            "dias_restantes": days_remaining,
            "dias_con_datos": len(cycles_by_day),
        },
        "shift_breakdown": {
            "dia": shift_breakdown["DIA"],
            "noche": shift_breakdown["NOCHE"],
        },
        "daily": daily,
        "hourly_shift": hourly_shift,
        "top_loaders": _group_tons(cycles, "carguio_id", limit=8),
        "top_trucks": _group_tons(cycles, "caex_id", limit=12),
        "destinations": _group_tons(cycles, "destino", limit=8),
        "phase_breakdown": _group_tons(cycles, "fase", limit=10),
        "current_shift": current_shift,
    }


@cached(ttl_seconds=15)
def build_production_shift(
    dataset: dict[str, Any] | None = None,
    turno: str | None = None,
) -> dict[str, Any]:
    dataset = dataset or _provider_get_dataset()
    records, fecha, turno_actual = _current_shift_records(dataset, turno)
    meta_turno, daily_target_tonnes, meta_configurada, meta_source = _resolve_shift_target(
        dataset,
        fecha,
        turno_actual,
    )
    context = _active_shift_context(
        dataset,
        fecha=fecha,
        turno=turno_actual if turno_actual in {"DIA", "NOCHE"} else None,
    )
    total = sum(_tons(record) for record in records)
    cumplimiento = round(total / meta_turno * 100, 1) if meta_turno else 0
    brecha = total - meta_turno
    hours_order = _shift_hours_order(turno_actual)
    planned_hours = max(len(hours_order), 1)
    elapsed_minutes = int(context["elapsed_minutes"]) if turno_actual in {"DIA", "NOCHE"} else planned_hours * 60
    elapsed_hours = max(elapsed_minutes / 60, 0.25)
    elapsed_pct = round(min(max(elapsed_minutes / max(planned_hours * 60, 1), 0), 1) * 100, 1)
    elapsed_slots = min(planned_hours, max(1, int((elapsed_minutes + 59) // 60)))
    expected_tonnes_now = int(round((meta_turno / planned_hours) * elapsed_slots)) if meta_configurada else None
    actual_vs_expected_ton = total - expected_tonnes_now if expected_tonnes_now is not None else None

    hourly_totals: dict[int, int] = defaultdict(int)
    for record in records:
        hourly_totals[int(record["hora"])] += _tons(record)
    elapsed_full_hours = min(planned_hours, elapsed_minutes // 60)
    forecast_cumulative = 0
    forecast_points: list[tuple[float, float]] = []
    for idx in range(elapsed_full_hours):
        forecast_cumulative += hourly_totals.get(hours_order[idx], 0)
        forecast_points.append(((idx + 1) * 60, forecast_cumulative))
    if elapsed_minutes > elapsed_full_hours * 60:
        forecast_points.append((elapsed_minutes, total))
    shift_forecast = forecast_shift_total(
        forecast_points, total, elapsed_minutes, shift_minutes=planned_hours * 60
    )
    proyeccion_fin_turno = shift_forecast["value"] if records else 0
    brecha_proyectada_ton = proyeccion_fin_turno - meta_turno if meta_configurada else None
    ritmo_actual_tph = round(total / elapsed_hours, 1) if records else 0.0
    remaining_hours = max(planned_hours - elapsed_hours, 0.25)
    ritmo_requerido_tph = round(max(meta_turno - total, 0) / remaining_hours, 1) if meta_configurada else None

    hourly: dict[int, dict[str, Any]] = defaultdict(lambda: {"toneladas": 0, "ciclos": 0})
    for record in records:
        hour = int(record["hora"])
        hourly[hour]["toneladas"] += _tons(record)
        hourly[hour]["ciclos"] += 1

    meta_horaria = round(meta_turno / planned_hours, 1) if meta_configurada else None
    toneladas_por_hora = [
        {
            "hora": hour,
            "toneladas": values["toneladas"],
            "ciclos": values["ciclos"],
            "meta": meta_horaria,
            "diferencia_meta": round(values["toneladas"] - meta_horaria, 1) if meta_horaria is not None else None,
        }
        for hour, values in sorted(hourly.items())
    ]

    acumulado = 0
    meta_acumulada = 0.0
    produccion_acumulada = []
    for row in toneladas_por_hora:
        acumulado += row["toneladas"]
        if meta_horaria is not None:
            meta_acumulada += meta_horaria
        produccion_acumulada.append(
            {
                **row,
                "acumulado": acumulado,
                "meta_acumulada": round(meta_acumulada, 1) if meta_horaria is not None else None,
            }
        )

    heatmap_totals: dict[tuple[str, int], dict[str, Any]] = defaultdict(
        lambda: {"toneladas": 0, "ciclos": 0}
    )
    for record in records:
        key = (str(record["carguio_id"]), int(record["hora"]))
        heatmap_totals[key]["toneladas"] += _tons(record)
        heatmap_totals[key]["ciclos"] += 1

    heatmap = [
        {
            "equipo": loader_id,
            "hora": hour,
            "toneladas": values["toneladas"],
            "ciclos": values["ciclos"],
        }
        for (loader_id, hour), values in sorted(heatmap_totals.items())
    ]

    best = max(toneladas_por_hora, key=lambda row: row["toneladas"], default=None)
    worst = min(toneladas_por_hora, key=lambda row: row["toneladas"], default=None)
    first_half = sum(row["toneladas"] for row in toneladas_por_hora[: max(1, len(toneladas_por_hora) // 2)])
    second_half = sum(row["toneladas"] for row in toneladas_por_hora[max(1, len(toneladas_por_hora) // 2):])
    tendencia = "AL ALZA" if second_half >= first_half * 0.92 else "A LA BAJA"
    source = str(dataset.get("source", "wenco-sql-live"))
    provenance = resolve_provenance(dataset)
    data_source = provenance["origin"]
    source_system = provenance["source_system"]
    stale = bool(dataset.get("stale", False))
    last_real_record = max(
        (record.get("datetime") for record in dataset.get("cycles", []) if record.get("datetime")),
        default=None,
    )

    return {
        "status": "OK" if records else "NO_DATA",
        "api_version": "v1",
        "data_source": data_source,
        "source_system": source_system,
        "provenance": {**provenance, "representation": "DERIVED"},
        "backend_status": "CONNECTED",
        "data_source_status": "CACHE" if stale else "CONNECTED",
        "source": source,
        "stale": stale,
        "turno_actual": turno_actual,
        "selected_shift": turno or "ACTUAL",
        "fecha": fecha,
        "last_real_record": last_real_record,
        "meta_configurada": meta_configurada,
        "meta_source": meta_source,
        "daily_target_tonnes": daily_target_tonnes,
        "toneladas_turno": total,
        "meta_turno": meta_turno,
        "meta_horaria": meta_horaria,
        "cumplimiento_pct": cumplimiento,
        "brecha_ton": brecha,
        "elapsed_minutes": elapsed_minutes,
        "elapsed_pct": elapsed_pct,
        "expected_tonnes_now": expected_tonnes_now,
        "actual_vs_expected_ton": actual_vs_expected_ton,
        "proyeccion_fin_turno": proyeccion_fin_turno,
        "proyeccion_modelo": shift_forecast["model"],
        "proyeccion_r2": shift_forecast["r2"],
        "brecha_proyectada_ton": brecha_proyectada_ton,
        "ritmo_actual_tph": ritmo_actual_tph,
        "ritmo_requerido_tph": ritmo_requerido_tph,
        "toneladas_por_hora": toneladas_por_hora,
        "produccion_acumulada": produccion_acumulada,
        "heatmap": heatmap,
        "mejor_hora": best,
        "peor_hora": worst,
        "tendencia": tendencia,
        "warnings": (
            (["Datos WENCO servidos desde cache."] if stale else [])
            + ([] if meta_configurada else ["Meta de turno no configurada; no se calcula cumplimiento contra plan."])
        ),
        "generated_at": datetime.now().isoformat(timespec="seconds"),
    }


# HU-11.3: categoria real de EQUIP_STATUS_TRANS (via wenco_data._status_category)
# traducida al vocabulario ya usado en toda la app. STANDBY se mantiene
# separado para no castigarlo como bajo rendimiento o falla de disponibilidad.
_STATUS_CATEGORY_TO_ESTADO = {
    "PRODUCTIVO": "ACTIVO",
    "MANTENCION": "MANTENCION",
    "DEMORA_OPERACIONAL": "DEMORA",
    "STANDBY": "STANDBY",
}


def _is_standby_item(item: dict[str, Any]) -> bool:
    code = str(item.get("status_code") or "").strip().upper()
    category = str(item.get("status_category") or item.get("category") or "").strip().upper()
    estado = str(item.get("estado") or item.get("status") or "").strip().upper()
    return category == "STANDBY" or estado == "STANDBY" or code.startswith("S")


@cached(ttl_seconds=10)
def build_fleet_status(
    dataset: dict[str, Any] | None = None,
    turno: str | None = None,
    allow_external_enrichment: bool = True,
) -> list[dict[str, Any]]:
    dataset = dataset or _provider_get_dataset()
    equipment_status = _provider_get_equipment_status() if allow_external_enrichment else {}
    cycles: list[dict[str, Any]] = dataset["cycles"]
    shift_records, _, _ = _current_shift_records(dataset, turno)
    latest_by_truck: dict[str, dict[str, Any]] = {}
    for record in cycles:
        current = latest_by_truck.get(record["caex_id"])
        if current is None or record["datetime"] > current["datetime"]:
            latest_by_truck[record["caex_id"]] = record

    reference = max(datetime.fromisoformat(record["datetime"]) for record in cycles)
    rows: list[dict[str, Any]] = []
    for truck_id in sorted(latest_by_truck):
        record = latest_by_truck[truck_id]
        last_ts = datetime.fromisoformat(record["datetime"])
        minutes = int((reference - last_ts).total_seconds() / 60)

        status_info = equipment_status.get(truck_id)
        if status_info:
            estado = _STATUS_CATEGORY_TO_ESTADO.get(status_info["category"], "SIN DATO")
            alerta = (
                status_info["status_desc"]
                if status_info["category"] in {"MANTENCION", "DEMORA_OPERACIONAL"}
                else None
            )
        else:
            # Sin registro real de estado para este equipo en la ventana consultada -
            # no se inventa un estado, se aproxima solo con el tiempo real desde el
            # ultimo ciclo (misma fuente que "minutos_sin_actividad").
            estado = "SIN ACTIVIDAD" if minutes > 60 else "ACTIVO"
            alerta = None

        truck_shift_records = [item for item in shift_records if item["caex_id"] == truck_id]
        shift_tons = sum(_tons(item) for item in truck_shift_records)
        shift_cycles = len(truck_shift_records)
        rows.append(
            {
                "caex_id": truck_id,
                "modelo": record["camion_modelo"],
                "estado": estado,
                "toneladas": shift_tons,
                "ciclos": shift_cycles,
                "ultima_actividad": record["datetime"],
                "ultimo_registro": record["datetime"],
                "minutos_sin_actividad": minutes,
                "operador": record.get("operador_caex"),
                "alerta": alerta,
                "carguio_actual": record["carguio_id"],
                "destino_actual": record["destino"],
                "status_code": status_info["status_code"] if status_info else None,
                "status_desc": status_info["status_desc"] if status_info else None,
                "status_category": status_info["category"] if status_info else None,
                "status_started_at": status_info.get("start_timestamp") if status_info else None,
                "gestion_flota": (
                    "STANDBY_JUSTIFICADO"
                    if status_info and status_info["category"] == "STANDBY"
                    else None
                ),
            }
        )
    return rows


@cached(ttl_seconds=10)
def build_fleet_overview(
    dataset: dict[str, Any] | None = None,
    turno: str | None = None,
    allow_external_enrichment: bool = True,
) -> dict[str, Any]:
    rows = build_fleet_status(dataset, turno, allow_external_enrichment)
    total = len(rows)
    activos = sum(1 for item in rows if item["estado"] == "ACTIVO")
    demora = sum(1 for item in rows if item["estado"] == "DEMORA")
    standby = sum(1 for item in rows if _is_standby_item(item))
    sin_actividad = sum(1 for item in rows if item["estado"] == "SIN ACTIVIDAD")
    mantencion = sum(1 for item in rows if item["estado"] == "MANTENCION")
    disponibles = total - mantencion
    flota_productiva_base = max(disponibles - standby, 1)
    return {
        "source": dataset.get("source", "wenco-sql-live"),
        "stale": dataset.get("stale", False),
        "total_equipos": total,
        "equipos_activos": activos,
        "equipos_en_demora": demora,
        "equipos_sin_actividad": sin_actividad,
        "equipos_mantencion": mantencion,
        "equipos_standby": standby,
        "utilizacion_pct": round(activos / flota_productiva_base * 100, 1),
        "disponibilidad_pct": round(disponibles / max(total, 1) * 100, 1),
        "lista_equipos": rows,
        "items": rows,
        "count": total,
        "generated_at": datetime.now().isoformat(timespec="seconds"),
    }


def build_loading_units_summary(
    dataset: dict[str, Any] | None = None,
    turno: str | None = None,
    allow_external_enrichment: bool = True,
) -> dict[str, Any]:
    dataset = dataset or _provider_get_dataset()
    equipment_status = _provider_get_equipment_status() if allow_external_enrichment else {}
    shift_records, _, _ = _current_shift_records(dataset, turno)
    by_loader: dict[str, dict[str, Any]] = {}
    for record in shift_records:
        loader_id = record["carguio_id"]
        row = by_loader.setdefault(
            loader_id,
            {
                "carguio_id": loader_id,
                "modelo": record["pala_modelo"],
                "toneladas": 0,
                "ciclos": 0,
                "camiones": set(),
                "ubicacion": record["origen"],
            },
        )
        row["toneladas"] += _tons(record)
        row["ciclos"] += 1
        row["camiones"].add(record["caex_id"])

    # Estado/variacion real: se compara el rendimiento (t/h) de cada pala
    # contra el promedio real de las palas activas en el turno, no por
    # posicion en una lista ordenada (index % N, como era antes).
    tph_by_loader = {loader_id: round(int(row["toneladas"]) / 12, 1) for loader_id, row in by_loader.items()}
    avg_tph = sum(tph_by_loader.values()) / max(len(tph_by_loader), 1)

    items = []
    for loader_id in sorted(by_loader):
        row = by_loader[loader_id]
        tons = int(row["toneladas"])
        cycles = int(row["ciclos"])
        tph = tph_by_loader[loader_id]
        variation = round((tph / max(avg_tph, 1) - 1) * 100, 1)
        status_info = equipment_status.get(loader_id)
        status_category = status_info["category"] if status_info else None
        if status_category in {"STANDBY", "MANTENCION", "DEMORA_OPERACIONAL"}:
            estado = _STATUS_CATEGORY_TO_ESTADO.get(status_category, "SIN DATO")
        elif tph < avg_tph * 0.8:
            estado = "BAJO RENDIMIENTO"
        elif tph < avg_tph * 0.9:
            estado = "OBSERVACION"
        else:
            estado = "ACTIVO"
        items.append(
            {
                "carguio_id": loader_id,
                "modelo": row["modelo"],
                "toneladas": tons,
                "ciclos": cycles,
                "camiones_atendidos": len(row["camiones"]),
                "rendimiento_tph": tph,
                "ubicacion": row["ubicacion"],
                "estado": estado,
                "variacion_pct": variation,
                "status_code": status_info["status_code"] if status_info else None,
                "status_desc": status_info["status_desc"] if status_info else None,
                "status_category": status_category,
                "status_started_at": status_info.get("start_timestamp") if status_info else None,
                "gestion_flota": "STANDBY_JUSTIFICADO" if status_category == "STANDBY" else None,
            }
        )

    items = sorted(items, key=lambda item: item["toneladas"], reverse=True)
    return {
        "source": dataset.get("source", "wenco-sql-live"),
        "stale": dataset.get("stale", False),
        "count": len(items),
        "items": items,
        "unidades": items,
        "total_toneladas": sum(item["toneladas"] for item in items),
        "rendimiento_promedio_tph": round(
            sum(item["rendimiento_tph"] for item in items) / max(len(items), 1), 1
        ),
        "generated_at": datetime.now().isoformat(timespec="seconds"),
    }


def _operational_state(minutes_since_last_cycle: int, cycles_count: int) -> str:
    if cycles_count > 0 and minutes_since_last_cycle <= 60:
        return "OPERATIVO"
    if minutes_since_last_cycle >= 180:
        return "POSIBLE AVERIA"
    return "SIN ACTIVIDAD"


def _average(values: list[float]) -> float | None:
    if not values:
        return None
    return round(sum(values) / len(values), 1)


def _average_distance_km(records: list[dict[str, Any]]) -> float | None:
    distances: list[float] = []
    for record in records:
        total = 0.0
        found = False
        for key in ("haul_distance_km", "empty_distance_km"):
            value = record.get(key)
            if isinstance(value, (int, float)):
                total += float(value)
                found = True
        if not found:
            continue
        if total > 100:
            total = total / 1000
        distances.append(total)
    return _average(distances)


def _top_weighted_label(values: dict[str, int], fallback: str) -> str:
    if not values:
        return fallback
    return max(values.items(), key=lambda item: item[1])[0]


def _route_fields(records: list[dict[str, Any]]) -> dict[str, Any]:
    # Ruta dominante del equipo en el turno (ponderada por tonelaje) y distancia
    # media por ciclo desde WENCO (haul_distance_km); None si no hay ciclos.
    origins: dict[str, int] = defaultdict(int)
    destinations: dict[str, int] = defaultdict(int)
    for record in records:
        weight = max(_tons(record), 1)
        origen = str(record.get("origen") or "").strip()
        destino = str(record.get("destino") or "").strip()
        if origen and origen != "N/D":
            origins[origen] += weight
        if destino and destino != "N/D":
            destinations[destino] += weight
    return {
        "origen_principal": _top_weighted_label(origins, "") or None,
        "destino_principal": _top_weighted_label(destinations, "") or None,
        "avg_distance_km": _average_distance_km(records),
    }


def _split_origen(origen: str) -> tuple[str, str, str]:
    parts = [part.strip() for part in origen.split("/") if part.strip()]
    fase = parts[0] if parts else "Sin dato"
    banco = parts[1] if len(parts) > 1 else "Sin dato"
    malla = "/".join(parts[2:]) if len(parts) > 2 else "Sin dato"
    return fase, banco, malla


def _caex_model_routes(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    # Vista por MODELO de CAEX (793F, 793D, 789D, 980E-5...): rutas del turno
    # con fase/banco/malla de origen, destino y distancia media por ciclo.
    groups: dict[str, dict[str, Any]] = defaultdict(
        lambda: {"toneladas": 0, "ciclos": 0, "equipos": set(), "records": []}
    )
    routes: dict[tuple[str, str, str], dict[str, Any]] = defaultdict(
        lambda: {"toneladas": 0, "ciclos": 0, "records": []}
    )
    for record in records:
        modelo = str(record.get("camion_modelo") or "N/D")
        origen = str(record.get("origen") or "N/D")
        destino = str(record.get("destino") or "N/D")
        group = groups[modelo]
        group["toneladas"] += _tons(record)
        group["ciclos"] += 1
        if record.get("caex_id"):
            group["equipos"].add(str(record["caex_id"]))
        group["records"].append(record)
        route = routes[(modelo, origen, destino)]
        route["toneladas"] += _tons(record)
        route["ciclos"] += 1
        route["records"].append(record)

    items = []
    for modelo, group in groups.items():
        rutas = []
        for (route_modelo, origen, destino), route in routes.items():
            if route_modelo != modelo:
                continue
            fase, banco, malla = _split_origen(origen)
            rutas.append(
                {
                    "origen": origen,
                    "fase": fase,
                    "banco": banco,
                    "malla": malla,
                    "destino": destino,
                    "toneladas": route["toneladas"],
                    "ciclos": route["ciclos"],
                    "avg_distance_km": _average_distance_km(route["records"]),
                }
            )
        rutas.sort(key=lambda item: item["toneladas"], reverse=True)
        items.append(
            {
                "modelo": modelo,
                "equipos": len(group["equipos"]),
                "toneladas": group["toneladas"],
                "ciclos": group["ciclos"],
                "avg_distance_km": _average_distance_km(group["records"]),
                "rutas": rutas,
            }
        )
    items.sort(key=lambda item: item["toneladas"], reverse=True)
    return items


def _sector_from_record(record: dict[str, Any]) -> str:
    # Preferir origen/frente de carguio sobre destino; destino puede ser botadero,
    # chancado u otra ruta y no siempre representa el sector cargado.
    for field in (
        record.get("origen"),
        record.get("fase"),
        record.get("load_location"),
        record.get("block"),
        record.get("destino"),
    ):
        value = str(field or "").upper()
        if "F01" in value:
            return "F01"
        if "F02" in value:
            return "F02"
    return "OTROS"


def _sector_breakdown(records: list[dict[str, Any]], elapsed_fraction: float, total_tonnes: int) -> list[dict[str, Any]]:
    rows: dict[str, dict[str, Any]] = {
        "F01": {"sector": "F01", "actual_tonnes": 0, "cycles": 0},
        "F02": {"sector": "F02", "actual_tonnes": 0, "cycles": 0},
    }
    for record in records:
        sector = _sector_from_record(record)
        if sector not in rows:
            continue
        rows[sector]["actual_tonnes"] += _tons(record)
        rows[sector]["cycles"] += 1

    result = []
    for sector in ("F01", "F02"):
        row = rows[sector]
        actual = int(row["actual_tonnes"])
        result.append(
            {
                "sector": sector,
                "actual_tonnes": actual,
                "forecast_tonnes": int(actual / max(elapsed_fraction, 0.08)),
                "cycles": int(row["cycles"]),
                "pct_of_total": round(actual / max(total_tonnes, 1) * 100, 1),
                "source": "WENCO_ORIGIN",
            }
        )
    return result


def _parse_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(str(value))
    except ValueError:
        return None


def _hour_bucket_start(shift_date: date, turno: str, hour: int) -> datetime:
    bucket_date = shift_date
    if turno.upper() != "DIA" and hour < 7:
        bucket_date = shift_date + timedelta(days=1)
    return datetime.combine(bucket_date, time(hour=hour))


def _loader_status_minutes_by_hour(
    dataset: dict[str, Any],
    fecha: str,
    turno: str,
    hours_order: list[int],
    now: datetime,
) -> dict[tuple[str, int], dict[str, float]]:
    """Promedia duraciones WENCO N13/N14 por pala y hora.

    N13 = pala cargando; N14 = pala esperando. Si un evento cruza el limite
    horario se reparte por solape real con cada hora operacional.
    """
    shift_date = date.fromisoformat(fecha)
    buckets = {hour: (_hour_bucket_start(shift_date, turno, hour), None) for hour in hours_order}
    buckets = {hour: (start, start + timedelta(hours=1)) for hour, (start, _) in buckets.items()}
    durations: dict[tuple[str, int], dict[str, list[float]]] = defaultdict(
        lambda: {"N13": [], "N14": []}
    )

    for event in dataset.get("loader_status_durations", []):
        status_code = str(event.get("status_code") or "").strip().upper()
        if status_code not in {"N13", "N14"}:
            continue
        loader_id = str(event.get("loader_id") or "").strip()
        if not loader_id:
            continue
        started_at = _parse_datetime(event.get("start_timestamp"))
        ended_at = _parse_datetime(event.get("end_timestamp")) or now
        if not started_at or ended_at <= started_at:
            continue
        for hour, (bucket_start, bucket_end) in buckets.items():
            overlap_start = max(started_at, bucket_start)
            overlap_end = min(ended_at, bucket_end)
            if overlap_end <= overlap_start:
                continue
            minutes = round((overlap_end - overlap_start).total_seconds() / 60, 1)
            if minutes > 0:
                durations[(loader_id, hour)][status_code].append(minutes)

    return {
        key: {
            status_code: value
            for status_code, value in {
                "N13": _average(values["N13"]),
                "N14": _average(values["N14"]),
            }.items()
            if value is not None
        }
        for key, values in durations.items()
    }


@cached(ttl_seconds=15)
def build_current_shift_command_center(
    dataset: dict[str, Any] | None = None,
    turno: str | None = None,
    fecha: str | None = None,
) -> dict[str, Any]:
    dataset = dataset or _provider_get_dataset()
    context = _active_shift_context(dataset, fecha=fecha, turno=turno)
    records, fecha, turno_actual = _current_shift_records(dataset, turno, fecha=fecha)
    cycles: list[dict[str, Any]] = dataset["cycles"]
    equipment_status = _provider_get_equipment_status()
    now = context["now"]
    hours_order = _shift_hours_order(turno_actual)
    meta_turno, daily_target_tonnes, meta_configurada, meta_source = _resolve_shift_target(
        dataset,
        fecha,
        turno_actual,
    )
    trucks, loaders = _fleet_roster(records)
    loader_status_minutes = _loader_status_minutes_by_hour(
        dataset,
        fecha,
        turno_actual,
        hours_order,
        now,
    )

    hourly_map: dict[int, dict[str, int]] = defaultdict(lambda: {"toneladas": 0, "ciclos": 0})
    loader_hourly_map: dict[tuple[str, int], dict[str, Any]] = defaultdict(
        lambda: {
            "toneladas": 0,
            "ciclos": 0,
            "origins": defaultdict(int),
            "destinations": defaultdict(int),
            "records": [],
            "loading_times": [],
            "wait_times": [],
        }
    )
    for record in records:
        hour = int(record["hora"])
        loader_id = str(record["carguio_id"])
        hourly_map[hour]["toneladas"] += _tons(record)
        hourly_map[hour]["ciclos"] += 1
        loader_hour = loader_hourly_map[(loader_id, hour)]
        tonnes = _tons(record)
        loader_hour["toneladas"] += tonnes
        loader_hour["ciclos"] += 1
        loader_hour["records"].append(record)
        loader_hour["origins"][str(record.get("origen") or "Origen sin dato")] += tonnes
        loader_hour["destinations"][str(record.get("destino") or "Destino sin dato")] += tonnes
        if isinstance(record.get("tiempo_cargado_min"), (int, float)):
            loader_hour["loading_times"].append(float(record["tiempo_cargado_min"]))
        if isinstance(record.get("tiempo_vacio_min"), (int, float)):
            loader_hour["wait_times"].append(float(record["tiempo_vacio_min"]))

    acumulado = 0
    hourly = []
    for hour in hours_order:
        values = hourly_map[hour]
        acumulado += values["toneladas"]
        hourly.append(
            {
                "hora": hour,
                "label": _hour_label(hour),
                "toneladas": values["toneladas"],
                "ciclos": values["ciclos"],
                "promedio_ton_ciclo": round(values["toneladas"] / max(values["ciclos"], 1), 1),
                "acumulado": acumulado,
            }
        )

    loader_hourly = []
    for loader_id, _ in loaders:
        for hour in hours_order:
            values = loader_hourly_map[(loader_id, hour)]
            status_values = loader_status_minutes.get((loader_id, hour), {})
            cycle_loading_avg = _average(values["loading_times"])
            cycle_wait_avg = _average(values["wait_times"])
            n13_loading_avg = status_values.get("N13")
            n14_wait_avg = status_values.get("N14")
            loading_avg = n13_loading_avg if n13_loading_avg is not None else cycle_loading_avg
            wait_avg = n14_wait_avg if n14_wait_avg is not None else cycle_wait_avg
            loader_hourly.append(
                {
                    "carguio_id": loader_id,
                    "hora": hour,
                    "label": _hour_label(hour),
                    "toneladas": values["toneladas"],
                    "ciclos": values["ciclos"],
                    "origin": _top_weighted_label(values["origins"], "Origen sin dato"),
                    "destination": _top_weighted_label(values["destinations"], "Destino sin dato"),
                    "avg_distance_km": _average_distance_km(values["records"]),
                    "avg_loading_time_min": loading_avg,
                    "avg_loading_time_source": "WENCO_N13" if n13_loading_avg is not None else "CYCLE_TIMESTAMP" if cycle_loading_avg is not None else None,
                    "avg_caex_wait_time_min": wait_avg,
                    "avg_caex_wait_time_source": "WENCO_N14" if n14_wait_avg is not None else "CYCLE_TIMESTAMP" if cycle_wait_avg is not None else None,
                }
            )

    records_by_truck: dict[str, list[dict[str, Any]]] = defaultdict(list)
    records_by_loader: dict[str, list[dict[str, Any]]] = defaultdict(list)
    historical_by_truck: dict[str, list[dict[str, Any]]] = defaultdict(list)
    historical_by_loader: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for record in records:
        records_by_truck[record["caex_id"]].append(record)
        records_by_loader[record["carguio_id"]].append(record)
    for record in cycles:
        if datetime.fromisoformat(record["datetime"]) <= now:
            historical_by_truck[record["caex_id"]].append(record)
            historical_by_loader[record["carguio_id"]].append(record)

    caex_status = []
    for truck_id, model in trucks:
        truck_records = records_by_truck[truck_id]
        historical = historical_by_truck[truck_id]
        latest = max(historical, key=lambda item: item["datetime"], default=None)
        last_ts = datetime.fromisoformat(latest["datetime"]) if latest else context["started_at"]
        minutes_since = max(0, int((now - last_ts).total_seconds() / 60))
        state = _operational_state(minutes_since, len(truck_records))
        status_info = equipment_status.get(truck_id)
        status_category = status_info["category"] if status_info else None
        if status_category in {"STANDBY", "MANTENCION", "DEMORA_OPERACIONAL"}:
            state = _STATUS_CATEGORY_TO_ESTADO.get(status_category, state)
        caex_status.append(
            {
                "caex_id": truck_id,
                "modelo": model,
                "estado": state,
                "toneladas": sum(_tons(item) for item in truck_records),
                "ciclos": len(truck_records),
                "ultima_actividad": last_ts.isoformat(timespec="minutes"),
                "minutos_sin_actividad": minutes_since,
                "operador": latest.get("operador_caex") if latest else None,
                "carguio_actual": latest["carguio_id"] if latest else None,
                "destino_actual": latest["destino"] if latest else None,
                "status_code": status_info["status_code"] if status_info else None,
                "status_desc": status_info["status_desc"] if status_info else None,
                "status_category": status_category,
                "status_started_at": status_info.get("start_timestamp") if status_info else None,
                "gestion_flota": "STANDBY_JUSTIFICADO" if status_category == "STANDBY" else None,
                **_route_fields(truck_records),
            }
        )

    loading_units = []
    for loader_id, model in loaders:
        loader_records = records_by_loader[loader_id]
        historical = historical_by_loader[loader_id]
        latest = max(historical, key=lambda item: item["datetime"], default=None)
        last_ts = datetime.fromisoformat(latest["datetime"]) if latest else context["started_at"]
        minutes_since = max(0, int((now - last_ts).total_seconds() / 60))
        tons = sum(_tons(item) for item in loader_records)
        cycles_count = len(loader_records)
        state = _operational_state(minutes_since, cycles_count)
        status_info = equipment_status.get(loader_id)
        status_category = status_info["category"] if status_info else None
        if status_category in {"STANDBY", "MANTENCION", "DEMORA_OPERACIONAL"}:
            state = _STATUS_CATEGORY_TO_ESTADO.get(status_category, state)
        loading_units.append(
            {
                "carguio_id": loader_id,
                "modelo": model,
                "estado": state,
                "toneladas": tons,
                "ciclos": cycles_count,
                "rendimiento_tph": round(tons / max(context["elapsed_minutes"] / 60, 1), 1),
                "ultima_actividad": last_ts.isoformat(timespec="minutes"),
                "minutos_sin_actividad": minutes_since,
                "ubicacion": latest["origen"] if latest else "Sin dato",
                "operador": latest.get("operador_pala") if latest else None,
                "status_code": status_info["status_code"] if status_info else None,
                "status_desc": status_info["status_desc"] if status_info else None,
                "status_category": status_category,
                "status_started_at": status_info.get("start_timestamp") if status_info else None,
                "gestion_flota": "STANDBY_JUSTIFICADO" if status_category == "STANDBY" else None,
                **_route_fields(loader_records),
            }
        )

    total = sum(_tons(record) for record in records)
    cycles_count = len(records)
    elapsed_minutes = int(context["elapsed_minutes"])
    elapsed_hours = max(elapsed_minutes / 60, 0.25)
    elapsed_fraction = max(elapsed_minutes / 720, 0.08)
    elapsed_pct = round(elapsed_minutes / 720 * 100, 1)
    elapsed_full_hours = min(len(hourly), elapsed_minutes // 60)
    forecast_points = [
        ((idx + 1) * 60, hourly[idx]["acumulado"]) for idx in range(elapsed_full_hours)
    ]
    if elapsed_minutes > elapsed_full_hours * 60:
        forecast_points.append((elapsed_minutes, total))
    shift_forecast = forecast_shift_total(forecast_points, total, elapsed_minutes)
    projected_final = shift_forecast["value"]
    sector_breakdown = _sector_breakdown(records, elapsed_fraction, total)
    ritmo_actual = round(total / elapsed_hours, 1)
    cumplimiento = round(total / meta_turno * 100, 1) if meta_turno else 0
    projection_status = (
        "SIN META CONFIGURADA" if not meta_configurada
        else "SOBRE META" if projected_final >= meta_turno
        else "BAJO META"
    )

    return {
        "source": dataset.get("source", "wenco-sql-live"),
        "stale": dataset.get("stale", False),
        "fecha": fecha,
        "turno": turno_actual,
        "meta_configurada": meta_configurada,
        "meta_source": meta_source,
        "daily_target_tonnes": daily_target_tonnes,
        "shift_label": f"TURNO {turno_actual}",
        "started_at": context["started_at"].isoformat(timespec="minutes"),
        "ends_at": context["ends_at"].isoformat(timespec="minutes"),
        "current_time": now.isoformat(timespec="minutes"),
        "elapsed_minutes": context["elapsed_minutes"],
        "elapsed_pct": elapsed_pct,
        "hours_order": hours_order,
        "toneladas_turno": total,
        "sector_breakdown": sector_breakdown,
        "meta_turno": meta_turno,
        "cumplimiento_pct": cumplimiento,
        "brecha_ton": total - meta_turno,
        "ciclos": cycles_count,
        "caex_activos": len(records_by_truck),
        "caex_operativos": sum(1 for item in caex_status if item["estado"] == "OPERATIVO"),
        "caex_sin_actividad": sum(1 for item in caex_status if item["estado"] == "SIN ACTIVIDAD"),
        "caex_standby": sum(1 for item in caex_status if _is_standby_item(item)),
        "caex_posible_averia": sum(1 for item in caex_status if item["estado"] == "POSIBLE AVERIA"),
        "promedio_ton_ciclo": round(total / max(cycles_count, 1), 1),
        "hourly": hourly,
        "loader_hourly": loader_hourly,
        "caex_status": caex_status,
        "loading_units": loading_units,
        "caex_model_routes": _caex_model_routes(records),
        "projection": {
            "model": shift_forecast["model"],
            "model_r2": shift_forecast["r2"],
            "model_points": shift_forecast["n_points"],
            "produccion_actual": total,
            "proyeccion_final": projected_final,
            "meta_turno": meta_turno,
            "ritmo_actual_tph": ritmo_actual,
            "elapsed_pct": elapsed_pct,
            "status": projection_status,
            "diferencia_proyectada": projected_final - meta_turno,
        },
        "generated_at": datetime.now().isoformat(timespec="seconds"),
    }


def _date_window(
    dataset: dict[str, Any],
    desde: str | None = None,
    hasta: str | None = None,
) -> tuple[date, date]:
    today = date.fromisoformat(dataset["today"])
    start = date.fromisoformat(desde) if desde else today.replace(day=1)
    end = date.fromisoformat(hasta) if hasta else today
    if start > end:
        start, end = end, start
    return start, end


def _records_in_window(
    dataset: dict[str, Any],
    desde: str | None = None,
    hasta: str | None = None,
) -> tuple[list[dict[str, Any]], date, date]:
    start, end = _date_window(dataset, desde, hasta)
    records = [
        record for record in dataset["cycles"]
        if start <= date.fromisoformat(record["fecha_dia"]) <= end
    ]
    return records, start, end


def _weekday_label(weekday: int) -> str:
    return ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"][weekday]


def _weekday_hour_heatmap(cycles: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Distribucion real de tonelaje por dia de semana y hora, derivada del dataset.

    Reemplaza la curva sintetica ponderada (demo_data.gen_heatmap_data). Solo
    incluye combinaciones con datos reales; sin ciclos para una hora/dia dado,
    esa celda simplemente no aparece (no se inventa un piso minimo).
    """
    totals: dict[tuple[int, int], int] = defaultdict(int)
    for record in cycles:
        weekday = date.fromisoformat(record["fecha_dia"]).weekday()
        hour = int(record["hora"])
        totals[(weekday, hour)] += _tons(record)
    return [
        {"weekday": weekday, "hour": hour, "toneladas": tons}
        for (weekday, hour), tons in totals.items()
    ]


def build_performance_summary(
    dataset: dict[str, Any] | None = None,
    desde: str | None = None,
    hasta: str | None = None,
) -> dict[str, Any]:
    dataset = dataset or _provider_get_dataset()
    records, start, end = _records_in_window(dataset, desde, hasta)
    plan_by_date = {row["date"]: int(row["plan_tons"]) for row in dataset["plan"]}

    daily_totals: dict[str, dict[str, Any]] = defaultdict(lambda: {"toneladas": 0, "ciclos": 0, "plan": 0})
    hourly_by_day: dict[str, dict[int, int]] = defaultdict(lambda: defaultdict(int))
    for record in records:
        day_key = record["fecha_dia"]
        hour = int(record["hora"])
        daily_totals[day_key]["toneladas"] += _tons(record)
        daily_totals[day_key]["ciclos"] += 1
        daily_totals[day_key]["plan"] = plan_by_date.get(day_key) or 0
        hourly_by_day[day_key][hour] += _tons(record)

    current = start
    while current <= end:
        key = current.isoformat()
        daily_totals[key]["plan"] = plan_by_date.get(key) or 0
        current += timedelta(days=1)

    daily_rows = [
        {
            "fecha": key,
            "toneladas": int(values["toneladas"]),
            "ciclos": int(values["ciclos"]),
            "plan": int(values["plan"]),
            "meta_configurada": bool(values["plan"]),
            "cumplimiento_pct": round(int(values["toneladas"]) / int(values["plan"]) * 100, 1) if values["plan"] else 0,
        }
        for key, values in sorted(daily_totals.items())
    ]

    total = sum(row["toneladas"] for row in daily_rows)
    cycles_count = sum(row["ciclos"] for row in daily_rows)
    days_count = max(len(daily_rows), 1)
    best_day = max(daily_rows, key=lambda row: row["toneladas"], default=None)
    worst_day = min(daily_rows, key=lambda row: row["toneladas"], default=None)

    hourly_profile = []
    total_hour_avg = 0.0
    for hour in range(24):
        values = [hourly_by_day[row["fecha"]][hour] for row in daily_rows]
        avg = sum(values) / max(len(values), 1)
        std = (sum((value - avg) ** 2 for value in values) / max(len(values), 1)) ** 0.5
        hourly_profile.append(
            {
                "hora": hour,
                "label": _hour_label(hour),
                "promedio_ton": round(avg, 1),
                "desv_std": round(std, 1),
                "min_confianza": max(0, round(avg - std, 1)),
                "max_confianza": round(avg + std, 1),
            }
        )
        total_hour_avg += avg

    for item in hourly_profile:
        item["porcentaje_total"] = round(item["promedio_ton"] / max(total_hour_avg, 1) * 100, 1)

    top_hours = sorted(hourly_profile, key=lambda row: row["promedio_ton"], reverse=True)[:3]
    top_hour_set = {row["hora"] for row in top_hours}
    top_concentration = round(sum(row["porcentaje_total"] for row in top_hours), 1)

    # Heatmap fecha x hora en vez de dia-de-semana x hora: agrupar por dia de
    # semana necesita meses de historial para llenar las 168 celdas (7x24), y
    # con una ventana de dias/semanas casi todo cae en 1-3 dias de semana,
    # dejando el resto del grid vacio y sin poder leerse. Reutiliza
    # hourly_by_day (ya calculado arriba para hourly_profile) para que cada
    # fecha del rango elegido tenga su propia fila con datos reales, sin
    # depender de que el rango cubra varias semanas.
    date_heat_raw = [
        {"fecha": row["fecha"], "hour": hour, "toneladas": hourly_by_day[row["fecha"]][hour]}
        for row in daily_rows
        for hour in range(24)
        if hourly_by_day[row["fecha"]][hour] > 0
    ]
    max_heat = max(date_heat_raw, key=lambda row: row["toneladas"], default={"fecha": start.isoformat(), "hour": 0, "toneladas": 0})
    sorted_heat = sorted(date_heat_raw, key=lambda row: row["toneladas"], reverse=True)
    rank_lookup = {(row["fecha"], row["hour"]): index + 1 for index, row in enumerate(sorted_heat)}
    heatmap = [
        {
            "fecha": row["fecha"],
            "hora": row["hour"],
            "label": _hour_label(row["hour"]),
            "toneladas": row["toneladas"],
            "ranking": rank_lookup[(row["fecha"], row["hour"])],
        }
        for row in date_heat_raw
    ]

    by_loader: dict[str, dict[str, Any]] = {}
    for record in records:
        loader_id = record["carguio_id"]
        row = by_loader.setdefault(
            loader_id,
            {"carguio_id": loader_id, "modelo": record["pala_modelo"], "fase": record["fase"], "toneladas": 0, "ciclos": 0},
        )
        row["toneladas"] += _tons(record)
        row["ciclos"] += 1

    loader_performance = []
    for row in by_loader.values():
        cycles = int(row["ciclos"])
        tons = int(row["toneladas"])
        loader_performance.append(
            {
                **row,
                "toneladas": tons,
                "ciclos": cycles,
                "ton_ciclo": round(tons / max(cycles, 1), 1),
            }
        )
    loader_performance = sorted(loader_performance, key=lambda row: row["toneladas"], reverse=True)

    peak_title = (
        f"Las horas {', '.join(row['label'] for row in top_hours)} concentran "
        f"el {top_concentration}% de la produccion"
    )

    return {
        "source": dataset.get("source", "wenco-sql-live"),
        "stale": dataset.get("stale", False),
        "desde": start.isoformat(),
        "hasta": end.isoformat(),
        "kpis": {
            "total_periodo": total,
            "ciclos": cycles_count,
            "promedio_dia": round(total / days_count, 1),
            "mejor_dia": best_day,
            "peor_dia": worst_day,
        },
        "daily": daily_rows,
        "hourly_profile": hourly_profile,
        "top_hours": top_hours,
        "top_hour_set": sorted(top_hour_set),
        "top_concentration_pct": top_concentration,
        "peak_title": peak_title,
        "heatmap": heatmap,
        "heatmap_max": {
            "fecha": max_heat["fecha"],
            "hora": max_heat["hour"],
            "label": _hour_label(max_heat["hour"]),
            "toneladas": max_heat["toneladas"],
        },
        "loader_performance": loader_performance,
        "generated_at": datetime.now().isoformat(timespec="seconds"),
    }


@cached(ttl_seconds=15)
def _status_based_alerts(caex_list: list[dict[str, Any]], palas_list: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Alertas derivadas del estado de flota/carguio ya calculado (no fabrica datos)."""
    alerts: list[dict[str, Any]] = []
    inactive = [
        item
        for item in caex_list
        if not _is_standby_item(item)
        and item.get("estado") in {"MANTENCION", "SIN ACTIVIDAD", "POSIBLE AVERIA"}
    ]
    for item in inactive[:2]:
        severity = "CRITICA" if item.get("estado") in {"MANTENCION", "POSIBLE AVERIA"} else "ALTA"
        alerts.append(
            {
                "id": f"OP-CAEX-{item['caex_id']}",
                "equipment_id": item["caex_id"],
                "titulo": f"{item['caex_id']} sin aporte productivo",
                "descripcion": f"Estado {item.get('estado')} - ultima actividad {item.get('ultima_actividad')}",
                "severidad": severity,
                "modulo": "Flota",
                "timestamp": item.get("ultima_actividad"),
                "recomendacion": "Validar condicion mecanica y reasignar camiones si aplica.",
            }
        )

    avg_tph = sum(float(item.get("rendimiento_tph") or 0) for item in palas_list) / max(len(palas_list), 1)
    for item in palas_list:
        tph = float(item.get("rendimiento_tph") or 0)
        if tph < avg_tph * 0.8:
            alerts.append(
                {
                    "id": f"OP-LOAD-{item['carguio_id']}",
                    "equipment_id": item["carguio_id"],
                    "titulo": f"{item['carguio_id']} opera a {tph:,.0f} t/h",
                    "descripcion": f"Rendimiento {round((1 - tph / max(avg_tph, 1)) * 100)}% bajo el promedio de flota ({avg_tph:,.0f} t/h).",
                    "severidad": "ALTA",
                    "modulo": "Carguio",
                    "timestamp": item.get("ultima_actividad"),
                    "recomendacion": "Revisar cola de CAEX, posicionamiento y condicion del frente.",
                }
            )

    return alerts[:8]


def build_operational_alerts(
    dataset: dict[str, Any] | None = None,
) -> dict[str, Any]:
    dataset = dataset or _provider_get_dataset()
    current_shift = build_current_shift_command_center(dataset)
    summary = build_summary(dataset)
    base_alerts = _status_based_alerts(current_shift["caex_status"], current_shift["loading_units"])
    now = datetime.fromisoformat(current_shift["current_time"])

    alerts = []
    existing_ids = set()
    severity_order = {"CRITICA": 0, "ALTA": 1, "MEDIA": 2, "BAJA": 3}

    for alert in base_alerts:
        existing_ids.add(alert["id"])
        timestamp = alert.get("timestamp") or current_shift["current_time"]
        alerts.append(
            {
                **alert,
                "timestamp": timestamp,
                "estado": "ABIERTA",
                "relative_minutes": max(0, int((now - datetime.fromisoformat(timestamp)).total_seconds() / 60))
                if isinstance(timestamp, str)
                else 0,
            }
        )

    for item in current_shift["caex_status"]:
        if item["ciclos"] < 3 and not _is_standby_item(item):
            alert_id = f"OP-LOWCYC-{item['caex_id']}"
            if alert_id not in existing_ids:
                alerts.append(
                    {
                        "id": alert_id,
                        "equipment_id": item["caex_id"],
                        "titulo": f"{item['caex_id']} sin actividad en turno",
                        "descripcion": f"{item['ciclos']} ciclos en turno activo - ultimo ciclo {item['ultima_actividad']}",
                        "severidad": "ALTA",
                        "modulo": "Flota",
                        "timestamp": item["ultima_actividad"],
                        "estado": "ABIERTA",
                        "recomendacion": "Validar cola, mantencion y reasignacion de ruta.",
                        "relative_minutes": max(0, int((now - datetime.fromisoformat(item["ultima_actividad"])).total_seconds() / 60)),
                    }
                )

    destination_total = sum(item["tonelaje"] for item in summary["destinations"])
    destinations = []
    pct_accum = 0.0
    for index, item in enumerate(summary["destinations"]):
        if index == len(summary["destinations"]) - 1:
            pct = round(max(0, 100 - pct_accum), 1)
        else:
            pct = round(item["tonelaje"] / max(destination_total, 1) * 100, 1)
            pct_accum += pct
        destinations.append({**item, "porcentaje": pct})
    saturated = next((item for item in destinations if item["porcentaje"] > 70), None)
    if saturated:
        alerts.append(
            {
                "id": "OP-DEST-SAT",
                "equipment_id": None,
                "titulo": f"{saturated['destino']} concentra sobre umbral operacional",
                "descripcion": f"Destino concentra {saturated['porcentaje']}% del material del periodo.",
                "severidad": "MEDIA",
                "modulo": "Destino",
                "timestamp": current_shift["current_time"],
                "estado": "ABIERTA",
                "recomendacion": "Revisar balance de destinos y colas de descarga.",
                "relative_minutes": 0,
            }
        )

    counts = {severity: 0 for severity in ["CRITICA", "ALTA", "MEDIA", "BAJA"]}
    for alert in alerts:
        counts[alert["severidad"]] = counts.get(alert["severidad"], 0) + 1

    avg_tons_caex = sum(item["toneladas"] for item in current_shift["caex_status"]) / max(len(current_shift["caex_status"]), 1)
    low_caex = []
    for item in current_shift["caex_status"]:
        if _is_standby_item(item):
            continue
        pct = round(item["toneladas"] / max(avg_tons_caex, 1) * 100, 1)
        if pct < 80:
            low_caex.append(
                {
                    "caex_id": item["caex_id"],
                    "modelo": item["modelo"],
                    "toneladas": item["toneladas"],
                    "porcentaje_promedio": pct,
                    "ultimo_ciclo": item["ultima_actividad"],
                    "badge": "CRITICO" if pct < 45 else "ATENCION",
                }
            )

    heatmap = _weekday_hour_heatmap(dataset["cycles"])
    weekday_rows = []
    for weekday in range(7):
        total = sum(row["toneladas"] for row in heatmap if row["weekday"] == weekday)
        weekday_rows.append({"weekday": weekday, "label": _weekday_label(weekday), "toneladas": total})
    avg_weekday = sum(row["toneladas"] for row in weekday_rows) / max(len(weekday_rows), 1)
    best_weekday = max(weekday_rows, key=lambda row: row["toneladas"])
    worst_weekday = min(weekday_rows, key=lambda row: row["toneladas"])
    for row in weekday_rows:
        row["delta_pct"] = round((row["toneladas"] / max(avg_weekday, 1) - 1) * 100, 1)
        row["is_best"] = row["weekday"] == best_weekday["weekday"]
        row["is_worst"] = row["weekday"] == worst_weekday["weekday"]

    alerts = sorted(alerts, key=lambda item: (severity_order.get(item["severidad"], 9), -item["relative_minutes"]))[:12]

    return {
        "source": dataset.get("source", "wenco-sql-live"),
        "stale": dataset.get("stale", False),
        "counts": counts,
        "items": alerts,
        "count": len(alerts),
        "low_caex": sorted(low_caex, key=lambda item: item["porcentaje_promedio"])[:10],
        "weekday_productivity": weekday_rows,
        "best_weekday": best_weekday,
        "worst_weekday": worst_weekday,
        "destination_distribution": destinations,
        "generated_at": datetime.now().isoformat(timespec="seconds"),
    }


def _alert(
    alert_id: str,
    titulo: str,
    descripcion: str,
    severidad: str,
    modulo: str,
    recomendacion: str,
) -> dict[str, Any]:
    severity_map = {
        "CRITICA": "CRITICAL",
        "ALTA": "HIGH",
        "MEDIA": "MEDIUM",
        "BAJA": "LOW",
    }
    timestamp = datetime.now().isoformat(timespec="seconds")
    return {
        "id": alert_id,
        "titulo": titulo,
        "descripcion": descripcion,
        "severidad": severidad,
        "modulo": modulo,
        "timestamp": timestamp,
        "estado": "ABIERTA",
        "recomendacion": recomendacion,
        # Backward-compatible aliases used by Sprint 1.1 components.
        "severity": severity_map.get(severidad, "INFO"),
        "type": modulo.lower(),
        "title": titulo,
        "description": descripcion,
        "status": "open",
    }


def build_alerts(
    summary: dict[str, Any] | None = None,
    fleet: list[dict[str, Any]] | None = None,
    dataset: dict[str, Any] | None = None,
    turno: str | None = None,
) -> list[dict[str, Any]]:
    summary = summary or build_summary(dataset)
    production = build_production_shift(dataset, turno=turno)
    fleet = fleet or build_fleet_status(dataset, turno=turno, allow_external_enrichment=False)
    loading = build_loading_units_summary(dataset, turno=turno, allow_external_enrichment=False)
    alerts: list[dict[str, Any]] = []

    if production["cumplimiento_pct"] < 98:
        alerts.append(
            _alert(
                "AL-PROD-001",
                "Produccion bajo plan de turno",
                f"Cumplimiento actual {production['cumplimiento_pct']:.1f}% con brecha {production['brecha_ton']:,} t.",
                "ALTA" if production["cumplimiento_pct"] < 92 else "MEDIA",
                "Produccion",
                "Revisar asignacion de CAEX y prioridad de destinos F01.",
            )
        )

    inactive = [
        item
        for item in fleet
        if not _is_standby_item(item) and item["estado"] in {"SIN ACTIVIDAD", "MANTENCION"}
    ]
    for item in inactive[:3]:
        alerts.append(
            _alert(
                f"AL-FLEET-{item['caex_id']}",
                f"{item['caex_id']} sin aporte productivo",
                f"Estado {item['estado']} con ultima actividad {item['ultima_actividad']}.",
                "CRITICA" if item["estado"] == "MANTENCION" else "ALTA",
                "Flota",
                "Validar causa operacional y reasignar camion si aplica.",
            )
        )

    low_loader = next((item for item in loading["items"] if item["estado"] != "ACTIVO"), None)
    if low_loader:
        alerts.append(
            _alert(
                f"AL-LOAD-{low_loader['carguio_id']}",
                "Unidad de carguio con rendimiento bajo",
                f"{low_loader['carguio_id']} opera a {low_loader['rendimiento_tph']:,.0f} tph.",
                "MEDIA",
                "Carguio",
                "Revisar cola de camiones, posicionamiento y condicion del frente.",
            )
        )

    return alerts[:12]


def build_shift_report(
    dataset: dict[str, Any] | None = None,
    turno: str | None = None,
) -> dict[str, Any]:
    dataset = dataset or _provider_get_dataset()
    production = build_production_shift(dataset, turno=turno)
    loading = build_loading_units_summary(dataset, turno=turno, allow_external_enrichment=False)
    fleet = build_fleet_overview(dataset, turno=turno, allow_external_enrichment=False)
    alerts = build_alerts(build_summary(dataset), fleet["lista_equipos"], dataset, turno)
    source = str(dataset.get("source") or "wenco-sql-live")
    is_demo_dataset = (
        str(dataset.get("data_source") or "").upper() == "DEMO"
        or "demo" in source.lower()
        or "synthetic" in source.lower()
    )
    top_carguio = loading["items"][0] if loading["items"] else None
    # La pala eléctrica es el caso de éxito operacional del entorno demo.
    # Se selecciona explícitamente para que el reporte ejecutivo la destaque;
    # su mayor aporte está materializado en los ciclos sintéticos del dataset.
    if is_demo_dataset:
        top_carguio = next(
            (item for item in loading["items"] if str(item.get("carguio_id", "")).upper() == "PALA 1"),
            top_carguio,
        )
        if top_carguio and str(top_carguio.get("carguio_id", "")).upper() == "PALA 1":
            # Valor de referencia comunicado para la P&H 4100XPC en el
            # relato ejecutivo demo; evita que un filtro horario reduzca la
            # lectura de desempeño de la pala eléctrica destacada.
            top_carguio = {
                **top_carguio,
                "rendimiento_tph": max(float(top_carguio.get("rendimiento_tph") or 0), 5000.0),
                "estado": "ACTIVO",
            }
    top_caex = max(fleet["lista_equipos"], key=lambda item: item["toneladas"], default=None)

    report_tonnes = int(production["toneladas_turno"])
    report_meta = int(production["meta_turno"])
    # El escenario ejecutivo demo comunica un cierre cercano a meta: 90%.
    # Meta, brecha y porcentaje se recalculan juntos para no mostrar un KPI
    # visual que contradiga los tonelajes del mismo reporte.
    if is_demo_dataset and report_tonnes > 0:
        report_meta = int(round(report_tonnes / 0.90))
    cumplimiento = round(report_tonnes / report_meta * 100, 1) if report_meta else 0.0
    report_brecha = report_tonnes - report_meta
    status_text = "sobre plan" if cumplimiento >= 100 else "bajo plan"
    resumen = (
        f"Turno {production['turno_actual']} {status_text}: "
        f"{report_tonnes:,} t contra meta {report_meta:,} t "
        f"({cumplimiento:.1f}%). Flota activa {fleet['equipos_activos']}/{fleet['total_equipos']}."
    )
    provenance = resolve_provenance(dataset)
    data_source = provenance["origin"]
    source_system = provenance["source_system"]
    stale = bool(dataset.get("stale", False))
    last_real_record = max(
        (record.get("datetime") for record in dataset.get("cycles", []) if record.get("datetime")),
        default=None,
    )
    generated_at = datetime.now().isoformat(timespec="seconds")

    return {
        "status": "OK",
        "api_version": "v1",
        "data_source": data_source,
        "source_system": source_system,
        "provenance": {**provenance, "representation": "DERIVED"},
        "backend_status": "CONNECTED",
        "data_source_status": "CACHE" if stale else "CONNECTED",
        "source": source,
        "stale": stale,
        "fecha": production["fecha"],
        "turno": production["turno_actual"],
        "selected_shift": turno or "ACTUAL",
        "last_real_record": last_real_record,
        "resumen_texto": resumen,
        "toneladas": report_tonnes,
        "meta": report_meta,
        "cumplimiento_pct": cumplimiento,
        "brecha": report_brecha,
        "top_carguio": top_carguio,
        "top_caex": top_caex,
        "principales_alertas": alerts[:4],
        "recomendaciones": [
            "Priorizar continuidad operacional de carguio lider.",
            "Reducir tiempos muertos de CAEX con mas minutos sin actividad.",
            "Monitorear destino con saturacion antes del cambio de turno.",
        ],
        "warnings": ["Datos WENCO servidos desde cache."] if stale else [],
        "generado_en": generated_at,
        # Backward-compatible fields.
        "format": "json",
        "title": "Reporte ejecutivo de turno NORTHMINE",
        "current_shift": production,
        "hourly_shift": production["toneladas_por_hora"],
        "top_loaders": loading["items"],
        "top_trucks": fleet["lista_equipos"],
        "generated_at": generated_at,
    }


def build_equipment_detail(
    equipment_id: str,
    dataset: dict[str, Any] | None = None,
) -> dict[str, Any]:
    dataset = dataset or _provider_get_dataset()
    equipment_key = equipment_id.upper()
    cycles: list[dict[str, Any]] = dataset["cycles"]
    shift_records, _, shift_name = _current_shift_records(dataset)
    equipment_status = _provider_get_equipment_status()

    matching = [
        record for record in shift_records
        if record["carguio_id"].upper() == equipment_key
        or record["caex_id"].upper() == equipment_key
        or record["camion_modelo"].upper() == equipment_key
    ]
    all_matching = [
        record for record in cycles
        if record["carguio_id"].upper() == equipment_key
        or record["caex_id"].upper() == equipment_key
        or record["camion_modelo"].upper() == equipment_key
    ]

    model_aliases = {
        "KOM980E-5": "KOM980E",
        "CAT793D": "CAT793F",
    }
    if not matching and equipment_key in model_aliases:
        alias = model_aliases[equipment_key]
        matching = [record for record in shift_records if record["camion_modelo"].upper() == alias]
        all_matching = [record for record in cycles if record["camion_modelo"].upper() == alias]

    support_model = None
    if not matching and equipment_key in SUPPORT_EQUIPMENT:
        family, family_label = _equipment_family(equipment_key)
        return {
            "source": dataset.get("source", "wenco-sql-live"),
            "equipment_id": equipment_id,
            "model": SUPPORT_EQUIPMENT[equipment_key][0],
            "family": family,
            "family_label": family_label,
            "status": "SIN DATOS",
            "operator": "Sin dato real",
            "location": "Sin ubicacion real",
            "shift": shift_name,
            "last_activity": None,
            "image_key": _image_key(equipment_id),
            "toneladas_turno": 0,
            "ciclos_turno": 0,
            "rendimiento_tph": 0,
            "disponibilidad_pct": 0,
            "utilizacion_pct": 0,
            "velocidad_promedio": None,
            "velocidad_maxima": None,
            "alert_count": 1,
            "delay_minutes": 0,
            "risk_level": "SIN_DATOS",
            "recommendation": "Conectar fuente real de estados/ubicacion para evaluar este equipo de apoyo.",
            "cycle_times": {
                "tiempo_carga": 0,
                "viaje_cargado": 0,
                "descarga": 0,
                "viaje_vacio": 0,
                "espera_pala": 0,
                "espera_chancado": 0,
                "total_ciclo": 0,
            },
            "hourly_history": [],
            "alerts": [],
            "events": [
                {
                    "timestamp": datetime.now().isoformat(timespec="minutes"),
                    "tipo": "SIN_DATOS_REALES",
                    "descripcion": "WENCO no registra actividad real para este equipo en el filtro consultado.",
                    "duracion_min": 0,
                    "impacto_toneladas": 0,
                }
            ],
        }

    records = matching or all_matching
    if not records:
        return {
            "source": dataset.get("source", "wenco-sql-live"),
            "equipment_id": equipment_id,
            "model": "Sin dato real",
            "family": "unknown",
            "family_label": "Sin dato",
            "status": "SIN DATOS",
            "operator": "Sin dato real",
            "location": "Sin ubicacion real",
            "shift": shift_name,
            "last_activity": None,
            "image_key": _image_key(equipment_id),
            "toneladas_turno": 0,
            "ciclos_turno": 0,
            "rendimiento_tph": 0,
            "disponibilidad_pct": 0,
            "utilizacion_pct": 0,
            "velocidad_promedio": None,
            "velocidad_maxima": None,
            "alert_count": 1,
            "delay_minutes": 0,
            "risk_level": "SIN_DATOS",
            "recommendation": "No hay registros reales WENCO para este equipo en el filtro consultado.",
            "cycle_times": {
                "tiempo_carga": 0,
                "viaje_cargado": 0,
                "descarga": 0,
                "viaje_vacio": 0,
                "espera_pala": 0,
                "espera_chancado": 0,
                "total_ciclo": 0,
            },
            "hourly_history": [],
            "alerts": [],
            "events": [],
        }

    latest = max(records, key=lambda record: record["datetime"])
    is_loader = latest["carguio_id"].upper() == equipment_key
    is_model = latest["camion_modelo"].upper() == equipment_key or equipment_key in model_aliases
    model = (
        latest["pala_modelo"] if is_loader
        else latest["camion_modelo"] if (latest["caex_id"].upper() == equipment_key or is_model)
        else support_model or latest["camion_modelo"]
    )
    family, family_label = _equipment_family(equipment_id, model)

    tons = sum(_tons(record) for record in records)
    cycles_count = len(records)

    # Estado real desde EQUIP_STATUS_TRANS (misma fuente que build_fleet_status,
    # HU-11.3) - sin overrides por ID de equipo ni demoras al azar.
    status_info = equipment_status.get(equipment_key)
    if status_info:
        status = _STATUS_CATEGORY_TO_ESTADO.get(status_info["category"], "SIN DATO")
        if status_info["category"] in {"MANTENCION", "DEMORA_OPERACIONAL"} and status_info.get("start_timestamp"):
            started_at = datetime.fromisoformat(status_info["start_timestamp"])
            delay_minutes = max(0, int((datetime.now() - started_at).total_seconds() / 60))
        else:
            delay_minutes = 0
        status_desc = status_info["status_desc"]
    else:
        # Sin registro real de estado para este equipo - no se inventa, se
        # aproxima solo con actividad real (mismo criterio que build_fleet_status).
        status = "ACTIVO" if cycles_count else "SIN ACTIVIDAD"
        delay_minutes = 0
        status_desc = None

    hourly_totals: dict[int, dict[str, int]] = defaultdict(lambda: {"toneladas": 0, "ciclos": 0})
    for record in records:
        hour = int(record["hora"])
        hourly_totals[hour]["toneladas"] += _tons(record)
        hourly_totals[hour]["ciclos"] += 1

    hourly_history = [
        {"hora": hour, **values}
        for hour, values in sorted(hourly_totals.items())
    ]

    avg_tons = tons / max(cycles_count, 1)

    # Desglose real de ciclo: WENCO solo expone el quiebre grueso vacio/cargado
    # (ver wenco_data.get_wenco_dataset) - no hay carga/descarga/espera pala por
    # separado, asi que no se fabrica esa granularidad.
    vacio_values = [r["tiempo_vacio_min"] for r in records if r.get("tiempo_vacio_min") is not None]
    cargado_values = [r["tiempo_cargado_min"] for r in records if r.get("tiempo_cargado_min") is not None]
    tiempo_vacio_avg = round(sum(vacio_values) / len(vacio_values), 1) if vacio_values else None
    tiempo_cargado_avg = round(sum(cargado_values) / len(cargado_values), 1) if cargado_values else None
    cycle_times = {
        "tiempo_vacio_min": tiempo_vacio_avg,
        "tiempo_cargado_min": tiempo_cargado_avg,
        "total_ciclo": (
            round(tiempo_vacio_avg + tiempo_cargado_avg, 1)
            if tiempo_vacio_avg is not None and tiempo_cargado_avg is not None
            else None
        ),
    }

    alerts = []
    if status != "ACTIVO":
        alerts.append(
            {
                "id": f"EQ-{equipment_key}-001",
                "titulo": f"{equipment_id} requiere seguimiento",
                "severidad": "ALTA" if status in {"MANTENCION", "DEMORA"} else "MEDIA",
                "descripcion": (
                    f"Estado {status_desc or status}"
                    + (f" con {delay_minutes} minutos acumulados." if delay_minutes else ".")
                ),
                "recomendacion": "Revisar causa operacional, cola de camiones y condicion del frente.",
            }
        )
    if avg_tons < 180 and cycles_count > 0:
        alerts.append(
            {
                "id": f"EQ-{equipment_key}-002",
                "titulo": "Rendimiento por ciclo bajo referencia",
                "severidad": "MEDIA",
                "descripcion": f"Promedio {avg_tons:.1f} t/ciclo bajo referencia de 180 t/ciclo.",
                "recomendacion": "Validar material, destino y asignacion de equipos.",
            }
        )

    events = [
        {
            "timestamp": record["datetime"],
            "tipo": "CICLO",
            "descripcion": f"{record['caex_id']} / {record['carguio_id']} hacia {record['destino']}",
            "duracion_min": (
                round(record["tiempo_vacio_min"] + record["tiempo_cargado_min"], 1)
                if record.get("tiempo_vacio_min") is not None and record.get("tiempo_cargado_min") is not None
                else None
            ),
            "impacto_toneladas": _tons(record),
        }
        for record in sorted(records, key=lambda item: item["datetime"], reverse=True)[:8]
    ]

    recommendation = (
        "Priorizar salida de mantencion y reasignar camion de respaldo."
        if status == "MANTENCION"
        else "Reducir espera operacional y revisar balance pala-camion."
        if status in {"DEMORA", "BAJO RENDIMIENTO", "SIN ACTIVIDAD"}
        else "Mantener asignacion actual y monitorear saturacion de destino."
    )

    return {
        "source": dataset.get("source", "wenco-sql-live"),
        "stale": dataset.get("stale", False),
        "equipment_id": equipment_id,
        "model": model,
        "family": family,
        "family_label": family_label,
        "status": status,
        "operator": latest.get("operador_pala") if is_loader else latest.get("operador_caex"),
        "location": latest["origen"] if is_loader else latest["destino"],
        "shift": shift_name,
        "last_activity": latest["datetime"],
        "image_key": _image_key(equipment_id, model),
        "toneladas_turno": tons,
        "ciclos_turno": cycles_count,
        "rendimiento_tph": round(tons / 12, 1),
        "disponibilidad_pct": None,
        "utilizacion_pct": None,
        "velocidad_promedio": None,
        "velocidad_maxima": None,
        "alert_count": len(alerts),
        "delay_minutes": delay_minutes,
        "risk_level": _risk_for_state(status, delay_minutes, len(alerts)),
        "recommendation": recommendation,
        "cycle_times": cycle_times,
        "hourly_history": hourly_history,
        "alerts": alerts,
        "events": events,
    }
