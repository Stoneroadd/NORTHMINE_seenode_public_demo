from __future__ import annotations

from typing import Any


SCORE_WEIGHTS = {
    "productividad_score": 0.35,
    "disponibilidad_score": 0.25,
    "utilizacion_score": 0.20,
    "control_demoras_score": 0.15,
    "seguridad_score": 0.05,
}

MANAGEABLE_DELAY_THRESHOLDS = {
    "O01 Cambio de Turno": {"expected": (20, 35), "alert": 45},
    "O02 Colacion": {"expected": (45, 65), "alert": 80},
    "O03 Bano": {"expected": (5, 25), "alert": 40, "critical": 55},
    "O04 Petroleando": {"expected": (10, 35), "alert": 45},
    "O12 Sin Postura": {"expected": (0, 15), "alert": 25},
    "O13 Chequeo Equipo": {"expected": (5, 20), "alert": 35},
    "O16 Detenido por Combustible": {"expected": (10, 35), "alert": 45},
}

SYSTEM_DELAY_CATEGORIES = {
    "S01 Espera en Pala",
    "S02 Espera en Chancado",
    "S03 Mantencion",
    "S04 Averia",
    "S05 Tronadura",
    "S06 Clima",
    "N00 Espera en Descarga",
    "N02 Espera en Pala",
    "N06 Cola en Pala",
    "N14 Pala Esperando",
    "O18 Espera en Chancado",
    "O84 Cola Chancado",
    "M10 Mantenimiento Programado",
    "M20 Mantencion No Programada",
    "M30 Averia",
    "S99 Standby",
}

RESPONSIBLE_USE_NOTE = (
    "Este ranking es orientativo y debe revisarse con contexto operacional antes de tomar decisiones. "
    "Las demoras sistemicas se consideran como contexto operativo y no como responsabilidad directa del operador."
)


def _clamp(value: float, low: float = 0, high: float = 100) -> float:
    return max(low, min(high, value))


def _round(value: float, digits: int = 1) -> float:
    return round(float(value), digits)


def recurrence_level(recurrence: dict[str, int]) -> str:
    maximum = max(recurrence.values() or [0])
    high_days = recurrence.get("high_delay_shifts", 0)
    if maximum >= 4 or high_days >= 4:
        return "ALTO"
    if maximum >= 2 or high_days >= 2:
        return "SEGUIMIENTO"
    if maximum == 1 or high_days == 1:
        return "OBSERVACION"
    return "BAJO"


def risk_level(score: float) -> str:
    if score >= 90:
        return "EXCELENTE"
    if score >= 80:
        return "BUENO"
    if score >= 70:
        return "SEGUIMIENTO"
    if score >= 60:
        return "RIESGO_ALTO"
    return "CRITICO"


def main_loss_cause(delay_totals: dict[str, int]) -> str:
    if not delay_totals:
        return "Sin causa dominante"
    return max(delay_totals.items(), key=lambda item: item[1])[0]


def calculate_recurrence(shift_rows: list[dict[str, Any]]) -> dict[str, int | str]:
    recurrence = {
        "bathroom_over_threshold_shifts": 0,
        "lunch_over_threshold_shifts": 0,
        "shift_change_over_threshold_shifts": 0,
        "no_assignment_over_threshold_shifts": 0,
        "high_delay_shifts": 0,
    }
    for row in shift_rows:
        manageable = row.get("manageable_delays", {})
        bathroom = int(manageable.get("O03 Bano", 0))
        lunch = int(manageable.get("O02 Colacion", 0))
        shift_change = int(manageable.get("O01 Cambio de Turno", 0))
        no_assignment = int(manageable.get("O12 Sin Postura", 0))

        high = False
        if bathroom > MANAGEABLE_DELAY_THRESHOLDS["O03 Bano"]["alert"]:
            recurrence["bathroom_over_threshold_shifts"] += 1
            high = True
        if lunch > MANAGEABLE_DELAY_THRESHOLDS["O02 Colacion"]["alert"]:
            recurrence["lunch_over_threshold_shifts"] += 1
            high = True
        if shift_change > MANAGEABLE_DELAY_THRESHOLDS["O01 Cambio de Turno"]["alert"]:
            recurrence["shift_change_over_threshold_shifts"] += 1
            high = True
        if no_assignment > MANAGEABLE_DELAY_THRESHOLDS["O12 Sin Postura"]["alert"]:
            recurrence["no_assignment_over_threshold_shifts"] += 1
            high = True
        if high:
            recurrence["high_delay_shifts"] += 1

    recurrence["pattern_level"] = recurrence_level({key: int(value) for key, value in recurrence.items()})
    return recurrence


