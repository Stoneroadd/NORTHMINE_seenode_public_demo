from datetime import datetime, timezone
from functools import lru_cache
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Cookie, Depends, File, HTTPException, Query, Request, Response, UploadFile, status
from fastapi.responses import FileResponse, JSONResponse

from app.ai.investigation_router import router as ai_investigations_router
from app.ai.realtime.router import router as ai_agent_realtime_router
from app.ai.runtime.ws_router import router as ai_agent_ws_router
from app.ai.voice.router import router as ai_agent_voice_router
from app.ai.vision.router import router as ai_agent_vision_router
from app.ai.work_products.router import router as ai_agent_work_products_router
from app.ai.demo_tour import router as ai_agent_demo_router
from app.ai.realtime.router import router as ai_agent_realtime_router
from app.api.operational import router as operational_router
from app.mission_control.router import router as mission_control_router
from app.core.audit import (
    blacklist_token,
    check_password_in_history,
    get_active_sessions_count,
    get_audit_log_size_mb,
    get_blocked_ips,
    get_failed_logins_last_hour,
    get_most_active_user,
    log_event,
    query_audit_log,
    register_refresh_session,
    register_active_session,
    remove_user_sessions,
    rotate_refresh_session,
    save_password_history,
)
from app.core.brute_force import is_blocked, record_failure, record_success
from app.core.config import get_settings
from app.core.distributed import SyncAlreadyRunning
from app.core.crypto import decrypt_sensitive_data
from app.core.dependencies import RequireAdmin, RequireAny, RequireOperador, RequireSupervisor, get_current_user
from app.core.request_context import RequestContext, require_resource_scope
from app.core.health import build_health_response, build_liveness_response, build_readiness_response
from app.core.monitoring import build_admin_system_status
from app.core.mfa import (
    disable_mfa,
    enable_mfa,
    generate_mfa_qr,
    get_mfa_data,
    regenerate_backup_codes,
    save_mfa_setup,
    verify_mfa_code,
    verify_totp_code,
)
from app.core.rate_limit import endpoint_limit, limiter
from app.core.security import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    ROLE_PAGES,
    create_access_token,
    create_refresh_token,
    verify_password,
    verify_refresh_token,
)
from app.core.webhooks import send_security_alert
from app.models.schemas import (
    ChangePasswordRequest,
    DisableMFARequest,
    EnableMFARequest,
    LoginRequest,
    LoginResponse,
    ListResponse,
    MFASetupResponse,
    MFAVerifyRequest,
    SecurityMetricsResponse,
    SummaryResponse,
    SystemStatus,
    UserCreateRequest,
    UserListResponse,
    UserPasswordResetRequest,
    UserPublic,
    UserRoleUpdateRequest,
    UserStatusUpdateRequest,
    UserUpdateRequest,
    ActiveBreakdownItem,
    AerialStatus,
    AveriaSummary,
    CurrentShiftSummary,
    DailyProductionItem,
    DistanceSummary,
    HourlyProductionItem,
)
from app.models.security import AIAnalysisRequestSecure, SimulatorRequestSecure
from app.services.data_provider import get_dataset as provider_get_dataset, get_fleet_full as provider_get_fleet_full
from app.services.pdf_report import build_cockpit_executive_pdf, build_shift_pdf
from app.services.kpis import (
    build_alerts,
    build_current_shift_command_center,
    build_equipment_detail,
    build_fleet_overview,
    build_fleet_status,
    build_loading_units_summary,
    build_operational_alerts,
    build_performance_summary,
    build_production_shift,
    build_shift_report,
    build_summary,
)
from app.services.user_repository import DuplicateUserError, LastAdminError, UserRepositoryError, get_user_repository
from app.services import aerial_service, averias_import_service, averias_service, fleet_service, production_service, shift_service
from app.services.simulator import simulate as simulator_simulate
from app.services.filtering import (
    apply_common_filters,
    build_filter_catalog,
    filter_alert_response,
    filter_fleet_full_response,
    filtered_operational_dataset,
    filters_from_query,
    normalize_shift,
)

router = APIRouter(prefix=get_settings().api_prefix)
router.include_router(operational_router)
router.include_router(mission_control_router)
router.include_router(ai_investigations_router)
router.include_router(ai_agent_voice_router)
router.include_router(ai_agent_vision_router)
router.include_router(ai_agent_work_products_router)
router.include_router(ai_agent_ws_router)
router.include_router(ai_agent_demo_router)
router.include_router(ai_agent_realtime_router)


def _filters(request: Request) -> dict[str, str]:
    return filters_from_query(request.query_params)


def _dataset(request: Request) -> dict:
    filters = _filters(request)
    selected_date = filters.get("selected_date") or filters.get("start_date")
    # El filtrado (recorrer y normalizar miles de ciclos) es el costo real por
    # request, no la generacion sintetica (esa ya cachea por minuto en
    # synthetic_provider). Varios widgets de una misma pantalla piden el
    # mismo fecha/filtros en paralelo, asi que se cachea tambien por minuto
    # para no repetir ese trabajo N veces en cada carga de pantalla.
    now_bucket = datetime.now().replace(second=0, microsecond=0)
    return _cached_filtered_dataset(selected_date, tuple(sorted(filters.items())), now_bucket)


@lru_cache(maxsize=128)
def _cached_filtered_dataset(selected_date: str | None, filter_items: tuple[tuple[str, str], ...], now: datetime) -> dict:
    filters = dict(filter_items)
    base_dataset = provider_get_dataset(fecha=selected_date) if selected_date else provider_get_dataset()
    return filtered_operational_dataset(base_dataset, filters)


def _real_only_error(endpoint: str, detail: str | None = None) -> None:
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail={
            "status": "DISABLED",
            "error_code": "REAL_DATA_ONLY",
            "endpoint": endpoint,
            "message": detail or "Endpoint deshabilitado: NORTHMINE esta configurado para usar solo datos reales WENCO/SQL.",
            "data_source": "REAL_REQUIRED",
        },
    )


def _real_data_unavailable(path: str, exc: Exception) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={
            "status": "ERROR",
            "data_source": "REAL",
            "source_system": "WENCO",
            "backend_status": "CONNECTED",
            "data_source_status": "DISCONNECTED",
            "error_code": "REAL_DATA_UNAVAILABLE",
            "message": f"Datos reales WENCO no disponibles para {path}.",
            "detail": str(exc),
            "generated_at": datetime.now(timezone.utc).isoformat(),
        },
    )


def _shift_from_request(request: Request, fallback: str | None = "ACTUAL") -> str | None:
    filters = _filters(request)
    return normalize_shift(filters.get("shift") or fallback) or fallback


def _session_mode(settings) -> str:
    if settings.mode in {"demo", "sql"}:
        return settings.mode
    return "demo" if settings.is_demo else "sql"


def _client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


def _is_public_demo_runtime() -> bool:
    settings = get_settings()
    return settings.is_demo or settings.demo_mode or settings.mode == "demo" or settings.data_mode == "DEMO"


