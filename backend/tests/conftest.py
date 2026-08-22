from __future__ import annotations

import os
import tempfile
from pathlib import Path

# BCRYPT_ROUNDS se lee una sola vez como constante de modulo en app.core.security,
# asi que debe fijarse ANTES de importar app.main (que arrastra ese import).
# Costo 12 (produccion) hashea ~250-300ms; _reset_state rehashea 4 passwords
# de demo en CADA test (autouse), sumando ~1s/test de bcrypt puro. Con >30
# tests eso son minutos de CPU redundante y, en maquinas con contencion (AV
# escaneando el proceso python.exe recien lanzado, CPU compartida, etc.),
# alcanza para que una sola llamada a bcrypt tarde mucho mas de lo normal y
# la corrida completa parezca "colgada". Costo 4 es instantaneo y no cambia
# la seguridad real (nunca se usa en produccion, solo en tests).
os.environ.setdefault("BCRYPT_ROUNDS", "4")

# ENVIRONMENT tambien debe fijarse ANTES de "from app.main import app": config.py
# omite el valor -> "production" a proposito (fail-closed si un despliegue real
# olvida configurarlo), pero eso hace que crypto.py aborte el arranque exigiendo
# AUDIT_ENCRYPTION_KEY si el proceso de tests no fijo ENVIRONMENT de antemano.
# El fixture _init_db de mas abajo tambien lo fija, pero corre DESPUES de este
# import de modulo, demasiado tarde para el chequeo de crypto.py.
os.environ.setdefault("ENVIRONMENT", "testing")
os.environ.setdefault(
    "NORTHMINE_DEMO_ACCESS_DB",
    str(Path(tempfile.gettempdir()) / f"northmine_demo_access_tests_{os.getpid()}.db"),
)
os.environ["NORTHMINE_DEMO_ACCESS_DATABASE_URL"] = ""
os.environ["NORTHMINE_DEMO_ACCESS_REQUIRE_DURABLE"] = "false"
os.environ.setdefault("NORTHMINE_DEMO_ACCESS_FINGERPRINT_KEY", "test-" * 16)

from typing import Any, Generator

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.audit import _conn, _cleanup_pool, init_audit_db, init_security_tables
from app.core.brute_force import _blocked_until, _failed_attempts
from app.core.rate_limit import limiter
from app.services.user_repository import DEMO_USER_SEEDS, get_user_repository


@pytest.fixture(autouse=True)
def _reset_state() -> Generator[None, None, None]:
    _failed_attempts.clear()
    _blocked_until.clear()
    limiter.reset()
    repo = get_user_repository()
    repo.init_schema()
    for seed in DEMO_USER_SEEDS:
        repo.update_password(seed["username"], seed["password"])
    yield


@pytest.fixture(autouse=True)
def _init_db(monkeypatch) -> Generator[None, None, None]:
    monkeypatch.delenv("ENVIRONMENT", raising=False)
    monkeypatch.setenv("ENVIRONMENT", "testing")
    _cleanup_pool()
    conn = _conn()
    for tbl in ("audit_log", "token_blacklist", "mfa_store", "failed_logins", "active_sessions", "password_history"):
        conn.execute(f"DROP TABLE IF EXISTS {tbl}")
    conn.commit()
    init_audit_db()
    init_security_tables()
    yield


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    with TestClient(app) as c:
        yield c


@pytest.fixture
def login_as_admin(client: TestClient) -> dict[str, Any]:
    resp = client.post("/api/auth/login", json={"username": "admin", "password": "Northmine-Demo#2026"})
    assert resp.status_code == 200, f"Login admin failed: {resp.status_code} {resp.text}"
    return resp.json()


@pytest.fixture
def login_as_real_admin(client: TestClient) -> dict[str, Any]:
    # RequireAdmin now excludes is_demo accounts (see dependencies.py
    # _require_real_admin) -- the seeded admin/admin no longer reaches
    # RequireAdmin-gated routes. Tests that exercise those routes need a
    # genuine non-demo admin account instead of login_as_admin.
    repo = get_user_repository()
    if repo.get_by_username("qa_real_admin") is None:
        repo.create_user(
            "qa_real_admin", "Qa-Real-Admin-2026!!",
            full_name="QA Real Admin", role="admin", is_demo=False,
            # Must match the demo seeds' tenant/site so require_resource_scope
            # (multi-tenant isolation) doesn't 404 admin operations against
            # demo-seeded targets like supervisor/operador.
            empresa="NORTHMINE DEMO", faena="MINA CHILE DEMO",
        )
    resp = client.post("/api/auth/login", json={"username": "qa_real_admin", "password": "Qa-Real-Admin-2026!!"})
    assert resp.status_code == 200, f"Login qa_real_admin failed: {resp.status_code} {resp.text}"
    return resp.json()


@pytest.fixture
def login_as_supervisor(client: TestClient) -> dict[str, Any]:
    resp = client.post("/api/auth/login", json={"username": "supervisor", "password": "supervisor"})
    assert resp.status_code == 200, f"Login supervisor failed: {resp.status_code} {resp.text}"
    return resp.json()


@pytest.fixture
def login_as_operador(client: TestClient) -> dict[str, Any]:
    resp = client.post("/api/auth/login", json={"username": "operador", "password": "operador"})
    assert resp.status_code == 200, f"Login operador failed: {resp.status_code} {resp.text}"
    return resp.json()


def auth_header(session: dict[str, Any]) -> dict[str, str]:
    return {"Authorization": f"Bearer {session['access_token']}"}
