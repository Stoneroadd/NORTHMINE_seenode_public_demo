from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

try:
    from dotenv import load_dotenv
except Exception:  # pragma: no cover - dotenv is optional at import time
    load_dotenv = None


if load_dotenv:
    env_candidates = [
        os.getenv("NORTHMINE_ENV", ""),
        ".env",
        "backend/.env",
    ]
    for env_path in env_candidates:
        if env_path and Path(env_path).exists():
            load_dotenv(dotenv_path=env_path, override=False)


def _split_csv(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


def _looks_like_placeholder(value: str) -> bool:
    normalized = value.strip().upper()
    return normalized.startswith("REEMPLAZAR") or normalized.startswith("CAMBIAR") or "PLACEHOLDER" in normalized


@dataclass(frozen=True)
class Settings:
    app_name: str
    service_name: str
    version: str
    mode: str
    api_prefix: str
    cors_origins: list[str]
    demo_seed: int
    monthly_target_tons: int | None
    shift_target_tons: int
    # Security
    secret_key: str
    refresh_secret_key: str
    password_salt: str
    environment: str
    demo_mode: bool
    anthropic_api_key: str
    password_history_count: int
    session_timeout_minutes: int
    bcrypt_rounds: int
    log_level: str
    log_dir: str
    audit_db_path: str
    allow_demo_login: bool
    users_db_path: str
    bootstrap_admin_user: str
    bootstrap_admin_password: str
    bootstrap_admin_role: str
    bootstrap_admin_email: str
    bootstrap_admin_full_name: str
    allow_local_bootstrap_admin: bool
    data_mode: str
    sql_server: str
    sql_db: str
    sql_user: str
    sql_password: str

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    @property
    def is_demo(self) -> bool:
        return self.environment == "demo" or self.mode == "demo"

    @property
    def is_development(self) -> bool:
        return self.environment == "development"

    @property
    def origins_list(self) -> list[str]:
        return self.cors_origins

    @property
    def production_errors(self) -> list[str]:
        errors: list[str] = []
        if not self.is_production:
            return errors
        if self.demo_mode:
            errors.append("NORTHMINE_DEMO_MODE must be false in production")
        if self.allow_demo_login:
            errors.append("NORTHMINE_ALLOW_DEMO_LOGIN must be false in production")
        demo_values = {
            "SECRET_KEY": "northmine-demo-access-secret-2026",
            "REFRESH_SECRET_KEY": "northmine-demo-refresh-secret-2026",
            "PASSWORD_SALT": "northmine-salt-2026",
        }
        if self.secret_key == demo_values["SECRET_KEY"]:
            errors.append("SECRET_KEY is using the local demo fallback")
        if _looks_like_placeholder(self.secret_key):
            errors.append("SECRET_KEY is using a placeholder value")
        if self.refresh_secret_key == demo_values["REFRESH_SECRET_KEY"]:
            errors.append("REFRESH_SECRET_KEY is using the local demo fallback")
        if _looks_like_placeholder(self.refresh_secret_key):
            errors.append("REFRESH_SECRET_KEY is using a placeholder value")
        if self.password_salt == demo_values["PASSWORD_SALT"]:
            errors.append("PASSWORD_SALT is using the local demo fallback")
        if _looks_like_placeholder(self.password_salt):
            errors.append("PASSWORD_SALT is using a placeholder value")
        bootstrap_password = self.bootstrap_admin_password.strip()
        if bootstrap_password.lower() in {"admin", "demo", "password", "123456", "12345678", "changeme"}:
            errors.append("NORTHMINE_BOOTSTRAP_ADMIN_PASSWORD is using an unsafe demo value")
        if bootstrap_password and _looks_like_placeholder(bootstrap_password):
            errors.append("NORTHMINE_BOOTSTRAP_ADMIN_PASSWORD is using a placeholder value")
        if any(origin.startswith("http://localhost") or origin.startswith("http://127.0.0.1") for origin in self.cors_origins):
            errors.append("NORTHMINE_CORS_ORIGINS must not contain localhost origins in production")
        return errors

    def require_production_safe(self) -> None:
        errors = self.production_errors
        if errors:
            raise RuntimeError("Unsafe NORTHMINE production configuration: " + "; ".join(errors))


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    default_cors = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000"
    environment = os.getenv("ENVIRONMENT", "development").strip().lower()
    root_dir = Path(__file__).resolve().parents[3]
    # Guard-rail: un entorno demo nunca debe poder apuntar a WENCO real,
    # sin importar como quede configurado NORTHMINE_MODE (error humano,
    # .env mal copiado, etc). ENVIRONMENT=demo fuerza mode=demo.
    data_mode = os.getenv("NORTHMINE_DATA_MODE", "REAL").strip().upper()
    mode = "demo" if environment == "demo" else os.getenv("NORTHMINE_MODE", "sql").lower()
    return Settings(
        app_name=os.getenv("NORTHMINE_APP_NAME", "NORTHMINE SaaS API"),
        service_name=os.getenv("NORTHMINE_SERVICE_NAME", "northmine-api"),
        version=os.getenv("NORTHMINE_VERSION", "2.0.0"),
        mode=mode,
        api_prefix=os.getenv("NORTHMINE_API_PREFIX", "/api"),
        cors_origins=_split_csv(
            os.getenv(
                "NORTHMINE_CORS_ORIGINS",
                default_cors,
            )
        ),
        demo_seed=int(os.getenv("NORTHMINE_DEMO_SEED", "20260529")),
        monthly_target_tons=(
            int(os.getenv("NORTHMINE_MONTHLY_TARGET_TONS", "").strip())
            if os.getenv("NORTHMINE_MONTHLY_TARGET_TONS", "").strip()
            else None
        ),
        shift_target_tons=int(os.getenv("NORTHMINE_SHIFT_TARGET_TONS", "70000").strip() or "70000"),
        secret_key=os.getenv("SECRET_KEY", "northmine-demo-access-secret-2026"),
        refresh_secret_key=os.getenv("REFRESH_SECRET_KEY", "northmine-demo-refresh-secret-2026"),
        password_salt=os.getenv("PASSWORD_SALT", "northmine-salt-2026"),
        environment=environment,
        demo_mode=os.getenv("NORTHMINE_DEMO_MODE", "false").lower() == "true" or data_mode == "DEMO",
        anthropic_api_key=os.getenv("ANTHROPIC_API_KEY", ""),
        password_history_count=int(os.getenv("PASSWORD_HISTORY_COUNT", "5")),
        session_timeout_minutes=int(os.getenv("SESSION_TIMEOUT_MINUTES", "30")),
        bcrypt_rounds=int(os.getenv("BCRYPT_ROUNDS", "12")),
        log_level=os.getenv("LOG_LEVEL", "INFO"),
        log_dir=os.getenv("NORTHMINE_LOG_DIR", str(root_dir / "logs")),
        audit_db_path=os.getenv("NORTHMINE_AUDIT_DB", str(root_dir / "northmine_audit.db")),
        allow_demo_login=os.getenv("NORTHMINE_ALLOW_DEMO_LOGIN", "true").lower() == "true",
        users_db_path=os.getenv("NORTHMINE_USERS_DB", str(root_dir / "northmine_users.db")),
        bootstrap_admin_user=os.getenv("NORTHMINE_BOOTSTRAP_ADMIN_USER", ""),
        bootstrap_admin_password=os.getenv("NORTHMINE_BOOTSTRAP_ADMIN_PASSWORD", ""),
        bootstrap_admin_role=os.getenv("NORTHMINE_BOOTSTRAP_ADMIN_ROLE", "ADMIN"),
        bootstrap_admin_email=os.getenv("NORTHMINE_BOOTSTRAP_ADMIN_EMAIL", ""),
        bootstrap_admin_full_name=os.getenv("NORTHMINE_BOOTSTRAP_ADMIN_FULL_NAME", ""),
        allow_local_bootstrap_admin=os.getenv("NORTHMINE_ALLOW_LOCAL_BOOTSTRAP_ADMIN", "false").lower() == "true",
        data_mode=data_mode,
        sql_server=os.getenv("NORTHMINE_SQL_SERVER", os.getenv("DB_HOST", "")),
        sql_db=os.getenv("NORTHMINE_SQL_DB", os.getenv("DB_NAME", "WENCO")),
        sql_user=os.getenv("NORTHMINE_SQL_USER", os.getenv("DB_USER", "")),
        sql_password=os.getenv("NORTHMINE_SQL_PASSWORD", os.getenv("DB_PASS", "")),
    )
