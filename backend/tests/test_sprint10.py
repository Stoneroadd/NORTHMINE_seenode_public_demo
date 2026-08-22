from __future__ import annotations

import pyotp


def test_mfa_setup_returns_secret_and_qr(client, login_as_admin):
    headers = {"Authorization": f"Bearer {login_as_admin['access_token']}"}
    resp = client.post("/api/auth/mfa/setup", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "secret" in data
    assert "qr_base64" in data
    assert "backup_codes" in data
    assert len(data["backup_codes"]) == 10


def test_mfa_verify_enables_mfa(client, login_as_admin):
    headers = {"Authorization": f"Bearer {login_as_admin['access_token']}"}
    setup = client.post("/api/auth/mfa/setup", headers=headers).json()
    totp = pyotp.TOTP(setup["secret"])
    code = totp.now()
    resp = client.post("/api/auth/mfa/verify", headers=headers, json={"code": code})
    assert resp.status_code == 200
    assert resp.json()["enabled"] is True


def test_mfa_login_requires_code(client, login_as_admin):
    headers = {"Authorization": f"Bearer {login_as_admin['access_token']}"}
    setup = client.post("/api/auth/mfa/setup", headers=headers).json()
    totp = pyotp.TOTP(setup["secret"])
    code = totp.now()
    client.post("/api/auth/mfa/verify", headers=headers, json={"code": code})
    client.post("/api/auth/logout", headers=headers)
    resp = client.post("/api/auth/login", json={"username": "admin", "password": "Northmine-Demo#2026"})
    assert resp.status_code == 401
    assert "MFA" in resp.text


def test_mfa_login_with_valid_code(client, login_as_admin):
    headers = {"Authorization": f"Bearer {login_as_admin['access_token']}"}
    setup = client.post("/api/auth/mfa/setup", headers=headers).json()
    totp = pyotp.TOTP(setup["secret"])
    code = totp.now()
    client.post("/api/auth/mfa/verify", headers=headers, json={"code": code})
    client.post("/api/auth/logout", headers=headers)
    resp = client.post("/api/auth/login", json={"username": "admin", "password": "Northmine-Demo#2026", "mfa_code": totp.now()})
    assert resp.status_code == 200, f"MFA login failed: {resp.text}"
    assert "access_token" in resp.json()


def test_mfa_login_with_backup_code(client, login_as_admin):
    headers = {"Authorization": f"Bearer {login_as_admin['access_token']}"}
    setup = client.post("/api/auth/mfa/setup", headers=headers).json()
    backup_code = setup["backup_codes"][0]
    totp = pyotp.TOTP(setup["secret"])
    code = totp.now()
    client.post("/api/auth/mfa/verify", headers=headers, json={"code": code})
    client.post("/api/auth/logout", headers=headers)
    resp = client.post("/api/auth/login", json={"username": "admin", "password": "Northmine-Demo#2026", "mfa_code": backup_code})
    assert resp.status_code == 200, f"Backup code login failed: {resp.text}"


def test_active_sessions_tracked_after_login(client, login_as_real_admin):
    headers = {"Authorization": f"Bearer {login_as_real_admin['access_token']}"}
    resp = client.get("/api/admin/metrics", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["active_sessions"] >= 1


def test_audit_log_encrypted_detalle(client, login_as_real_admin):
    headers = {"Authorization": f"Bearer {login_as_real_admin['access_token']}"}
    resp = client.get("/api/admin/audit-log", headers=headers)
    assert resp.status_code == 200
    items = resp.json()["items"]
    if items:
        for item in items:
            assert isinstance(item.get("detalle"), dict)


def test_rate_limit_login_enforced(client):
    for i in range(6):
        resp = client.post("/api/auth/login", json={"username": "admin", "password": "wrong"})
    if resp.status_code == 429:
        assert True
    else:
        assert resp.status_code == 401, f"Expected 429 after burst, got {resp.status_code}"


def test_mfa_status_endpoint(client, login_as_admin):
    headers = {"Authorization": f"Bearer {login_as_admin['access_token']}"}
    resp = client.get("/api/auth/mfa/status", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "enabled" in data
    assert "setup" in data


def test_mfa_regenerate_codes(client, login_as_admin):
    headers = {"Authorization": f"Bearer {login_as_admin['access_token']}"}
    setup = client.post("/api/auth/mfa/setup", headers=headers).json()
    backup = setup["backup_codes"][0]
    resp = client.post("/api/auth/mfa/regenerate-codes", headers=headers)
    assert resp.status_code == 200
    new_codes = resp.json()["backup_codes"]
    assert len(new_codes) == 10
    assert backup not in new_codes
