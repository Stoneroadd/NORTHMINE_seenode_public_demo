from __future__ import annotations

from types import SimpleNamespace

from app.core import health


def test_production_health_does_not_disclose_topology(monkeypatch):
    monkeypatch.setattr(
        health,
        "get_settings",
        lambda: SimpleNamespace(
            audit_db_path="unused.db",
            service_name="northmine-api",
            version="2.0.0",
            environment="production",
            mode="sql",
            demo_mode=False,
            startup_errors=[],
            is_production=True,
        ),
    )
    monkeypatch.setattr(health, "_database_status", lambda: "connected")
    monkeypatch.setattr(
        health,
        "get_user_repository",
        lambda: SimpleNamespace(health_status=lambda: {"status": "connected", "path": "/secret/path"}),
    )

    response = health.build_health_response()

    assert response["status"] == "ok"
    assert set(response) == {"status", "service", "version", "timestamp"}


def test_non_production_health_keeps_diagnostics(monkeypatch):
    monkeypatch.setattr(
        health,
        "get_settings",
        lambda: SimpleNamespace(
            audit_db_path="unused.db",
            service_name="northmine-api",
            version="2.0.0",
            environment="testing",
            mode="demo",
            demo_mode=True,
            startup_errors=[],
            is_production=False,
            cors_origins=["http://localhost:5173"],
        ),
    )
    monkeypatch.setattr(health, "_database_status", lambda: "connected")
    monkeypatch.setattr(
        health,
        "get_user_repository",
        lambda: SimpleNamespace(health_status=lambda: {"status": "connected"}),
    )

    assert "checks" in health.build_health_response()
