from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
import uuid

import pytest

from app.api import routes as routes_module
from app.core.audit import log_event
from app.core.cache import cached, get_cache_stats, invalidate_cache
from app.services import kpis as kpis_module


def _cycle(caex_id: str, loader_id: str, hour: int, tons: int) -> dict:
    return {
        "id": f"{caex_id}-{loader_id}-{hour}",
        "datetime": f"2026-08-21T{hour:02d}:10:00",
        "fecha_dia": "2026-08-21",
        "turno_calc": "DIA",
        "hora": hour,
        "caex_id": caex_id,
        "carguio_id": loader_id,
        "tonelaje": tons,
        "destino": "CHANCADO",
        "origen": "F01",
        "fase": "F01",
        "camion_modelo": "CAT793F",
        "pala_modelo": "EX5600",
        "tiempo_vacio_min": 13.0,
        "tiempo_cargado_min": 19.0,
        "distancia_cargado_km": 4.2,
        "distancia_vacio_km": 4.0,
    }


def _auth_header() -> dict[str, str]:
    resp = client.post("/api/auth/login", json={
        "username": "admin", "password": "Northmine-Demo#2026",
    })
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def operational_api(client, login_as_admin, monkeypatch):
    dataset = {
        "source": "northmine-test-synthetic",
        "data_source": "SYNTHETIC",
        "today": "2026-08-21",
        "plan": [{"date": "2026-08-21", "plan_tons": 5000}],
        "cycles": [
            _cycle("CAEX-01", "PH01", 7, 320),
            _cycle("CAEX-02", "PH01", 8, 330),
            _cycle("CAEX-03", "PH02", 9, 310),
            _cycle("CAEX-01", "PH02", 10, 325),
        ],
        "loader_status_durations": [],
        "stale": False,
    }
    monkeypatch.setattr(routes_module, "provider_get_dataset", lambda fecha=None, dias=2: dataset)
    monkeypatch.setattr(kpis_module, "_provider_get_equipment_status", lambda: {})
    routes_module._cached_filtered_dataset.cache_clear()
    invalidate_cache()
    yield client, {"Authorization": f"Bearer {login_as_admin['access_token']}"}
    routes_module._cached_filtered_dataset.cache_clear()
    invalidate_cache()


@pytest.mark.parametrize("path", ["/api/summary", "/api/fleet/status", "/api/production/shift", "/api/alerts"])
def test_operational_endpoint_budget(operational_api, path: str) -> None:
    client, headers = operational_api
    response = client.get(path, headers=headers)
    assert response.status_code == 200, response.text
    assert response.elapsed.total_seconds() < 2.0


def test_cache_avoids_recomputing_same_input() -> None:
    invalidate_cache()
    calls = 0

    @cached(ttl_seconds=30)
    def calculate(value: int) -> int:
        nonlocal calls
        calls += 1
        return value * 2

    assert calculate(21) == 42
    assert calculate(21) == 42
    assert calls == 1


def test_cache_stats_track_one_miss_then_one_hit() -> None:
    invalidate_cache()

    @cached(ttl_seconds=30)
    def calculate(value: int) -> int:
        return value

    calculate(7)
    calculate(7)
    stats = get_cache_stats()
    assert stats["misses"] == 1
    assert stats["hits"] == 1


def test_concurrent_audit_writes(client, login_as_admin) -> None:
    action = f"phase02-concurrent-{uuid.uuid4().hex}"

    def write(index: int) -> None:
        log_event(usuario="phase02", ip="127.0.0.1", accion=action, resultado="ok", detalle={"index": index})

    with ThreadPoolExecutor(max_workers=8) as executor:
        list(executor.map(write, range(20)))

    response = client.get(
        "/api/admin/audit-log?limit=100",
        headers={"Authorization": f"Bearer {login_as_admin['access_token']}"},
    )
    assert response.status_code == 200
    assert sum(1 for item in response.json()["items"] if item["accion"] == action) == 20
