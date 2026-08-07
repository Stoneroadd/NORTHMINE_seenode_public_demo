from __future__ import annotations

import uuid

import pytest

from app.ai import verifier
from app.ai.investigation_schemas import EvidenceItem
from app.ai.perception_schemas import PerceivedWidgetState, SemanticPerceptionState, VisualObservation
from app.ai.runtime.command_router import AgentCommandType, classify
from app.ai.runtime.session_manager import AgentSessionManager
from app.ai.vision.null_provider import NullVisionProvider
from app.ai.vision.protocols import VisionProviderUnavailable
from app.core.config import get_settings
from tests.conftest import auth_header

"""Tests de percepcion (Etapa 5): parches incrementales de contexto,
resolucion de widget enfocado, clasificacion de comandos de percepcion,
prioridad de evidencia, deteccion de conflictos UI/backend y visual/
semantica, modo degradado de VisionProvider, y el flujo WS completo."""


# ── SemanticPerceptionState: parches incrementales ───────────────────────

def test_context_patch_only_updates_provided_keys():
    state = SemanticPerceptionState(module_id="produccion", focused_widget_id="w1")
    state.apply_patch({"focusedWidgetId": "w2"})
    assert state.module_id == "produccion"  # no se toco
    assert state.focused_widget_id == "w2"


def test_context_patch_registers_visible_widgets_and_resolves_focus():
    state = SemanticPerceptionState()
    state.apply_patch({
        "focusedWidgetId": "chart-1",
        "visibleWidgets": [
            {"widgetId": "chart-1", "type": "chart", "label": "Produccion", "moduleId": "produccion", "semanticSummary": "8420 t/h."},
        ],
    })
    widget = state.focused_widget()
    assert widget is not None
    assert widget.label == "Produccion"
    assert widget.semantic_summary == "8420 t/h."


def test_context_patch_ignores_malformed_widget_entries():
    state = SemanticPerceptionState()
    state.apply_patch({"visibleWidgets": [{"not_a_widget_id": True}]})
    assert state.visible_widgets == {}


def test_resolve_widget_returns_none_for_unknown_id():
    state = SemanticPerceptionState()
    assert state.resolve_widget("does-not-exist") is None
    assert state.resolve_widget(None) is None


# ── Command Router: comandos de percepcion (seccion 24) ──────────────────

@pytest.mark.parametrize(
    "text,expected_type",
    [
        ("¿Qué estoy viendo?", AgentCommandType.SCREEN_CONTEXT),
        ("¿Qué veo?", AgentCommandType.SCREEN_CONTEXT),
        ("Explícame este gráfico.", AgentCommandType.EXPLAIN_WIDGET),
        ("¿Qué significa este indicador?", AgentCommandType.EXPLAIN_WIDGET),
        ("¿Qué ves raro aquí?", AgentCommandType.ANALYZE_WIDGET_VISUALLY),
        ("Analiza esta pantalla.", AgentCommandType.ANALYZE_CURRENT_VIEW),
        ("Muéstrame ese equipo.", AgentCommandType.FOCUS_VISIBLE_ENTITY),
        ("Abre lo que está causando esta alerta.", AgentCommandType.FOCUS_VISIBLE_ENTITY),
        ("Muéstrame la evidencia.", AgentCommandType.SHOW_EVIDENCE),
    ],
)
def test_command_router_classifies_perception_commands(text, expected_type):
    assert classify(text).type == expected_type


def test_explain_widget_extracts_widget_reference():
    command = classify("Explícame este gráfico.")
    assert command.widget_reference is not None
    assert "grafico" in command.widget_reference or "gráfico" in command.widget_reference


def test_investigation_commands_still_classify_correctly_after_perception_additions():
    # Regresion: las nuevas reglas de percepcion no deben robar comandos
    # que ya funcionaban en Etapa 4.
    assert classify("Investiga por qué bajó producción.").type == AgentCommandType.START_INVESTIGATION
    assert classify("Pausa.").type == AgentCommandType.PAUSE
    assert classify("Dame el resumen del turno.").type == AgentCommandType.START_INVESTIGATION


