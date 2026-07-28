from __future__ import annotations

from datetime import datetime
from typing import Any

from app.services.dispatcher_advisor_service import build_dispatcher_advisor_response


DECISION_AUDIT_API_VERSION = "v1"
MINIMUM_EVALUATED_RECORDS = 3


def _now_iso() -> str:
    return datetime.now().isoformat(timespec="seconds")


def _num(value: Any) -> float | None:
    if isinstance(value, (int, float)):
        return float(value)
    return None


def _safe_round(value: float | None, digits: int = 1) -> float | None:
    return None if value is None else round(value, digits)


def _ratio(actual: float | None, expected: float | None) -> float | None:
    if actual is None or expected in (None, 0):
        return None
    return actual / expected * 100


def _accuracy(actual: float | None, expected: float | None) -> float | None:
    if actual is None or expected in (None, 0):
        return None
    return max(0.0, min(100.0, 100.0 - abs(actual - expected) / abs(expected) * 100.0))


def _mean(values: list[float | None]) -> float | None:
    valid = [item for item in values if item is not None]
    if not valid:
        return None
    return sum(valid) / len(valid)


def _queue_reduction(value: Any) -> float | None:
    numeric = _num(value)
    if numeric is None:
        return None
    return abs(numeric)


def _decision_id(advisor: dict[str, Any]) -> str:
    selected_date = advisor.get("selected_date") or advisor.get("shift", {}).get("date") or "sin-fecha"
    selected_shift = advisor.get("selected_shift") or advisor.get("shift", {}).get("name") or "sin-turno"
    action = advisor.get("advisor", {}).get("action", {}).get("type") or "accion"
    return f"decision-{selected_date}-{selected_shift}-{action}".lower().replace(" ", "-")


def recommendation_from_advisor(advisor: dict[str, Any]) -> dict[str, Any]:
    advisor_block = advisor.get("advisor", {})
    impact = advisor_block.get("impact", {})
    action = advisor_block.get("action", {})
    return {
        "decision_id": _decision_id(advisor),
        "advisor_recommendation_id": _decision_id(advisor),
        "generated_at": advisor.get("generated_at"),
        "source": "DISPATCHER_ADVISOR",
        "situation": advisor_block.get("situation") or "Situacion operacional no especificada",
        "recommended_action": action.get("title") or "Accion operacional no especificada",
        "action_type": action.get("type") or "ACCION_OPERACIONAL",
        "expected_impact": {
            "delta_tonnes": int(impact.get("production_tonnes") or 0),
            "delta_usd": int(impact.get("expected_value_usd") or 0),
            "delta_risk": None,
            "queue_reduction_minutes": _queue_reduction(impact.get("queue_delta_min")),
        },
        "confidence": advisor_block.get("confidence") or "MEDIA",
        "evidence": advisor.get("evidence") or [],
        "status": "PENDIENTE",
    }


