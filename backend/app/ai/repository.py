from __future__ import annotations

import json
import sqlite3
import uuid
from datetime import datetime, timezone
from typing import Any

from app.core.config import get_settings

"""Persistencia sqlite de borradores del Copilot (tareas/informes) y feedback.

Mismo patron que app/services/cycle_history_service.py y
app/services/user_repository.py: sqlite3 crudo, una conexion por proceso,
sin ORM. Vive en su propio archivo (NORTHMINE_AI_COPILOT_DB) para no
mezclarse con northmine_audit.db ni northmine_users.db.
"""

_conn: sqlite3.Connection | None = None


def _connection() -> sqlite3.Connection:
    global _conn
    if _conn is None:
        path = get_settings().ai_copilot_db_path
        _conn = sqlite3.connect(path, timeout=10, check_same_thread=False)
        _conn.row_factory = sqlite3.Row
    return _conn


def init_ai_copilot_db() -> None:
    conn = _connection()
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS ai_task_drafts (
            id              TEXT PRIMARY KEY,
            conversation_id TEXT,
            title           TEXT NOT NULL,
            reason          TEXT NOT NULL,
            evidence        TEXT,
            priority        TEXT DEFAULT 'media',
            suggested_owner TEXT,
            status          TEXT DEFAULT 'draft',
            linked_finding  TEXT,
            created_by      TEXT,
            created_at      TEXT NOT NULL,
            updated_at      TEXT NOT NULL,
            approved_by     TEXT,
            approved_at     TEXT
        )
        """
    )
    conn.execute("CREATE INDEX IF NOT EXISTS idx_ai_task_status ON ai_task_drafts(status)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_ai_task_created_by ON ai_task_drafts(created_by)")
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS ai_report_drafts (
            id              TEXT PRIMARY KEY,
            conversation_id TEXT,
            kind            TEXT NOT NULL,
            title           TEXT NOT NULL,
            sections        TEXT NOT NULL,
            status          TEXT DEFAULT 'draft',
            created_by      TEXT,
            created_at      TEXT NOT NULL,
            updated_at      TEXT NOT NULL
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS ai_feedback (
            id          TEXT PRIMARY KEY,
            message_id  TEXT NOT NULL,
            rating      TEXT NOT NULL,
            note        TEXT,
            created_by  TEXT,
            created_at  TEXT NOT NULL,
            context     TEXT
        )
        """
    )
    conn.commit()


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def create_task_draft(
    *,
    conversation_id: str | None,
    title: str,
    reason: str,
    evidence: list[str],
    priority: str,
    suggested_owner: str | None,
    linked_finding: str | None,
    created_by: str,
) -> dict[str, Any]:
    conn = _connection()
    task_id = f"task-{uuid.uuid4().hex[:12]}"
    now = _now()
    conn.execute(
        """
        INSERT INTO ai_task_drafts
        (id, conversation_id, title, reason, evidence, priority, suggested_owner,
         status, linked_finding, created_by, created_at, updated_at)
        VALUES (?,?,?,?,?,?,?, 'draft', ?, ?, ?, ?)
        """,
        (
            task_id,
            conversation_id,
            title[:200],
            reason[:1000],
            json.dumps(evidence[:10]),
            priority if priority in {"baja", "media", "alta"} else "media",
            (suggested_owner or "")[:100] or None,
            (linked_finding or "")[:100] or None,
            created_by,
            now,
            now,
        ),
    )
    conn.commit()
    return get_task_draft(task_id)  # type: ignore[return-value]


def get_task_draft(task_id: str) -> dict[str, Any] | None:
    conn = _connection()
    row = conn.execute("SELECT * FROM ai_task_drafts WHERE id = ?", (task_id,)).fetchone()
    return _row_to_task(row) if row else None


def get_task_draft_for_owner(task_id: str, created_by: str) -> dict[str, Any] | None:
    conn = _connection()
    row = conn.execute(
        "SELECT * FROM ai_task_drafts WHERE id = ? AND created_by = ?",
        (task_id, created_by),
    ).fetchone()
    return _row_to_task(row) if row else None


def list_task_drafts(status: str | None = None, limit: int = 50, created_by: str | None = None) -> list[dict[str, Any]]:
    conn = _connection()
    if status and created_by:
        rows = conn.execute(
            "SELECT * FROM ai_task_drafts WHERE status = ? AND created_by = ? ORDER BY created_at DESC LIMIT ?",
            (status, created_by, limit),
        ).fetchall()
    elif status:
        rows = conn.execute(
            "SELECT * FROM ai_task_drafts WHERE status = ? ORDER BY created_at DESC LIMIT ?",
            (status, limit),
        ).fetchall()
    elif created_by:
        rows = conn.execute(
            "SELECT * FROM ai_task_drafts WHERE created_by = ? ORDER BY created_at DESC LIMIT ?",
            (created_by, limit),
        ).fetchall()
    else:
        rows = conn.execute(
            "SELECT * FROM ai_task_drafts ORDER BY created_at DESC LIMIT ?", (limit,)
        ).fetchall()
    return [_row_to_task(row) for row in rows]


_ALLOWED_TRANSITIONS: dict[str, set[str]] = {
    "draft": {"approved", "rejected"},
    "approved": {"completed"},
    "pending_approval": {"approved", "rejected"},
    "rejected": set(),
    "completed": set(),
}


def update_task_status(task_id: str, new_status: str, actor: str, *, created_by: str | None = None) -> dict[str, Any] | None:
    current = get_task_draft_for_owner(task_id, created_by) if created_by else get_task_draft(task_id)
    if not current:
        return None
    if new_status not in _ALLOWED_TRANSITIONS.get(current["status"], set()):
        raise ValueError(f"Transicion invalida: {current['status']} -> {new_status}")
    conn = _connection()
    now = _now()
    if new_status == "approved":
        conn.execute(
            "UPDATE ai_task_drafts SET status = ?, updated_at = ?, approved_by = ?, approved_at = ? WHERE id = ? AND (? IS NULL OR created_by = ?)",
            (new_status, now, actor, now, task_id, created_by, created_by),
        )
    else:
        conn.execute(
            "UPDATE ai_task_drafts SET status = ?, updated_at = ? WHERE id = ? AND (? IS NULL OR created_by = ?)",
            (new_status, now, task_id, created_by, created_by),
        )
    conn.commit()
    return get_task_draft_for_owner(task_id, created_by) if created_by else get_task_draft(task_id)


def _row_to_task(row: sqlite3.Row) -> dict[str, Any]:
    data = dict(row)
    try:
        data["evidence"] = json.loads(data.get("evidence") or "[]")
    except json.JSONDecodeError:
        data["evidence"] = []
    return data


def save_feedback(*, message_id: str, rating: str, note: str | None, created_by: str, context: dict[str, Any]) -> None:
    conn = _connection()
    conn.execute(
        "INSERT INTO ai_feedback (id, message_id, rating, note, created_by, created_at, context) VALUES (?,?,?,?,?,?,?)",
        (
            f"fb-{uuid.uuid4().hex[:12]}",
            message_id[:64],
            rating,
            (note or "")[:500] or None,
            created_by,
            _now(),
            json.dumps(context)[:2000],
        ),
    )
    conn.commit()