def manageable_excess_minutes(shift_rows: list[dict[str, Any]]) -> dict[str, int]:
    excess = {category: 0 for category in MANAGEABLE_DELAY_THRESHOLDS}
    for row in shift_rows:
        manageable = row.get("manageable_delays", {})
        for category, rule in MANAGEABLE_DELAY_THRESHOLDS.items():
            threshold = int(rule["alert"])
            minutes = int(manageable.get(category, 0))
            excess[category] += max(0, minutes - threshold)
    return excess


def thresholds_used() -> dict[str, Any]:
    return {
        "manageable_delays": MANAGEABLE_DELAY_THRESHOLDS,
        "system_delays": sorted(SYSTEM_DELAY_CATEGORIES),
        "availability": {
            "good": ">= 85%",
            "watch": "75% a 84%",
            "critical": "< 75%",
        },
        "utilization": {
            "good": ">= 85%",
            "watch": "75% a 84%",
            "critical": "< 75%",
        },
        "score_interpretation": {
            "90-100": "Excelente",
            "80-89": "Bueno",
            "70-79": "Seguimiento",
            "60-69": "Riesgo alto",
            "<60": "Critico",
        },
    }


def _recurrence_penalty(pattern_level: str) -> int:
    return {
        "BAJO": 0,
        "OBSERVACION": 2,
        "SEGUIMIENTO": 5,
        "ALTO": 9,
    }.get(pattern_level, 0)


def _risk_reason(score: float, recurrence: dict[str, Any], safety_events: int, critical_events: int) -> str:
    if critical_events:
        return "Eventos criticos de seguridad registrados en el periodo."
    if safety_events:
        return "Eventos de seguridad asociados reducen el componente seguridad."
    if recurrence.get("pattern_level") == "ALTO":
        return "Recurrencia alta de eventos sobre umbral requiere seguimiento operacional."
    if score < 70:
        return "Score global bajo rango esperado por combinacion de productividad, disponibilidad y demoras."
    return "Score dentro de rango de seguimiento operacional."


def _recommendation_reason(recurrence: dict[str, Any], excess_total: int, system_delay_minutes: int) -> str:
    if recurrence.get("pattern_level") == "ALTO":
        return "La recomendacion se activa por recurrencia alta de demoras gestionables sobre umbral."
    if excess_total > 0:
        return "La recomendacion se activa por exceso acumulado sobre ventanas esperadas."
    if system_delay_minutes > 0:
        return "La recomendacion prioriza revisar restricciones sistemicas del circuito."
    return "La recomendacion es preventiva por comportamiento dentro de rango operacional."


