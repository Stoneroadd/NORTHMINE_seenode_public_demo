from __future__ import annotations

import logging
from datetime import datetime, timedelta
from functools import wraps
from typing import Any

logger = logging.getLogger(__name__)

_cache: dict[str, tuple[Any, datetime]] = {}
_stats: dict[str, int] = {"hits": 0, "misses": 0}
DEFAULT_TTL_SECONDS = 30


def cached(ttl_seconds: int = DEFAULT_TTL_SECONDS):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            key = f"{func.__module__}.{func.__name__}:{args}:{kwargs}"
            if key in _cache:
                value, expires_at = _cache[key]
                if datetime.now() < expires_at:
                    _stats["hits"] += 1
                    return value
            _stats["misses"] += 1
            result = func(*args, **kwargs)
            _cache[key] = (result, datetime.now() + timedelta(seconds=ttl_seconds))
            return result
        return wrapper
    return decorator


def invalidate_cache(pattern: str | None = None) -> None:
    global _cache, _stats
    if pattern:
        keys_to_delete = [k for k in _cache if pattern in k]
        for k in keys_to_delete:
            del _cache[k]
    else:
        _cache.clear()
    _stats = {"hits": 0, "misses": 0}


def get_cache_stats() -> dict:
    return {"size": len(_cache), "keys": list(_cache.keys()), **_stats}
