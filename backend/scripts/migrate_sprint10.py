from __future__ import annotations

import sqlite3
from pathlib import Path

AUDIT_DB = Path("northmine_audit.db")


def migrate() -> None:
    if not AUDIT_DB.exists():
        print(f"[!] {AUDIT_DB} no encontrado. Ejecute la app primero para inicializar.")
        return

    conn = sqlite3.connect(AUDIT_DB)

    # mfa_store table
    conn.execute("""
        CREATE TABLE IF NOT EXISTS mfa_store (
            username     TEXT PRIMARY KEY,
            mfa_secret   TEXT,
            mfa_enabled  INTEGER DEFAULT 0,
            backup_codes TEXT,
            created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    print("[+] Tabla mfa_store lista")

    # active_sessions table
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
    print("[+] Tabla active_sessions lista")

    conn.commit()
    conn.close()
    print("[+] Migración Sprint 10 completada.")


if __name__ == "__main__":
    migrate()
