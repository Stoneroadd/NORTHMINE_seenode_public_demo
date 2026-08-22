from __future__ import annotations

import logging
from collections.abc import Generator
from dataclasses import replace
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from app.core.audit import query_audit_log
from app.core.config import get_settings
from app.core.health import build_health_response
from app.core.rate_limit import limiter
from app.main import app
from app.repositories.demo_access_postgres_repository import (
    PostgreSQLDemoAccessRepository,
)
from app.repositories.demo_access_repository import (
    DemoAccessPersistenceError,
    SQLiteDemoAccessRepository,
    UnavailableDemoAccessRepository,
    build_demo_access_repository,
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
        json={"username": "admin", "password": "Northmine-Demo#2026"},
    )
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def real_admin_header(client: TestClient) -> dict[str, str]:
    # RequireAdmin excludes is_demo accounts (dependencies.py
    # _require_real_admin): the shared admin/admin demo login can no longer
    # see or review demo-access requests, since those carry real prospect
    # PII (name/email/company), not synthetic data. Tests that exercise
    # this authorization boundary need a genuine non-demo admin account.
    user_repository = get_user_repository()
    if user_repository.get_by_username("qa_real_admin") is None:
        user_repository.create_user(
            "qa_real_admin", "Qa-Real-Admin-2026!!",
            full_name="QA Real Admin", role="admin", is_demo=False,
        )
    response = client.post(
        "/api/auth/login",
        json={"username": "qa_real_admin", "password": "Qa-Real-Admin-2026!!"},
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
    caplog,
) -> None:
    client, repository = demo_access_client
    caplog.set_level(logging.INFO)

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
    audit_records = query_audit_log(
        limit=5,
        endpoint="/api/demo-access/requests",
    )
    assert audit_records
    assert audit_records[0]["ip"] == "redacted"
    assert "camila.rojas@example.com" not in caplog.text
    assert "Necesitamos evaluar" not in caplog.text


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
    headers = real_admin_header(client)

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
    assert approved.json()["reviewed_by"] == "qa_real_admin"
    assert approved.json()["internal_notes"] == "Contexto validado por administracion."


def test_admin_can_reject_request(demo_access_client) -> None:
    client, repository = demo_access_client
    client.post("/api/demo-access/requests", json=valid_payload())
    request_id = repository.list()[0].id

    rejected = client.post(
        f"/api/demo-access/requests/{request_id}/reject",
        headers=real_admin_header(client),
        json={"internal_notes": "Solicitud fuera del alcance actual."},
    )

    assert rejected.status_code == 200
    assert rejected.json()["status"] == "rejected"
    assert rejected.json()["reviewed_by"] == "qa_real_admin"
    audit_records = query_audit_log(
        limit=5,
        usuario="qa_real_admin",
        endpoint=f"/api/demo-access/requests/{request_id}/reject",
    )
    assert audit_records
    assert audit_records[0]["status_code"] == 200


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


def test_demo_admin_account_cannot_reach_demo_access_requests(
    demo_access_client,
) -> None:
    # The core of this fix: admin/admin is a publicly-shared credential
    # handed to anyone with approved demo access (see conversation with the
    # user -- prospect PII must not sit behind a guessable shared login).
    # is_demo, not role, is what RequireAdmin checks now.
    client, repository = demo_access_client
    client.post("/api/demo-access/requests", json=valid_payload())
    request_id = repository.list()[0].id
    headers = admin_header(client)

    listed = client.get("/api/demo-access/requests", headers=headers)
    approved = client.post(
        f"/api/demo-access/requests/{request_id}/approve",
        headers=headers,
        json={"internal_notes": "no deberia poder escribir esto"},
    )

    assert listed.status_code == 403
    assert approved.status_code == 403


