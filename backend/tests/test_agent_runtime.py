from __future__ import annotations

import asyncio
import json
import uuid

import pytest
from pydantic import ValidationError

from app.ai.runtime import command_router, interruption, persistence, runtime, session_manager as sm, speech_policy, ui_actions
from app.ai.runtime.command_router import AgentCommandType, classify
from app.ai.runtime.protocol import AgentEvent, UnknownEventType, build_server_event
from app.ai.runtime.session_manager import AgentSessionManager, SessionNotFound, SessionOwnershipError
from app.ai.runtime.state_machine import AgentRuntimeState, AgentStateMachine, InvalidStateTransition
from app.ai.voice.elevenlabs_provider import ElevenLabsTTSProvider
from app.ai.voice.null_provider import NullTTSProvider
from app.ai.voice.protocols import TTSProviderUnavailable
from app.ai.voice.router import get_provider
from app.core.config import get_settings
from tests.conftest import auth_header

"""Tests del Agent Runtime (Etapa 4): maquina de estados, protocolo,
sesiones aisladas, acknowledgement de UI actions, Command Router
determinista, proveedor de voz (ElevenLabs deshabilitado/sin API key -
nunca se llama a la red real), y el flujo completo via WebSocket con un
dataset determinista (mismo patron que test_investigations.py)."""


# ── Maquina de estados ──────────────────────────────────────────────────

def test_state_machine_follows_the_main_flow():
    m = AgentStateMachine()
    assert m.state == AgentRuntimeState.IDLE
    for target in [AgentRuntimeState.LISTENING, AgentRuntimeState.PLANNING, AgentRuntimeState.EXECUTING, AgentRuntimeState.VERIFYING, AgentRuntimeState.SPEAKING, AgentRuntimeState.IDLE]:
        m.transition(target)
    assert m.state == AgentRuntimeState.IDLE
    assert len(m.history) == 6


def test_state_machine_rejects_invalid_transitions():
    m = AgentStateMachine(AgentRuntimeState.IDLE)
    with pytest.raises(InvalidStateTransition):
        m.transition(AgentRuntimeState.SPEAKING)
    with pytest.raises(InvalidStateTransition):
        m.transition(AgentRuntimeState.VERIFYING)


def test_state_machine_allows_pause_resume_cycle():
    m = AgentStateMachine(AgentRuntimeState.EXECUTING)
    m.transition(AgentRuntimeState.PAUSED)
    m.transition(AgentRuntimeState.EXECUTING)
    assert m.state == AgentRuntimeState.EXECUTING


def test_state_machine_any_state_can_fail():
    for state in AgentRuntimeState:
        m = AgentStateMachine(state)
        m.transition(AgentRuntimeState.FAILED)
        assert m.state == AgentRuntimeState.FAILED


def test_state_machine_same_state_transition_is_a_noop():
    m = AgentStateMachine(AgentRuntimeState.IDLE)
    m.transition(AgentRuntimeState.IDLE)
    assert m.history == []


# ── Protocolo de eventos ────────────────────────────────────────────────

def test_unknown_event_type_is_rejected():
    with pytest.raises((ValidationError, UnknownEventType)):
        AgentEvent(
            event_id="e1", session_id="s1", correlation_id="c1", sequence=1,
            timestamp="2026-01-01T00:00:00Z", event_type="not_a_real_event",
        )


def test_server_event_type_cannot_be_a_client_only_type():
    with pytest.raises(Exception):
        build_server_event(session_id="s1", event_type="user.text", sequence=1, correlation_id="c1")


def test_event_sequence_and_ids_are_present():
    event = build_server_event(session_id="s1", event_type="session.ready", sequence=5, correlation_id="c1")
    assert event.sequence == 5
    assert event.event_id.startswith("evt-")
    assert event.protocol_version == "1.0"


# ── Sesiones aisladas por usuario ───────────────────────────────────────

@pytest.mark.parametrize("case", ["isolation"])
def test_sessions_are_isolated_per_user(case):
    async def _run():
        manager = AgentSessionManager()
        live_a = await manager.create(user_id="user-a", role="operador", company_id=None, site_id=None)
        with pytest.raises(SessionOwnershipError):
            await manager.get_for_user(live_a.session.session_id, "user-b")
        # el dueño real si puede
        fetched = await manager.get_for_user(live_a.session.session_id, "user-a")
        assert fetched is live_a
        with pytest.raises(SessionNotFound):
            await manager.get_for_user("no-existe", "user-a")

    asyncio.run(_run())


