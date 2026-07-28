from __future__ import annotations

import csv
import io
from collections import defaultdict
from datetime import datetime
from typing import Any

from app.services.data_provider import get_dataset as _provider_get_dataset
from app.services.kpis import build_current_shift_command_center, build_loading_units_summary, build_shift_report


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


def get_current_shift_summary(dataset: dict[str, Any] | None = None) -> dict[str, Any]:
    data = build_current_shift_command_center(dataset or _provider_get_dataset())
    avg_caex = sum(item["toneladas"] for item in data["caex_status"]) / max(len(data["caex_status"]), 1)
    data["caex_bajo_promedio"] = [
        {
            **item,
            "porcentaje_promedio": round(item["toneladas"] / max(avg_caex, 1) * 100, 1),
        }
        for item in data["caex_status"]
        if item["toneladas"] < avg_caex * 0.8
    ][:10]
    return data


def get_shift_hourly_tonnage(dataset: dict[str, Any] | None = None) -> dict[str, Any]:
    data = build_current_shift_command_center(dataset or _provider_get_dataset())
    return {"source": data["source"], "stale": data.get("stale", False), "count": len(data["hourly"]), "items": data["hourly"], "generated_at": data["generated_at"]}


def get_loading_unit_performance(dataset: dict[str, Any] | None = None) -> dict[str, Any]:
    data = build_current_shift_command_center(dataset or _provider_get_dataset())
    items = sorted(data["loading_units"], key=lambda item: item["toneladas"], reverse=True)
    return {"source": data["source"], "stale": data.get("stale", False), "count": len(items), "items": items, "generated_at": data["generated_at"]}


def get_shift_caex_ranking(dataset: dict[str, Any] | None = None) -> dict[str, Any]:
    data = build_current_shift_command_center(dataset or _provider_get_dataset())
    items = sorted(data["caex_status"], key=lambda item: item["toneladas"], reverse=True)
    for index, item in enumerate(items, start=1):
        item["rank"] = index
        item["rendimiento_tph"] = round(item["toneladas"] / max(data["elapsed_minutes"] / 60, 1), 1)
    return {"source": data["source"], "stale": data.get("stale", False), "count": len(items), "items": items, "generated_at": data["generated_at"]}


def get_shift_export_data(dataset: dict[str, Any] | None = None) -> dict[str, Any]:
    dataset = dataset or _provider_get_dataset()
    return {
        "source": dataset.get("source", "wenco-sql-live"),
        "shift": build_shift_report(dataset),
        "caex_ranking": get_shift_caex_ranking(dataset)["items"],
        "loading_units": get_loading_unit_performance(dataset)["items"],
        "generated_at": _generated_at(),
    }


def export_shift_csv(dataset: dict[str, Any] | None = None, export_type: str = "shift") -> str:
    export = get_shift_export_data(dataset or _provider_get_dataset())
    output = io.StringIO()
    writer = csv.writer(output)
    if export_type == "caex":
        writer.writerow(["rank", "caex_id", "modelo", "estado", "toneladas", "ciclos", "rendimiento_tph", "origen", "destino", "distancia_km_ciclo"])
        for item in export["caex_ranking"]:
            writer.writerow([item.get("rank"), item.get("caex_id"), item.get("modelo"), item.get("estado"), item.get("toneladas"), item.get("ciclos"), item.get("rendimiento_tph"), item.get("origen_principal"), item.get("destino_principal"), item.get("avg_distance_km")])
    elif export_type == "loading":
        writer.writerow(["carguio_id", "modelo", "estado", "toneladas", "ciclos", "rendimiento_tph", "ubicacion", "destino", "distancia_km_ciclo"])
        for item in export["loading_units"]:
            writer.writerow([item.get("carguio_id"), item.get("modelo"), item.get("estado"), item.get("toneladas"), item.get("ciclos"), item.get("rendimiento_tph"), item.get("ubicacion"), item.get("destino_principal"), item.get("avg_distance_km")])
    else:
        report = export["shift"]
        writer.writerow(["fecha", "turno", "toneladas", "meta", "cumplimiento_pct", "brecha", "resumen"])
        writer.writerow([report.get("fecha"), report.get("turno"), report.get("toneladas"), report.get("meta"), report.get("cumplimiento_pct"), report.get("brecha"), report.get("resumen_texto")])
    return output.getvalue()


