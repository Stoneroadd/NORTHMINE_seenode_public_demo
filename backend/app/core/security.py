from __future__ import annotations

import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
from jose import JWTError, jwt

from app.core.config import get_settings

# ── Claves: una sola fuente de verdad (Settings), para que
# require_production_safe() proteja la MISMA clave que realmente firma los
# JWT. Antes este modulo releia SECRET_KEY/REFRESH_SECRET_KEY directo de
# os.environ con su propio fallback duplicado - si alguna vez divergia del
# valor que ve Settings, el guard-rail de produccion podia pasar mientras el
# firmado seguia usando el secreto demo.
_settings = get_settings()
SECRET_KEY         = _settings.secret_key
REFRESH_SECRET_KEY = _settings.refresh_secret_key
ALGORITHM          = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS   = 7
PASSWORD_HISTORY_COUNT      = int(os.environ.get("PASSWORD_HISTORY_COUNT", "5"))

ROLE_ALIASES: dict[str, str] = {
    "ADMIN": "admin",
    "SUPERVISOR": "supervisor",
    "OPERADOR": "operador",
    "INVITADO": "viewer",
}


# ── JWT access / refresh ──────────────────────────────────────────────────────

def create_access_token(data: dict) -> str:
    payload = data.copy()
    payload.update({
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
        "iat": datetime.now(timezone.utc),
        "type": "access",
        "jti": secrets.token_hex(16),
    })
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(data: dict) -> str:
    payload = data.copy()
    payload.update({
        "exp": datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
        "iat": datetime.now(timezone.utc),
        "type": "refresh",
        "jti": secrets.token_hex(16),
    })
    return jwt.encode(payload, REFRESH_SECRET_KEY, algorithm=ALGORITHM)


def verify_access_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "access":
            return None
        return payload
    except JWTError:
        return None


def verify_refresh_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, REFRESH_SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "refresh":
            return None
        return payload
    except JWTError:
        return None


# ── Contraseñas (bcrypt) ──────────────────────────────────────────────────────

BCRYPT_ROUNDS = int(os.environ.get("BCRYPT_ROUNDS", "12"))


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=BCRYPT_ROUNDS)).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


# ── Demo users (bcrypt hashes) ────────────────────────────────────────────────

ROLE_PAGES: dict[str, list[str]] = {
    "admin": [
        "resumen", "turno", "flota", "rendimiento", "comparativa", "alertas",
        "velocidades", "averias", "prediccion", "simulador", "aerea", "calidad",
        "ranking_operadores",
    ],
    "supervisor": [
        "resumen", "turno", "flota", "rendimiento", "comparativa", "alertas",
        "velocidades", "averias", "ranking_operadores",
    ],
    "operador": ["resumen", "turno", "flota", "alertas"],
    "viewer": ["resumen"],
}


def normalize_role(role: str) -> str:
    return ROLE_ALIASES.get(role.upper(), role.strip().lower())