# ── Verifier: prioridad de evidencia (seccion 26) ────────────────────────

def test_evidence_priority_ranks_operational_data_highest():
    assert verifier.evidence_priority("backend_tool") > verifier.evidence_priority("ui_snapshot")
    assert verifier.evidence_priority("ui_snapshot") > verifier.evidence_priority("visual_observation")


def test_sort_by_evidence_priority_orders_correctly():
    items = [
        EvidenceItem(evidence_id="e1", source_type="visual_observation", capability_id="x", label="x", value=None),
        EvidenceItem(evidence_id="e2", source_type="backend_tool", capability_id="x", label="x", value=None),
        EvidenceItem(evidence_id="e3", source_type="ui_snapshot", capability_id="x", label="x", value=None),
    ]
    ordered = verifier.sort_by_evidence_priority(items)
    assert [item.evidence_id for item in ordered] == ["e2", "e3", "e1"]


# ── Deteccion de conflictos (seccion 27) ─────────────────────────────────

def test_ui_backend_conflict_detected_when_values_diverge():
    widget = PerceivedWidgetState(widget_id="w1", type="kpi", label="Cumplimiento", module_id="produccion", semantic_summary="Cumplimiento 85%, brecha 500 t.")
    evidence = EvidenceItem(evidence_id="e1", source_type="backend_tool", capability_id="get_production_kpis", label="x", value=92, freshness_status="current", quality_status="high")
    conflict = verifier.detect_ui_backend_conflict(widget, evidence)
    assert conflict is not None
    assert conflict.ui_value == 85.0
    assert conflict.backend_value == 92


def test_ui_backend_conflict_not_raised_for_small_variation():
    widget = PerceivedWidgetState(widget_id="w1", type="kpi", label="Cumplimiento", module_id="produccion", semantic_summary="Cumplimiento 85%.")
    evidence = EvidenceItem(evidence_id="e1", source_type="backend_tool", capability_id="get_production_kpis", label="x", value=85.5, freshness_status="current", quality_status="high")
    assert verifier.detect_ui_backend_conflict(widget, evidence) is None


def test_ui_backend_conflict_ignores_lower_priority_evidence():
    widget = PerceivedWidgetState(widget_id="w1", type="kpi", label="Cumplimiento", module_id="produccion", semantic_summary="Cumplimiento 85%.")
    evidence = EvidenceItem(evidence_id="e1", source_type="visual_observation", capability_id="x", label="x", value=92)
    assert verifier.detect_ui_backend_conflict(widget, evidence) is None


def test_visual_semantic_conflict_rejects_contradicting_visual_trend():
    widget = PerceivedWidgetState(widget_id="w1", type="chart", label="Produccion", module_id="produccion", semantic_summary="Tendencia AL ALZA, cumplimiento 144%.")
    observation = VisualObservation(capture_id="c1", target_type="widget", widget_id="w1", summary="Se observa una caida sostenida.", confidence="medium")
    conflict = verifier.detect_visual_semantic_conflict(widget, observation)
    assert conflict is not None
    assert conflict.ui_value == "up"
    assert conflict.backend_value == "down"


def test_visual_semantic_conflict_absent_when_trends_agree():
    widget = PerceivedWidgetState(widget_id="w1", type="chart", label="Produccion", module_id="produccion", semantic_summary="Tendencia AL ALZA.")
    observation = VisualObservation(capture_id="c1", target_type="widget", widget_id="w1", summary="Se observa un aumento claro.", confidence="high")
    assert verifier.detect_visual_semantic_conflict(widget, observation) is None


def test_visual_semantic_conflict_absent_without_a_readable_trend():
    widget = PerceivedWidgetState(widget_id="w1", type="chart", label="Produccion", module_id="produccion", semantic_summary="8420 t/h.")
    observation = VisualObservation(capture_id="c1", target_type="widget", widget_id="w1", summary="Grafico de barras con varias series.", confidence="low")
    assert verifier.detect_visual_semantic_conflict(widget, observation) is None


