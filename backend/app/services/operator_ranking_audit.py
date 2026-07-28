from __future__ import annotations

import hashlib
from datetime import datetime
from typing import Any, Mapping

from app.services.operator_score_engine import RESPONSIBLE_USE_NOTE, build_score_explanation
from app.services.operator_ranking_service import (
    build_global_operator_ranking,
    build_operator_detail,
    clean_operator_filters,
    generate_operator_shift_rows,
)


def build_seed_id(filters: Mapping[str, Any]) -> str:
    seed_input = "|".join(
        str(filters.get(key, ""))
        for key in ["start_date", "end_date", "shift", "operator_id", "equipment_id", "phase", "origin", "destination"]
    )
    return hashlib.sha256(seed_input.encode("utf-8")).hexdigest()[:16].upper()


def _period_from_rows(rows: list[dict[str, Any]], filters: Mapping[str, Any]) -> dict[str, Any]:
    dates = sorted({row["fecha"] for row in rows})
    return {
        "start_date": filters.get("start_date") or (dates[0] if dates else None),
        "end_date": filters.get("end_date") or (dates[-1] if dates else None),
        "shift": filters.get("shift") or "TODOS",
        "turnos_analizados": len({(row["fecha"], row["turno"]) for row in rows}),
    }


def _excess_rows(operator: dict[str, Any]) -> list[dict[str, Any]]:
    excess = operator.get("manageable_excess_minutes", {}) or {}
    rows = []
    for category, minutes in sorted(excess.items(), key=lambda item: item[1], reverse=True):
        rows.append(
            {
                "category": category,
                "excess_minutes": int(minutes),
                "applied": int(minutes) > 0,
                "note": "Solo se considera exceso sobre umbral; el tiempo normal no se penaliza.",
            }
        )
    return rows


def build_operator_ranking_audit(filters: Mapping[str, Any] | None = None, username: str = "demo") -> dict[str, Any]:
    filters = clean_operator_filters(filters or {})
    operator_id = filters.get("operator_id")
    if not operator_id:
        ranking_for_default = build_global_operator_ranking(filters)
        items = ranking_for_default.get("items", [])
        operator_id = items[0]["operator_id"] if items else ""
    filters = {**filters, "operator_id": operator_id}
    rows = generate_operator_shift_rows(filters)
    detail = build_operator_detail(filters)
    operator = detail.get("operator") or {}
    ranking = build_global_operator_ranking({key: value for key, value in filters.items() if key != "operator_id"})
    fleet_avg = ranking.get("summary", {}).get("average_score", 0)
    explanation = build_score_explanation(operator, fleet_avg) if operator else detail.get("explanation", [])

    audit = {
        "source": "operator_ranking",
        "data_mode": ranking.get("data_mode", "real_wenco_sql"),
        "generated_at": datetime.utcnow().isoformat(timespec="seconds") + "Z",
        "requested_by": username,
        "applied_filters": filters,
        "seed_id": build_seed_id(filters),
        "operator": {
            "operator_id": operator.get("operator_id", operator_id),
            "operator_name": operator.get("operator_name", "-"),
            "frequent_equipment_id": operator.get("frequent_equipment_id", "-"),
        },
        "period": _period_from_rows(rows, filters),
        "score": {
            "score_global": operator.get("score_global", 0),
            "risk_level": operator.get("risk_level", "-"),
            "risk_reason": operator.get("risk_reason", "-"),
        },
        "components": {
            "productividad_score": operator.get("productividad_score", 0),
            "disponibilidad_score": operator.get("disponibilidad_score", 0),
            "utilizacion_score": operator.get("utilizacion_score", 0),
            "control_demoras_score": operator.get("control_demoras_score", 0),
            "seguridad_score": operator.get("seguridad_score", 0),
        },
        "raw_values": operator.get("raw_values", {}),
        "normalized_scores": operator.get("normalized_scores", {}),
        "penalties": operator.get("penalties", {}),
        "thresholds_used": operator.get("thresholds_used", {}),
        "calculation_trace": operator.get("calculation_trace", []),
        "manageable_delay_excess": _excess_rows(operator),
        "recurrence": operator.get("recurrence", {}),
        "system_delays_context": operator.get("system_delay_breakdown", {}),
        "system_delay_note": "Estas demoras son contexto operacional y no castigan directamente el control de demoras del operador.",
        "impact": {
            "lost_tons_estimated": operator.get("lost_tons_estimated", 0),
            "manageable_delay_minutes": operator.get("manageable_delay_minutes", 0),
            "system_delay_minutes": operator.get("system_delay_minutes", 0),
            "availability_percent": operator.get("disponibilidad_percent", 0),
            "utilization_percent": operator.get("utilizacion_percent", 0),
        },
        "explanation_lines": explanation,
        "recommendation": operator.get("recommendation", detail.get("recommendation", "")),
        "recommendation_reason": operator.get("recommendation_reason", "-"),
        "responsible_use_note": RESPONSIBLE_USE_NOTE,
    }
    return audit


def build_operator_ranking_audit_log(filters: Mapping[str, Any] | None = None, username: str = "demo") -> dict[str, Any]:
    filters = clean_operator_filters(filters or {})
    ranking = build_global_operator_ranking(filters)
    items = ranking.get("items", [])
    now = datetime.utcnow()
    rows = []
    for index, item in enumerate(items[:10]):
        action = "EXPORT_CSV" if index == 0 and filters.get("export") else "VIEW_AUDIT"
        rows.append(
            {
                "timestamp": now.replace(microsecond=0).isoformat() + "Z",
                "usuario": username,
                "accion": action,
                "applied_filters": filters,
                "operator_id": item["operator_id"],
                "operator_name": item["operator_name"],
                "result_score": item["score_global"],
                "risk_level": item["risk_level"],
                "data_mode": ranking.get("data_mode", "real_wenco_sql"),
                "seed_id": build_seed_id({**filters, "operator_id": item["operator_id"]}),
            }
        )
    return {
        "source": "operator_ranking",
        "data_mode": ranking.get("data_mode", "real_wenco_sql"),
        "count": len(rows),
        "items": rows,
    }
