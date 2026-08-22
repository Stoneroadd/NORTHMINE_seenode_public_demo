from __future__ import annotations

import httpx
import pytest

from app.ai.realtime.diagnostics import check_openai_realtime_access
from app.core.config import Settings, get_settings
from tests.conftest import auth_header

"""OpenAI Realtime diagnostics (auditoria previa a la integracion completa
del Modo JARVIS full-duplex): confirma que la API key configurada tiene
acceso efectivo al modelo Realtime elegido, sin abrir sesion de audio real.
Nunca debe exponer la API key en ningun resultado."""


def _settings(**overrides) -> Settings:
    base = get_settings()
    return Settings(**{**base.__dict__, **overrides})


class _FakeResponse:
    def __init__(self, status_code: int, json_body: dict | None = None):
        self.status_code = status_code
        self._json_body = json_body or {}

    def json(self):
        return self._json_body


@pytest.mark.asyncio
async def test_missing_api_key_never_calls_openai(monkeypatch):
    called = False

    async def _fake_post(self, *args, **kwargs):
        nonlocal called
        called = True
        return _FakeResponse(200)

    monkeypatch.setattr(httpx.AsyncClient, "post", _fake_post)
    result = await check_openai_realtime_access(_settings(openai_api_key="", openai_realtime_model="gpt-realtime-2.1-mini"))

    assert called is False
    assert result.api_key_configured is False
    assert result.error_code == "missing_api_key"


@pytest.mark.asyncio
async def test_missing_model_never_calls_openai(monkeypatch):
    called = False

    async def _fake_post(self, *args, **kwargs):
        nonlocal called
        called = True
        return _FakeResponse(200)

    monkeypatch.setattr(httpx.AsyncClient, "post", _fake_post)
    result = await check_openai_realtime_access(_settings(openai_api_key="sk-test-not-real", openai_realtime_model=""))

    assert called is False
    assert result.api_key_configured is True
    assert result.error_code == "missing_model"


@pytest.mark.asyncio
async def test_access_confirmed_on_200(monkeypatch):
    async def _fake_post(self, url, json=None, headers=None):
        assert url.endswith("/v1/realtime/client_secrets")
        assert json == {"session": {"type": "realtime", "model": "gpt-realtime-2.1-mini"}}
        assert headers["Authorization"] == "Bearer sk-test-not-real"
        return _FakeResponse(200, {"value": "ek_fake_ephemeral_secret_never_used"})

    monkeypatch.setattr(httpx.AsyncClient, "post", _fake_post)
    result = await check_openai_realtime_access(_settings(openai_api_key="sk-test-not-real", openai_realtime_model="gpt-realtime-2.1-mini"))

    assert result.access_confirmed is True
    assert result.http_status == 200
    assert result.error_code is None


@pytest.mark.asyncio
async def test_invalid_key_reports_sanitized_error_without_leaking_the_key(monkeypatch):
    async def _fake_post(self, *args, **kwargs):
        return _FakeResponse(401, {"error": {"code": "invalid_api_key", "message": "Incorrect API key provided: sk-test-not-real."}})

    monkeypatch.setattr(httpx.AsyncClient, "post", _fake_post)
    result = await check_openai_realtime_access(_settings(openai_api_key="sk-test-not-real", openai_realtime_model="gpt-realtime-2.1-mini"))

    assert result.access_confirmed is False
    assert result.http_status == 401
    assert result.error_code == "invalid_api_key"
    assert "sk-test-not-real" not in (result.error_message or "")
    assert "***" in (result.error_message or "")


@pytest.mark.asyncio
async def test_model_not_accessible_reports_sanitized_error(monkeypatch):
    async def _fake_post(self, *args, **kwargs):
        return _FakeResponse(404, {"error": {"code": "model_not_found", "message": "The model does not exist or you do not have access to it."}})

    monkeypatch.setattr(httpx.AsyncClient, "post", _fake_post)
    result = await check_openai_realtime_access(_settings(openai_api_key="sk-test-not-real", openai_realtime_model="gpt-realtime-2.1-mini"))

    assert result.access_confirmed is False
    assert result.http_status == 404
    assert result.error_code == "model_not_found"


@pytest.mark.asyncio
async def test_network_error_is_reported_without_raising(monkeypatch):
    async def _fake_post(self, *args, **kwargs):
        raise httpx.ConnectTimeout("timed out")

    monkeypatch.setattr(httpx.AsyncClient, "post", _fake_post)
    result = await check_openai_realtime_access(_settings(openai_api_key="sk-test-not-real", openai_realtime_model="gpt-realtime-2.1-mini"))

    assert result.access_confirmed is False
    assert result.error_code == "network_error"


def test_diagnostics_endpoint_requires_admin(client, login_as_operador):
    response = client.get("/api/ai-agent/realtime/diagnostics", headers=auth_header(login_as_operador))
    assert response.status_code == 403


def test_diagnostics_endpoint_never_leaks_the_api_key_even_to_an_admin(client, login_as_real_admin, monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "sk-super-secret-value-should-never-appear")
    monkeypatch.setenv("OPENAI_REALTIME_MODEL", "gpt-realtime-2.1-mini")
    get_settings.cache_clear()

    async def _fake_post(self, *args, **kwargs):
        return _FakeResponse(401, {"error": {"code": "invalid_api_key", "message": "Incorrect API key provided: sk-super-secret-value-should-never-appear."}})

    monkeypatch.setattr(httpx.AsyncClient, "post", _fake_post)
    response = client.get("/api/ai-agent/realtime/diagnostics", headers=auth_header(login_as_real_admin))
    get_settings.cache_clear()

    assert response.status_code == 200
    body_text = response.text
    assert "sk-super-secret-value-should-never-appear" not in body_text
    assert response.json()["error_code"] == "invalid_api_key"