def _protect_demo_audit_rows(rows: list[dict]) -> list[dict]:
    if not _is_public_demo_runtime():
        return rows
    return [{**row, "ip": "PROTEGIDA"} for row in rows]


def _protect_demo_system_status(system: dict) -> dict:
    if not _is_public_demo_runtime():
        return system
    protected = {
        **system,
        "backend": {
            **system.get("backend", {}),
            "pid": 0,
            "platform": "entorno administrado",
            "python": "protegido",
        },
        "frontend": {
            **system.get("frontend", {}),
            "expected_origin": "entorno demo protegido",
        },
        "logs": {
            "directory": "protegido",
            "recent_errors": [],
        },
    }
    return protected


def _user_token_claims(user, settings) -> dict:
    return {
        "sub": user.username,
        "uid": user.id,
        "rol": user.role,
        "mode": _session_mode(settings),
        "environment": settings.environment,
        "is_demo": user.is_demo,
        # Bumping this value invalidates all previously issued access *and*
        # refresh tokens for the user without preventing a later fresh login.
        "auth_version": user.auth_version,
    }


def _invalidate_auth_sessions(repository, username: str) -> None:
    repository.invalidate_auth_sessions(username)
    remove_user_sessions(username)


def _to_user_public(user) -> UserPublic:
    return UserPublic(**user.public_dict())


def _audit_admin_user_action(
    repository,
    request: Request,
    actor: dict,
    target_user: str,
    action: str,
    result: str,
    *,
    status_code: int = 200,
    detail: dict | None = None,
) -> None:
    repository.audit_admin_action(
        actor_user=str(actor.get("sub", "unknown")),
        target_user=target_user,
        action=action,
        result=result,
        ip=_client_ip(request),
        user_agent=request.headers.get("user-agent", ""),
        detail=detail,
        status_code=status_code,
    )


# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
# AUTH â€” pÃºblicos
# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

@router.post("/auth/login")
@limiter.limit(endpoint_limit("/api/auth/login"))
def login(request: Request, payload: LoginRequest, response: Response, background_tasks: BackgroundTasks) -> dict:
    settings = get_settings()
    ip = _client_ip(request)
    user_agent = request.headers.get("user-agent", "")
    username = payload.username.strip().lower()

    if settings.is_production and (settings.demo_mode or settings.allow_demo_login):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Autenticacion demo deshabilitada en produccion",
        )

    blocked, remaining = is_blocked(ip)
    if blocked:
        log_event(
            usuario=username or "anon",
            ip=ip,
            accion="login_failed",
            resultado="blocked",
            metodo="POST",
            endpoint="/api/auth/login",
            status_code=429,
            user_agent=user_agent,
        )
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"IP bloqueada por mÃºltiples intentos fallidos. Espera {remaining} segundos.",
            headers={"Retry-After": str(remaining)},
        )

    repository = get_user_repository()
    user = repository.validate_credentials(username, payload.password)
    if not user:
        record_failure(ip)
        log_event(
            usuario=username or "anon",
            ip=ip,
            accion="login_failed",
            resultado="error",
            metodo="POST",
            endpoint="/api/auth/login",
            status_code=401,
            user_agent=user_agent,
            detalle={"username": username},
        )
        send_security_alert(background_tasks, "LOGIN_FAILED", {"username": username, "ip": ip}, severity="warning")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales invÃ¡lidas",
        )

    mfa_data = get_mfa_data(user.username)
    if mfa_data and mfa_data["enabled"]:
        if not payload.mfa_code or not verify_mfa_code(user.username, payload.mfa_code):
            log_event(
                usuario=user.username,
                ip=ip,
                accion="login_failed",
                resultado="mfa_error",
                metodo="POST",
                endpoint="/api/auth/login",
                status_code=401,
                user_agent=user_agent,
            )
            send_security_alert(background_tasks, "MFA_FAILED", {"username": user.username, "ip": ip}, severity="warning")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="CÃ³digo MFA requerido o invÃ¡lido",
            )

    record_success(ip)
    repository.update_last_login(user.username)

    claims = _user_token_claims(user, settings)
    access_token = create_access_token(claims)
    refresh_token = create_refresh_token(claims)
    refresh_payload = verify_refresh_token(refresh_token)
    if not refresh_payload or not register_refresh_session(refresh_payload):
        raise HTTPException(status_code=500, detail="No se pudo crear la sesiÃ³n de renovaciÃ³n")

    register_active_session(user.username, access_token, ip, user_agent)

    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=settings.is_production,
        samesite="strict",
        max_age=60 * 60 * 24 * 7,
        path="/api/auth/refresh",
    )

    log_event(
        usuario=user.username,
        ip=ip,
        accion="login_success",
        resultado="ok",
        metodo="POST",
        endpoint="/api/auth/login",
        status_code=200,
        user_agent=user_agent,
        detalle={"role": user.role, "is_demo": user.is_demo},
    )
    send_security_alert(background_tasks, "LOGIN_SUCCESS", {"username": user.username, "rol": user.role, "ip": ip})

    return {
        "user_id": user.id,
        "username": user.username,
        "nombre": user.full_name,
        "rol": user.role,
        "faena": user.faena,
        "empresa": user.empresa,
        "access_token": access_token,
        # El refresh token vive solo en la cookie httpOnly seteada arriba.
        # Antes tambien se devolvia aqui en texto plano: cualquier script con
        # acceso a la respuesta (o un log que la capture) podia leerlo, lo
        # que anulaba la proteccion de httpOnly. El frontend ya no lo lee de
        # aqui (ver authService.saveSession, que lo descartaba igual).
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "modo": _session_mode(settings),
        "sql_disponible": False,
        "is_demo": user.is_demo,
    }


