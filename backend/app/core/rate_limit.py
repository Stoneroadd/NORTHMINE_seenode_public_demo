from __future__ import annotations

from typing import Callable

from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

RATE_LIMITS: dict[str, str] = {
    "/api/auth/login": "5/minute",
    "/api/auth/refresh": "20/minute",
    "/api/auth/change-password": "10/minute",
    "/api/auth/mfa/setup": "10/minute",
    "/api/auth/mfa/verify": "10/minute",
    "/api/simulator/run": "5/minute",
    "/api/ai/analysis": "10/minute",
    "/api/admin/audit-log": "30/minute",
    "/api/admin/metrics": "30/minute",
}

DEFAULT_RATE_LIMIT = "60/minute"


def endpoint_limit(path: str) -> Callable[[str], str]:
    """Return a callable for slowapi that resolves the rate limit for *path*."""
    def provider(key: str = "") -> str:
        return RATE_LIMITS.get(path, DEFAULT_RATE_LIMIT)
    return provider