# ── VisionProvider: modo degradado ────────────────────────────────────────

def test_null_vision_provider_never_returns_an_observation():
    import asyncio
    from app.ai.perception_schemas import VisionContext

    async def _run():
        provider = NullVisionProvider()
        with pytest.raises(VisionProviderUnavailable):
            await provider.analyze(b"fake", capture_id="c1", target_type="widget", widget_id="w1", context=VisionContext())

    asyncio.run(_run())


def test_vision_available_requires_both_flags_and_a_real_api_key(monkeypatch):
    monkeypatch.setenv("NORTHMINE_VISION_ENABLED", "true")
    monkeypatch.setenv("ANTHROPIC_API_KEY", "")
    get_settings.cache_clear()
    try:
        assert get_settings().vision_available is False
    finally:
        get_settings.cache_clear()


def test_vision_endpoint_returns_503_when_disabled(client, login_as_operador, monkeypatch):
    monkeypatch.setenv("NORTHMINE_VISION_ENABLED", "false")
    get_settings.cache_clear()
    try:
        resp = client.post(
            "/api/ai-agent/vision/analyze",
            json={"capture_id": "c1", "target_type": "widget", "mime_type": "image/webp", "image_base64": "aGVsbG8="},
            headers=auth_header(login_as_operador),
        )
        assert resp.status_code == 503
    finally:
        get_settings.cache_clear()


def test_vision_endpoint_requires_authentication(client):
    resp = client.post(
        "/api/ai-agent/vision/analyze",
        json={"capture_id": "c1", "target_type": "widget", "mime_type": "image/webp", "image_base64": "aGVsbG8="},
    )
    assert resp.status_code == 401


def test_vision_endpoint_rejects_invalid_base64(client, login_as_operador, monkeypatch):
    monkeypatch.setenv("NORTHMINE_VISION_ENABLED", "true")
    monkeypatch.setenv("ANTHROPIC_API_KEY", "fake-key-for-availability-check-only")
    get_settings.cache_clear()
    try:
        resp = client.post(
            "/api/ai-agent/vision/analyze",
            json={"capture_id": "c1", "target_type": "widget", "mime_type": "image/webp", "image_base64": "not-valid-base64!!!"},
            headers=auth_header(login_as_operador),
        )
        assert resp.status_code == 400
    finally:
        get_settings.cache_clear()


def test_target_type_rate_limiter_enforces_the_configured_limit_per_bucket():
    from app.ai.vision.rate_limiter import TargetTypeRateLimiter

    limiter = TargetTypeRateLimiter()
    assert limiter.allow("user-1", "widget", limit=2) is True
    assert limiter.allow("user-1", "widget", limit=2) is True
    assert limiter.allow("user-1", "widget", limit=2) is False  # excede el limite de este balde
    # target_type distinto o usuario distinto no comparten balde.
    assert limiter.allow("user-1", "viewport", limit=2) is True
    assert limiter.allow("user-2", "widget", limit=2) is True


def test_vision_endpoint_enforces_the_per_target_type_capture_limit(client, login_as_operador, monkeypatch):
    monkeypatch.setenv("NORTHMINE_VISION_ENABLED", "true")
    monkeypatch.setenv("ANTHROPIC_API_KEY", "fake-key-for-availability-check-only")
    monkeypatch.setenv("NORTHMINE_PERCEPTION_MAX_VIEWPORT_CAPTURES_PER_MINUTE", "1")
    get_settings.cache_clear()
    try:
        body = {"capture_id": "c1", "target_type": "viewport", "mime_type": "image/webp", "image_base64": "not-valid-base64!!!"}
        headers = auth_header(login_as_operador)
        first = client.post("/api/ai-agent/vision/analyze", json=body, headers=headers)
        assert first.status_code == 400  # consumio el unico permiso del minuto, luego fallo por base64 invalido
        second = client.post("/api/ai-agent/vision/analyze", json=body, headers=headers)
        assert second.status_code == 429
    finally:
        get_settings.cache_clear()


