from __future__ import annotations

import threading
import uuid
from collections.abc import Callable, Mapping
from datetime import datetime, timezone
from typing import Any, TypeVar

from psycopg import Error as PsycopgError
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb
from psycopg_pool import ConnectionPool, PoolTimeout

from app.repositories.demo_access_repository import (
    DemoAccessPersistenceError,
    DemoAccessRequestRecord,
    VALID_STATUSES,
)


SCHEMA_VERSION = 1
T = TypeVar("T")


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _iso(value: object) -> str | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.isoformat()
    return str(value)


class PostgreSQLDemoAccessRepository:
    backend_name = "postgresql"
    durable = True

    def __init__(
        self,
        *,
        database_url: str,
        min_size: int = 1,
        max_size: int = 4,
        pool_timeout: float = 5.0,
        connect_timeout: float = 5.0,
        pool_factory: type[ConnectionPool] = ConnectionPool,
    ) -> None:
        if not database_url.startswith(("postgresql://", "postgres://")):
            raise ValueError("Demo access database URL must use PostgreSQL")
        if min_size < 0 or max_size < 1 or min_size > max_size:
            raise ValueError("Invalid PostgreSQL pool size")
        if pool_timeout <= 0 or connect_timeout <= 0:
            raise ValueError("PostgreSQL timeouts must be positive")

        self.pool_timeout = pool_timeout
        self._open_lock = threading.Lock()
        self._schema_lock = threading.Lock()
        self._schema_ready = False
        self._pool = pool_factory(
            conninfo=database_url,
            min_size=min_size,
            max_size=max_size,
            timeout=pool_timeout,
            kwargs={
                "autocommit": False,
                "connect_timeout": connect_timeout,
                "application_name": "northmine-demo-access",
                "row_factory": dict_row,
            },
            open=False,
            name="northmine-demo-access",
        )

    def _ensure_open(self) -> None:
        if not self._pool.closed:
            return
        with self._open_lock:
            if self._pool.closed:
                self._pool.open(wait=True, timeout=self.pool_timeout)

    def _run(self, operation: Callable[[], T]) -> T:
        try:
            self._ensure_open()
            return operation()
        except (PsycopgError, PoolTimeout, OSError) as exc:
            raise DemoAccessPersistenceError(
                f"PostgreSQL demo access operation failed: {exc.__class__.__name__}"
            ) from exc

    @staticmethod
    def _row_to_record(
        row: Mapping[str, Any] | None,
    ) -> DemoAccessRequestRecord | None:
        if row is None:
            return None
        interests = row.get("interests")
        if not isinstance(interests, list):
            interests = []
        return DemoAccessRequestRecord(
            id=str(row["id"]),
            created_at=_iso(row["created_at"]) or "",
            updated_at=_iso(row["updated_at"]) or "",
            first_name=str(row["first_name"]),
            last_name=str(row["last_name"]),
            email_normalized=str(row["email_normalized"]),
            company=str(row["company"]),
            role=str(row["role"]),
            country=str(row["country"]),
            operation_type=row.get("operation_type"),
            fleet_size_range=row.get("fleet_size_range"),
            interests=[str(item) for item in interests],
            message=row.get("message"),
            phone_optional=row.get("phone_optional"),
            consent_accepted=bool(row["consent_accepted"]),
            consent_version=str(row["consent_version"]),
            status=str(row["status"]),
            reviewed_at=_iso(row.get("reviewed_at")),
            reviewed_by=row.get("reviewed_by"),
            internal_notes=row.get("internal_notes"),
            source=str(row["source"]),
            request_fingerprint=str(row["request_fingerprint"]),
        )

    def init_schema(self) -> None:
        if self._schema_ready:
            return

        def initialize() -> None:
            with self._pool.connection(timeout=self.pool_timeout) as conn:
                conn.execute(
                    """
                    CREATE TABLE IF NOT EXISTS northmine_demo_access_schema (
                        singleton SMALLINT PRIMARY KEY CHECK (singleton = 1),
                        version INTEGER NOT NULL,
                        updated_at TIMESTAMPTZ NOT NULL
                    )
                    """
                )
                conn.execute(
                    """
                    CREATE TABLE IF NOT EXISTS demo_access_requests (
                        id TEXT PRIMARY KEY,
                        created_at TIMESTAMPTZ NOT NULL,
                        updated_at TIMESTAMPTZ NOT NULL,
                        first_name TEXT NOT NULL,
                        last_name TEXT NOT NULL,
                        email_normalized TEXT NOT NULL,
                        company TEXT NOT NULL,
                        role TEXT NOT NULL,
                        country TEXT NOT NULL,
                        operation_type TEXT,
                        fleet_size_range TEXT,
                        interests JSONB NOT NULL,
                        message TEXT,
                        phone_optional TEXT,
                        consent_accepted BOOLEAN NOT NULL,
                        consent_version TEXT NOT NULL,
                        status TEXT NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'approved', 'rejected')),
                        reviewed_at TIMESTAMPTZ,
                        reviewed_by TEXT,
                        internal_notes TEXT,
                        source TEXT NOT NULL,
                        request_fingerprint TEXT NOT NULL UNIQUE
                    )
                    """
                )
                conn.execute(
                    """
                    CREATE INDEX IF NOT EXISTS idx_demo_access_status_created
                    ON demo_access_requests(status, created_at DESC)
                    """
                )
                conn.execute(
                    """
                    CREATE INDEX IF NOT EXISTS idx_demo_access_email
                    ON demo_access_requests(email_normalized)
                    """
                )
                conn.execute(
                    """
                    INSERT INTO northmine_demo_access_schema
                    (singleton, version, updated_at)
                    VALUES (1, %s, %s)
                    ON CONFLICT (singleton) DO NOTHING
                    """,
                    (SCHEMA_VERSION, _utc_now()),
                )
                current = conn.execute(
                    "SELECT version FROM northmine_demo_access_schema WHERE singleton = 1"
                ).fetchone()
                if current is None or int(current["version"]) != SCHEMA_VERSION:
                    raise DemoAccessPersistenceError(
                        "Unsupported demo access schema version"
                    )
                conn.commit()

        with self._schema_lock:
            if self._schema_ready:
                return
            self._run(initialize)
            self._schema_ready = True

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
        self.init_schema()
        now = _utc_now()

        def insert() -> tuple[DemoAccessRequestRecord, bool]:
            with self._pool.connection(timeout=self.pool_timeout) as conn:
                row = conn.execute(
                    """
                    INSERT INTO demo_access_requests (
                        id, created_at, updated_at, first_name, last_name,
                        email_normalized, company, role, country, operation_type,
                        fleet_size_range, interests, message, phone_optional,
                        consent_accepted, consent_version, status, source,
                        request_fingerprint
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                        %s, %s, %s, %s, TRUE, %s, 'pending', %s, %s
                    )
                    ON CONFLICT (request_fingerprint) DO NOTHING
                    RETURNING *
                    """,
                    (
                        str(uuid.uuid4()),
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
                        Jsonb(interests),
                        message,
                        phone_optional,
                        consent_version,
                        source,
                        request_fingerprint,
                    ),
                ).fetchone()
                created = row is not None
                if row is None:
                    row = conn.execute(
                        """
                        SELECT * FROM demo_access_requests
                        WHERE request_fingerprint = %s
                        """,
                        (request_fingerprint,),
                    ).fetchone()
                conn.commit()
            record = self._row_to_record(row)
            if record is None:
                raise DemoAccessPersistenceError(
                    "PostgreSQL request could not be recovered"
                )
            return record, created

        return self._run(insert)

    def list(self, status: str | None = None) -> list[DemoAccessRequestRecord]:
        if status is not None and status not in VALID_STATUSES:
            raise ValueError("Estado de solicitud invalido")
        self.init_schema()

        def fetch() -> list[DemoAccessRequestRecord]:
            query = "SELECT * FROM demo_access_requests"
            params: tuple[str, ...] = ()
            if status:
                query += " WHERE status = %s"
                params = (status,)
            query += " ORDER BY created_at DESC LIMIT 500"
            with self._pool.connection(timeout=self.pool_timeout) as conn:
                rows = conn.execute(query, params).fetchall()
            return [
                record
                for row in rows
                if (record := self._row_to_record(row)) is not None
            ]

        return self._run(fetch)

    def get(self, request_id: str) -> DemoAccessRequestRecord | None:
        self.init_schema()

        def fetch() -> DemoAccessRequestRecord | None:
            with self._pool.connection(timeout=self.pool_timeout) as conn:
                row = conn.execute(
                    "SELECT * FROM demo_access_requests WHERE id = %s",
                    (request_id,),
                ).fetchone()
            return self._row_to_record(row)

        return self._run(fetch)

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
        self.init_schema()

        def update() -> DemoAccessRequestRecord | None:
            now = _utc_now()
            with self._pool.connection(timeout=self.pool_timeout) as conn:
                row = conn.execute(
                    """
                    UPDATE demo_access_requests
                    SET status = %s, updated_at = %s, reviewed_at = %s,
                        reviewed_by = %s, internal_notes = %s
                    WHERE id = %s
                    RETURNING *
                    """,
                    (
                        status,
                        now,
                        now,
                        reviewed_by,
                        internal_notes,
                        request_id,
                    ),
                ).fetchone()
                conn.commit()
            return self._row_to_record(row)

        return self._run(update)

    def health_status(self) -> dict[str, object]:
        try:
            self.init_schema()
            self._ensure_open()
            with self._pool.connection(timeout=self.pool_timeout) as conn:
                conn.execute("SELECT 1").fetchone()
            return {
                "status": "connected",
                "backend": self.backend_name,
                "durable": self.durable,
                "configured": True,
                "schema_version": SCHEMA_VERSION,
            }
        except (DemoAccessPersistenceError, PsycopgError, PoolTimeout, OSError):
            return {
                "status": "unavailable",
                "backend": self.backend_name,
                "durable": self.durable,
                "configured": True,
                "schema_version": SCHEMA_VERSION,
            }
