from __future__ import annotations

import sqlite3
import threading
from datetime import datetime, timezone
from typing import Any

from app.ai.work_products.models import ReportDraft, ShiftHandoverDraft, TaskDraft
from app.core.config import get_settings

"""Persistencia de work products (Etapa 6). Misma base de datos que el
resto del Agent Runtime (agent_runtime_db_path) - ver memory/persistence.py
para el razonamiento de reuso.

Versionado de informes (seccion 20/24): cada version es su propia fila,
clave (report_id, version) - nunca se sobrescribe una version existente.
'la version actual' es siempre MAX(version) para ese report_id.
"""

_conn: sqlite3.Connection | None = None
_lock = threading.Lock()


def _connection() -> sqlite3.Connection:
    global _conn
    if _conn is None:
        path = get_settings().agent_runtime_db_path
        _conn = sqlite3.connect(path, timeout=10, check_same_thread=False)
        _conn.row_factory = sqlite3.Row
    return _conn


def init_work_products_db() -> None:
    with _lock:
        conn = _connection()
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS agent_reports (
                report_id   TEXT NOT NULL,
                version     INTEGER NOT NULL,
                status      TEXT NOT NULL,
                company_id  TEXT,
                site_id     TEXT,
                generated_by TEXT NOT NULL,
                updated_at  TEXT NOT NULL,
                report_json TEXT NOT NULL,
                PRIMARY KEY (report_id, version)
            )
            """
        )
        conn.execute("CREATE INDEX IF NOT EXISTS idx_reports_scope ON agent_reports(company_id, site_id, updated_at)")
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS agent_handovers (
                handover_id  TEXT PRIMARY KEY,
                status       TEXT NOT NULL,
                company_id   TEXT,
                site_id      TEXT,
                generated_by TEXT NOT NULL,
                generated_at TEXT NOT NULL,
                handover_json TEXT NOT NULL
            )
            """
        )
        conn.execute("CREATE INDEX IF NOT EXISTS idx_handovers_scope ON agent_handovers(company_id, site_id, generated_at)")
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS agent_tasks (
                task_id     TEXT PRIMARY KEY,
                status      TEXT NOT NULL,
                company_id  TEXT,
                site_id     TEXT,
                created_by  TEXT NOT NULL,
                created_at  TEXT NOT NULL,
                task_json   TEXT NOT NULL
            )
            """
        )
        conn.execute("CREATE INDEX IF NOT EXISTS idx_tasks_scope ON agent_tasks(company_id, site_id, status)")
        conn.commit()


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


# ── Reports ──────────────────────────────────────────────────────────────

def save_report_version(report: ReportDraft) -> None:
    with _lock:
        conn = _connection()
        conn.execute(
            """
            INSERT INTO agent_reports (report_id, version, status, company_id, site_id, generated_by, updated_at, report_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(report_id, version) DO UPDATE SET
                status = excluded.status, updated_at = excluded.updated_at, report_json = excluded.report_json
            """,
            (
                report.report_id, report.version, report.status, report.company_id, report.site_id,
                report.generated_by, report.updated_at, report.model_dump_json(),
            ),
        )
        conn.commit()


def get_report_version(report_id: str, version: int) -> ReportDraft | None:
    with _lock:
        conn = _connection()
        row = conn.execute(
            "SELECT report_json FROM agent_reports WHERE report_id = ? AND version = ?", (report_id, version),
        ).fetchone()
    return ReportDraft.model_validate_json(row["report_json"]) if row else None


def get_latest_report(report_id: str) -> ReportDraft | None:
    with _lock:
        conn = _connection()
        row = conn.execute(
            "SELECT report_json FROM agent_reports WHERE report_id = ? ORDER BY version DESC LIMIT 1", (report_id,),
        ).fetchone()
    return ReportDraft.model_validate_json(row["report_json"]) if row else None


def list_report_versions(report_id: str) -> list[ReportDraft]:
    with _lock:
        conn = _connection()
        rows = conn.execute(
            "SELECT report_json FROM agent_reports WHERE report_id = ? ORDER BY version ASC", (report_id,),
        ).fetchall()
    return [ReportDraft.model_validate_json(r["report_json"]) for r in rows]


def list_latest_reports(*, company_id: str | None, site_id: str | None, status: str | None = None, limit: int = 20) -> list[ReportDraft]:
    query = """
        SELECT report_json FROM agent_reports r
        WHERE company_id IS ? AND site_id IS ?
        AND version = (SELECT MAX(version) FROM agent_reports WHERE report_id = r.report_id)
    """
    params: list[Any] = [company_id, site_id]
    if status:
        query += " AND status = ?"
        params.append(status)
    query += " ORDER BY updated_at DESC LIMIT ?"
    params.append(limit)
    with _lock:
        conn = _connection()
        rows = conn.execute(query, params).fetchall()
    return [ReportDraft.model_validate_json(r["report_json"]) for r in rows]


# ── Handovers ────────────────────────────────────────────────────────────

def save_handover(handover: ShiftHandoverDraft) -> None:
    with _lock:
        conn = _connection()
        conn.execute(
            """
            INSERT INTO agent_handovers (handover_id, status, company_id, site_id, generated_by, generated_at, handover_json)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(handover_id) DO UPDATE SET status = excluded.status, handover_json = excluded.handover_json
            """,
            (
                handover.handover_id, handover.status, handover.company_id, handover.site_id,
                handover.generated_by, handover.generated_at, handover.model_dump_json(),
            ),
        )
        conn.commit()


def get_handover(handover_id: str) -> ShiftHandoverDraft | None:
    with _lock:
        conn = _connection()
        row = conn.execute("SELECT handover_json FROM agent_handovers WHERE handover_id = ?", (handover_id,)).fetchone()
    return ShiftHandoverDraft.model_validate_json(row["handover_json"]) if row else None


def list_handovers(*, company_id: str | None, site_id: str | None, limit: int = 20) -> list[ShiftHandoverDraft]:
    with _lock:
        conn = _connection()
        rows = conn.execute(
            "SELECT handover_json FROM agent_handovers WHERE company_id IS ? AND site_id IS ? ORDER BY generated_at DESC LIMIT ?",
            (company_id, site_id, limit),
        ).fetchall()
    return [ShiftHandoverDraft.model_validate_json(r["handover_json"]) for r in rows]


# ── Tasks ────────────────────────────────────────────────────────────────

def save_task(task: TaskDraft) -> None:
    with _lock:
        conn = _connection()
        conn.execute(
            """
            INSERT INTO agent_tasks (task_id, status, company_id, site_id, created_by, created_at, task_json)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(task_id) DO UPDATE SET status = excluded.status, task_json = excluded.task_json
            """,
            (task.task_id, task.status, task.company_id, task.site_id, task.created_by, task.created_at, task.model_dump_json()),
        )
        conn.commit()


def get_task(task_id: str) -> TaskDraft | None:
    with _lock:
        conn = _connection()
        row = conn.execute("SELECT task_json FROM agent_tasks WHERE task_id = ?", (task_id,)).fetchone()
    return TaskDraft.model_validate_json(row["task_json"]) if row else None


def list_tasks(*, company_id: str | None, site_id: str | None, status: str | None = None, limit: int = 50) -> list[TaskDraft]:
    query = "SELECT task_json FROM agent_tasks WHERE company_id IS ? AND site_id IS ?"
    params: list[Any] = [company_id, site_id]
    if status:
        query += " AND status = ?"
        params.append(status)
    query += " ORDER BY created_at DESC LIMIT ?"
    params.append(limit)
    with _lock:
        conn = _connection()
        rows = conn.execute(query, params).fetchall()
    return [TaskDraft.model_validate_json(r["task_json"]) for r in rows]
