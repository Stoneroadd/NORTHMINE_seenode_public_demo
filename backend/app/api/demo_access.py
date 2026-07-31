from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status

from app.core.config import get_settings
from app.core.dependencies import RequireAdmin
from app.core.rate_limit import endpoint_limit, limiter
from app.repositories.demo_access_repository import (
    DemoAccessRepository,
    get_demo_access_repository,
)
from app.schemas.demo_access import (
    DemoAccessRequestAdmin,
    DemoAccessRequestCreate,
    DemoAccessRequestList,
    DemoAccessRequestReceipt,
    DemoAccessReviewRequest,
    DemoAccessStatus,
)
from app.services.demo_access_service import DemoAccessService


settings = get_settings()
router = APIRouter(
    prefix=f"{settings.api_prefix}/demo-access",
    tags=["demo-access"],
)


def _admin_record(record: object) -> DemoAccessRequestAdmin:
    if not hasattr(record, "admin_dict"):
        raise TypeError("Registro de solicitud invalido")
    return DemoAccessRequestAdmin.model_validate(record.admin_dict())


@router.post(
    "/requests",
    response_model=DemoAccessRequestReceipt,
    status_code=status.HTTP_202_ACCEPTED,
)
@limiter.limit(endpoint_limit("/api/demo-access/requests"))
def create_demo_access_request(
    request: Request,
    payload: DemoAccessRequestCreate,
    repository: DemoAccessRepository = Depends(get_demo_access_repository),
) -> DemoAccessRequestReceipt:
    service = DemoAccessService(repository)
    reference, _ = service.submit(payload)
    return DemoAccessRequestReceipt(
        message="Solicitud recibida para revision.",
        reference=reference,
    )


@router.get("/requests", response_model=DemoAccessRequestList)
@limiter.limit(endpoint_limit("/api/demo-access/admin"))
def list_demo_access_requests(
    request: Request,
    request_status: Annotated[DemoAccessStatus | None, Query(alias="status")] = None,
    repository: DemoAccessRepository = Depends(get_demo_access_repository),
    user: dict = RequireAdmin,
) -> DemoAccessRequestList:
    del user
    records = DemoAccessService(repository).list(status=request_status)
    return DemoAccessRequestList(
        items=[_admin_record(record) for record in records],
        total=len(records),
    )


@router.get("/requests/{request_id}", response_model=DemoAccessRequestAdmin)
@limiter.limit(endpoint_limit("/api/demo-access/admin"))
def get_demo_access_request(
    request_id: str,
    request: Request,
    repository: DemoAccessRepository = Depends(get_demo_access_repository),
    user: dict = RequireAdmin,
) -> DemoAccessRequestAdmin:
    del user
    record = DemoAccessService(repository).get(request_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    return _admin_record(record)


def _review_request(
    request_id: str,
    payload: DemoAccessReviewRequest,
    *,
    action: DemoAccessStatus,
    repository: DemoAccessRepository,
    user: dict,
) -> DemoAccessRequestAdmin:
    reviewed_by = str(user.get("sub", "")).strip() or "admin"
    record = DemoAccessService(repository).review(
        request_id,
        status=action,
        reviewed_by=reviewed_by,
        internal_notes=payload.internal_notes,
    )
    if record is None:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    return _admin_record(record)


@router.post("/requests/{request_id}/approve", response_model=DemoAccessRequestAdmin)
@limiter.limit(endpoint_limit("/api/demo-access/admin"))
def approve_demo_access_request(
    request_id: str,
    request: Request,
    payload: DemoAccessReviewRequest,
    repository: DemoAccessRepository = Depends(get_demo_access_repository),
    user: dict = RequireAdmin,
) -> DemoAccessRequestAdmin:
    return _review_request(
        request_id,
        payload,
        action="approved",
        repository=repository,
        user=user,
    )


@router.post("/requests/{request_id}/reject", response_model=DemoAccessRequestAdmin)
@limiter.limit(endpoint_limit("/api/demo-access/admin"))
def reject_demo_access_request(
    request_id: str,
    request: Request,
    payload: DemoAccessReviewRequest,
    repository: DemoAccessRepository = Depends(get_demo_access_repository),
    user: dict = RequireAdmin,
) -> DemoAccessRequestAdmin:
    return _review_request(
        request_id,
        payload,
        action="rejected",
        repository=repository,
        user=user,
    )
