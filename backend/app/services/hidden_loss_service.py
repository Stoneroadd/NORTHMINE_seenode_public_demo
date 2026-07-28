from __future__ import annotations

import os
from datetime import datetime
from typing import Any

from app.services.data_quality_service import build_data_quality
from app.services.economics_service import build_delay_breakdown, build_economics
from app.services.equipment_service import (
    current_shift_records,
    destination_name,
    find_destination_focus,
    find_low_loading_unit,
)
from app.services.forecast_service import build_forecast_summary
from app.services.kpis import build_current_shift_command_center, build_operational_alerts


HIDDEN_LOSSES_API_VERSION = "v1"


def _now_iso() -> str:
    return datetime.now().isoformat(timespec="seconds")


def _float_env(name: str, default: float) -> float:
    raw = os.getenv(name, "").strip()
    if not raw:
        return default
    try:
        return float(raw)
    except ValueError:
        return default


def _margin_per_tonne(economics: dict[str, Any]) -> float:
    value_per_tonne = _float_env("NORTHMINE_VALUE_PER_TONNE_USD", 4.5)
    cost_per_tonne = float(economics.get("cost_per_tonne_usd") or _float_env("NORTHMINE_COST_PER_TONNE_USD", 3.07))
    return max(0.1, value_per_tonne - cost_per_tonne)


def _delay_cost_per_minute() -> float:
    return _float_env("NORTHMINE_DELAY_COST_USD_PER_MIN", 85.0)


def _tonnes_per_minute(current: dict[str, Any], forecast: dict[str, Any]) -> float:
    actual = float(forecast.get("actual") or current.get("toneladas_turno") or 0)
    elapsed = float(current.get("elapsed_minutes") or 0)
    if elapsed <= 0:
        elapsed = max(1.0, len(current.get("hourly") or []) * 60.0)
    return max(0.1, actual / max(elapsed, 1.0))


def _confidence(score: float | None, cycle_count: int) -> str:
    if cycle_count < 5 or score is not None and score < 55:
        return "BAJA"
    if score is not None and score >= 85 and cycle_count >= 20:
        return "ALTA"
    return "MEDIA"


def _severity(loss_usd: int) -> str:
    if loss_usd >= 35_000:
        return "CRITICA"
    if loss_usd >= 15_000:
        return "ALTA"
    if loss_usd >= 5_000:
        return "MEDIA"
    return "BAJA"


def _loss_item(
    *,
    loss_id: str,
    category: str,
    title: str,
    loss_usd: float,
    lost_tonnes: float,
    lost_minutes: float,
    confidence: str,
    evidence: list[str],
    recommendation: str,
    equipment_id: str | None = None,
    recovery_factor: float = 0.62,
) -> dict[str, Any]:
    fuel_liters_per_tonne = _float_env("NORTHMINE_FUEL_LITERS_PER_TONNE", 0.52)
    fuel_cost = _float_env("NORTHMINE_FUEL_COST_USD_PER_LITER", 1.35)
    wear_cost_per_minute = _float_env("NORTHMINE_WEAR_COST_USD_PER_LOSS_MIN", 18.0)
    loss = round(max(0.0, loss_usd))
    recoverable = round(loss * recovery_factor)
    minutes = max(0.0, lost_minutes)
    tonnes = max(0.0, lost_tonnes)
    return {
        "id": loss_id,
        "category": category,
        "title": title,
        "equipment_id": equipment_id,
        "loss_usd": loss,
        "recoverable_usd": recoverable,
        "lost_tonnes": round(tonnes),
        "lost_hours": round(minutes / 60.0, 2),
        "lost_minutes": round(minutes),
        "confidence": confidence,
        "severity": _severity(loss),
        "evidence": evidence,
        "recommendation": recommendation,
        "impact": {
            "fuel_liters": round(tonnes * fuel_liters_per_tonne * 0.22),
            "fuel_cost_usd": round(tonnes * fuel_liters_per_tonne * 0.22 * fuel_cost),
            "wear_cost_usd": round(minutes * wear_cost_per_minute),
        },
    }