# ── UI action acknowledgement ────────────────────────────────────────────

def test_ui_action_ack_resolves_a_pending_wait():
    async def _run():
        manager = AgentSessionManager()
        live = await manager.create(user_id="u1", role="operador", company_id=None, site_id=None)
        wait_task = asyncio.create_task(ui_actions.wait_for_ack(live, "action-1", timeout_seconds=5))
        await asyncio.sleep(0.05)
        resolved = ui_actions.resolve_ack(live, ui_actions.UIActionAcknowledgement(action_id="action-1", status="completed", context_updated=True))
        assert resolved is True
        ack = await wait_task
        assert ack.status == "completed"

    asyncio.run(_run())


def test_ui_action_ack_times_out_when_nobody_answers():
    async def _run():
        manager = AgentSessionManager()
        live = await manager.create(user_id="u1", role="operador", company_id=None, site_id=None)
        ack = await ui_actions.wait_for_ack(live, "action-timeout", timeout_seconds=0.1)
        assert ack.status == "timeout"

    asyncio.run(_run())


def test_resolve_ack_for_unknown_action_is_ignored():
    async def _run():
        manager = AgentSessionManager()
        live = await manager.create(user_id="u1", role="operador", company_id=None, site_id=None)
        resolved = ui_actions.resolve_ack(live, ui_actions.UIActionAcknowledgement(action_id="never-registered", status="completed"))
        assert resolved is False

    asyncio.run(_run())


def test_cancel_all_pending_releases_every_future():
    async def _run():
        manager = AgentSessionManager()
        live = await manager.create(user_id="u1", role="operador", company_id=None, site_id=None)
        f1 = ui_actions.register_wait(live, "a1")
        f2 = ui_actions.register_wait(live, "a2")
        interruption.mark_cancel(live)
        assert f1.result().status == "cancelled"
        assert f2.result().status == "cancelled"
        assert live.pending_ui_acks == {}

    asyncio.run(_run())


# ── Command Router determinista ──────────────────────────────────────────

@pytest.mark.parametrize(
    "text,expected_type",
    [
        ("Investiga por qué bajó producción.", AgentCommandType.START_INVESTIGATION),
        ("Revisa el tiempo de ciclo.", AgentCommandType.START_INVESTIGATION),
        ("Dame el resumen del turno.", AgentCommandType.START_INVESTIGATION),
        ("Abre Producción.", AgentCommandType.NAVIGATE),
        ("Detente.", AgentCommandType.INTERRUPT),
        ("Pausa.", AgentCommandType.PAUSE),
        ("Continúa.", AgentCommandType.RESUME),
        ("Cancela la investigación.", AgentCommandType.CANCEL),
        ("asdkjaslkdjaslkdj", AgentCommandType.UNKNOWN),
    ],
)
def test_command_router_classifies_deterministically(text, expected_type):
    command = classify(text)
    assert command.type == expected_type
    assert command.confidence == "rule" if expected_type != AgentCommandType.UNKNOWN else True


def test_critical_commands_never_need_an_llm_fallback():
    calls = []

    def _llm(text):
        calls.append(text)
        return None

    classify("Pausa.", llm_fallback=_llm)
    classify("Detente.", llm_fallback=_llm)
    classify("Cancela.", llm_fallback=_llm)
    assert calls == []  # las reglas resuelven antes de siquiera considerar el LLM


def test_modify_investigation_requires_an_active_investigation_context():
    command = classify("Concéntrate en Pala 03.", has_active_investigation=True)
    assert command.type == AgentCommandType.MODIFY_INVESTIGATION
    assert command.equipment_query == "PALA 03"

    # sin investigacion activa, la misma frase no es una modificacion valida
    command2 = classify("Concéntrate en Pala 03.", has_active_investigation=False)
    assert command2.type != AgentCommandType.MODIFY_INVESTIGATION


def test_llm_fallback_only_runs_for_genuinely_unrecognized_text():
    def _llm(text):
        return command_router.AgentCommand(type=AgentCommandType.START_INVESTIGATION, raw_text=text, confidence="llm")

    command = classify("blablabla no tiene sentido", llm_fallback=_llm)
    assert command.confidence == "llm"


# ── Modo degradado: ElevenLabs desactivado / sin API key ─────────────────

