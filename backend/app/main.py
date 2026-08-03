from __future__ import annotations

import logging
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.requests import Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.api.routes import router
from app.api.operator_ranking import router as operator_ranking_router
from app.api.demo_access import router as demo_access_router
from app.core.audit import AuditStoreUnavailable, init_audit_db, init_security_tables
from app.core.audit_middleware import AuditMiddleware
from app.core.config import get_settings
from app.core.distributed import verify_shared_services
from app.core.health import build_health_response
from app.core.logging import configure_logging
from app.core.mfa import init_mfa_table
from app.core.rate_limit import limiter
from app.core.security_headers import SecurityHeadersMiddleware
from app.repositories.demo_access_repository import (
    DemoAccessPersistenceError,
    get_demo_access_repository,
)
from app.services.user_repository import init_user_repository

settings = get_settings()
configure_logging(settings)
logger = logging.getLogger("northmine.api")

PROJECT_ROOT = Path(__file__).resolve().parents[2]
FRONTEND_DIST = PROJECT_ROOT / "frontend" / "dist"
FRONTEND_INDEX = FRONTEND_DIST / "index.html"

app = FastAPI(
    title=settings.app_name,
    version="2.0.0",
    description="API segura para NORTHMINE Intelligence Hub.",
    # Swagger/ReDoc listan cada endpoint, su forma y sus modelos: util en
    # desarrollo, un mapa gratis del API para cualquiera en produccion. Se
    # exponen solo fuera de production (mismo criterio que require_production_safe).
    docs_url="/docs" if not settings.is_production else None,
    redoc_url="/redoc" if not settings.is_production else None,
    openapi_url="/openapi.json" if not settings.is_production else None,
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
app.include_router(demo_access_router)

if (FRONTEND_DIST / "assets").exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="frontend-assets")


@app.exception_handler(AuditStoreUnavailable)
async def audit_store_unavailable_handler(request: Request, exc: AuditStoreUnavailable) -> JSONResponse:
    logger.error("Security/audit store unavailable path=%s", request.url.path, exc_info=exc)
    return JSONResponse(status_code=503, content={"detail": "Almacen de seguridad temporalmente no disponible"})


@app.on_event("startup")
def startup() -> None:
    settings.require_production_safe()
    verify_shared_services()
    init_audit_db()
    init_security_tables()
    init_mfa_table()
    init_user_repository()
    demo_access_repository = get_demo_access_repository()
    try:
        demo_access_repository.init_schema()
    except DemoAccessPersistenceError:
        logger.warning(
            "Demo access persistence unavailable backend=%s durable=%s",
            demo_access_repository.backend_name,
            demo_access_repository.durable,
        )
    if settings.local_auto_sync_enabled:
        from app.services.averias_import_service import start_auto_sync
        from app.services.aerial_mail_service import start_auto_sync as start_aerial_sync
        from app.services.cycle_history_service import start_auto_sync as start_cycle_sync

        start_auto_sync()
        start_aerial_sync()
        start_cycle_sync()
    else:
        logger.info("Local auto-sync is disabled; run syncs from a dedicated worker or scheduler")
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


@app.get("/", include_in_schema=False)
def root():
    if FRONTEND_INDEX.exists():
        return FileResponse(
            FRONTEND_INDEX,
            headers={
                "Cache-Control": "no-store, no-cache, must-revalidate",
                "Pragma": "no-cache",
            },
        )
    return {
        "app": settings.app_name,
        "service": settings.service_name,
        "version": settings.version,
        "environment": settings.environment,
        "mode": settings.mode,
        "docs": "/docs" if not settings.is_production else None,
        "health": "/health",
    }


@app.get("/health")
def health_root() -> dict:
    return build_health_response()


@app.get("/{full_path:path}", include_in_schema=False)
def frontend_fallback(full_path: str):
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="Not found")
    requested_file = FRONTEND_DIST / full_path
    if requested_file.exists() and requested_file.is_file():
        return FileResponse(requested_file)
    if FRONTEND_INDEX.exists():
        return FileResponse(
            FRONTEND_INDEX,
            headers={
                "X-Robots-Tag": "noindex, nofollow",
                "Cache-Control": "no-store, no-cache, must-revalidate",
                "Pragma": "no-cache",
            },
        )
    raise HTTPException(status_code=404, detail="Frontend build not found")
