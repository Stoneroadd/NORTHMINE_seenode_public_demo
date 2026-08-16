from __future__ import annotations

from app.ai import navigation, policies
from app.ai.tools import TOOL_REGISTRY


# ── C9: el subsistema legacy (orchestrator.py, router.py, repository.py,
# schemas.py, tabla ai_task_drafts - 0 consumidores reales confirmados) se
# retiro por completo. Este test es la guarda de regresion: si algo lo vuelve
# a montar por accidente, debe fallar aca antes que en produccion. GET usa el
# fallback SPA de main.py (que rechaza explicitamente cualquier /api/* no
# reconocido con 404); POST no tiene ese fallback en el verbo POST, asi que
# Starlette resuelve "coincide el path pero no el metodo" como 405 - ambos
# codigos prueban lo mismo: la ruta real ya no existe, nunca 401/403 (que
# implicaria que la ruta sigue viva y solo le falta autenticacion). ─────────

def test_legacy_ai_copilot_chat_and_task_endpoints_stay_removed(client):
    assert client.get("/api/ai-copilot/chat").status_code == 404
    assert client.get("/api/ai-copilot/status").status_code == 404
    assert client.get("/api/ai-copilot/tasks").status_code == 404
    assert client.get("/api/ai-copilot/feedback").status_code == 404

    assert client.post("/api/ai-copilot/chat", json={"message": "hola", "context": {}}).status_code == 405
    assert client.post("/api/ai-copilot/tasks/any-id/approve", json={}).status_code == 405
    assert client.post("/api/ai-copilot/feedback", json={}).status_code == 405


# ── Politica: allowlist de herramientas y acciones prohibidas ───────────────

def test_read_only_tools_are_a_closed_set_matching_the_registry():
    assert set(TOOL_REGISTRY.keys()) == policies.READ_ONLY_TOOLS


def test_prohibited_actions_are_never_exposed_as_tools():
    assert policies.PROHIBITED_ACTIONS.isdisjoint(policies.READ_ONLY_TOOLS)
    # Ninguna herramienta del registro real coincide por nombre con una accion
    # explicitamente prohibida (WENCO, asignaciones, SQL arbitrario, etc.).
    assert policies.PROHIBITED_ACTIONS.isdisjoint(set(TOOL_REGISTRY.keys()))


def test_viewer_role_has_a_restricted_tool_subset():
    viewer_tools = policies.tools_allowed_for_role("viewer")
    operador_tools = policies.tools_allowed_for_role("operador")

    assert viewer_tools < operador_tools  # subconjunto propio
    assert not policies.is_tool_allowed("viewer", "get_alerts")
    assert not policies.is_tool_allowed("viewer", "get_fleet_status")
    assert policies.is_tool_allowed("viewer", "get_current_shift_summary")
    assert policies.is_tool_allowed("operador", "get_alerts")


def test_unknown_role_gets_no_tools_and_no_chat_access():
    assert policies.tools_allowed_for_role("contratista_externo") == frozenset()
    assert policies.is_tool_allowed("contratista_externo", "get_current_shift_summary") is False
    assert policies.can_use_chat("contratista_externo") is False


def test_only_operational_roles_can_approve_reject_or_complete_tasks():
    assert policies.can_approve("admin") is True
    assert policies.can_approve("supervisor") is True
    assert policies.can_approve("operador") is True
    assert policies.can_approve("viewer") is False


def test_soften_language_rewrites_authority_phrases():
    text = "He decidido detener el equipo. La accion correcta es reasignar. Garantizo que funcionara."
    softened = policies.soften_language(text)

    assert "he decidido" not in softened.lower()
    assert "garantizo que" not in softened.lower()
    assert "los datos sugieren" in softened.lower()


# ── Navegacion semantica (Etapa 2 base, sigue vigente via planner.py/
# capabilityActions.ts - Etapa 4 la reusa tal cual) ──────────────────────────

def test_navigation_accepts_both_section_id_and_route():
    assert navigation.normalize_target("produccion") == "produccion"
    assert navigation.normalize_target("/produccion") == "produccion"
    assert navigation.normalize_target("/ruta-inventada") is None
    assert navigation.normalize_target("") is None


def test_admin_placeholder_section_is_unavailable_for_every_role():
    # 'admin' es un marcador sin contenido real (App.tsx solo muestra un
    # placeholder) - nunca se propone como navegacion valida, ni siquiera
    # para el rol admin (seccion 20: no afirmar control semantico de algo
    # que no existe).
    assert navigation.is_navigation_allowed("admin", "admin") is False
    assert navigation.is_navigation_allowed("admin", "operador") is False
    assert navigation.is_navigation_allowed("admin", "supervisor") is False


def test_admin_prefixed_routes_are_unavailable_regardless_of_role():
    for route in ("adminSistema", "adminUsers", "adminDemoAccess", "adminAuditoria"):
        assert navigation.is_navigation_allowed(route, "admin") is False


def test_operator_ranking_requires_admin_or_supervisor_role():
    assert navigation.is_navigation_allowed("operatorRanking", "admin") is True
    assert navigation.is_navigation_allowed("operatorRanking", "supervisor") is True
    assert navigation.is_navigation_allowed("operatorRanking", "operador") is False


def test_known_widgets_allowlist_rejects_unregistered_ids():
    assert navigation.is_widget_known("production-hourly-chart") is True
    assert navigation.is_widget_known("sec-produccion") is True
    assert navigation.is_widget_known("widget-inventado-por-el-modelo") is False


def test_non_admin_sections_have_no_role_restriction():
    assert navigation.is_navigation_allowed("produccion", "operador") is True
    assert navigation.is_navigation_allowed("alertas", "supervisor") is True


def test_newly_instrumented_widgets_are_in_the_backend_allowlist():
    for widget_id in (
        "shift-summary", "performance-summary", "performance-by-equipment",
        "loading-rate-chart", "breakdown-summary", "breakdown-active-list",
        "comparison-variance", "operator-ranking-table",
    ):
        assert navigation.is_widget_known(widget_id), f"{widget_id} deberia estar en KNOWN_WIDGET_IDS"


# ── Herramientas: nunca inventan datos, siempre calculan sobre un dataset real ─

def test_get_alerts_tool_returns_deterministic_shape(monkeypatch):
    from app.ai import tools as tools_module

    fake_dataset = {
        "source": "wenco-sql-live",
        "data_source": "REAL",
        "stale": False,
        "today": "2026-07-12",
        "plan": [{"date": "2026-07-12", "plan_tons": 3000}],
        "cycles": [
            {
                "id": "c1",
                "datetime": "2026-07-12T08:10:00",
                "fecha_dia": "2026-07-12",
                "turno_calc": "DIA",
                "hora": 8,
                "caex_id": "CAEX-01",
                "carguio_id": "EX-01",
                "tonelaje": 180,
                "destino": "CHANCADO",
                "origen": "F01",
                "fase": "F01",
                "camion_modelo": "CAT793F",
                "pala_modelo": "EX5600",
                "tiempo_vacio_min": 10.0,
                "tiempo_cargado_min": 15.0,
            }
        ],
    }
    monkeypatch.setattr(tools_module, "provider_get_dataset", lambda fecha=None: fake_dataset)

    result = tools_module.tool_get_alerts({"limit": 5})

    assert set(result.keys()) >= {"counts", "items", "count", "data_quality", "freshness", "confidence"}
    assert result["confidence"]["level"] in {"alta", "media", "baja", "insuficiente"}
    assert result["freshness"]["status"] in {"current", "stale", "unknown"}
