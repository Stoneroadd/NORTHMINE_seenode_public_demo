# NORTHMINE Mission Control — Phase 0 Audit

**Audit date:** 2026-08-20
**Audited checkout:** `C:\Users\maste\Downloads\NORTHMINE_seenode_public_demo`
**Branch:** `feature/operational-agent-hardening`
**HEAD:** `3e1eddef5fabc471e26e193d1fc239271c6c550c`
**Scope:** discovery and architecture only; no Phase 1 implementation

## Executive verdict

This repository is not a blank dashboard. It is a deployable public-demo derivative with a substantial FastAPI/React product, synthetic operational services, a mature AI-agent subsystem, a non-georeferenced 3D operational constellation, security controls, reports, deterministic narrative logic and broad automated tests.

Mission Control should therefore be an incremental domain and interaction migration, not a rewrite. The decisive missing foundation is a canonical, durable model for operational state, entities, relationships, events and time. The current UI can describe and calculate operational conditions, but it does not yet offer the single shared state required by NOW, Operational Flow, replay, 3D and history.

**Phase 0 status: COMPLETE WITH BLOCKERS FOR PHASE 1.** Phase 1 must not start until a human approves the source repository/SHA and confirms whether this public-demo derivative or the canonical private SQL/Wenco product is the implementation source.

## Freeze and concurrent work

- The checkout is one commit ahead of `origin/feature/operational-agent-hardening`.
- Untracked paths exist: `.claude/settings.local.json` and `backend/models/`.
- Several `.pytest_tmp_*` directories cannot be inspected by Git because of local permissions.
- The audited local commit spans backend, frontend and tests. It must be treated as protected concurrent work.
- The repository's own deployment policy identifies this checkout as the public derivative and reserves synthetic/demo behavior here (`DEPLOYMENT_SOURCE.md:3-26`).
- No code, database, credential, deployment, branch, commit or existing untracked path was modified by this audit. Audit documents are the only intentional source changes.

## Current architecture

### Delivery topology

The root build compiles React and prepares Python dependencies; FastAPI then serves both API and SPA assets as one Seenode web service. Liveness and readiness routes exist. This is convenient for the public demo, but the build/start scripts also repair/install runtime dependencies, so the deployment is not yet an immutable artifact with a proven rollback.

### Frontend

- React 18, Vite, strict TypeScript, React Query, Zustand, React Three Fiber/Three, ECharts and Recharts.
- Route-level lazy loading exists, but navigation is manually dispatched from `window.location.pathname`; there is no single typed router manifest (`frontend/src/App.tsx:19-76,121-225`).
- The authenticated shell is defined by a permanent sidebar and a dense top bar (`frontend/src/components/layout/Sidebar.tsx:27-66,108-200`; `frontend/src/components/layout/Topbar.tsx:49-97`).
- Operational modules primarily refresh through React Query polling. The persistent WebSocket is specific to the AI-agent runtime, not canonical mine state.
- Zustand holds user, theme, filters and shell state, but not a shared site/shift/time/live-replay/selected-entity context (`frontend/src/store/index.ts:9-49,72-116,207-269`).
- A root error boundary and lazy routes exist, but route-level fault isolation is incomplete (`frontend/src/main.tsx:13-115`).

### Backend and data

- FastAPI is organized into API routers, services, AI runtime, core security and repositories.
- Operational calculations are service-oriented and currently aggregate demo or Wenco-derived datasets rather than consuming a canonical event/state store.
- Wenco access is through a read-oriented `pyodbc` adapter and a provider/fallback layer. The public-demo boundary forces demo mode and must never receive production Wenco credentials.
- SQLite is used for audit, users, AI/runtime memories and other local stores; PostgreSQL is supported for durable public demo-access requests.
- Tables are generally created or altered ad hoc. There is no repository-wide migration framework suitable for an event store, operational snapshots and replay.
- Data-quality concepts such as stale/fallback already exist and the frontend distinguishes backend failure from stale operational data (`frontend/src/App.tsx:252-289`).
- A verified provenance defect exists: `cockpit_service.py:85-99` forces `REAL/WENCO` labels even when supplied a synthetic dataset. This must be corrected before any Mission Control demo because it violates the public-demo boundary and FACT/source truth.

### AI and real-time

- The repository contains planner, executor, verifier, policies, capability registry, audit, memory, proactive monitoring, work products, voice, vision, WebSocket runtime and optional OpenAI Realtime bridge.
- Agent context already carries route, shift/date and selected entity/widget information (`frontend/src/lib/agentRegistry/context.ts:12-51`).
- This is reusable as an assistant over Mission Control evidence. It must not be reused as the transport or source of truth for operational events.
- The new operational stream requires separate authorization, delivery semantics, ordering, reconnect and data-freshness contracts.

### 3D and mapping