def _queue_loss(
    records: list[dict[str, Any]],
    current: dict[str, Any],
    forecast: dict[str, Any],
    economics: dict[str, Any],
    confidence: str,
) -> tuple[dict[str, Any] | None, dict[str, dict[str, Any]]]:
    empty_threshold = _float_env("NORTHMINE_EMPTY_CYCLE_THRESHOLD_MIN", 8.0)
    loaded_threshold = _float_env("NORTHMINE_LOADED_CYCLE_THRESHOLD_MIN", 12.0)
    tonnes_per_min = _tonnes_per_minute(current, forecast)
    excess_minutes = 0.0
    missing_time = 0
    equipment: dict[str, dict[str, Any]] = {}
    for record in records:
        caex_id = str(record.get("caex_id") or "CAEX sin dato")
        record_excess = 0.0
        empty_min = record.get("tiempo_vacio_min")
        loaded_min = record.get("tiempo_cargado_min")
        if isinstance(empty_min, (int, float)):
            record_excess += max(0.0, float(empty_min) - empty_threshold)
        else:
            missing_time += 1
        if isinstance(loaded_min, (int, float)):
            record_excess += max(0.0, float(loaded_min) - loaded_threshold)
        else:
            missing_time += 1
        if record_excess <= 0:
            continue
        excess_minutes += record_excess
        row = equipment.setdefault(caex_id, {"equipment_id": caex_id, "loss_usd": 0, "lost_minutes": 0, "sources": set()})
        row["lost_minutes"] += record_excess
        row["loss_usd"] += record_excess * _delay_cost_per_minute()
        row["sources"].add("cola/ciclo")

    if excess_minutes <= 0:
        return None, equipment
    lost_tonnes = excess_minutes * tonnes_per_min * 0.35
    loss_usd = excess_minutes * _delay_cost_per_minute() + lost_tonnes * _margin_per_tonne(economics)
    item = _loss_item(
        loss_id="queue_cycle_excess",
        category="TIEMPO_PERDIDO",
        title="Colas y ciclos sobre umbral",
        loss_usd=loss_usd,
        lost_tonnes=lost_tonnes,
        lost_minutes=excess_minutes,
        confidence="BAJA" if missing_time > len(records) else confidence,
        evidence=[
            f"{round(excess_minutes)} minutos sobre umbral de ciclo",
            f"{missing_time} ciclos sin tiempos finos" if missing_time else "Tiempos finos disponibles para ciclos evaluados",
        ],
        recommendation="Reducir cola en carguio critico y validar asignacion de CAEX durante los proximos 30 minutos.",
        recovery_factor=0.68,
    )
    return item, equipment


def _standby_loss(
    current: dict[str, Any],
    forecast: dict[str, Any],
    economics: dict[str, Any],
    confidence: str,
) -> tuple[dict[str, Any] | None, dict[str, dict[str, Any]]]:
    inactive = int(current.get("caex_sin_actividad") or 0)
    possible_breakdown = int(current.get("caex_posible_averia") or 0)
    lost_minutes = inactive * 35 + possible_breakdown * 55
    equipment: dict[str, dict[str, Any]] = {}
    for row in current.get("caex_status", []):
        status = str(row.get("estado") or "").upper()
        if "OPERATIVO" in status and "POSIBLE" not in status:
            continue
        caex_id = str(row.get("caex_id") or "CAEX sin dato")
        minutes = float(row.get("minutos_sin_actividad") or 0)
        if minutes <= 0:
            minutes = 35.0
        equipment[caex_id] = {
            "equipment_id": caex_id,
            "loss_usd": minutes * _delay_cost_per_minute(),
            "lost_minutes": minutes,
            "sources": {"standby"},
        }

    if lost_minutes <= 0:
        return None, equipment
    lost_tonnes = lost_minutes * _tonnes_per_minute(current, forecast) * 0.45
    loss_usd = lost_minutes * _delay_cost_per_minute() + lost_tonnes * _margin_per_tonne(economics)
    item = _loss_item(
        loss_id="standby_low_availability",
        category="CAPACIDAD_NO_UTILIZADA",
        title="Standby y baja disponibilidad CAEX",
        loss_usd=loss_usd,
        lost_tonnes=lost_tonnes,
        lost_minutes=lost_minutes,
        confidence=confidence,
        evidence=[
            f"{inactive} CAEX sin actividad",
            f"{possible_breakdown} CAEX con posible averia",
        ],
        recommendation="Validar causa de inactividad, reasignar CAEX disponibles y separar falla real de espera operacional.",
        recovery_factor=0.58,
    )
    return item, equipment


