from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any, Callable

from app.services import data_quality_service, kpis
from app.services.data_provider import get_dataset as provider_get_dataset
from app.services.filtering import normalize_shift

"""Herramientas tipadas del Copilot.

Cada herramienta es de solo lectura y delega TODO el calculo a los
servicios ya existentes de NORTHMINE (kpis.py, data_quality_service.py,
data_provider.py) - el modelo de lenguaje nunca toca la base de datos ni
inventa numeros; solo elige que herramienta llamar y con que argumentos, y
esos argumentos se validan aqui contra un esquema cerrado antes de usarse.
"""


def _dataset_for(date: str | None) -> dict[str, Any]:
    return provider_get_dataset(fecha=date) if date else provider_get_dataset()


def _freshness(dataset: dict[str, Any]) -> dict[str, Any]:
    cycles = dataset.get("cycles") or []
    last = max((c.get("datetime") for c in cycles if c.get("datetime")), default=None)
    stale = bool(dataset.get("stale", False))
    source = str(dataset.get("source") or "")
    data_source = str(dataset.get("data_source") or ("DEMO" if "demo" in source.lower() else "REAL")).upper()
    if data_source == "DEMO":
        status = "current"
    elif stale:
        status = "stale"
    elif last:
        status = "current"
    else:
        status = "unknown"
    age_minutes = None
    if last:
        try:
            age_minutes = max(0, int((datetime.now() - datetime.fromisoformat(str(last))).total_seconds() / 60))
        except ValueError:
            age_minutes = None
    return {"last_updated_at": last, "status": status, "age_minutes": age_minutes}


def _quality(dataset: dict[str, Any]) -> dict[str, Any]:
    current = {"current_time": datetime.now().isoformat(timespec="minutes")}
    records = dataset.get("cycles") or []
    stale = bool(dataset.get("stale", False))
    return data_quality_service.build_data_quality(dataset, current, records, stale)


def _confidence_from_quality(quality: dict[str, Any]) -> dict[str, Any]:
    score = float(quality.get("score") or 0)
    status = str(quality.get("status") or "")
    reasons = [f"Calidad de dato {score:.0f}/100 ({status})."]
    if status == "EMPTY":
        return {"level": "insuficiente", "reasons": ["No hay ciclos registrados para el periodo consultado."]}
    if status == "STALE":
        reasons.append("Los datos provienen de cache; no son en vivo.")
        return {"level": "baja" if score < 55 else "media", "reasons": reasons}
    if score >= 80:
        return {"level": "alta", "reasons": reasons}
    if score >= 55:
        return {"level": "media", "reasons": reasons}
    return {"level": "baja", "reasons": reasons}


def _shift_arg(value: str | None) -> str | None:
    if not value:
        return None
    normalized = normalize_shift(value)
    return normalized if normalized in {"DIA", "NOCHE", "ACTUAL", "TODOS"} else None


def _date_arg(value: str | None) -> str | None:
    if not value:
        return None
    try:
        datetime.fromisoformat(str(value)[:10])
        return str(value)[:10]
    except ValueError:
        return None


def tool_get_current_shift_summary(args: dict[str, Any]) -> dict[str, Any]:
    date = _date_arg(args.get("date"))
    shift = _shift_arg(args.get("shift"))
    dataset = _dataset_for(date)
    command_center = kpis.build_current_shift_command_center(dataset, turno=shift, fecha=date)
    quality = _quality(dataset)
    return {
        "fecha": command_center["fecha"],
        "turno": command_center["turno"],
        "toneladas_turno": command_center["toneladas_turno"],
        "meta_turno": command_center["meta_turno"],
        "meta_configurada": command_center["meta_configurada"],
        "cumplimiento_pct": command_center["cumplimiento_pct"],
        "brecha_ton": command_center["brecha_ton"],
        "caex_activos": command_center["caex_activos"],
        "caex_sin_actividad": command_center["caex_sin_actividad"],
        "caex_posible_averia": command_center["caex_posible_averia"],
        "ciclos": command_center["ciclos"],
        "proyeccion": command_center.get("projection"),
        "data_quality": quality,
        "freshness": _freshness(dataset),
        "confidence": _confidence_from_quality(quality),
        "warnings": [] if command_center["meta_configurada"] else ["Meta de turno no configurada."],
    }