def evaluate_decision_effectiveness(
    recommendation: dict[str, Any],
    actual_result: dict[str, Any] | None,
) -> dict[str, Any]:
    if not actual_result:
        return {
            "status": "INSUFICIENTE",
            "effectiveness_score": None,
            "expected_value_usd": recommendation.get("expected_impact", {}).get("delta_usd"),
            "actual_value_usd": None,
            "value_recovery_ratio": None,
            "tonnage_accuracy": None,
            "risk_accuracy": None,
            "queue_accuracy": None,
            "economic_accuracy": None,
            "overall_accuracy": None,
            "deviation": {"value_usd": None, "tonnes": None, "risk": None, "queue_minutes": None},
            "warnings": ["No existe resultado real para evaluar la recomendacion."],
        }

    execution_status = str(actual_result.get("execution_status") or "").upper()
    if execution_status in {"PENDIENTE", "NO_CONFIRMADA", "NO_CONFIRMADO"}:
        return {
            "status": "INSUFICIENTE",
            "effectiveness_score": None,
            "expected_value_usd": recommendation.get("expected_impact", {}).get("delta_usd"),
            "actual_value_usd": None,
            "value_recovery_ratio": None,
            "tonnage_accuracy": None,
            "risk_accuracy": None,
            "queue_accuracy": None,
            "economic_accuracy": None,
            "overall_accuracy": None,
            "deviation": {"value_usd": None, "tonnes": None, "risk": None, "queue_minutes": None},
            "warnings": ["Ejecucion pendiente o no confirmada; evaluacion insuficiente."],
        }

    expected = recommendation.get("expected_impact", {})
    actual = actual_result.get("actual_impact") or {}
    expected_value = _num(expected.get("delta_usd"))
    actual_value = _num(actual.get("delta_usd"))
    expected_tonnes = _num(expected.get("delta_tonnes"))
    actual_tonnes = _num(actual.get("delta_tonnes"))
    expected_risk = _num(expected.get("delta_risk"))
    actual_risk = _num(actual.get("delta_risk"))
    expected_queue = _num(expected.get("queue_reduction_minutes"))
    actual_queue = _num(actual.get("queue_reduction_minutes"))

    economic_accuracy = _accuracy(actual_value, expected_value)
    tonnage_accuracy = _accuracy(actual_tonnes, expected_tonnes)
    risk_accuracy = _accuracy(actual_risk, expected_risk)
    queue_accuracy = _accuracy(actual_queue, expected_queue)
    overall_accuracy = _mean([economic_accuracy, tonnage_accuracy, risk_accuracy, queue_accuracy])
    value_recovery_ratio = _ratio(actual_value, expected_value)
    score = overall_accuracy
    warnings: list[str] = []

    if score is None:
        warnings.append("No hay metricas comparables suficientes para calcular efectividad.")
    if actual_value is not None and actual_value < 0:
        warnings.append("El valor real observado fue negativo; la decision destruyo valor en la ventana evaluada.")
    if execution_status == "PARCIAL":
        warnings.append("La accion se ejecuto parcialmente; la efectividad puede subestimar el potencial total.")
    if execution_status == "NO_EJECUTADA":
        warnings.append("La recomendacion no fue ejecutada.")

    return {
        "status": "OK" if score is not None else "INSUFICIENTE",
        "effectiveness_score": _safe_round(score),
        "expected_value_usd": expected_value,
        "actual_value_usd": actual_value,
        "value_recovery_ratio": _safe_round(value_recovery_ratio),
        "tonnage_accuracy": _safe_round(tonnage_accuracy),
        "risk_accuracy": _safe_round(risk_accuracy),
        "queue_accuracy": _safe_round(queue_accuracy),
        "economic_accuracy": _safe_round(economic_accuracy),
        "overall_accuracy": _safe_round(overall_accuracy),
        "deviation": {
            "value_usd": None if expected_value is None or actual_value is None else actual_value - expected_value,
            "tonnes": None if expected_tonnes is None or actual_tonnes is None else actual_tonnes - expected_tonnes,
            "risk": None if expected_risk is None or actual_risk is None else actual_risk - expected_risk,
            "queue_minutes": None if expected_queue is None or actual_queue is None else actual_queue - expected_queue,
        },
        "warnings": warnings,
    }


