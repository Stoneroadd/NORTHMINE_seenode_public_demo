from __future__ import annotations

import os
from datetime import datetime
from typing import Any

from app.services.action_service import build_cause_breakdown, build_recommendation
from app.services.data_quality_service import build_data_quality
from app.services.economics_service import build_delay_breakdown, build_economics
from app.services.equipment_service import (
    current_shift_records,
    find_destination_focus,
    find_low_loading_unit,
)
from app.services.forecast_service import build_forecast_summary
from app.services.kpis import build_current_shift_command_center, build_operational_alerts


PROFIT_OPTIMIZATION_API_VERSION = "v1"


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


def _clamp(value: float, minimum: float, maximum: float) -> float:
    return max(minimum, min(maximum, value))


def _risk_label(risk: float) -> str:
    if risk >= 0.7:
        return "Alto"
    if risk >= 0.4:
        return "Medio"
    return "Bajo"


def _confidence_factor(confidence: str) -> float:
    return {"ALTA": 1.0, "MEDIA": 0.84, "BAJA": 0.66}.get(confidence.upper(), 0.76)


def _feasibility_factor(feasibility: str) -> float:
    return {"ALTA": 1.0, "MEDIA": 0.88, "BAJA": 0.68}.get(feasibility.upper(), 0.8)


def _risk_for_scenario(base_risk: float, target: int, tonnes: int, adjustment: float) -> float:
    risk = _clamp(base_risk + adjustment, 0.02, 0.95)
    if target > 0 and tonnes >= target:
        risk = min(risk, 0.24)
    return round(risk, 2)


def _scenario(
    *,
    scenario_id: str,
    name: str,
    description: str,
    baseline_tonnes: int,
    baseline_value: int | None,
    production_delta: int,
    base_cost_per_tonne: float,
    cost_per_tonne_delta: float,
    fixed_cost_usd: int,
    estimated_losses_usd: int,
    loss_multiplier: float,
    base_risk: float,
    risk_adjustment: float,
    target_tonnes: int,
    value_per_tonne_usd: float,
    confidence: str,
    feasibility: str,
    tradeoff: str,
) -> dict[str, Any]:
    tonnes = max(0, baseline_tonnes + production_delta)
    direct_cost_per_tonne = max(0.1, base_cost_per_tonne + cost_per_tonne_delta)
    total_cost = round(tonnes * direct_cost_per_tonne + fixed_cost_usd)
    cost_per_tonne = total_cost / max(tonnes, 1)
    losses = round(max(0, estimated_losses_usd * loss_multiplier))
    risk = _risk_for_scenario(base_risk, target_tonnes, tonnes, risk_adjustment)
    gross_value = round(tonnes * value_per_tonne_usd)
    gross_margin = gross_value - total_cost
    risk_penalty = round(max(0, gross_margin) * risk * _float_env("NORTHMINE_RISK_PENALTY_FACTOR", 0.34))
    risk_adjusted_value = round(
        (gross_margin - losses - risk_penalty)
        * _confidence_factor(confidence)
        * _feasibility_factor(feasibility)
    )

    return {
        "id": scenario_id,
        "name": name,
        "description": description,
        "production_tonnes": tonnes,
        "production_delta_tonnes": production_delta,
        "total_cost_usd": total_cost,
        "cost_delta_usd": 0,
        "cost_per_tonne_usd": round(cost_per_tonne, 2),
        "estimated_losses_usd": losses,
        "loss_delta_usd": 0,
        "gross_margin_usd": gross_margin,
        "margin_per_tonne_usd": round(gross_margin / max(tonnes, 1), 2),
        "risk": risk,
        "risk_label": _risk_label(risk),
        "risk_penalty_usd": risk_penalty,
        "risk_adjusted_value_usd": risk_adjusted_value,
        "value_delta_usd": 0 if baseline_value is None else risk_adjusted_value - baseline_value,
        "confidence": confidence,
        "feasibility": feasibility,
        "tradeoff": tradeoff,
    }


