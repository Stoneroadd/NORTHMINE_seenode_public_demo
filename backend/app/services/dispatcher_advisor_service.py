from __future__ import annotations

from datetime import datetime
from typing import Any

from app.services.cockpit_service import build_cockpit_response
from app.services.hidden_loss_service import build_hidden_losses_response
from app.services.operational_nlp_service import build_operational_nlp_response
from app.services.profit_optimization_service import build_profit_optimization_response


DISPATCHER_ADVISOR_API_VERSION = "v1"


def _now_iso() -> str:
    return datetime.now().isoformat(timespec="seconds")


def _risk_level(risk: float, hidden_loss: int, stale: bool) -> str:
    if stale:
        return "ALTO"
    if risk >= 0.7 or hidden_loss >= 45_000:
        return "ALTO"
    if risk >= 0.35 or hidden_loss >= 12_000:
        return "MEDIO"
    return "BAJO"


def _confidence(*values: str, data_quality_score: float | None = None, text_count: int = 0) -> str:
    score = 0
    for value in values:
        normalized = str(value).upper()
        score += {"ALTA": 2, "MEDIA": 1, "BAJA": 0}.get(normalized, 1)
    if data_quality_score is not None:
        if data_quality_score >= 85:
            score += 2
        elif data_quality_score >= 60:
            score += 1
    if text_count >= 8:
        score += 1
    denominator = max(1, len(values) * 2 + 3)
    ratio = score / denominator
    if ratio >= 0.72:
        return "ALTA"
    if ratio >= 0.42:
        return "MEDIA"
    return "BAJA"


def _extract_equipment(*groups: list[str]) -> list[str]:
    ordered: list[str] = []
    seen: set[str] = set()
    for group in groups:
        for item in group:
            normalized = str(item).strip()
            if not normalized or normalized in seen:
                continue
            seen.add(normalized)
            ordered.append(normalized)
    return ordered[:6]


def _situation(cockpit: dict[str, Any], hidden: dict[str, Any], nlp: dict[str, Any]) -> str:
    hidden_primary = str(hidden.get("summary", {}).get("primary_source") or "")
    nlp_pattern = str(nlp.get("summary", {}).get("emerging_pattern") or "")
    main_cause = str(cockpit.get("main_cause", {}).get("cause") or "")
    if "cola" in hidden_primary.lower() or "cola" in nlp_pattern.lower() or "cola" in main_cause.lower():
        return "Cola creciente o espera operacional en el frente critico."
    if "standby" in hidden_primary.lower() or "sin actividad" in hidden_primary.lower():
        return "Capacidad CAEX no utilizada durante el turno."
    if nlp_pattern and nlp_pattern != "Sin patron operacional dominante":
        return f"Patron operacional emergente: {nlp_pattern}."
    return main_cause or "Riesgo operacional detectado por el cockpit."


def _probable_cause(cockpit: dict[str, Any], hidden: dict[str, Any], nlp: dict[str, Any]) -> str:
    hidden_primary = str(hidden.get("summary", {}).get("primary_source") or "")
    nlp_pattern = str(nlp.get("summary", {}).get("emerging_pattern") or "")
    cause = str(cockpit.get("main_cause", {}).get("cause") or "")
    parts = []
    if hidden_primary:
        parts.append(hidden_primary)
    if nlp_pattern and nlp_pattern != "Sin patron operacional dominante":
        parts.append(f"aumento de menciones '{nlp_pattern}'")
    if cause:
        parts.append(cause)
    if not parts:
        return "La causa probable requiere mas datos operacionales para aislarse con confianza."
    return "; ".join(parts[:3]) + "."


def _action(cockpit: dict[str, Any], profit: dict[str, Any], hidden: dict[str, Any], nlp: dict[str, Any]) -> dict[str, Any]:
    cockpit_action = cockpit.get("recommendation", {}).get("title") or ""
    profit_best = profit.get("recommendation", {}).get("title") or ""
    hidden_action = hidden.get("summary", {}).get("primary_recommendation") or ""
    nlp_recommendations = nlp.get("recommendations") or []
    nlp_action = nlp_recommendations[0]["title"] if nlp_recommendations else ""
    if cockpit_action:
        title = cockpit_action
    elif hidden_action:
        title = hidden_action
    elif nlp_action:
        title = nlp_action
    else:
        title = "Mantener monitoreo operacional y validar asignacion de flota."
    rationale = [item for item in [profit_best, hidden_action, nlp_action] if item]
    return {
        "title": title,
        "type": "REDISTRIBUCION_OPERACIONAL" if "reasign" in title.lower() or "redistrib" in title.lower() else "ACCION_OPERACIONAL",
        "rationale": rationale[:4],
    }


