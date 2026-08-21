# Mission Control Threat Model (STRIDE)

## Trust boundaries

Browser ↔ API/WS; API ↔ identity/user repository; API/worker ↔ operational store; read-only connector ↔ Wenco SQL Server; AI runtime ↔ allowlisted tools; report/export ↔ downloaded artifact; demo/synthetic generator ↔ provenance normalization. Tenant/site boundaries exist inside every service and store.

| Threat | Example | Required mitigation | Phase 0.1 status |
|---|---|---|---|
| Spoofing | stolen JWT/WS token | short-lived token, auth-version revocation, secure refresh cookie, WS verification, repository-backed scope | Scope enrichment fixed; broader auth hardening existing |
| Tampering | synthetic payload labeled REAL | backend provenance, immutable evidence, hashes/idempotency, audit | Core resolver/regression implemented; legacy propagation open |
| Repudiation | event/action altered or denied | append-only lifecycle, actor/correlation ID, protected audit | Contract defined; Event Engine not built |
| Information disclosure | BOLA by report/task/investigation ID | composite scope/owner checks, scoped queries, 404 denial, negative tests | Route guards implemented; investigation schema migration open |
| Denial of service | expensive Wenco/replay query, WS flood | read-only views, time/row limits, rate/stream budgets, checkpoint replay | Contract defined; deployment proof open |
| Elevation of privilege | admin crosses tenants by role name | explicit platform permission only, default scoped admin, authorization tests | Model implemented in guard; full matrix open |

## Specific abuse cases

- Wenco mutation: prevented primarily by DB grants; application SELECT discipline is insufficient.
- Site parameter manipulation: ignored unless validated against repository-backed context.
- WS subscription theft: authenticate, bind user+tenant+site, authorize resume/session ID.
- AI tool scope injection: tools receive server context, not prompt-provided tenant/site; outputs carry provenance/evidence.
- Report/export leakage: authorize resource and each evidence link; avoid sensitive metadata/logging.
- Replay history leakage: scope snapshot, checkpoint, event and evidence queries.
- Data integrity: preserve raw evidence, correction records, deterministic ordering and rule versions.
- Provenance confusion: fail to UNKNOWN, never infer REAL from UI or absence of a demo flag.

## Highest open risks

1. Legacy operational routes/repositories lack systematic scoped-query enforcement and need an endpoint-by-endpoint authorization matrix.
2. Investigation SQLite schema stores owner but not tenant/site.
3. No production Wenco principal/grant/TLS verification evidence.
4. Persistence/RLS, backup/restore and event immutability are proposed, not implemented.
5. Several legacy services still hardcode REAL/WENCO and must migrate before influencing Mission Control.
