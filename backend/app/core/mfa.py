from __future__ import annotations

import base64
import json
import sqlite3
from datetime import datetime
from io import BytesIO
from pathlib import Path

import pyotp
import qrcode

AUDIT_DB = Path("northmine_audit.db")


def init_mfa_table() -> None:
    conn = sqlite3.connect(AUDIT_DB)
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
    conn.commit()
    conn.close()


def get_mfa_data(username: str) -> dict | None:
    try:
        conn = sqlite3.connect(AUDIT_DB)
        conn.row_factory = sqlite3.Row
        row = conn.execute(
            "SELECT mfa_secret, mfa_enabled, backup_codes FROM mfa_store WHERE username = ?",
            (username,),
        ).fetchone()
        conn.close()
        if row:
            return {
                "secret": row["mfa_secret"],
                "enabled": bool(row["mfa_enabled"]),
                "backup_codes": json.loads(row["backup_codes"]) if row["backup_codes"] else [],
            }
        return None
    except Exception:
        return None


def save_mfa_setup(username: str, secret: str, backup_codes: list[str]) -> None:
    try:
        conn = sqlite3.connect(AUDIT_DB)
        conn.execute(
            "INSERT OR REPLACE INTO mfa_store (username, mfa_secret, backup_codes, updated_at) VALUES (?, ?, ?, ?)",
            (username, secret, json.dumps(backup_codes), datetime.now().isoformat()),
        )
        conn.commit()
        conn.close()
    except Exception:
        pass


def enable_mfa(username: str) -> None:
    try:
        conn = sqlite3.connect(AUDIT_DB)
        conn.execute(
            "UPDATE mfa_store SET mfa_enabled = 1, updated_at = ? WHERE username = ?",
            (datetime.now().isoformat(), username),
        )
        conn.commit()
        conn.close()
    except Exception:
        pass


def disable_mfa(username: str) -> None:
    try:
        conn = sqlite3.connect(AUDIT_DB)
        conn.execute(
            "UPDATE mfa_store SET mfa_enabled = 0, updated_at = ? WHERE username = ?",
            (datetime.now().isoformat(), username),
        )
        conn.commit()
        conn.close()
    except Exception:
        pass


def verify_mfa_code(username: str, code: str) -> bool:
    mfa_data = get_mfa_data(username)
    if not mfa_data or not mfa_data["enabled"]:
        return True

    totp = pyotp.TOTP(mfa_data["secret"])
    if totp.verify(code):
        return True

    if code in mfa_data["backup_codes"]:
        mfa_data["backup_codes"].remove(code)
        try:
            conn = sqlite3.connect(AUDIT_DB)
            conn.execute(
                "UPDATE mfa_store SET backup_codes = ? WHERE username = ?",
                (json.dumps(mfa_data["backup_codes"]), username),
            )
            conn.commit()
            conn.close()
        except Exception:
            pass
        return True

    return False


def regenerate_backup_codes(username: str) -> list[str]:
    new_codes = [pyotp.random_base32()[:8] for _ in range(10)]
    try:
        conn = sqlite3.connect(AUDIT_DB)
        conn.execute(
            "UPDATE mfa_store SET backup_codes = ?, updated_at = ? WHERE username = ?",
            (json.dumps(new_codes), datetime.now().isoformat(), username),
        )
        conn.commit()
        conn.close()
    except Exception:
        pass
    return new_codes


def generate_mfa_qr(username: str, secret: str) -> str:
    issuer = "NORTHMINE"
    uri = pyotp.totp.TOTP(secret).provisioning_uri(name=username, issuer_name=issuer)

    qr = qrcode.QRCode(box_size=3, border=1)
    qr.add_data(uri)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")

    buffered = BytesIO()
    img.save(buffered, format="PNG")
    return base64.b64encode(buffered.getvalue()).decode()
