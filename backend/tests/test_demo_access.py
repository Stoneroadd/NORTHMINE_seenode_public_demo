from __future__ import annotations

from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient

from app.core.rate_limit import limiter
from app.main import app
from app.repositories.demo_access_repository import (
    SQLiteDemoAccessRepository,
    get_demo_access_repository,
)
from app.services.user_repository import DEMO_USER_SEEDS, get_user_repository


def valid_payload(**overrides: object) -> dict[str, object]:
    payload: dict[str, object] = {
        "first_name": "Camila",
        "last_name": "Rojas",
        "email": "camila.rojas@example.com",
        "company": "Operacion Minera Demo",
        "role": "Supervisora de turno",
        "country": "Chile",
        "operation_type": "Mineria a cielo abierto",
        "fleet_size_range": "31-75 equipos",
        "interests": ["Cockpit operacional", "Flota CAEX"],
        "message": "Necesitamos evaluar el flujo de decisiones de turno.",
        "phone": "+56 9 5555 0000",
        "consent_accepted": True,
        "consent_version": "2026-07-31",
        "website": "",
    }
    payload.update(overrides)
    return payload


@pytest.fixture
def demo_access_client(
    tmp_path,
) -> Generator[tuple[TestClient, SQLiteDemoAccessRepository], None, None]:
    repository = SQLiteDemoAccessRepository(tmp_path / "demo_access.db")
    repository.init_schema()
    user_repository = get_user_repository()
    user_repository.init_schema()
    for seed in DEMO_USER_SEEDS:
        if user_repository.get_by_username(seed["username"]) is None:
            user_repository.create_user(
                seed["username"],
                seed["password"],
                full_name=seed["full_name"],
                role=seed["role"],
                is_demo=True,
                faena=seed["faena"],
                empresa=seed["empresa"],
            )
        else:
            user_repository.update_password(seed["username"], seed["password"])
    app.dependency_overrides[get_demo_access_repository] = lambda: repository
    limiter.reset()
    try:
        with TestClient(app) as client:
            yield client, repository
    finally:
        app.dependency_overrides.pop(get_demo_access_repository, None)
        limiter.reset()


def admin_header(client: TestClient) -> dict[str, str]:
    response = client.post(
        "/api/auth/login",
        json={"username": "admin", "password": "admin"},
    )
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def supervisor_header(client: TestClient) -> dict[str, str]:
    response = client.post(
        "/api/auth/login",
        json={"username": "supervisor", "password": "supervisor"},
    )
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_public_request_is_accepted_and_stored_separately(
    demo_access_client,
) -> None:
    client, repository = demo_access_client

    response = client.post("/api/demo-access/requests", json=valid_payload())

    assert response.status_code == 202
    body = response.json()
    assert body["accepted"] is True
    assert body["reference"].startswith("NM-")
    assert "email" not in body
    records = repository.list()
    assert len(records) == 1
    assert records[0].email_normalized == "camila.rojas@example.com"
    assert records[0].status == "pending"
    assert not hasattr(records[0], "ip")


def test_consent_is_required(demo_access_client) -> None:
    client, repository = demo_access_client

    response = client.post(
        "/api/demo-access/requests",
        json=valid_payload(consent_accepted=False),
    )

    assert response.status_code == 422
    assert repository.list() == []


def test_payload_rejects_unknown_fields_and_invalid_email(
    demo_access_client,
) -> None:
    client, repository = demo_access_client

    response = client.post(
        "/api/demo-access/requests",
        json=valid_payload(email="invalid", sql_password="secret"),
    )

    assert response.status_code == 422
    assert repository.list() == []


def test_honeypot_returns_generic_receipt_without_storage(
    demo_access_client,
) -> None:
    client, repository = demo_access_client

    response = client.post(
        "/api/demo-access/requests",
        json=valid_payload(website="https://spam.example"),
    )

    assert response.status_code == 202
    assert response.json()["accepted"] is True
    assert repository.list() == []


def test_same_day_duplicate_is_not_stored_twice(demo_access_client) -> None:
    client, repository = demo_access_client

    first = client.post("/api/demo-access/requests", json=valid_payload())
    second = client.post("/api/demo-access/requests", json=valid_payload())

    assert first.status_code == 202
    assert second.status_code == 202
    assert first.json()["reference"] != second.json()["reference"]
    assert len(repository.list()) == 1


def test_public_request_rate_limit(demo_access_client) -> None:
    client, repository = demo_access_client

    responses = [
        client.post(
            "/api/demo-access/requests",
            json=valid_payload(email=f"persona{index}@example.com"),
        )
        for index in range(6)
    ]

    assert [response.status_code for response in responses[:5]] == [202] * 5
    assert responses[5].status_code == 429
    assert len(repository.list()) == 5


def test_admin_can_list_and_approve_request(demo_access_client) -> None:
    client, repository = demo_access_client
    created = client.post("/api/demo-access/requests", json=valid_payload())
    assert created.status_code == 202
    request_id = repository.list()[0].id
    headers = admin_header(client)

    listed = client.get("/api/demo-access/requests?status=pending", headers=headers)
    approved = client.post(
        f"/api/demo-access/requests/{request_id}/approve",
        headers=headers,
        json={"internal_notes": "Contexto validado por administracion."},
    )

    assert listed.status_code == 200
    assert listed.json()["total"] == 1
    assert listed.json()["items"][0]["email_normalized"] == "camila.rojas@example.com"
    assert approved.status_code == 200
    assert approved.json()["status"] == "approved"
    assert approved.json()["reviewed_by"] == "admin"
    assert approved.json()["internal_notes"] == "Contexto validado por administracion."


def test_admin_endpoints_reject_missing_or_insufficient_role(
    demo_access_client,
) -> None:
    client, repository = demo_access_client
    client.post("/api/demo-access/requests", json=valid_payload())
    request_id = repository.list()[0].id

    unauthenticated = client.get("/api/demo-access/requests")
    forbidden = client.post(
        f"/api/demo-access/requests/{request_id}/reject",
        headers=supervisor_header(client),
        json={"internal_notes": "Sin autorizacion."},
    )

    assert unauthenticated.status_code == 401
    assert forbidden.status_code == 403


def test_admin_get_unknown_request_returns_404(demo_access_client) -> None:
    client, _ = demo_access_client

    response = client.get(
        "/api/demo-access/requests/does-not-exist",
        headers=admin_header(client),
    )

    assert response.status_code == 404


def test_public_and_protected_spa_routes_keep_server_contract(
    demo_access_client,
) -> None:
    client, _ = demo_access_client

    landing = client.get("/")
    request_page = client.get("/solicitar-demo")
    login_page = client.get("/acceso-demo")
    cockpit = client.get("/cockpit")
    health = client.get("/health")
    unknown_api = client.get("/api/demo-access/not-a-route")

    assert landing.status_code == 200
    assert "NORTHMINE Intelligence" in landing.text
    assert landing.headers.get("x-robots-tag") is None
    assert request_page.status_code == 200
    assert request_page.headers["x-robots-tag"] == "noindex, nofollow"
    assert login_page.status_code == 200
    assert login_page.headers["x-robots-tag"] == "noindex, nofollow"
    assert cockpit.status_code == 200
    assert cockpit.headers["x-robots-tag"] == "noindex, nofollow"
    assert health.status_code == 200
    assert unknown_api.status_code == 404
