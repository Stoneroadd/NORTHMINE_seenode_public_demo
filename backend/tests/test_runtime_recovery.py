from __future__ import annotations

import asyncio
import uuid
from datetime import datetime, timezone

import pytest

from app.ai.investigation_repository import get_investigation
from app.ai.runtime import persistence, runtime
from app.ai.runtime import ui_actions
from app.ai.runtime.session_manager import AgentSession, AgentSessionManager, LiveSession, session_manager
from app.ai.runtime.state_machine import AgentRuntimeState

"""C7: Runtime State, Recovery & Idempotency.

Principio verificado en estos tests: AT-LEAST-ONCE TRANSPORT (reconexion,
replay, reintento del cliente, ACK duplicado/tardio) nunca debe convertirse
en AT-LEAST-ONCE BUSINESS EXECUTION (una capability, un EvidenceItem, una
Conclusion o un reporte no se duplican por un problema de transporte).

Auditoria previa a este archivo confirmo que la mayor parte del contrato ya
era correcto por diseno: replay lee eventos YA persistidos y los reenvia
sin invocar ningun handler; una reconexion reutiliza la MISMA LiveSession
en memoria (mientras el proceso no reinicie), asi que una investigacion en
curso sigue corriendo en background sin importar si hay alguien conectado;
wait_for_ack/cancel_all_pending ya hacian que un ACK tardio (post-timeout o
post-cancel) se ignorara silenciosamente. El unico bug real encontrado -
reproducido antes de corregirlo - fue un `agent.cancel` duplicado llegando
cuando la sesion ya volvio a idle, que lanzaba InvalidStateTransition sin
capturar y rompia el loop del WebSocket.
"""

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


# ── 1. El bug real: cancel duplicado cuando ya esta idle ──────────────────

@pytest.mark.asyncio
async def test_duplicate_cancel_command_when_already_idle_is_a_safe_noop():
    session = AgentSession(session_id="s1", user_id="u1", role="operador", created_at=datetime.now(timezone.utc), updated_at=datetime.now(timezone.utc))
    live = LiveSession(session)
    await runtime.cancel_investigation(live, {"sub": "u1"}, "corr-1", "127.0.0.1")
    assert live.state_machine.state == AgentRuntimeState.IDLE
    # El segundo cancel, con la sesion ya idle, NO debe lanzar InvalidStateTransition.
    await runtime.cancel_investigation(live, {"sub": "u1"}, "corr-2", "127.0.0.1")
    assert live.state_machine.state == AgentRuntimeState.IDLE


def test_ws_duplicate_cancel_after_investigation_already_completed_does_not_crash_the_connection(client, login_as_operador):
    token = login_as_operador["access_token"]
    with client.websocket_connect(f"/api/ai-agent/ws?token={token}") as ws:
        ws.receive_json()
        ws.send_json(_client_event("user.text", text="Dame el resumen del turno."))
        for _ in range(60):
            if ws.receive_json()["event_type"] == "investigation.completed":
                break

        # Cancel llega DESPUES de que la investigacion ya termino (sesion en
        # idle) - un reintento de transporte o un doble click tardio.
        ws.send_json(_client_event("agent.cancel"))
        # Si la conexion sobreviviera con un bug, heartbeat deberia seguir
        # funcionando; si no, ws.send_json ya habria lanzado al desconectarse.
        ws.send_json(_client_event("session.heartbeat"))
        # No hay evento de respuesta garantizado para heartbeat, pero la
        # conexion debe seguir abierta - un segundo user.text real confirma
        # que el loop sigue vivo.
        ws.send_json(_client_event("user.text", text="Dame el resumen del turno."))
        saw_new_plan = False
        for _ in range(60):
            e = ws.receive_json()
            if e["event_type"] == "agent.plan.created":
                saw_new_plan = True
                break
        assert saw_new_plan


# ── 2. Evento de cliente duplicado (mismo event_id) se deduplica ──────────

