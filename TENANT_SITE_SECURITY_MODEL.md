# Tenant / Site Security Model

## Canonical request context

`identity -> tenant -> site -> role -> permission`. Authentication verifies the JWT, loads the current user from the server repository, checks active/auth-version state, and then enriches the request with authoritative `empresa` and `faena`. Client query/body IDs and stale token claims are not authoritative.

Tenant and site form a mandatory composite scope. `None` is a literal legacy scope, never a wildcard. Role `admin` does not automatically grant cross-tenant or cross-site access. A future platform-level permission must be explicit, audited and tested.

## Enforcement

- List queries include tenant and site predicates.
- Direct-ID reads first load internally, then compare both scopes, returning 404 for mismatch to reduce enumeration.
- Mutations authorize before state transition or audit side effect.
- WebSocket authentication reconstructs scope from the user repository; subscriptions/sessions bind to that scope.
- AI memory, watches, proactive events and work-product lists preserve the same composite scope.
- Connectors are deployment-bound to an allowlisted site and may not accept arbitrary client-selected connection targets.

## P0 findings

Confirmed: JWT payloads omitted `empresa/faena`; REST dependency and agent WebSocket therefore exposed `(None,None)` to scoped services. Fixed by repository-backed enrichment. Confirmed: work-product direct IDs lacked scope checks; fixed for reports, versions, handovers and task transitions. Legacy copilot tasks and investigations lacked owner checks; fixed owner-only pending schema migration. Admin user list/direct/mutation/token-revocation paths are now tenant/site scoped and cannot create or move users outside the caller's scope.

## Negative cases

Automated tests assert Tenant A cannot read Tenant B by report ID, Site A cannot read Site B, work-product and legacy task mutation is rejected before mutation, another identity cannot read an investigation by ID, and a scoped admin cannot fetch a user in another site. Cross-scope responses are 404.

Open: the legacy SQLite investigation table does not persist tenant/site columns. Owner-only isolation is the safe P0 stopgap; adding scoped columns and backfill requires a non-destructive migration before multi-tenant production use.
