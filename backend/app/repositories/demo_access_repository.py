from __future__ import annotations

import json
import sqlite3
import uuid
from collections.abc import Callable, Iterator
from contextlib import closing, contextmanager
from dataclasses import dataclass
from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path
from typing import Any, NoReturn, Protocol

from app.core.config import Settings, get_settings


VALID_STATUSES = frozenset({"pending", "approved", "rejected"})


class DemoAccessPersistenceError(RuntimeError):
    """Persistence failed without exposing storage details to API callers."""


class DemoAccessUnavailableError(DemoAccessPersistenceError):
    """No durable request store is currently available."""


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass(frozen=True)
class DemoAccessRequestRecord:
    id: str
    created_at: str
    updated_at: str
    first_name: str
    last_name: str
    email_normalized: str
    company: str
    role: str
    country: str
    operation_type: str | None
    fleet_size_range: str | None
    interests: list[str]
    message: str | None
    phone_optional: str | None
    consent_accepted: bool
    consent_version: str
    status: str
    reviewed_at: str | None
    reviewed_by: str | None
    internal_notes: str | None
    source: str
    request_fingerprint: str

    def admin_dict(self) -> dict[str, object]:
        return {
            "id": self.id,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "email_normalized": self.email_normalized,
            "company": self.company,
            "role": self.role,
            "country": self.country,
            "operation_type": self.operation_type,
            "fleet_size_range": self.fleet_size_range,
            "interests": self.interests,
            "message": self.message,
            "phone_optional": self.phone_optional,
            "consent_accepted": self.consent_accepted,
            "consent_version": self.consent_version,
            "status": self.status,
            "reviewed_at": self.reviewed_at,
            "reviewed_by": self.reviewed_by,
            "internal_notes": self.internal_notes,
            "source": self.source,
        }


class DemoAccessRepository(Protocol):
    backend_name: str
    durable: bool

    def init_schema(self) -> None: ...
    def health_status(self) -> dict[str, object]: ...

    def create(
        self,
        *,
        first_name: str,
        last_name: str,
        email_normalized: str,
        company: str,
        role: str,
        country: str,
        operation_type: str | None,
        fleet_size_range: str | None,
        interests: list[str],
        message: str | None,
        phone_optional: str | None,
        consent_version: str,
        source: str,
        request_fingerprint: str,
    ) -> tuple[DemoAccessRequestRecord, bool]: ...

    def list(self, status: str | None = None) -> list[DemoAccessRequestRecord]: ...
    def get(self, request_id: str) -> DemoAccessRequestRecord | None: ...

    def review(
        self,
        request_id: str,
        *,
        status: str,
        reviewed_by: str,
        internal_notes: str | None,
    ) -> DemoAccessRequestRecord | None: ...