@router.post("/auth/refresh")
@limiter.limit(endpoint_limit("/api/auth/refresh"))
def refresh_token(
    request: Request,
    response: Response,
    refresh_token_cookie: str | None = Cookie(default=None, alias="refresh_token"),
) -> dict:
    settings = get_settings()
    token = refresh_token_cookie
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token requerido")

    payload = verify_refresh_token(token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token invÃ¡lido o expirado")

    username = str(payload.get("sub", "")).strip().lower()
    repository = get_user_repository()
    user = repository.get_by_username(username)
    if not user or not user.is_active or payload.get("auth_version") != user.auth_version:
        log_event(
            usuario=username or "anon",
            ip=_client_ip(request),
            accion="token_refresh",
            resultado="error",
            metodo="POST",
            endpoint="/api/auth/refresh",
            status_code=401,
            user_agent=request.headers.get("user-agent", ""),
        )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token invalido o expirado")

    claims = _user_token_claims(user, settings)
    new_access = create_access_token(claims)
    new_refresh = create_refresh_token(claims)
    new_refresh_payload = verify_refresh_token(new_refresh)
    if not new_refresh_payload or not rotate_refresh_session(payload, new_refresh_payload):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token revocado o ya utilizado")

    response.set_cookie(
        key="refresh_token",
        value=new_refresh,
        httponly=True,
        secure=settings.is_production,
        samesite="strict",
        max_age=60 * 60 * 24 * 7,
        path="/api/auth/refresh",
    )

    log_event(
        usuario=user.username,
        ip=_client_ip(request),
        accion="token_refresh",
        resultado="ok",
        metodo="POST",
        endpoint="/api/auth/refresh",
        status_code=200,
        user_agent=request.headers.get("user-agent", ""),
        detalle={"role": user.role, "is_demo": user.is_demo},
    )

    return {
        "access_token": new_access,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    }


@router.post("/auth/logout")
def logout(request: Request, response: Response, background_tasks: BackgroundTasks, user: dict = RequireAny) -> dict:
    auth = request.headers.get("authorization", "")
    username = user.get("sub", "unknown")
    if auth.startswith("Bearer "):
        token = auth[7:]
        expires_at = datetime.fromtimestamp(user.get("exp", 0), tz=timezone.utc).isoformat()
        blacklist_token(token, username, expires_at)
    _invalidate_auth_sessions(get_user_repository(), username)
    response.delete_cookie("refresh_token", path="/api/auth/refresh")
    log_event(
        usuario=username,
        ip=_client_ip(request),
        accion="logout",
        resultado="ok",
        metodo="POST",
        endpoint="/api/auth/logout",
        status_code=200,
        user_agent=request.headers.get("user-agent", ""),
    )
    send_security_alert(background_tasks, "LOGOUT", {"username": username})
    return {"message": "SesiÃ³n cerrada token revocado"}


@router.get("/auth/me")
def me(user: dict = RequireAny) -> dict:
    settings = get_settings()
    repository = get_user_repository()
    record = repository.get_by_username(str(user.get("sub", "")).strip().lower())
    return {
        "sub": user.get("sub"),
        "uid": user.get("uid"),
        "rol": user.get("rol"),
        "mode": user.get("mode", "demo"),
        "environment": user.get("environment"),
        "is_demo": bool(user.get("is_demo", False)),
        # Perfil completo (no viaja en el JWT): permite reconstruir la sesion
        # en el frontend tras un refresh silencioso sin volver a pedir login,
        # sin necesitar guardar el access token en localStorage.
        "user_id": record.id if record else user.get("uid"),
        "username": record.username if record else user.get("sub"),
        "nombre": record.full_name if record else user.get("sub"),
        "faena": record.faena if record else "",
        "empresa": record.empresa if record else "",
        "modo": _session_mode(settings),
        "sql_disponible": False,
    }


# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
# MFA â€” autenticados
# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

@router.post("/auth/mfa/setup")
@limiter.limit(endpoint_limit("/api/auth/mfa/setup"))
def mfa_setup(request: Request, user: dict = RequireAny) -> MFASetupResponse:
    import pyotp
    username = user.get("sub", "")
    secret = pyotp.random_base32()
    backup_codes = [pyotp.random_base32()[:8] for _ in range(10)]
    save_mfa_setup(username, secret, backup_codes)
    qr_base64 = generate_mfa_qr(username, secret)
    return MFASetupResponse(secret=secret, qr_base64=qr_base64, backup_codes=backup_codes)


@router.post("/auth/mfa/verify")
@limiter.limit(endpoint_limit("/api/auth/mfa/verify"))
def mfa_verify(request: Request, payload: MFAVerifyRequest, user: dict = RequireAny) -> dict:
    username = user.get("sub", "")
    mfa_data = get_mfa_data(username)
    if not mfa_data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="MFA no configurado")
    # verify_totp_code, no verify_mfa_code: en este punto mfa_enabled todavia
    # es False (se confirma antes de activarlo), y verify_mfa_code trata
    # "no habilitado" como pase automatico -- aceptaria cualquier codigo.
    if verify_totp_code(mfa_data["secret"], payload.code):
        enable_mfa(username)
        return {"message": "MFA activado correctamente", "enabled": True}
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="CÃ³digo invÃ¡lido")


@router.post("/auth/mfa/disable")
def mfa_disable(payload: DisableMFARequest, request: Request, background_tasks: BackgroundTasks, user: dict = RequireAdmin) -> dict:
    disable_mfa(payload.username)
    send_security_alert(background_tasks, "MFA_DISABLED", {"admin": user.get("sub"), "target": payload.username}, severity="warning")
    return {"message": f"MFA deshabilitado para {payload.username}"}


@router.post("/auth/mfa/regenerate-codes")
def mfa_regenerate_codes(user: dict = RequireAny) -> dict:
    username = user.get("sub", "")
    new_codes = regenerate_backup_codes(username)
    return {"backup_codes": new_codes}


@router.get("/auth/mfa/status")
def mfa_status(user: dict = RequireAny) -> dict:
    username = user.get("sub", "")
    mfa_data = get_mfa_data(username)
    return {"enabled": bool(mfa_data and mfa_data["enabled"]), "setup": bool(mfa_data is not None)}


# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
# HEALTH â€” pÃºblico
# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

@router.get("/health")
def health() -> dict:
    return build_health_response()


@router.get("/health/live")
def health_live() -> dict:
    return build_liveness_response()


@router.get("/health/ready")
def health_ready() -> JSONResponse:
    payload, status_code = build_readiness_response()
    return JSONResponse(status_code=status_code, content=payload)


# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
# SISTEMA
# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

@router.get("/system/status", response_model=SystemStatus)
def system_status(user: dict = RequireAny) -> SystemStatus:
    settings = get_settings()
    try:
        summary = build_summary(provider_get_dataset())
    except Exception:
        summary = {
            "source": "wenco-unavailable",
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }
    return SystemStatus(
        app=settings.app_name,
        mode=settings.mode,
        sql_available=settings.mode == "sql",
        data_source=summary["source"],
        generated_at=summary["generated_at"],
    )


# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
# DATOS (todos protegidos con RequireAny)
# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

@router.get("/filters/catalog")
def filters_catalog(user: dict = RequireAny) -> dict:
    return build_filter_catalog(provider_get_dataset())


@router.get("/summary", response_model=SummaryResponse)
def operational_summary(request: Request, user: dict = RequireAny) -> dict:
    return build_summary(_dataset(request))


@router.get("/demo/summary", response_model=SummaryResponse)
def demo_summary(request: Request, user: dict = RequireAny) -> dict:
    _real_only_error("/api/demo/summary", "Usa /api/summary. El endpoint demo fue deshabilitado.")


@router.get("/production/cycles")
def production_cycles(
    request: Request,
    limit: Annotated[int, Query(ge=1, le=5000)] = 500,
    user: dict = RequireAny,
) -> dict:
    dataset = _dataset(request)
    records = sorted(
        dataset["cycles"],
        key=lambda r: r["datetime"],
        reverse=True,
    )
    return {"source": dataset.get("source", "wenco-sql-live"), "count": len(records), "limit": limit, "items": records[:limit]}