def tool_get_production_kpis(args: dict[str, Any]) -> dict[str, Any]:
    date = _date_arg(args.get("date"))
    shift = _shift_arg(args.get("shift"))
    dataset = _dataset_for(date)
    production = kpis.build_production_shift(dataset, turno=shift)
    quality = _quality(dataset)
    return {
        "fecha": production["fecha"],
        "turno_actual": production["turno_actual"],
        "toneladas_turno": production["toneladas_turno"],
        "meta_turno": production["meta_turno"],
        "cumplimiento_pct": production["cumplimiento_pct"],
        "brecha_ton": production["brecha_ton"],
        "ritmo_actual_tph": production["ritmo_actual_tph"],
        "ritmo_requerido_tph": production["ritmo_requerido_tph"],
        "proyeccion_fin_turno": production["proyeccion_fin_turno"],
        "brecha_proyectada_ton": production["brecha_proyectada_ton"],
        "tendencia": production["tendencia"],
        "mejor_hora": production["mejor_hora"],
        "peor_hora": production["peor_hora"],
        "toneladas_por_hora": production["toneladas_por_hora"],
        "data_quality": quality,
        "freshness": _freshness(dataset),
        "confidence": _confidence_from_quality(quality),
        "warnings": production.get("warnings", []),
    }


def tool_get_fleet_status(args: dict[str, Any]) -> dict[str, Any]:
    date = _date_arg(args.get("date"))
    shift = _shift_arg(args.get("shift"))
    status_filter = str(args.get("status_filter") or "").strip().upper() or None
    dataset = _dataset_for(date)
    overview = kpis.build_fleet_overview(dataset, turno=shift)
    equipos = overview["lista_equipos"]
    if status_filter:
        equipos = [item for item in equipos if str(item.get("estado", "")).upper() == status_filter]
    quality = _quality(dataset)
    return {
        "total_equipos": overview["total_equipos"],
        "equipos_activos": overview["equipos_activos"],
        "equipos_en_demora": overview["equipos_en_demora"],
        "equipos_sin_actividad": overview["equipos_sin_actividad"],
        "equipos_mantencion": overview["equipos_mantencion"],
        "equipos_standby": overview["equipos_standby"],
        "utilizacion_pct": overview["utilizacion_pct"],
        "disponibilidad_pct": overview["disponibilidad_pct"],
        "equipos": equipos[:25],
        "data_quality": quality,
        "freshness": _freshness(dataset),
        "confidence": _confidence_from_quality(quality),
    }


def tool_get_alerts(args: dict[str, Any]) -> dict[str, Any]:
    severity = str(args.get("severity") or "").strip().upper() or None
    limit = args.get("limit")
    try:
        limit = max(1, min(int(limit), 20)) if limit is not None else 10
    except (TypeError, ValueError):
        limit = 10
    dataset = _dataset_for(None)
    alerts = kpis.build_operational_alerts(dataset)
    items = alerts["items"]
    if severity:
        items = [item for item in items if str(item.get("severidad", "")).upper() == severity]
    quality = _quality(dataset)
    return {
        "counts": alerts["counts"],
        "items": items[:limit],
        "count": len(items),
        "data_quality": quality,
        "freshness": _freshness(dataset),
        "confidence": _confidence_from_quality(quality),
    }


def tool_get_data_quality_status(args: dict[str, Any]) -> dict[str, Any]:
    date = _date_arg(args.get("date"))
    dataset = _dataset_for(date)
    quality = _quality(dataset)
    return {
        "status": quality["status"],
        "score": quality["score"],
        "completeness_pct": quality["completeness_pct"],
        "cycles_total": quality["cycles_total"],
        "last_record_at": quality["last_record_at"],
        "last_record_age_min": quality["last_record_age_min"],
        "stale": quality["stale"],
        "source": quality["source"],
        "freshness": _freshness(dataset),
        "confidence": _confidence_from_quality(quality),
    }


def tool_get_loading_performance(args: dict[str, Any]) -> dict[str, Any]:
    date = _date_arg(args.get("date"))
    shift = _shift_arg(args.get("shift"))
    loading_unit_id = str(args.get("loading_unit_id") or "").strip().upper() or None
    dataset = _dataset_for(date)
    summary = kpis.build_loading_units_summary(dataset, turno=shift)
    items = summary["items"]
    if loading_unit_id:
        items = [item for item in items if str(item.get("carguio_id", "")).upper() == loading_unit_id]
    quality = _quality(dataset)
    return {
        "total_toneladas": summary["total_toneladas"],
        "rendimiento_promedio_tph": summary["rendimiento_promedio_tph"],
        "unidades": [
            {
                "carguio_id": item["carguio_id"],
                "modelo": item["modelo"],
                "toneladas": item["toneladas"],
                "ciclos": item["ciclos"],
                "camiones_atendidos": item["camiones_atendidos"],
                "rendimiento_tph": item["rendimiento_tph"],
                "estado": item["estado"],
                "variacion_pct": item["variacion_pct"],
            }
            for item in items
        ],
        "data_quality": quality,
        "freshness": _freshness(dataset),
        "confidence": _confidence_from_quality(quality),
    }


