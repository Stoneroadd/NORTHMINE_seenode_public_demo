from __future__ import annotations

import time

from fastapi.testclient import TestClient

from app.core.audit import _cleanup_pool
from app.core.cache import get_cache_stats, invalidate_cache
from app.main import app

client = TestClient(app)


def _auth_header() -> dict[str, str]:
    resp = client.post("/api/auth/login", json={
        "username": "admin", "password": "Northmine-Demo#2026",
    })
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


# ── Response time tests ──────────────────────────────────────────────────────

def test_dashboard_endpoint_speed() -> None:
    resp = client.get("/api/demo/summary", headers=_auth_header())
    assert resp.status_code == 200
    elapsed = resp.elapsed.total_seconds()
    assert elapsed < 2.0, f"Dashboard response too slow: {elapsed:.2f}s"


def test_fleet_endpoint_speed() -> None:
    resp = client.get("/api/fleet/status", headers=_auth_header())
    assert resp.status_code == 200
    elapsed = resp.elapsed.total_seconds()
    assert elapsed < 2.0, f"Fleet response too slow: {elapsed:.2f}s"


def test_production_shift_endpoint_speed() -> None:
    resp = client.get("/api/production/shift", headers=_auth_header())
    assert resp.status_code == 200
    elapsed = resp.elapsed.total_seconds()
    assert elapsed < 2.0, f"Production shift response too slow: {elapsed:.2f}s"


def test_alerts_endpoint_speed() -> None:
    resp = client.get("/api/alerts", headers=_auth_header())
    assert resp.status_code == 200
    elapsed = resp.elapsed.total_seconds()
    assert elapsed < 2.0, f"Alerts response too slow: {elapsed:.2f}s"


# ── Cache acceleration tests ────────────────────────────────────────────────

def test_cache_speeds_up_repeated_calls() -> None:
    invalidate_cache()
    headers = _auth_header()

    t0 = time.perf_counter()
    client.get("/api/demo/summary", headers=headers)
    first_elapsed = time.perf_counter() - t0

    t0 = time.perf_counter()
    client.get("/api/demo/summary", headers=headers)
    second_elapsed = time.perf_counter() - t0

    assert second_elapsed < first_elapsed * 0.5, (
        f"Cached call ({second_elapsed:.4f}s) not significantly faster "
        f"than uncached ({first_elapsed:.4f}s)"
    )


def test_cache_stats_track_hits_and_misses() -> None:
    invalidate_cache()
    headers = _auth_header()

    client.get("/api/demo/summary", headers=headers)
    stats_after_miss = get_cache_stats()
    assert stats_after_miss["misses"] >= 1

    client.get("/api/demo/summary", headers=headers)
    stats_after_hit = get_cache_stats()
    assert stats_after_hit["hits"] >= 1


# ── Concurrent audit logging ─────────────────────────────────────────────────

def test_concurrent_audit_writes() -> None:
    _cleanup_pool()
    headers = _auth_header()
    n = 20
    responses: list = []
    for i in range(n):
        resp = client.get("/api/alerts", headers=headers)
        responses.append(resp)
    assert all(r.status_code == 200 for r in responses), (
        "Not all concurrent audit writes succeeded"
    )
    _cleanup_pool()