@router.get("/production/shift")
def production_shift(
    request: Request,
    turno: Annotated[str, Query()] = "ACTUAL",
    user: dict = RequireAny,
) -> dict:
    try:
        dataset = _dataset(request)
    except Exception as exc:
        return _real_data_unavailable("/api/production/shift", exc)
    return build_production_shift(dataset, turno=_shift_from_request(request, turno))


@router.get("/current-shift/command-center")
def current_shift_command_center(request: Request, user: dict = RequireAny) -> dict:
    return build_current_shift_command_center(_dataset(request))


@router.get("/performance/summary")
def performance_summary(
    request: Request,
    desde: Annotated[str | None, Query()] = None,
    hasta: Annotated[str | None, Query()] = None,
    user: dict = RequireAny,
) -> dict:
    filters = _filters(request)
    return build_performance_summary(_dataset(request), desde=filters.get("start_date") or desde, hasta=filters.get("end_date") or hasta)


@router.get("/fleet/status")
def fleet_status(
    request: Request,
    turno: Annotated[str, Query()] = "ACTUAL",
    user: dict = RequireAny,
) -> dict:
    response = build_fleet_overview(_dataset(request), turno=_shift_from_request(request, turno))
    rows = apply_common_filters(response["items"], _filters(request))
    total = len(rows)
    mantencion = sum(1 for item in rows if item["estado"] == "MANTENCION")
    activos = sum(1 for item in rows if item["estado"] == "ACTIVO")
    demora = sum(1 for item in rows if item["estado"] == "DEMORA")
    standby = sum(
        1
        for item in rows
        if item["estado"] == "STANDBY"
        or str(item.get("status_category") or "").upper() == "STANDBY"
        or str(item.get("status_code") or "").upper().startswith("S")
    )
    sin_actividad = sum(1 for item in rows if item["estado"] == "SIN ACTIVIDAD")
    disponibles = total - mantencion
    flota_productiva_base = max(disponibles - standby, 1)
    return {
        **response,
        "total_equipos": total,
        "equipos_activos": activos,
        "equipos_en_demora": demora,
        "equipos_sin_actividad": sin_actividad,
        "equipos_mantencion": mantencion,
        "equipos_standby": standby,
        "utilizacion_pct": round(activos / flota_productiva_base * 100, 1),
        "disponibilidad_pct": round(disponibles / max(total, 1) * 100, 1),
        "lista_equipos": rows,
        "items": rows,
        "count": total,
    }


@router.get("/fleet/full")
def fleet_full(
    request: Request,
    dias: Annotated[int, Query(ge=1, le=31)] = 7,
    user: dict = RequireAny,
) -> dict:
    fleet_data = provider_get_fleet_full(dias=dias)
    return filter_fleet_full_response(fleet_data, _filters(request))


@router.get("/loading-units/summary")
def loading_units_summary(
    request: Request,
    turno: Annotated[str, Query()] = "ACTUAL",
    user: dict = RequireAny,
) -> dict:
    response = build_loading_units_summary(_dataset(request), turno=_shift_from_request(request, turno))
    filters = _filters(request)
    items = apply_common_filters(response["items"], filters)
    total_toneladas = sum(item["toneladas"] for item in items)
    return {
        **response,
        "count": len(items),
        "items": items,
        "unidades": items,
        "total_toneladas": total_toneladas,
        "rendimiento_promedio_tph": round(sum(item["rendimiento_tph"] for item in items) / max(len(items), 1), 1),
    }


@router.get("/alerts", response_model=ListResponse)
def alerts(request: Request, user: dict = RequireAny) -> dict:
    dataset = _dataset(request)
    summary = build_summary(dataset)
    fleet   = build_fleet_status(dataset)
    items   = build_alerts(summary, fleet, dataset=dataset)
    items = apply_common_filters(items, _filters(request))
    return {"source": dataset.get("source", "wenco-sql-live"), "count": len(items), "items": items}


@router.get("/alerts/operational")
def operational_alerts(request: Request, user: dict = RequireAny) -> dict:
    return filter_alert_response(build_operational_alerts(_dataset(request)), _filters(request))


@router.get("/equipment/{equipment_id}/detail")
def equipment_detail(equipment_id: str, user: dict = RequireAny) -> dict:
    return build_equipment_detail(equipment_id)


@router.get("/reports/shift")
def shift_report(
    request: Request,
    turno: Annotated[str, Query()] = "ACTUAL",
    user: dict = RequireAny,
) -> dict:
    try:
        dataset = _dataset(request)
    except Exception as exc:
        return _real_data_unavailable("/api/reports/shift", exc)
    return build_shift_report(dataset, turno=_shift_from_request(request, turno))



@router.get("/operations/daily-production", response_model=list[DailyProductionItem])
def operations_daily_production(request: Request, user: dict = RequireSupervisor) -> list[dict]:
    return production_service.get_daily_production(_dataset(request))


@router.get("/operations/hourly-production", response_model=list[HourlyProductionItem])
def operations_hourly_production(
    request: Request,
    turno: Annotated[str, Query()] = "ACTUAL",
    user: dict = RequireSupervisor,
) -> list[dict]:
    return production_service.get_hourly_production(_dataset(request), turno=_shift_from_request(request, turno))


@router.get("/operations/current-shift", response_model=CurrentShiftSummary)
def operations_current_shift(
    request: Request,
    turno: Annotated[str, Query()] = "ACTUAL",
    user: dict = RequireOperador,
) -> dict:
    return production_service.get_shift_current(_dataset(request), turno=_shift_from_request(request, turno))


@router.get("/shift/current")
def shift_current(request: Request, user: dict = RequireOperador) -> dict:
    return shift_service.get_current_shift_summary(_dataset(request))


@router.get("/shift/hourly-tonnage")
def shift_hourly_tonnage(request: Request, user: dict = RequireOperador) -> dict:
    return shift_service.get_shift_hourly_tonnage(_dataset(request))


@router.get("/shift/loading-units")
def shift_loading_units(request: Request, user: dict = RequireOperador) -> dict:
    return shift_service.get_loading_unit_performance(_dataset(request))


@router.get("/shift/caex-ranking")
def shift_caex_ranking(request: Request, user: dict = RequireOperador) -> dict:
    return shift_service.get_shift_caex_ranking(_dataset(request))


