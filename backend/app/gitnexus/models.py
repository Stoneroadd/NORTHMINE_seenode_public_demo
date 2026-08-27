from __future__ import annotations

from pydantic import BaseModel


class GitNexusStatus(BaseModel):
    available: bool
    indexed: bool
    repo_name: str | None = None
    indexed_at: str | None = None
    stats: dict[str, object] | None = None


class ReindexResponse(BaseModel):
    job_id: str
    status: str


class ReindexJobStatus(BaseModel):
    job_id: str
    status: str
    repo_name: str | None = None
    progress: dict[str, object] | None = None
    error: str | None = None


class QueryRequest(BaseModel):
    query: str
    limit: int = 10


class QueryResponse(BaseModel):
    results: list[dict[str, object]]