def _normalize_deltas(scenarios: list[dict[str, Any]]) -> list[dict[str, Any]]:
    baseline = scenarios[0]
    baseline_cost = int(baseline["total_cost_usd"])
    baseline_loss = int(baseline["estimated_losses_usd"])
    baseline_value = int(baseline["risk_adjusted_value_usd"])
    for item in scenarios:
        item["cost_delta_usd"] = int(item["total_cost_usd"]) - baseline_cost
        item["loss_delta_usd"] = int(item["estimated_losses_usd"]) - baseline_loss
        item["value_delta_usd"] = int(item["risk_adjusted_value_usd"]) - baseline_value
    return scenarios


def _best_ids(scenarios: list[dict[str, Any]]) -> dict[str, str]:
    return {
        "highest_production": max(scenarios, key=lambda item: item["production_tonnes"])["id"],
        "lowest_cost": min(scenarios, key=lambda item: item["total_cost_usd"])["id"],
        "lowest_cost_per_tonne": min(scenarios, key=lambda item: item["cost_per_tonne_usd"])["id"],
        "highest_margin": max(scenarios, key=lambda item: item["gross_margin_usd"])["id"],
        "highest_risk_adjusted_value": max(scenarios, key=lambda item: item["risk_adjusted_value_usd"])["id"],
    }


def _build_scenarios(
    *,
    baseline_tonnes: int,
    target_tonnes: int,
    cost_per_tonne: float,
    estimated_losses_usd: int,
    base_risk: float,
    recommendation: dict[str, Any],
    low_caex_count: int,
    inactive_caex: int,
    possible_breakdown: int,
) -> list[dict[str, Any]]:
    value_per_tonne = _float_env("NORTHMINE_VALUE_PER_TONNE_USD", 4.5)
    impact_tonnes = int(recommendation.get("impact_tons") or 0)
    redistribution_delta = max(450, impact_tonnes)
    standby_delta = max(300, round(redistribution_delta * 0.55))
    added_caex_delta = max(redistribution_delta + 700, round(redistribution_delta * 1.35))
    cost_focus_delta = -max(180, round(baseline_tonnes * 0.002))
    redistribution_feasibility = "ALTA" if low_caex_count or inactive_caex else "MEDIA"
    standby_feasibility = "MEDIA" if possible_breakdown else "ALTA"

    scenarios = [
        _scenario(
            scenario_id="current",
            name="Actual",
            description="Continuar con la configuracion operacional observada.",
            baseline_tonnes=baseline_tonnes,
            baseline_value=None,
            production_delta=0,
            base_cost_per_tonne=cost_per_tonne,
            cost_per_tonne_delta=0,
            fixed_cost_usd=0,
            estimated_losses_usd=estimated_losses_usd,
            loss_multiplier=1.0,
            base_risk=base_risk,
            risk_adjustment=0,
            target_tonnes=target_tonnes,
            value_per_tonne_usd=value_per_tonne,
            confidence="MEDIA",
            feasibility="ALTA",
            tradeoff="Base operacional sin intervencion adicional.",
        ),
        _scenario(
            scenario_id="redistribute_caex",
            name="Redistribuir CAEX",
            description="Mover CAEX subutilizados hacia el frente con mejor retorno esperado.",
            baseline_tonnes=baseline_tonnes,
            baseline_value=None,
            production_delta=redistribution_delta,
            base_cost_per_tonne=cost_per_tonne,
            cost_per_tonne_delta=-0.12,
            fixed_cost_usd=0,
            estimated_losses_usd=estimated_losses_usd,
            loss_multiplier=0.62,
            base_risk=base_risk,
            risk_adjustment=-0.26,
            target_tonnes=target_tonnes,
            value_per_tonne_usd=value_per_tonne,
            confidence=str(recommendation.get("confidence") or "MEDIA"),
            feasibility=redistribution_feasibility,
            tradeoff="Mejora valor sin agregar flota; requiere control de cola posterior a la reasignacion.",
        ),
        _scenario(
            scenario_id="reduce_standby_queue",
            name="Reducir standby y colas",
            description="Atacar esperas, standby y baja continuidad antes de sumar recursos.",
            baseline_tonnes=baseline_tonnes,
            baseline_value=None,
            production_delta=standby_delta,
            base_cost_per_tonne=cost_per_tonne,
            cost_per_tonne_delta=-0.07,
            fixed_cost_usd=0,
            estimated_losses_usd=estimated_losses_usd,
            loss_multiplier=0.72,
            base_risk=base_risk,
            risk_adjustment=-0.18,
            target_tonnes=target_tonnes,
            value_per_tonne_usd=value_per_tonne,
            confidence="MEDIA",
            feasibility=standby_feasibility,
            tradeoff="Recupera perdidas operacionales, con impacto menor en toneladas que la redistribucion.",
        ),
        _scenario(
            scenario_id="add_caex",
            name="Agregar 1 CAEX",
            description="Aumentar capacidad de transporte para maximizar toneladas de cierre.",
            baseline_tonnes=baseline_tonnes,
            baseline_value=None,
            production_delta=added_caex_delta,
            base_cost_per_tonne=cost_per_tonne,
            cost_per_tonne_delta=max(0.35, cost_per_tonne * 0.12),
            fixed_cost_usd=round(max(9000, baseline_tonnes * 0.075)),
            estimated_losses_usd=estimated_losses_usd,
            loss_multiplier=0.9,
            base_risk=base_risk,
            risk_adjustment=-0.14,
            target_tonnes=target_tonnes,
            value_per_tonne_usd=value_per_tonne,
            confidence="MEDIA",
            feasibility="MEDIA",
            tradeoff="Puede producir mas toneladas, pero sube costo por tonelada y reduce margen.",
        ),
        _scenario(
            scenario_id="cost_discipline",
            name="Modo costo disciplinado",
            description="Priorizar menor costo por tonelada frente a maximizar volumen.",
            baseline_tonnes=baseline_tonnes,
            baseline_value=None,
            production_delta=cost_focus_delta,
            base_cost_per_tonne=cost_per_tonne,
            cost_per_tonne_delta=-0.16,
            fixed_cost_usd=0,
            estimated_losses_usd=estimated_losses_usd,
            loss_multiplier=0.82,
            base_risk=base_risk,
            risk_adjustment=0.04,
            target_tonnes=target_tonnes,
            value_per_tonne_usd=value_per_tonne,
            confidence="MEDIA",
            feasibility="ALTA",
            tradeoff="Reduce costo unitario, pero puede aumentar riesgo de incumplimiento si la brecha a meta es alta.",
        ),
    ]
    return _normalize_deltas(scenarios)