def export_shift_xlsx(dataset: dict[str, Any] | None = None, export_type: str = "shift") -> bytes:
    from openpyxl import Workbook
    from openpyxl.styles import Font

    export = get_shift_export_data(dataset or _provider_get_dataset())
    workbook = Workbook()
    sheet = workbook.active
    bold = Font(bold=True)

    if export_type == "caex":
        sheet.title = "Ranking CAEX"
        sheet.append(["rank", "caex_id", "modelo", "estado", "toneladas", "ciclos", "rendimiento_tph", "origen", "destino", "distancia_km_ciclo"])
        for item in export["caex_ranking"]:
            sheet.append([item.get("rank"), item.get("caex_id"), item.get("modelo"), item.get("estado"), item.get("toneladas"), item.get("ciclos"), item.get("rendimiento_tph"), item.get("origen_principal"), item.get("destino_principal"), item.get("avg_distance_km")])
    elif export_type == "loading":
        sheet.title = "Unidades de carguio"
        sheet.append(["carguio_id", "modelo", "estado", "toneladas", "ciclos", "rendimiento_tph", "ubicacion", "destino", "distancia_km_ciclo"])
        for item in export["loading_units"]:
            sheet.append([item.get("carguio_id"), item.get("modelo"), item.get("estado"), item.get("toneladas"), item.get("ciclos"), item.get("rendimiento_tph"), item.get("ubicacion"), item.get("destino_principal"), item.get("avg_distance_km")])
    else:
        sheet.title = "Turno"
        report = export["shift"]
        sheet.append(["fecha", "turno", "toneladas", "meta", "cumplimiento_pct", "brecha", "resumen"])
        sheet.append([report.get("fecha"), report.get("turno"), report.get("toneladas"), report.get("meta"), report.get("cumplimiento_pct"), report.get("brecha"), report.get("resumen_texto")])

    for cell in sheet[1]:
        cell.font = bold

    for column_cells in sheet.columns:
        lengths = [len(str(cell.value)) for cell in column_cells if cell.value is not None]
        width = min(max((max(lengths) if lengths else 10) + 2, 10), 40)
        sheet.column_dimensions[column_cells[0].column_letter].width = width

    buffer = io.BytesIO()
    workbook.save(buffer)
    return buffer.getvalue()


# Ventana ampliada solo para reportes historicos: el dataset global usa 2 dias
# por rendimiento; aqui se piden 8 para poder reimprimir turnos anteriores.
_REPORT_HISTORY_DAYS = 8


def get_shift_report_dates(dataset: dict[str, Any] | None = None) -> dict[str, Any]:
    """Turnos con ciclos disponibles en el dataset, para reportes anteriores."""
    dataset = dataset or _provider_get_dataset(dias=_REPORT_HISTORY_DAYS)
    combos: dict[tuple[str, str], int] = defaultdict(int)
    for record in dataset["cycles"]:
        fecha = str(record.get("shift_date") or record.get("fecha_dia") or "")[:10]
        turno = str(record.get("turno_calc") or "").upper()
        if fecha and turno in ("DIA", "NOCHE"):
            combos[(fecha, turno)] += 1
    items = [
        {"fecha": fecha, "turno": turno, "ciclos": count}
        for (fecha, turno), count in combos.items()
    ]
    items.sort(key=lambda item: (item["fecha"], item["turno"]), reverse=True)
    return {"count": len(items), "items": items, "generated_at": _generated_at()}


def get_shift_report_snapshot(dataset: dict[str, Any] | None = None, fecha: str = "", turno: str = "NOCHE") -> dict[str, Any]:
    """Snapshot de un turno pasado con la misma estructura que usa el PDF."""
    from app.services.kpis import _caex_model_routes, _hour_label, _resolve_shift_target, _route_fields, _tons

    dataset = dataset or _provider_get_dataset(dias=_REPORT_HISTORY_DAYS)
    turno = "DIA" if str(turno).upper() == "DIA" else "NOCHE"
    records = []
    for record in dataset["cycles"]:
        rec_fecha = str(record.get("shift_date") or record.get("fecha_dia") or "")[:10]
        if rec_fecha == fecha and str(record.get("turno_calc") or "").upper() == turno:
            records.append(record)

    hours_order = list(range(7, 19)) if turno == "DIA" else list(range(19, 24)) + list(range(0, 7))
    hourly_map: dict[int, dict[str, int]] = defaultdict(lambda: {"toneladas": 0, "ciclos": 0})
    truck_records: dict[str, list[dict[str, Any]]] = defaultdict(list)
    loader_records: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for record in records:
        hora = int(record.get("hora") or 0)
        hourly_map[hora]["toneladas"] += _tons(record)
        hourly_map[hora]["ciclos"] += 1
        if record.get("caex_id"):
            truck_records[str(record["caex_id"])].append(record)
        if record.get("carguio_id"):
            loader_records[str(record["carguio_id"])].append(record)

    caex = []
    for truck_id, recs in truck_records.items():
        caex.append(
            {
                "caex_id": truck_id,
                "modelo": str(recs[0].get("camion_modelo") or "N/D"),
                "toneladas": sum(_tons(r) for r in recs),
                "ciclos": len(recs),
                **_route_fields(recs),
            }
        )
    caex.sort(key=lambda item: item["toneladas"], reverse=True)
    for index, item in enumerate(caex, start=1):
        item["rank"] = index

    loading_units = []
    for loader_id, recs in loader_records.items():
        tons = sum(_tons(r) for r in recs)
        route = _route_fields(recs)
        loading_units.append(
            {
                "carguio_id": loader_id,
                "modelo": str(recs[0].get("pala_modelo") or "N/D"),
                "toneladas": tons,
                "ciclos": len(recs),
                "rendimiento_tph": round(tons / 12, 1),
                "ubicacion": route.get("origen_principal") or "Sin dato",
                **route,
            }
        )
    loading_units.sort(key=lambda item: item["toneladas"], reverse=True)

    total = sum(_tons(record) for record in records)
    meta_turno, _, meta_configurada, meta_source = _resolve_shift_target(dataset, fecha, turno)
    return {
        "source": dataset.get("source", "wenco-sql-live"),
        "historic": True,
        "fecha": fecha,
        "turno": turno,
        "shift_label": f"TURNO {turno}",
        "elapsed_minutes": 720,
        "toneladas_turno": total,
        "ciclos": len(records),
        "meta_turno": meta_turno,
        "meta_configurada": meta_configurada,
        "meta_source": meta_source,
        "cumplimiento_pct": round(total / meta_turno * 100, 1) if meta_turno else 0,
        "hourly": [
            {"hora": hora, "label": _hour_label(hora), "toneladas": hourly_map[hora]["toneladas"], "ciclos": hourly_map[hora]["ciclos"]}
            for hora in hours_order
        ],
        "caex": caex,
        "loading_units": loading_units,
        "caex_model_routes": _caex_model_routes(records),
        "generated_at": _generated_at(),
    }


