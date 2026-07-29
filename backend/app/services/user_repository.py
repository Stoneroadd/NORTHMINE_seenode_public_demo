from __future__ import annotations

import sqlite3
import uuid
from contextlib import closing
from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path
from typing import Any, Protocol

from app.core.config import Settings, get_settings
from app.core.security import hash_password, verify_password
from app.models.users import User, normalize_role


DEMO_USER_SEEDS: tuple[dict[str, str], ...] = (
    {
        "username": "admin",
        "password": "admin",
        "role": "admin",
        "full_name": "Administrador NORTHMINE",
        "faena": "Rajo DES",
        "empresa": "NORTHMINE",
    },
    {
        "username": "demo",
        "password": "demo",
        "role": "admin",
        "full_name": "Demo Ejecutivo",
        "faena": "Rajo DES",
        "empresa": "NORTHMINE",
    },
    {
        "username": "supervisor",
        "password": "supervisor",
        "role": "supervisor",
        "full_name": "Supervisor Turno",
        "faena": "Rajo DES",
        "empresa": "Operaciones Mina",
    },
    {
        "username": "operador",
        "password": "operador",
        "role": "operador",
        "full_name": "Operador Control",
        "faena": "Rajo DES",
        "empresa": "Operaciones Mina",
    },
)


INSECURE_PASSWORDS = {"admin", "demo", "password", "123456", "12345678", "changeme"}


class UserRepositoryError(ValueError):
    pass


class DuplicateUserError(UserRepositoryError):
    pass


class LastAdminError(UserRepositoryError):
    pass


class BaseUserRepository(Protocol):
    def list_users(self) -> list[User]: ...
    def get_by_username(self, username: str) -> User | None: ...
    def get_by_id(self, user_id: str) -> User | None: ...
    def get_user_by_id(self, user_id: str) -> User | None: ...
    def create_user(self, username: str, password: str, *, full_name: str, role: str, email: str | None = None, is_active: bool = True, is_demo: bool = False, faena: str = "Rajo DES", empresa: str = "NORTHMINE") -> User: ...
    def update_user(self, user_id: str, *, full_name: str | None = None, email: str | None = None, faena: str | None = None, empresa: str | None = None) -> User: ...
    def update_role(self, user_id: str, role: str) -> User: ...
    def set_active_status(self, user_id: str, is_active: bool) -> User: ...
    def reset_password(self, user_id: str, new_password: str) -> User: ...
    def update_last_login(self, username: str) -> None: ...
    def count_active_admins(self) -> int: ...
    def audit_admin_action(self, *, actor_user: str, target_user: str, action: str, result: str, ip: str = "unknown", user_agent: str = "", detail: dict[str, Any] | None = None, status_code: int = 200) -> None: ...


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _normalize_username(username: str) -> str:
    return username.strip().lower()


def _normalize_optional_email(email: str | None) -> str | None:
    if email is None:
        return None
    normalized = email.strip().lower()
    return normalized or None


def _validate_password_strength(password: str) -> None:
    if len(password) < 10:
        raise UserRepositoryError("La password debe tener al menos 10 caracteres")
    if password.strip().lower() in INSECURE_PASSWORDS:
        raise UserRepositoryError("La password no puede usar una clave demo o comun")
    classes = [
        any(char.islower() for char in password),
        any(char.isupper() for char in password),
        any(char.isdigit() for char in password),
        any(not char.isalnum() for char in password),
    ]
    if sum(classes) < 3:
        raise UserRepositoryError("La password debe combinar letras, numeros y simbolos")