def _insights(scenarios: list[dict[str, Any]], best: dict[str, str]) -> list[str]:
    by_id = {item["id"]: item for item in scenarios}
    insights = [
        f"Mayor valor ajustado por riesgo: {by_id[best['highest_risk_adjusted_value']]['name']}.",
        f"Menor costo por tonelada: {by_id[best['lowest_cost_per_tonne']]['name']}.",
        f"Mayor produccion: {by_id[best['highest_production']]['name']}.",
        f"Mayor margen bruto: {by_id[best['highest_margin']]['name']}.",
    ]
    if best["highest_production"] != best["highest_risk_adjusted_value"]:
        insights.insert(
            1,
            "La configuracion de mayor produccion no es necesariamente la mas rentable al ajustar por costo, riesgo y factibilidad.",
        )
    return insights


def _response_from_context(
    *,
    data_source: str,
    source: str,
    mode: str,
    stale: bool,
    shift: dict[str, Any],
    production: dict[str, Any],
    economics: dict[str, Any],
    recommendation: dict[str, Any],
    data_quality: dict[str, Any] | None,
    warnings: list[str],
    low_caex_count: int,
    inactive_caex: int,
    possible_breakdown: int,
) -> dict[str, Any]:
    baseline_tonnes = int(production.get("forecast_tonnes") or production.get("actual_tonnes") or 0)
    target_tonnes = int(production.get("target_tonnes") or 0)
    cost_per_tonne = float(economics.get("cost_per_tonne_usd") or 0)
    estimated_losses = int(economics.get("estimated_loss_usd") or 0)
    base_risk = float(production.get("non_compliance_risk") or 0)
    scenarios = _build_scenarios(
        baseline_tonnes=baseline_tonnes,
        target_tonnes=target_tonnes,
        cost_per_tonne=cost_per_tonne,
        estimated_losses_usd=estimated_losses,
        base_risk=base_risk,
        recommendation=recommendation,
        low_caex_count=low_caex_count,
        inactive_caex=inactive_caex,
        possible_breakdown=possible_breakdown,
    )
    best = _best_ids(scenarios)
    best_scenario = next(item for item in scenarios if item["id"] == best["highest_risk_adjusted_value"])

    return {
        "status": "STALE" if stale else "OK",
        "generated_at": _now_iso(),
        "api_version": PROFIT_OPTIMIZATION_API_VERSION,
        "data_source": data_source,
        "source": source,
        "mode": mode,
        "is_demo": False,
        "stale": stale,
        "objective": "MAX_RISK_ADJUSTED_VALUE",
        "shift": shift,
        "baseline": {
            "production_tonnes": baseline_tonnes,
            "target_tonnes": target_tonnes,
            "cost_per_tonne_usd": round(cost_per_tonne, 2),
            "estimated_losses_usd": estimated_losses,
            "non_compliance_risk": round(base_risk, 2),
        },
        "best_scenario_id": best_scenario["id"],
        "recommendation": {
            "title": best_scenario["name"],
            "summary": best_scenario["description"],
            "best_scenario_id": best_scenario["id"],
            "why": best_scenario["tradeoff"],
            "confidence": best_scenario["confidence"],
            "feasibility": best_scenario["feasibility"],
            "risk_adjusted_value_usd": best_scenario["risk_adjusted_value_usd"],
            "value_delta_usd": best_scenario["value_delta_usd"],
        },
        "best": best,
        "scenarios": scenarios,
        "ranking": sorted(
            [
                {
                    "scenario_id": item["id"],
                    "name": item["name"],
                    "risk_adjusted_value_usd": item["risk_adjusted_value_usd"],
                    "rank_metric": "risk_adjusted_value_usd",
                }
                for item in scenarios
            ],
            key=lambda item: item["risk_adjusted_value_usd"],
            reverse=True,
        ),
        "insights": _insights(scenarios, best),
        "assumptions": {
            "value_per_tonne_usd": _float_env("NORTHMINE_VALUE_PER_TONNE_USD", 4.5),
            "risk_penalty_factor": _float_env("NORTHMINE_RISK_PENALTY_FACTOR", 0.34),
            "cost_source": economics.get("source", "backend-estimated"),
            "optimization_scope": "current_shift_close_projection",
        },
        "data_quality": data_quality,
        "warnings": warnings,
        "refresh_policy": {
            "analytics_seconds": 300,
            "simulation": "on_demand",
        },
    }


