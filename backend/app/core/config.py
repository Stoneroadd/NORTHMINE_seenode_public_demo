from __future__ import annotations

import os
import secrets
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from urllib.parse import urlparse

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


_VALID_ENVIRONMENTS = frozenset({"development", "testing", "demo", "production"})


def _is_secure_origin(origin: str) -> bool:
    """Return whether *origin* is a concrete HTTPS web origin.

    CORS origins are security boundaries when credentials are enabled.  A
    production value must therefore be a full HTTPS origin, never a wildcard,
    local address, path, or URL carrying credentials.
    """
    parsed = urlparse(origin)
    host = (parsed.hostname or "").lower()
    return (
        parsed.scheme == "https"
        and bool(host)
        and "*" not in host
        and host not in {"localhost", "::1"}
        and not host.startswith("127.")
        and not parsed.username
        and not parsed.password
        and parsed.path in {"", "/"}
        and not parsed.params
        and not parsed.query
        and not parsed.fragment
    )


def _is_secure_redis_url(value: str) -> bool:
    parsed = urlparse(value)
    return parsed.scheme == "rediss" and bool(parsed.hostname) and bool(parsed.password)


def _random_secret() -> str:
    """Genera un secreto de 256 bits, distinto en cada arranque del proceso.

    Reemplaza los antiguos valores por defecto ("northmine-demo-access-
    secret-2026", etc.), que quedaban fijos en el codigo fuente: cualquiera
    con acceso al repo (o a un fork/clon publico) podia leerlos y forjar
    JWT validos contra cualquier despliegue que arrancara sin SECRET_KEY /
    REFRESH_SECRET_KEY / PASSWORD_SALT en el entorno. Con un secreto
    aleatorio por proceso, ese despliegue sigue arrancando (no rompe el
    demo local), pero nadie puede predecir la clave con solo leer el
    codigo. `require_production_safe()` sigue exigiendo un valor explicito
    por entorno antes de aceptar tráfico en produccion.
    """
    return secrets.token_hex(32)


