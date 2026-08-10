from __future__ import annotations

import json

from app.ai import navigation, policies, repository
from app.ai.orchestrator import _validate_ui_actions
from app.ai.providers import NullProvider
from app.ai.tools import TOOL_REGISTRY
from tests.conftest import auth_header


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


# ── Endpoints: autenticacion y RBAC en el borde HTTP ─────────────────────────

def test_chat_endpoint_requires_authentication(client):
    resp = client.post("/api/ai-copilot/chat", json={"message": "hola", "context": {}})
    assert resp.status_code == 401


def test_task_approval_endpoints_require_authentication(client):
    resp = client.post("/api/ai-copilot/tasks/task-does-not-exist/approve", json={})
    assert resp.status_code == 401


def test_copilot_status_endpoint_reports_availability(client, login_as_operador):
    resp = client.get("/api/ai-copilot/status", headers=auth_header(login_as_operador))
    assert resp.status_code == 200
    body = resp.json()
    assert "ai_enabled" in body
    assert "available" in body


def test_local_operational_engine_is_available_without_external_api_key(client, login_as_operador, monkeypatch):
    from app.ai.providers import LocalOperationalProvider

    monkeypatch.setattr("app.ai.router.get_provider", lambda _settings: LocalOperationalProvider())
    response = client.get("/api/ai-copilot/status", headers=auth_header(login_as_operador))

    assert response.status_code == 200
    assert response.json()["available"] is True
    assert response.json()["provider"] == "local_operational"


def test_local_operational_engine_generates_a_report_draft(client, login_as_operador, monkeypatch):
    from app.ai.providers import LocalOperationalProvider
    from app.services.data_provider import _demo_dataset

    monkeypatch.setattr("app.ai.orchestrator.get_provider", lambda _settings: LocalOperationalProvider())
    monkeypatch.setattr("app.ai.tools.provider_get_dataset", lambda fecha=None: _demo_dataset(fecha, 1))
    response = client.post(
        "/api/ai-copilot/chat",
        headers=auth_header(login_as_operador),
        json={
            "message": "Genera un reporte PDF del turno y abre reportes",
            "context": {"section": "turno", "mine": "MINA CHILE DEMO", "shift": "DIA"},
        },
    )

    assert response.status_code == 200
    events = [json.loads(line) for line in response.text.strip().splitlines() if line.strip()]
    final = [event for event in events if event["type"] == "final"][-1]["response"]
    assert final["degraded"] is False
    assert final["report_drafts"]
    assert final["report_drafts"][0]["status"] == "draft"
    assert final["report_drafts"][0]["sections"]["Alcance"]
    assert any(action["action"] == "navigate" and action["route"] == "reportes" for action in final["ui_actions"])
    assert final["tool_executions"]


def test_chat_history_is_bounded_and_supports_follow_up_context(client, login_as_operador, monkeypatch):
    from app.ai.providers import LocalOperationalProvider
    from app.services.data_provider import _demo_dataset

    monkeypatch.setattr("app.ai.orchestrator.get_provider", lambda _settings: LocalOperationalProvider())
    monkeypatch.setattr("app.ai.tools.provider_get_dataset", lambda fecha=None: _demo_dataset(fecha, 1))
    response = client.post(
        "/api/ai-copilot/chat",
        headers=auth_header(login_as_operador),
        json={
            "message": "Y con eso genera un reporte",
            "history": [
                {"role": "user", "content": "Analiza la produccion y la flota"},
                {"role": "assistant", "content": "Revise los indicadores disponibles."},
            ],
            "context": {"section": "turno", "shift": "DIA"},
        },
    )

    events = [json.loads(line) for line in response.text.strip().splitlines() if line.strip()]
    final = [event for event in events if event["type"] == "final"][-1]["response"]
    used_tools = {execution["name"] for execution in final["tool_executions"] if execution["status"] == "ok"}
    assert {"get_production_kpis", "get_fleet_status"} <= used_tools
    assert final["report_drafts"]


# ── Modo degradado (seccion 19 del brief): sin proveedor, el chat sigue
# respondiendo 200 con una respuesta segura, nunca rompe la plataforma ────

