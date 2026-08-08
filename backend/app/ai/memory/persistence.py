from __future__ import annotations

import sqlite3
import threading
from datetime import datetime, timezone
from typing import Any

from app.ai.memory.models import OperationalEpisode, WorkingMemoryEntity
from app.core.config import get_settings

"""Persistencia de memoria (Etapa 6, seccion 2 del brief: 'no dupliques
persistencia que ya exista'). Reusa el mismo archivo sqlite del Agent
Runtime (agent_runtime_db_path) - no se crea una base de datos nueva, solo
tablas nuevas dentro de la existente. Misma conexion-propia-por-modulo +
lock que el resto del proyecto (ver runtime/persistence.py,
investigation_repository.py): cada modulo abre su propia conexion sqlite3
hacia el mismo archivo, serializada con su propio lock.
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


def init_memory_db() -> None:
    with _lock:
        conn = _connection()
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS agent_working_memory (
                entity_id   TEXT PRIMARY KEY,
                company_id  TEXT,
                site_id     TEXT,
                status      TEXT NOT NULL,
                updated_at  TEXT NOT NULL,
                entity_json TEXT NOT NULL
            )
            """
        )
        conn.execute("CREATE INDEX IF NOT EXISTS idx_wm_scope ON agent_working_memory(company_id, site_id, status)")
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS agent_episodes (
                episode_id   TEXT PRIMARY KEY,
                episode_type TEXT NOT NULL,
                company_id   TEXT,
                site_id      TEXT,
                created_by   TEXT NOT NULL,
                started_at   TEXT NOT NULL,
                ended_at     TEXT,
                episode_json TEXT NOT NULL
            )
            """
        )
        conn.execute("CREATE INDEX IF NOT EXISTS idx_episodes_scope ON agent_episodes(company_id, site_id, episode_type)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_episodes_started ON agent_episodes(started_at)")
        conn.commit()


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


# ── Working memory ─────────────────────────────────────────────────────────

def upsert_working_memory_entity(entity: WorkingMemoryEntity) -> None:
    with _lock:
        conn = _connection()
        conn.execute(
            """
            INSERT INTO agent_working_memory (entity_id, company_id, site_id, status, updated_at, entity_json)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(entity_id) DO UPDATE SET
                status = excluded.status,
                updated_at = excluded.updated_at,
                entity_json = excluded.entity_json
            """,
            (entity.entity_id, entity.company_id, entity.site_id, entity.status, _now(), entity.model_dump_json()),
        )
        conn.commit()


def get_working_memory_entity(entity_id: str) -> WorkingMemoryEntity | None:
    with _lock:
        conn = _connection()
        row = conn.execute("SELECT entity_json FROM agent_working_memory WHERE entity_id = ?", (entity_id,)).fetchone()
    if not row:
        return None
    return WorkingMemoryEntity.model_validate_json(row["entity_json"])


def list_working_memory_entities(
    *, company_id: str | None, site_id: str | None, status: str | None = None, limit: int = 200,
) -> list[WorkingMemoryEntity]:
    """Aislamiento (seccion 37): SIEMPRE filtra por company_id/site_id -
    nunca se expone memoria de otra faena, aunque el demo actual sea
    single-tenant."""
    query = "SELECT entity_json FROM agent_working_memory WHERE company_id IS ? AND site_id IS ?"
    params: list[Any] = [company_id, site_id]
    if status:
        query += " AND status = ?"
        params.append(status)
    query += " ORDER BY updated_at DESC LIMIT ?"
    params.append(limit)
    with _lock:
        conn = _connection()
        rows = conn.execute(query, params).fetchall()
    return [WorkingMemoryEntity.model_validate_json(r["entity_json"]) for r in rows]


def delete_working_memory_entity(entity_id: str) -> None:
    with _lock:
        conn = _connection()
        conn.execute("DELETE FROM agent_working_memory WHERE entity_id = ?", (entity_id,))
        conn.commit()


def purge_working_memory_older_than(cutoff_iso: str) -> int:
    with _lock:
        conn = _connection()
        cur = conn.execute("DELETE FROM agent_working_memory WHERE updated_at < ?", (cutoff_iso,))
        conn.commit()
        return cur.rowcount


# ── Episodic memory ─────────────────────────────────────────────────────────

def save_episode(episode: OperationalEpisode) -> None:
    with _lock:
        conn = _connection()
        conn.execute(
            """
            INSERT INTO agent_episodes (episode_id, episode_type, company_id, site_id, created_by, started_at, ended_at, episode_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(episode_id) DO UPDATE SET
                ended_at = excluded.ended_at,
                episode_json = excluded.episode_json
            """,
            (
                episode.episode_id, episode.episode_type, episode.company_id, episode.site_id, episode.created_by,
                episode.started_at, episode.ended_at, episode.model_dump_json(),
            ),
        )
        conn.commit()


def get_episode(episode_id: str) -> OperationalEpisode | None:
    with _lock:
        conn = _connection()
        row = conn.execute("SELECT episode_json FROM agent_episodes WHERE episode_id = ?", (episode_id,)).fetchone()
    if not row:
        return None
    return OperationalEpisode.model_validate_json(row["episode_json"])


def list_episodes(
    *, company_id: str | None, site_id: str | None, episode_type: str | None = None,
    entity_id: str | None = None, since_iso: str | None = None, limit: int = 20,
) -> list[OperationalEpisode]:
    """Aislamiento (seccion 37): filtra siempre por company_id/site_id.
    `entity_id` se filtra en Python (no vale la pena un indice JSON1 para
    el volumen de este demo - ver seccion 38: sin infraestructura vectorial
    innecesaria, lo mismo aplica a indices complejos que no hacen falta)."""
    query = "SELECT episode_json FROM agent_episodes WHERE company_id IS ? AND site_id IS ?"
    params: list[Any] = [company_id, site_id]
    if episode_type:
        query += " AND episode_type = ?"
        params.append(episode_type)
    if since_iso:
        query += " AND started_at >= ?"
        params.append(since_iso)
    query += " ORDER BY started_at DESC LIMIT ?"
    params.append(max(limit * 4, limit) if entity_id else limit)
    with _lock:
        conn = _connection()
        rows = conn.execute(query, params).fetchall()
    episodes = [OperationalEpisode.model_validate_json(r["episode_json"]) for r in rows]
    if entity_id:
        episodes = [e for e in episodes if entity_id in e.entity_ids][:limit]
    return episodes


def purge_episodes_older_than(cutoff_iso: str) -> int:
    with _lock:
        conn = _connection()
        cur = conn.execute("DELETE FROM agent_episodes WHERE started_at < ? AND ended_at IS NOT NULL", (cutoff_iso,))
        conn.commit()
        return cur.rowcount
