from __future__ import annotations

import logging
import os
from pathlib import Path

from cryptography.fernet import Fernet

from app.core.config import get_settings

logger = logging.getLogger("northmine.crypto")

# Respaldo local SOLO para modo demo/desarrollo: si AUDIT_ENCRYPTION_KEY no
# esta fijada, antes se generaba una clave aleatoria nueva EN CADA REINICIO,
# lo que volvia indescifrable todo lo cifrado con la clave anterior. Ahora,
# fuera de produccion, se genera una vez y se persiste en disco junto a la
# base de auditoria para que los reinicios reutilicen la misma clave. En
# produccion, la ausencia de la variable es un error de arranque: es preferible
# fallar explicito a cifrar con una clave que nadie respaldo.
_FALLBACK_KEY_FILENAME = ".audit_encryption_key.local"


def _fallback_key_path() -> Path:
    settings = get_settings()
    return Path(settings.audit_db_path).resolve().parent / _FALLBACK_KEY_FILENAME


def _load_or_create_fallback_key() -> bytes:
    path = _fallback_key_path()
    if path.exists():
        return path.read_bytes().strip()
    key = Fernet.generate_key()
    try:
        path.write_bytes(key)
    except OSError:
        logger.warning("No se pudo persistir la clave de cifrado de respaldo en %s", path)
    return key


def _get_key() -> bytes:
    key = os.environ.get("AUDIT_ENCRYPTION_KEY", "")
    if key:
        return key.encode("utf-8")

    settings = get_settings()
    if settings.is_production:
        raise RuntimeError(
            "AUDIT_ENCRYPTION_KEY no esta definida. En produccion no se genera "
            "una clave de respaldo: fijala explicitamente antes de arrancar."
        )

    logger.warning(
        "AUDIT_ENCRYPTION_KEY no esta definida; usando una clave local persistida "
        "en %s (solo valido fuera de produccion).",
        _fallback_key_path(),
    )
    return _load_or_create_fallback_key()


_cipher = Fernet(_get_key())


def encrypt_sensitive_data(data: str) -> str:
    if not data:
        return ""
    try:
        return _cipher.encrypt(data.encode("utf-8")).decode("utf-8")
    except Exception:
        logger.exception("Fallo al cifrar datos sensibles de auditoria")
        return ""


def decrypt_sensitive_data(encrypted_data: str) -> str:
    if not encrypted_data:
        return ""
    try:
        return _cipher.decrypt(encrypted_data.encode("utf-8")).decode("utf-8")
    except Exception:
        logger.exception("Fallo al descifrar datos sensibles de auditoria")
        return ""
