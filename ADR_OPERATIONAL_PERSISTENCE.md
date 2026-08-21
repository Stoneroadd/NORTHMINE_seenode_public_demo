# ADR-007 — Operational Persistence

Status: **PROPOSED; human approval required before implementation**.

## Context

The repository uses SQLite for demo/users/audit/AI artifacts and reads Wenco SQL Server directly. Mission Control needs append-friendly evidence, temporal state/relationships, event lifecycle, replay, tenant/site scoping and auditability. Expected production volume is not yet measured.

## Options considered

1. Extend SQLite: excellent zero-dependency demo compatibility; inadequate multi-process concurrency, tenant isolation operations and production temporal load.
2. PostgreSQL as canonical operational store: strong transactions, constraints, indexes, JSONB/range support, mature backup/RLS ecosystem and one-store simplicity.
3. PostgreSQL plus Redis: useful later for ephemeral stream/cache, but Redis cannot be historical truth and adds failure modes.
4. PostgreSQL plus ClickHouse: best for proven high-volume analytics, but premature without volume/query evidence and adds dual-store consistency.
5. SQL Server operational schema: aligns with Wenco infrastructure but risks coupling and violates separation unless independently owned.

## Proposed decision

Use PostgreSQL as the production canonical operational store; retain SQLite only for deterministic standalone demo adapters with the same repository contracts. Do not add Redis/ClickHouse until measured budgets justify them. Wenco remains read-only source, never the operational store.

Store append-only source records/evidence and lifecycle transitions; maintain materialized current projections transactionally; temporal relationships/state use effective intervals and deterministic ordering. All rows include tenant/site and correlation/idempotency keys. Database RLS is defense-in-depth, not a replacement for application authorization.

## Migration and rollback

Introduce new tables/repositories alongside legacy paths; dual-read validation and fixture parity precede cutover. No destructive migration. Rollback switches reads to the prior path while preserving append-only writes for reconciliation. Demo adapter remains runnable without PostgreSQL. Production cutover needs capacity measurements, backup/restore drill, schema migration rehearsal and owner approval.

Trade-off: PostgreSQL is a pragmatic candidate, not a benchmark-proven final choice. Approval is blocked pending actual fleet/event volume, hosting constraints and recovery objectives.
