from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException, status

from app.core.config import get_settings
from app.core.dependencies import RequireAny

router = APIRouter(prefix="/ai-agent/demo", tags=["ai-agent-demo"])
_ROOT = Path(__file__).resolve().parents[3]
_SCENARIOS_PATH = _ROOT / "agent-harness" / "scenarios" / "demo_scenarios.json"
_FIXTURES_PATH = _ROOT / "agent-harness" / "fixtures" / "operational_fixtures.json"
_ALLOWED_MODES = frozenset({"deterministic", "live"})


def demo_tour_enabled() -> bool:
    """An explicit gate; production can never enable autonomous demo control."""
    settings = get_settings()
    requested = os.getenv("AGENT_DEMO_MODE", "false").strip().lower() == "true"
    return requested and not settings.is_production and (settings.is_demo or settings.is_development or settings.environment == "testing")


def live_demo_available() -> bool:
    # This checkout has the Runtime/WebSocket conversation layer but no
    # configured OpenAI Realtime session endpoint. Never label it LIVE.
    return False


def _load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def available_scenarios() -> list[dict[str, Any]]:
    return list(_load_json(_SCENARIOS_PATH))


def fixture_for(scenario_id: str) -> tuple[str, dict[str, Any]]:
    scenario = next((item for item in available_scenarios() if item["id"] == scenario_id), None)
    if scenario is None:
        raise KeyError(scenario_id)
    fixtures = _load_json(_FIXTURES_PATH)
    fixture_id = str(scenario["fixture"])
    return fixture_id, dict(fixtures[fixture_id])


def seed_demo_memory(*, fixture_id: str, user: dict[str, Any], investigation_id: str | None = None) -> None:
    """Seed one auditable prior observation through the existing Memory API.

    This is deterministic fixture evidence, never presented as live WENCO.
    It lets the normal COMPARE_SHIFT path exercise Working Memory instead of
    bypassing the Runtime with a precomputed response.
    """
    fixture = dict(_load_json(_FIXTURES_PATH)[fixture_id])
    prior = fixture.get("previous_observation")
    if not isinstance(prior, dict):
        return
    from app.ai.memory.working_memory import track_entity

    track_entity(
        entity=str(prior["entity"]),
        entity_type="equipment",
        company_id=user.get("company_id"),
        site_id=user.get("site_id"),
        shift="NOCHE",
        current_issue=str(prior["current_issue"]),
        metric_value=float(prior["metric_value"]),
        metric_label=str(prior["metric_label"]),
        metric_direction="lower_is_worse",
        investigation_id=investigation_id,
        created_by="agent-demo-fixture",
    )


