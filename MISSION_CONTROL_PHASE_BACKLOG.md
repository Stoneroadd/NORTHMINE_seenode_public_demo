# NORTHMINE Mission Control — Detailed Phase Backlog

Each phase begins from an approved SHA, preserves unrelated work, uses logical commits and reports objective, files, decisions, tests, visual evidence, security, performance, regressions, risks and next phase. A failed gate stops progression.

## Phase 0 — Discovery & Freeze

**Status:** completed by the companion audit, with Phase 1 blocked.

- Approve source repository, branch and SHA.
- Re-run the baseline in a clean worktree with Node 22/Python 3.12.
- Classify every current failed test as code regression, test-isolation defect or environment requirement.
- Capture route/API/schema/dependency/security/performance/visual inventories.
- Record bundle sizes, screenshots, console/network errors and health behavior as SHA-bound artifacts.

**Gate:** reproducible baseline; no ambiguous concurrent changes; implementation source approved.

## Phase 1 — Product & Information Architecture

**Status:** CONDITIONAL — Phase 1 artifacts completed on 2026-08-21; mining-user comprehension validation and explicit IA/ADR-011 approval remain open.

- Define operational questions and role-specific journeys for NOW, OPERATION, HISTORY and SEARCH.
- Define entity inspector, event detail and three disclosure levels.
- Model stable, operational-event, recovering, data-delayed and software-error states.
- Validate low-fi prototypes with mining roles; target comprehension in 5–10 seconds.
- Create acceptance criteria and route/context transition map.

**Gate:** primary condition, affected equipment, recovery and investigation path are understood without visiting multiple legacy modules.

## Phase 2 — Design System 2.0

- Consolidate token namespaces and typography.
- Separate copper brand tokens from semantic operational colors.
- Define status shapes/icons/labels, surfaces, spacing, focus, touch and motion tokens.
- Build primitives for shell, event, timeline, inspector, disclosure and data/system conditions.
- Add component tests, contrast checks, reduced-motion and visual baselines.
- Remove normal-user dependency on multiple visual-effect themes without deleting them until migration approval.

**Gate:** accessible, responsive primitives approved; loading/empty/error/partial/stale states covered.

## Phase 3 — New Application Shell

- Introduce one typed route manifest and routing layer.
- Implement compact top context, workspace, context dock and search entry.
- Add `OperationalContext` for site, shift, temporal mode, timestamp, selected entity/event and representation.
- Keep legacy route adapters and admin/public routes.
- Add route-level error boundaries, keyboard/focus tests and mobile adaptation.

**Gate:** shell passes typecheck, unit/E2E/a11y/responsive tests and all legacy-route smoke tests.

## Phase 4 — Operational Domain Foundation

- Accept ADRs for source boundary, tenant/site, time, persistence and migrations.
- Implement entity identity/aliases, source envelopes, normalized observations and data quality.
- Model effective time, ingestion time, late/out-of-order/duplicate records and shift calendar.
- Implement state-at-T query and typed frontend contracts.
- Create deterministic fixtures independent of live Wenco.

**Gate:** entity X at time T is deterministic, scoped and provenance-aware; migration upgrade/restore/rollback is proven.

## Phase 5 — Operational Event Engine

- Approve event taxonomy and allowed lifecycle transitions.
- Implement detection boundary, event aggregate, immutable transition history, evidence and correlation.
- Add idempotency, deduplication, shift/entity association, close-with-history and audit.
- Start with S01 shovel mechanical stop.

**Gate:** the same S01 seed survives restart and produces the same lifecycle/evidence without deletion.

## Phase 6 — Operational Flow / Operational Graph

- Implement temporal entity/relationship model and impacted subgraph API.
- Prove shovel stop → six assigned trucks → event propagation.
- Complete graph rendering ADR from approved scale/accessibility budgets.
- Implement semantic zoom/clustering, selected-context preservation and accessible list equivalent.
- Add targeted stream updates and reduced-motion behavior.

**Gate:** Flow explains what affects what, does not expose full graph noise, preserves evidence and meets update/frame budgets.

## Phase 7 — Operational Replay

- Design snapshot/delta retention and replay cursor.
- Implement deterministic clock, seek, speed, next-event and window loading.
- Synchronize Flow, 3D, timeline, event and entity selection.
- Reconcile late arrivals without silently rewriting previously viewed evidence.

**Gate:** same seed and timestamp produce identical state across every representation; no Wenco query per frame.

## Phase 8 — Anomaly / Constraint Engine

- Version baseline windows, robust thresholds, persistence and peer/history comparisons.
- Implement loading, haul, dump, queue, shovel, route, destination, fuel and fleet-deficit candidates only where data exists.
- Add false-positive/negative evaluation and insufficient-data behavior.

**Gate:** every anomaly has deterministic evidence and does not trigger on unavailable/incomplete data.

