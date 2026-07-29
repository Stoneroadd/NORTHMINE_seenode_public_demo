from __future__ import annotations

import os
import platform
import time
from pathlib import Path
from typing import Any

from app.core.config import get_settings
from app.core.health import build_health_response


STARTED_AT = time.time()


def _process_memory_mb() -> float | None:
    try:
        import resource  # type: ignore

        usage = resource.getrusage(resource.RUSAGE_SELF)
        value = float(usage.ru_maxrss)
        if platform.system().lower() == "darwin":
            return round(value / (1024 * 1024), 2)
        return round(value / 1024, 2)
    except Exception:
        return None


def _recent_errors(log_dir: str, limit: int = 12) -> list[str]:
    candidates = [
        Path(log_dir) / "backend.log",
        Path(log_dir) / "backend_stderr.log",
        Path(log_dir) / "security.log",
    ]
    errors: list[str] = []
    for path in candidates:
        if not path.exists():
            continue
        try:
            lines = path.read_text(encoding="utf-8", errors="ignore").splitlines()
        except Exception:
            continue
        for line in lines[-200:]:
            upper = line.upper()
            if "ERROR" in upper or "TRACEBACK" in upper or "EXCEPTION" in upper:
                errors.append(f"{path.name}: {line[:240]}")
    return errors[-limit:]


def build_admin_system_status() -> dict[str, Any]:
    settings = get_settings()
    return {
        "health": build_health_response(),
        "backend": {
            "service": settings.service_name,
            "version": settings.version,
            "environment": settings.environment,
            "pid": os.getpid(),
            "uptime_seconds": int(time.time() - STARTED_AT),
            "cpu_time_seconds": round(time.process_time(), 2),
            "memory_mb": _process_memory_mb(),
            "platform": platform.platform(),
            "python": platform.python_version(),
        },
        "frontend": {
            "expected_version": settings.version,
            "expected_origin": "http://localhost:5173" if not settings.is_production else "configured",
        },
        "logs": {
            "directory": settings.log_dir,
            "recent_errors": _recent_errors(settings.log_dir),
        },
    }
