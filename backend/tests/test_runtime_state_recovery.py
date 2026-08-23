from __future__ import annotations

import uuid

"""Two runtime state-machine bugs, verified directly against this repo's
current WS event flow (not ported from integration/agent-consolidated as a
diff -- that branch's fix was bundled with a speech_policy->speech_segmenter
swap that would revert this repo's own speech-chunking system, so only the
state-machine logic was reapplied; see runtime.py::_run_investigation and
runtime.py::cancel_investigation).
"""


def _client_event(event_type, **payload):
    return {"event_id": f"evt-{uuid.uuid4().hex[:10]}", "correlation_id": f"corr-{uuid.uuid4().hex[:8]}", "event_type": event_type, "payload": payload}


def test_successful_investigation_returns_to_idle_not_stuck_speaking(client, login_as_operador):
    token = login_as_operador["access_token"]
    with client.websocket_connect(f"/api/ai-agent/ws?token={token}") as ws:
        ws.receive_json()
        ws.send_json(_client_event("user.text", text="Dame el resumen del turno."))

        completed = False
        for _ in range(60):
            event = ws.receive_json()
            if event["event_type"] == "investigation.completed":
                completed = True
                break
        assert completed, "never received investigation.completed"

        # Before the fix, _run_investigation's success path never emitted
        # this event: the state machine stayed at SPEAKING forever, and the
        # WS connection would need to be dropped and reopened for the next
        # turn to start cleanly.
        final_state_event = ws.receive_json()
        assert final_state_event["event_type"] == "agent.state.changed"
        assert final_state_event["payload"]["state"] == "idle"


def test_duplicate_cancel_after_investigation_completed_does_not_crash_the_connection(client, login_as_operador):
    token = login_as_operador["access_token"]
    with client.websocket_connect(f"/api/ai-agent/ws?token={token}") as ws:
        ws.receive_json()
        ws.send_json(_client_event("user.text", text="Dame el resumen del turno."))

        for _ in range(60):
            event = ws.receive_json()
            if event["event_type"] == "investigation.completed":
                break
        ws.receive_json()  # agent.state.changed -> idle (the fix above)

        # A late/duplicate cancel (repeated transport event, double click,
        # reconnect) arriving when there is nothing left to cancel used to
        # raise an uncaught InvalidStateTransition (idle has no edge to
        # cancelled) that propagated out of _dispatch_client_event and
        # crashed the WS loop. It should now be a silent no-op instead.
        ws.send_json(_client_event("agent.cancel"))

        # The connection must still be alive and able to serve a normal
        # turn afterwards -- if the duplicate cancel had crashed the loop,
        # this send/receive would hang or raise instead of completing.
        ws.send_json(_client_event("user.text", text="Dame el resumen del turno."))
        completed_again = False
        for _ in range(60):
            event = ws.receive_json()
            if event["event_type"] == "investigation.completed":
                completed_again = True
                break
        assert completed_again, "connection did not survive the duplicate cancel"
