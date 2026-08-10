from __future__ import annotations

from dataclasses import replace

import pytest

from app.core import audit as audit_module
from app.core.audit import log_event
from app.core.config import get_settings
from app.core.rate_limit import limiter
from app.api import routes as routes_module


def test_operator_cannot_access_supervisor_endpoints(client, login_as_operador):
    headers = {"Authorization": f"Bearer {login_as_operador['access_token']}"}
    response = client.get("/api/admin/audit-log", headers=headers)
    assert response.status_code == 403


def test_security_policy_allows_same_origin_microphone_only(client):
    response = client.get("/health")

    assert response.status_code == 200
    policy = response.headers["Permissions-Policy"]
    assert "microphone=(self)" in policy
    assert "microphone=()" not in policy
    assert "camera=()" in policy


def test_brute_force_on_login(client):
    for _ in range(3):
        resp = client.post("/api/auth/login", json={"username": "admin", "password": "wrong"})
        assert resp.status_code == 401

    resp = client.post("/api/auth/login", json={"username": "admin", "password": "admin"})
    assert resp.status_code == 429
    assert "Espera" in resp.text


def test_token_blacklist_after_logout(client, login_as_admin):
    token = login_as_admin["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    resp = client.post("/api/auth/logout", headers=headers)
    assert resp.status_code == 200

    resp = client.get("/api/demo/summary", headers=headers)
    assert resp.status_code == 401


def test_password_history_mining_requirement(client, login_as_admin):
    # Cada cambio de password bumpea auth_version (invalida el token vigente
    # a proposito, ver core/security backport), asi que el token usado para
    # el SIGUIENTE cambio debe venir de un login posterior al cambio anterior,
    # no reutilizar el token original en toda la secuencia.
    token = login_as_admin["access_token"]

    passwords = [f"Pala202{i}!!" for i in range(1, 6)]
    current = "admin"

    for i, new_pw in enumerate(passwords):
        headers = {"Authorization": f"Bearer {token}"}
        resp = client.post("/api/auth/change-password", headers=headers, json={
            "current_password": current,
            "new_password": new_pw,
        })
        assert resp.status_code == 200, f"Failed on change {i}: {resp.text}"
        current = new_pw
        # El test verifica profundidad de historial de passwords, no rate
        # limiting (eso ya lo cubre test_rate_limit_login_enforced) -- se
        # resetea el limiter antes de cada re-login para no acumular contra
        # el limite de 5/min de /api/auth/login en esta misma secuencia.
        limiter.reset()
        login_resp = client.post("/api/auth/login", json={"username": "admin", "password": current})
        assert login_resp.status_code == 200, f"Re-login failed after change {i}: {login_resp.text}"
        token = login_resp.json()["access_token"]

    headers = {"Authorization": f"Bearer {token}"}
    resp = client.post("/api/auth/change-password", headers=headers, json={
        "current_password": current,
        "new_password": "Pala2021!!",
    })
    assert resp.status_code == 400
    assert "No puede reutilizar passwords anteriores" in resp.text


def test_password_strength_validation(client, login_as_admin):
    headers = {"Authorization": f"Bearer {login_as_admin['access_token']}"}
    resp = client.post("/api/auth/change-password", headers=headers, json={
        "current_password": "admin",
        "new_password": "shortonumber",  # 13 chars but no uppercase, number, or special
    })
    assert resp.status_code == 400


def test_security_metrics_endpoint(client, login_as_admin):
    headers = {"Authorization": f"Bearer {login_as_admin['access_token']}"}
    resp = client.get("/api/admin/metrics", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "blocked_ips" in data
    assert "failed_logins_last_hour" in data
    assert "active_sessions" in data
    assert "audit_log_size_mb" in data
    assert "suspicious_activity" in data


def test_public_demo_protects_network_identity_and_system_details(client, monkeypatch):
    demo_settings = replace(
        get_settings(),
        mode="demo",
        demo_mode=True,
        data_mode="DEMO",
        environment="demo",
    )
    monkeypatch.setattr(routes_module, "get_settings", lambda: demo_settings)
    monkeypatch.setattr(audit_module, "get_settings", lambda: demo_settings)

    log_event(
        usuario="demo",
        ip="203.0.113.42",
        metodo="GET",
        endpoint="/api/demo/protected-network-test",
        status_code=200,
    )
    login = client.post("/api/auth/login", json={"username": "admin", "password": "admin"})
    assert login.status_code == 200
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    audit_response = client.get("/api/admin/audit-log", headers=headers)
    system_response = client.get("/api/admin/system", headers=headers)

    assert audit_response.status_code == 200
    assert all(item["ip"] == "PROTEGIDA" for item in audit_response.json()["items"])
    assert "203.0.113.42" not in audit_response.text
    assert system_response.status_code == 200
    assert system_response.json()["logs"] == {
        "directory": "protegido",
        "recent_errors": [],
    }
    assert system_response.json()["frontend"]["expected_origin"] == "entorno demo protegido"


def test_revoke_user_tokens(client, login_as_admin):
    admin_headers = {"Authorization": f"Bearer {login_as_admin['access_token']}"}

    sup = client.post("/api/auth/login", json={"username": "supervisor", "password": "supervisor"})
    assert sup.status_code == 200
    sup_token = sup.json()["access_token"]
    sup_headers = {"Authorization": f"Bearer {sup_token}"}

    resp = client.get("/api/demo/summary", headers=sup_headers)
    assert resp.status_code == 200

    resp = client.post("/api/admin/revoke-user-tokens/supervisor", headers=admin_headers)
    assert resp.status_code == 200

    resp = client.get("/api/demo/summary", headers=sup_headers)
    assert resp.status_code == 401


def test_operador_cannot_access_admin_metrics(client, login_as_operador):
    headers = {"Authorization": f"Bearer {login_as_operador['access_token']}"}
    resp = client.get("/api/admin/metrics", headers=headers)
    assert resp.status_code == 403


def test_supervisor_cannot_revoke_tokens(client, login_as_supervisor):
    headers = {"Authorization": f"Bearer {login_as_supervisor['access_token']}"}
    resp = client.post("/api/admin/revoke-user-tokens/operador", headers=headers)
    assert resp.status_code == 403
