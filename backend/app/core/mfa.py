from __future__ import annotations

import base64
import hmac
import json
import logging
import os
import sqlite3
from datetime import datetime
from io import BytesIO
from pathlib import Path

import pyotp
import qrcode

logger = logging.getLogger("northmine.mfa")

# Misma variable que core/audit.py y core/database.py - antes este modulo
# ignoraba NORTHMINE_AUDIT_DB y siempre usaba la ruta relativa por defecto,
# por lo que los secretos MFA podian terminar en un archivo distinto al del
# resto del sistema de seguridad si se corria desde otro directorio o con
# una ruta de auditoria personalizada.
AUDIT_DB = Path(os.environ.get("NORTHMINE_AUDIT_DB", "northmine_audit.db"))


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
        logger.exception("No se pudo leer MFA para %s", username)
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
        logger.exception("No se pudo guardar la configuracion MFA para %s", username)


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
        logger.exception("No se pudo activar MFA para %s", username)


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
        logger.exception("No se pudo desactivar MFA para %s", username)


def verify_totp_code(secret: str, code: str) -> bool:
    """Valida un codigo TOTP contra un secreto puntual, sin el atajo de
    "MFA no habilitado => True" que usa verify_mfa_code().

    Existe porque la confirmacion de setup (POST /auth/mfa/verify) llama a
    esto ANTES de que enable_mfa() active el registro: en ese momento
    mfa_enabled todavia es False, asi que llamar a verify_mfa_code() ahi
    habria aceptado cualquier codigo (o ninguno) como valido, permitiendo
    "activar" MFA sin demostrar jamas tener el secreto en la app
    autenticadora — y a alguien con una sesion robada plantar un secreto
    propio como backdoor persistente sin que el codigo TOTP real importara.
    """
    if not secret or not code:
        return False
    return pyotp.TOTP(secret).verify(code)


def verify_mfa_code(username: str, code: str) -> bool:
    mfa_data = get_mfa_data(username)
    if not mfa_data or not mfa_data["enabled"]:
        return True

    if verify_totp_code(mfa_data["secret"], code):
        return True

    if any(hmac.compare_digest(code, candidate) for candidate in mfa_data["backup_codes"]):
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
            logger.exception("No se pudo actualizar los codigos de respaldo para %s", username)
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
        logger.exception("No se pudieron persistir los nuevos codigos de respaldo para %s", username)
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
