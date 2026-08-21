# NORTHMINE Current Architecture — Phase 0 Snapshot

**Snapshot:** branch `feature/operational-agent-hardening`, SHA `3e1eddef5fabc471e26e193d1fc239271c6c550c`.

```text
Browser
  ├─ Public React routes: landing, origin, access request/privacy/login
  └─ Authenticated React application
       ├─ manual route/section dispatch
       ├─ permanent Sidebar + Topbar + module workspace
       ├─ React Query polling to FastAPI APIs
       ├─ Zustand for user/UI/filter/theme state
       ├─ R3F non-georeferenced operational constellation
       └─ AI-agent WebSocket / optional Realtime voice

Single Seenode web service
  └─ FastAPI
       ├─ auth, MFA, RBAC, audit, rate limits, security headers
       ├─ operational aggregation APIs and services
       ├─ Wenco pyodbc provider or deterministic demo provider
       ├─ AI planner/executor/verifier/runtime/memory/work products
       ├─ SQLite stores + PostgreSQL demo-access adapter
       ├─ health/live/ready
       └─ compiled React assets + SPA fallback
```

## Runtime boundaries

- This checkout is the public synthetic derivative, not the canonical private SQL/Wenco product (`DEPLOYMENT_SOURCE.md:1-26`).
- `ENVIRONMENT=demo` forces demo behavior and must prevent real Wenco configuration.
- Operational queries currently calculate aggregates under request paths; no ingestion worker/staging/canonical operational store exists.
- The only backend WebSocket is the AI-agent protocol. It is not an operational mine-state stream.
- Agent/runtime, audit, users and other functions persist across several SQLite files; demo-access alone has a PostgreSQL adapter.

## Data flow today

```text
Wenco SELECT through pyodbc ─┐
                             ├─ data_provider ─ service calculations ─ REST ─ pages
deterministic demo dataset ──┘

REST/page context ─ agent tools/planner/executor/verifier ─ agent WS ─ AI surfaces
```

Wenco tables referenced by code include `HAUL_CYCLE_TRANS`, `EQUIP`, `DM_OPERATORS`, `EQUIP_STATUS_TRANS` and `EQUIP_STATUS_CODE` (`backend/app/services/wenco_data.py:178-229,443-516`). The current contract does not provide every fine-grained wait/load/dump interval; missing fields must not be invented.

## Primary structural gaps

- no canonical entity/state-at-time model;
- no durable mine event store/lifecycle;
- no temporal Operational Graph;
- no operational replay/search/stream;
- no normalized tenant/site enforcement in data access;
- no versioned global migration system;
- no immutable build/release artifact and tested rollback;
- no operational-freshness readiness/SLO.

For target design, see `MISSION_CONTROL_TARGET_ARCHITECTURE.md`.
