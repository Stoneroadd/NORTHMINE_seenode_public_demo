from __future__ import annotations

import sqlite3
import threading
from datetime import datetime, timezone
from typing import Any

from app.ai.proactivity.models import AgentTrigger, AgentWatch, ProactiveAgentEvent
from app.core.config import get_settings

"""Persistencia de proactividad (Etapa 6). Misma base de datos que el resto
del Agent Runtime (agent_runtime_db_path) - ver memory/persistence.py para
el razonamiento completo de por que se reusa en vez de crear un archivo
nuevo."""

_conn: sqlite3.Connection | None = None
_lock = threading.Lock()


def _connection() -> sqlite3.Connection:
    global _conn
    if _conn is None:
        path = get_settings().agent_runtime_db_path
        _conn = sqlite3.connect(path, timeout=10, check_same_thread=False)
        _conn.row_factory = sqlite3.Row
    return _conn


def init_proactivity_db() -> None:
    with _lock:
        conn = _connection()
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS agent_triggers (
                trigger_id  TEXT PRIMARY KEY,
                enabled     INTEGER NOT NULL,
                created_by  TEXT NOT NULL,
                created_at  TEXT NOT NULL,
                trigger_json TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS agent_watches (
                watch_id    TEXT PRIMARY KEY,
                user_id     TEXT NOT NULL,
                company_id  TEXT,
                site_id     TEXT,
                status      TEXT NOT NULL,
                expires_at  TEXT,
                created_at  TEXT NOT NULL,
                watch_json  TEXT NOT NULL
            )
            """
        )
        conn.execute("CREATE INDEX IF NOT EXISTS idx_watches_user ON agent_watches(user_id, status)")
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS agent_proactive_events (
                proactive_event_id TEXT PRIMARY KEY,
                fingerprint TEXT,
                company_id  TEXT,
                site_id     TEXT,
                user_id     TEXT,
                status      TEXT NOT NULL,
                severity    TEXT NOT NULL,
                created_at  TEXT NOT NULL,
                event_json  TEXT NOT NULL
            )
            """
        )
        conn.execute("CREATE INDEX IF NOT EXISTS idx_proev_fingerprint ON agent_proactive_events(fingerprint, created_at)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_proev_scope ON agent_proactive_events(company_id, site_id, created_at)")
        conn.commit()


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


# ── Triggers ─────────────────────────────────────────────────────────────

def save_trigger(trigger: AgentTrigger) -> None:
    with _lock:
        conn = _connection()
        conn.execute(
            """
            INSERT INTO agent_triggers (trigger_id, enabled, created_by, created_at, trigger_json)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(trigger_id) DO UPDATE SET enabled = excluded.enabled, trigger_json = excluded.trigger_json
            """,
            (trigger.trigger_id, int(trigger.enabled), trigger.created_by, trigger.created_at, trigger.model_dump_json()),
        )
        conn.commit()


def list_triggers(*, enabled_only: bool = True) -> list[AgentTrigger]:
    query = "SELECT trigger_json FROM agent_triggers"
    params: list[Any] = []
    if enabled_only:
        query += " WHERE enabled = 1"
    with _lock:
        conn = _connection()
        rows = conn.execute(query, params).fetchall()
    return [AgentTrigger.model_validate_json(r["trigger_json"]) for r in rows]


def delete_trigger(trigger_id: str) -> None:
    with _lock:
        conn = _connection()
        conn.execute("DELETE FROM agent_triggers WHERE trigger_id = ?", (trigger_id,))
        conn.commit()


# ── Watches ──────────────────────────────────────────────────────────────

def save_watch(watch: AgentWatch) -> None:
    with _lock:
        conn = _connection()
        conn.execute(
            """
            INSERT INTO agent_watches (watch_id, user_id, company_id, site_id, status, expires_at, created_at, watch_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(watch_id) DO UPDATE SET
                status = excluded.status, watch_json = excluded.watch_json
            """,
            (
                watch.watch_id, watch.user_id, watch.company_id, watch.site_id, watch.status,
                watch.expires_at, watch.created_at, watch.model_dump_json(),
            ),
        )
        conn.commit()


def get_watch(watch_id: str) -> AgentWatch | None:
    with _lock:
        conn = _connection()
        row = conn.execute("SELECT watch_json FROM agent_watches WHERE watch_id = ?", (watch_id,)).fetchone()
    return AgentWatch.model_validate_json(row["watch_json"]) if row else None


def list_watches(*, user_id: str | None = None, status: str | None = None, limit: int = 100) -> list[AgentWatch]:
    query = "SELECT watch_json FROM agent_watches WHERE 1=1"
    params: list[Any] = []
    if user_id:
        query += " AND user_id = ?"
        params.append(user_id)
    if status:
        query += " AND status = ?"
        params.append(status)
    query += " ORDER BY created_at DESC LIMIT ?"
    params.append(limit)
    with _lock:
        conn = _connection()
        rows = conn.execute(query, params).fetchall()
    return [AgentWatch.model_validate_json(r["watch_json"]) for r in rows]


def count_active_watches(user_id: str) -> int:
    with _lock:
        conn = _connection()
        row = conn.execute(
            "SELECT COUNT(*) AS n FROM agent_watches WHERE user_id = ? AND status = 'active'", (user_id,),
        ).fetchone()
    return int(row["n"]) if row else 0


# ── Proactive events ─────────────────────────────────────────────────────

def save_proactive_event(event: ProactiveAgentEvent) -> None:
    with _lock:
        conn = _connection()
        conn.execute(
            """
            INSERT INTO agent_proactive_events
                (proactive_event_id, fingerprint, company_id, site_id, user_id, status, severity, created_at, event_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(proactive_event_id) DO UPDATE SET status = excluded.status, event_json = excluded.event_json
            """,
            (
                event.proactive_event_id, event.fingerprint, event.company_id, event.site_id, event.user_id,
                event.status, event.severity, event.created_at, event.model_dump_json(),
            ),
        )
        conn.commit()


def last_event_for_fingerprint(fingerprint: str, *, since_iso: str) -> ProactiveAgentEvent | None:
    with _lock:
        conn = _connection()
        row = conn.execute(
            "SELECT event_json FROM agent_proactive_events WHERE fingerprint = ? AND created_at >= ? ORDER BY created_at DESC LIMIT 1",
            (fingerprint, since_iso),
        ).fetchone()
    return ProactiveAgentEvent.model_validate_json(row["event_json"]) if row else None


def count_events_since(*, company_id: str | None, site_id: str | None, since_iso: str) -> int:
    with _lock:
        conn = _connection()
        row = conn.execute(
            "SELECT COUNT(*) AS n FROM agent_proactive_events WHERE company_id IS ? AND site_id IS ? AND created_at >= ?",
            (company_id, site_id, since_iso),
        ).fetchone()
    return int(row["n"]) if row else 0


def list_proactive_events(*, company_id: str | None, site_id: str | None, status: str | None = None, limit: int = 50) -> list[ProactiveAgentEvent]:
    query = "SELECT event_json FROM agent_proactive_events WHERE company_id IS ? AND site_id IS ?"
    params: list[Any] = [company_id, site_id]
    if status:
        query += " AND status = ?"
        params.append(status)
    query += " ORDER BY created_at DESC LIMIT ?"
    params.append(limit)
    with _lock:
        conn = _connection()
        rows = conn.execute(query, params).fetchall()
    return [ProactiveAgentEvent.model_validate_json(r["event_json"]) for r in rows]
