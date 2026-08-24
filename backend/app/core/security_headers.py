from __future__ import annotations

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import get_settings


PUBLIC_ANALYTICS_PATHS = {
    "/",
    "/brand-prototype",
    "/landing-anterior",
    "/origen",
    "/privacy",
    "/solicitar-demo",
    "/solicitud-recibida",
}


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        response: Response = await call_next(request)
        settings = get_settings()

        response.headers["X-Frame-Options"]        = "DENY"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-XSS-Protection"]       = "1; mode=block"
        response.headers["Referrer-Policy"]        = "strict-origin-when-cross-origin"
        # microphone=(self): la Etapa 7 agrego captura real de microfono
        # (getUserMedia) para el Agent Runtime, que solo la pagina propia
        # necesita (nunca un iframe de terceros - por eso no se abre a "*").
        # Con "()" (vacio, valor original de antes de esa etapa) el navegador
        # rechaza getUserMedia de inmediato para CUALQUIER usuario, en
        # CUALQUIER dispositivo, sin mostrar siquiera el dialogo nativo de
        # permiso - la causa real detras de "el microfono no funciona en
        # ningun dispositivo", no una configuracion del lado del usuario.
        response.headers["Permissions-Policy"] = (
            "geolocation=(), microphone=(self), camera=(), payment=(), usb=(), bluetooth=()"
        )
        # FastAPI genera Swagger/ReDoc con un script inline y recursos CDN.
        # En produccion esos endpoints no existen, asi que la politica puede
        # bloquear por completo scripts inline, que son el vector CSP mas
        # relevante frente a XSS y robo de tokens en el navegador.
        docs_cdn = " https://cdn.jsdelivr.net" if not settings.is_production else ""
        script_inline = " 'unsafe-inline'" if not settings.is_production else ""
        normalized_path = request.url.path.rstrip("/") or "/"
        public_analytics = normalized_path in PUBLIC_ANALYTICS_PATHS
        analytics_script = " https://gc.zgo.at" if public_analytics else ""
        analytics_endpoint = " https://northmine.goatcounter.com" if public_analytics else ""
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            f"script-src 'self' blob:{script_inline}{docs_cdn}{analytics_script}; "
            f"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com{docs_cdn}; "
            "font-src 'self' https://fonts.gstatic.com; "
            "img-src 'self' data: https://*.basemaps.cartocdn.com https://*.tile.openstreetmap.org"
            f"{analytics_endpoint}; "
            f"connect-src 'self' https://api.anthropic.com{analytics_endpoint}; "
            "worker-src 'self' blob:; "
            "object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';"
        )

        # El TLS suele terminar en un proxy/ingress, por lo que el ASGI
        # request interno puede llegar como http. La politica se decide por
        # el perfil de despliegue, no por un header que pueda faltar o ser
        # falsificado por un cliente directo.
        if settings.is_production:
            response.headers["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains; preload"
            )

        try:
            del response.headers["server"]
        except KeyError:
            pass
        try:
            del response.headers["x-powered-by"]
        except KeyError:
            pass

        return response
