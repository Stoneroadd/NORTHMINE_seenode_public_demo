from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Query, Request, Response

from app.core.config import get_settings
from app.core.dependencies import RequireSupervisor
from app.schemas.operator_ranking import OperatorRankingResponse
from app.services.operator_ranking_audit import build_operator_ranking_audit, build_operator_ranking_audit_log
from app.services.operator_ranking_methodology import (
    build_operator_ranking_methodology,
    build_operator_ranking_thresholds,
    build_responsible_use,
)
from app.services.operator_ranking_service import (
    build_delay_patterns,
    build_global_operator_ranking,
    build_operator_detail,
    build_operator_trends,
    build_score_explanation_response,
    clean_operator_filters,
    ranking_to_csv,
)


router = APIRouter(prefix=f"{get_settings().api_prefix}/operator-ranking", tags=["operator-ranking"])


def _filters(request: Request) -> dict[str, str]:
    return clean_operator_filters(request.query_params)


@router.get("/global", response_model=OperatorRankingResponse)
def operator_ranking_global(request: Request, user: dict = RequireSupervisor) -> dict:
    return build_global_operator_ranking(_filters(request))


@router.get("/methodology")
def operator_ranking_methodology(user: dict = RequireSupervisor) -> dict:
    return build_operator_ranking_methodology()


@router.get("/thresholds")
def operator_ranking_thresholds(user: dict = RequireSupervisor) -> dict:
    return build_operator_ranking_thresholds()


@router.get("/responsible-use")
def operator_ranking_responsible_use(user: dict = RequireSupervisor) -> dict:
    return build_responsible_use()


@router.get("/audit")
def operator_ranking_audit(
    request: Request,
    operator_id: Annotated[str | None, Query()] = None,
    user: dict = RequireSupervisor,
) -> dict:
    filters = _filters(request)
    if operator_id:
        filters["operator_id"] = operator_id
    return build_operator_ranking_audit(filters, username=str(user.get("sub", "demo")))


@router.get("/audit-log")
def operator_ranking_audit_log(request: Request, user: dict = RequireSupervisor) -> dict:
    return build_operator_ranking_audit_log(_filters(request), username=str(user.get("sub", "demo")))


@router.get("/detail")
def operator_ranking_detail(
    request: Request,
    operator_id: Annotated[str | None, Query()] = None,
    user: dict = RequireSupervisor,
) -> dict:
    filters = _filters(request)
    if operator_id:
        filters["operator_id"] = operator_id
    return build_operator_detail(filters)


@router.get("/trends")
def operator_ranking_trends(
    request: Request,
    operator_id: Annotated[str | None, Query()] = None,
    user: dict = RequireSupervisor,
) -> dict:
    filters = _filters(request)
    if operator_id:
        filters["operator_id"] = operator_id
    return build_operator_trends(filters)


@router.get("/delay-patterns")
def operator_ranking_delay_patterns(request: Request, user: dict = RequireSupervisor) -> dict:
    return build_delay_patterns(_filters(request))


@router.get("/score-explanation")
def operator_ranking_score_explanation(
    request: Request,
    operator_id: Annotated[str | None, Query()] = None,
    user: dict = RequireSupervisor,
) -> dict:
    filters = _filters(request)
    if operator_id:
        filters["operator_id"] = operator_id
    return build_score_explanation_response(filters)


@router.get("/export-csv")
def operator_ranking_export_csv(request: Request, user: dict = RequireSupervisor) -> Response:
    csv_content = ranking_to_csv(_filters(request))
    return Response(
        content=csv_content,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="northmine_operator_ranking.csv"'},
    )
