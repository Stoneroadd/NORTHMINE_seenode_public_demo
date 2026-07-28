from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

from app.services.data_provider import get_dataset as _provider_get_dataset
from app.services.data_provider import get_equipment_status_history as _provider_get_equipment_status_history
from app.services.kpis import build_fleet_status, build_operational_alerts

_CATEGORY_TO_STATUS = {
    "MANTENCION": "MANTENCION",
    "DEMORA_OPERACIONAL": "DEMORA",
}


def _generated_at() -> str:
    return datetime.now().isoformat(timespec="seconds")


def _severity_for_status(status: str) -> str:
    if status == "MANTENCION":
        return "CRITICA"
    if status in {"SIN ACTIVIDAD", "DEMORA"}:
        return "ALTA"
    return "MEDIA"


def get_active_breakdowns(dataset: dict[str, Any] | None = None) -> dict[str, Any]:
    dataset = dataset or _provider_get_dataset()
    items = []
    for item in build_fleet_status(dataset):
        status = str(item.get("estado") or "")
        if status not in {"MANTENCION", "DEMORA", "SIN ACTIVIDAD"}:
            continue
        minutes = int(item.get("minutos_sin_actividad") or 0)
        last_activity = str(item.get("ultima_actividad") or _generated_at())
        try:
            started_at = (datetime.fromisoformat(last_activity) - timedelta(minutes=minutes)).isoformat(timespec="minutes")
        except ValueError:
            started_at = last_activity
        items.append(
            {
                "id": f"AV-{item['caex_id']}",
                "equipment_id": item["caex_id"],
                "model": item.get("modelo"),
                "status": status,
                "severity": _severity_for_status(status),
                "started_at": started_at,
                "last_activity": last_activity,
                "duration_min": minutes,
                "description": item.get("alerta") or f"Equipo en estado {status.lower()}.",
                "recommendation": "Validar condicion mecanica, cola operacional y reasignacion si aplica.",
            }
        )
    return {
        "source": dataset.get("source", "wenco-sql-live"),
        "stale": dataset.get("stale", False),
        "count": len(items),
        "items": items,
        "generated_at": _generated_at(),
    }


def get_inactivity_alerts(dataset: dict[str, Any] | None = None, threshold_min: int = 60) -> dict[str, Any]:
    dataset = dataset or _provider_get_dataset()
    items = []
    for item in build_fleet_status(dataset):
        minutes = int(item.get("minutos_sin_actividad") or 0)
        if minutes < threshold_min:
            continue
        items.append(
            {
                "id": f"INACT-{item['caex_id']}",
                "equipment_id": item["caex_id"],
                "model": item.get("modelo"),
                "status": item.get("estado"),
                "severity": "CRITICA" if minutes >= 180 else "ALTA",
                "last_activity": item.get("ultima_actividad"),
                "duration_min": minutes,
                "description": f"{item['caex_id']} acumula {minutes} min sin ciclo registrado.",
                "recommendation": "Confirmar ubicacion, estado mecanico y disponibilidad de frente.",
            }
        )
    return {
        "source": dataset.get("source", "wenco-sql-live"),
        "stale": dataset.get("stale", False),
        "threshold_min": threshold_min,
        "count": len(items),
        "items": items,
        "generated_at": _generated_at(),
    }


def get_breakdown_history(dataset: dict[str, Any] | None = None, dias: int = 7) -> dict[str, Any]:
    """Historial real de averias/demoras, desde EQUIP_STATUS_TRANS (HU-11: purga de fabricacion).

    Antes generaba eventos con `random`/`index % 17`; ahora usa las
    transiciones de estado MANTENCION/DEMORA_OPERACIONAL reales via
    wenco_data.get_equipment_status_history.
    """
    dataset = dataset or _provider_get_dataset()
    modelo_by_equip: dict[str, str] = {}
    for record in dataset["cycles"]:
        modelo_by_equip.setdefault(record["caex_id"], record.get("camion_modelo"))

    now = datetime.now()
    items = []
    for row in _provider_get_equipment_status_history(dias=dias):
        status = _CATEGORY_TO_STATUS.get(row["category"])
        if status is None:
            continue
        equip_id = row["equip_ident"]
        try:
            started_at = datetime.fromisoformat(row["start_timestamp"]) if row["start_timestamp"] else None
        except ValueError:
            started_at = None
        try:
            ended_at = datetime.fromisoformat(row["end_timestamp"]) if row["end_timestamp"] else now
        except ValueError:
            ended_at = now
        minutes = int((ended_at - started_at).total_seconds() / 60) if started_at else 0
        items.append(
            {
                "id": f"AV-HIST-{equip_id}-{row['start_timestamp']}",
                "equipment_id": equip_id,
                "model": modelo_by_equip.get(equip_id),
                "status": status,
                "severity": _severity_for_status(status),
                "started_at": row["start_timestamp"],
                "ended_at": row["end_timestamp"],
                "last_activity": row["end_timestamp"] or row["start_timestamp"],
                "duration_min": minutes,
                "description": row.get("status_desc") or f"{equip_id} en estado {status.lower()}.",
                "recommendation": "Validar condicion mecanica, cola operacional y reasignacion si aplica.",
            }
        )
    return {
        "source": dataset.get("source", "wenco-sql-live"),
        "stale": dataset.get("stale", False),
        "count": len(items),
        "items": items,
        "generated_at": _generated_at(),
    }


def get_averias_summary(dataset: dict[str, Any] | None = None) -> dict[str, Any]:
    dataset = dataset or _provider_get_dataset()
    active = get_active_breakdowns(dataset)["items"]
    inactivity = get_inactivity_alerts(dataset)["items"]
    alerts = build_operational_alerts(dataset)
    counts = alerts.get("counts", {})
    return {
        "source": dataset.get("source", "wenco-sql-live"),
        "stale": dataset.get("stale", False),
        "active_breakdowns": len(active),
        "inactive_equipment": len(inactivity),
        "maintenance_equipment": sum(1 for item in active if item["status"] == "MANTENCION"),
        "critical_alerts": int(counts.get("CRITICA") or 0),
        "high_alerts": int(counts.get("ALTA") or 0),
        "items": active[:6],
        "generated_at": _generated_at(),
    }
