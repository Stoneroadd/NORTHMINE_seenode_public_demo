from __future__ import annotations

import re
import unicodedata
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


DemoAccessStatus = Literal["pending", "approved", "rejected"]
DemoAccessInterest = Literal[
    "Cockpit operacional",
    "Produccion",
    "Flota CAEX",
    "Carguio",
    "Riesgos y alertas",
    "Mapa 3D",
    "Prediccion y simulacion",
    "Integracion con datos operacionales",
    "Otro",
]

_EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]{2,}$")
_CONTROL_CHARACTERS = re.compile(r"[\x00-\x1f\x7f]")


def _clean_text(value: str) -> str:
    normalized = unicodedata.normalize("NFKC", value)
    return _CONTROL_CHARACTERS.sub(" ", normalized).strip()


class DemoAccessRequestCreate(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    first_name: str = Field(min_length=2, max_length=80)
    last_name: str = Field(min_length=2, max_length=80)
    email: str = Field(min_length=5, max_length=254)
    company: str = Field(min_length=2, max_length=160)
    role: str = Field(min_length=2, max_length=120)
    country: str = Field(min_length=2, max_length=80)
    operation_type: str | None = Field(default=None, max_length=100)
    fleet_size_range: str | None = Field(default=None, max_length=80)
    interests: list[DemoAccessInterest] = Field(min_length=1, max_length=9)
    message: str | None = Field(default=None, max_length=1200)
    phone: str | None = Field(default=None, max_length=40)
    consent_accepted: Literal[True]
    consent_version: str = Field(min_length=1, max_length=32)
    website: str | None = Field(default=None, max_length=200)

    @field_validator(
        "first_name",
        "last_name",
        "company",
        "role",
        "country",
        "operation_type",
        "fleet_size_range",
        "message",
        "phone",
        "website",
        mode="before",
    )
    @classmethod
    def sanitize_text(cls, value: object) -> object:
        if value is None or not isinstance(value, str):
            return value
        cleaned = _clean_text(value)
        return cleaned or None

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        normalized = _clean_text(value).lower()
        if not _EMAIL_PATTERN.fullmatch(normalized):
            raise ValueError("Correo invalido")
        return normalized

    @field_validator("interests")
    @classmethod
    def deduplicate_interests(
        cls,
        value: list[DemoAccessInterest],
    ) -> list[DemoAccessInterest]:
        return list(dict.fromkeys(value))


class DemoAccessRequestReceipt(BaseModel):
    accepted: Literal[True] = True
    message: str
    reference: str


class DemoAccessReviewRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    internal_notes: str | None = Field(default=None, max_length=1000)

    @field_validator("internal_notes", mode="before")
    @classmethod
    def sanitize_notes(cls, value: object) -> object:
        if value is None or not isinstance(value, str):
            return value
        cleaned = _clean_text(value)
        return cleaned or None


class DemoAccessRequestAdmin(BaseModel):
    id: str
    created_at: str
    updated_at: str
    first_name: str
    last_name: str
    email_normalized: str
    company: str
    role: str
    country: str
    operation_type: str | None = None
    fleet_size_range: str | None = None
    interests: list[DemoAccessInterest]
    message: str | None = None
    phone_optional: str | None = None
    consent_accepted: bool
    consent_version: str
    status: DemoAccessStatus
    reviewed_at: str | None = None
    reviewed_by: str | None = None
    internal_notes: str | None = None
    source: str


class DemoAccessRequestList(BaseModel):
    items: list[DemoAccessRequestAdmin]
    total: int
