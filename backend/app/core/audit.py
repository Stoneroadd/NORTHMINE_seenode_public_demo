from __future__ import annotations

import json
import logging
import os
import sqlite3
import threading
from datetime import datetime, timezone
from pathlib import Path

from app.core.config import get_settings
from app.core.database import close_db_connections

logger = logging.getLogger(__name__)
audit_logger = logging.getLogger("northmine.audit")
AUDIT_DB = Path(os.environ.get("NORTHMINE_AUDIT_DB", "northmine_audit.db"))
_connections = threading.local()

LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO")


def _protected_network_identity(ip: str) -> str:
    settings = get_settings()
    if settings.is_demo or settings.demo_mode or settings.mode == "demo" or settings.data_mode == "DEMO":
        return "PROTEGIDA"
    return ip


class AuditStoreUnavailable(RuntimeError):
    """Security state cannot be read or written safely."""


def _conn() -> sqlite3.Connection:
    if not hasattr(_connections, "connection"):
        _connections.connection = sqlite3.connect(str(AUDIT_DB), timeout=10)
        _connections.connection.row_factory = sqlite3.Row
    return _connections.connection


def _cleanup_pool() -> None:
    close_db_connections()
    connection = getattr(_connections, "connection", None)
    if connection is not None:
        connection.close()
        del _connections.connection


