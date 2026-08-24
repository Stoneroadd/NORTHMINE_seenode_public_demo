from __future__ import annotations

import importlib

from fastapi.testclient import TestClient


def test_application_lifespan_preserves_startup_shutdown_order(monkeypatch) -> None:
    main = importlib.import_module("app.main")
    events: list[str] = []

    async def fake_startup() -> None:
        events.append("startup")

    async def fake_shutdown() -> None:
        events.append("shutdown")

    monkeypatch.setattr(main, "startup", fake_startup)
    monkeypatch.setattr(main, "shutdown", fake_shutdown)

    with TestClient(main.app):
        assert events == ["startup"]

    assert events == ["startup", "shutdown"]
