from __future__ import annotations

from collections import defaultdict
from datetime import date, datetime, timedelta
from typing import Any

from app.services.data_provider import get_dataset as _provider_get_dataset
from app.services.kpis import build_production_shift, build_summary


def _get_dataset() -> dict[str, Any]:
    return _provider_get_dataset()


def _generated_at() -> str:
    return datetime.now().isoformat(timespec="seconds")


def get_month_summary(dataset: dict[str, Any] | None = None) -> dict[str, Any]:
    summary = build_summary(dataset or _get_dataset())
    return {
        "source": summary["source"],
        "mode": summary.get("mode", "demo"),
        "period": summary["period"],
        "kpis": summary["kpis"],
        "shift_breakdown": summary.get("shift_breakdown", {}),
        "generated_at": summary["generated_at"],
    }


def get_period_summary(dataset: dict[str, Any] | None = None) -> dict[str, Any]:
    summary = build_summary(dataset or _get_dataset())
    return {
        "source": summary["source"],
        "period": summary["period"],
        "phase_breakdown": summary["phase_breakdown"],
        "destinations": summary["destinations"],
        "current_shift": summary["current_shift"],
        "generated_at": summary["generated_at"],
    }


def get_daily_production(dataset: dict[str, Any] | None = None) -> list[dict[str, Any]]:
    return build_summary(dataset or _get_dataset())["daily"]


def get_hourly_production(dataset: dict[str, Any] | None = None, turno: str | None = "ACTUAL") -> list[dict[str, Any]]:
    return build_production_shift(dataset or _get_dataset(), turno=turno)["toneladas_por_hora"]


def get_shift_current(dataset: dict[str, Any] | None = None, turno: str | None = "ACTUAL") -> dict[str, Any]:
    return build_production_shift(dataset or _get_dataset(), turno=turno)


def get_f01_f02_summary(dataset: dict[str, Any] | None = None) -> dict[str, Any]:
    dataset = dataset or _get_dataset()
    by_phase: dict[str, dict[str, Any]] = defaultdict(lambda: {"fase": "", "toneladas": 0, "ciclos": 0})
    for record in dataset["cycles"]:
        phase = str(record.get("fase") or "N/D")
        if phase not in {"F01", "F02"}:
            continue
        row = by_phase[phase]
        row["fase"] = phase
        row["toneladas"] += int(record.get("tonelaje") or 0)
        row["ciclos"] += 1
    items = sorted(by_phase.values(), key=lambda item: item["fase"])
    return {
        "source": dataset.get("source", "wenco-sql-live"),
        "stale": dataset.get("stale", False),
        "count": len(items),
        "items": items,
        "generated_at": _generated_at(),
    }


