from __future__ import annotations

import pytest

from app.services import data_provider


def _fake_dataset(today: str) -> dict:
    return {
        "source": "wenco-sql-live",
        "today": today,
        "plan": [],
        "cycles": [{"id": "C1", "caex_id": "CA01", "carguio_id": "PA01", "tonelaje": 100}],
    }


def _fake_fleet(dias: int) -> dict:
    return {"source": "wenco-sql-live", "dias": dias, "resumen": {"total_caex": 1}, "ranking": [], "por_modelo": []}


@pytest.fixture(autouse=True)
def _clear_provider_cache():
    data_provider._dataset_cache.clear()
    data_provider._fleet_cache.clear()
    data_provider._status_history_cache.clear()
    yield
    data_provider._dataset_cache.clear()
    data_provider._fleet_cache.clear()
    data_provider._status_history_cache.clear()


def test_get_dataset_marks_fresh_result_not_stale(monkeypatch):
    monkeypatch.setattr(data_provider, "get_wenco_dataset", lambda *a, **k: _fake_dataset("2026-07-04"))
    result = data_provider.get_dataset(dias=2)
    assert result["stale"] is False
    assert result["cycles"]


def test_get_dataset_falls_back_to_cache_when_wenco_fails(monkeypatch):
    calls = {"n": 0}

    def flaky(*args, **kwargs):
        calls["n"] += 1
        if calls["n"] == 1:
            return _fake_dataset("2026-07-04")
        raise RuntimeError("SQL Server connection lost")

    monkeypatch.setattr(data_provider, "get_wenco_dataset", flaky)

    good = data_provider.get_dataset(dias=2)
    assert good["stale"] is False

    # WENCO now caido: no debe propagar la excepcion, debe devolver el ultimo dataset valido marcado stale.
    fallback = data_provider.get_dataset(dias=2)
    assert fallback["stale"] is True
    assert fallback["cycles"] == good["cycles"]
    assert fallback["today"] == good["today"]


def test_get_dataset_raises_when_wenco_fails_with_no_prior_cache(monkeypatch):
    def always_fails(*args, **kwargs):
        raise RuntimeError("SQL Server connection lost")

    monkeypatch.setattr(data_provider, "get_wenco_dataset", always_fails)

    with pytest.raises(RuntimeError):
        data_provider.get_dataset(dias=2)


def test_get_fleet_full_falls_back_to_cache_when_wenco_fails(monkeypatch):
    calls = {"n": 0}

    def flaky(dias: int):
        calls["n"] += 1
        if calls["n"] == 1:
            return _fake_fleet(dias)
        raise RuntimeError("SQL Server connection lost")

    monkeypatch.setattr(data_provider, "get_wenco_fleet_full", flaky)

    good = data_provider.get_fleet_full(dias=7)
    assert good["stale"] is False

    fallback = data_provider.get_fleet_full(dias=7)
    assert fallback["stale"] is True
    assert fallback["resumen"] == good["resumen"]


def test_get_dataset_cache_is_keyed_by_params(monkeypatch):
    """Un fallo en una ventana nunca pedida antes no debe devolver datos de otra ventana."""
    monkeypatch.setattr(data_provider, "get_wenco_dataset", lambda *a, **k: _fake_dataset("2026-07-04"))
    data_provider.get_dataset(dias=2)

    def always_fails(*args, **kwargs):
        raise RuntimeError("SQL Server connection lost")

    monkeypatch.setattr(data_provider, "get_wenco_dataset", always_fails)
    with pytest.raises(RuntimeError):
        data_provider.get_dataset(dias=30)


def test_get_equipment_status_history_falls_back_to_cache_when_wenco_fails(monkeypatch):
    calls = {"n": 0}
    fake_rows = [{"equip_ident": "CA0001", "status_code": "M30", "category": "MANTENCION"}]

    def flaky(dias: int):
        calls["n"] += 1
        if calls["n"] == 1:
            return fake_rows
        raise RuntimeError("SQL Server connection lost")

    monkeypatch.setattr(data_provider, "_get_wenco_equipment_status_history", flaky)

    good = data_provider.get_equipment_status_history(dias=7)
    assert good == fake_rows

    fallback = data_provider.get_equipment_status_history(dias=7)
    assert fallback == fake_rows


def test_get_equipment_status_history_returns_empty_without_cache(monkeypatch):
    def always_fails(dias: int):
        raise RuntimeError("SQL Server connection lost")

    monkeypatch.setattr(data_provider, "_get_wenco_equipment_status_history", always_fails)
    assert data_provider.get_equipment_status_history(dias=7) == []