- `OperationalMindMap3D` is a useful R3F visualization with search, filters, inspector, multiple layouts, a 250-node cap and a DOM fallback.
- Its model is built from aggregate Cockpit/profit/loss/NLP/advisor/audit/monthly inputs (`frontend/src/components/mindmap3d/mindMapModel.ts:114-123`).
- The module manifest explicitly identifies it as non-georeferenced (`frontend/src/lib/agentRegistry/modules.ts:47-62`). It is a knowledge/data constellation, not yet a spatial mine state or Operational Graph.
- The aerial module is an orthomosaic/image experience, not an implemented Leaflet live map. Leaflet dependencies appear installed without corresponding current product usage.

## Existing Mission Control capabilities to preserve

- Decision Cockpit calculations, decision audit and evidence surfaces.
- Deterministic, non-LLM shift narrative (`frontend/src/lib/shiftNarrative.ts:4-9,15-88`).
- Current Shift anomalies, operational filtering, historical shift snapshots and report export.
- Reusable equipment inspector/drawer with KPIs, cycles, alerts, hourly detail and recommendations.
- Alert prioritization and entity drill-down.
- Fleet, loading, production, performance, breakdown, aerial, comparison, reports, ranking and simulator capabilities.
- Explicit loading, empty, error, stale and backend-unavailable states.
- AI capability registry, grounded investigation patterns and audit trail.
- 3D renderer performance controls and non-WebGL fallback.
- Deterministic agent harness, operational fixtures, fault/security matrices and demo runner as a starting point for the Mission Control scenario library.
- Authentication, refresh-cookie flow, MFA, brute-force protection, rate limiting, security headers and audit facilities.

## What does not yet exist

- A canonical answer to “what was entity X's known state at time T?”
- Durable operational event lifecycle and immutable lifecycle history.
- Backend Operational Graph with versioned entity/relationship contracts.
- Fact/derived/hypothesis provenance as a cross-domain contract.
- Shared live/replay time context across 3D, Flow, timeline and inspector.
- Operational Replay backed by normalized NORTHMINE storage.
- Universal entity/event/shift/time search.
- Event-driven operational WebSocket/stream.
- S01–S12 deterministic mining scenarios with expected graph, lifecycle and recovery.
- Versioned DB migrations, downgrade/dry-run and replay-store rollback.
- Mission Control SLOs, event-lag/freshness metrics and release evidence manifest.

## UI/UX technical audit

Implementation-integrity verdict: the application is product-specific and contains strong mining capabilities, but its presentation is the accumulated result of multiple visual systems and module migrations. It is not a coherent Mission Control shell yet.

| Dimension | Score | Key finding |
|---|---:|---|
| Accessibility | 2/4 | Useful focus/reduced-motion work, but custom drawers/canvas semantics and sub-44 px mobile controls remain. |
| Performance | 2/4 | Lazy routes and 3D limits help; very large CSS/chunks, duplicated chart stacks and layout-property animation remain. |
| Responsive | 3/4 | Seven viewport projects and overflow tests exist; mobile remains a compressed module shell in places. |
| Theming | 2/4 | Extensive tokens exist, but multiple token files/themes/effects conflict and copper sometimes replaces informational cyan. |
| Implementation integrity | 2/4 | Mining-specific system, but manual routing, duplicate visual worlds and sidebar/card patterns create systemic drift. |
| **Total** | **11/20** | **Acceptable; significant consolidation required.** |

The Impeccable detector found repeated left-accent card stripes, layout-property transitions, decorative grids, gradient text and bounce easing. The font warning is only partially valid: the public design explicitly selects IBM Plex, while legacy operational surfaces still mix Inter/JetBrains. These are Phase 2 consolidation inputs, not authorization for a visual rewrite in Phase 0.

## Test and build baseline

Executed against the audited working tree:

- `npm run lint`: **PASS** (`tsc --noEmit`).
- `npm run build`: **PASS**; Vite built 4,606 modules in 45.54 s after dependency installation.
- Frontend build observations: CSS bundle about 492 kB uncompressed; ECharts and Three vendor chunks each exceed 1 MB uncompressed; Vite plugin deprecation warnings; deprecated installed Recharts/Three helper versions were reported.
- Frontend unit suite: **97 passed, 1 failed**. The same `ConversationTurnManager` test failed alone at the 5 s timeout, so this is reproducible rather than only build contention (`frontend/src/lib/agentRealtime/ConversationTurnManager.test.ts:209`).
- Backend suite: **354 passed, 14 failed**. Failures include a test settings stub missing `environment`, security/audit assertions and shift/report/performance tests escaping fixtures into REAL/Wenco paths where `pyodbc` is unavailable. This exposes test isolation and service coupling debt; it is not evidence that Wenco itself is broken.
- Pytest also reports obsolete `on_event` lifecycle use, unknown timeout config options and cache permission warnings.