def build_profit_optimization_response(
    dataset: dict[str, Any] | None,
    *,
    demo_mode: bool,
    selected_date: str | None = None,
    selected_shift: str | None = None,
) -> dict[str, Any]:
    if demo_mode:
        raise ValueError("Modo demo deshabilitado: Profit Optimization solo acepta datos reales WENCO.")
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
    destination_focus = find_destination_focus(alerts)
    low_loader = find_low_loading_unit(current)
    causes = build_cause_breakdown(current, alerts, destination_focus, low_loader)
    recommendation = build_recommendation(current, causes, alerts, economics)
    data_quality = build_data_quality(dataset, current, records, stale)

    warnings = list(economics_warnings)
    if not forecast["meta_configured"]:
        warnings.append("Meta de turno no configurada; ranking economico se calcula sin penalizacion fuerte por brecha a meta.")
    if stale:
        warnings.append("Datos WENCO servidos desde cache: validar frescura antes de ejecutar cambios operacionales.")

    return _response_from_context(
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
        production={
            "actual_tonnes": forecast["actual"],
            "forecast_tonnes": forecast["forecast"],
            "target_tonnes": forecast["target"],
            "non_compliance_risk": forecast["risk"],
        },
        economics=economics,
        recommendation=recommendation,
        data_quality=data_quality,
        warnings=warnings,
        low_caex_count=len(alerts.get("low_caex") or []),
        inactive_caex=int(current.get("caex_sin_actividad") or 0),
        possible_breakdown=int(current.get("caex_posible_averia") or 0),
    )
