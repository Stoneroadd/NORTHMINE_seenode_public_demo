from __future__ import annotations

from typing import Any


def calculate_non_compliance_risk(
    actual: int,
    forecast: int,
    target: int,
    meta_configured: bool,
) -> float:
    if not meta_configured or target <= 0:
        return 0.0
    if forecast >= target:
        buffer = (forecast - target) / max(target, 1)
        return round(max(0.05, 0.22 - buffer), 2)
    gap_ratio = (target - forecast) / max(target, 1)
    elapsed_penalty = 0.18 if actual < target * 0.55 else 0.08
    return round(min(0.95, 0.42 + gap_ratio * 3.4 + elapsed_penalty), 2)


def build_forecast_summary(current: dict[str, Any]) -> dict[str, Any]:
    projection = current["projection"]
    actual = int(current.get("toneladas_turno") or 0)
    forecast = int(projection.get("proyeccion_final") or 0)
    target = int(projection.get("meta_turno") or 0)
    meta_configured = bool(current.get("meta_configurada"))
    compliance_pct = round(actual / target * 100, 1) if target else 0.0
    return {
        "actual": actual,
        "forecast": forecast,
        "target": target,
        "daily_target": int(current.get("daily_target_tonnes") or 0),
        "target_source": current.get("meta_source") or "SIN_META",
        "compliance_pct": compliance_pct,
        "meta_configured": meta_configured,
        "risk": calculate_non_compliance_risk(actual, forecast, target, meta_configured),
    }


def calculate_health_score(
    risk: float,
    alerts: dict[str, Any],
    current: dict[str, Any],
    stale: bool,
) -> int:
    score = 100
    score -= round(risk * 26)
    counts = alerts.get("counts", {})
    score -= min(18, int(counts.get("CRITICA", 0)) * 6 + int(counts.get("ALTA", 0)) * 3)
    score -= min(
        14,
        int(current.get("caex_sin_actividad") or 0) * 2
        + int(current.get("caex_posible_averia") or 0) * 5,
    )
    if stale:
        score -= 8
    return max(35, min(100, score))


def health_state(score: int, stale: bool) -> str:
    if stale:
        return "CACHE"
    if score >= 88:
        return "NORMAL"
    if score >= 70:
        return "ATENCION"
    return "CRITICO"
