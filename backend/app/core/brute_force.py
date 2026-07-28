from __future__ import annotations

from collections import OrderedDict, defaultdict
from datetime import datetime, timedelta
from threading import RLock

from app.core.config import get_settings
from app.core.distributed import get_redis_client

_failed_attempts: dict[str, list[datetime]] = defaultdict(list)
_blocked_until: dict[str, datetime] = {}
_last_seen: OrderedDict[str, datetime] = OrderedDict()
_state_lock = RLock()

# Esta proteccion sigue siendo local al proceso (el despliegue fuerza un solo
# worker hasta migrarla a Redis), pero nunca debe permitir que IPs aleatorias
# consuman memoria sin limite.
MAX_TRACKED_IPS = 10_000

_REDIS_RECORD_FAILURE = """
local attempts = KEYS[1]
local blocked = KEYS[2]
local now = tonumber(ARGV[1])
redis.call('ZREMRANGEBYSCORE', attempts, '-inf', now - 3600)
redis.call('ZADD', attempts, now, ARGV[2])
redis.call('EXPIRE', attempts, 3600)
local count = redis.call('ZCARD', attempts)
local seconds = 0
if count >= 10 then seconds = 3600 elseif count >= 5 then seconds = 300 elseif count >= 3 then seconds = 30 end
if seconds > 0 then redis.call('SET', blocked, '1', 'EX', seconds) end
return count
"""


def _redis_keys(ip: str) -> tuple[str, str]:
    # The IP is data, never a Redis command; keep it namespaced so operators
    # can expire/review this control independently from application caches.
    return f"northmine:bruteforce:attempts:{ip}", f"northmine:bruteforce:blocked:{ip}"


def _touch(ip: str, now: datetime) -> None:
    _last_seen[ip] = now
    _last_seen.move_to_end(ip)
    while len(_last_seen) > MAX_TRACKED_IPS:
        expired_ip, _ = _last_seen.popitem(last=False)
        _failed_attempts.pop(expired_ip, None)
        _blocked_until.pop(expired_ip, None)


def is_blocked(ip: str) -> tuple[bool, int]:
    """Retorna (bloqueado, segundos_restantes)."""
    client = get_redis_client()
    if client is not None:
        try:
            _, blocked_key = _redis_keys(ip)
            remaining = int(client.ttl(blocked_key))
            return (remaining > 0, max(remaining, 0))
        except Exception:
            # In production a Redis outage must not silently disable the
            # control. Startup already fails closed; this protects outages
            # occurring after startup as well.
            if get_settings().is_production:
                return True, 60
    with _state_lock:
        now = datetime.now()
        _touch(ip, now)
        if ip in _blocked_until:
            remaining = int((_blocked_until[ip] - now).total_seconds())
            if remaining > 0:
                return True, remaining
            del _blocked_until[ip]
            _failed_attempts.pop(ip, None)
        return False, 0


def record_failure(ip: str) -> None:
    client = get_redis_client()
    if client is not None:
        try:
            attempts_key, blocked_key = _redis_keys(ip)
            now = datetime.now().timestamp()
            client.eval(_REDIS_RECORD_FAILURE, 2, attempts_key, blocked_key, now, f"{now}:{id(ip)}")
            return
        except Exception:
            if get_settings().is_production:
                return
    with _state_lock:
        now = datetime.now()
        _touch(ip, now)
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
    client = get_redis_client()
    if client is not None:
        try:
            client.delete(*_redis_keys(ip))
            return
        except Exception:
            if get_settings().is_production:
                return
    with _state_lock:
        _failed_attempts.pop(ip, None)
        _blocked_until.pop(ip, None)
        _last_seen.pop(ip, None)