def _low_utilization_loss(
    current: dict[str, Any],
    alerts: dict[str, Any],
    economics: dict[str, Any],
    confidence: str,
) -> tuple[dict[str, Any] | None, dict[str, dict[str, Any]]]:
    low_caex = alerts.get("low_caex") or []
    if not low_caex:
        return None, {}
    active_rows = [row for row in current.get("caex_status", []) if float(row.get("toneladas") or 0) > 0]
    avg_tonnes = sum(float(row.get("toneladas") or 0) for row in active_rows) / max(len(active_rows), 1)
    gap_tonnes = 0.0
    equipment: dict[str, dict[str, Any]] = {}
    for item in low_caex:
        caex_id = str(item.get("caex_id") or "CAEX baja utilizacion")
        tonnes = float(item.get("toneladas") or 0)
        gap = max(0.0, avg_tonnes - tonnes) * 0.28
        gap_tonnes += gap
        equipment[caex_id] = {
            "equipment_id": caex_id,
            "loss_usd": gap * _margin_per_tonne(economics),
            "lost_minutes": 25.0,
            "sources": {"baja utilizacion"},
        }
    minutes = len(low_caex) * 25.0
    loss_usd = gap_tonnes * _margin_per_tonne(economics) + minutes * _delay_cost_per_minute() * 0.45
    item = _loss_item(
        loss_id="low_caex_utilization",
        category="BAJO_RENDIMIENTO_RELATIVO",
        title="CAEX bajo rendimiento relativo",
        loss_usd=loss_usd,
        lost_tonnes=gap_tonnes,
        lost_minutes=minutes,
        confidence=confidence,
        evidence=[
            f"{len(low_caex)} CAEX bajo promedio del turno",
            f"Brecha potencial estimada: {round(gap_tonnes)} t",
        ],
        recommendation="Comparar asignacion, cola y destinos de los CAEX bajo promedio antes de sumar flota.",
        recovery_factor=0.52,
    )
    return item, equipment


def _loader_bottleneck_loss(
    current: dict[str, Any],
    forecast: dict[str, Any],
    economics: dict[str, Any],
    confidence: str,
) -> dict[str, Any] | None:
    loader = find_low_loading_unit(current)
    if not loader:
        return None
    loading_units = current.get("loading_units") or []
    avg_tph = sum(float(item.get("rendimiento_tph") or 0) for item in loading_units) / max(len(loading_units), 1)
    loader_tph = float(loader.get("rendimiento_tph") or 0)
    tph_gap = max(0.0, avg_tph - loader_tph)
    if tph_gap <= 0:
        return None
    elapsed_hours = max(1.0, float(current.get("elapsed_minutes") or 60) / 60.0)
    lost_tonnes = tph_gap * min(elapsed_hours, 4.0) * 0.4
    lost_minutes = min(180.0, tph_gap / max(avg_tph, 1.0) * elapsed_hours * 60.0)
    loss_usd = lost_tonnes * _margin_per_tonne(economics) + lost_minutes * _delay_cost_per_minute() * 0.35
    return _loss_item(
        loss_id="loading_unit_bottleneck",
        category="CUELLO_DE_BOTELLA",
        title=f"Bajo rendimiento en {loader.get('carguio_id', 'unidad de carguio')}",
        equipment_id=loader.get("carguio_id"),
        loss_usd=loss_usd,
        lost_tonnes=lost_tonnes,
        lost_minutes=lost_minutes,
        confidence=confidence,
        evidence=[
            f"Rendimiento unidad: {round(loader_tph, 1)} tph",
            f"Promedio carguio: {round(avg_tph, 1)} tph",
        ],
        recommendation="Revisar cola, frente, operador y malla de carguio para recuperar continuidad.",
        recovery_factor=0.5,
    )