class SQLiteDemoAccessRepository:
    backend_name = "sqlite"
    durable = False

    def __init__(self, db_path: str | Path | None = None) -> None:
        configured_path = Path(db_path or get_settings().demo_access_db_path)
        if configured_path.is_absolute():
            self.db_path = configured_path
        else:
            backend_dir = Path(__file__).resolve().parents[2]
            self.db_path = (backend_dir / configured_path).resolve()

    def _connect(self) -> sqlite3.Connection:
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(str(self.db_path), timeout=10, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        return conn

    @contextmanager
    def _connection(self) -> Iterator[sqlite3.Connection]:
        try:
            with closing(self._connect()) as conn:
                yield conn
        except (OSError, sqlite3.Error) as exc:
            raise DemoAccessPersistenceError("SQLite demo access store failed") from exc

    def init_schema(self) -> None:
        with self._connection() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS demo_access_requests (
                    id                    TEXT PRIMARY KEY,
                    created_at            TEXT NOT NULL,
                    updated_at            TEXT NOT NULL,
                    first_name            TEXT NOT NULL,
                    last_name             TEXT NOT NULL,
                    email_normalized      TEXT NOT NULL,
                    company               TEXT NOT NULL,
                    role                  TEXT NOT NULL,
                    country               TEXT NOT NULL,
                    operation_type        TEXT,
                    fleet_size_range      TEXT,
                    interests_json        TEXT NOT NULL,
                    message               TEXT,
                    phone_optional        TEXT,
                    consent_accepted      INTEGER NOT NULL,
                    consent_version       TEXT NOT NULL,
                    status                TEXT NOT NULL DEFAULT 'pending',
                    reviewed_at           TEXT,
                    reviewed_by           TEXT,
                    internal_notes        TEXT,
                    source                TEXT NOT NULL,
                    request_fingerprint   TEXT NOT NULL UNIQUE
                )
                """
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_demo_access_status_created "
                "ON demo_access_requests(status, created_at DESC)"
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_demo_access_email "
                "ON demo_access_requests(email_normalized)"
            )
            conn.commit()

    @staticmethod
    def _row_to_record(row: sqlite3.Row | None) -> DemoAccessRequestRecord | None:
        if row is None:
            return None
        try:
            interests = json.loads(str(row["interests_json"]))
        except (TypeError, ValueError) as exc:
            raise DemoAccessPersistenceError("Invalid SQLite demo access record") from exc
        if not isinstance(interests, list):
            interests = []
        return DemoAccessRequestRecord(
            id=str(row["id"]),
            created_at=str(row["created_at"]),
            updated_at=str(row["updated_at"]),
            first_name=str(row["first_name"]),
            last_name=str(row["last_name"]),
            email_normalized=str(row["email_normalized"]),
            company=str(row["company"]),
            role=str(row["role"]),
            country=str(row["country"]),
            operation_type=row["operation_type"],
            fleet_size_range=row["fleet_size_range"],
            interests=[str(item) for item in interests],
            message=row["message"],
            phone_optional=row["phone_optional"],
            consent_accepted=bool(row["consent_accepted"]),
            consent_version=str(row["consent_version"]),
            status=str(row["status"]),
            reviewed_at=row["reviewed_at"],
            reviewed_by=row["reviewed_by"],
            internal_notes=row["internal_notes"],
            source=str(row["source"]),
            request_fingerprint=str(row["request_fingerprint"]),
        )

    def create(
        self,
        *,
        first_name: str,
        last_name: str,
        email_normalized: str,
        company: str,
        role: str,
        country: str,
        operation_type: str | None,
        fleet_size_range: str | None,
        interests: list[str],
        message: str | None,
        phone_optional: str | None,
        consent_version: str,
        source: str,
        request_fingerprint: str,
    ) -> tuple[DemoAccessRequestRecord, bool]:
        now = _utc_now()
        request_id = str(uuid.uuid4())
        self.init_schema()
        with self._connection() as conn:
            cursor = conn.execute(
                """
                INSERT OR IGNORE INTO demo_access_requests (
                    id, created_at, updated_at, first_name, last_name,
                    email_normalized, company, role, country, operation_type,
                    fleet_size_range, interests_json, message, phone_optional,
                    consent_accepted, consent_version, status, source,
                    request_fingerprint
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, 'pending', ?, ?)
                """,
                (
                    request_id,
                    now,
                    now,
                    first_name,
                    last_name,
                    email_normalized,
                    company,
                    role,
                    country,
                    operation_type,
                    fleet_size_range,
                    json.dumps(interests, ensure_ascii=False),
                    message,
                    phone_optional,
                    consent_version,
                    source,
                    request_fingerprint,
                ),
            )
            created = cursor.rowcount == 1
            row = conn.execute(
                "SELECT * FROM demo_access_requests WHERE request_fingerprint = ?",
                (request_fingerprint,),
            ).fetchone()
            conn.commit()
        record = self._row_to_record(row)
        if record is None:
            raise RuntimeError("No fue posible recuperar la solicitud creada")
        return record, created

    def list(self, status: str | None = None) -> list[DemoAccessRequestRecord]:
        if status is not None and status not in VALID_STATUSES:
            raise ValueError("Estado de solicitud invalido")
        self.init_schema()
        query = "SELECT * FROM demo_access_requests"
        params: tuple[str, ...] = ()
        if status:
            query += " WHERE status = ?"
            params = (status,)
        query += " ORDER BY created_at DESC LIMIT 500"
        with self._connection() as conn:
            rows = conn.execute(query, params).fetchall()
        return [
            record
            for row in rows
            if (record := self._row_to_record(row)) is not None
        ]

    def get(self, request_id: str) -> DemoAccessRequestRecord | None:
        self.init_schema()
        with self._connection() as conn:
            row = conn.execute(
                "SELECT * FROM demo_access_requests WHERE id = ?",
                (request_id,),
            ).fetchone()
        return self._row_to_record(row)

    def review(
        self,
        request_id: str,
        *,
        status: str,
        reviewed_by: str,
        internal_notes: str | None,
    ) -> DemoAccessRequestRecord | None:
        if status not in {"approved", "rejected"}:
            raise ValueError("Revision de solicitud invalida")
        now = _utc_now()
        self.init_schema()
        with self._connection() as conn:
            conn.execute(
                """
                UPDATE demo_access_requests
                SET status = ?, updated_at = ?, reviewed_at = ?,
                    reviewed_by = ?, internal_notes = ?
                WHERE id = ?
                """,
                (status, now, now, reviewed_by, internal_notes, request_id),
            )
            row = conn.execute(
                "SELECT * FROM demo_access_requests WHERE id = ?",
                (request_id,),
            ).fetchone()
            conn.commit()
        return self._row_to_record(row)

    def health_status(self) -> dict[str, object]:
        try:
            with self._connection() as conn:
                conn.execute("SELECT 1").fetchone()
            return {
                "status": "connected",
                "backend": self.backend_name,
                "durable": self.durable,
                "configured": True,
            }
        except DemoAccessPersistenceError:
            return {
                "status": "unavailable",
                "backend": self.backend_name,
                "durable": self.durable,
                "configured": True,
            }


class UnavailableDemoAccessRepository:
    backend_name = "unavailable"
    durable = False

    def __init__(self, reason: str) -> None:
        self.reason = reason

    def _raise(self) -> NoReturn:
        raise DemoAccessUnavailableError(self.reason)

    def init_schema(self) -> None:
        self._raise()

    def create(self, **_: Any) -> tuple[DemoAccessRequestRecord, bool]:
        self._raise()

    def list(self, status: str | None = None) -> list[DemoAccessRequestRecord]:
        del status
        self._raise()

    def get(self, request_id: str) -> DemoAccessRequestRecord | None:
        del request_id
        self._raise()

    def review(
        self,
        request_id: str,
        *,
        status: str,
        reviewed_by: str,
        internal_notes: str | None,
    ) -> DemoAccessRequestRecord | None:
        del request_id, status, reviewed_by, internal_notes
        self._raise()

    def health_status(self) -> dict[str, object]:
        return {
            "status": "unavailable",
            "backend": self.backend_name,
            "durable": self.durable,
            "configured": False,
            "reason": self.reason,
        }


PostgresRepositoryFactory = Callable[..., DemoAccessRepository]


def _default_postgres_factory(**kwargs: Any) -> DemoAccessRepository:
    from app.repositories.demo_access_postgres_repository import (
        PostgreSQLDemoAccessRepository,
    )

    return PostgreSQLDemoAccessRepository(**kwargs)


def build_demo_access_repository(
    settings: Settings | None = None,
    *,
    postgres_factory: PostgresRepositoryFactory | None = None,
) -> DemoAccessRepository:
    settings = settings or get_settings()
    if settings.demo_access_require_durable and (
        settings.demo_access_fingerprint_key_is_ephemeral
        or len(settings.demo_access_fingerprint_key) < 32
    ):
        return UnavailableDemoAccessRepository(
            "stable_fingerprint_key_not_configured"
        )
    if settings.demo_access_database_url:
        factory = postgres_factory or _default_postgres_factory
        try:
            return factory(
                database_url=settings.demo_access_database_url,
                min_size=settings.demo_access_pool_min_size,
                max_size=settings.demo_access_pool_max_size,
                pool_timeout=settings.demo_access_pool_timeout_seconds,
                connect_timeout=settings.demo_access_connect_timeout_seconds,
            )
        except (ImportError, ValueError) as exc:
            return UnavailableDemoAccessRepository(
                f"postgres_repository_unavailable:{exc.__class__.__name__}"
            )
    if settings.demo_access_require_durable:
        return UnavailableDemoAccessRepository("durable_store_not_configured")
    return SQLiteDemoAccessRepository(settings.demo_access_db_path)


@lru_cache(maxsize=1)
def get_demo_access_repository() -> DemoAccessRepository:
    return build_demo_access_repository()