def test_null_provider_raises_unavailable_and_never_yields_audio():
    async def _run():
        provider = NullTTSProvider()
        with pytest.raises(TTSProviderUnavailable):
            async for _ in provider.stream("hola"):
                pass

    asyncio.run(_run())


def test_elevenlabs_provider_refuses_to_construct_without_api_key(monkeypatch):
    monkeypatch.setenv("ELEVENLABS_ENABLED", "true")
    monkeypatch.setenv("ELEVENLABS_API_KEY", "")
    get_settings.cache_clear()
    try:
        settings = get_settings()
        assert settings.elevenlabs_available is False
        with pytest.raises(ValueError):
            ElevenLabsTTSProvider(settings)
    finally:
        get_settings.cache_clear()


def test_get_provider_selects_null_when_disabled(monkeypatch):
    monkeypatch.setenv("ELEVENLABS_ENABLED", "false")
    get_settings.cache_clear()
    try:
        provider = get_provider(get_settings())
        assert provider.name == "null"
    finally:
        get_settings.cache_clear()


def test_speech_endpoint_returns_503_when_elevenlabs_disabled(client, login_as_operador, monkeypatch):
    monkeypatch.setenv("ELEVENLABS_ENABLED", "false")
    get_settings.cache_clear()
    try:
        resp = client.post(
            "/api/ai-agent/speech",
            json={"segment_id": "seg-1", "text": "hola", "priority": "status", "sequence": 1},
            headers=auth_header(login_as_operador),
        )
        assert resp.status_code == 503
    finally:
        get_settings.cache_clear()


def test_speech_endpoint_requires_authentication(client):
    resp = client.post("/api/ai-agent/speech", json={"segment_id": "s", "text": "hola", "priority": "status", "sequence": 1})
    assert resp.status_code == 401


def test_speech_endpoint_never_returns_200_with_empty_audio_on_provider_failure(client, login_as_operador, monkeypatch):
    # Regresion (Etapa 4.1): un proveedor habilitado que falla en el primer
    # chunk (API key invalida, rate limit, etc.) antes devolvia 200 con
    # cuerpo vacio, indistinguible de un audio realmente vacio. Ahora debe
    # fallar con un status de error ANTES de comprometer el 200.
    from app.ai.voice import router as voice_router
    from app.ai.voice.protocols import TTSProviderError

    monkeypatch.setenv("ELEVENLABS_ENABLED", "true")
    monkeypatch.setenv("ELEVENLABS_API_KEY", "not-a-real-key-just-enough-to-pass-availability-check")
    get_settings.cache_clear()

    class _FailingProvider:
        name = "elevenlabs"

        async def stream(self, text):
            raise TTSProviderError("simulated provider failure")
            yield b""  # pragma: no cover - nunca se alcanza, hace de esto un generador

    monkeypatch.setattr(voice_router, "get_provider", lambda settings: _FailingProvider())

    try:
        resp = client.post(
            "/api/ai-agent/speech",
            json={"segment_id": "seg-fail", "text": "hola", "priority": "status", "sequence": 1},
            headers=auth_header(login_as_operador),
        )
        assert resp.status_code != 200
        assert resp.status_code == 502
        assert resp.content != b""
    finally:
        get_settings.cache_clear()


def test_speech_endpoint_returns_valid_audio_bytes_when_provider_succeeds(client, login_as_operador, monkeypatch):
    from app.ai.voice import router as voice_router

    monkeypatch.setenv("ELEVENLABS_ENABLED", "true")
    monkeypatch.setenv("ELEVENLABS_API_KEY", "not-a-real-key-just-enough-to-pass-availability-check")
    get_settings.cache_clear()

    class _SucceedingProvider:
        name = "elevenlabs"

        async def stream(self, text):
            yield b"ID3fake-mp3-bytes-for-test"
            yield b"more-audio-bytes"

    monkeypatch.setattr(voice_router, "get_provider", lambda settings: _SucceedingProvider())

    try:
        resp = client.post(
            "/api/ai-agent/speech",
            json={"segment_id": "seg-ok", "text": "hola", "priority": "status", "sequence": 1},
            headers=auth_header(login_as_operador),
        )
        assert resp.status_code == 200
        assert resp.headers["content-type"].startswith("audio/mpeg")
        assert resp.content == b"ID3fake-mp3-bytes-for-testmore-audio-bytes"
    finally:
        get_settings.cache_clear()