def _impact(cockpit: dict[str, Any], profit: dict[str, Any], hidden: dict[str, Any], nlp: dict[str, Any]) -> dict[str, Any]:
    production = cockpit.get("production", {})
    recommendation = cockpit.get("recommendation", {})
    actual = float(production.get("actual_tonnes") or 0)
    impact_tons = int(recommendation.get("impact_tons") or 0)
    productivity_pct = round((impact_tons / max(actual, 1)) * 100, 1) if impact_tons else 0.0
    queue_delta = float(recommendation.get("queue_delta_min") or 0)
    profit_value = int(profit.get("recommendation", {}).get("value_delta_usd") or 0)
    hidden_recoverable = int(hidden.get("summary", {}).get("recoverable_value_usd") or 0)
    nlp_impact = int(nlp.get("summary", {}).get("estimated_impact_usd") or 0)
    expected_value = max(
        int(recommendation.get("impact_usd") or 0),
        profit_value,
        round(hidden_recoverable * 0.45 + nlp_impact * 0.25),
    )
    return {
        "productivity_pct": productivity_pct,
        "production_tonnes": impact_tons,
        "queue_delta_min": queue_delta,
        "expected_value_usd": expected_value,
        "hidden_recoverable_usd": hidden_recoverable,
        "nlp_impact_usd": nlp_impact,
    }


def _evidence(cockpit: dict[str, Any], profit: dict[str, Any], hidden: dict[str, Any], nlp: dict[str, Any]) -> list[dict[str, Any]]:
    production = cockpit.get("production", {})
    primary_hidden = hidden.get("primary_source", {})
    primary_pattern = (nlp.get("patterns") or [{}])[0]
    best_profit = profit.get("recommendation", {})
    return [
        {
            "source": "cockpit",
            "title": "Produccion y riesgo",
            "detail": (
                f"Forecast {production.get('forecast_tonnes', 0):,.0f} t, "
                f"riesgo {float(production.get('non_compliance_risk') or 0) * 100:.0f}%"
            ),
            "weight": 0.25,
        },
        {
            "source": "profit_optimization",
            "title": "Valor economico",
            "detail": f"{best_profit.get('title', 'Sin escenario')} - delta {int(best_profit.get('value_delta_usd') or 0):,.0f} USD",
            "weight": 0.30,
        },
        {
            "source": "hidden_losses",
            "title": primary_hidden.get("title", hidden.get("summary", {}).get("primary_source", "Perdida oculta")),
            "detail": f"{int(hidden.get('summary', {}).get('recoverable_value_usd') or 0):,.0f} USD recuperable",
            "weight": 0.25,
        },
        {
            "source": "operational_nlp",
            "title": primary_pattern.get("label", nlp.get("summary", {}).get("emerging_pattern", "Sin patron")),
            "detail": f"{int(primary_pattern.get('frequency') or 0)} menciones, tendencia {primary_pattern.get('trend', 'SIN_DATOS')}",
            "weight": 0.20,
        },
    ]


def _alternatives(profit: dict[str, Any]) -> list[dict[str, Any]]:
    scenarios = profit.get("scenarios") or []
    alternatives: list[dict[str, Any]] = []
    for scenario in scenarios[:4]:
        alternatives.append(
            {
                "id": scenario.get("id"),
                "name": scenario.get("name"),
                "expected_value_usd": scenario.get("risk_adjusted_value_usd"),
                "production_tonnes": scenario.get("production_tonnes"),
                "cost_per_tonne_usd": scenario.get("cost_per_tonne_usd"),
                "risk": scenario.get("risk_label"),
                "confidence": scenario.get("confidence"),
            }
        )
    return alternatives


def _quality(cockpit: dict[str, Any], nlp: dict[str, Any], hidden: dict[str, Any]) -> dict[str, Any]:
    cockpit_quality = cockpit.get("data_quality") or {}
    source_mix = nlp.get("source_mix") or {}
    score = cockpit_quality.get("score")
    if isinstance(score, (int, float)):
        quality_score = round(float(score), 1)
    else:
        quality_score = 0
    return {
        "score": quality_score,
        "cockpit_status": cockpit_quality.get("status"),
        "texts_analyzed": source_mix.get("total_texts", 0),
        "free_texts": source_mix.get("free_texts", 0),
        "alert_texts": source_mix.get("alert_texts", 0),
        "hidden_loss_confidence": hidden.get("summary", {}).get("confidence"),
    }