def _destination_concentration_loss(
    alerts: dict[str, Any],
    forecast: dict[str, Any],
    economics: dict[str, Any],
    confidence: str,
) -> dict[str, Any] | None:
    destination_focus = find_destination_focus(alerts)
    if not destination_focus:
        return None
    pct = float(destination_focus.get("porcentaje") or 0)
    excess_pct = max(0.0, pct - 60.0)
    if excess_pct <= 0:
        return None
    forecast_tonnes = float(forecast.get("forecast") or forecast.get("actual") or 0)
    lost_tonnes = forecast_tonnes * (excess_pct / 100.0) * 0.025
    lost_minutes = excess_pct * 4.0
    loss_usd = lost_tonnes * _margin_per_tonne(economics) + lost_minutes * _delay_cost_per_minute() * 0.4
    destination = destination_name(destination_focus)
    return _loss_item(
        loss_id="destination_concentration",
        category="REDISTRIBUCION_DEFICIENTE",
        title=f"Concentracion alta hacia {destination}",
        loss_usd=loss_usd,
        lost_tonnes=lost_tonnes,
        lost_minutes=lost_minutes,
        confidence=confidence,
        evidence=[
            f"{destination} concentra {round(pct, 1)}% del flujo",
            f"Exceso sobre umbral operativo: {round(excess_pct, 1)} puntos",
        ],
        recommendation="Balancear destinos y validar restricciones aguas abajo antes de sostener la concentracion.",
        recovery_factor=0.47,
    )


def _aggregate_equipment(rows: list[dict[str, dict[str, Any]]]) -> list[dict[str, Any]]:
    aggregated: dict[str, dict[str, Any]] = {}
    for source in rows:
        for equipment_id, item in source.items():
            row = aggregated.setdefault(
                equipment_id,
                {"equipment_id": equipment_id, "loss_usd": 0.0, "lost_minutes": 0.0, "sources": set()},
            )
            row["loss_usd"] += float(item.get("loss_usd") or 0)
            row["lost_minutes"] += float(item.get("lost_minutes") or 0)
            row["sources"].update(item.get("sources") or [])
    result: list[dict[str, Any]] = []
    for item in aggregated.values():
        result.append(
            {
                "equipment_id": item["equipment_id"],
                "loss_usd": round(item["loss_usd"]),
                "lost_hours": round(item["lost_minutes"] / 60.0, 2),
                "sources": sorted(item["sources"]),
            }
        )
    return sorted(result, key=lambda item: item["loss_usd"], reverse=True)[:10]


def _assemble_response(
    *,
    data_source: str,
    source: str,
    mode: str,
    stale: bool,
    shift: dict[str, Any],
    losses: list[dict[str, Any]],
    by_equipment: list[dict[str, Any]],
    data_quality: dict[str, Any] | None,
    warnings: list[str],
) -> dict[str, Any]:
    losses = sorted(losses, key=lambda item: item["loss_usd"], reverse=True)
    primary = losses[0] if losses else {
        "id": "no_material_hidden_loss",
        "category": "SIN_PERDIDA_RELEVANTE",
        "title": "Sin perdida oculta relevante",
        "loss_usd": 0,
        "recoverable_usd": 0,
        "lost_tonnes": 0,
        "lost_hours": 0,
        "confidence": "MEDIA",
        "severity": "BAJA",
        "evidence": ["No se detectan brechas materiales con los datos disponibles."],
        "recommendation": "Mantener monitoreo y revisar calidad del dato.",
        "impact": {"fuel_liters": 0, "fuel_cost_usd": 0, "wear_cost_usd": 0},
    }
    total_loss = sum(int(item["loss_usd"]) for item in losses)
    recoverable = sum(int(item["recoverable_usd"]) for item in losses)
    potential_tonnes = sum(int(item["lost_tonnes"]) for item in losses)
    lost_hours = sum(float(item["lost_hours"]) for item in losses)
    confidence_order = {"BAJA": 0, "MEDIA": 1, "ALTA": 2}
    confidence = min((item["confidence"] for item in losses), key=lambda value: confidence_order.get(value, 1), default="MEDIA")

    return {
        "status": "STALE" if stale else "OK",
        "generated_at": _now_iso(),
        "api_version": HIDDEN_LOSSES_API_VERSION,
        "data_source": data_source,
        "source": source,
        "mode": mode,
        "is_demo": False,
        "stale": stale,
        "summary": {
            "hidden_loss_usd": total_loss,
            "recoverable_value_usd": recoverable,
            "potential_tonnes": potential_tonnes,
            "lost_hours": round(lost_hours, 2),
            "confidence": confidence,
            "primary_source": primary["title"],
            "primary_category": primary["category"],
            "primary_recommendation": primary["recommendation"],
        },
        "primary_source": primary,
        "losses": losses,
        "by_equipment": by_equipment,
        "recommendations": [
            {
                "title": item["recommendation"],
                "source_loss_id": item["id"],
                "recoverable_usd": item["recoverable_usd"],
                "confidence": item["confidence"],
            }
            for item in losses[:4]
        ],
        "insights": [
            "La perdida oculta combina tiempo improductivo, capacidad no utilizada y brechas relativas que no siempre aparecen en KPI de toneladas.",
            f"Principal fuente detectada: {primary['title']}.",
            f"Valor recuperable estimado: USD {recoverable:,.0f}.",
        ],
        "assumptions": {
            "delay_cost_usd_per_min": _delay_cost_per_minute(),
            "value_per_tonne_usd": _float_env("NORTHMINE_VALUE_PER_TONNE_USD", 4.5),
            "fuel_liters_per_tonne": _float_env("NORTHMINE_FUEL_LITERS_PER_TONNE", 0.52),
            "scope": "current_shift_hidden_losses",
        },
        "data_quality": data_quality,
        "warnings": warnings,
        "refresh_policy": {
            "analytics_seconds": 300,
            "heavy_analysis_seconds": 900,
        },
        "shift": shift,
    }


