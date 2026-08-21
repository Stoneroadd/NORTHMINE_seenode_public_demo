from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from fastapi import HTTPException, status


def _scope_value(value: Any) -> str | None:
    normalized = str(value or "").strip().casefold()
    return normalized or None


@dataclass(frozen=True)
class RequestContext:
    identity: str
    tenant_id: str | None
    site_id: str | None
    role: str

    @classmethod
    def from_user(cls, user: dict[str, Any]) -> "RequestContext":
        return cls(
            identity=str(user.get("sub") or "").strip().casefold(),
            tenant_id=_scope_value(user.get("empresa")),
            site_id=_scope_value(user.get("faena")),
            role=str(user.get("rol") or "").strip().casefold(),
        )


def require_resource_scope(
    user: dict[str, Any],
    *,
    tenant_id: str | None,
    site_id: str | None,
    owner_id: str | None = None,
    owner_only: bool = False,
) -> RequestContext:
    """Authorize a resource without disclosing whether its ID exists."""
    context = RequestContext.from_user(user)
    same_scope = (
        context.tenant_id == _scope_value(tenant_id)
        and context.site_id == _scope_value(site_id)
    )
    same_owner = context.identity == _scope_value(owner_id)
    if not same_scope or (owner_only and not same_owner):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recurso no encontrado")
    return context


def require_resource_owner(user: dict[str, Any], *, owner_id: str | None) -> RequestContext:
    context = RequestContext.from_user(user)
    if context.identity != _scope_value(owner_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recurso no encontrado")
    return context