def test_audit_functions_never_accept_a_secret_parameter():
    # Chequeo estructural: ninguna funcion de auditoria del Runtime declara
    # un parametro que pueda contener una API key/JWT/cookie/header cruda.
    from app.ai import audit
    import inspect

    forbidden = {"api_key", "apikey", "token", "jwt", "cookie", "authorization"}
    for name in dir(audit):
        if not name.startswith("record_"):
            continue
        func = getattr(audit, name)
        params = set(inspect.signature(func).parameters.keys())
        assert params.isdisjoint(forbidden), f"{name} acepta un parametro sospechoso: {params & forbidden}"


# ── Flujo completo via WebSocket (dataset determinista, sin API key) ────

FAKE_DATASET = {
    "source": "wenco-sql-live", "data_source": "REAL", "stale": False, "today": "2026-07-12",
    "plan": [{"date": "2026-07-12", "plan_tons": 3000}],
    "cycles": [
        {
            "id": f"c{i}", "datetime": f"2026-07-12T{8 + i % 10:02d}:10:00", "fecha_dia": "2026-07-12",
            "turno_calc": "DIA", "hora": 8 + i % 10, "caex_id": f"CAEX-{(i % 4) + 1:02d}",
            "carguio_id": f"EX-{(i % 2) + 1:02d}", "tonelaje": 180, "destino": "CHANCADO", "origen": "F01",
            "fase": "F01", "camion_modelo": "CAT793F", "pala_modelo": "EX5600",
            "tiempo_vacio_min": 10.0, "tiempo_cargado_min": 15.0,
        }
        for i in range(12)
    ],
}


@pytest.fixture(autouse=True)
def _deterministic_dataset(monkeypatch):
    from app.ai import tools as tools_module

    monkeypatch.setattr(tools_module, "provider_get_dataset", lambda fecha=None: FAKE_DATASET)


def _client_event(event_type, **payload):
    return {"event_id": f"evt-{uuid.uuid4().hex[:10]}", "correlation_id": f"corr-{uuid.uuid4().hex[:8]}", "event_type": event_type, "payload": payload}


def test_ws_rejects_unauthenticated_connections(client):
    with pytest.raises(Exception):
        with client.websocket_connect("/api/ai-agent/ws"):
            pass


def test_ws_full_investigation_flow_produces_a_human_gated_conclusion(client, login_as_operador):
    token = login_as_operador["access_token"]
    with client.websocket_connect(f"/api/ai-agent/ws?token={token}") as ws:
        ready = ws.receive_json()
        assert ready["event_type"] == "session.ready"
        assert ready["payload"]["state"] == "idle"

        ws.send_json(_client_event("user.text", text="Dame el resumen del turno."))

        events = []
        for _ in range(60):
            event = ws.receive_json()
            events.append(event)
            if event["event_type"] == "investigation.completed":
                break

        types = [e["event_type"] for e in events]
        assert "agent.plan.created" in types
        assert "verification.completed" in types
        assert types[-1] == "investigation.completed"

        result = events[-1]["payload"]["result"]
        assert result["plan"]["status"] == "completed"
        assert result["conclusion"]["decision_authority"] == "human"
        assert result["conclusion"]["requires_human_approval"] is True

        sequences = [e["sequence"] for e in events]
        assert sequences == sorted(sequences)


def test_ws_out_of_scope_text_reports_agent_error(client, login_as_operador):
    token = login_as_operador["access_token"]
    with client.websocket_connect(f"/api/ai-agent/ws?token={token}") as ws:
        ws.receive_json()
        ws.send_json(_client_event("user.text", text="cuentame un chiste"))
        event = ws.receive_json()
        assert event["event_type"] == "agent.error"
        assert event["payload"]["recoverable"] is True


def test_ws_pause_resume_cancel_preserve_partial_evidence(client, login_as_operador):
    token = login_as_operador["access_token"]
    with client.websocket_connect(f"/api/ai-agent/ws?token={token}") as ws:
        ws.receive_json()
        ws.send_json(_client_event("user.text", text="Investiga por qué bajó producción."))

        def drain_until(target_type, predicate=lambda e: True, max_iter=60):
            for _ in range(max_iter):
                e = ws.receive_json()
                if e["event_type"] == target_type and predicate(e):
                    return e
            raise AssertionError(f"never received {target_type}")

        drain_until("agent.state.changed", lambda e: e["payload"].get("state") == "executing")
        ws.send_json(_client_event("agent.pause"))
        drain_until("agent.state.changed", lambda e: e["payload"].get("state") == "paused")
        ws.send_json(_client_event("agent.resume"))
        drain_until("agent.state.changed", lambda e: e["payload"].get("state") == "executing")
        ws.send_json(_client_event("agent.cancel"))
        cancelled = drain_until("investigation.cancelled")
        assert cancelled["payload"]["evidence_collected"] >= 0
        drain_until("agent.state.changed", lambda e: e["payload"].get("state") == "idle")


