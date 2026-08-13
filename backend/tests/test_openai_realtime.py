from __future__ import annotations

import asyncio
import json

import httpx
import pytest

from app.ai.realtime import openai_bridge
from app.ai.realtime.openai_bridge import (
    RealtimeProviderError,
    build_session_config,
    create_openai_call,
    privacy_preserving_user_id,
    runtime_tool,
)
from app.ai.runtime.event_bus import emit
from app.ai.runtime.session_manager import AgentSessionManager
from app.core.config import get_settings
from tests.conftest import auth_header


def test_realtime_configuration_is_fail_closed(monkeypatch) -> None:
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.delenv("OPENAI_REALTIME_ENABLED", raising=False)
    get_settings.cache_clear()
    settings = get_settings()
    assert settings.openai_realtime_available is False
    assert "OPENAI_REALTIME_ENABLED" in settings.openai_realtime_missing_configuration
    assert "OPENAI_API_KEY" in settings.openai_realtime_missing_configuration
    assert settings.openai_realtime_model == "gpt-realtime-2.1-mini"
    get_settings.cache_clear()


def test_realtime_status_is_authenticated_and_honest(client, login_as_operador, monkeypatch) -> None:
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.delenv("OPENAI_REALTIME_ENABLED", raising=False)
    get_settings.cache_clear()
    assert client.get("/api/ai-agent/realtime/status").status_code == 401
    response = client.get(
        "/api/ai-agent/realtime/status", headers=auth_header(login_as_operador),
    )
    assert response.status_code == 200
    assert response.json()["ready"] is False
    assert response.json()["mode"] == "not_configured"
    assert "OPENAI_API_KEY" in response.json()["missing"]
    get_settings.cache_clear()


def test_realtime_session_fails_closed_without_configuration(client, login_as_operador, monkeypatch) -> None:
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.delenv("OPENAI_REALTIME_ENABLED", raising=False)
    get_settings.cache_clear()
    response = client.post(
        "/api/ai-agent/realtime/session",
        headers={
            **auth_header(login_as_operador),
            "Content-Type": "application/sdp",
            "X-NORTHMINE-Agent-Session": "asess-does-not-matter",
        },
        content="v=0\r\no=offer",
    )
    assert response.status_code == 503
    assert response.json()["detail"]["code"] == "REALTIME_NOT_CONFIGURED"
    assert "OPENAI_API_KEY" in response.json()["detail"]["missing"]
    get_settings.cache_clear()


def test_realtime_session_config_keeps_runtime_as_single_tool(monkeypatch) -> None:
    monkeypatch.setenv("OPENAI_REALTIME_ENABLED", "true")
    monkeypatch.setenv("OPENAI_API_KEY", "test-server-only-key")
    get_settings.cache_clear()
    config = build_session_config(get_settings())
    assert config["type"] == "realtime"
    assert config["tools"] == [runtime_tool()]
    assert config["tools"][0]["name"] == "northmine_runtime"
    assert config["audio"]["input"]["turn_detection"]["interrupt_response"] is True
    assert "test-server-only-key" not in json.dumps(config)
    get_settings.cache_clear()


def test_privacy_identifier_is_stable_and_does_not_expose_user() -> None:
    first = privacy_preserving_user_id("supervisor@example.invalid")
    second = privacy_preserving_user_id("supervisor@example.invalid")
    assert first == second
    assert len(first) == 64
    assert "supervisor" not in first


def test_openai_call_uses_server_key_and_returns_sideband_call_id(monkeypatch) -> None:
    monkeypatch.setenv("OPENAI_REALTIME_ENABLED", "true")
    monkeypatch.setenv("OPENAI_API_KEY", "server-secret-value")
    get_settings.cache_clear()
    captured: dict = {}

    async def fake_post(self, url, **kwargs):
        captured["url"] = url
        captured.update(kwargs)
        request = httpx.Request("POST", url)
        return httpx.Response(
            200,
            text="v=0\r\no=answer",
            headers={"Location": "/v1/realtime/calls/rtc_test123"},
            request=request,
        )

    monkeypatch.setattr(httpx.AsyncClient, "post", fake_post)
    answer, call_id = asyncio.run(create_openai_call(
        offer_sdp="v=0\r\no=offer", user_id="operator-1", settings=get_settings(),
    ))
    assert answer.startswith("v=0")
    assert call_id == "rtc_test123"
    assert captured["headers"]["Authorization"] == "Bearer server-secret-value"
    assert captured["headers"]["OpenAI-Safety-Identifier"] != "operator-1"
    assert "server-secret-value" not in answer
    get_settings.cache_clear()


def test_openai_call_rejects_missing_sideband_identifier(monkeypatch) -> None:
    monkeypatch.setenv("OPENAI_REALTIME_ENABLED", "true")
    monkeypatch.setenv("OPENAI_API_KEY", "server-secret-value")
    get_settings.cache_clear()

    async def fake_post(self, url, **kwargs):
        return httpx.Response(200, text="v=0", request=httpx.Request("POST", url))

    monkeypatch.setattr(httpx.AsyncClient, "post", fake_post)
    with pytest.raises(RealtimeProviderError):
        asyncio.run(create_openai_call(offer_sdp="v=0", user_id="operator-1", settings=get_settings()))
    get_settings.cache_clear()


def test_runtime_event_observer_does_not_drain_browser_outbox() -> None:
    asyncio.run(_assert_runtime_event_observer_does_not_drain_browser_outbox())


async def _assert_runtime_event_observer_does_not_drain_browser_outbox() -> None:
    manager = AgentSessionManager()
    live = await manager.create(user_id="u1", role="operador", company_id=None, site_id=None)
    observer: asyncio.Queue = asyncio.Queue()
    live.event_observers.add(observer)
    emitted = await emit(live, "agent.text.delta", correlation_id="corr", payload={"text": "resultado"})
    assert await observer.get() == emitted
    assert await live.outbox.get() == emitted
