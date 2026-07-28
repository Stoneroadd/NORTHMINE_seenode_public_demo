from __future__ import annotations

import os
from typing import Any


def _float_env(name: str, default: float) -> float:
    raw = os.getenv(name, "").strip()
    if not raw:
        return default
    try:
        return float(raw)
    except ValueError:
        return default


def build_delay_breakdown(records: list[dict[str, Any]], current: dict[str, Any]) -> list[dict[str, Any]]:
    empty_loss = 0.0
    loaded_loss = 0.0
    missing_time = 0
    for record in records:
        empty_min = record.get("tiempo_vacio_min")
        loaded_min = record.get("tiempo_cargado_min")
        if isinstance(empty_min, (int, float)):
            empty_loss += max(0.0, float(empty_min) - 8.0)
        else:
            missing_time += 1
        if isinstance(loaded_min, (int, float)):
            loaded_loss += max(0.0, float(loaded_min) - 12.0)
        else:
            missing_time += 1
    standby_loss = (int(current.get("caex_sin_actividad") or 0) * 35) + (
        int(current.get("caex_posible_averia") or 0) * 55
    )
    delays = [
        {"type": "Cola/traslado vacio", "minutes": round(empty_loss)},
        {"type": "Tramo cargado sobre umbral", "minutes": round(loaded_loss)},
        {"type": "Standby o baja disponibilidad", "minutes": standby_loss},
    ]
    if missing_time:
        delays.append({"type": "Ciclos sin tiempos finos", "minutes": missing_time})
    return [item for item in delays if item["minutes"] > 0] or [{"type": "Sin demoras relevantes", "minutes": 0}]


def build_economics(
    total_tons: int,
    forecast: int,
    target: int,
    delays: list[dict[str, Any]],
) -> tuple[dict[str, Any], list[str]]:
    warnings: list[str] = []
    cost_per_tonne = _float_env("NORTHMINE_COST_PER_TONNE_USD", 3.07)
    fuel_cost_per_liter = _float_env("NORTHMINE_FUEL_COST_USD_PER_LITER", 1.35)
    total_cost = round(total_tons * cost_per_tonne)
    delayed_minutes = sum(int(item.get("minutes") or 0) for item in delays)
    loss_from_delay = delayed_minutes * _float_env("NORTHMINE_DELAY_COST_USD_PER_MIN", 85.0)
    gap_loss = max(target - forecast, 0) * cost_per_tonne if target > 0 else 0
    estimated_loss = round(loss_from_delay + gap_loss * 0.25)
    potential_loss = round(estimated_loss + gap_loss * 0.35)
    fuel_liters = round(total_tons * _float_env("NORTHMINE_FUEL_LITERS_PER_TONNE", 0.52))
    warnings.append(
        "Costos calculados en backend con supuestos configurables; conectar fuente economica real para auditoria financiera."
    )
    return (
        {
            "total_cost_usd": total_cost,
            "cost_per_tonne_usd": round(cost_per_tonne, 2),
            "estimated_loss_usd": estimated_loss,
            "potential_close_loss_usd": potential_loss,
            "fuel_liters": fuel_liters,
            "fuel_cost_usd": round(fuel_liters * fuel_cost_per_liter),
            "source": "backend-estimated",
        },
        warnings,
    )


def build_scenario_table(
    forecast: int,
    target: int,
    economics: dict[str, Any],
    recommendation: dict[str, Any],
    risk: float,
) -> list[dict[str, Any]]:
    cost_per_tonne = float(economics["cost_per_tonne_usd"])
    recommended_tons = forecast + int(recommendation["impact_tons"])
    added_tons = forecast + max(700, round(int(recommendation["impact_tons"]) * 1.25))
    return [
        {
            "scenario": "Actual",
            "tons": forecast,
            "cost": round(forecast * cost_per_tonne),
            "cost_per_tonne": round(cost_per_tonne, 2),
            "risk": "Alto" if risk >= 0.7 else "Medio" if risk >= 0.4 else "Bajo",
            "value": "Base",
        },
        {
            "scenario": "Redistribuir CAEX",
            "tons": recommended_tons,
            "cost": round(recommended_tons * max(cost_per_tonne - 0.12, 0.1)),
            "cost_per_tonne": round(max(cost_per_tonne - 0.12, 0.1), 2),
            "risk": "Medio" if target and recommended_tons < target else "Bajo",
            "value": "Mejor",
        },
        {
            "scenario": "Agregar 1 CAEX",
            "tons": added_tons,
            "cost": round(added_tons * (cost_per_tonne + 0.18)),
            "cost_per_tonne": round(cost_per_tonne + 0.18, 2),
            "risk": "Medio" if target and added_tons < target else "Bajo",
            "value": "Menor margen",
        },
    ]