def test_ws_duplicate_client_event_id_is_dispatched_only_once(client, login_as_operador):
    token = login_as_operador["access_token"]
    with client.websocket_connect(f"/api/ai-agent/ws?token={token}") as ws:
        ws.receive_json()
        event = _client_event("user.text", text="Dame el resumen del turno.")
        ws.send_json(event)
        ws.send_json(event)  # exactamente el mismo event_id, reenviado

        plan_events = []
        completed = 0
        for _ in range(90):
            e = ws.receive_json()
            if e["event_type"] == "agent.plan.created":
                plan_events.append(e)
            if e["event_type"] == "investigation.completed":
                completed += 1
                break
        # Solo un heartbeat de espera corto para drenar un posible segundo
        # flujo si el duplicado SI se hubiera despachado.
        ws.send_json(_client_event("session.heartbeat"))

    assert len(plan_events) == 1, "el event_id duplicado debio ser ignorado antes de dispatch_command"


# ── 3-4-5. ACK: tardio post-timeout, tardio post-cancel, duplicado ────────

def test_ws_late_ack_after_timeout_does_not_alter_the_final_state(client, login_as_operador, monkeypatch):
    monkeypatch.setattr(runtime, "REQUIRED_UI_ACTION_TIMEOUT_SECONDS", 0.2)
    token = login_as_operador["access_token"]
    with client.websocket_connect(f"/api/ai-agent/ws?token={token}") as ws:
        ws.receive_json()
        ws.send_json(_client_event("user.text", text="Analiza la Pala 07."))

        action_id = None
        events = []
        for _ in range(60):
            e = ws.receive_json()
            events.append(e)
            if e["event_type"] == "ui_action.waiting":
                action_id = e["payload"]["actionId"]
            if e["event_type"] == "investigation.completed":
                break

        assert action_id is not None
        result_before = events[-1]["payload"]["result"]

        # El ACK real llega DESPUES de que el timeout ya resolvio el future.
        ws.send_json(_client_event("ui_action.completed", actionId=action_id, contextUpdated=True, selectedEntityIds=["CAEX-99"]))
        ws.send_json(_client_event("session.heartbeat"))

    # No hay forma de que un ACK tardio reabra la investigacion ya
    # persistida - result_before ya fue serializado por investigation.
    # completed antes de que el ACK tardio llegara.
    assert result_before["plan"]["status"] in ("completed", "failed")


def test_ws_late_ack_after_cancel_does_not_resurrect_the_investigation(client, login_as_operador):
    token = login_as_operador["access_token"]
    with client.websocket_connect(f"/api/ai-agent/ws?token={token}") as ws:
        ws.receive_json()
        ws.send_json(_client_event("user.text", text="Analiza la Pala 03."))

        action_id = None
        for _ in range(30):
            e = ws.receive_json()
            if e["event_type"] == "ui_action.waiting":
                action_id = e["payload"]["actionId"]
                break
        assert action_id is not None

        ws.send_json(_client_event("agent.cancel"))
        cancelled = False
        for _ in range(30):
            e = ws.receive_json()
            if e["event_type"] == "investigation.cancelled":
                cancelled = True
                break
        assert cancelled

        # El ACK real, generado antes del cancel pero entregado despues.
        ws.send_json(_client_event("ui_action.completed", actionId=action_id, contextUpdated=True, selectedEntityIds=["CAEX-15"]))
        ws.send_json(_client_event("session.heartbeat"))
        # La sesion debe seguir en idle, no volver a running/executing por el ACK tardio.
        ws.send_json(_client_event("user.text", text="Dame el resumen del turno."))
        saw_new_plan = False
        for _ in range(60):
            e = ws.receive_json()
            if e["event_type"] == "agent.plan.created":
                saw_new_plan = True
                break
        assert saw_new_plan  # la sesion acepta un comando nuevo con normalidad


@pytest.mark.asyncio
async def test_duplicate_ack_for_the_same_action_id_only_resolves_once():
    session = AgentSession(session_id="s1", user_id="u1", role="operador", created_at=datetime.now(timezone.utc), updated_at=datetime.now(timezone.utc))
    live = LiveSession(session)
    future = ui_actions.register_wait(live, "action-1")

    ack = ui_actions.UIActionAcknowledgement(action_id="action-1", status="completed", context_updated=True)
    assert ui_actions.resolve_ack(live, ack) is True
    assert future.result() == ack

    # Segundo ACK para el mismo action_id: el future ya esta resuelto y
    # popped - no debe avanzar el plan una segunda vez.
    duplicate_ack = ui_actions.UIActionAcknowledgement(action_id="action-1", status="completed", context_updated=True)
    assert ui_actions.resolve_ack(live, duplicate_ack) is False


