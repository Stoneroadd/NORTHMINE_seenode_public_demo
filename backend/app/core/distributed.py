from __future__ import annotations

import secrets
import threading
from contextlib import contextmanager
from functools import lru_cache
from typing import Iterator

from app.core.config import get_settings


class SyncAlreadyRunning(RuntimeError):
    """Raised when another API process already owns a synchronization."""


@lru_cache(maxsize=1)
def get_redis_client():
    """Return the shared Redis client, or None only for local/demo profiles."""
    settings = get_settings()
    if not settings.redis_url:
        return None
    import redis

    return redis.Redis.from_url(settings.redis_url, decode_responses=True, socket_connect_timeout=2, socket_timeout=2)


def verify_shared_services() -> None:
    """Fail production startup instead of silently falling back to memory."""
    settings = get_settings()
    if not settings.is_production:
        return
    client = get_redis_client()
    if client is None:
        raise RuntimeError("NORTHMINE_REDIS_URL is required in production")
    try:
        client.ping()
    except Exception as exc:
        raise RuntimeError("Redis is unavailable; refusing unsafe multi-process security controls") from exc


_local_locks: dict[str, threading.Lock] = {}
_local_locks_guard = threading.Lock()


@contextmanager
def sync_lock(name: str, *, ttl_seconds: int = 900) -> Iterator[None]:
    """Take a cross-process Redis lock, with a local demo fallback."""
    client = get_redis_client()
    if client is None:
        with _local_locks_guard:
            lock = _local_locks.setdefault(name, threading.Lock())
        if not lock.acquire(blocking=False):
            raise SyncAlreadyRunning(name)
        try:
            yield
        finally:
            lock.release()
        return

    key = f"northmine:sync:{name}"
    token = secrets.token_urlsafe(24)
    try:
        acquired = client.set(key, token, nx=True, ex=ttl_seconds)
    except Exception as exc:
        if get_settings().is_production:
            raise RuntimeError("Redis unavailable while acquiring synchronization lock") from exc
        raise SyncAlreadyRunning(name) from exc
    if not acquired:
        raise SyncAlreadyRunning(name)
    try:
        yield
    finally:
        # Delete only our own lock: a long-running task must never delete a
        # lock that was reacquired after its TTL expired.
        try:
            client.eval(
                "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) end return 0",
                1,
                key,
                token,
            )
        except Exception:
            pass
