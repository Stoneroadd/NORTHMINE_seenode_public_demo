from __future__ import annotations

from dataclasses import dataclass


ROLE_ALIASES: dict[str, str] = {
    "ADMIN": "admin",
    "SUPERVISOR": "supervisor",
    "OPERADOR": "operador",
    "INVITADO": "viewer",
    "VIEWER": "viewer",
}

VALID_ROLES = {"admin", "supervisor", "operador", "viewer"}


def normalize_role(role: str) -> str:
    normalized = ROLE_ALIASES.get(role.strip().upper(), role.strip().lower())
    if normalized not in VALID_ROLES:
        raise ValueError(f"Rol no soportado: {role}")
    return normalized


@dataclass(frozen=True)
class User:
    id: str
    username: str
    full_name: str
    email: str | None
    password_hash: str
    role: str
    is_active: bool
    is_demo: bool
    created_at: str
    updated_at: str
    last_login_at: str | None
    auth_version: int = 1
    faena: str = "MINA CHILE DEMO"
    empresa: str = "NORTHMINE"

    def public_dict(self) -> dict[str, object]:
        return {
            "id": self.id,
            "username": self.username,
            "full_name": self.full_name,
            "email": self.email,
            "role": self.role,
            "is_active": self.is_active,
            "is_demo": self.is_demo,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "last_login_at": self.last_login_at,
            "faena": self.faena,
            "empresa": self.empresa,
        }
