# NORTHMINE Mission Control — Phase 0.2 Closure Report

Captured: 2026-08-21, America/Santiago.

## PHASE

Phase 0.2 — baseline-test and repository-authorization closure.

## STATUS

PASS for the public-demo foundation scope. Phase 1 remains intentionally stopped pending the human approvals listed below.

## OBJECTIVE

Close the ten classified baseline failures, make direct-ID authorization fail closed at the persistence lookup, and preserve the explicit REAL/SYNTHETIC boundary established in Phase 0.1.

## IMPLEMENTED

- Replaced retired-route and uncontrolled-Wenco performance tests with authenticated deterministic fixtures and explicit budgets.
- Converted the audit concurrency test into a real 20-write concurrent test.
- Fixed SQLite audit durability with one connection per thread.
- Prevented `/api/alerts` from performing an unintended provider read after the request dataset was already resolved.
- Updated revocation, export and provenance-fallback assertions to current product contracts.
- Added owner-scoped SQL lookup for investigations and legacy AI task drafts.
- Added tenant-and-site-scoped SQL lookup for reports, report versions, shift handovers and agent work-product tasks.
- Direct-ID routes return 404 before mutation when the owner, tenant or site scope does not match.

## ARCHITECTURAL DECISIONS

- Authorization order is identity → tenant → site → permission → resource.
- User-facing direct-ID lookups include ownership scope in SQL; route-only post-fetch checks are defense in depth, not the primary boundary.
- Public-demo SQLite remains the accepted demo persistence only. The operational persistence ADR remains an approval candidate for production.
- Synthetic fixtures remain explicitly SYNTHETIC; no production Wenco credential or schema was introduced.

## TESTS

Before Phase 0.2: backend `366/376`, frontend `98/98` after Phase 0.1.

After Phase 0.2:

- Backend: `376/376` passed, 9 warnings.
- Focused Phase 0.2 security/test gate: `19/19` passed.
- Frontend unit: `98/98` passed.
- Frontend typecheck/lint: passed.
- Frontend production build: passed.
- Python compileall: passed.
- `git diff --check`: required before commit and recorded in the final handoff.

## SECURITY

Resolved in this phase:

- Owner-based investigation and legacy-task BOLA path.
- Tenant/site direct-ID lookup for work-product reports, handovers and tasks.
- Concurrent audit-write loss.
- Accidental second data-provider read in alert construction.

Open external/production controls:

- DBA-created and DBA-verified read-only Wenco principal.
- Production secret storage and rotation evidence.
- Production tenant/site mapping authority and migration validation.

## PERFORMANCE

Operational endpoint tests now run against deterministic data and enforce a two-second local test budget. This is a regression budget, not a production load-test certification.

## REGRESSIONS

No test regression detected. The test run emits a non-fatal Windows log-rotation warning when another process holds `logs/backend.log`; no unrelated process was stopped.

## OPEN RISKS

- The current repository is accepted as the public-demo derivative, not yet as the production Wenco release repository.
- SQLite is demo-compatible but is not the approved production operational store.
- Production Wenco enforcement requires external DBA evidence; application SELECT usage alone is insufficient.

## PHASE 1 READINESS

NOT READY for production Mission Control implementation. The source, tests, provenance, isolation, authorization, identity, state, time, event, graph, replay, quality and threat-model artifacts are available. Remaining gates are explicit human approval of the production repository/baseline and persistence ADR, plus external confirmation of the enforceable Wenco read-only principal.

## HUMAN APPROVAL REQUIRED

1. Confirm whether this public-demo derivative is also the production Mission Control implementation repository.
2. Approve the operational persistence ADR candidate for production implementation.
3. Obtain DBA/security confirmation of the read-only Wenco principal and deployment verification procedure for the target environment.

STOP: no Phase 1 UI or product implementation is included.