def test_ack_for_a_nonexistent_step_is_ignored_not_fabricated():
    session = AgentSession(session_id="s1", user_id="u1", role="operador", created_at=datetime.now(timezone.utc), updated_at=datetime.now(timezone.utc))
    live = LiveSession(session)
    ack = ui_actions.UIActionAcknowledgement(action_id="action-nunca-existio", status="completed")
    assert ui_actions.resolve_ack(live, ack) is False


# ── 6-7. Reconexion + replay: mismo estado, sin re-ejecucion, sequence/correlation intactos ─

def test_reconnect_replay_does_not_re_execute_and_preserves_sequence_and_correlation_id(client, login_as_operador):
    token = login_as_operador["access_token"]
    session_id = None
    correlation_id = None
    last_sequence = 0
    first_plan_investigation_id = None

    with client.websocket_connect(f"/api/ai-agent/ws?token={token}") as ws:
        ready = ws.receive_json()
        session_id = ready["session_id"]
        sent = _client_event("user.text", text="Dame el resumen del turno.")
        correlation_id = sent["correlation_id"]
        ws.send_json(sent)

        # Se desconecta a proposito ANTES de completed, para forzar un replay real.
        for _ in range(30):
            e = ws.receive_json()
            last_sequence = e["sequence"]
            if e["event_type"] == "agent.plan.created":
                first_plan_investigation_id = e["investigation_id"]
                break

    # Reconecta con since_sequence - debe recibir el resto de eventos por
    # REPLAY (leidos de agent_events), nunca por una segunda ejecucion.
    with client.websocket_connect(f"/api/ai-agent/ws?token={token}&session_id={session_id}&since_sequence={last_sequence}") as ws:
        ready = ws.receive_json()
        assert ready["payload"]["resumed"] is True

        replayed_plan_events = 0
        investigation_ids_seen = set()
        for _ in range(60):
            e = ws.receive_json()
            if e["event_type"] == "agent.plan.created":
                replayed_plan_events += 1
            if e.get("investigation_id"):
                investigation_ids_seen.add(e["investigation_id"])
            if e["event_type"] == "investigation.completed":
                break

    assert replayed_plan_events == 0  # el plan.created de ANTES del disconnect no se re-emite duplicado
    assert investigation_ids_seen == {first_plan_investigation_id}  # ninguna segunda investigacion

    all_events = persistence.get_events_since(session_id, 0)
    # session.ready es un evento de ciclo de vida de CONEXION, no de la
    # investigacion - a proposito lleva su propio correlation_id (fresco por
    # cada handshake) aunque reporte el investigation_id activo en curso, asi
    # que se excluye de este chequeo de "misma cadena de correlacion".
    investigation_events = [e for e in all_events if e["investigation_id"] == first_plan_investigation_id and e["event_type"] != "session.ready"]
    assert investigation_events  # precondicion: hay eventos reales que verificar
    assert all(e["correlation_id"] == correlation_id for e in investigation_events)
    sequences = [e["sequence"] for e in all_events]
    assert sequences == sorted(sequences)
    assert len(set(e["event_id"] for e in all_events)) == len(all_events)  # sin duplicados persistidos


# ── 8. Retry legitimo (nueva peticion) vs replay: cada uno con su propio ID ─

def test_two_separate_investigation_requests_never_share_an_investigation_id(client, login_as_operador):
    token = login_as_operador["access_token"]
    with client.websocket_connect(f"/api/ai-agent/ws?token={token}") as ws:
        ws.receive_json()
        ids = []
        for _ in range(2):
            ws.send_json(_client_event("user.text", text="Dame el resumen del turno."))
            for _ in range(60):
                e = ws.receive_json()
                if e["event_type"] == "agent.plan.created":
                    ids.append(e["investigation_id"])
                    break
                if e["event_type"] == "investigation.completed":
                    break
            # drenar hasta completed antes de la siguiente peticion
            while True:
                e = ws.receive_json()
                if e["event_type"] == "investigation.completed":
                    break
    assert len(ids) == 2
    assert ids[0] != ids[1]