def init_audit_db() -> None:
    conn = _conn()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS audit_log (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp   TEXT NOT NULL,
            usuario     TEXT,
            ip          TEXT,
            accion      TEXT,
            resultado   TEXT,
            metodo      TEXT,
            endpoint    TEXT,
            status_code INTEGER,
            user_agent  TEXT,
            duracion_ms INTEGER,
            detalle     TEXT
        )
    """)
    conn.execute("CREATE INDEX IF NOT EXISTS idx_usuario   ON audit_log(usuario)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_timestamp ON audit_log(timestamp)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_endpoint  ON audit_log(endpoint)")
    _ensure_column(conn, "audit_log", "accion", "TEXT")
    _ensure_column(conn, "audit_log", "resultado", "TEXT")
    conn.commit()


def _ensure_column(conn: sqlite3.Connection, table: str, column: str, definition: str) -> None:
    existing = {row["name"] for row in conn.execute(f"PRAGMA table_info({table})").fetchall()}
    if column not in existing:
        conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")


def init_security_tables() -> None:
    conn = _conn()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS token_blacklist (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            token      TEXT UNIQUE NOT NULL,
            user_id    TEXT NOT NULL,
            expires_at TEXT NOT NULL,
            revoked_at TEXT DEFAULT (datetime('now'))
        )
    """)
    conn.execute("CREATE INDEX IF NOT EXISTS idx_blacklist_token ON token_blacklist(token)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_blacklist_expires ON token_blacklist(expires_at)")

    conn.execute("""
        CREATE TABLE IF NOT EXISTS password_history (
            id             INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id        TEXT NOT NULL,
            password_hash  TEXT NOT NULL,
            created_at     TEXT DEFAULT (datetime('now'))
        )
    """)
    conn.execute("CREATE INDEX IF NOT EXISTS idx_password_history_user ON password_history(user_id)")

    conn.execute("""
        CREATE TABLE IF NOT EXISTS active_sessions (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            username      TEXT NOT NULL,
            token         TEXT NOT NULL,
            ip            TEXT,
            user_agent    TEXT,
            created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_activity DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.execute("CREATE INDEX IF NOT EXISTS idx_active_sessions_user ON active_sessions(username)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_active_sessions_token ON active_sessions(token)")
    conn.execute("""
        CREATE TABLE IF NOT EXISTS refresh_sessions (
            jti        TEXT PRIMARY KEY,
            username   TEXT NOT NULL,
            expires_at TEXT NOT NULL,
            revoked_at TEXT
        )
    """)
    conn.execute("CREATE INDEX IF NOT EXISTS idx_refresh_sessions_user ON refresh_sessions(username)")
    conn.commit()
    pass


# ── Token blacklist ────────────────────────────────────────────────────────────

def blacklist_token(token: str, user_id: str, expires_at: str) -> None:
    try:
        conn = _conn()
        conn.execute(
            "INSERT OR IGNORE INTO token_blacklist (token, user_id, expires_at) VALUES (?, ?, ?)",
            (token, user_id, expires_at),
        )
        conn.commit()
        pass
    except Exception as exc:
        logger.exception("No se pudo revocar el access token")
        raise AuditStoreUnavailable("No se pudo revocar el token") from exc


def is_token_blacklisted(token: str) -> bool:
    try:
        conn = _conn()
        row = conn.execute(
            "SELECT 1 FROM token_blacklist WHERE token = ? AND expires_at > datetime('now')",
            (token,),
        ).fetchone()
        if row:
            pass
            return True
        pass
        return False
    except Exception as exc:
        logger.exception("No se pudo consultar la blacklist de tokens")
        raise AuditStoreUnavailable("No se pudo verificar la revocacion del token") from exc


def register_refresh_session(payload: dict) -> bool:
    jti = str(payload.get("jti", ""))
    username = str(payload.get("sub", "")).strip().lower()
    expires_at = payload.get("exp")
    if not jti or not username or not isinstance(expires_at, (int, float)):
        return False
    try:
        conn = _conn()
        expiry = datetime.fromtimestamp(expires_at, tz=timezone.utc).isoformat()
        conn.execute(
            "INSERT INTO refresh_sessions (jti, username, expires_at) VALUES (?, ?, ?)",
            (jti, username, expiry),
        )
        conn.commit()
        return True
    except Exception as exc:
        logger.exception("No se pudo registrar refresh session")
        raise AuditStoreUnavailable("No se pudo registrar la sesion de renovacion") from exc


def rotate_refresh_session(previous_payload: dict, next_payload: dict) -> bool:
    old_jti = str(previous_payload.get("jti", ""))
    username = str(previous_payload.get("sub", "")).strip().lower()
    new_jti = str(next_payload.get("jti", ""))
    expires_at = next_payload.get("exp")
    if not old_jti or not username or not new_jti or not isinstance(expires_at, (int, float)):
        return False
    try:
        conn = _conn()
        expiry = datetime.fromtimestamp(expires_at, tz=timezone.utc).isoformat()
        # Conditional update makes rotation single-use even with concurrent
        # requests: only the first request can revoke the old JTI.
        updated = conn.execute(
            "UPDATE refresh_sessions SET revoked_at = datetime('now') WHERE jti = ? AND username = ? AND revoked_at IS NULL AND expires_at > datetime('now')",
            (old_jti, username),
        )
        if updated.rowcount != 1:
            conn.rollback()
            return False
        conn.execute(
            "INSERT INTO refresh_sessions (jti, username, expires_at) VALUES (?, ?, ?)",
            (new_jti, username, expiry),
        )
        conn.commit()
        return True
    except Exception as exc:
        logger.exception("No se pudo rotar refresh session")
        raise AuditStoreUnavailable("No se pudo rotar la sesion de renovacion") from exc


def cleanup_expired_blacklist() -> None:
    try:
        conn = _conn()
        conn.execute("DELETE FROM token_blacklist WHERE expires_at < datetime('now')")
        conn.commit()
        pass
    except Exception:
        logger.exception("No se pudo limpiar la blacklist expirada")


# ── Password history ───────────────────────────────────────────────────────────

def save_password_history(user_id: str, password_hash: str) -> None:
    try:
        conn = _conn()
        conn.execute(
            "INSERT INTO password_history (user_id, password_hash) VALUES (?, ?)",
            (user_id, password_hash),
        )
        # Keep only the last N records per user
        conn.execute("""
            DELETE FROM password_history WHERE id IN (
                SELECT id FROM password_history WHERE user_id = ?
                ORDER BY id DESC LIMIT -1 OFFSET ?
            )
        """, (user_id, int(os.environ.get("PASSWORD_HISTORY_COUNT", "5"))))
        conn.commit()
        pass
    except Exception as exc:
        logger.exception("No se pudo guardar historial de contrasenas")
        raise AuditStoreUnavailable("No se pudo guardar el historial de contrasenas") from exc


def get_password_history(user_id: str) -> list[str]:
    try:
        conn = _conn()
        rows = conn.execute(
            "SELECT password_hash FROM password_history WHERE user_id = ? ORDER BY id DESC LIMIT ?",
            (user_id, int(os.environ.get("PASSWORD_HISTORY_COUNT", "5"))),
        ).fetchall()
        pass
        return [row["password_hash"] for row in rows]
    except Exception as exc:
        logger.exception("No se pudo consultar historial de contrasenas")
        raise AuditStoreUnavailable("No se pudo verificar el historial de contrasenas") from exc


def check_password_in_history(user_id: str, new_password: str) -> bool:
    history = get_password_history(user_id)
    import bcrypt
    for old_hash in history:
        if bcrypt.checkpw(new_password.encode("utf-8"), old_hash.encode("utf-8")):
            return True
    return False


# ── Security metrics ────────────────────────────────────────────────────────────

def get_blocked_ips() -> list[str]:
    from app.core.brute_force import _blocked_until
    now = datetime.now()
    return [ip for ip, until in _blocked_until.items() if until > now]


def get_failed_logins_last_hour() -> int:
    try:
        conn = _conn()
        row = conn.execute(
            "SELECT COUNT(*) AS cnt FROM audit_log WHERE endpoint = '/api/auth/login' AND status_code = 401 AND timestamp > datetime('now', '-1 hour')"
        ).fetchone()
        pass
        return row["cnt"] if row else 0
    except Exception:
        return 0


# ── Active sessions ───────────────────────────────────────────────────────────

def register_active_session(username: str, token: str, ip: str, user_agent: str) -> None:
    try:
        conn = _conn()
        protected_ip = _protected_network_identity(ip)
        conn.execute(
            "INSERT INTO active_sessions (username, token, ip, user_agent) VALUES (?, ?, ?, ?)",
            (username, token, protected_ip, (user_agent or "")[:200]),
        )
        conn.commit()
        pass
    except Exception:
        pass


def update_session_activity(token: str) -> None:
    try:
        conn = _conn()
        conn.execute(
            "UPDATE active_sessions SET last_activity = CURRENT_TIMESTAMP WHERE token = ?",
            (token,),
        )
        conn.commit()
        pass
    except Exception:
        pass


def get_active_sessions_count() -> int:
    try:
        conn = _conn()
        conn.execute("DELETE FROM active_sessions WHERE last_activity < datetime('now', '-30 minutes')")
        row = conn.execute("SELECT COUNT(*) AS cnt FROM active_sessions").fetchone()
        conn.commit()
        pass
        return row["cnt"] if row else 0
    except Exception:
        return 0


def remove_user_sessions(username: str) -> None:
    try:
        conn = _conn()
        conn.execute("DELETE FROM active_sessions WHERE username = ?", (username,))
        conn.commit()
        pass
    except Exception:
        pass


def get_audit_log_size_mb() -> float:
    try:
        return round(AUDIT_DB.stat().st_size / (1024 * 1024), 1)
    except Exception:
        return 0.0


def get_most_active_user() -> str | None:
    try:
        conn = _conn()
        row = conn.execute(
            "SELECT usuario, COUNT(*) AS cnt FROM audit_log WHERE usuario != 'anon' GROUP BY usuario ORDER BY cnt DESC LIMIT 1"
        ).fetchone()
        pass
        return row["usuario"] if row else None
    except Exception:
        return None


def log_event(
    usuario: str = "anon",
    ip: str = "unknown",
    accion: str | None = None,
    resultado: str | None = None,
    metodo: str = "",
    endpoint: str = "",
    status_code: int = 200,
    user_agent: str = "",
    duracion_ms: int = 0,
    detalle: dict | None = None,
) -> None:
    try:
        conn = _conn()
        from app.core.crypto import encrypt_sensitive_data
        protected_ip = _protected_network_identity(ip)
        resolved_action = accion or f"{metodo} {endpoint}".strip()
        resolved_result = resultado or ("ok" if 200 <= int(status_code) < 400 else "error")
        conn.execute(
            """
            INSERT INTO audit_log
            (timestamp, usuario, ip, accion, resultado, metodo, endpoint, status_code, user_agent, duracion_ms, detalle)
            VALUES (?,?,?,?,?,?,?,?,?,?,?)
            """,
            (
                datetime.now(timezone.utc).isoformat(),
                usuario[:100],
                protected_ip[:50],
                resolved_action[:120],
                resolved_result[:40],
                metodo[:10],
                endpoint[:200],
                status_code,
                user_agent[:200],
                duracion_ms,
                encrypt_sensitive_data(json.dumps(detalle or {})),
            ),
        )
        conn.commit()
        audit_logger.info(
            "usuario=%s ip=%s accion=%s resultado=%s status=%s",
            usuario,
            protected_ip,
            resolved_action,
            resolved_result,
            status_code,
        )
        logger.debug("Audit | %s | %s %s → %s", usuario, metodo, endpoint, status_code)
    except Exception:
        logger.exception("Fallo al escribir audit log")
        pass  # audit log nunca rompe la app


def rotate_audit_log() -> None:
    try:
        conn = _conn()
        conn.execute("DELETE FROM audit_log WHERE timestamp < datetime('now', '-30 days')")
        conn.commit()
        pass
    except Exception:
        pass


def query_audit_log(
    limit: int = 100,
    usuario: str | None = None,
    endpoint: str | None = None,
    desde: str | None = None,
) -> list[dict]:
    try:
        conn = _conn()
        clauses = []
        params: list = []
        if usuario:
            clauses.append("usuario LIKE ?")
            params.append(f"%{usuario}%")
        if endpoint:
            clauses.append("endpoint LIKE ?")
            params.append(f"%{endpoint}%")
        if desde:
            clauses.append("timestamp >= ?")
            params.append(desde)
        where = ("WHERE " + " AND ".join(clauses)) if clauses else ""
        params.append(limit)
        rows = conn.execute(
            f"SELECT * FROM audit_log {where} ORDER BY id DESC LIMIT ?", params
        ).fetchall()
        pass
        from app.core.crypto import decrypt_sensitive_data
        result = []
        for row in rows:
            d = dict(row)
            detalle_raw = d.get("detalle", "")
            if detalle_raw:
                try:
                    decrypted = decrypt_sensitive_data(detalle_raw)
                    if decrypted:
                        d["detalle"] = json.loads(decrypted)
                    else:
                        d["detalle"] = json.loads(detalle_raw)
                except Exception:
                    try:
                        d["detalle"] = json.loads(detalle_raw)
                    except Exception:
                        d["detalle"] = {}
            else:
                d["detalle"] = {}
            result.append(d)
        return result
    except Exception:
        return []