def test_admin_get_unknown_request_returns_404(demo_access_client) -> None:
    client, _ = demo_access_client

    response = client.get(
        "/api/demo-access/requests/does-not-exist",
        headers=real_admin_header(client),
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


def test_repository_selection_uses_sqlite_for_local_development(tmp_path) -> None:
    settings = replace(
        get_settings(),
        demo_access_database_url="",
        demo_access_require_durable=False,
        demo_access_db_path=str(tmp_path / "selected.db"),
    )

    repository = build_demo_access_repository(settings)

    assert isinstance(repository, SQLiteDemoAccessRepository)
    assert repository.durable is False


def test_repository_selection_uses_mocked_postgresql_when_configured() -> None:
    captured: dict[str, object] = {}
    sentinel = MagicMock(backend_name="postgresql", durable=True)

    def factory(**kwargs):
        captured.update(kwargs)
        return sentinel

    settings = replace(
        get_settings(),
        demo_access_database_url="postgresql://db.example.invalid/northmine",
        demo_access_require_durable=True,
    )

    repository = build_demo_access_repository(
        settings,
        postgres_factory=factory,
    )

    assert repository is sentinel
    assert captured["database_url"] == settings.demo_access_database_url
    assert captured["max_size"] == settings.demo_access_pool_max_size
    assert "password" not in captured


def test_durable_store_requires_stable_fingerprint_key() -> None:
    settings = replace(
        get_settings(),
        demo_access_database_url="postgresql://db.example.invalid/northmine",
        demo_access_require_durable=True,
        demo_access_fingerprint_key="ephemeral",
        demo_access_fingerprint_key_is_ephemeral=True,
    )

    repository = build_demo_access_repository(settings)

    assert isinstance(repository, UnavailableDemoAccessRepository)
    assert repository.health_status()["reason"] == (
        "stable_fingerprint_key_not_configured"
    )


def test_durable_store_fails_closed_without_database_url() -> None:
    settings = replace(
        get_settings(),
        demo_access_database_url="",
        demo_access_require_durable=True,
        demo_access_fingerprint_key="stable-test-key-" * 3,
        demo_access_fingerprint_key_is_ephemeral=False,
    )

    repository = build_demo_access_repository(settings)

    assert isinstance(repository, UnavailableDemoAccessRepository)
    assert repository.health_status()["reason"] == "durable_store_not_configured"


def test_standard_database_url_is_supported(monkeypatch) -> None:
    monkeypatch.delenv("NORTHMINE_DEMO_ACCESS_DATABASE_URL", raising=False)
    monkeypatch.setenv(
        "DATABASE_URL",
        "postgresql://db.example.invalid/northmine",
    )
    get_settings.cache_clear()
    try:
        settings = get_settings()
        assert settings.demo_access_database_url == (
            "postgresql://db.example.invalid/northmine"
        )
    finally:
        get_settings.cache_clear()


def test_production_without_durable_store_returns_503(
    demo_access_client,
) -> None:
    client, _ = demo_access_client
    repository = UnavailableDemoAccessRepository("durable_store_not_configured")
    app.dependency_overrides[get_demo_access_repository] = lambda: repository
    try:
        response = client.post("/api/demo-access/requests", json=valid_payload())
        honeypot = client.post(
            "/api/demo-access/requests",
            json=valid_payload(website="bot"),
        )
    finally:
        app.dependency_overrides[get_demo_access_repository] = (
            lambda: demo_access_client[1]
        )

    assert response.status_code == 503
    assert response.json() == {
        "detail": (
            "El servicio de solicitudes no esta disponible temporalmente. "
            "La solicitud no fue guardada."
        )
    }
    assert honeypot.status_code == 202
    assert "durable_store_not_configured" not in response.text


def test_health_reports_demo_access_persistence_state(monkeypatch) -> None:
    repository = UnavailableDemoAccessRepository("durable_store_not_configured")
    monkeypatch.setattr(
        "app.core.health.get_demo_access_repository",
        lambda: repository,
    )

    health = build_health_response()

    assert health["status"] == "degraded"
    assert health["demo_access_persistence"] == "unavailable"
    assert health["checks"]["demo_access"]["configured"] is False


def test_postgresql_adapter_builds_schema_and_parameterizes_crud() -> None:
    pool = MagicMock()
    pool.closed = False
    connection = MagicMock()
    pool.connection.return_value.__enter__.return_value = connection

    def pool_factory(**_):
        return pool

    repository = PostgreSQLDemoAccessRepository(
        database_url="postgresql://db.example.invalid/northmine",
        pool_factory=pool_factory,
    )

    schema_cursor = MagicMock()
    schema_cursor.fetchone.return_value = {"version": 1}

    def schema_execute(query, params=None):
        if "SELECT version" in query:
            return schema_cursor
        return MagicMock()

    connection.execute.side_effect = schema_execute
    repository.init_schema()
    schema_sql = "\n".join(
        str(call.args[0]) for call in connection.execute.call_args_list
    )
    assert "CREATE TABLE IF NOT EXISTS demo_access_requests" in schema_sql
    assert "CREATE INDEX IF NOT EXISTS idx_demo_access_status_created" in schema_sql
    assert "ON CONFLICT (singleton) DO NOTHING" in schema_sql

    repository.init_schema = lambda: None
    now = "2026-07-31T12:00:00+00:00"
    row = {
        "id": "request-1",
        "created_at": now,
        "updated_at": now,
        "first_name": "Camila",
        "last_name": "Rojas",
        "email_normalized": "camila@example.com",
        "company": "Operacion Demo",
        "role": "Supervisora",
        "country": "Chile",
        "operation_type": None,
        "fleet_size_range": None,
        "interests": ["Cockpit operacional"],
        "message": None,
        "phone_optional": None,
        "consent_accepted": True,
        "consent_version": "2026-07-31",
        "status": "pending",
        "reviewed_at": None,
        "reviewed_by": None,
        "internal_notes": None,
        "source": "public_landing",
        "request_fingerprint": "fingerprint",
    }

    insert_cursor = MagicMock()
    insert_cursor.fetchone.return_value = row
    connection.execute.reset_mock()
    connection.execute.return_value = insert_cursor
    connection.execute.side_effect = None

    created, was_created = repository.create(
        first_name="Camila",
        last_name="Rojas",
        email_normalized="camila@example.com",
        company="Operacion Demo",
        role="Supervisora",
        country="Chile",
        operation_type=None,
        fleet_size_range=None,
        interests=["Cockpit operacional"],
        message=None,
        phone_optional=None,
        consent_version="2026-07-31",
        source="public_landing",
        request_fingerprint="fingerprint",
    )

    assert was_created is True
    assert created.id == "request-1"
    insert_call = connection.execute.call_args_list[0]
    assert "%s" in str(insert_call.args[0])
    assert "camila@example.com" not in str(insert_call.args[0])
    assert "fingerprint" in insert_call.args[1]

    list_cursor = MagicMock()
    list_cursor.fetchall.return_value = [row]
    connection.execute.reset_mock()
    connection.execute.return_value = list_cursor
    listed = repository.list(status="pending")
    assert [item.id for item in listed] == ["request-1"]
    assert connection.execute.call_args.args[1] == ("pending",)

    reviewed_row = {
        **row,
        "status": "approved",
        "reviewed_at": now,
        "reviewed_by": "admin",
    }
    review_cursor = MagicMock()
    review_cursor.fetchone.return_value = reviewed_row
    connection.execute.reset_mock()
    connection.execute.return_value = review_cursor
    reviewed = repository.review(
        "request-1",
        status="approved",
        reviewed_by="admin",
        internal_notes=None,
    )
    assert reviewed is not None
    assert reviewed.status == "approved"
    assert reviewed.reviewed_by == "admin"
    assert "request-1" in connection.execute.call_args.args[1]


def test_postgresql_health_fails_closed_on_unknown_schema() -> None:
    pool = MagicMock()
    pool.closed = False
    repository = PostgreSQLDemoAccessRepository(
        database_url="postgresql://db.example.invalid/northmine",
        pool_factory=lambda **_: pool,
    )
    repository.init_schema = MagicMock(
        side_effect=DemoAccessPersistenceError(
            "Unsupported demo access schema version"
        )
    )

    health = repository.health_status()

    assert health["status"] == "unavailable"
    assert health["backend"] == "postgresql"
    assert health["configured"] is True