def test_chat_degrades_gracefully_when_provider_is_unavailable(client, login_as_operador, monkeypatch):
    # Fuerza modo degradado sin importar si el entorno real tiene una API key
    # configurada - este test nunca debe llamar a la red.
    monkeypatch.setattr("app.ai.orchestrator.get_provider", lambda _settings: NullProvider())

    resp = client.post(
        "/api/ai-copilot/chat",
        headers=auth_header(login_as_operador),
        json={"message": "Analiza el desempeno del turno actual", "context": {"section": "turno"}},
    )
    assert resp.status_code == 200

    events = [json.loads(line) for line in resp.text.strip().splitlines() if line.strip()]
    final_events = [event for event in events if event["type"] == "final"]
    assert final_events, "el stream debe terminar con un evento 'final'"

    final_response = final_events[-1]["response"]
    assert final_response["degraded"] is True
    assert final_response["requires_human_approval"] is False
    assert final_response["confidence"]["level"] == "insuficiente"
    assert "NORTHMINE Intelligence Copilot" in final_response["disclaimer"]


# ── Human-in-the-loop: ciclo de vida de una tarea borrador ───────────────────

def test_task_draft_requires_explicit_approval_before_it_is_official(client, login_as_operador):
    draft = repository.create_task_draft(
        conversation_id="conv-test",
        title="Revisar asignacion de CAEX en Pala 03",
        reason="La cola promedio aumento 18% en los ultimos 45 minutos.",
        evidence=["Cola actual 7.4 min vs promedio de turno 6.2 min."],
        priority="alta",
        suggested_owner="Despacho",
        linked_finding=None,
        created_by="test-suite",
    )
    assert draft["status"] == "draft"

    headers = auth_header(login_as_operador)

    listing = client.get("/api/ai-copilot/tasks", headers=headers, params={"status_filter": "draft"})
    assert listing.status_code == 200
    assert any(item["id"] == draft["id"] for item in listing.json()["items"])

    approve = client.post(f"/api/ai-copilot/tasks/{draft['id']}/approve", headers=headers, json={})
    assert approve.status_code == 200
    assert approve.json()["status"] == "approved"

    # Una tarea ya aprobada no puede volver a aprobarse: la maquina de estados
    # de repository.py rechaza la transicion en vez de aceptarla en silencio.
    approve_again = client.post(f"/api/ai-copilot/tasks/{draft['id']}/approve", headers=headers, json={})
    assert approve_again.status_code == 409


def test_task_draft_not_found_returns_404(client, login_as_operador):
    resp = client.post(
        "/api/ai-copilot/tasks/task-nonexistent/approve",
        headers=auth_header(login_as_operador),
        json={},
    )
    assert resp.status_code == 404


# ── Herramientas: nunca inventan datos, siempre calculan sobre un dataset real ─

# ── Navegacion semantica y acciones de UI (Etapa 2 base) ─────────────────────

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


def test_every_ui_action_risk_is_auto_or_confirmable_never_critical():
    from app.ai.schemas import UI_ACTION_RISK

    for action_name, risk in UI_ACTION_RISK.items():
        assert not policies.is_risk_prohibited(risk), f"{action_name} nunca deberia ser CRITICAL"


def test_validate_ui_actions_drops_malformed_and_out_of_scope_actions():
    # Exactamente 5 items a proposito: _validate_ui_actions tiene un tope de
    # 5 acciones por turno (ver test_validate_ui_actions_caps_at_five_actions),
    # y este test necesita que las 3 validas sobrevivan sin chocar con ese tope.
    proposed = [
        {"action": "navigate", "route": "produccion"},  # valida
        {"action": "navigate", "route": "admin"},  # seccion restringida para operador
        {"action": "navigate", "route": "/no-existe"},  # ruta invalida
        {"action": "set_filter", "filter_id": "shift", "value": "DIA"},  # valida
        {"action": "select_entity", "entity_type": "equipment", "entity_id": "CAEX-104"},  # valida
    ]

    validated = _validate_ui_actions(proposed, role="operador")

    kinds = [type(item).__name__ for item in validated]
    assert kinds == ["NavigateAction", "SetFilterAction", "SelectEntityAction"]
    assert validated[0].route == "produccion"
    assert validated[1].value == "DIA"
    assert validated[2].entity_id == "CAEX-104"