@dataclass(frozen=True)
class ToolDefinition:
    name: str
    description: str
    input_schema: dict[str, Any]
    handler: Callable[[dict[str, Any]], dict[str, Any]]


_SHIFT_ENUM = {"type": "string", "enum": ["DIA", "NOCHE", "ACTUAL", "TODOS"], "description": "Turno a consultar."}
_DATE_PROP = {"type": "string", "description": "Fecha ISO (YYYY-MM-DD). Si se omite, usa la fecha operativa actual."}

TOOL_REGISTRY: dict[str, ToolDefinition] = {
    "get_current_shift_summary": ToolDefinition(
        name="get_current_shift_summary",
        description=(
            "Resumen del turno actual o de un turno/fecha especifico: toneladas, "
            "meta, cumplimiento, CAEX activos/sin actividad, calidad y frescura del dato."
        ),
        input_schema={
            "type": "object",
            "properties": {"shift": _SHIFT_ENUM, "date": _DATE_PROP},
            "additionalProperties": False,
        },
        handler=tool_get_current_shift_summary,
    ),
    "get_production_kpis": ToolDefinition(
        name="get_production_kpis",
        description=(
            "KPIs de produccion del turno: real vs plan, ritmo actual y requerido, "
            "proyeccion de fin de turno, tendencia y desglose por hora."
        ),
        input_schema={
            "type": "object",
            "properties": {"shift": _SHIFT_ENUM, "date": _DATE_PROP},
            "additionalProperties": False,
        },
        handler=tool_get_production_kpis,
    ),
    "get_fleet_status": ToolDefinition(
        name="get_fleet_status",
        description=(
            "Estado de la flota CAEX: activos, en demora, sin actividad, en "
            "mantencion, standby, utilizacion y disponibilidad. Permite filtrar por estado."
        ),
        input_schema={
            "type": "object",
            "properties": {
                "shift": _SHIFT_ENUM,
                "date": _DATE_PROP,
                "status_filter": {
                    "type": "string",
                    "enum": ["ACTIVO", "DEMORA", "SIN ACTIVIDAD", "MANTENCION", "STANDBY"],
                    "description": "Filtra solo equipos con este estado.",
                },
            },
            "additionalProperties": False,
        },
        handler=tool_get_fleet_status,
    ),
    "get_alerts": ToolDefinition(
        name="get_alerts",
        description="Alertas operacionales activas, con severidad, equipo y recomendacion asociada.",
        input_schema={
            "type": "object",
            "properties": {
                "severity": {
                    "type": "string",
                    "enum": ["CRITICA", "ALTA", "MEDIA", "BAJA"],
                    "description": "Filtra solo alertas de esta severidad.",
                },
                "limit": {"type": "integer", "minimum": 1, "maximum": 20},
            },
            "additionalProperties": False,
        },
        handler=tool_get_alerts,
    ),
    "get_data_quality_status": ToolDefinition(
        name="get_data_quality_status",
        description=(
            "Calidad y cobertura del dato operacional disponible: completitud, "
            "antiguedad del ultimo registro y si el sistema esta usando cache."
        ),
        input_schema={
            "type": "object",
            "properties": {"date": _DATE_PROP},
            "additionalProperties": False,
        },
        handler=tool_get_data_quality_status,
    ),
    "get_loading_performance": ToolDefinition(
        name="get_loading_performance",
        description=(
            "Rendimiento de unidades de carguio (palas/cargadores): toneladas, ciclos, "
            "camiones atendidos, tasa de carguio (t/h) y variacion contra el promedio de flota."
        ),
        input_schema={
            "type": "object",
            "properties": {
                "shift": _SHIFT_ENUM,
                "date": _DATE_PROP,
                "loading_unit_id": {"type": "string", "description": "Filtra por una unidad de carguio especifica, ej. 'EX3517'."},
            },
            "additionalProperties": False,
        },
        handler=tool_get_loading_performance,
    ),
}


def anthropic_tool_specs(names: frozenset[str]) -> list[dict[str, Any]]:
    return [
        {
            "name": tool.name,
            "description": tool.description,
            "input_schema": tool.input_schema,
        }
        for tool in TOOL_REGISTRY.values()
        if tool.name in names
    ]