# ── Flujo WS completo (integracion) ──────────────────────────────────────

def _client_event(event_type, **payload):
    return {"event_id": f"evt-{uuid.uuid4().hex[:10]}", "correlation_id": f"corr-{uuid.uuid4().hex[:8]}", "event_type": event_type, "payload": payload}


def test_ws_screen_context_never_requests_a_visual_capture(client, login_as_operador):
    token = login_as_operador["access_token"]
    with client.websocket_connect(f"/api/ai-agent/ws?token={token}") as ws:
        ws.receive_json()
        ws.send_json(_client_event("context.update", changes={"moduleId": "produccion", "focusedWidgetId": "w1"}))
        ws.send_json(_client_event("user.text", text="¿Qué estoy viendo?"))
        text_event = ws.receive_json()
        speech_event = ws.receive_json()
        assert text_event["event_type"] == "agent.text.delta"
        assert speech_event["event_type"] == "agent.speech.segment"
        assert "produccion" in text_event["payload"]["text"].lower()


def test_ws_explain_widget_uses_only_semantic_data(client, login_as_operador):
    token = login_as_operador["access_token"]
    with client.websocket_connect(f"/api/ai-agent/ws?token={token}") as ws:
        ws.receive_json()
        ws.send_json(_client_event("context.update", changes={
            "focusedWidgetId": "chart-1",
            "visibleWidgets": [{"widgetId": "chart-1", "type": "chart", "label": "Produccion", "moduleId": "produccion", "semanticSummary": "8420 t/h, tendencia AL ALZA."}],
        }))
        ws.send_json(_client_event("user.text", text="Explícame este gráfico."))
        text_event = ws.receive_json()
        assert text_event["event_type"] == "agent.text.delta"
        assert "8420" in text_event["payload"]["text"]


def test_ws_explain_widget_without_focus_reports_a_recoverable_error(client, login_as_operador):
    token = login_as_operador["access_token"]
    with client.websocket_connect(f"/api/ai-agent/ws?token={token}") as ws:
        ws.receive_json()
        ws.send_json(_client_event("user.text", text="Explícame este gráfico."))
        event = ws.receive_json()
        assert event["event_type"] == "agent.error"
        assert event["payload"]["recoverable"] is True


def test_ws_analyze_widget_visually_requests_a_capture_for_the_focused_widget(client, login_as_operador):
    token = login_as_operador["access_token"]
    with client.websocket_connect(f"/api/ai-agent/ws?token={token}") as ws:
        ws.receive_json()
        ws.send_json(_client_event("context.update", changes={
            "focusedWidgetId": "chart-1",
            "visibleWidgets": [{"widgetId": "chart-1", "type": "chart", "label": "Produccion", "moduleId": "produccion", "semanticSummary": "8420 t/h."}],
        }))
        ws.send_json(_client_event("user.text", text="¿Qué ves raro aquí?"))
        ws.receive_json()  # agent.text.delta
        capture_event = ws.receive_json()
        assert capture_event["event_type"] == "perception.capture_requested"
        assert capture_event["payload"]["widgetId"] == "chart-1"
        assert capture_event["payload"]["targetType"] == "widget"


def test_ws_analyze_current_view_falls_back_to_viewport_without_focus(client, login_as_operador):
    token = login_as_operador["access_token"]
    with client.websocket_connect(f"/api/ai-agent/ws?token={token}") as ws:
        ws.receive_json()
        ws.send_json(_client_event("user.text", text="Analiza esta pantalla."))
        ws.receive_json()  # agent.text.delta
        capture_event = ws.receive_json()
        assert capture_event["event_type"] == "perception.capture_requested"
        assert capture_event["payload"]["targetType"] == "viewport"
        assert capture_event["payload"]["widgetId"] is None