## Phase 9 — Recommendation Engine

- Approve rule inputs and authority boundary.
- Implement advisory options with evidence, reason, objective, affected entity, confidence and limitations.
- Record human acceptance/rejection/action separately from recommendation generation.
- Add explicit negative tests proving no Wenco/FMS mutation.

**Gate:** no recommendation without evidence; no autonomous control path; all actions audited.

## Phase 10 — Shift Intelligence

- Build living narrative from canonical events, actions, recovery and carryover.
- Persist final shift summary and evidence links.
- Validate timezone/shift boundaries and deterministic narrative snapshots.
- Preserve detailed exports as supporting evidence rather than default reading.

**Gate:** every statement/cifra is traceable; hypotheses are labeled; carryover survives shift transition.

## Phase 11 — Legacy Module Migration

- Execute the approved migration matrix one module at a time.
- Capture contract, route, screenshot and behavior parity before each absorption.
- Use feature flags and module-specific rollback.
- Retire only after unique capability and role access are preserved.

**Gate:** no unique capability removed; rollback and redirects tested; user approves each retirement group.

## Phase 12 — AI Integration

- Replace direct/legacy tool sources with canonical Operational State, Events, Graph, Replay, Search and Shift Intelligence APIs.
- Attach evidence IDs and current site/shift/time/entity/event context.
- Test stale/conflicting/insufficient data, prompt injection and provider failure.
- Keep deterministic UI fully usable without an AI provider.

**Gate:** AI cannot create operational truth or conceal uncertainty and always respects scope/RBAC.

## Phase 13 — Security Hardening

- Complete STRIDE model and trust-boundary review.
- Fix object-level authorization and enforce tenant/site scope repository-wide.
- Prove Wenco account/read replica is read-only.
- Test REST/WS RBAC, tenant isolation, IDOR, CSRF/cookies, CSP, rate limits and secure errors.
- Add secrets/dependency/SAST/container/SBOM gates and backup/restore controls.

**Gate:** no unwaived P0/P1; waivers require owner, reason and expiry.

## Phase 14 — Performance & Resilience

- Approve realistic fleet/event/graph/replay/concurrency budgets and SLOs.
- Load, burst, soak and reconnect test APIs, stream, graph, replay, search and frontend.
- Inject Wenco/Postgres/Redis/stream failures end to end.
- Add structured telemetry, correlation IDs, dashboards, alerts and runbooks.
- Validate calm, truthful degradation and LIVE eligibility.

**Gate:** budgets and recovery objectives pass; every dependency failure produces a truthful user state.

## Phase 15 — Commercial Demo

- Implement a versioned deterministic narrative: stable → PH03 stop → six trucks → recommendations → recorded redistribution → recovery → replay → shift summary.
- Build S01–S12 scenario library with trigger, evidence, affected entities, event, graph, recovery and replay assertions.
- Run clean-start E2E, visual regression, accessibility and secret scans.
- Label all synthetic/demo values and prevent any production credential configuration.

**Gate:** repeatable from a clean environment, understandable without training, factually honest and visually approved.

## Phase 16 — Release Readiness

- Produce release manifest binding SHA, lockfiles, migrations, artifact, tests, screenshots and approvals.
- Promote through staging with migration and rollback rehearsal.
- Verify deployed bundle hash/markers, routes, health, stream and data freshness.
- Obtain product, mining-domain, UX, security, performance, accessibility and operations sign-off.

**Gate:** exact-SHA release candidate only. Git push, HTTP 200 or rendered UI alone are insufficient.

## Scenario backlog S01–S12

Each scenario must define deterministic source records, clock, assignments, evidence, expected state intervals, event transitions, graph snapshots, recommendations/limitations, recovery and replay assertions.

| ID | Scenario | Minimum proof |
|---|---|---|
| S01 | Shovel mechanical stop | PH03 event, six assigned trucks, propagation and recovery |
| S02 | Truck deficit | deficit evidence, affected loading capacity, no fabricated trucks |
| S03 | Truck-group congestion | queue/relationship evidence and persistence rule |
| S04 | Loading degradation | baseline comparison and recovery threshold |
| S05 | Route slowdown | travel-time deviation, affected flows and quality |
| S06 | Dump congestion | destination dependency and queue recovery |
| S07 | Fuel bottleneck | station dependency and limited recommendation inputs |
| S08 | Operator meal transition | schedule/assignment evidence and privacy/RBAC |
| S09 | Maintenance/service | maintenance evidence, availability and non-control boundary |
| S10 | Weather restriction | source quality, affected relationships and uncertainty |
| S11 | Simultaneous constraints | prioritization, correlation and no double-counted impact |
| S12 | Data-quality failure | LIVE removed, last sync shown, no operational fabrication |

# STOP

This backlog records Phase 1 as conditionally completed. It is not authorization to begin Phase 2.
