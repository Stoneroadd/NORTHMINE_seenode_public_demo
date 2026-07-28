from __future__ import annotations

from typing import Any


def _ols_fit(points: list[tuple[float, float]]) -> tuple[float, float, float]:
    """Ajuste por minimos cuadrados ordinarios: y = a + b*x.

    Devuelve (intercepto, pendiente, r2). Implementado en Python puro
    (sin numpy/sklearn) porque con ~12 puntos por turno el costo de una
    dependencia adicional no se justifica.
    """
    n = len(points)
    mean_x = sum(x for x, _ in points) / n
    mean_y = sum(y for _, y in points) / n
    ss_xx = sum((x - mean_x) ** 2 for x, _ in points)
    if ss_xx <= 0:
        return mean_y, 0.0, 0.0
    ss_xy = sum((x - mean_x) * (y - mean_y) for x, y in points)
    b = ss_xy / ss_xx
    a = mean_y - b * mean_x
    ss_tot = sum((y - mean_y) ** 2 for _, y in points)
    if ss_tot <= 0:
        return a, b, 1.0
    ss_res = sum((y - (a + b * x)) ** 2 for x, y in points)
    return a, b, 1 - ss_res / ss_tot


def forecast_shift_total(
    points: list[tuple[float, float]],
    current_total: int,
    elapsed_minutes: int,
    shift_minutes: int = 720,
    min_elapsed_fraction: float = 0.08,
) -> dict[str, Any]:
    """Proyecta el cierre de turno ajustando una regresion lineal sobre el
    avance acumulado real, en vez de asumir un ritmo constante desde el
    minuto cero del turno.

    `points` son pares (minuto_transcurrido, toneladas_acumuladas) de las
    horas ya cerradas del turno mas, si corresponde, la hora en curso. Con
    menos de 3 puntos distintos no hay señal suficiente para ajustar una
    tendencia: se degrada al ritmo promedio (mismo comportamiento que el
    calculo anterior), que sigue siendo la base del blend cuando el ajuste
    es poco confiable (r2 bajo).
    """
    elapsed_fraction = max(elapsed_minutes / shift_minutes, min_elapsed_fraction)
    naive_projection = current_total / elapsed_fraction
    trend_tph = round(current_total / max(elapsed_minutes / 60, 0.25), 1)

    unique_x = {x for x, _ in points}
    if len(unique_x) < 3:
        return {
            "value": int(round(naive_projection)),
            "model": "ritmo_promedio_turno",
            "r2": None,
            "n_points": len(unique_x),
            "trend_tph": trend_tph,
        }

    intercept, slope, r2 = _ols_fit(points)
    regression_projection = intercept + slope * shift_minutes
    confidence = max(0.15, min(0.85, r2)) if r2 > 0 else 0.15
    blended = confidence * regression_projection + (1 - confidence) * naive_projection
    value = max(current_total, int(round(blended)))
    return {
        "value": value,
        "model": "regresion_lineal_ols",
        "r2": round(max(0.0, r2), 3),
        "n_points": len(unique_x),
        "trend_tph": round(slope * 60, 1),
    }


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
