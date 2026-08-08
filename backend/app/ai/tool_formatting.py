from __future__ import annotations

import json
from typing import Any

"""Formato humano de resultados de tools - compartido entre orchestrator.py
(mensajes del chat) y conclusion.py (hechos de una investigacion), para no
duplicar el mapeo tool -> frase legible en dos lugares."""


def summarize_tool_result(name: str, result: dict[str, Any]) -> str:
    try:
        if name == "get_current_shift_summary":
            return (
                f"Turno {result['turno']} ({result['fecha']}): {result['toneladas_turno']:,} t "
                f"vs meta {result['meta_turno']:,} t ({result['cumplimiento_pct']}%), "
                f"{result['caex_activos']} CAEX activos."
            )
        if name == "get_production_kpis":
            return (
                f"Cumplimiento {result['cumplimiento_pct']}%, brecha {result['brecha_ton']:,} t, "
                f"ritmo actual {result['ritmo_actual_tph']} t/h, tendencia {result['tendencia']}."
            )
        if name == "get_fleet_status":
            return (
                f"{result['equipos_activos']}/{result['total_equipos']} CAEX activos, "
                f"utilizacion {result['utilizacion_pct']}%, disponibilidad {result['disponibilidad_pct']}%."
            )
        if name == "get_loading_performance":
            return (
                f"{result['total_toneladas']:,} t via carguio, rendimiento promedio "
                f"{result['rendimiento_promedio_tph']} t/h en {len(result.get('unidades', []))} unidades."
            )
        if name == "get_alerts":
            counts = result.get("counts", {})
            return f"{result['count']} alertas ({counts.get('CRITICA', 0)} criticas, {counts.get('ALTA', 0)} altas)."
        if name == "get_data_quality_status":
            return f"Calidad de dato {result['score']}/100, estado {result['status']}."
    except Exception:  # pragma: no cover - defensivo, nunca debe tumbar la respuesta
        pass
    return json.dumps(result, default=str)[:180]
