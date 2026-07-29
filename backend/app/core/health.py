from __future__ import annotations

import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from app.core.config import get_settings
from app.services.user_repository import get_user_repository


def _database_status() -> str:
    settings = get_settings()
    db_path = Path(settings.audit_db_path)
    try:
        db_path.parent.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(str(db_path), timeout=3)
        conn.execute("SELECT 1")
        conn.close()
        return "connected"
    except Exception:
        return "disconnected"


def build_health_response() -> dict[str, Any]:
    settings = get_settings()
    database = _database_status()
    user_store = get_user_repository().health_status()
    production_errors = settings.production_errors
    status = "ok"
    if database != "connected" or user_store.get("status") != "connected" or production_errors:
        status = "degraded"
    return {
        "status": status,
        "service": settings.service_name,
        "version": settings.version,
        "environment": settings.environment,
        "mode": settings.mode,
        "database": database,
        "identity_store": user_store.get("status"),
        "sql_available": settings.mode == "sql",
        "demo_mode": settings.demo_mode,
        "production_ready": not production_errors,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "checks": {
            "service_identity": settings.service_name == "northmine-api",
            "cors_origins": settings.cors_origins,
            "production_errors": production_errors,
            "users": user_store,
        },
    }
