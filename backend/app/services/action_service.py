from __future__ import annotations

from typing import Any

from app.services.equipment_service import destination_name


def _normalize_causes(causes: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if not causes:
        return [{"cause": "Variabilidad normal de turno", "impact_pct": 100}]
    total = sum(max(0, int(item["weight"])) for item in causes) or 1
    normalized = [
        {"cause": str(item["cause"]), "impact_pct": max(1, round(int(item["weight"]) / total * 100))}
        for item in causes
    ]
    delta = 100 - sum(item["impact_pct"] for item in normalized)
    normalized[0]["impact_pct"] += delta
    return normalized


def build_happening(
    current: dict[str, Any],
    alerts: dict[str, Any],
    destination_focus: dict[str, Any] | None,
    low_loader: dict[str, Any] | None,
) -> list[str]:
    projection = current["projection"]
    happening: list[str] = []
    if current.get("meta_configurada") and projection["proyeccion_final"] < projection["meta_turno"]:
        happening.append("Produccion bajo tendencia esperada para el cierre del turno")
    else:
        happening.append("Produccion dentro de la tendencia calculada por el backend")
    if low_loader:
        happening.append(f"{low_loader['carguio_id']} opera bajo el rendimiento promedio de carguio")
    if destination_focus:
        happening.append(f"{destination_name(destination_focus)} concentra {destination_focus.get('porcentaje', 0)}% del flujo")
    low_caex = alerts.get("low_caex") or []
    if low_caex:
        happening.append(f"{len(low_caex)} CAEX bajo el promedio de produccion del turno")
    if current.get("stale"):
        happening.append("La API sirve cache operacional porque WENCO no respondio en la ultima consulta")
    return happening[:5]


def build_cause_breakdown(
    current: dict[str, Any],
    alerts: dict[str, Any],
    destination_focus: dict[str, Any] | None,
    low_loader: dict[str, Any] | None,
) -> list[dict[str, Any]]:
    causes: list[dict[str, Any]] = []
    projection = current["projection"]
    if current.get("meta_configurada") and projection["proyeccion_final"] < projection["meta_turno"]:
        causes.append({"cause": "Produccion bajo tendencia esperada", "weight": 34})
    if low_loader:
        causes.append({"cause": f"Bajo rendimiento en {low_loader['carguio_id']}", "weight": 28})
    inactive = int(current.get("caex_sin_actividad") or 0)
    possible_breakdown = int(current.get("caex_posible_averia") or 0)
    if inactive or possible_breakdown:
        causes.append({"cause": "Standby y baja disponibilidad CAEX", "weight": 22 + possible_breakdown * 4})
    low_caex = alerts.get("low_caex") or []
    if low_caex:
        causes.append({"cause": "Redistribucion deficiente de flota", "weight": 18})
    if destination_focus:
        causes.append({"cause": f"Concentracion en {destination_name(destination_focus)}", "weight": 16})
    return _normalize_causes(causes)


def build_recommendation(
    current: dict[str, Any],
    causes: list[dict[str, Any]],
    alerts: dict[str, Any],
    economics: dict[str, Any],
) -> dict[str, Any]:
    projection = current["projection"]
    low_caex = alerts.get("low_caex") or []
    low_units = sorted(current.get("loading_units", []), key=lambda item: item.get("rendimiento_tph") or 0)
    caex = low_caex[0]["caex_id"] if low_caex else "CAEX con baja utilizacion"
    target_unit = low_units[0]["carguio_id"] if low_units else "frente critico"
    gap = max(int(projection.get("meta_turno") or 0) - int(projection.get("proyeccion_final") or 0), 0)
    impact_tons = max(450, min(4200, round(gap * 0.42))) if gap else max(350, round(current["toneladas_turno"] * 0.025))
    confidence = "MEDIA"
    if causes and causes[0]["impact_pct"] >= 45 and low_caex:
        confidence = "ALTA"
    if not current.get("meta_configurada"):
        confidence = "BAJA"
    return {
        "title": f"Reasignar {caex} hacia {target_unit} y monitorear cola por 30 minutos.",
        "impact_tons": impact_tons,
        "impact_usd": round(impact_tons * float(economics["cost_per_tonne_usd"]) * 1.45),
        "queue_delta_min": -2.1 if low_caex else -1.0,
        "confidence": confidence,
    }