def build_hidden_losses_response(
    dataset: dict[str, Any] | None,
    *,
    demo_mode: bool,
    selected_date: str | None = None,
    selected_shift: str | None = None,
) -> dict[str, Any]:
    if demo_mode:
        raise ValueError("Modo demo deshabilitado: Hidden Loss Detector solo acepta datos reales WENCO.")
    if dataset is None:
        raise ValueError("Dataset operacional requerido cuando NORTHMINE_DEMO_MODE=false")

    current = build_current_shift_command_center(dataset, turno=selected_shift, fecha=selected_date)
    alerts = build_operational_alerts(dataset)
    stale = bool(dataset.get("stale") or current.get("stale"))
    forecast = build_forecast_summary(current)
    records = current_shift_records(dataset, current["fecha"], current["turno"])
    delays = build_delay_breakdown(records, current)
    economics, economics_warnings = build_economics(
        forecast["actual"],
        forecast["forecast"],
        forecast["target"],
        delays,
    )
    data_quality = build_data_quality(dataset, current, records, stale)
    confidence = _confidence(data_quality.get("score"), len(records))

    losses: list[dict[str, Any]] = []
    equipment_maps: list[dict[str, dict[str, Any]]] = []
    queue_loss, queue_equipment = _queue_loss(records, current, forecast, economics, confidence)
    if queue_loss:
        losses.append(queue_loss)
    equipment_maps.append(queue_equipment)
    standby_loss, standby_equipment = _standby_loss(current, forecast, economics, confidence)
    if standby_loss:
        losses.append(standby_loss)
    equipment_maps.append(standby_equipment)
    low_utilization_loss, low_utilization_equipment = _low_utilization_loss(current, alerts, economics, confidence)
    if low_utilization_loss:
        losses.append(low_utilization_loss)
    equipment_maps.append(low_utilization_equipment)
    loader_loss = _loader_bottleneck_loss(current, forecast, economics, confidence)
    if loader_loss:
        losses.append(loader_loss)
    destination_loss = _destination_concentration_loss(alerts, forecast, economics, confidence)
    if destination_loss:
        losses.append(destination_loss)

    warnings = list(economics_warnings)
    if stale:
        warnings.append("Datos WENCO servidos desde cache: validar frescura antes de accionar perdidas ocultas.")
    if data_quality.get("cycles_with_time", 0) < data_quality.get("cycles_total", 0):
        warnings.append("Parte de los ciclos no incluye tiempos finos; algunas perdidas se estiman con menor confianza.")

    return _assemble_response(
        data_source="REAL",
        source=dataset.get("source", "wenco-sql-live"),
        mode="CACHE" if stale else "DATOS_REALES",
        stale=stale,
        shift={
            "name": current.get("shift_label") or f"Turno {current['turno']}",
            "date": current["fecha"],
            "started_at": current.get("started_at"),
            "ends_at": current.get("ends_at"),
            "current_time": current.get("current_time"),
        },
        losses=losses,
        by_equipment=_aggregate_equipment(equipment_maps),
        data_quality=data_quality,
        warnings=warnings,
    )