def _assemble(
    *,
    cockpit: dict[str, Any],
    profit: dict[str, Any],
    hidden: dict[str, Any],
    nlp: dict[str, Any],
) -> dict[str, Any]:
    stale = bool(cockpit.get("stale") or profit.get("stale") or hidden.get("stale") or nlp.get("stale"))
    quality = _quality(cockpit, nlp, hidden)
    impact = _impact(cockpit, profit, hidden, nlp)
    risk = _risk_level(float(cockpit.get("production", {}).get("non_compliance_risk") or 0), impact["hidden_recoverable_usd"], stale)
    confidence = _confidence(
        cockpit.get("confidence", "MEDIA"),
        profit.get("recommendation", {}).get("confidence", "MEDIA"),
        hidden.get("summary", {}).get("confidence", "MEDIA"),
        nlp.get("summary", {}).get("confidence", "MEDIA"),
        data_quality_score=quality["score"],
        text_count=int(quality.get("texts_analyzed") or 0),
    )
    action = _action(cockpit, profit, hidden, nlp)
    equipment = _extract_equipment(
        nlp.get("summary", {}).get("associated_equipment") or [],
        [item.get("equipment_id") for item in hidden.get("by_equipment", []) if item.get("equipment_id")],
    )
    return {
        "status": "STALE" if stale else "OK",
        "generated_at": _now_iso(),
        "api_version": DISPATCHER_ADVISOR_API_VERSION,
        "data_source": cockpit.get("data_source", "REAL"),
        "source_system": cockpit.get("source_system", "WENCO"),
        "source": cockpit.get("source", "wenco-sql-live"),
        "mode": "CACHE" if stale else cockpit.get("mode", "DATOS_REALES"),
        "selected_date": cockpit.get("selected_date"),
        "selected_shift": cockpit.get("selected_shift"),
        "shift": cockpit.get("shift"),
        "is_demo": bool(cockpit.get("is_demo")),
        "stale": stale,
        "advisor": {
            "situation": _situation(cockpit, hidden, nlp),
            "probable_cause": _probable_cause(cockpit, hidden, nlp),
            "action": action,
            "target_equipment": equipment,
            "impact": impact,
            "risk": risk,
            "confidence": confidence,
            "execution_window_min": 30,
        },
        "evidence": _evidence(cockpit, profit, hidden, nlp),
        "alternatives": _alternatives(profit),
        "traceability": {
            "inputs": [
                {"endpoint": "/api/cockpit", "api_version": cockpit.get("api_version"), "status": cockpit.get("status")},
                {"endpoint": "/api/profit-optimization", "api_version": profit.get("api_version"), "status": profit.get("status")},
                {"endpoint": "/api/hidden-losses", "api_version": hidden.get("api_version"), "status": hidden.get("status")},
                {"endpoint": "/api/operational-nlp", "api_version": nlp.get("api_version"), "status": nlp.get("status")},
            ],
            "decision_policy": "Prioriza valor esperado recuperable con riesgo, confianza y calidad de dato.",
        },
        "data_quality": quality,
        "warnings": list(cockpit.get("warnings") or [])[:2]
        + list(profit.get("warnings") or [])[:2]
        + list(hidden.get("warnings") or [])[:2]
        + list(nlp.get("warnings") or [])[:2],
        "refresh_policy": {"analytics_seconds": 300, "simulation": "on_demand"},
    }


def build_dispatcher_advisor_response(
    dataset: dict[str, Any] | None,
    *,
    demo_mode: bool,
    selected_date: str | None = None,
    selected_shift: str | None = None,
) -> dict[str, Any]:
    if demo_mode:
        raise ValueError("Modo demo deshabilitado: AI Dispatcher Advisor solo acepta datos reales WENCO.")
    if dataset is None:
        raise ValueError("Dataset operacional requerido cuando NORTHMINE_DEMO_MODE=false")
    cockpit = build_cockpit_response(
        dataset,
        demo_mode=False,
        selected_date=selected_date,
        selected_shift=selected_shift,
    )
    profit = build_profit_optimization_response(
        dataset,
        demo_mode=False,
        selected_date=selected_date,
        selected_shift=selected_shift,
    )
    hidden = build_hidden_losses_response(
        dataset,
        demo_mode=False,
        selected_date=selected_date,
        selected_shift=selected_shift,
    )
    nlp = build_operational_nlp_response(
        dataset,
        demo_mode=False,
        selected_date=selected_date,
        selected_shift=selected_shift,
    )
    return _assemble(cockpit=cockpit, profit=profit, hidden=hidden, nlp=nlp)