def test_ws_required_ui_action_blocks_until_acknowledged(client, login_as_operador):
    token = login_as_operador["access_token"]
    with client.websocket_connect(f"/api/ai-agent/ws?token={token}") as ws:
        ws.receive_json()
        ws.send_json(_client_event("user.text", text="Analiza la Pala 03."))

        action_id = None
        for _ in range(15):
            e = ws.receive_json()
            if e["event_type"] == "ui_action.waiting":
                action_id = e["payload"]["actionId"]
                break
        assert action_id, "se esperaba un ui_action.waiting para la entidad requerida"

        ws.send_json(_client_event("ui_action.completed", actionId=action_id, contextUpdated=True, selectedEntityIds=["CAEX-15"]))

        saw_completed = False
        for _ in range(60):
            e = ws.receive_json()
            if e["event_type"] == "ui_action.completed" and e["payload"].get("actionId") == action_id:
                saw_completed = True
            if e["event_type"] == "investigation.completed":
                break
        assert saw_completed


def test_ws_required_ui_action_timeout_is_recorded_as_a_limitation(client, login_as_operador, monkeypatch):
    monkeypatch.setattr(runtime, "REQUIRED_UI_ACTION_TIMEOUT_SECONDS", 0.3)
    token = login_as_operador["access_token"]
    with client.websocket_connect(f"/api/ai-agent/ws?token={token}") as ws:
        ws.receive_json()
        ws.send_json(_client_event("user.text", text="Analiza la Pala 07."))

        events = []
        for _ in range(60):
            e = ws.receive_json()
            events.append(e)
            if e["event_type"] == "investigation.completed":
                break

        types = [e["event_type"] for e in events]
        assert "ui_action.failed" in types
        result = events[-1]["payload"]["result"]
        assert any("select_equipment_entity" in m for m in result["plan"]["missing_capabilities"])


def test_persisted_events_are_ordered_and_replayable(client, login_as_operador):
    token = login_as_operador["access_token"]
    with client.websocket_connect(f"/api/ai-agent/ws?token={token}") as ws:
        ready = ws.receive_json()
        session_id = ready["payload"]["sessionId"]
        ws.send_json(_client_event("user.text", text="Dame el resumen del turno."))
        # El cliente ya corto el audio localmente antes de enviar este evento.
        # Esta es la confirmacion autoritativa del backend y mantiene FIFO para
        # que replay/since_sequence nunca omita evidencia previa ya persistida.
        for _ in range(60):
            if ws.receive_json()["event_type"] == "agent.plan.created":
                break

    rows = persistence.get_events_since(session_id, 0)
    sequences = [r["sequence"] for r in rows]
    assert sequences == sorted(sequences)
    assert len(set(r["event_id"] for r in rows)) == len(rows)


def test_ws_speech_segments_are_stamped_with_the_turn_id_from_the_triggering_event(client, login_as_operador):
    """Etapa 7, secciones 9/19/32-34: el turnId que el cliente manda en
    user.text/user.speech.final debe aparecer en TODOS los agent.speech.segment
    que ese turno genere, para que ConversationTurnManager pueda descartar
    audio de un turno ya interrumpido sin que el servidor tenga su propio
    concepto de "turno" duplicado."""
    token = login_as_operador["access_token"]
    with client.websocket_connect(f"/api/ai-agent/ws?token={token}") as ws:
        ws.receive_json()
        ws.send_json(_client_event("user.text", text="Dame el resumen del turno.", turnId="turn-abc123"))

        segment_turn_ids = []
        for _ in range(60):
            e = ws.receive_json()
            if e["event_type"] == "agent.speech.segment":
                segment_turn_ids.append(e["payload"].get("turnId"))
            if e["event_type"] == "investigation.completed":
                break

        assert segment_turn_ids, "se esperaba al menos un agent.speech.segment"
        assert all(t == "turn-abc123" for t in segment_turn_ids)