def build_decision_audit_history(
    advisor_recommendations: list[dict[str, Any]],
    execution_history: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    if not execution_history:
        return {
            "status": "SIN_HISTORIAL",
            "records": [],
            "message": "Aun no existen decisiones auditadas.",
        }

    actual_by_decision = {str(item.get("decision_id")): item for item in execution_history}
    records: list[dict[str, Any]] = []
    for recommendation in advisor_recommendations:
        actual_result = actual_by_decision.get(str(recommendation.get("decision_id")))
        execution_status = (
            actual_result.get("execution_status")
            if actual_result
            else recommendation.get("status", "PENDIENTE")
        )
        evaluation = evaluate_decision_effectiveness(recommendation, actual_result)
        records.append(
            {
                "decision_id": recommendation.get("decision_id"),
                "issued_at": recommendation.get("generated_at"),
                "executed_at": actual_result.get("executed_at") if actual_result else None,
                "action_type": recommendation.get("action_type"),
                "recommended_action": recommendation.get("recommended_action"),
                "execution_status": execution_status,
                "recommendation": recommendation,
                "actual_result": actual_result,
                "evaluation": evaluation,
            }
        )

    records.sort(key=lambda item: str(item.get("issued_at") or ""), reverse=True)
    return {
        "status": "OK",
        "records": records,
        "message": f"{len(records)} decisiones auditadas.",
    }


def calculate_historical_effectiveness(audit_records: list[dict[str, Any]]) -> dict[str, Any]:
    recommendations = len(audit_records)
    executed = sum(1 for item in audit_records if item.get("execution_status") == "EJECUTADA")
    partial = sum(1 for item in audit_records if item.get("execution_status") == "PARCIAL")
    not_executed = sum(1 for item in audit_records if item.get("execution_status") == "NO_EJECUTADA")
    evaluated = [item for item in audit_records if item.get("evaluation", {}).get("status") == "OK"]
    expected_total = sum(float(item.get("evaluation", {}).get("expected_value_usd") or 0) for item in evaluated)
    actual_total = sum(float(item.get("evaluation", {}).get("actual_value_usd") or 0) for item in evaluated)

    base = {
        "recommendations": recommendations,
        "executed": executed,
        "partial": partial,
        "not_executed": not_executed,
        "pending": max(0, recommendations - executed - partial - not_executed),
        "adoption_rate_pct": _safe_round((executed + partial) / recommendations * 100 if recommendations else None),
        "evaluated": len(evaluated),
        "minimum_required": MINIMUM_EVALUATED_RECORDS,
    }

    if len(evaluated) < MINIMUM_EVALUATED_RECORDS:
        return {
            **base,
            "status": "INSUFICIENTE",
            "average_effectiveness_pct": None,
            "economic_accuracy_pct": None,
            "tonnage_accuracy_pct": None,
            "expected_value_usd": None,
            "actual_value_usd": None,
            "value_recovery_ratio_pct": None,
            "average_deviation_usd": None,
            "best_action_type": None,
            "worst_action_type": None,
            "message": "Historial insuficiente para calcular precision historica.",
        }

    by_action: dict[str, list[float]] = {}
    for item in evaluated:
        action_type = str(item.get("action_type") or "ACCION_OPERACIONAL")
        score = item.get("evaluation", {}).get("effectiveness_score")
        if isinstance(score, (int, float)):
            by_action.setdefault(action_type, []).append(float(score))

    ranked_actions = sorted(
        (
            {"action_type": key, "effectiveness_pct": round(sum(values) / len(values), 1), "count": len(values)}
            for key, values in by_action.items()
            if values
        ),
        key=lambda item: item["effectiveness_pct"],
        reverse=True,
    )

    deviations = [
        item.get("evaluation", {}).get("deviation", {}).get("value_usd")
        for item in evaluated
        if isinstance(item.get("evaluation", {}).get("deviation", {}).get("value_usd"), (int, float))
    ]

    return {
        **base,
        "status": "OK",
        "average_effectiveness_pct": _safe_round(_mean([item.get("evaluation", {}).get("effectiveness_score") for item in evaluated])),
        "economic_accuracy_pct": _safe_round(_mean([item.get("evaluation", {}).get("economic_accuracy") for item in evaluated])),
        "tonnage_accuracy_pct": _safe_round(_mean([item.get("evaluation", {}).get("tonnage_accuracy") for item in evaluated])),
        "expected_value_usd": round(expected_total),
        "actual_value_usd": round(actual_total),
        "value_recovery_ratio_pct": _safe_round(_ratio(actual_total, expected_total)),
        "average_deviation_usd": _safe_round(_mean([abs(float(item)) for item in deviations]), 0),
        "best_action_type": ranked_actions[0] if ranked_actions else None,
        "worst_action_type": ranked_actions[-1] if ranked_actions else None,
        "by_action_type": ranked_actions,
        "message": "Metricas historicas calculadas con decisiones evaluadas.",
    }


def build_decision_audit_summary(
    audit_history: dict[str, Any],
    historical_metrics: dict[str, Any],
) -> dict[str, Any]:
    if audit_history.get("status") == "SIN_HISTORIAL":
        return {
            "recommendations": 0,
            "executed": 0,
            "message": "Aun no existen decisiones auditadas.",
            "confidence": "BAJA",
        }
    if historical_metrics.get("status") != "OK":
        return {
            "recommendations": historical_metrics.get("recommendations", 0),
            "executed": historical_metrics.get("executed", 0),
            "message": historical_metrics.get("message"),
            "confidence": "BAJA",
        }
    return {
        "recommendations": historical_metrics["recommendations"],
        "executed": historical_metrics["executed"],
        "partial": historical_metrics["partial"],
        "not_executed": historical_metrics["not_executed"],
        "adoption_rate_pct": historical_metrics["adoption_rate_pct"],
        "average_effectiveness_pct": historical_metrics["average_effectiveness_pct"],
        "advisor_accuracy_pct": historical_metrics["average_effectiveness_pct"],
        "expected_value_usd": historical_metrics["expected_value_usd"],
        "actual_value_usd": historical_metrics["actual_value_usd"],
        "realized_value_usd": historical_metrics["actual_value_usd"],
        "value_recovery_ratio_pct": historical_metrics["value_recovery_ratio_pct"],
        "principal_strength": historical_metrics.get("best_action_type", {}).get("action_type")
        if historical_metrics.get("best_action_type")
        else None,
        "principal_deviation": historical_metrics.get("worst_action_type", {}).get("action_type")
        if historical_metrics.get("worst_action_type")
        else None,
        "confidence": "MEDIA" if historical_metrics["evaluated"] < 8 else "ALTA",
        "message": (
            f"Durante el periodo analizado se evaluaron {historical_metrics['evaluated']} decisiones. "
            f"La efectividad promedio fue {historical_metrics['average_effectiveness_pct']}%."
        ),
    }


def _current_decision(advisor: dict[str, Any]) -> dict[str, Any]:
    recommendation = recommendation_from_advisor(advisor)
    return {
        "recommendation": recommendation,
        "execution_status": "PENDIENTE",
        "actual_impact": {
            "delta_tonnes": None,
            "delta_usd": None,
            "delta_risk": None,
            "queue_reduction_minutes": None,
        },
        "evaluation": evaluate_decision_effectiveness(recommendation, None),
    }


def build_decision_audit_response(
    dataset: dict[str, Any] | None,
    *,
    demo_mode: bool,
    selected_date: str | None = None,
    selected_shift: str | None = None,
) -> dict[str, Any]:
    if demo_mode:
        raise ValueError("Modo demo deshabilitado: Decision Audit solo acepta datos reales WENCO.")

    if dataset is None:
        raise ValueError("Dataset operacional requerido cuando NORTHMINE_DEMO_MODE=false")

    advisor = build_dispatcher_advisor_response(
        dataset,
        demo_mode=False,
        selected_date=selected_date,
        selected_shift=selected_shift,
    )
    execution_history = dataset.get("decision_execution_history") or dataset.get("decision_audit_history")
    recommendations = dataset.get("advisor_recommendations")
    if recommendations is None and execution_history:
        recommendations = [recommendation_from_advisor(advisor)]

    history = build_decision_audit_history(recommendations or [], execution_history)
    metrics = calculate_historical_effectiveness(history["records"])
    summary = build_decision_audit_summary(history, metrics)
    status = "SIN_HISTORIAL" if history["status"] == "SIN_HISTORIAL" else ("OK" if metrics["status"] == "OK" else "INSUFICIENTE")
    warnings = []
    if history["status"] == "SIN_HISTORIAL":
        warnings.append("Sin historial real de ejecucion; auditoria actual en modo seguimiento.")
    if metrics.get("status") == "INSUFICIENTE" and history["records"]:
        warnings.append("Historial real insuficiente para calcular precision historica.")

    return {
        "status": status,
        "generated_at": _now_iso(),
        "api_version": DECISION_AUDIT_API_VERSION,
        "data_source": "REAL",
        "source_system": "NORTHMINE",
        "operational_source_system": advisor.get("source_system", "WENCO"),
        "advisor_source": "AI_DISPATCHER_ADVISOR",
        "mode": "DATOS_REALES" if not advisor.get("stale") else "CACHE",
        "is_demo": False,
        "selected_date": advisor.get("selected_date"),
        "selected_shift": advisor.get("selected_shift"),
        "current_decision": _current_decision(advisor),
        "summary": summary,
        "historical_metrics": metrics if history["records"] else None,
        "records": history["records"],
        "executive_summary": summary if metrics.get("status") == "OK" else None,
        "confidence": summary.get("confidence", "BAJA"),
        "message": history.get("message", "Aun no existen decisiones auditadas."),
        "warnings": warnings,
    }
