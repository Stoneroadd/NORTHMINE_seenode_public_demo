from datetime import datetime

from app.core.dependencies import get_current_user
from app.main import app
from app.mission_control.service import build_demo_operational_flow_snapshot


def test_demo_operational_flow_is_temporal_connected_and_provenance_safe() -> None:
    snapshot = build_demo_operational_flow_snapshot(
        tenant_id="tenant-a",
        site_id="site-a",
        at=datetime.fromisoformat("2026-08-20T10:45:00-04:00"),
    )

    assert snapshot.provenance.origin == "SYNTHETIC"
    assert snapshot.provenance.representation == "DERIVED"
    assert snapshot.active_event is not None
    assert snapshot.active_event.status == "RECOVERING"
    node_ids = {node.node_id for node in snapshot.nodes}
    assert {edge.source_node_id for edge in snapshot.relationships} <= node_ids
    assert {edge.target_node_id for edge in snapshot.relationships} <= node_ids
    assert any(edge.relationship_type == "MAY_AFFECT_COST" for edge in snapshot.relationships)
    cost = next(node for node in snapshot.nodes if node.node_id == "cost-impact")
    assert cost.condition == "UNKNOWN"
    assert cost.summary == "Sin cálculo autorizado"


def _scoped_user() -> dict[str, str]:
    return {
        "sub": "mission-control-test",
        "rol": "operador",
        "empresa": "Tenant A",
        "faena": "Site A",
    }


def test_operational_flow_endpoint_requires_auth_and_uses_server_scope(client) -> None:
    unauthenticated = client.get("/api/mission-control/operational-flow")
    assert unauthenticated.status_code == 401

    app.dependency_overrides[get_current_user] = _scoped_user
    try:
        response = client.get(
            "/api/mission-control/operational-flow?at=2026-08-20T10%3A45%3A00-04%3A00&tenant_id=other&site_id=other"
        )
    finally:
        app.dependency_overrides.pop(get_current_user, None)
    assert response.status_code == 200
    payload = response.json()
    assert payload["tenant_id"] == "tenant a"
    assert payload["site_id"] == "site a"
    assert payload["provenance"]["origin"] == "SYNTHETIC"


def test_operational_flow_rejects_ambiguous_or_out_of_window_time(client) -> None:
    app.dependency_overrides[get_current_user] = _scoped_user
    try:
        naive = client.get("/api/mission-control/operational-flow?at=2026-08-20T10%3A45%3A00")
        outside = client.get("/api/mission-control/operational-flow?at=2026-08-21T10%3A45%3A00-04%3A00")
    finally:
        app.dependency_overrides.pop(get_current_user, None)
    assert naive.status_code == 422
    assert outside.status_code == 422