class SQLiteUserRepository:
    def __init__(self, db_path: str | Path | None = None) -> None:
        settings = get_settings()
        configured_path = Path(db_path or settings.users_db_path)
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

    def init_schema(self) -> None:
        with closing(self._connect()) as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS users (
                    id            TEXT PRIMARY KEY,
                    username      TEXT UNIQUE NOT NULL COLLATE NOCASE,
                    full_name     TEXT NOT NULL,
                    email         TEXT,
                    password_hash TEXT NOT NULL,
                    role          TEXT NOT NULL,
                    is_active     INTEGER NOT NULL DEFAULT 1,
                    is_demo       INTEGER NOT NULL DEFAULT 0,
                    created_at    TEXT NOT NULL,
                    updated_at    TEXT NOT NULL,
                    last_login_at TEXT,
                    faena         TEXT NOT NULL DEFAULT 'Rajo DES',
                    empresa       TEXT NOT NULL DEFAULT 'NORTHMINE'
                )
                """
            )
            conn.execute("CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active)")
            conn.commit()

    def _row_to_user(self, row: sqlite3.Row | None) -> User | None:
        if row is None:
            return None
        return User(
            id=str(row["id"]),
            username=str(row["username"]),
            full_name=str(row["full_name"]),
            email=row["email"],
            password_hash=str(row["password_hash"]),
            role=normalize_role(str(row["role"])),
            is_active=bool(row["is_active"]),
            is_demo=bool(row["is_demo"]),
            created_at=str(row["created_at"]),
            updated_at=str(row["updated_at"]),
            last_login_at=row["last_login_at"],
            faena=str(row["faena"]),
            empresa=str(row["empresa"]),
        )

    def get_by_username(self, username: str) -> User | None:
        normalized = _normalize_username(username)
        if not normalized:
            return None
        with closing(self._connect()) as conn:
            row = conn.execute("SELECT * FROM users WHERE username = ?", (normalized,)).fetchone()
        return self._row_to_user(row)

    def list_users(self) -> list[User]:
        with closing(self._connect()) as conn:
            rows = conn.execute(
                "SELECT * FROM users ORDER BY is_active DESC, role ASC, username ASC"
            ).fetchall()
        return [user for row in rows if (user := self._row_to_user(row)) is not None]

    def get_by_id(self, user_id: str) -> User | None:
        if not user_id.strip():
            return None
        with closing(self._connect()) as conn:
            row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id.strip(),)).fetchone()
        return self._row_to_user(row)

    def get_user_by_id(self, user_id: str) -> User | None:
        return self.get_by_id(user_id)

    def _email_exists(self, email: str | None, *, exclude_user_id: str | None = None) -> bool:
        normalized = _normalize_optional_email(email)
        if not normalized:
            return False
        with closing(self._connect()) as conn:
            if exclude_user_id:
                row = conn.execute(
                    "SELECT 1 FROM users WHERE lower(email) = lower(?) AND id != ? LIMIT 1",
                    (normalized, exclude_user_id),
                ).fetchone()
            else:
                row = conn.execute(
                    "SELECT 1 FROM users WHERE lower(email) = lower(?) LIMIT 1",
                    (normalized,),
                ).fetchone()
        return row is not None

    def create_user(
        self,
        username: str,
        password: str,
        *,
        full_name: str,
        role: str,
        email: str | None = None,
        is_active: bool = True,
        is_demo: bool = False,
        faena: str = "Rajo DES",
        empresa: str = "NORTHMINE",
    ) -> User:
        normalized_username = _normalize_username(username)
        normalized_email = _normalize_optional_email(email)
        if not normalized_username:
            raise UserRepositoryError("username requerido")
        if is_demo:
            if not password:
                raise UserRepositoryError("password requerido")
        else:
            _validate_password_strength(password)

        existing = self.get_by_username(normalized_username)
        if existing:
            raise DuplicateUserError("username ya existe")
        if self._email_exists(normalized_email):
            raise DuplicateUserError("email ya existe")

        now = _utc_now()
        user_id = uuid.uuid4().hex
        role_normalized = normalize_role(role)
        password_hash = hash_password(password)
        with closing(self._connect()) as conn:
            conn.execute(
                """
                INSERT INTO users
                (id, username, full_name, email, password_hash, role, is_active, is_demo,
                 created_at, updated_at, last_login_at, faena, empresa)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    user_id,
                    normalized_username,
                    full_name,
                    normalized_email,
                    password_hash,
                    role_normalized,
                    1 if is_active else 0,
                    1 if is_demo else 0,
                    now,
                    now,
                    None,
                    faena,
                    empresa,
                ),
            )
            conn.commit()
        created = self.get_by_username(normalized_username)
        if not created:
            raise RuntimeError("No se pudo crear usuario")
        return created

    def update_user(
        self,
        user_id: str,
        *,
        full_name: str | None = None,
        email: str | None = None,
        faena: str | None = None,
        empresa: str | None = None,
    ) -> User:
        existing = self.get_by_id(user_id)
        if not existing:
            raise UserRepositoryError("Usuario no encontrado")

        normalized_email = _normalize_optional_email(email) if email is not None else existing.email
        if self._email_exists(normalized_email, exclude_user_id=user_id):
            raise DuplicateUserError("email ya existe")

        now = _utc_now()
        with closing(self._connect()) as conn:
            conn.execute(
                """
                UPDATE users
                SET full_name = ?, email = ?, faena = ?, empresa = ?, updated_at = ?
                WHERE id = ?
                """,
                (
                    full_name.strip() if full_name is not None else existing.full_name,
                    normalized_email,
                    faena.strip() if faena is not None else existing.faena,
                    empresa.strip() if empresa is not None else existing.empresa,
                    now,
                    user_id,
                ),
            )
            conn.commit()
        updated = self.get_by_id(user_id)
        if not updated:
            raise RuntimeError("No se pudo actualizar usuario")
        return updated

    def count_active_admins(self) -> int:
        with closing(self._connect()) as conn:
            row = conn.execute(
                "SELECT COUNT(*) AS cnt FROM users WHERE role = 'admin' AND is_active = 1"
            ).fetchone()
        return int(row["cnt"] if row else 0)

    def update_role(self, user_id: str, role: str) -> User:
        existing = self.get_by_id(user_id)
        if not existing:
            raise UserRepositoryError("Usuario no encontrado")
        new_role = normalize_role(role)
        if existing.is_active and existing.role == "admin" and new_role != "admin" and self.count_active_admins() <= 1:
            raise LastAdminError("No se puede degradar el ultimo ADMIN activo")

        now = _utc_now()
        with closing(self._connect()) as conn:
            conn.execute(
                "UPDATE users SET role = ?, updated_at = ? WHERE id = ?",
                (new_role, now, user_id),
            )
            conn.commit()
        updated = self.get_by_id(user_id)
        if not updated:
            raise RuntimeError("No se pudo actualizar rol")
        return updated

    def set_active_status(self, user_id: str, is_active: bool) -> User:
        existing = self.get_by_id(user_id)
        if not existing:
            raise UserRepositoryError("Usuario no encontrado")
        if not is_active and existing.is_active and existing.role == "admin" and self.count_active_admins() <= 1:
            raise LastAdminError("No se puede desactivar el ultimo ADMIN activo")

        now = _utc_now()
        with closing(self._connect()) as conn:
            conn.execute(
                "UPDATE users SET is_active = ?, updated_at = ? WHERE id = ?",
                (1 if is_active else 0, now, user_id),
            )
            conn.commit()
        updated = self.get_by_id(user_id)
        if not updated:
            raise RuntimeError("No se pudo actualizar estado")
        return updated

    def reset_password(self, user_id: str, new_password: str) -> User:
        existing = self.get_by_id(user_id)
        if not existing:
            raise UserRepositoryError("Usuario no encontrado")
        _validate_password_strength(new_password)

        now = _utc_now()
        with closing(self._connect()) as conn:
            conn.execute(
                "UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?",
                (hash_password(new_password), now, user_id),
            )
            conn.commit()
        updated = self.get_by_id(user_id)
        if not updated:
            raise RuntimeError("No se pudo resetear password")
        return updated

    def audit_admin_action(
        self,
        *,
        actor_user: str,
        target_user: str,
        action: str,
        result: str,
        ip: str = "unknown",
        user_agent: str = "",
        detail: dict[str, Any] | None = None,
        status_code: int = 200,
    ) -> None:
        from app.core.audit import log_event

        log_event(
            usuario=actor_user,
            ip=ip,
            accion=action,
            resultado=result,
            metodo="ADMIN",
            endpoint=f"/api/admin/users/{target_user}",
            status_code=status_code,
            user_agent=user_agent,
            detalle={"target_user": target_user, **(detail or {})},
        )

    def update_last_login(self, username: str) -> None:
        now = _utc_now()
        with closing(self._connect()) as conn:
            conn.execute(
                "UPDATE users SET last_login_at = ?, updated_at = ? WHERE username = ?",
                (now, now, username.strip().lower()),
            )
            conn.commit()

    def update_password(self, username: str, password: str) -> bool:
        if not password:
            return False
        now = _utc_now()
        password_hash = hash_password(password)
        with closing(self._connect()) as conn:
            result = conn.execute(
                "UPDATE users SET password_hash = ?, updated_at = ? WHERE username = ?",
                (password_hash, now, username.strip().lower()),
            )
            conn.commit()
            return result.rowcount > 0

    def validate_credentials(self, username: str, password: str) -> User | None:
        user = self.get_by_username(username)
        if not user or not user.is_active:
            return None
        try:
            if not verify_password(password, user.password_hash):
                return None
        except Exception:
            return None
        return user

    def has_active_admin(self) -> bool:
        with closing(self._connect()) as conn:
            row = conn.execute(
                "SELECT 1 FROM users WHERE role = 'admin' AND is_active = 1 LIMIT 1"
            ).fetchone()
        return row is not None

    def has_active_demo_users(self) -> bool:
        with closing(self._connect()) as conn:
            row = conn.execute("SELECT 1 FROM users WHERE is_demo = 1 AND is_active = 1 LIMIT 1").fetchone()
        return row is not None

    def ensure_demo_admin_if_demo(self, settings: Settings | None = None) -> list[str]:
        settings = settings or get_settings()
        if settings.is_production or not settings.allow_demo_login:
            return []
        if not (settings.is_demo or settings.demo_mode or settings.mode == "demo"):
            return []

        created_or_updated: list[str] = []
        for seed in DEMO_USER_SEEDS:
            existing = self.get_by_username(seed["username"])
            if existing and not existing.is_demo:
                continue
            if not existing:
                self.create_user(
                    seed["username"],
                    seed["password"],
                    full_name=seed["full_name"],
                    role=seed["role"],
                    is_demo=True,
                    faena=seed["faena"],
                    empresa=seed["empresa"],
                )
                created_or_updated.append(seed["username"])
                continue
            try:
                password_matches = verify_password(seed["password"], existing.password_hash)
            except Exception:
                password_matches = False
            if not password_matches:
                self.update_password(seed["username"], seed["password"])
                created_or_updated.append(seed["username"])
        return created_or_updated

    def ensure_bootstrap_admin(self, settings: Settings | None = None) -> User | None:
        settings = settings or get_settings()
        username = settings.bootstrap_admin_user.strip()
        password = settings.bootstrap_admin_password
        role = normalize_role(settings.bootstrap_admin_role or "ADMIN")

        if not username and not password:
            return None
        if not username or not password:
            raise RuntimeError(
                "NORTHMINE_BOOTSTRAP_ADMIN_USER y NORTHMINE_BOOTSTRAP_ADMIN_PASSWORD deben definirse juntos"
            )
        if settings.is_production and password.strip().lower() in INSECURE_PASSWORDS:
            raise RuntimeError("NORTHMINE_BOOTSTRAP_ADMIN_PASSWORD no puede usar una clave demo en produccion")
        if settings.is_development and not settings.allow_local_bootstrap_admin and not settings.is_demo:
            raise RuntimeError("NORTHMINE_ALLOW_LOCAL_BOOTSTRAP_ADMIN debe ser true para bootstrap local")

        existing = self.get_by_username(username)
        if existing:
            return existing

        return self.create_user(
            username,
            password,
            full_name=settings.bootstrap_admin_full_name or username,
            email=settings.bootstrap_admin_email or None,
            role=role,
            is_demo=False,
            faena="Rajo DES",
            empresa="NORTHMINE",
        )

    def validate_startup_security(self, settings: Settings | None = None) -> None:
        settings = settings or get_settings()
        if not settings.is_production:
            return
        if self.has_active_demo_users():
            raise RuntimeError("La base de usuarios de produccion contiene usuarios demo activos")
        if not self.has_active_admin():
            raise RuntimeError(
                "Produccion requiere al menos un usuario ADMIN activo via NORTHMINE_BOOTSTRAP_ADMIN_*"
            )

    def health_status(self) -> dict[str, Any]:
        try:
            with closing(self._connect()) as conn:
                conn.execute("SELECT 1")
                total = conn.execute("SELECT COUNT(*) AS cnt FROM users").fetchone()["cnt"]
                active = conn.execute("SELECT COUNT(*) AS cnt FROM users WHERE is_active = 1").fetchone()["cnt"]
                admins = conn.execute(
                    "SELECT COUNT(*) AS cnt FROM users WHERE role = 'admin' AND is_active = 1"
                ).fetchone()["cnt"]
                demo_users = conn.execute(
                    "SELECT COUNT(*) AS cnt FROM users WHERE is_demo = 1 AND is_active = 1"
                ).fetchone()["cnt"]
            return {
                "status": "connected",
                "path": str(self.db_path),
                "total_users": int(total),
                "active_users": int(active),
                "active_admins": int(admins),
                "active_demo_users": int(demo_users),
            }
        except Exception as exc:
            return {
                "status": "disconnected",
                "path": str(self.db_path),
                "error": exc.__class__.__name__,
            }


UserRepository = SQLiteUserRepository


@lru_cache(maxsize=1)
def get_user_repository() -> BaseUserRepository:
    return SQLiteUserRepository()


def init_user_repository() -> BaseUserRepository:
    settings = get_settings()
    repository = get_user_repository()
    repository.init_schema()
    repository.ensure_demo_admin_if_demo(settings)
    repository.ensure_bootstrap_admin(settings)
    repository.validate_startup_security(settings)
    return repository
