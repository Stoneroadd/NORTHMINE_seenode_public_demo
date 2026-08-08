from __future__ import annotations

import json
import sqlite3
import threading
from datetime import datetime, timezone
from typing import Any

from app.ai.runtime.protocol import AgentEvent
from app.ai.runtime.session_manager import AgentSession
from app.core.config import get_settings

"""Persistencia del Agent Runtime (Etapa 4, seccion 25 del brief).

SQLite aceptable para demo (mismo criterio que investigation_repository.py
de Etapa 3) - un archivo propio (`agent_runtime_db_path`) para no mezclar
esquemas con el copiloto de Etapa 1 ni las investigaciones de Etapa 3.
Limite documentado para produccion: una sola conexion de proceso serializada
por lock, sin particionado ni replicacion; un despliegue real necesitaria
Postgres con indices por session_id/investigation_id y particionado de
eventos por fecha si el volumen crece.

Explicitamente NUNCA se persiste (seccion 25): audio crudo, API keys, JWT,
cookies, ni headers de autorizacion. Los eventos guardan `payload` tal cual
lo emitio el Runtime, que por diseño nunca incluye esos campos (ver
runtime.py y voice/*): el payload de audio es un audio_url efimero, no
bytes de audio.
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


def init_runtime_db() -> None:
    with _lock:
        conn = _connection()
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS agent_sessions (
                session_id  TEXT PRIMARY KEY,
                user_id     TEXT NOT NULL,
                role        TEXT NOT NULL,
                company_id  TEXT,
                site_id     TEXT,
                status      TEXT NOT NULL,
                active_investigation_id TEXT,
                created_at  TEXT NOT NULL,
                updated_at  TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS agent_events (
                event_id        TEXT PRIMARY KEY,
                session_id      TEXT NOT NULL,
                investigation_id TEXT,
                step_id         TEXT,
                correlation_id  TEXT NOT NULL,
                sequence        INTEGER NOT NULL,
                timestamp       TEXT NOT NULL,
                event_type      TEXT NOT NULL,
                payload_json    TEXT NOT NULL
            )
            """
        )
        conn.execute("CREATE INDEX IF NOT EXISTS idx_agent_events_session ON agent_events(session_id, sequence)")
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS agent_findings (
                finding_id      TEXT PRIMARY KEY,
                investigation_id TEXT NOT NULL,
                label           TEXT NOT NULL,
                summary         TEXT NOT NULL,
                severity        TEXT NOT NULL,
                evidence_ids_json TEXT NOT NULL,
                created_at      TEXT NOT NULL,
                spoken          INTEGER NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS agent_speech_playback (
                segment_id   TEXT PRIMARY KEY,
                session_id   TEXT NOT NULL,
                text_length  INTEGER NOT NULL,
                priority     TEXT NOT NULL,
                provider     TEXT NOT NULL,
                latency_ms   INTEGER,
                result       TEXT NOT NULL,
                created_at   TEXT NOT NULL
            )
            """
        )
        conn.commit()


def save_session(session: AgentSession) -> None:
    with _lock:
        conn = _connection()
        conn.execute(
            """
            INSERT INTO agent_sessions (session_id, user_id, role, company_id, site_id, status, active_investigation_id, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(session_id) DO UPDATE SET
                status = excluded.status,
                active_investigation_id = excluded.active_investigation_id,
                updated_at = excluded.updated_at
            """,
            (
                session.session_id, session.user_id, session.role, session.company_id, session.site_id,
                session.status.value if hasattr(session.status, "value") else session.status,
                session.active_investigation_id,
                session.created_at.isoformat(), session.updated_at.isoformat(),
            ),
        )
        conn.commit()


def save_event(event: AgentEvent) -> None:
    with _lock:
        conn = _connection()
        conn.execute(
            """
            INSERT OR IGNORE INTO agent_events
                (event_id, session_id, investigation_id, step_id, correlation_id, sequence, timestamp, event_type, payload_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                event.event_id, event.session_id, event.investigation_id, event.step_id, event.correlation_id,
                event.sequence, event.timestamp.isoformat(), event.event_type,
                json.dumps(event.payload, default=str),
            ),
        )
        conn.commit()


def get_events_since(session_id: str, since_sequence: int) -> list[dict[str, Any]]:
    with _lock:
        conn = _connection()
        rows = conn.execute(
            "SELECT * FROM agent_events WHERE session_id = ? AND sequence > ? ORDER BY sequence ASC",
            (session_id, since_sequence),
        ).fetchall()
        return [dict(row) for row in rows]


def save_finding(
    *, finding_id: str, investigation_id: str, label: str, summary: str, severity: str,
    evidence_ids: list[str], spoken: bool,
) -> None:
    with _lock:
        conn = _connection()
        conn.execute(
            """
            INSERT OR REPLACE INTO agent_findings
                (finding_id, investigation_id, label, summary, severity, evidence_ids_json, created_at, spoken)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                finding_id, investigation_id, label, summary, severity,
                json.dumps(evidence_ids), datetime.now(timezone.utc).isoformat(), int(spoken),
            ),
        )
        conn.commit()


def save_speech_playback(
    *, segment_id: str, session_id: str, text_length: int, priority: str, provider: str,
    latency_ms: int | None, result: str,
) -> None:
    with _lock:
        conn = _connection()
        conn.execute(
            """
            INSERT OR REPLACE INTO agent_speech_playback
                (segment_id, session_id, text_length, priority, provider, latency_ms, result, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                segment_id, session_id, text_length, priority, provider, latency_ms, result,
                datetime.now(timezone.utc).isoformat(),
            ),
        )
        conn.commit()
