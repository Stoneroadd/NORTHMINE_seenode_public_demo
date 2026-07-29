from __future__ import annotations

import os

from cryptography.fernet import Fernet


def _get_key() -> bytes:
    key = os.environ.get("AUDIT_ENCRYPTION_KEY", "")
    if key:
        return key.encode("utf-8")
    fallback = Fernet.generate_key()
    return fallback


_cipher = Fernet(_get_key())


def encrypt_sensitive_data(data: str) -> str:
    if not data:
        return ""
    try:
        return _cipher.encrypt(data.encode("utf-8")).decode("utf-8")
    except Exception:
        return ""


def decrypt_sensitive_data(encrypted_data: str) -> str:
    if not encrypted_data:
        return ""
    try:
        return _cipher.decrypt(encrypted_data.encode("utf-8")).decode("utf-8")
    except Exception:
        return ""
