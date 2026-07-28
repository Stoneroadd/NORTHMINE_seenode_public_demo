from __future__ import annotations

import re
from datetime import date

from pydantic import BaseModel, Field, field_validator


class LoginRequestSecure(BaseModel):
    username: str = Field(min_length=2, max_length=50)
    password: str = Field(min_length=4, max_length=128)

    @field_validator("username")
    @classmethod
    def username_alphanum(cls, v: str) -> str:
        if not re.match(r"^[a-zA-Z0-9_\-\.]+$", v):
            raise ValueError("Usuario contiene caracteres no permitidos")
        return v.strip().lower()

    @field_validator("password")
    @classmethod
    def no_injection(cls, v: str) -> str:
        dangerous = ["'", '"', ";", "--", "/*", "*/", "xp_", "exec(", "drop ", "select "]
        v_lower = v.lower()
        for d in dangerous:
            if d in v_lower:
                raise ValueError("Contraseña contiene caracteres no permitidos")
        return v


class RefreshRequest(BaseModel):
    refresh_token: str = Field(min_length=10, max_length=1000)


class SimulatorRequestSecure(BaseModel):
    caex: int = Field(ge=1, le=100)
    ciclos_hora: float = Field(ge=0.1, le=20.0)
    ton_ciclo: float = Field(ge=50, le=500)
    disponibilidad: float = Field(ge=0.1, le=1.0)
    dias: int = Field(ge=1, le=365)
    turno: str = Field(pattern=r"^(DIA|NOCHE|AMBOS)$")


class AIAnalysisRequestSecure(BaseModel):
    tipo: str = Field(pattern=r"^(turno|resumen|alerta)$")
    contexto: dict = Field(default_factory=dict)

    @field_validator("contexto")
    @classmethod
    def sanitize_context(cls, v: dict) -> dict:
        for key, val in v.items():
            if not isinstance(key, str) or len(key) > 50:
                raise ValueError("Clave de contexto inválida")
            if isinstance(val, str) and len(val) > 500:
                raise ValueError("Valor de contexto demasiado largo")
        return v