def normalized_tool_result(fixture_id: str, capability_id: str) -> dict[str, Any]:
    """Adapt harness fixtures to existing tool contracts, without a second tool stack."""
    fixtures = _load_json(_FIXTURES_PATH)
    fixture = dict(fixtures[fixture_id])
    quality_value = dict(fixture.get("quality") or {})
    quality = {
        "status": quality_value.get("status", "OK"),
        "score": quality_value.get("score", 94),
        "completeness_pct": quality_value.get("completeness_pct", 98),
        "cycles_total": quality_value.get("cycles_total", 312),
        "last_record_at": "2026-08-12T16:00:00",
        "last_record_age_min": quality_value.get("last_record_age_min", 2),
        "stale": fixture.get("freshness") == "stale",
        "source": "northmine-agent-demo-fixture",
    }
    freshness_status = "stale" if fixture.get("freshness") == "stale" else "current"
    common = {
        "data_quality": quality,
        "freshness": {"status": freshness_status, "last_updated_at": "2026-08-12T16:00:00", "age_minutes": quality["last_record_age_min"]},
        "confidence": {"level": "alta" if quality["score"] >= 80 else "media", "reasons": ["Fixture determinístico del NORTHMINE Agent Harness."]},
    }
    if fixture.get("fault"):
        raise RuntimeError(f"Fuente no disponible en demo: {fixture['fault']}")
    if capability_id == "get_production_kpis":
        value = dict(fixture.get("production") or {})
        compliance = float(value.get("cumplimiento_pct", 0))
        gap = float(value.get("brecha_ton", 0))
        target = round(abs(gap) / max((100 - compliance) / 100, 0.01)) if gap else 70_000
        actual = round(target + gap)
        value.update({
            "fecha": "2026-08-12", "turno_actual": "DIA", "toneladas_turno": actual,
            "meta_turno": target, "brecha_ton": gap, "tendencia": "decreciente",
            "proyeccion_fin_turno": actual, "brecha_proyectada_ton": gap,
            "mejor_hora": {"hora": "11:00", "toneladas": 5_380},
            "peor_hora": {"hora": "14:00", "toneladas": 3_410},
            "toneladas_por_hora": [
                {"hora": "12:00", "real": 5_080, "plan": 5_100},
                {"hora": "13:00", "real": 4_940, "plan": 5_100},
                {"hora": "14:00", "real": 3_410, "plan": 5_100},
                {"hora": "15:00", "real": 3_560, "plan": 5_100},
            ],
        })
        return {**value, **common}
    if capability_id == "get_current_shift_summary":
        production = normalized_tool_result(fixture_id, "get_production_kpis")
        fleet = fixture.get("fleet") or {}
        return {
            "fecha": "2026-08-12", "turno": "DIA", "toneladas_turno": production["toneladas_turno"],
            "meta_turno": production["meta_turno"], "meta_configurada": True,
            "cumplimiento_pct": production.get("cumplimiento_pct"), "brecha_ton": production.get("brecha_ton"),
            "caex_activos": fleet.get("total_equipos", 12) - fleet.get("equipos_en_demora", 0),
            "caex_sin_actividad": 0, "caex_posible_averia": 0, "ciclos": 312,
            "proyeccion": production.get("proyeccion_fin_turno"), "warnings": [], **common,
        }
    if capability_id == "get_fleet_status":
        fleet = dict(fixture.get("fleet") or {})
        fleet.setdefault("equipos_activos", max(0, fleet.get("total_equipos", 12) - fleet.get("equipos_en_demora", 0)))
        fleet.setdefault("equipos_sin_actividad", 0)
        fleet.setdefault("equipos_mantencion", 0)
        fleet.setdefault("equipos_standby", 0)
        fleet.setdefault("equipos", [{"caex_id": "CAEX03", "estado": "DEMORA"}])
        return {**fleet, **common}
    if capability_id == "get_loading_performance":
        loading = dict(fixture.get("loading") or {})
        loading.setdefault("total_toneladas", 59_209)
        loading.setdefault("unidades", [])
        for unit in loading["unidades"]:
            unit.setdefault("modelo", "Unidad de carguío")
            unit.setdefault("toneladas", 11_800 if unit.get("carguio_id") == "PALA 03" else 18_200)
            unit.setdefault("ciclos", 68)
            unit.setdefault("camiones_atendidos", 8)
            unit.setdefault("rendimiento_tph", round(float(loading.get("rendimiento_promedio_tph", 4200)) * (1 + float(unit.get("variacion_pct", 0)) / 100)))
            unit.setdefault("estado", "DESVIACIÓN" if float(unit.get("variacion_pct", 0)) < -10 else "NORMAL")
        return {**loading, **common}
    if capability_id == "get_alerts":
        alerts = dict(fixture.get("alerts") or {})
        alerts.setdefault("items", [{"equipo": "PALA 03", "severidad": "ALTA", "descripcion": "Desviación sostenida de rendimiento"}])
        alerts.setdefault("count", len(alerts["items"]))
        return {**alerts, **common}
    if capability_id == "get_data_quality_status":
        return {**quality, **common}
    raise KeyError(capability_id)


@router.get("/status")
def demo_status(user: dict = RequireAny) -> dict[str, Any]:
    enabled = demo_tour_enabled()
    return {
        "enabled": enabled,
        "classification": "AUTOMATED_AGENT_DEMO",
        "physical_browser_acceptance": "SEPARATE",
        "modes": sorted(_ALLOWED_MODES),
        "live_available": live_demo_available(),
        "scenarios": available_scenarios() if enabled else [],
    }


@router.get("/scenarios/{scenario_id}")
def demo_scenario(scenario_id: str, mode: str = "deterministic", user: dict = RequireAny) -> dict[str, Any]:
    if not demo_tour_enabled():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent Demo Tour no habilitado en este entorno.")
    if mode not in _ALLOWED_MODES:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="Modo de demostración inválido.")
    try:
        fixture_id, _ = fixture_for(scenario_id)
        scenario = next(item for item in available_scenarios() if item["id"] == scenario_id)
    except KeyError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Escenario no encontrado.") from exc
    effective_mode = mode if mode != "live" or live_demo_available() else "deterministic"
    return {
        **scenario,
        "requested_mode": mode,
        "mode": effective_mode,
        "fallback_reason": "OpenAI Realtime no está configurado; se usa demo determinística." if effective_mode != mode else None,
        "fixture_id": fixture_id,
        "classification": "AUTOMATED_AGENT_DEMO",
    }
