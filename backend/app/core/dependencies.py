from __future__ import annotations

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.audit import AuditStoreUnavailable, is_token_blacklisted, log_event, update_session_activity
from app.core.security import verify_access_token
from app.services.user_repository import get_user_repository

security = HTTPBearer(auto_error=False)


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de autenticación requerido",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = credentials.credentials
    payload = verify_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        blacklisted = is_token_blacklisted(token)
    except AuditStoreUnavailable as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Verificacion de seguridad temporalmente no disponible",
        ) from exc
    if blacklisted:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token revocado. Inicie sesión nuevamente.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    username = str(payload.get("sub", "")).strip().lower()
    if username:
        repository = get_user_repository()
        user = repository.get_by_username(username)
        if not user or not user.is_active:
            log_event(
                usuario=username,
                ip=request.client.host if request.client else "unknown",
                accion="access_denied",
                resultado="inactive_user",
                metodo=request.method,
                endpoint=request.url.path,
                status_code=401,
                user_agent=request.headers.get("user-agent", ""),
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token invalido o expirado",
                headers={"WWW-Authenticate": "Bearer"},
            )
        if payload.get("auth_version") != user.auth_version:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token revocado. Inicie sesiÃ³n nuevamente.",
                headers={"WWW-Authenticate": "Bearer"},
            )

    update_session_activity(token)
    return payload


def require_role(*roles: str):
    async def check_role(request: Request, user: dict = Depends(get_current_user)) -> dict:
        if user.get("rol") not in roles:
            log_event(
                usuario=str(user.get("sub", "anon")),
                ip=request.client.host if request.client else "unknown",
                accion="access_denied",
                resultado="forbidden",
                metodo=request.method,
                endpoint=request.url.path,
                status_code=403,
                user_agent=request.headers.get("user-agent", ""),
                detalle={"required_roles": roles, "role": user.get("rol")},
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Se requiere rol: {', '.join(roles)}",
            )
        return user
    return check_role


async def _require_real_admin(request: Request, user: dict = Depends(get_current_user)) -> dict:
    # RequireAdmin gates real administrative surfaces: gestion de usuarios,
    # deshabilitar MFA ajena, revocar tokens, metricas de seguridad y las
    # solicitudes de acceso al demo (nombre/correo/empresa reales de
    # prospectos, no datos sinteticos). Las cuentas sembradas
    # (admin/demo/supervisor/operador) son credenciales publicas compartidas
    # con quien recibe acceso aprobado al demo -- deben poder explorar el
    # dashboard operacional, pero nunca estas superficies, sin importar que
    # a "admin" se le haya asignado rol admin al sembrarla. is_demo, no rol,
    # es el limite real aqui.
    if user.get("rol") != "admin" or user.get("is_demo"):
        log_event(
            usuario=str(user.get("sub", "anon")),
            ip=request.client.host if request.client else "unknown",
            accion="access_denied",
            resultado="forbidden",
            metodo=request.method,
            endpoint=request.url.path,
            status_code=403,
            user_agent=request.headers.get("user-agent", ""),
            detalle={"required_roles": ("admin",), "role": user.get("rol"), "is_demo": user.get("is_demo")},
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se requiere una cuenta administrativa real, no una cuenta demo.",
        )
    return user


RequireAdmin      = Depends(_require_real_admin)
RequireSupervisor = Depends(require_role("admin", "supervisor"))
RequireOperador   = Depends(require_role("admin", "supervisor", "operador"))
RequireAny        = Depends(get_current_user)
