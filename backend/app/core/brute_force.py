from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timedelta

_failed_attempts: dict[str, list[datetime]] = defaultdict(list)
_blocked_until: dict[str, datetime] = {}


def is_blocked(ip: str) -> tuple[bool, int]:
    """Retorna (bloqueado, segundos_restantes)."""
    if ip in _blocked_until:
        remaining = int((_blocked_until[ip] - datetime.now()).total_seconds())
        if remaining > 0:
            return True, remaining
        del _blocked_until[ip]
        _failed_attempts[ip] = []
    return False, 0


def record_failure(ip: str) -> None:
    now = datetime.now()
    _failed_attempts[ip] = [t for t in _failed_attempts[ip] if now - t < timedelta(hours=1)]
    _failed_attempts[ip].append(now)

    n = len(_failed_attempts[ip])
    if n >= 10:
        _blocked_until[ip] = now + timedelta(hours=1)
    elif n >= 5:
        _blocked_until[ip] = now + timedelta(minutes=5)
    elif n >= 3:
        _blocked_until[ip] = now + timedelta(seconds=30)


def record_success(ip: str) -> None:
    _failed_attempts[ip] = []
    _blocked_until.pop(ip, None)