The current CI workflow is not sufficient proof of a clean release: it installs backend development requirements before running application tests, but not the full application requirements until the later build step (`.github/workflows/agent-hardening.yml:1-43`; `backend/requirements-dev.txt:1-4`). It also omits Playwright, security scans, artifacts and deployment/rollback gates.

## Security and industrial boundary

Positive controls to retain:

- Demo mode is explicitly separated from REAL/Wenco configuration.
- Access token restoration uses an HttpOnly refresh-cookie exchange rather than persisted access tokens.
- MFA, brute-force controls, RBAC checks, audit middleware, rate limiting and security headers exist.
- The product already distinguishes system connectivity failures from operational conditions.

Mission Control security gaps to resolve before release:

- Formal STRIDE threat model and trust-boundary diagram do not exist.
- Site/tenant isolation must become an explicit attribute in every operational state, graph, event, replay and search query.
- Operational WebSocket authorization, subscription scope and reconnect behavior require dedicated tests.
- Rate/concurrency state must be verified for multi-worker/distributed deployment.
- Secrets/dependency/SAST/SBOM scanning and immutable CI evidence are absent.
- Event/recommendation audit retention and PII policy require human decisions.
- Direct-by-ID agent investigation/work-product endpoints require object-level ownership/site checks; list filtering alone is insufficient and creates IDOR risk (`backend/app/ai/investigation_router.py:257-290`; `backend/app/ai/work_products/router.py:65-115,146-186,199-235`).
- Wenco SQL is parameterized and encrypted, but the connector does not prove an exclusively read-only account or declare `ApplicationIntent=ReadOnly`; that boundary must be demonstrated, not assumed.
- No future path may silently write to Wenco/FMS. Recommendations are advisory; a future control plane would require a separate ADR, trust boundary, authorization and human approval.

## Observability and operations

Current assets include rotating logs, security/audit logs, basic CPU/memory/system status and separate live/ready endpoints. Missing are structured JSON logs, request-wide correlation IDs, centralized metrics/traces, SLOs and Mission Control measures such as source freshness, ingestion lag, event processing lag, WebSocket health, graph calculation latency, replay latency and frontend exceptions.

Readiness must evolve from “service dependencies available” to “operational truth is safe to label LIVE.” A stale Wenco or ingestion source must never render as live merely because FastAPI returns 200.

## Technical debt and duplication

1. Manual routing has two sources of truth and mixes `pushState` with full navigation.
2. No canonical cross-view operational context.
3. Polling-based operational state and agent-only WebSocket.
4. Service calculations can fetch global provider data even when a dataset fixture was supplied, as exposed by shift tests.
5. Large overlapping CSS/token files, seven themes/effects and brand/semantic color leakage.
6. ECharts and Recharts overlap; Leaflet/react-leaflet appear unused; graph technology remains undecided.
7. SQLite schema evolution is ad hoc and lacks global version/rollback.
8. Build/start scripts install or repair dependencies; no immutable artifact.
9. CI, documentation and local runtime versions drift.
10. Existing harness validates many agent contracts but does not execute the requested mining event/graph/replay scenarios end to end.

## Protected functionality

Until explicit parity is proven, preserve all public routes, authentication, demo-access flow, SPA fallback, health probes, Decision Cockpit, Current Shift, reports, fleet/loading/production/performance, breakdowns, aerial evidence, 3D constellation, comparison, simulator, operator ranking, admin/security/audit functions and AI runtime. Legacy routes should remain behind adapters during migration.

## Proposed architecture and implementation sequence

The proposed bounded-context architecture, time/state/event contracts and data flow are in `MISSION_CONTROL_TARGET_ARCHITECTURE.md`. The existing-module decisions are in `MISSION_CONTROL_MIGRATION_MATRIX.md`; phased work and gates are in `MISSION_CONTROL_PHASE_BACKLOG.md`; low-fidelity information architecture is in `MISSION_CONTROL_LOW_FIDELITY_IA.md`.

The mandatory order is:

1. approve source repository/SHA and product/demo boundary;
2. stabilize the reproducible baseline;
3. validate information architecture and interaction;
4. consolidate Design System 2.0;
5. introduce the shell with legacy compatibility;
6. build canonical operational state/time/data quality;
7. persist events and lifecycle evidence;
8. expose Operational Graph, then Flow;
9. add replay, anomaly, recommendation and shift intelligence in that order;
10. migrate legacy capabilities only after parity;
11. ground AI on canonical truth;
12. harden security, performance, demo and release gates.

## Rollback strategy

