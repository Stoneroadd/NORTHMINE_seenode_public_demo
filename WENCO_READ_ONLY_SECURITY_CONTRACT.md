# Wenco Read-Only Security Contract

NORTHMINE is a consumer, not a controller. Application SQL containing only `SELECT` is insufficient enforcement.

## Enforceable production boundary

1. A dedicated SQL Server principal per environment and site, owned by the database/security team—not developers or NORTHMINE users.
2. Grant `CONNECT` and `SELECT` only on an allowlisted read-only view/schema. Deny `INSERT`, `UPDATE`, `DELETE`, `EXECUTE`, DDL, ownership, impersonation, bulk operations and server roles.
3. Prefer integrated/service identity authentication. If password authentication is unavoidable, store it in an environment secret manager, never repository/prompts/frontend; rotate independently and revoke on incident.
4. Require encrypted transport with certificate validation (`Encrypt=yes;TrustServerCertificate=no` equivalent).
5. Connector uses parameterized, allowlisted query templates; identifiers are code/config allowlists, never raw client input.
6. Apply command timeout, connection timeout, bounded pool, maximum window/row limits and cancellation. No query per replay frame.
7. Retry only transient connection errors with exponential backoff/jitter and a finite budget. Do not retry syntax, authorization or resource-limit failures.
8. On failure, serve only an explicitly `STALE` NORTHMINE cache with last-success time or return unavailable. Never claim LIVE.
9. Log query template ID, site, correlation ID, duration, row count and outcome; never SQL credentials, personal data or raw parameter dumps.
10. Dev/test/demo use separate principals and databases. Demo requires no Wenco credential.

## Deployment verification

Security/DBA must execute positive SELECT on each allowlisted view and negative INSERT/UPDATE/DELETE/EXECUTE/CREATE tests using the exact deployed principal; inspect grants and effective roles; verify TLS; rotate the secret; verify timeout/row limits; and archive signed evidence. Application readiness must fail if the principal has write-capable roles.

No production account was requested or fabricated in Phase 0.1. Current code remains a connector candidate, not proof that the database principal is read-only.