def calculate_operator_score(aggregate: dict[str, Any], shift_rows: list[dict[str, Any]]) -> dict[str, Any]:
    toneladas_reales = float(aggregate.get("toneladas_reales", 0))
    toneladas_esperadas = max(float(aggregate.get("toneladas_esperadas", 0)), 1)
    total_shift_minutes = max(float(aggregate.get("total_shift_minutes", 0)), 1)
    productive_minutes = max(float(aggregate.get("productive_minutes", 0)), 0)
    available_minutes = max(float(aggregate.get("available_minutes", 0)), 1)
    operating_minutes = max(float(aggregate.get("operating_minutes", 0)), 0)
    safety_events = int(aggregate.get("safety_events", 0))
    critical_events = int(aggregate.get("critical_events", 0))

    productivity_score = _clamp(toneladas_reales / toneladas_esperadas * 100)
    disponibilidad_score = _clamp(productive_minutes / total_shift_minutes * 100)
    utilizacion_score = _clamp(operating_minutes / available_minutes * 100)

    excess = manageable_excess_minutes(shift_rows)
    recurrence = calculate_recurrence(shift_rows)
    excess_total = sum(excess.values())
    recurrence_penalty = _recurrence_penalty(str(recurrence["pattern_level"]))
    control_demoras_score = _clamp(100 - (excess_total * 0.18) - recurrence_penalty)

    seguridad_score = _clamp(100 - safety_events * 4 - critical_events * 12)

    score_global = (
        productivity_score * SCORE_WEIGHTS["productividad_score"]
        + disponibilidad_score * SCORE_WEIGHTS["disponibilidad_score"]
        + utilizacion_score * SCORE_WEIGHTS["utilizacion_score"]
        + control_demoras_score * SCORE_WEIGHTS["control_demoras_score"]
        + seguridad_score * SCORE_WEIGHTS["seguridad_score"]
    )

    return {
        "productividad_score": _round(productivity_score),
        "disponibilidad_score": _round(disponibilidad_score),
        "utilizacion_score": _round(utilizacion_score),
        "control_demoras_score": _round(control_demoras_score),
        "seguridad_score": _round(seguridad_score),
        "score_global": _round(score_global),
        "manageable_excess_minutes": excess,
        "recurrence": recurrence,
        "risk_level": risk_level(score_global),
        "raw_values": {
            "toneladas_reales": int(toneladas_reales),
            "toneladas_esperadas": int(toneladas_esperadas),
            "total_shift_minutes": int(total_shift_minutes),
            "productive_minutes": int(productive_minutes),
            "available_minutes": int(available_minutes),
            "operating_minutes": int(operating_minutes),
            "manageable_delay_minutes": int(aggregate.get("manageable_delay_minutes", 0)),
            "system_delay_minutes": int(aggregate.get("system_delay_minutes", 0)),
            "safety_events": safety_events,
            "critical_events": critical_events,
        },
        "normalized_scores": {
            "productividad_score": _round(productivity_score),
            "disponibilidad_score": _round(disponibilidad_score),
            "utilizacion_score": _round(utilizacion_score),
            "control_demoras_score": _round(control_demoras_score),
            "seguridad_score": _round(seguridad_score),
        },
        "penalties": {
            "manageable_excess_minutes_total": excess_total,
            "manageable_excess_penalty": _round(excess_total * 0.18),
            "recurrence_penalty": recurrence_penalty,
            "safety_event_penalty": safety_events * 4,
            "critical_event_penalty": critical_events * 12,
        },
        "thresholds_used": thresholds_used(),
        "calculation_trace": [
            {
                "component": "Productividad",
                "formula": "min(100, toneladas_reales / toneladas_esperadas * 100)",
                "raw_value": _round(toneladas_reales / toneladas_esperadas * 100),
                "normalized_score": _round(productivity_score),
                "weight": SCORE_WEIGHTS["productividad_score"],
                "weighted_points": _round(productivity_score * SCORE_WEIGHTS["productividad_score"]),
            },
            {
                "component": "Disponibilidad",
                "formula": "minutos_productivos / minutos_turno * 100",
                "raw_value": _round(productive_minutes / total_shift_minutes * 100),
                "normalized_score": _round(disponibilidad_score),
                "weight": SCORE_WEIGHTS["disponibilidad_score"],
                "weighted_points": _round(disponibilidad_score * SCORE_WEIGHTS["disponibilidad_score"]),
            },
            {
                "component": "Utilizacion",
                "formula": "minutos_operativos / minutos_disponibles * 100",
                "raw_value": _round(operating_minutes / available_minutes * 100),
                "normalized_score": _round(utilizacion_score),
                "weight": SCORE_WEIGHTS["utilizacion_score"],
                "weighted_points": _round(utilizacion_score * SCORE_WEIGHTS["utilizacion_score"]),
            },
            {
                "component": "Control demoras",
                "formula": "100 - penalizacion por exceso gestionable - penalizacion por recurrencia",
                "raw_value": _round(control_demoras_score),
                "normalized_score": _round(control_demoras_score),
                "weight": SCORE_WEIGHTS["control_demoras_score"],
                "weighted_points": _round(control_demoras_score * SCORE_WEIGHTS["control_demoras_score"]),
            },
            {
                "component": "Seguridad",
                "formula": "100 - eventos_seguridad * 4 - eventos_criticos * 12",
                "raw_value": _round(seguridad_score),
                "normalized_score": _round(seguridad_score),
                "weight": SCORE_WEIGHTS["seguridad_score"],
                "weighted_points": _round(seguridad_score * SCORE_WEIGHTS["seguridad_score"]),
            },
        ],
        "risk_reason": _risk_reason(score_global, recurrence, safety_events, critical_events),
        "recommendation_reason": _recommendation_reason(
            recurrence,
            excess_total,
            int(aggregate.get("system_delay_minutes", 0)),
        ),
    }