def get_loading_unit_ranking(dataset: dict[str, Any] | None = None, turno: str | None = "ACTUAL") -> dict[str, Any]:
    data = build_loading_units_summary(dataset or _provider_get_dataset(), turno=turno)
    items = sorted(data["items"], key=lambda item: item["toneladas"], reverse=True)
    for index, item in enumerate(items, start=1):
        item["rank"] = index
        item["toneladas_por_ciclo"] = round(item["toneladas"] / max(item["ciclos"], 1), 1)
    return {**data, "items": items, "unidades": items, "count": len(items)}


def get_loading_unit_hourly_performance(dataset: dict[str, Any] | None = None) -> dict[str, Any]:
    data = build_current_shift_command_center(dataset or _provider_get_dataset())
    return {"source": data["source"], "stale": data.get("stale", False), "count": len(data["loader_hourly"]), "items": data["loader_hourly"], "generated_at": data["generated_at"]}


def get_loading_unit_distance_per_cycle(dataset: dict[str, Any] | None = None) -> dict[str, Any]:
    dataset = dataset or _provider_get_dataset()
    rows: dict[str, dict[str, Any]] = defaultdict(lambda: {"carguio_id": "", "toneladas": 0, "ciclos": 0, "distance_km": 0.0})
    for record in dataset["cycles"]:
        loader_id = str(record["carguio_id"])
        row = rows[loader_id]
        row["carguio_id"] = loader_id
        row["toneladas"] += int(record.get("tonelaje") or 0)
        row["ciclos"] += 1
        row["distance_km"] += _route_distance_km(str(record.get("origen") or ""), str(record.get("destino") or ""))
    items = []
    for row in rows.values():
        row["avg_distance_km"] = round(row["distance_km"] / max(row["ciclos"], 1), 2)
        row["toneladas_por_ciclo"] = round(row["toneladas"] / max(row["ciclos"], 1), 1)
        row["distance_km"] = round(row["distance_km"], 2)
        items.append(row)
    return {"source": "estimated", "count": len(items), "items": sorted(items, key=lambda item: item["toneladas"], reverse=True), "generated_at": _generated_at()}


def get_loading_unit_routes(dataset: dict[str, Any] | None = None) -> dict[str, Any]:
    dataset = dataset or _provider_get_dataset()
    rows: dict[tuple[str, str, str], dict[str, Any]] = defaultdict(lambda: {"carguio_id": "", "origin": "", "destination": "", "toneladas": 0, "ciclos": 0, "distance_km": 0.0})
    for record in dataset["cycles"]:
        key = (str(record["carguio_id"]), str(record["origen"]), str(record["destino"]))
        row = rows[key]
        row["carguio_id"], row["origin"], row["destination"] = key
        row["toneladas"] += int(record.get("tonelaje") or 0)
        row["ciclos"] += 1
        row["distance_km"] += _route_distance_km(key[1], key[2])
    items = []
    for row in rows.values():
        row["avg_distance_km"] = round(row["distance_km"] / max(row["ciclos"], 1), 2)
        row["distance_km"] = round(row["distance_km"], 2)
        items.append(row)
    return {"source": "estimated", "count": len(items), "items": sorted(items, key=lambda item: item["toneladas"], reverse=True)[:30], "generated_at": _generated_at()}
