from __future__ import annotations

import hashlib
import hmac
import secrets
from datetime import datetime, timezone

from app.core.config import get_settings
from app.repositories.demo_access_repository import (
    DemoAccessRepository,
    DemoAccessRequestRecord,
)
from app.schemas.demo_access import DemoAccessRequestCreate


PUBLIC_SOURCE = "public_landing"


class DemoAccessService:
    def __init__(self, repository: DemoAccessRepository) -> None:
        self.repository = repository

    @staticmethod
    def _fingerprint(payload: DemoAccessRequestCreate) -> str:
        settings = get_settings()
        day = datetime.now(timezone.utc).date().isoformat()
        material = "|".join(
            (
                payload.email,
                payload.company.casefold(),
                day,
                PUBLIC_SOURCE,
            )
        ).encode("utf-8")
        return hmac.new(
            settings.demo_access_fingerprint_key.encode("utf-8"),
            material,
            hashlib.sha256,
        ).hexdigest()

    @staticmethod
    def public_reference() -> str:
        return f"NM-{secrets.token_hex(4).upper()}"

    def submit(
        self,
        payload: DemoAccessRequestCreate,
    ) -> tuple[str, bool]:
        if payload.website:
            return self.public_reference(), False

        _, created = self.repository.create(
            first_name=payload.first_name,
            last_name=payload.last_name,
            email_normalized=payload.email,
            company=payload.company,
            role=payload.role,
            country=payload.country,
            operation_type=payload.operation_type,
            fleet_size_range=payload.fleet_size_range,
            interests=list(payload.interests),
            message=payload.message,
            phone_optional=payload.phone,
            consent_version=payload.consent_version,
            source=PUBLIC_SOURCE,
            request_fingerprint=self._fingerprint(payload),
        )
        return self.public_reference(), created

    def list(self, status: str | None = None) -> list[DemoAccessRequestRecord]:
        return self.repository.list(status=status)

    def get(self, request_id: str) -> DemoAccessRequestRecord | None:
        return self.repository.get(request_id)

    def review(
        self,
        request_id: str,
        *,
        status: str,
        reviewed_by: str,
        internal_notes: str | None,
    ) -> DemoAccessRequestRecord | None:
        return self.repository.review(
            request_id,
            status=status,
            reviewed_by=reviewed_by,
            internal_notes=internal_notes,
        )
