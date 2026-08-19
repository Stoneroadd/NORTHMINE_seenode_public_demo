from __future__ import annotations

import sqlite3
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from app.core.config import get_settings
from app.repositories.demo_access_repository import get_demo_access_repository
from app.services.user_repository import get_user_repository


def _database_health() -> dict[str, Any]:
    settings = get_settings()
    db_path = Path(settings.audit_db_path)
    started = time.perf_counter()
    try:
        db_path.parent.mkdir(parents=True, exist_ok=True)
        with sqlite3.connect(str(db_path), timeout=3) as conn:
            conn.execute("SELECT 1")
        status = "connected"
    except Exception:
        status = "disconnected"
    return {
        "status": status,
        "required": True,
        "latency_ms": max(0, round((time.perf_counter() - started) * 1000, 2)),
    }


def _repository_health(repository: Any, *, required: bool) -> dict[str, Any]:
    started = time.perf_counter()
    try:
        raw = repository.health_status()
        result = dict(raw) if isinstance(raw, dict) else {"status": "unavailable"}
    except Exception:
        result = {"status": "unavailable", "reason": "health_check_failed"}
    result["required"] = required
    result["latency_ms"] = max(0, round((time.perf_counter() - started) * 1000, 2))
    return result


def _public_probe(check: dict[str, Any]) -> dict[str, Any]:
    """Return the allow-listed readiness fields safe for an HTTP response.

    Repository health contracts may contain useful local diagnostics such as
    database paths or account totals. Those belong in internal logs, not in a
    public load-balancer endpoint.
    """
    allowed = (
        "status",
        "required",
        "latency_ms",
        "reason",
        "backend",
        "durable",
        "configured",
    )
    return {field: check[field] for field in allowed if field in check}


def build_liveness_response() -> dict[str, Any]:
    settings = get_settings()
    return {
        "status": "ok",
        "live": True,
        "service": settings.service_name,
        "version": settings.version,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


def build_health_response() -> dict[str, Any]:
    settings = get_settings()
    database = _database_health()
    user_store = _repository_health(get_user_repository(), required=True)
    demo_access_store = _repository_health(
        get_demo_access_repository(),
        required=True,
    )
    startup_errors = settings.startup_errors
    checks = {
        "audit_store": database,
        "users": user_store,
        "demo_access": demo_access_store,
    }
    required_failures = [
        name for name, check in checks.items()
        if check.get("required") and check.get("status") != "connected"
    ]
    status = "ok"
    if required_failures or startup_errors:
        status = "degraded"
    response: dict[str, Any] = {
        "status": status,
        "service": settings.service_name,
        "version": settings.version,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "demo_access_persistence": demo_access_store.get("status"),
        "ready": not required_failures and not startup_errors,
        "failed_checks": len(required_failures),
    }
    # El health publico basta para un balanceador. Los detalles de topologia,
    # CORS y errores de configuracion solo se exponen fuera de produccion.
    if not settings.is_production:
        response.update({
            "environment": settings.environment,
            "mode": settings.mode,
            "database": database.get("status"),
            "identity_store": user_store.get("status"),
            "sql_available": settings.mode == "sql",
            "demo_mode": settings.demo_mode,
            "production_ready": not startup_errors,
            "production_errors_count": len(startup_errors),
            "checks": {
                "service_identity": settings.service_name == "northmine-api",
                **{name: _public_probe(check) for name, check in checks.items()},
            },
        })
    return response


def build_readiness_response() -> tuple[dict[str, Any], int]:
    health = build_health_response()
    ready = bool(health.get("ready"))
    return health, 200 if ready else 503
