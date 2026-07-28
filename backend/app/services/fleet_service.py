from __future__ import annotations

from collections import defaultdict
from datetime import datetime
from typing import Any

from app.services.data_provider import get_dataset as _provider_get_dataset
from app.services.data_provider import get_fleet_full as _provider_get_fleet_full


def _get_fleet_full(dias: int = 7, seed: int = 42) -> dict[str, Any]:
    return _provider_get_fleet_full(dias=dias, seed=seed)


def _get_dataset() -> dict[str, Any]:
    return _provider_get_dataset()


def _generated_at() -> str:
    return datetime.now().isoformat(timespec="seconds")


def _route_distance_km(origin: str, destination: str) -> float:
    destination_upper = destination.upper()
    base = 3.2
    if "CHANCADO" in destination_upper:
        base = 4.8
    elif "F02" in destination_upper:
        base = 3.7
    elif "2440" in destination_upper:
        base = 3.9
    elif "2420" in destination_upper:
        base = 3.1
    origin_adjust = 0.15 * (sum(ord(ch) for ch in origin) % 7)
    return round(base + origin_adjust, 2)


def get_caex_ranking_by_tonnage(dias: int = 7) -> dict[str, Any]:
    data = _get_fleet_full(dias=dias)
    return {"source": data["source"], "stale": data.get("stale", False), "count": len(data["ranking"]), "items": data["ranking"], "generated_at": _generated_at()}


def get_caex_ranking_by_model(dias: int = 7) -> dict[str, Any]:
    data = _get_fleet_full(dias=dias)
    return {"source": data["source"], "stale": data.get("stale", False), "count": len(data["por_modelo"]), "items": data["por_modelo"], "generated_at": _generated_at()}


def get_caex_fastest(dias: int = 7, limit: int = 10) -> dict[str, Any]:
    data = _get_fleet_full(dias=dias)
    ranking = sorted(data["ranking"], key=lambda item: item["tiempo_ciclo_min"])[:limit]
    return {"source": data["source"], "stale": data.get("stale", False), "count": len(ranking), "items": ranking, "generated_at": _generated_at()}


def get_caex_slowest(dias: int = 7, limit: int = 10) -> dict[str, Any]:
    data = _get_fleet_full(dias=dias)
    ranking = sorted(data["ranking"], key=lambda item: item["tiempo_ciclo_min"], reverse=True)[:limit]
    return {"source": data["source"], "stale": data.get("stale", False), "count": len(ranking), "items": ranking, "generated_at": _generated_at()}


def get_caex_cycle_time(dias: int = 7) -> dict[str, Any]:
    data = _get_fleet_full(dias=dias)
    ranking = data["ranking"]
    avg = round(sum(item["tiempo_ciclo_min"] for item in ranking) / max(len(ranking), 1), 1)
    items = [
        {
            "caex_id": item["caex_id"],
            "modelo": item["modelo"],
            "avg_cycle_min": item["tiempo_ciclo_min"],
            "toneladas_por_ciclo": item["prom_ciclo"],
            "estado": item["estado"],
        }
        for item in ranking
    ]
    return {"source": data["source"], "stale": data.get("stale", False), "average_cycle_min": avg, "count": len(items), "items": items, "generated_at": _generated_at()}


def get_caex_distance_summary(dataset: dict[str, Any] | None = None) -> dict[str, Any]:
    """Distancia estimada por CAEX y por ruta (HAUL_DISTANCE/EMPTY_DISTANCE
    reales no cubren el tramo completo origen->destino en todos los ciclos,
    ver docs/DIAGNOSTICO_ARQUITECTURA_2026-07.md - _route_distance_km es una
    heuristica declarada como estimada, no un valor GPS real; ver "source").
    """
    dataset = dataset or _get_dataset()
    rows: dict[str, dict[str, Any]] = defaultdict(lambda: {"caex_id": "", "modelo": "", "toneladas": 0, "ciclos": 0, "distance_km": 0.0})
    route_rows: dict[tuple[str, str], dict[str, Any]] = defaultdict(lambda: {"origin": "", "destination": "", "toneladas": 0, "ciclos": 0, "distance_km": 0.0})
    for record in dataset["cycles"]:
        distance = _route_distance_km(str(record.get("origen") or ""), str(record.get("destino") or ""))
        caex_id = str(record["caex_id"])
        row = rows[caex_id]
        row["caex_id"] = caex_id
        row["modelo"] = str(record.get("camion_modelo") or "")
        row["toneladas"] += int(record.get("tonelaje") or 0)
        row["ciclos"] += 1
        row["distance_km"] += distance
        key = (str(record.get("origen") or ""), str(record.get("destino") or ""))
        route = route_rows[key]
        route["origin"], route["destination"] = key
        route["toneladas"] += int(record.get("tonelaje") or 0)
        route["ciclos"] += 1
        route["distance_km"] += distance

    items = []
    for row in rows.values():
        items.append({
            **row,
            "toneladas": int(row["toneladas"]),
            "ciclos": int(row["ciclos"]),
            "distance_km": round(row["distance_km"], 2),
            "avg_distance_km": round(row["distance_km"] / max(row["ciclos"], 1), 2),
        })
    items = sorted(items, key=lambda item: item["toneladas"], reverse=True)

    routes = []
    for route in route_rows.values():
        routes.append({
            **route,
            "toneladas": int(route["toneladas"]),
            "ciclos": int(route["ciclos"]),
            "distance_km": round(route["distance_km"], 2),
            "avg_distance_km": round(route["distance_km"] / max(route["ciclos"], 1), 2),
        })
    routes = sorted(routes, key=lambda route: route["toneladas"], reverse=True)

    total_distance = sum(item["distance_km"] for item in items)
    total_ciclos = sum(item["ciclos"] for item in items)
    return {
        "source": "estimated",
        "total_distance_km": round(total_distance, 2),
        "avg_distance_per_cycle_km": round(total_distance / max(total_ciclos, 1), 2),
        "count": len(items),
        "items": items,
        "routes": routes,
        "generated_at": _generated_at(),
    }