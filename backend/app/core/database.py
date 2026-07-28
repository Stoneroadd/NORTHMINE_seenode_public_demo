from __future__ import annotations

import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from threading import local

AUDIT_DB = Path(os.environ.get("NORTHMINE_AUDIT_DB", "northmine_audit.db"))
_local = local()


@contextmanager
def get_db_connection():
    if not hasattr(_local, "conn") or _local.conn is None:
        _local.conn = sqlite3.connect(str(AUDIT_DB), timeout=10, check_same_thread=False)
        _local.conn.row_factory = sqlite3.Row
    try:
        yield _local.conn
    except Exception:
        _local.conn.rollback()
        raise


def close_db_connections():
    if hasattr(_local, "conn") and _local.conn:
        _local.conn.close()
        _local.conn = None


def execute_query(sql: str, params: tuple = ()) -> list[sqlite3.Row] | int | None:
    is_read = sql.strip().upper().startswith(("SELECT", "PRAGMA"))
    with get_db_connection() as conn:
        if is_read:
            return conn.execute(sql, params).fetchall()
        cursor = conn.execute(sql, params)
        conn.commit()
        return cursor.lastrowid