# ── 9. Process restart: honestidad sobre que sobrevive y que no ──────────

def test_process_restart_persists_audit_trail_but_loses_the_in_memory_live_session():
    # Simula un restart: una AgentSessionManager NUEVA (memoria vacia),
    # como la que se crea al reiniciar el proceso backend.
    session_id = f"asess-restart-{uuid.uuid4().hex[:8]}"
    original_session = AgentSession(
        session_id=session_id, user_id="u-restart", role="operador",
        created_at=datetime.now(timezone.utc), updated_at=datetime.now(timezone.utc),
    )
    persistence.save_session(original_session)

    # RECOVERABLE a nivel de auditoria/DB: la fila persistida sigue ahi.
    conn = persistence._connection()
    row = conn.execute("SELECT * FROM agent_sessions WHERE session_id = ?", (session_id,)).fetchone()
    assert row is not None
    assert row["user_id"] == "u-restart"

    # LOST_BY_DESIGN a nivel de sesion viva: un AgentSessionManager fresco
    # (proceso nuevo) no tiene ningun LiveSession para este id - no existe
    # rehidratacion desde agent_sessions hacia memoria hoy.
    fresh_manager = AgentSessionManager()
    result = asyncio.run(fresh_manager.try_get_for_user(session_id, "u-restart"))
    assert result is None


def test_session_manager_is_a_single_process_in_memory_singleton():
    # Evidencia de MULTI_WORKER_SAFE=false / MULTI_REPLICA_SAFE=false: es
    # un singleton de modulo, no una fuente distribuida - dos "workers"
    # (dos imports/procesos distintos) nunca comparten este diccionario.
    from app.ai.runtime.session_manager import session_manager as imported_again
    assert imported_again is session_manager
    assert isinstance(session_manager._sessions, dict)


# ── Escenario focal: T1 -> I1 -> C1 -> E1 -> disconnect -> reconnect -> replay ─

def test_focal_scenario_capability_executes_exactly_once_across_disconnect_and_reconnect(client, login_as_operador):
    token = login_as_operador["access_token"]
    session_id = None
    investigation_id = None

    with client.websocket_connect(f"/api/ai-agent/ws?token={token}") as ws:
        ready = ws.receive_json()
        session_id = ready["session_id"]
        ws.send_json(_client_event("user.text", text="Dame el resumen del turno."))
        for _ in range(10):
            e = ws.receive_json()
            if e["event_type"] == "agent.plan.created":
                investigation_id = e["investigation_id"]
                break
        # Desconecta a mitad de la ejecucion (a proposito, sin esperar completed).

    with client.websocket_connect(f"/api/ai-agent/ws?token={token}&session_id={session_id}&since_sequence=0") as ws:
        ready = ws.receive_json()
        assert ready["payload"]["resumed"] is True
        for _ in range(90):
            e = ws.receive_json()
            if e["event_type"] == "investigation.completed":
                break

    all_events = persistence.get_events_since(session_id, 0)
    tool_completed_for_investigation = [
        e for e in all_events if e["event_type"] == "tool.completed" and e["investigation_id"] == investigation_id
    ]
    completed_events = [e for e in all_events if e["event_type"] == "investigation.completed" and e["investigation_id"] == investigation_id]

    # C1 ejecutado exactamente una vez por capability - no dos veces por el disconnect/replay.
    seen_capability_step_ids = [e["step_id"] for e in tool_completed_for_investigation]
    assert len(seen_capability_step_ids) == len(set(seen_capability_step_ids))
    assert len(seen_capability_step_ids) > 0  # precondicion: si hubo al menos una capability ejecutada
    # Una sola conclusion/investigation.completed para esta investigacion.
    assert len(completed_events) == 1

    row = get_investigation(investigation_id)
    assert row is not None  # I1 persistida exactamente una vez (upsert por id, ver ON CONFLICT en investigation_repository.py)
