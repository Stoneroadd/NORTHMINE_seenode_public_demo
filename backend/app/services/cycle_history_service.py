from __future__ import annotations

import os
import sqlite3
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

from app.core.config import get_settings
from app.core.distributed import sync_lock
from app.services.data_provider import get_dataset as _provider_get_dataset

# Historizador de ciclos WENCO: el dataset vivo solo mira 2 dias hacia atras,
# aqui cada ciclo se persiste en SQLite para habilitar analisis de largo plazo
# (toneladas perdidas por indisponibilidad, backtesting de metas, tendencias).
# Un hilo en segundo plano sincroniza cada NORTHMINE_CICLOS_SYNC_MINUTES.

_DB_PATH = Path(os.getenv("NORTHMINE_CICLOS_DB", str(Path(__file__).resolve().parents[2] / "northmine_ciclos.db")))

_sync_state: dict[str, Any] = {"enabled": False, "interval_min": 0, "last_run": None, "last_result": None}
_auto_started = False


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(_DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS ciclos (
            id TEXT PRIMARY KEY,
            fecha TEXT,
            turno TEXT,
            hora INTEGER,
            datetime TEXT,
            caex_id TEXT,
            camion_modelo TEXT,
            carguio_id TEXT,
            pala_modelo TEXT,
            origen TEXT,
            destino TEXT,
            material TEXT,
            tonelaje INTEGER,
            payload_target REAL,
            haul_distance_km REAL,
            empty_distance_km REAL,
            operador_caex TEXT,
            imported_at TEXT
        )
        """
    )
    conn.execute("CREATE INDEX IF NOT EXISTS idx_ciclos_fecha ON ciclos(fecha)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_ciclos_caex ON ciclos(caex_id)")
    return conn


def _sync_cycles_unlocked(dias: int = 3) -> dict[str, Any]:
    """Vuelca los ciclos de la ventana pedida al historico (upsert por id)."""
    dataset = _provider_get_dataset(dias=dias)
    now = datetime.now().isoformat(timespec="seconds")
    inserted = 0
    with _connect() as conn:
        for record in dataset.get("cycles", []):
            fecha = str(record.get("shift_date") or record.get("fecha_dia") or "")[:10]
            cursor = conn.execute(
                """
                INSERT OR IGNORE INTO ciclos
                (id, fecha, turno, hora, datetime, caex_id, camion_modelo, carguio_id,
                 pala_modelo, origen, destino, material, tonelaje, payload_target,
                 haul_distance_km, empty_distance_km, operador_caex, imported_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    str(record.get("id")), fecha, record.get("turno_calc"), record.get("hora"),
                    record.get("datetime"), record.get("caex_id"), record.get("camion_modelo"),
                    record.get("carguio_id"), record.get("pala_modelo"), record.get("origen"),
                    record.get("destino"), record.get("material"), record.get("tonelaje"),
                    record.get("payload_target"), record.get("haul_distance_km"),
                    record.get("empty_distance_km"), record.get("operador_caex"), now,
                ),
            )
            inserted += cursor.rowcount
    return {"status": "ok", "ciclos_nuevos": inserted, "ventana_dias": dias, "generated_at": now}


def sync_cycles(dias: int = 3) -> dict[str, Any]:
    """Persist a cycle history window without overlapping other workers."""
    with sync_lock("cycles", ttl_seconds=900):
        return _sync_cycles_unlocked(dias=dias)


def get_history_status() -> dict[str, Any]:
    with _connect() as conn:
        total = conn.execute("SELECT COUNT(*) AS n FROM ciclos").fetchone()["n"]
        rango = conn.execute("SELECT MIN(fecha) AS desde, MAX(fecha) AS hasta FROM ciclos").fetchone()
    if total == 0 and get_settings().is_demo:
        today = datetime.now().date()
        return {
            "total_ciclos": 18426,
            "desde": (today - timedelta(days=89)).isoformat(),
            "hasta": today.isoformat(),
            "auto_sync": {**_sync_state, "synthetic": True},
        }
    return {
        "total_ciclos": total,
        "desde": rango["desde"],
        "hasta": rango["hasta"],
        "auto_sync": dict(_sync_state),
    }


def query_rows(sql: str, params: tuple[Any, ...] = ()) -> list[dict[str, Any]]:
    with _connect() as conn:
        return [dict(row) for row in conn.execute(sql, params)]


def _auto_loop(interval_seconds: float) -> None:
    import time

    while True:
        try:
            result = sync_cycles(dias=3)
            _sync_state["last_run"] = datetime.now().isoformat(timespec="seconds")
            _sync_state["last_result"] = f"{result['ciclos_nuevos']} ciclos nuevos"
        except Exception as exc:  # noqa: BLE001 - el loop no debe morir
            _sync_state["last_run"] = datetime.now().isoformat(timespec="seconds")
            _sync_state["last_result"] = f"error: {exc}"
        time.sleep(interval_seconds)


def start_auto_sync() -> None:
    global _auto_started
    if _auto_started:
        return
    interval_min = float(os.getenv("NORTHMINE_CICLOS_SYNC_MINUTES", "30"))
    if interval_min <= 0:
        return
    import threading

    thread = threading.Thread(target=_auto_loop, args=(interval_min * 60,), daemon=True, name="ciclos-history-sync")
    thread.start()
    _auto_started = True
    _sync_state["enabled"] = True
    _sync_state["interval_min"] = interval_min
