from __future__ import annotations

import sqlite3
import threading
from datetime import datetime, timezone
from typing import Any

from app.ai.investigation_schemas import InvestigationResult
from app.core.config import get_settings

"""Persistencia de investigaciones (Etapa 3, seccion 20 del brief).

Mismo patron sqlite que repository.py (Etapa 1): una conexion por proceso,
sin ORM. Guarda el InvestigationResult COMPLETO como JSON (plan/evidencia/
verificacion/hipotesis/conclusion) en vez de normalizar en varias tablas -
suficiente para demo, documentado explicitamente que un despliegue real
necesitaria un modelo relacional propio con indices por tipo/usuario/fecha
si el volumen de investigaciones crece. No se persiste audio crudo (no
aplica aca, esto es texto/JSON).

A diferencia de repository.py, aca los endpoints SI reciben trafico
concurrente real (el frontend reporta varios pasos ui_action seguidos sin
esperar cada respuesta - ver investigation_router.py). sqlite3 no admite
llamadas concurrentes sobre una misma conexion desde threads distintos
(FastAPI ejecuta los handlers sync en un threadpool), asi que se serializa
el acceso con un lock - visto en pruebas manuales: sin el lock, dos reportes
casi simultaneos producian `sqlite3.InterfaceError: bad parameter or other
API misuse`.
"""

_conn: sqlite3.Connection | None = None
_lock = threading.Lock()


def _connection() -> sqlite3.Connection:
    global _conn
    if _conn is None:
        path = get_settings().ai_copilot_db_path
        _conn = sqlite3.connect(path, timeout=10, check_same_thread=False)
        _conn.row_factory = sqlite3.Row
    return _conn


def init_investigation_db() -> None:
    with _lock:
        conn = _connection()
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS ai_investigations (
                id          TEXT PRIMARY KEY,
                type        TEXT NOT NULL,
                status      TEXT NOT NULL,
                created_by  TEXT,
                role        TEXT,
                created_at  TEXT NOT NULL,
                updated_at  TEXT NOT NULL,
                result_json TEXT NOT NULL
            )
            """
        )
        conn.execute("CREATE INDEX IF NOT EXISTS idx_ai_investigations_type ON ai_investigations(type)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_ai_investigations_created_by ON ai_investigations(created_by)")
        conn.commit()


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def save_investigation(result: InvestigationResult, *, created_by: str, role: str) -> None:
    now = _now()
    payload = result.model_dump_json()
    with _lock:
        conn = _connection()
        conn.execute(
            """
            INSERT INTO ai_investigations (id, type, status, created_by, role, created_at, updated_at, result_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                status = excluded.status,
                updated_at = excluded.updated_at,
                result_json = excluded.result_json
            """,
            (
                result.plan.investigation_id,
                result.plan.type.value,
                result.plan.status,
                created_by,
                role,
                now,
                now,
                payload,
            ),
        )
        conn.commit()


def get_investigation(investigation_id: str) -> dict[str, Any] | None:
    with _lock:
        conn = _connection()
        row = conn.execute("SELECT * FROM ai_investigations WHERE id = ?", (investigation_id,)).fetchone()
        if not row:
            return None
        return dict(row)


def list_investigations(created_by: str | None = None, limit: int = 20) -> list[dict[str, Any]]:
    with _lock:
        conn = _connection()
        if created_by:
            rows = conn.execute(
                "SELECT id, type, status, created_by, created_at, updated_at FROM ai_investigations WHERE created_by = ? ORDER BY created_at DESC LIMIT ?",
                (created_by, limit),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT id, type, status, created_by, created_at, updated_at FROM ai_investigations ORDER BY created_at DESC LIMIT ?",
                (limit,),
            ).fetchall()
    return [dict(row) for row in rows]