- Freeze each phase to an approved SHA and create logical, path-scoped commits.
- Keep legacy routes and contracts until Mission Control acceptance proves parity.
- Use feature flags for the new shell, operational stream, graph and replay.
- Introduce versioned database migrations with forward, backward or compensating procedures before durable domain data.
- Make event history append-only; rollback code, never erase operational evidence.
- Produce an artifact manifest tying source SHA, lockfiles, migrations, tests and deployed bundle hash.
- Rehearse application rollback and data restore in staging before release.
- For Seenode, verify served bundle filename/hash and distinctive markers; HTTP 200 or a push is not deployment proof.

## Risk register

| ID | Priority | Risk | Required mitigation |
|---|---|---|---|
| R-01 | P0 | Ambiguous implementation source: public derivative/feature SHA versus canonical product/main. | Human approval before Phase 1. |
| R-02 | P0 | No versioned migration/rollback system for events/graph/replay. | Select persistence and migrations in Phase 4 ADR. |
| R-03 | P0 | LIVE may be asserted without source freshness/event-lag readiness. | Define freshness contract and live-state gate. |
| R-04 | P0 | Existing tests are not green or fully isolated. | Clean worktree baseline and classify all 15 stable failures. |
| R-05 | P1 | Current 3D constellation may be mistaken for geospatial operation/graph. | Preserve renderer; replace its data model only after canonical graph APIs. |
| R-06 | P1 | UI rewrite could remove unique module capability. | Compatibility routes and per-module parity matrix. |
| R-07 | P1 | Agent WebSocket could be incorrectly reused as operational truth. | Separate authorized operational stream. |
| R-08 | P1 | Theme/CSS/charts debt makes another visual layer likely. | Design System 2.0 consolidation before broad migration. |
| R-09 | P1 | Build/runtime are mutable and rollback is unproven. | Immutable artifact, release manifest and rollback rehearsal. |
| R-10 | P1 | Synthetic demo could be confused with real Wenco evidence. | Environment labels, provenance and zero production credentials in public demo. |
| R-11 | P2 | Graph technology selected before scale/accessibility requirements. | Delay ADR until node/edge/update/mobile budgets are approved. |
| R-12 | P2 | Operator/AI hypotheses may be shown as facts. | Mandatory provenance type and UI semantics. |

## Decisions requiring human approval

1. Is Mission Control implemented first in this public demo, in the canonical private SQL/Wenco product, or in a new shared package/worktree?
2. Which exact branch and SHA become the Phase 1 baseline?
3. Is OPERATION 3D intended to become a true geospatial mine scene, or is the current constellation retained only as a technical/relationship view?
4. What are realistic fleet, event, graph-edge, update-rate and replay-window budgets?
5. Which site timezone and shift-boundary rules are authoritative?
6. Which durable database and migration framework will own operational state/events/replay?
7. Who may acknowledge, action and close events, and which actions require audit or dual approval?
8. What retention applies to events, evidence, operator context, AI conversations, screenshots and traces?
9. Which role gets which default disclosure depth?
10. How long must legacy URLs remain compatible?
11. Should the six alternate themes/effects be retired from the operational product?
12. How prominent may the AI orb/proactive assistance be in NOW?
13. Is the synthetic PH03 scenario approved as the default commercial/demo story?
14. What container/artifact, observability and security-scanning tooling is authorized?

## Phase report

```text
PHASE:
0 — DISCOVERY & FREEZE

STATUS:
COMPLETE WITH BLOCKERS FOR PHASE 1

OBJECTIVE:
Audit repository reality and define a controlled Mission Control program.

IMPLEMENTED:
Documentation only: audit, target architecture, migration matrix, phased backlog and low-fi IA.

FILES CHANGED:
NORTHMINE_MISSION_CONTROL_AUDIT.md
MISSION_CONTROL_AUDIT.md
MISSION_CONTROL_TARGET_ARCHITECTURE.md
MISSION_CONTROL_MIGRATION_MATRIX.md
MISSION_CONTROL_PHASE_BACKLOG.md
MISSION_CONTROL_LOW_FIDELITY_IA.md
CURRENT_ARCHITECTURE.md
UI_INVENTORY.md
API_INVENTORY.md
RISK_REGISTER.md

ARCHITECTURAL DECISIONS:
Proposals only; no ADR accepted without human review.

TESTS:
Typecheck PASS; build PASS; frontend unit 97/98; backend 354/368.

VISUAL EVIDENCE:
Existing versioned screenshots and code-level UI audit inspected; no new Mission Control visual was implemented.

SECURITY:
Existing controls and gaps inventoried; no credentials read or changed.

PERFORMANCE:
Build bundle observations captured; Mission Control budgets still require approval.

REGRESSIONS:
No product code changed. Existing test failures documented.

OPEN RISKS:
R-01 through R-12 above.

NEXT PHASE:
Blocked pending review and explicit GO.
```

# STOP

Do not implement Phase 1 until this audit is reviewed and the required human decisions are resolved.
