from __future__ import annotations

import logging

import httpx
from fastapi import HTTPException, status

from app.core.config import Settings
from app.gitnexus.models import (
    GitNexusStatus,
    QueryResponse,
    ReindexJobStatus,
    ReindexResponse,
)

logger = logging.getLogger("northmine.gitnexus")

# The only repository this module will ever index or query. Never taken from
# the caller -- that would turn an admin-only convenience proxy into an SSRF
# / arbitrary-clone primitive against gitnexus-server's own /api/analyze.
GITNEXUS_TARGET_REPO_URL = "https://github.com/Stoneroadd/NORTHMINE_seenode_public_demo"


def require_gitnexus_enabled(settings: Settings) -> None:
    if not settings.gitnexus_available:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El módulo GitNexus no está habilitado en este entorno",
        )


def _client(settings: Settings) -> httpx.AsyncClient:
    return httpx.AsyncClient(
        base_url=settings.gitnexus_base_url,
        timeout=httpx.Timeout(settings.gitnexus_timeout_seconds),
    )


def _unavailable(exc: Exception) -> HTTPException:
    # Never propagate gitnexus-server's raw response body -- it can echo
    # operator-controlled paths/URLs (see api.ts) that don't belong in an
    # error surfaced to the browser. Log details, return a generic message.
    logger.warning("gitnexus-server call failed: %s", exc)
    return HTTPException(
        status_code=status.HTTP_502_BAD_GATEWAY,
        detail="GitNexus no está disponible en este momento",
    )


async def _resolve_repo_name(client: httpx.AsyncClient) -> str | None:
    """This integration only ever indexes one repo, so the "current" repo is
    whatever gitnexus-server already has registered -- no local job/repoName
    bookkeeping needed on our side."""
    response = await client.get("/api/repos")
    response.raise_for_status()
    repos = response.json()
    if not repos:
        return None
    return repos[0].get("name")


async def get_status(settings: Settings) -> GitNexusStatus:
    require_gitnexus_enabled(settings)
    try:
        async with _client(settings) as client:
            repo_name = await _resolve_repo_name(client)
            if not repo_name:
                return GitNexusStatus(available=True, indexed=False)
            repo_response = await client.get("/api/repo", params={"repo": repo_name})
            if repo_response.status_code == 404:
                return GitNexusStatus(available=True, indexed=False)
            repo_response.raise_for_status()
            repo = repo_response.json()
            return GitNexusStatus(
                available=True,
                indexed=True,
                repo_name=repo.get("name", repo_name),
                indexed_at=repo.get("indexedAt"),
                stats=repo.get("stats"),
            )
    except httpx.HTTPError as exc:
        raise _unavailable(exc) from exc


async def start_reindex(settings: Settings, *, embeddings: bool = False) -> ReindexResponse:
    require_gitnexus_enabled(settings)
    try:
        async with _client(settings) as client:
            response = await client.post(
                "/api/analyze",
                json={"url": GITNEXUS_TARGET_REPO_URL, "embeddings": embeddings},
            )
            response.raise_for_status()
            body = response.json()
            return ReindexResponse(job_id=body["jobId"], status=body["status"])
    except httpx.HTTPError as exc:
        raise _unavailable(exc) from exc


async def get_reindex_job(settings: Settings, job_id: str) -> ReindexJobStatus:
    require_gitnexus_enabled(settings)
    try:
        async with _client(settings) as client:
            response = await client.get(f"/api/analyze/{job_id}")
            if response.status_code == 404:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job no encontrado")
            response.raise_for_status()
            body = response.json()
            return ReindexJobStatus(
                job_id=body["id"],
                status=body["status"],
                repo_name=body.get("repoName"),
                progress=body.get("progress"),
                error=body.get("error"),
            )
    except httpx.HTTPError as exc:
        raise _unavailable(exc) from exc


async def run_query(settings: Settings, *, query: str, limit: int) -> QueryResponse:
    require_gitnexus_enabled(settings)
    try:
        async with _client(settings) as client:
            repo_name = await _resolve_repo_name(client)
            if not repo_name:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="NORTHMINE todavía no ha sido indexado -- ejecuta Reindexar primero",
                )
            response = await client.post(
                "/api/query",
                json={"query": query, "limit": limit, "repo": repo_name},
            )
            response.raise_for_status()
            body = response.json()
            results = body.get("results", body) if isinstance(body, dict) else body
            return QueryResponse(results=results if isinstance(results, list) else [])
    except httpx.HTTPError as exc:
        raise _unavailable(exc) from exc
