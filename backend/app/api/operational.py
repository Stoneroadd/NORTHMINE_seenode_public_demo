from datetime import date, datetime, timezone

from fastapi import APIRouter, HTTPException, Request, status
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.core.dependencies import RequireAny
from app.services.cockpit_service import build_cockpit_response
from app.services.data_provider import get_dataset as provider_get_dataset
from app.services.decision_audit_service import build_decision_audit_response
from app.services.dispatcher_advisor_service import build_dispatcher_advisor_response
from app.services.filtering import filtered_operational_dataset, filters_from_query, normalize_shift
from app.services.hidden_loss_service import build_hidden_losses_response
from app.services.monthly_target_service import build_monthly_target_response
from app.services.operational_nlp_service import build_operational_nlp_response
from app.services.profit_optimization_service import build_profit_optimization_response
from app.services.shift_comparison_service import build_shift_comparison_response

router = APIRouter()


def _filters(request: Request) -> dict[str, str]:
    return filters_from_query(request.query_params)


def _dataset(request: Request) -> dict:
    filters = _filters(request)
    selected_date = filters.get("selected_date") or filters.get("start_date")
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


def _reject_demo_mode(endpoint: str) -> None:
    if get_settings().demo_mode:
        _real_only_error(endpoint, "NORTHMINE_DEMO_MODE=true no esta permitido para datos operacionales.")


def _explicit_demo_mode() -> bool:
    settings = get_settings()
    return getattr(settings, "environment", None) == "demo" or getattr(settings, "mode", None) == "demo"


def _builder_demo_flag(demo_mode: bool) -> bool:
    # Los servicios operacionales de esta rama aun bloquean demo_mode=True.
    # ENVIRONMENT=demo ya fuerza que data_provider entregue datos sinteticos;
    # aqui solo conservamos el contrato de respuesta para poder demostrar la UI.
    return False if demo_mode else False


def _cockpit_dataset(request: Request) -> tuple[dict, str | None, str | None]:
    filters = _filters(request)
    selected_date = filters.get("selected_date") or filters.get("start_date")
    selected_shift = normalize_shift(filters.get("shift") or "ACTUAL") or "ACTUAL"
    dataset = provider_get_dataset(fecha=selected_date) if selected_date else provider_get_dataset()
    return dataset, selected_date, selected_shift


def _monthly_target_dataset(request: Request) -> tuple[dict, str | None, str]:
    filters = _filters(request)
    selected_date = filters.get("selected_date") or filters.get("start_date")
    if selected_date:
        try:
            selected = date.fromisoformat(selected_date[:10])
        except ValueError:
            selected = date.today()
            selected_date = selected.isoformat()
    else:
        selected = date.today()
        selected_date = selected.isoformat()
    days_to_load = max(selected.day, 1)
    dataset = provider_get_dataset(fecha=selected_date, dias=days_to_load)
    sector = str(request.query_params.get("sector") or request.query_params.get("fase") or "F01")
    return dataset, selected_date, sector


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


@router.get("/cockpit")
def cockpit(request: Request, user: dict = RequireAny) -> dict:
    demo_mode = _explicit_demo_mode()
    if not demo_mode:
        _reject_demo_mode("/api/cockpit")
    try:
        dataset, selected_date, selected_shift = _cockpit_dataset(request)
    except Exception as exc:
        return _real_data_unavailable("/api/cockpit", exc)
    return build_cockpit_response(
        dataset,
        demo_mode=_builder_demo_flag(demo_mode),
        selected_date=selected_date,
        selected_shift=selected_shift,
    )


@router.get("/monthly-target")
def monthly_target(request: Request, user: dict = RequireAny) -> dict:
    if get_settings().demo_mode:
        filters = _filters(request)
        return build_monthly_target_response(
            None,
            demo_mode=True,
            selected_date=filters.get("selected_date") or filters.get("start_date"),
            sector=str(request.query_params.get("sector") or request.query_params.get("fase") or "F01"),
        )
    try:
        dataset, selected_date, resolved_sector = _monthly_target_dataset(request)
    except Exception as exc:
        return _real_data_unavailable("/api/monthly-target", exc)
    return build_monthly_target_response(
        dataset,
        demo_mode=False,
        selected_date=selected_date,
        sector=resolved_sector,
    )


@router.get("/shift-comparison")
def shift_comparison(request: Request, user: dict = RequireAny) -> dict:
    demo_mode = _explicit_demo_mode()
    if not demo_mode:
        _reject_demo_mode("/api/shift-comparison")
    filters = _filters(request)
    selected_date = filters.get("selected_date") or filters.get("start_date")
    try:
        dataset = provider_get_dataset(fecha=selected_date, dias=2) if selected_date else provider_get_dataset(dias=2)
    except Exception as exc:
        return _real_data_unavailable("/api/shift-comparison", exc)
    return build_shift_comparison_response(
        dataset,
        demo_mode=_builder_demo_flag(demo_mode),
        selected_date=selected_date,
    )


@router.get("/profit-optimization")
def profit_optimization(request: Request, user: dict = RequireAny) -> dict:
    demo_mode = _explicit_demo_mode()
    if not demo_mode:
        _reject_demo_mode("/api/profit-optimization")
    try:
        dataset = _dataset(request)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Datos reales WENCO no disponibles y sin cache operacional para /api/profit-optimization.",
        )
    return build_profit_optimization_response(dataset, demo_mode=_builder_demo_flag(demo_mode))


@router.get("/hidden-losses")
def hidden_losses(request: Request, user: dict = RequireAny) -> dict:
    demo_mode = _explicit_demo_mode()
    if not demo_mode:
        _reject_demo_mode("/api/hidden-losses")
    try:
        dataset = _dataset(request)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Datos reales WENCO no disponibles y sin cache operacional para /api/hidden-losses.",
        )
    return build_hidden_losses_response(dataset, demo_mode=_builder_demo_flag(demo_mode))


@router.get("/operational-nlp")
def operational_nlp(request: Request, user: dict = RequireAny) -> dict:
    demo_mode = _explicit_demo_mode()
    if not demo_mode:
        _reject_demo_mode("/api/operational-nlp")
    try:
        dataset = _dataset(request)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Datos reales WENCO no disponibles y sin cache operacional para /api/operational-nlp.",
        )
    return build_operational_nlp_response(dataset, demo_mode=_builder_demo_flag(demo_mode))


@router.get("/dispatcher-advisor")
def dispatcher_advisor(request: Request, user: dict = RequireAny) -> dict:
    demo_mode = _explicit_demo_mode()
    if not demo_mode:
        _reject_demo_mode("/api/dispatcher-advisor")
    try:
        dataset, selected_date, selected_shift = _cockpit_dataset(request)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Datos reales WENCO no disponibles y sin cache operacional para /api/dispatcher-advisor.",
        )
    return build_dispatcher_advisor_response(
        dataset,
        demo_mode=_builder_demo_flag(demo_mode),
        selected_date=selected_date,
        selected_shift=selected_shift,
    )


@router.get("/decision-audit")
def decision_audit(request: Request, user: dict = RequireAny) -> dict:
    demo_mode = _explicit_demo_mode()
    if not demo_mode:
        _reject_demo_mode("/api/decision-audit")
    try:
        dataset, selected_date, selected_shift = _cockpit_dataset(request)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Datos reales WENCO no disponibles y sin cache operacional para /api/decision-audit.",
        )
    return build_decision_audit_response(
        dataset,
        demo_mode=_builder_demo_flag(demo_mode),
        selected_date=selected_date,
        selected_shift=selected_shift,
    )