@router.get("/shift/export")
def shift_export(
    request: Request,
    export_type: Annotated[str, Query(pattern="^(shift|caex|loading)$")] = "shift",
    user: dict = RequireOperador,
) -> Response:
    csv_payload = shift_service.export_shift_csv(_dataset(request), export_type=export_type)
    filename = f"northmine_{export_type}_export.csv"
    return Response(
        content=csv_payload,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/shift/export.xlsx")
def shift_export_xlsx(
    request: Request,
    export_type: Annotated[str, Query(pattern="^(shift|caex|loading)$")] = "shift",
    user: dict = RequireOperador,
) -> Response:
    xlsx_payload = shift_service.export_shift_xlsx(_dataset(request), export_type=export_type)
    filename = f"northmine_{export_type}_export.xlsx"
    return Response(
        content=xlsx_payload,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/fleet/caex-ranking")
def fleet_caex_ranking(dias: Annotated[int, Query(ge=1, le=31)] = 7, user: dict = RequireOperador) -> dict:
    return fleet_service.get_caex_ranking_by_tonnage(dias=dias)


@router.get("/fleet/caex-by-model")
def fleet_caex_by_model(dias: Annotated[int, Query(ge=1, le=31)] = 7, user: dict = RequireOperador) -> dict:
    return fleet_service.get_caex_ranking_by_model(dias=dias)


@router.get("/fleet/fastest")
def fleet_fastest(dias: Annotated[int, Query(ge=1, le=31)] = 7, user: dict = RequireOperador) -> dict:
    return fleet_service.get_caex_fastest(dias=dias)


@router.get("/fleet/slowest")
def fleet_slowest(dias: Annotated[int, Query(ge=1, le=31)] = 7, user: dict = RequireOperador) -> dict:
    return fleet_service.get_caex_slowest(dias=dias)


@router.get("/fleet/cycle-time")
def fleet_cycle_time(dias: Annotated[int, Query(ge=1, le=31)] = 7, user: dict = RequireOperador) -> dict:
    return fleet_service.get_caex_cycle_time(dias=dias)


@router.get("/fleet/distance", response_model=DistanceSummary)
def fleet_distance(request: Request, user: dict = RequireOperador) -> dict:
    return fleet_service.get_caex_distance_summary(_dataset(request))


@router.get("/loading-units/ranking")
def loading_units_ranking(
    request: Request,
    turno: Annotated[str, Query()] = "ACTUAL",
    user: dict = RequireSupervisor,
) -> dict:
    return shift_service.get_loading_unit_ranking(_dataset(request), turno=_shift_from_request(request, turno))


@router.get("/loading-units/hourly")
def loading_units_hourly(request: Request, user: dict = RequireSupervisor) -> dict:
    return shift_service.get_loading_unit_hourly_performance(_dataset(request))


@router.get("/loading-units/distance-cycle")
def loading_units_distance_cycle(request: Request, user: dict = RequireSupervisor) -> dict:
    return shift_service.get_loading_unit_distance_per_cycle(_dataset(request))


@router.get("/loading-units/routes")
def loading_units_routes(request: Request, user: dict = RequireSupervisor) -> dict:
    return shift_service.get_loading_unit_routes(_dataset(request))


@router.get("/shift/report-dates")
def shift_report_dates(request: Request, user: dict = RequireOperador) -> dict:
    # Sin dataset del request: el servicio carga una ventana ampliada de dias.
    return shift_service.get_shift_report_dates(None)


@router.get("/shift/report-snapshot")
def shift_report_snapshot(
    request: Request,
    fecha: str = Query(..., min_length=10, max_length=10),
    turno: str = Query(default="NOCHE"),
    user: dict = RequireOperador,
) -> dict:
    return shift_service.get_shift_report_snapshot(None, fecha=fecha, turno=turno)


@router.get("/averias/summary", response_model=AveriaSummary)
def averias_summary(request: Request, user: dict = RequireOperador) -> dict:
    return averias_service.get_averias_summary(_dataset(request))


@router.get("/averias/active")
def averias_active(request: Request, user: dict = RequireOperador) -> dict:
    return averias_service.get_active_breakdowns(_dataset(request))


@router.get("/averias/history")
def averias_history(request: Request, user: dict = RequireOperador) -> dict:
    return averias_service.get_breakdown_history(_dataset(request))


@router.get("/averias/inactivity-alerts")
def averias_inactivity_alerts(request: Request, user: dict = RequireOperador) -> dict:
    return averias_service.get_inactivity_alerts(_dataset(request))


@router.post("/averias/import-xls")
@limiter.limit(endpoint_limit("/api/averias/import-xls"))
async def averias_import_xls(request: Request, file: UploadFile = File(...), user: dict = RequireSupervisor) -> dict:
    max_bytes = averias_import_service.MAX_WORKBOOK_BYTES
    if file.size is not None and file.size > max_bytes:
        raise HTTPException(status_code=413, detail=f"Archivo excede el limite de {max_bytes // (1024 * 1024)} MB")
    chunks: list[bytes] = []
    total = 0
    while chunk := await file.read(1024 * 1024):
        total += len(chunk)
        if total > max_bytes:
            raise HTTPException(status_code=413, detail=f"Archivo excede el limite de {max_bytes // (1024 * 1024)} MB")
        chunks.append(chunk)
    data = b"".join(chunks)
    try:
        return averias_import_service.import_workbook_bytes(data, file.filename or "reporte.xlsx", origen="manual")
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.post("/averias/mail-sync")
@limiter.limit(endpoint_limit("/api/averias/mail-sync"))
def averias_mail_sync(request: Request, user: dict = RequireSupervisor) -> dict:
    try:
        return averias_import_service.sync_all()
    except SyncAlreadyRunning as exc:
        raise HTTPException(status_code=409, detail="Ya hay una sincronizacion de averias en curso") from exc


@router.get("/averias/mail-status")
def averias_mail_status(user: dict = RequireOperador) -> dict:
    return averias_import_service.get_mail_status()


@router.get("/averias/fleet-detail")
def averias_fleet_detail(days: int = Query(default=31, ge=1, le=365), user: dict = RequireOperador) -> dict:
    return averias_import_service.get_fleet_breakdown(days=days)


@router.get("/averias/insights")
def averias_insights(days: int = Query(default=31, ge=1, le=365), user: dict = RequireOperador) -> dict:
    from app.services import averias_insights_service

    return averias_insights_service.get_insights(days=days)


@router.get("/fleet/shift-status-sources")
def fleet_shift_status_sources(request: Request, user: dict = RequireOperador) -> dict:
    """Fuentes para autocompletar el checklist de cierre de turno."""
    data = shift_service.get_current_shift_summary(_dataset(request))
    from app.services.averias_import_service import get_latest_fleet_estado

    def _subset(item: dict, id_key: str) -> dict:
        return {
            "id": item.get(id_key),
            "estado": item.get("estado"),
            "status_category": item.get("status_category"),
            "status_desc": item.get("status_desc"),
            "destino": item.get("destino_principal") or item.get("destino_actual"),
        }

    return {
        "wenco_caex": [_subset(item, "caex_id") for item in data.get("caex_status", [])],
        "wenco_uc": [_subset(item, "carguio_id") for item in data.get("loading_units", [])],
        "averias": get_latest_fleet_estado(),
        "generated_at": data.get("generated_at"),
    }


@router.get("/analysis/expert")
def analysis_expert(days: int = Query(default=90, ge=7, le=365), user: dict = RequireOperador) -> dict:
    from app.services import expert_analysis_service

    return expert_analysis_service.get_expert_analysis(days=days)


@router.get("/analysis/cycles-status")
def analysis_cycles_status(user: dict = RequireOperador) -> dict:
    from app.services import cycle_history_service

    return cycle_history_service.get_history_status()


@router.get("/dispatch/filters")
def dispatch_filters(days: int = Query(default=30, ge=1, le=365), user: dict = RequireOperador) -> dict:
    from app.services import dispatch_intelligence_service

    return dispatch_intelligence_service.get_dispatch_filters(days=days)


@router.get("/dispatch/cycle-anomalies")
def dispatch_cycle_anomalies(
    fecha: str | None = Query(default=None),
    turno: str | None = Query(default=None),
    caex_id: str | None = Query(default=None),
    carguio_id: str | None = Query(default=None),
    fase: str | None = Query(default=None),
    malla: str | None = Query(default=None),
    user: dict = RequireOperador,
) -> dict:
    from app.services import dispatch_intelligence_service

    return dispatch_intelligence_service.get_cycle_anomalies(
        fecha=fecha, turno=turno, caex_id=caex_id, carguio_id=carguio_id, fase=fase, malla=malla,
    )


@router.get("/aerial/status", response_model=AerialStatus)
def aerial_status(user: dict = RequireSupervisor) -> dict:
    return aerial_service.get_latest_aerial_status()


@router.get("/aerial/files")
def aerial_files(user: dict = RequireSupervisor) -> dict:
    return aerial_service.list_available_aerial_files()


@router.get("/aerial/preview")
def aerial_preview(file: str = Query(..., min_length=1, max_length=200), user: dict = RequireOperador) -> FileResponse:
    try:
        preview = aerial_service.get_or_build_preview(file)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    if preview is None:
        raise HTTPException(status_code=404, detail="Ortomosaico no encontrado.")
    return FileResponse(preview, media_type="image/jpeg")


@router.post("/aerial/mail-sync")
def aerial_mail_sync(user: dict = RequireSupervisor) -> dict:
    from app.services import aerial_mail_service

    try:
        return aerial_mail_service.sync_all_sources()
    except SyncAlreadyRunning as exc:
        raise HTTPException(status_code=409, detail="Ya hay una sincronizacion aerea en curso") from exc


@router.get("/aerial/mail-status")
def aerial_mail_status(user: dict = RequireOperador) -> dict:
    from app.services import aerial_mail_service

    return aerial_mail_service.get_sync_status()


def _real_status_events(request: Request, *, status_filter: str | None = None) -> list[dict]:
    response = averias_service.get_breakdown_history(_dataset(request), dias=31)
    rows = []
    for item in response.get("items", []):
        status_value = str(item.get("status") or "")
        if status_filter and status_value != status_filter:
            continue
        rows.append(
            {
                **item,
                "timestamp": item.get("started_at") or item.get("last_activity"),
                "fecha": str(item.get("started_at") or item.get("last_activity") or "")[:10],
                "equipment_id": item.get("equipment_id"),
                "caex_id": item.get("equipment_id"),
                "model": item.get("model"),
                "modelo": item.get("model"),
                "status": status_value,
                "estado": status_value,
                "severity": item.get("severity"),
                "severidad": item.get("severity"),
                "event_category": status_value,
                "categoria": status_value,
            }
        )
    return apply_common_filters(rows, _filters(request))


@router.get("/operations/summary")
def operations_summary(request: Request, user: dict = RequireAny) -> dict:
    return production_service.get_operations_summary(_dataset(request), role=str(user.get("rol", "viewer")))


@router.get("/origin-destination/summary")
def origin_destination_summary(request: Request, user: dict = RequireAny) -> dict:
    dataset = _dataset(request)
    rows: dict[tuple[str, str], dict] = {}
    for record in dataset["cycles"]:
        key = (record["origen"], record["destino"])
        row = rows.setdefault(key, {"origin": key[0], "destination": key[1], "toneladas": 0, "ciclos": 0})
        row["toneladas"] += record["tonelaje"]
        row["ciclos"] += 1
    items = sorted(rows.values(), key=lambda item: item["toneladas"], reverse=True)
    return {"source": dataset.get("source", "wenco-sql-live"), "count": len(items), "items": items}


@router.get("/sql-demo/events")
def sql_demo_events(request: Request, user: dict = RequireAny) -> dict:
    _real_only_error("/api/sql-demo/events", "Endpoint demo deshabilitado. Usa fuentes WENCO reales.")


@router.get("/sql-demo/delays")
def sql_demo_delays(request: Request, user: dict = RequireAny) -> dict:
    _real_only_error("/api/sql-demo/delays", "Endpoint demo deshabilitado. Usa /api/delays/events.")


@router.get("/sql-demo/speed-events")
def sql_demo_speed_events(request: Request, user: dict = RequireAny) -> dict:
    _real_only_error("/api/sql-demo/speed-events", "No hay fuente SQL real de exceso de velocidad configurada.")


@router.get("/sql-demo/breakdowns")
def sql_demo_breakdowns(request: Request, user: dict = RequireAny) -> dict:
    _real_only_error("/api/sql-demo/breakdowns", "Endpoint demo deshabilitado. Usa /api/maintenance/breakdowns.")


@router.get("/operators/performance")
def operators_performance(request: Request, user: dict = RequireAny) -> dict:
    dataset = _dataset(request)
    rows: dict[str, dict] = {}
    for record in dataset["cycles"]:
        operator = record.get("operador_caex") or record.get("operador")
        if not operator:
            continue
        row = rows.setdefault(operator, {"operator_id": operator, "operador": operator, "toneladas": 0, "ciclos": 0})
        row["toneladas"] += record["tonelaje"]
        row["ciclos"] += 1
    items = sorted(rows.values(), key=lambda item: item["toneladas"], reverse=True)
    return {"source": dataset.get("source", "wenco-sql-live"), "count": len(items), "items": items}


@router.get("/delays/summary")
def delays_summary(request: Request, user: dict = RequireAny) -> dict:
    items = _real_status_events(request, status_filter="DEMORA")
    total_minutes = sum(item["duration_min"] for item in items)
    return {"source": "wenco-status-history", "count": len(items), "total_minutes": total_minutes, "items": items[:12]}


@router.get("/delays/events")
def delays_events(request: Request, user: dict = RequireAny) -> dict:
    items = _real_status_events(request, status_filter="DEMORA")
    return {"source": "wenco-status-history", "count": len(items), "items": items}


@router.get("/delays/ranking")
def delays_ranking(request: Request, user: dict = RequireAny) -> dict:
    rows: dict[str, dict] = {}
    for item in _real_status_events(request, status_filter="DEMORA"):
        key = item["equipment_id"]
        row = rows.setdefault(key, {"equipment_id": key, "duration_min": 0, "events": 0})
        row["duration_min"] += item["duration_min"]
        row["events"] += 1
    items = sorted(rows.values(), key=lambda item: item["duration_min"], reverse=True)
    return {"source": "wenco-status-history", "count": len(items), "items": items}


@router.get("/safety/speed-excess")
def safety_speed_excess(request: Request, user: dict = RequireAny) -> dict:
    _real_only_error("/api/safety/speed-excess", "No hay fuente SQL real de exceso de velocidad configurada.")


@router.get("/maintenance/breakdowns")
def maintenance_breakdowns(request: Request, user: dict = RequireAny) -> dict:
    items = _real_status_events(request, status_filter="MANTENCION")
    return {"source": "wenco-status-history", "count": len(items), "items": items}


@router.get("/compare")
def compare(
    desde_a: Annotated[str | None, Query()] = None,
    hasta_a: Annotated[str | None, Query()] = None,
    desde_b: Annotated[str | None, Query()] = None,
    hasta_b: Annotated[str | None, Query()] = None,
    user: dict = RequireAny,
) -> dict:
    return production_service.get_period_comparison(desde_a=desde_a, hasta_a=hasta_a, desde_b=desde_b, hasta_b=hasta_b)


@router.get("/report/shift-pdf")
def shift_pdf(
    fecha: Annotated[str | None, Query()] = None,
    turno: Annotated[str | None, Query()] = None,
    user: dict = RequireAny,
) -> Response:
    content  = build_shift_pdf(fecha=fecha, turno=turno)
    filename = f"NORTHMINE_Turno_{turno or 'ACTUAL'}_{fecha or 'actual'}.pdf"
    return Response(
        content=content,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/report/cockpit-executive-pdf")
def cockpit_executive_pdf(
    fecha: Annotated[str | None, Query()] = None,
    turno: Annotated[str | None, Query()] = None,
    user: dict = RequireAny,
) -> Response:
    content = build_cockpit_executive_pdf(fecha=fecha, turno=turno, username=str(user.get("username") or user.get("sub") or "usuario"))
    filename = f"NORTHMINE_Informe_Ejecutivo_{turno or 'ACTUAL'}_{fecha or 'actual'}.pdf"
    return Response(
        content=content,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/navigation")
def navigation(
    role: Annotated[str, Query()] = "admin",
    user: dict = RequireAny,
) -> dict:
    return {
        "source": "northmine-real",
        "role": role,
        "pages": ROLE_PAGES.get(role, ROLE_PAGES["viewer"]),
        "exportar": role in {"admin", "supervisor"},
        "config": role == "admin",
    }


@router.post("/simulator/run")
@limiter.limit(endpoint_limit("/api/simulator/run"))
async def simulator_run(request: Request, payload: SimulatorRequestSecure, user: dict = RequireAny) -> dict:
    return simulator_simulate(
        caex=payload.caex,
        ciclos_hora=payload.ciclos_hora,
        ton_ciclo=payload.ton_ciclo,
        disponibilidad=payload.disponibilidad,
        dias=payload.dias,
        turno=payload.turno,
    )


@router.post("/ai/analysis")
@limiter.limit(endpoint_limit("/api/ai/analysis"))
async def ai_analysis(request: Request, payload: AIAnalysisRequestSecure, user: dict = RequireOperador) -> dict:
    from app.services.ai_analysis import gen_ai_analysis
    return await gen_ai_analysis(payload.tipo, payload.contexto)


@router.get("/aerea/equipos")
def aerea_equipos(user: dict = RequireAny) -> dict:
    _real_only_error("/api/aerea/equipos", "Vista aerea demo deshabilitada hasta conectar fuente real de ubicacion.")


# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
# ADMIN â€” solo rol admin
# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

def _authorize_admin_target(user: dict, target) -> None:
    require_resource_scope(user, tenant_id=target.empresa, site_id=target.faena)


@router.get("/admin/users", response_model=UserListResponse)
def admin_list_users(request: Request, user: dict = RequireAdmin) -> UserListResponse:
    repository = get_user_repository()
    context = RequestContext.from_user(user)
    users = [
        _to_user_public(item)
        for item in repository.list_users()
        if str(item.empresa).strip().casefold() == context.tenant_id
        and str(item.faena).strip().casefold() == context.site_id
    ]
    return UserListResponse(count=len(users), items=users)


@router.get("/admin/users/{user_id}", response_model=UserPublic)
def admin_get_user(user_id: str, request: Request, user: dict = RequireAdmin) -> UserPublic:
    repository = get_user_repository()
    target = repository.get_user_by_id(user_id)
    if not target:
        _audit_admin_user_action(repository, request, user, user_id, "admin_user_action_denied", "not_found", status_code=404)
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    _authorize_admin_target(user, target)
    return _to_user_public(target)


@router.post("/admin/users", response_model=UserPublic, status_code=status.HTTP_201_CREATED)
def admin_create_user(payload: UserCreateRequest, request: Request, user: dict = RequireAdmin) -> UserPublic:
    repository = get_user_repository()
    require_resource_scope(user, tenant_id=payload.empresa, site_id=payload.faena)
    try:
        created = repository.create_user(
            payload.username,
            payload.password,
            full_name=payload.full_name,
            email=payload.email,
            role=payload.role,
            is_active=payload.is_active,
            is_demo=False,
            faena=payload.faena,
            empresa=payload.empresa,
        )
    except DuplicateUserError as exc:
        _audit_admin_user_action(repository, request, user, payload.username, "admin_user_action_denied", "duplicate", status_code=409, detail={"reason": str(exc)})
        raise HTTPException(status_code=409, detail=str(exc))
    except UserRepositoryError as exc:
        _audit_admin_user_action(repository, request, user, payload.username, "admin_user_action_denied", "validation_error", status_code=400, detail={"reason": str(exc)})
        raise HTTPException(status_code=400, detail=str(exc))

    _audit_admin_user_action(
        repository,
        request,
        user,
        created.username,
        "admin_user_created",
        "ok",
        status_code=201,
        detail={"role": created.role, "is_active": created.is_active},
    )
    return _to_user_public(created)


@router.patch("/admin/users/{user_id}", response_model=UserPublic)
def admin_update_user(user_id: str, payload: UserUpdateRequest, request: Request, user: dict = RequireAdmin) -> UserPublic:
    repository = get_user_repository()
    target = repository.get_user_by_id(user_id)
    if not target:
        _audit_admin_user_action(repository, request, user, user_id, "admin_user_action_denied", "not_found", status_code=404)
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    _authorize_admin_target(user, target)
    require_resource_scope(
        user,
        tenant_id=payload.empresa if payload.empresa is not None else target.empresa,
        site_id=payload.faena if payload.faena is not None else target.faena,
    )
    try:
        updated = repository.update_user(
            user_id,
            full_name=payload.full_name,
            email=payload.email,
            faena=payload.faena,
            empresa=payload.empresa,
        )
    except DuplicateUserError as exc:
        _audit_admin_user_action(repository, request, user, target.username, "admin_user_action_denied", "duplicate", status_code=409, detail={"reason": str(exc)})
        raise HTTPException(status_code=409, detail=str(exc))
    except UserRepositoryError as exc:
        _audit_admin_user_action(repository, request, user, target.username, "admin_user_action_denied", "validation_error", status_code=400, detail={"reason": str(exc)})
        raise HTTPException(status_code=400, detail=str(exc))

    _audit_admin_user_action(
        repository,
        request,
        user,
        updated.username,
        "admin_user_updated",
        "ok",
        detail={"fields": payload.model_dump(exclude_unset=True, exclude_none=True)},
    )
    return _to_user_public(updated)


@router.patch("/admin/users/{user_id}/role", response_model=UserPublic)
def admin_update_user_role(user_id: str, payload: UserRoleUpdateRequest, request: Request, user: dict = RequireAdmin) -> UserPublic:
    repository = get_user_repository()
    target = repository.get_user_by_id(user_id)
    if not target:
        _audit_admin_user_action(repository, request, user, user_id, "admin_user_action_denied", "not_found", status_code=404)
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    _authorize_admin_target(user, target)
    try:
        updated = repository.update_role(user_id, payload.role)
    except LastAdminError as exc:
        _audit_admin_user_action(repository, request, user, target.username, "admin_user_action_denied", "last_admin", status_code=400, detail={"reason": str(exc), "from": target.role, "to": payload.role})
        raise HTTPException(status_code=400, detail=str(exc))
    _invalidate_auth_sessions(repository, target.username)
    _audit_admin_user_action(repository, request, user, updated.username, "admin_user_role_changed", "ok", detail={"from": target.role, "to": updated.role})
    return _to_user_public(updated)


@router.patch("/admin/users/{user_id}/status", response_model=UserPublic)
def admin_update_user_status(user_id: str, payload: UserStatusUpdateRequest, request: Request, user: dict = RequireAdmin) -> UserPublic:
    repository = get_user_repository()
    target = repository.get_user_by_id(user_id)
    if not target:
        _audit_admin_user_action(repository, request, user, user_id, "admin_user_action_denied", "not_found", status_code=404)
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    _authorize_admin_target(user, target)
    try:
        updated = repository.set_active_status(user_id, payload.is_active)
    except LastAdminError as exc:
        _audit_admin_user_action(repository, request, user, target.username, "admin_user_action_denied", "last_admin", status_code=400, detail={"reason": str(exc), "requested_active": payload.is_active})
        raise HTTPException(status_code=400, detail=str(exc))
    if not updated.is_active:
        _invalidate_auth_sessions(repository, target.username)
    _audit_admin_user_action(
        repository,
        request,
        user,
        updated.username,
        "admin_user_enabled" if updated.is_active else "admin_user_disabled",
        "ok",
        detail={"is_active": updated.is_active},
    )
    return _to_user_public(updated)


@router.post("/admin/users/{user_id}/reset-password", response_model=UserPublic)
def admin_reset_user_password(user_id: str, payload: UserPasswordResetRequest, request: Request, user: dict = RequireAdmin) -> UserPublic:
    repository = get_user_repository()
    target = repository.get_user_by_id(user_id)
    if not target:
        _audit_admin_user_action(repository, request, user, user_id, "admin_user_action_denied", "not_found", status_code=404)
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    _authorize_admin_target(user, target)
    try:
        updated = repository.reset_password(user_id, payload.new_password)
    except UserRepositoryError as exc:
        _audit_admin_user_action(repository, request, user, target.username, "admin_user_action_denied", "validation_error", status_code=400, detail={"reason": str(exc)})
        raise HTTPException(status_code=400, detail=str(exc))
    _invalidate_auth_sessions(repository, target.username)
    _audit_admin_user_action(repository, request, user, updated.username, "admin_user_password_reset", "ok")
    return _to_user_public(updated)


@router.get("/admin/audit-log")
@limiter.limit(endpoint_limit("/api/admin/audit-log"))
def audit_log(
    request: Request,
    limit: Annotated[int, Query(ge=1, le=500)] = 100,
    usuario: Annotated[str | None, Query()] = None,
    endpoint: Annotated[str | None, Query()] = None,
    desde: Annotated[str | None, Query()] = None,
    user: dict = RequireAdmin,
) -> dict:
    rows = query_audit_log(limit=limit, usuario=usuario, endpoint=endpoint, desde=desde)
    protected_rows = _protect_demo_audit_rows(rows)
    return {"count": len(protected_rows), "items": protected_rows}


@router.post("/auth/change-password")
@limiter.limit(endpoint_limit("/api/auth/change-password"))
def change_password(request: Request, payload: ChangePasswordRequest, background_tasks: BackgroundTasks, user: dict = RequireAny) -> dict:
    username = user.get("sub", "")
    repository = get_user_repository()
    user_record = repository.get_by_username(username)
    if not user_record:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    if not verify_password(payload.current_password, user_record.password_hash):
        raise HTTPException(status_code=400, detail="ContraseÃ±a actual incorrecta")

    import re
    pw = payload.new_password
    if len(pw) < 10:
        raise HTTPException(status_code=400, detail="MÃ­nimo 10 caracteres")
    if not re.search(r"[A-Z]", pw):
        raise HTTPException(status_code=400, detail="Debe contener una mayÃºscula")
    if not re.search(r"[0-9]", pw):
        raise HTTPException(status_code=400, detail="Debe contener un nÃºmero")
    if not re.search(r"[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>\/?]", pw):
        raise HTTPException(status_code=400, detail="Debe contener un carÃ¡cter especial")

    if check_password_in_history(username, pw):
        raise HTTPException(status_code=400, detail="No puede reutilizar passwords anteriores")
    save_password_history(username, user_record.password_hash)
    repository.update_password(username, pw)
    remove_user_sessions(username)
    log_event(
        usuario=username,
        ip=_client_ip(request),
        accion="password_change",
        resultado="ok",
        metodo="POST",
        endpoint="/api/auth/change-password",
        status_code=200,
        user_agent=request.headers.get("user-agent", ""),
    )

    send_security_alert(background_tasks, "PASSWORD_CHANGE", {"username": username}, severity="warning")

    return {"message": "ContraseÃ±a actualizada correctamente"}


@router.post("/admin/revoke-user-tokens/{user_id}")
def revoke_user_tokens(user_id: str, user: dict = RequireAdmin) -> dict:
    repository = get_user_repository()
    target = repository.get_user_by_id(user_id) or repository.get_by_username(user_id)
    if not target:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    _authorize_admin_target(user, target)
    _invalidate_auth_sessions(repository, target.username)
    return {"message": f"Tokens revocados para {user_id}"}


@router.get("/admin/metrics", response_model=SecurityMetricsResponse)
def security_metrics(user: dict = RequireAdmin) -> SecurityMetricsResponse:
    blocked = get_blocked_ips()
    failed = get_failed_logins_last_hour()
    sessions = get_active_sessions_count()
    size = get_audit_log_size_mb()
    most_active = get_most_active_user()
    suspicious = failed >= 10 or len(blocked) > 0
    visible_blocked = ["PROTEGIDA"] * len(blocked) if _is_public_demo_runtime() else blocked
    return SecurityMetricsResponse(
        blocked_ips=visible_blocked,
        failed_logins_last_hour=failed,
        active_sessions=sessions,
        audit_log_size_mb=size,
        most_active_user=most_active,
        suspicious_activity=suspicious,
    )


@router.get("/admin/system")
def admin_system(user: dict = RequireAdmin) -> dict:
    return _protect_demo_system_status(build_admin_system_status())