def get_period_comparison(
    desde_a: str | None = None,
    hasta_a: str | None = None,
    desde_b: str | None = None,
    hasta_b: str | None = None,
) -> dict[str, Any]:
    """Comparacion real entre dos periodos (reemplaza demo_data.gen_compare).

    A diferencia de la version demo, no aplica ningun factor de "uplift"
    artificial: ambos periodos se calculan directamente de ciclos reales de
    WENCO. Solicita a wenco_data.py tantos dias como sean necesarios para
    cubrir el periodo mas antiguo pedido.
    """
    today = date.today()
    desde_a_date = date.fromisoformat(desde_a) if desde_a else today.replace(day=1)
    hasta_a_date = date.fromisoformat(hasta_a) if hasta_a else today.replace(day=15)
    desde_b_date = date.fromisoformat(desde_b) if desde_b else today.replace(day=16)
    hasta_b_date = date.fromisoformat(hasta_b) if hasta_b else today
    if desde_a_date > hasta_a_date:
        desde_a_date, hasta_a_date = hasta_a_date, desde_a_date
    if desde_b_date > hasta_b_date:
        desde_b_date, hasta_b_date = hasta_b_date, desde_b_date

    earliest = min(desde_a_date, desde_b_date)
    dias_needed = max((today - earliest).days + 1, 2)
    dataset = _provider_get_dataset(dias=dias_needed)
    plan_by_date = {row["date"]: int(row["plan_tons"]) for row in dataset["plan"]}

    def window_records(start: date, end: date) -> list[dict[str, Any]]:
        return [
            record for record in dataset["cycles"]
            if start <= date.fromisoformat(record["fecha_dia"]) <= end
        ]

    def stats(start: date, end: date) -> dict[str, Any]:
        records = window_records(start, end)
        days = max((end - start).days + 1, 1)
        total = sum(int(record["tonelaje"]) for record in records)
        cycles = len(records)
        hourly = [
            {
                "hora": hour,
                "label": f"{hour:02d}:00",
                "toneladas": int(
                    sum(int(record["tonelaje"]) for record in records if int(record["hora"]) == hour) / days
                ),
            }
            for hour in range(24)
        ]

        by_loader: dict[str, int] = defaultdict(int)
        for record in records:
            by_loader[record["carguio_id"]] += int(record["tonelaje"])
        loaders = [{"carguio_id": loader_id, "toneladas": value} for loader_id, value in by_loader.items()]

        daily = []
        current = start
        while current <= end:
            key = current.isoformat()
            real = sum(int(record["tonelaje"]) for record in records if record["fecha_dia"] == key)
            plan = plan_by_date.get(key)
            daily.append(
                {
                    "fecha": current.strftime("%d/%m"),
                    "ton": real,
                    "pct": round(real / plan * 100, 1) if plan else 0,
                }
            )
            current += timedelta(days=1)

        best_day = max(daily, key=lambda item: item["ton"], default={"fecha": "-", "ton": 0, "pct": 0})
        worst_day = min(daily, key=lambda item: item["ton"], default={"fecha": "-", "ton": 0, "pct": 0})
        return {
            "label": f"{start:%d/%m}-{end:%d/%m}",
            "tonelaje": total,
            "ciclos": cycles,
            "prom_dia": int(total / days),
            "prom_ciclo": round(total / max(cycles, 1), 1),
            "caex_promedio": len({record["caex_id"] for record in records}),
            "dias_sobre_meta": sum(1 for item in daily if item["pct"] >= 100),
            "hourly": hourly,
            "loaders": sorted(loaders, key=lambda item: item["carguio_id"]),
            "mejor_dia": best_day,
            "peor_dia": worst_day,
        }

    period_a = stats(desde_a_date, hasta_a_date)
    period_b = stats(desde_b_date, hasta_b_date)

    def row(kpi: str, a: float, b: float, suffix: str = "") -> dict[str, Any]:
        variation = round((b - a) / max(abs(a), 1) * 100, 1)
        return {"kpi": kpi, "a": a, "b": b, "var": variation, "trend": "up" if variation >= 0 else "down", "suffix": suffix}

    return {
        "source": dataset.get("source", "wenco-sql-live"),
        "stale": dataset.get("stale", False),
        "periodo_a": {key: period_a[key] for key in ["label", "tonelaje", "ciclos", "prom_dia"]},
        "periodo_b": {key: period_b[key] for key in ["label", "tonelaje", "ciclos", "prom_dia"]},
        "tabla": [
            row("Tonelaje total", period_a["tonelaje"], period_b["tonelaje"], "t"),
            row("Ciclos totales", period_a["ciclos"], period_b["ciclos"]),
            row("Prom/ciclo", period_a["prom_ciclo"], period_b["prom_ciclo"], "t"),
            row("CAEX promedio", period_a["caex_promedio"], period_b["caex_promedio"]),
            row("Dias sobre meta", period_a["dias_sobre_meta"], period_b["dias_sobre_meta"]),
            row("Mejor dia (t)", period_a["mejor_dia"]["ton"], period_b["mejor_dia"]["ton"], "t"),
            row("Peor dia (t)", period_a["peor_dia"]["ton"], period_b["peor_dia"]["ton"], "t"),
        ],
        "hora_hora_a": period_a["hourly"],
        "hora_hora_b": period_b["hourly"],
        "por_pala_a": period_a["loaders"],
        "por_pala_b": period_b["loaders"],
        "mejor_dia_a": period_a["mejor_dia"],
        "peor_dia_a": period_a["peor_dia"],
        "mejor_dia_b": period_b["mejor_dia"],
        "peor_dia_b": period_b["peor_dia"],
        "generated_at": _generated_at(),
    }


def get_operations_summary(dataset: dict[str, Any] | None = None, role: str | None = None) -> dict[str, Any]:
    dataset = dataset or _get_dataset()
    summary = build_summary(dataset)
    if role == "viewer":
        kpis = summary["kpis"]
        return {
            "source": dataset.get("source", "wenco-sql-live"),
            "stale": dataset.get("stale", False),
            "limited": True,
            "kpis": {
                "tonelaje_total": kpis["tonelaje_total"],
                "cumplimiento_pct": kpis["cumplimiento_pct"],
                "caex_activos": kpis["caex_activos"],
                "carguios_activos": kpis["carguios_activos"],
            },
            "current_shift": summary["current_shift"],
            "generated_at": summary["generated_at"],
        }
    return {
        "source": dataset.get("source", "wenco-sql-live"),
        "stale": dataset.get("stale", False),
        "limited": False,
        "filters_supported": True,
        "kpis": summary["kpis"],
        "current_shift": summary["current_shift"],
        "phase_breakdown": summary["phase_breakdown"],
        "destinations": summary["destinations"],
        "daily": summary["daily"],
        "hourly_shift": summary["hourly_shift"],
        "top_loaders": summary["top_loaders"],
        "top_trucks": summary["top_trucks"],
        "count": len(dataset["cycles"]),
        "generated_at": summary["generated_at"],
    }
