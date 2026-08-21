# NORTHMINE API Inventory — Phase 0

This is a capability inventory, not a new contract. Existing request/response schemas remain authoritative until contract tests and ADRs approve replacements.

## Current API groups

### Identity and security

- login, refresh, logout and current profile;
- password change/recovery controls;
- MFA setup/verification;
- users/admin roles;
- audit and system/security status.

### Operations

- summary/dashboard;
- production and shift production;
- fleet status, distance and equipment detail;
- loading-unit summary/performance;
- alerts;
- cycles, delays, speed, dispatch and maintenance-related analysis;
- breakdown import/history/insights;
- current shift, reports and exports;
- comparison, simulator, prediction/ML and operator ranking.

### Decision intelligence

`backend/app/api/operational.py:106-229` exposes:

- cockpit;
- monthly target;
- shift comparison;
- profit optimization;
- hidden losses;
- operational NLP;
- dispatcher advisor;
- decision audit.

These are reusable calculations, not a canonical state/event/graph API.

### AI systems

- conversational agent runtime and authenticated `/api/ai-agent/ws`;
- investigations and findings;
- work products, reports, handovers and tasks;
- memory/proactivity/subscriptions;
- voice/vision/perception;
- optional OpenAI Realtime bridge.

The AI planner currently allowlists read-oriented tools for shift summary, production, fleet, alerts, data quality and loading performance. Mission Control should replace their underlying sources with canonical APIs, not grant direct Wenco access.

### Public demo access

- access request submission and administration;
- SQLite local or PostgreSQL durable repository depending on environment.

### Health and delivery

- `/health`, `/health/live`, `/health/ready`;
- compiled SPA/static assets and SPA fallback.

## Wenco contract evidence

The code reads cycles, equipment, operators and equipment-status history from verified table/field references in `backend/app/services/wenco_data.py:178-229,256-307,443-516`. SQL is parameterized and encryption is configured. Gaps:

- no formal read-only account proof or `ApplicationIntent=ReadOnly`;
- no staging/watermark/CDC/idempotent ingestion;
- request-path synchronous source queries;
- no normalized tenant/site predicate;
- incomplete time breakdown and naive time usage;
- derived payload/status rules are mixed into adapter output;
- source error logging may expose more ODBC detail than necessary.

## APIs required for Mission Control

Subject to contract design and ADR approval:

- operational context and LIVE/data condition;
- entity identity and state-at-time;
- operational events and lifecycle transitions;
- temporal graph snapshot/affected subgraph;
- replay window/snapshot/delta;
- scoped universal search;
- shift intelligence;
- authorized operational stream.

See `MISSION_CONTROL_TARGET_ARCHITECTURE.md` for candidate capability paths. They are not implemented contracts.