def test_ws_visual_observation_never_overrides_confirmed_semantic_data(client, login_as_operador):
    token = login_as_operador["access_token"]
    with client.websocket_connect(f"/api/ai-agent/ws?token={token}") as ws:
        ws.receive_json()
        ws.send_json(_client_event("context.update", changes={
            "focusedWidgetId": "chart-1",
            "visibleWidgets": [{"widgetId": "chart-1", "type": "chart", "label": "Produccion", "moduleId": "produccion", "semanticSummary": "Tendencia AL ALZA, cumplimiento 144%."}],
        }))
        ws.send_json(_client_event(
            "perception.observation_reported",
            observation={
                "observation_id": "vobs-1", "capture_id": "cap-1", "target_type": "widget", "widget_id": "chart-1",
                "summary": "Se observa una caida sostenida.", "detected_elements": [], "possible_anomalies": [],
                "uncertainty": [], "confidence": "medium",
            },
        ))
        conflict_event = ws.receive_json()
        snapshot_event = ws.receive_json()
        speech_event = ws.receive_json()

        assert conflict_event["event_type"] == "perception.conflict_detected"
        assert conflict_event["payload"]["conflict"]["backend_value"] == "down"
        assert conflict_event["payload"]["conflict"]["ui_value"] == "up"

        assert snapshot_event["event_type"] == "perception.snapshot_updated"
        assert snapshot_event["payload"]["conflict"] is not None

        assert speech_event["event_type"] == "agent.speech.segment"
        assert "no confirman" in speech_event["payload"]["text"].lower()


def test_ws_visual_observation_without_conflict_has_no_conflict_event(client, login_as_operador):
    token = login_as_operador["access_token"]
    with client.websocket_connect(f"/api/ai-agent/ws?token={token}") as ws:
        ws.receive_json()
        ws.send_json(_client_event("context.update", changes={
            "focusedWidgetId": "chart-1",
            "visibleWidgets": [{"widgetId": "chart-1", "type": "chart", "label": "Produccion", "moduleId": "produccion", "semanticSummary": "8420 t/h."}],
        }))
        ws.send_json(_client_event(
            "perception.observation_reported",
            observation={
                "observation_id": "vobs-1", "capture_id": "cap-1", "target_type": "widget", "widget_id": "chart-1",
                "summary": "Grafico de barras sin anomalias visibles.", "detected_elements": [], "possible_anomalies": [],
                "uncertainty": [], "confidence": "high",
            },
        ))
        snapshot_event = ws.receive_json()
        speech_event = ws.receive_json()
        assert snapshot_event["event_type"] == "perception.snapshot_updated"
        assert snapshot_event["payload"]["conflict"] is None
        assert speech_event["event_type"] == "agent.speech.segment"


def test_ws_malformed_observation_payload_does_not_crash_the_session(client, login_as_operador):
    token = login_as_operador["access_token"]
    with client.websocket_connect(f"/api/ai-agent/ws?token={token}") as ws:
        ws.receive_json()
        ws.send_json(_client_event("perception.observation_reported", observation={"not": "valid"}))
        # La sesion debe seguir viva - se puede seguir usando normalmente.
        ws.send_json(_client_event("user.text", text="¿Qué estoy viendo?"))
        event = ws.receive_json()
        assert event["event_type"] == "agent.text.delta"


def test_ws_focus_visible_entity_requests_an_optional_ui_action(client, login_as_operador):
    token = login_as_operador["access_token"]
    with client.websocket_connect(f"/api/ai-agent/ws?token={token}") as ws:
        ws.receive_json()
        ws.send_json(_client_event("user.text", text="Muéstrame la Pala 03."))
        event = ws.receive_json()
        assert event["event_type"] == "ui_action.requested"
        assert event["payload"]["capabilityId"] == "select_equipment_entity"
        assert event["payload"]["requirement"] == "optional"
        assert event["payload"]["entityQuery"] == "PALA 03"