def test_validate_ui_actions_drops_closed_list_and_unknown_action_violations():
    proposed = [
        {"action": "set_filter", "filter_id": "sql_injection_attempt", "value": "x"},  # filter_id fuera de la lista cerrada
        {"action": "delete_everything"},  # accion inexistente -> riesgo CRITICAL por default
        "esto ni siquiera es un dict",
    ]

    assert _validate_ui_actions(proposed, role="operador") == []


def test_validate_ui_actions_admin_navigation_rejected_even_for_admin_role():
    validated = _validate_ui_actions([{"action": "navigate", "route": "admin"}], role="admin")
    assert validated == []


def test_validate_ui_actions_rejects_unknown_widget_id():
    validated = _validate_ui_actions([{"action": "focus_widget", "widget_id": "widget-inventado"}], role="operador")
    assert validated == []


def test_validate_ui_actions_rejects_invalid_filter_value():
    proposed = [
        {"action": "set_filter", "filter_id": "shift", "value": "MEDIODIA"},
        {"action": "set_filter", "filter_id": "start_date", "value": "no-es-una-fecha"},
    ]
    assert _validate_ui_actions(proposed, role="operador") == []


def test_validate_ui_actions_accepts_known_widget_and_valid_filter_value():
    proposed = [
        {"action": "focus_widget", "widget_id": "production-hourly-chart"},
        {"action": "set_filter", "filter_id": "shift", "value": "DIA"},
    ]
    validated = _validate_ui_actions(proposed, role="operador")
    assert [type(item).__name__ for item in validated] == ["FocusWidgetAction", "SetFilterAction"]


def test_validate_ui_actions_handles_non_list_input_gracefully():
    assert _validate_ui_actions(None, role="operador") == []
    assert _validate_ui_actions("not a list", role="operador") == []
    assert _validate_ui_actions({"action": "navigate"}, role="operador") == []


def test_validate_ui_actions_caps_at_five_actions():
    proposed = [{"action": "set_filter", "filter_id": "shift", "value": "DIA"} for _ in range(20)]
    validated = _validate_ui_actions(proposed, role="operador")
    assert len(validated) == 5


# ── open_entity y allowlist ampliada (Etapa 2.5) ─────────────────────────────

def test_open_entity_accepts_valid_id_and_known_entity_type():
    validated = _validate_ui_actions(
        [{"action": "open_entity", "entity_type": "equipment", "entity_id": "CAEX-104"}], role="operador"
    )
    assert len(validated) == 1
    assert validated[0].action == "open_entity"
    assert validated[0].entity_id == "CAEX-104"


def test_open_entity_rejects_malformed_id_defense_in_depth():
    # El resolver de alias vive en el frontend (registry en vivo); esto es
    # la ultima linea de defensa contra un ID con formato imposible o con
    # intento de inyeccion, sin importar de donde vino.
    proposed = [
        {"action": "open_entity", "entity_type": "equipment", "entity_id": "CAEX-104; DROP TABLE"},
        {"action": "open_entity", "entity_type": "equipment", "entity_id": ""},
        {"action": "open_entity", "entity_type": "equipment", "entity_id": "a" * 41},
    ]
    assert _validate_ui_actions(proposed, role="operador") == []


def test_open_entity_accepts_all_new_entity_types():
    for entity_type in ("equipment", "loading_unit", "alert", "report", "task", "operator", "breakdown"):
        validated = _validate_ui_actions(
            [{"action": "open_entity", "entity_type": entity_type, "entity_id": "ID-1"}], role="operador"
        )
        assert len(validated) == 1, f"entity_type {entity_type} deberia validar"


def test_newly_instrumented_widgets_are_in_the_backend_allowlist():
    for widget_id in (
        "shift-summary", "performance-summary", "performance-by-equipment",
        "loading-rate-chart", "breakdown-summary", "breakdown-active-list",
        "comparison-variance", "operator-ranking-table",
    ):
        assert navigation.is_widget_known(widget_id), f"{widget_id} deberia estar en KNOWN_WIDGET_IDS"


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
