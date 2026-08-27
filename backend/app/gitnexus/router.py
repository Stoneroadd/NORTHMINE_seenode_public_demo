from __future__ import annotations

from fastapi import APIRouter

from app.core.config import get_settings
from app.core.dependencies import RequireAdmin
from app.gitnexus.models import (
    GitNexusStatus,
    QueryRequest,
    QueryResponse,
    ReindexJobStatus,
    ReindexResponse,
)
from app.gitnexus.service import get_reindex_job, get_status, run_query, start_reindex

router = APIRouter(prefix="/gitnexus", tags=["gitnexus"])


@router.get("/status", response_model=GitNexusStatus)
async def gitnexus_status(user: dict = RequireAdmin) -> GitNexusStatus:
    return await get_status(get_settings())


@router.post("/reindex", response_model=ReindexResponse)
async def gitnexus_reindex(user: dict = RequireAdmin) -> ReindexResponse:
    return await start_reindex(get_settings())


@router.get("/reindex/{job_id}", response_model=ReindexJobStatus)
async def gitnexus_reindex_status(job_id: str, user: dict = RequireAdmin) -> ReindexJobStatus:
    return await get_reindex_job(get_settings(), job_id)


@router.post("/query", response_model=QueryResponse)
async def gitnexus_query(body: QueryRequest, user: dict = RequireAdmin) -> QueryResponse:
    return await run_query(get_settings(), query=body.query, limit=body.limit)