@dataclass(frozen=True)
class Settings:
    app_name: str
    service_name: str
    version: str
    mode: str
    api_prefix: str
    cors_origins: list[str]
    cors_origins_are_explicit: bool
    demo_seed: int
    monthly_target_tons: int | None
    shift_target_tons: int
    # Security
    secret_key: str
    refresh_secret_key: str
    password_salt: str
    secret_key_is_ephemeral: bool
    refresh_secret_key_is_ephemeral: bool
    password_salt_is_ephemeral: bool
    environment: str
    demo_mode: bool
    anthropic_api_key: str
    password_history_count: int
    session_timeout_minutes: int
    bcrypt_rounds: int
    log_level: str
    log_dir: str
    audit_db_path: str
    demo_access_db_path: str
    demo_access_fingerprint_key: str
    demo_access_fingerprint_key_is_ephemeral: bool
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
    sql_trust_server_certificate: bool
    redis_url: str
    deployment_workers: int
    local_auto_sync_enabled: bool

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
        if self.mode != "sql":
            errors.append("NORTHMINE_MODE must be sql in production")
        if self.data_mode != "REAL":
            errors.append("NORTHMINE_DATA_MODE must be REAL in production")
        if self.demo_mode:
            errors.append("NORTHMINE_DEMO_MODE must be false in production")
        if self.allow_demo_login:
            errors.append("NORTHMINE_ALLOW_DEMO_LOGIN must be false in production")
        if self.secret_key_is_ephemeral:
            errors.append("SECRET_KEY is not set (would use a random per-process value)")
        if _looks_like_placeholder(self.secret_key):
            errors.append("SECRET_KEY is using a placeholder value")
        if len(self.secret_key) < 32:
            errors.append("SECRET_KEY must contain at least 32 characters in production")
        if self.refresh_secret_key_is_ephemeral:
            errors.append("REFRESH_SECRET_KEY is not set (would use a random per-process value)")
        if _looks_like_placeholder(self.refresh_secret_key):
            errors.append("REFRESH_SECRET_KEY is using a placeholder value")
        if len(self.refresh_secret_key) < 32:
            errors.append("REFRESH_SECRET_KEY must contain at least 32 characters in production")
        if self.password_salt_is_ephemeral:
            errors.append("PASSWORD_SALT is not set (would use a random per-process value)")
        if _looks_like_placeholder(self.password_salt):
            errors.append("PASSWORD_SALT is using a placeholder value")
        if len(self.password_salt) < 32:
            errors.append("PASSWORD_SALT must contain at least 32 characters in production")
        if self.demo_access_fingerprint_key_is_ephemeral:
            errors.append(
                "NORTHMINE_DEMO_ACCESS_FINGERPRINT_KEY is not set "
                "(would use a random per-process value)"
            )
        if len(self.demo_access_fingerprint_key) < 32:
            errors.append(
                "NORTHMINE_DEMO_ACCESS_FINGERPRINT_KEY must contain at least "
                "32 characters in production"
            )
        if self.secret_key == self.refresh_secret_key:
            errors.append("SECRET_KEY and REFRESH_SECRET_KEY must be different in production")
        bootstrap_password = self.bootstrap_admin_password.strip()
        if bootstrap_password.lower() in {"admin", "demo", "password", "123456", "12345678", "changeme"}:
            errors.append("NORTHMINE_BOOTSTRAP_ADMIN_PASSWORD is using an unsafe demo value")
        if bootstrap_password and _looks_like_placeholder(bootstrap_password):
            errors.append("NORTHMINE_BOOTSTRAP_ADMIN_PASSWORD is using a placeholder value")
        if not self.cors_origins_are_explicit or not self.cors_origins:
            errors.append("NORTHMINE_CORS_ORIGINS must be explicitly configured in production")
        elif any(not _is_secure_origin(origin) for origin in self.cors_origins):
            errors.append("NORTHMINE_CORS_ORIGINS must contain only concrete HTTPS origins in production")
        if not self.sql_server.strip():
            errors.append("NORTHMINE_SQL_SERVER (or DB_HOST) is not configured")
        if not self.sql_user.strip():
            errors.append("NORTHMINE_SQL_USER (or DB_USER) is not configured")
        if not self.sql_password.strip():
            errors.append("NORTHMINE_SQL_PASSWORD (or DB_PASS) is not configured")
        if self.sql_trust_server_certificate:
            errors.append("NORTHMINE_SQL_TRUST_SERVER_CERTIFICATE must be false in production")
        if not self.redis_url.strip():
            errors.append("NORTHMINE_REDIS_URL is required in production for shared security controls")
        elif not _is_secure_redis_url(self.redis_url):
            errors.append("NORTHMINE_REDIS_URL must use rediss:// with authenticated TLS in production")
        if self.deployment_workers != 1:
            errors.append(
                "NORTHMINE_WORKERS/WEB_CONCURRENCY must be 1 until rate limits and sync locks use shared storage"
            )
        return errors

    @property
    def startup_errors(self) -> list[str]:
        if self.environment not in _VALID_ENVIRONMENTS:
            return (
                [
                    "ENVIRONMENT must be one of: "
                    + ", ".join(sorted(_VALID_ENVIRONMENTS))
                ]
            )
        return self.production_errors

    def require_production_safe(self) -> None:
        errors = self.startup_errors
        if errors:
            raise RuntimeError("Unsafe NORTHMINE production configuration: " + "; ".join(errors))


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    # Cuatro variables de entorno alimentan el concepto de "modo demo", pero
    # esta funcion es la UNICA fuente de verdad que las combina: el resto del
    # backend siempre debe leer Settings.demo_mode / Settings.mode /
    # Settings.is_demo, nunca los env vars crudos (ver core/security.py,
    # core/webhooks.py, corregidos para dejar de hacerlo). Precedencia:
    #   1. ENVIRONMENT=demo fuerza mode="demo" y demo_mode=True sin importar
    #      lo que digan las otras tres (cinturon y tirantes para que un demo
    #      jamas pueda apuntar a WENCO real por error humano).
    #   2. Si ENVIRONMENT no es "demo", NORTHMINE_MODE decide `mode` y
    #      NORTHMINE_DEMO_MODE / NORTHMINE_DATA_MODE=DEMO deciden `demo_mode`
    #      de forma independiente entre si (OR logico).
    default_cors = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174,http://localhost:3000,http://127.0.0.1:3000"
    # Omitted ENVIRONMENT means production on purpose: an accidentally
    # unconfigured server must stop at startup instead of becoming a permissive
    # development/demo deployment. Local workflows must opt in through their
    # explicit .env files or docker-compose.demo.yml.
    environment = os.getenv("ENVIRONMENT", "production").strip().lower()
    root_dir = Path(__file__).resolve().parents[3]
    # Guard-rail: un entorno demo nunca debe poder apuntar a WENCO real,
    # sin importar como quede configurado NORTHMINE_MODE (error humano,
    # .env mal copiado, etc). ENVIRONMENT=demo fuerza mode=demo.
    data_mode = os.getenv("NORTHMINE_DATA_MODE", "REAL").strip().upper()
    mode = "demo" if environment == "demo" else os.getenv("NORTHMINE_MODE", "sql").lower()
    env_secret_key = os.getenv("SECRET_KEY", "").strip()
    env_refresh_secret_key = os.getenv("REFRESH_SECRET_KEY", "").strip()
    env_password_salt = os.getenv("PASSWORD_SALT", "").strip()
    env_demo_access_fingerprint_key = os.getenv(
        "NORTHMINE_DEMO_ACCESS_FINGERPRINT_KEY",
        "",
    ).strip()
    env_cors_origins = os.getenv("NORTHMINE_CORS_ORIGINS", "").strip()
    return Settings(
        app_name=os.getenv("NORTHMINE_APP_NAME", "NORTHMINE SaaS API"),
        service_name=os.getenv("NORTHMINE_SERVICE_NAME", "northmine-api"),
        version=os.getenv("NORTHMINE_VERSION", "2.0.0"),
        mode=mode,
        api_prefix=os.getenv("NORTHMINE_API_PREFIX", "/api"),
        cors_origins=_split_csv(env_cors_origins or default_cors),
        cors_origins_are_explicit=bool(env_cors_origins),
        demo_seed=int(os.getenv("NORTHMINE_DEMO_SEED", "20260529")),
        monthly_target_tons=(
            int(os.getenv("NORTHMINE_MONTHLY_TARGET_TONS", "").strip())
            if os.getenv("NORTHMINE_MONTHLY_TARGET_TONS", "").strip()
            else None
        ),
        shift_target_tons=int(os.getenv("NORTHMINE_SHIFT_TARGET_TONS", "70000").strip() or "70000"),
        secret_key=env_secret_key or _random_secret(),
        refresh_secret_key=env_refresh_secret_key or _random_secret(),
        password_salt=env_password_salt or _random_secret(),
        secret_key_is_ephemeral=not env_secret_key,
        refresh_secret_key_is_ephemeral=not env_refresh_secret_key,
        password_salt_is_ephemeral=not env_password_salt,
        environment=environment,
        demo_mode=os.getenv("NORTHMINE_DEMO_MODE", "false").lower() == "true" or data_mode == "DEMO",
        anthropic_api_key=os.getenv("ANTHROPIC_API_KEY", ""),
        password_history_count=int(os.getenv("PASSWORD_HISTORY_COUNT", "5")),
        session_timeout_minutes=int(os.getenv("SESSION_TIMEOUT_MINUTES", "30")),
        bcrypt_rounds=int(os.getenv("BCRYPT_ROUNDS", "12")),
        log_level=os.getenv("LOG_LEVEL", "INFO"),
        log_dir=os.getenv("NORTHMINE_LOG_DIR", str(root_dir / "logs")),
        audit_db_path=os.getenv("NORTHMINE_AUDIT_DB", str(root_dir / "northmine_audit.db")),
        demo_access_db_path=os.getenv(
            "NORTHMINE_DEMO_ACCESS_DB",
            str(root_dir / "northmine_demo_access.db"),
        ),
        demo_access_fingerprint_key=env_demo_access_fingerprint_key or _random_secret(),
        demo_access_fingerprint_key_is_ephemeral=not env_demo_access_fingerprint_key,
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
        sql_trust_server_certificate=os.getenv("NORTHMINE_SQL_TRUST_SERVER_CERTIFICATE", "false").strip().lower() == "true",
        redis_url=os.getenv("NORTHMINE_REDIS_URL", "").strip(),
        deployment_workers=int(os.getenv("NORTHMINE_WORKERS", os.getenv("WEB_CONCURRENCY", "1"))),
        # Los sincronizadores actuales viven dentro del proceso de la API y
        # usan estado/locks locales. En produccion quedan apagados por defecto
        # para que un futuro despliegue con replicas no duplique importaciones.
        local_auto_sync_enabled=os.getenv(
            "NORTHMINE_LOCAL_AUTO_SYNC_ENABLED",
            "false" if environment == "production" else "true",
        ).strip().lower() == "true",
    )
