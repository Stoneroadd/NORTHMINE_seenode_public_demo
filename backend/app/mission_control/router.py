from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, HTTPException, Query, status

from app.core.config import get_settings
from app.core.dependencies import RequireAny
from app.core.request_context import RequestContext
from app.mission_control.models import OperationalFlowSnapshot
from app.mission_control.service import build_demo_operational_flow_snapshot


router = APIRouter(prefix="/mission-control", tags=["mission-control"])


@router.get("/operational-flow", response_model=OperationalFlowSnapshot)
def operational_flow(
    at: datetime | None = Query(default=None, description="Timestamp ISO 8601 con zona horaria"),
    user: dict = RequireAny,
) -> OperationalFlowSnapshot:
    settings = get_settings()
    demo_allowed = settings.demo_mode or settings.environment in {"demo", "development", "testing"}
    if not demo_allowed:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Operational Flow sintético no está habilitado en este entorno",
        )

    context = RequestContext.from_user(user)
    if not context.tenant_id or not context.site_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="El usuario no tiene un contexto tenant/site operacional completo",
        )
    if at is not None and at.tzinfo is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="El timestamp debe incluir zona horaria",
        )
    try:
        return build_demo_operational_flow_snapshot(
            tenant_id=context.tenant_id,
            site_id=context.site_id,
            at=at,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
