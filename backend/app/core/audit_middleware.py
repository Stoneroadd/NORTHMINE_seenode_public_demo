from __future__ import annotations

import time

from starlette.middleware.base import BaseHTTPMiddleware

from app.core.audit import log_event
from app.core.config import get_settings
from app.core.security import verify_access_token

SKIP_PATHS = {"/api/health", "/health", "/docs", "/openapi.json", "/redoc", "/"}
PUBLIC_DEMO_ACCESS_PATH = f"{get_settings().api_prefix}/demo-access/requests"


class AuditMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        if request.url.path in SKIP_PATHS:
            return await call_next(request)

        start = time.time()
        response = await call_next(request)
        duration = int((time.time() - start) * 1000)

        usuario = "anon"
        auth = request.headers.get("authorization", "")
        if auth.startswith("Bearer "):
            payload = verify_access_token(auth[7:])
            if payload:
                usuario = payload.get("sub", "anon")
        audit_ip = request.client.host if request.client else "unknown"
        if request.url.path == PUBLIC_DEMO_ACCESS_PATH and usuario == "anon":
            audit_ip = "redacted"

        log_event(
            usuario=usuario,
            ip=audit_ip,
            metodo=request.method,
            endpoint=request.url.path,
            status_code=response.status_code,
            user_agent=request.headers.get("user-agent", "")[:200],
            duracion_ms=duration,
            detalle={"query": str(request.query_params)[:500]},
        )

        return response
