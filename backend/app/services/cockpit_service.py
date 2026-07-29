from __future__ import annotations

from datetime import datetime
from typing import Any

from app.services.action_service import build_cause_breakdown, build_happening, build_recommendation
from app.services.data_quality_service import build_data_quality
from app.services.economics_service import build_delay_breakdown, build_economics, build_scenario_table
from app.services.equipment_service import (
    build_caex_status,
    build_destinations,
    build_loader_hourly,
    build_shovels,
    calculate_availability,
    calculate_average_caex_in_circuit,
    current_shift_records,
    find_destination_focus,
    find_low_loading_unit,
)
from app.services.forecast_service import build_forecast_summary, calculate_health_score, health_state
from app.services.kpis import build_current_shift_command_center, build_operational_alerts, build_summary


COCKPIT_API_VERSION = "v1"


def _now_iso() -> str:
    return datetime.now().isoformat(timespec="seconds")


def _build_warnings(meta_configured: bool, stale: bool, economics_warnings: list[str]) -> list[str]:
    warnings = list(economics_warnings)
    if not meta_configured:
        warnings.append(
            "Meta de turno no configurada; riesgo de incumplimiento se informa como 0 hasta definir NORTHMINE_SHIFT_TARGET_TONS."
        )
    if stale:
        warnings.append("Datos WENCO servidos desde cache: revisar ultima actualizacion antes de ejecutar decisiones.")
    return warnings


def build_cockpit_response(
    dataset: dict[str, Any] | None,
    *,
    demo_mode: bool,
    selected_date: str | None = None,
    selected_shift: str | None = None,
) -> dict[str, Any]:
    if demo_mode:
        raise ValueError("Modo demo deshabilitado: el Cockpit solo acepta datos reales WENCO.")
    if dataset is None:
        raise ValueError("Dataset operacional requerido cuando NORTHMINE_DEMO_MODE=false")

    current = build_current_shift_command_center(dataset, turno=selected_shift, fecha=selected_date)
    summary = build_summary(dataset)
    alerts = build_operational_alerts(dataset)
    stale = bool(dataset.get("stale") or current.get("stale"))

    forecast = build_forecast_summary(current)
    records = current_shift_records(dataset, current["fecha"], current["turno"])
    delays = build_delay_breakdown(records, current)
    average_caex_in_circuit = calculate_average_caex_in_circuit(records)
    economics, economics_warnings = build_economics(
        forecast["actual"],
        forecast["forecast"],
        forecast["target"],
        delays,
    )

    destination_focus = find_destination_focus(alerts)
    low_loader = find_low_loading_unit(current)
    causes = build_cause_breakdown(current, alerts, destination_focus, low_loader)
    recommendation = build_recommendation(current, causes, alerts, economics)
    score = calculate_health_score(forecast["risk"], alerts, current, stale)
    data_quality = build_data_quality(dataset, current, records, stale)
    last_record_at = data_quality.get("last_record_at")
    last_record_age_min = data_quality.get("last_record_age_min")
    data_freshness_seconds = (
        int(last_record_age_min * 60)
        if isinstance(last_record_age_min, (int, float))
        else None
    )

    return {
        "status": "STALE" if stale else "OK",
        "generated_at": _now_iso(),
        "api_version": COCKPIT_API_VERSION,
        "data_source": "REAL",
        "source_system": "WENCO",
        "source": dataset.get("source", "wenco-sql-live"),
        "mode": "CACHE" if stale else "DATOS_REALES",
        "backend_status": "CONNECTED",
        "data_source_status": "STALE" if stale else "CONNECTED",
        "selected_date": current["fecha"],
        "selected_shift": current["turno"],
        "last_real_record": last_record_at,
        "data_freshness_seconds": data_freshness_seconds,
        "is_demo": False,
        "stale": stale,
        "shift": {
            "name": current.get("shift_label") or f"Turno {current['turno']}",
            "date": current["fecha"],
            "started_at": current.get("started_at"),
            "ends_at": current.get("ends_at"),
            "current_time": current.get("current_time"),
            "elapsed_minutes": current.get("elapsed_minutes"),
            "elapsed_pct": current.get("elapsed_pct"),
        },
        "health": {"score": score, "state": health_state(score, stale)},
        "production": {
            "actual_tonnes": forecast["actual"],
            "forecast_tonnes": forecast["forecast"],
            "target_tonnes": forecast["target"],
            "daily_target_tonnes": forecast["daily_target"],
            "target_source": forecast["target_source"],
            "non_compliance_risk": forecast["risk"],
            "cycles": int(current.get("ciclos") or 0),
            "caex_active": int(current.get("caex_activos") or 0),
            "caex_inactive": int(current.get("caex_sin_actividad") or 0),
            "caex_possible_breakdown": int(current.get("caex_posible_averia") or 0),
            "avg_tonnes_per_cycle": float(current.get("promedio_ton_ciclo") or 0),
            "avg_caex_in_circuit": average_caex_in_circuit,
            "compliance_pct": forecast["compliance_pct"],
            "sectors": current.get("sector_breakdown") or [],
        },
        "economics": economics,
        "main_cause": causes[0],
        "why": causes,
        "happening": build_happening(current, alerts, destination_focus, low_loader),
        "recommendation": recommendation,
        "scenarios": build_scenario_table(
            forecast["forecast"],
            forecast["target"],
            economics,
            recommendation,
            forecast["risk"],
        ),
        "warnings": _build_warnings(forecast["meta_configured"], stale, economics_warnings),
        "confidence": recommendation["confidence"],
        "refresh_policy": {
            "kpis_seconds": 60,
            "analytics_seconds": 300,
            "heavy_analysis_seconds": 900,
            "simulation": "on_demand",
        },
        "hourly_production": [
            {
                "hour": item["label"],
                "tons": int(item["toneladas"]),
                "cycles": int(item.get("ciclos") or 0),
                "tonnes_per_cycle": float(item.get("promedio_ton_ciclo") or 0),
                "accumulated": int(item.get("acumulado") or 0),
            }
            for item in current.get("hourly", [])
        ],
        "loader_hourly": build_loader_hourly(current),
        "caex_status": build_caex_status(current),
        "delays": delays,
        "shovels": build_shovels(current, records),
        "destinations": build_destinations(summary, alerts),
        "events": [
            item.get("titulo") or item.get("descripcion") or "Alerta operacional"
            for item in alerts.get("items", [])[:5]
        ],
        "operational_alerts": {
            "counts": alerts.get("counts", {}),
            "items": alerts.get("items", [])[:10],
            "low_caex": alerts.get("low_caex", [])[:10],
        },
        "data_quality": data_quality,
        "availability": calculate_availability(current),
    }
