from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.requests import Request
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.api.routes import router
from app.api.operator_ranking import router as operator_ranking_router
from app.core.audit import init_audit_db, init_security_tables
from app.core.audit_middleware import AuditMiddleware
from app.core.config import get_settings
from app.core.health import build_health_response
from app.core.logging import configure_logging
from app.core.mfa import init_mfa_table
from app.core.rate_limit import limiter
from app.core.security_headers import SecurityHeadersMiddleware
from app.services.user_repository import init_user_repository

settings = get_settings()
configure_logging(settings)
logger = logging.getLogger("northmine.api")

app = FastAPI(
    title=settings.app_name,
    version="2.0.0",
    description="API segura para NORTHMINE Intelligence Hub.",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── Middlewares (orden crítico) ────────────────────────────────────────────────
# 1. CORS — permite preflight antes de cualquier check
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Requested-With"],
    max_age=3600,
)

# 2. Security headers — en todas las respuestas
app.add_middleware(SecurityHeadersMiddleware)

# 3. Audit — registra todo después de CORS y headers
app.add_middleware(AuditMiddleware)

# 4. Rate limiter — via slowapi
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.include_router(router)
app.include_router(operator_ranking_router)


@app.on_event("startup")
def startup() -> None:
    settings.require_production_safe()
    init_audit_db()
    init_security_tables()
    init_mfa_table()
    init_user_repository()
    from app.services.averias_import_service import start_auto_sync
    from app.services.aerial_mail_service import start_auto_sync as start_aerial_sync
    from app.services.cycle_history_service import start_auto_sync as start_cycle_sync

    start_auto_sync()
    start_aerial_sync()
    start_cycle_sync()
    logger.info(
        "NORTHMINE API started service=%s version=%s environment=%s mode=%s",
        settings.service_name,
        settings.version,
        settings.environment,
        settings.mode,
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled backend error path=%s", request.url.path)
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Error interno del servicio NORTHMINE.",
            "service": settings.service_name,
        },
    )


@app.get("/")
def root() -> dict[str, str]:
    return {
        "app": settings.app_name,
        "service": settings.service_name,
        "version": settings.version,
        "environment": settings.environment,
        "mode": settings.mode,
        "docs": "/docs",
        "health": "/health",
    }


@app.get("/health")
def health_root() -> dict:
    return build_health_response()