def test_ws_interrupt_stop_event_carries_the_turn_id_being_interrupted(client, login_as_operador):
    token = login_as_operador["access_token"]
    with client.websocket_connect(f"/api/ai-agent/ws?token={token}") as ws:
        ws.receive_json()
        ws.send_json(_client_event("user.text", text="Investiga por qué bajó producción.", turnId="turn-1"))

        for _ in range(60):
            e = ws.receive_json()
            if e["event_type"] == "agent.state.changed" and e["payload"].get("state") == "executing":
                break

        ws.send_json(_client_event("agent.interrupt", turnId="turn-2"))
        stop_event = None
        # El navegador ya corto el audio local antes de enviar agent.interrupt.
        # Esta confirmacion conserva FIFO para que since_sequence/replay no
        # omita evidencia persistida anterior al evento de control.
        for _ in range(60):
            e = ws.receive_json()
            if e["event_type"] == "agent.speech.stop":
                stop_event = e
                break

        assert stop_event is not None, "se esperaba agent.speech.stop tras agent.interrupt"
        assert stop_event["payload"]["reason"] == "interrupted"
        # El turno interrumpido es el que estaba activo ANTES de que llegara
        # agent.interrupt (turn-1), no el nuevo (turn-2): el turnId de
        # agent.interrupt identifica el turno que EMPIEZA, todavia sin texto,
        # y no debe pisar de que turno se esta cortando el audio.
        assert stop_event["payload"]["turnId"] == "turn-1"


def test_ws_memory_response_keeps_visual_detail_and_speaks_a_brief_status(client, login_as_operador):
    """La memoria conserva el texto visual completo, mientras Speech Policy
    limita STATUS a una frase. El oracle no espera voz que la politica actual
    prohibe leer en voz alta."""
    from app.ai.memory import working_memory

    # _extract_equipment_query (command_router.py) solo reconoce
    # "pala|caex|camion" + numero - un numero al azar de 3 digitos evita
    # colisionar con equipos de ejemplo de bajo numero (Pala 03, etc.) que
    # otros tests puedan haber dejado en la misma base de memoria.
    number = str(100 + (uuid.uuid4().int % 800))
    entity = f"PALA {number}"
    working_memory.track_entity(
        entity=entity, entity_type="equipment", company_id=login_as_operador["empresa"], site_id=login_as_operador["faena"], shift="DIA",
        current_issue="Rendimiento bajo el plan.", metric_value=-10.0, metric_label="variacion_pct",
        metric_direction="lower_is_worse", created_by="tester",
    )

    token = login_as_operador["access_token"]
    with client.websocket_connect(f"/api/ai-agent/ws?token={token}") as ws:
        ws.receive_json()
        ws.send_json(_client_event("user.text", text=f"¿Sigue ocurriendo lo de la pala {number}?", turnId="turn-mem-1"))

        # Este handler no emite un terminal porque no abre investigacion. Se
        # calcula exactamente la salida hablada para no bloquear esperando una
        # segunda frase que STATUS no debe pronunciar.
        full_text = None
        for _ in range(10):
            e = ws.receive_json()
            if e["event_type"] == "agent.error":
                pytest.fail(f"comando de memoria fallo inesperadamente: {e['payload']}")
            if e["event_type"] == "agent.text.delta":
                full_text = e["payload"]["text"]
                break
        assert full_text, "se esperaba agent.text.delta con el texto completo antes de los segmentos"
        assert full_text.count(".") >= 2, f"el texto deberia tener 2+ oraciones para ejercitar el segmentador, llego: {full_text!r}"

        expected_segment_count = len(speech_policy.spoken_chunks(full_text, "STATUS"))
        assert expected_segment_count == 1

        segments = [ws.receive_json()["payload"] for _ in range(expected_segment_count)]

        assert len(segments) == 1
        assert all(s["turnId"] == "turn-mem-1" for s in segments)
        sequences = [s["sequence"] for s in segments]
        assert sequences == sorted(sequences) and len(set(sequences)) == len(sequences)
        # Ninguna oracion quedo cortada a mitad de palabra (el viejo text[:220]
        # si lo permitia) - cada segmento termina en puntuacion real.
        assert all(s["text"].strip()[-1] in ".!?" for s in segments)
        segment_ids = [s["segmentId"] for s in segments]
        assert len(set(segment_ids)) == len(segment_ids)  # nunca colisionan en SpeechOutputRouter (dedupe por segmentId)
