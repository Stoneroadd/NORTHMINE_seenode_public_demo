from __future__ import annotations

import pytest

from app.core.config import get_settings


@pytest.fixture(autouse=True)
def _clear_settings_cache():
    get_settings.cache_clear()
    yield
    # Each case mutates os.environ. Do not leak the cached Settings object to
    # the API tests that run after this module.
    get_settings.cache_clear()


def _settings_for(monkeypatch: pytest.MonkeyPatch, **values: str):
    for key in (
        "ENVIRONMENT", "NORTHMINE_MODE", "NORTHMINE_DATA_MODE",
        "NORTHMINE_DEMO_MODE", "NORTHMINE_ALLOW_DEMO_LOGIN",
        "NORTHMINE_CORS_ORIGINS", "SECRET_KEY", "REFRESH_SECRET_KEY",
        "PASSWORD_SALT", "NORTHMINE_SQL_SERVER", "NORTHMINE_SQL_USER",
        "NORTHMINE_SQL_PASSWORD", "NORTHMINE_SQL_TRUST_SERVER_CERTIFICATE",
        "NORTHMINE_WORKERS", "WEB_CONCURRENCY", "NORTHMINE_LOCAL_AUTO_SYNC_ENABLED",
        "NORTHMINE_REDIS_URL",
    ):
        monkeypatch.delenv(key, raising=False)
    if values.get("ENVIRONMENT") == "production":
        values.setdefault("NORTHMINE_REDIS_URL", "rediss://default:strong-password@redis.internal:6380/0")
    for key, value in values.items():
        monkeypatch.setenv(key, value)
    get_settings.cache_clear()
    return get_settings()


def test_unset_environment_fails_closed_as_production(monkeypatch):
    settings = _settings_for(monkeypatch)
    assert settings.environment == "production"
    with pytest.raises(RuntimeError, match="Unsafe NORTHMINE production configuration"):
        settings.require_production_safe()


def test_unknown_environment_aborts_startup(monkeypatch):
    settings = _settings_for(monkeypatch, ENVIRONMENT="staging")
    with pytest.raises(RuntimeError, match="ENVIRONMENT must be one of"):
        settings.require_production_safe()


def test_production_accepts_only_explicit_secure_configuration(monkeypatch):
    settings = _settings_for(
        monkeypatch,
        ENVIRONMENT="production",
        NORTHMINE_MODE="sql",
        NORTHMINE_DATA_MODE="REAL",
        NORTHMINE_DEMO_MODE="false",
        NORTHMINE_ALLOW_DEMO_LOGIN="false",
        NORTHMINE_CORS_ORIGINS="https://northmine.example.com",
        SECRET_KEY="a" * 64,
        REFRESH_SECRET_KEY="b" * 64,
        PASSWORD_SALT="c" * 64,
        NORTHMINE_SQL_SERVER="wenco.internal",
        NORTHMINE_SQL_USER="northmine_reader",
        NORTHMINE_SQL_PASSWORD="a-strong-password",
    )
    settings.require_production_safe()


@pytest.mark.parametrize("origin", ["http://northmine.example.com", "https://localhost:5173", "https://*.example.com"])
def test_production_rejects_insecure_or_non_concrete_cors_origin(monkeypatch, origin):
    settings = _settings_for(
        monkeypatch,
        ENVIRONMENT="production",
        NORTHMINE_MODE="sql",
        NORTHMINE_DATA_MODE="REAL",
        NORTHMINE_DEMO_MODE="false",
        NORTHMINE_ALLOW_DEMO_LOGIN="false",
        NORTHMINE_CORS_ORIGINS=origin,
        SECRET_KEY="a" * 64,
        REFRESH_SECRET_KEY="b" * 64,
        PASSWORD_SALT="c" * 64,
        NORTHMINE_SQL_SERVER="wenco.internal",
        NORTHMINE_SQL_USER="northmine_reader",
        NORTHMINE_SQL_PASSWORD="a-strong-password",
    )
    with pytest.raises(RuntimeError, match="CORS"):
        settings.require_production_safe()


def test_production_rejects_disabled_sql_certificate_validation(monkeypatch):
    settings = _settings_for(
        monkeypatch,
        ENVIRONMENT="production",
        NORTHMINE_MODE="sql",
        NORTHMINE_DEMO_MODE="false",
        NORTHMINE_ALLOW_DEMO_LOGIN="false",
        NORTHMINE_CORS_ORIGINS="https://northmine.example.com",
        SECRET_KEY="a" * 64,
        REFRESH_SECRET_KEY="b" * 64,
        PASSWORD_SALT="c" * 64,
        NORTHMINE_SQL_SERVER="wenco.internal",
        NORTHMINE_SQL_USER="northmine_reader",
        NORTHMINE_SQL_PASSWORD="a-strong-password",
        NORTHMINE_SQL_TRUST_SERVER_CERTIFICATE="true",
    )
    with pytest.raises(RuntimeError, match="TRUST_SERVER_CERTIFICATE"):
        settings.require_production_safe()


def test_production_rejects_multiple_workers_without_shared_rate_limit_store(monkeypatch):
    settings = _settings_for(
        monkeypatch,
        ENVIRONMENT="production",
        NORTHMINE_MODE="sql",
        NORTHMINE_DEMO_MODE="false",
        NORTHMINE_ALLOW_DEMO_LOGIN="false",
        NORTHMINE_CORS_ORIGINS="https://northmine.example.com",
        SECRET_KEY="a" * 64,
        REFRESH_SECRET_KEY="b" * 64,
        PASSWORD_SALT="c" * 64,
        NORTHMINE_SQL_SERVER="wenco.internal",
        NORTHMINE_SQL_USER="northmine_reader",
        NORTHMINE_SQL_PASSWORD="a-strong-password",
        NORTHMINE_WORKERS="2",
    )
    with pytest.raises(RuntimeError, match="WORKERS"):
        settings.require_production_safe()


def test_local_auto_sync_is_disabled_by_default_in_production(monkeypatch):
    settings = _settings_for(monkeypatch, ENVIRONMENT="production")
    assert settings.local_auto_sync_enabled is False


def test_local_auto_sync_remains_enabled_in_development(monkeypatch):
    settings = _settings_for(monkeypatch, ENVIRONMENT="development")
    assert settings.local_auto_sync_enabled is True


def test_production_requires_authenticated_tls_redis(monkeypatch):
    settings = _settings_for(
        monkeypatch,
        ENVIRONMENT="production",
        NORTHMINE_REDIS_URL="redis://redis:6379/0",
    )
    with pytest.raises(RuntimeError, match="REDIS_URL"):
        settings.require_production_safe()