def build_score_explanation(item: dict[str, Any], fleet_average_score: float | None = None) -> list[str]:
    explanation: list[str] = []
    avg_score = fleet_average_score if fleet_average_score is not None else item.get("score_global", 0)
    score_delta = float(item.get("score_global", 0)) - float(avg_score)
    productivity = float(item.get("productividad_score", 0))
    manageable = int(item.get("manageable_delay_minutes", 0))
    recurrence = item.get("recurrence", {})

    if productivity < 90:
        explanation.append(f"Productividad bajo meta estimada en {round(100 - productivity, 1)}%.")
    else:
        explanation.append("Productividad dentro de rango esperado para el periodo.")

    if score_delta < -5:
        explanation.append(f"Score global bajo promedio de flota en {abs(round(score_delta, 1))} puntos.")
    elif score_delta > 5:
        explanation.append(f"Score global sobre promedio de flota en {round(score_delta, 1)} puntos.")

    if manageable:
        explanation.append(f"Disponibilidad afectada por {manageable} minutos de demoras gestionables registradas.")

    bathroom_count = int(recurrence.get("bathroom_over_threshold_shifts", 0))
    lunch_count = int(recurrence.get("lunch_over_threshold_shifts", 0))
    shift_count = int(recurrence.get("shift_change_over_threshold_shifts", 0))
    no_assignment_count = int(recurrence.get("no_assignment_over_threshold_shifts", 0))

    if bathroom_count:
        explanation.append(f"Bano sobre umbral esperado en {bathroom_count} turnos del periodo.")
    if lunch_count:
        explanation.append(f"Colacion sobre ventana esperada en {lunch_count} turnos.")
    if shift_count:
        explanation.append(f"Cambio de turno extendido en {shift_count} turnos.")
    if no_assignment_count:
        explanation.append(f"Sin postura sobre umbral en {no_assignment_count} turnos.")

    lost_tons = int(item.get("lost_tons_estimated", 0))
    if lost_tons:
        explanation.append(f"Principal impacto estimado: {lost_tons:,} toneladas.".replace(",", "."))

    explanation.append("Resultado orientativo: requiere revision con contexto operacional antes de tomar decisiones.")
    return explanation


def build_recommendation(item: dict[str, Any]) -> str:
    recurrence = item.get("recurrence", {})
    pattern = str(recurrence.get("pattern_level", item.get("recurrence_level", "BAJO")))
    cause = str(item.get("main_loss_cause", "demoras gestionables"))
    risk = str(item.get("risk_level", "SEGUIMIENTO"))

    if risk in {"CRITICO", "RIESGO_ALTO"} or pattern == "ALTO":
        return (
            "Revisar patron de pausas, coordinacion de relevo y tiempos de postura "
            "con contexto operacional antes de definir acciones."
        )
    if cause in {
        "S01 Espera en Pala",
        "S02 Espera en Chancado",
        "S03 Mantencion",
        "S04 Averia",
        "N00 Espera en Descarga",
        "N02 Espera en Pala",
        "N06 Cola en Pala",
        "N14 Pala Esperando",
        "O18 Espera en Chancado",
        "O84 Cola Chancado",
        "M10 Mantenimiento Programado",
        "M20 Mantencion No Programada",
        "M30 Averia",
        "S99 Standby",
    }:
        return "Revisar interferencias sistemicas asociadas al equipo y al circuito de carguio/descarga."
    if pattern == "SEGUIMIENTO":
        return "Mantener seguimiento operacional y contrastar eventos registrados con plan de turno."
    return "Desempeno dentro de rango operacional; mantener monitoreo preventivo."
