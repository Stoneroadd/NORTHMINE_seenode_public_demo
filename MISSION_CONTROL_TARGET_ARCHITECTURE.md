# NORTHMINE Mission Control — Proposed Target Architecture

**Status:** proposal for review, not an accepted ADR
**Baseline:** `3e1eddef5fabc471e26e193d1fc239271c6c550c`

## Architectural intent

Mission Control should add a canonical operational domain between source systems and all user/AI representations. NOW, 3D, Operational Flow, History, Replay, Search and AI must read the same truth, preserve provenance and share one temporal/selection context.

```text
WENCO/FMS read-only          Demo scenario adapter          Other approved sources
          |                          |                              |
          +--------------------------+------------------------------+
                                     |
                         ingestion source envelopes
                     (source id, event time, ingest time)
                                     |
                           raw staging / quarantine
                                     |
                   normalization + identity + data quality
                                     |
          +--------------------------+--------------------------+
          |                          |                          |
 canonical operational state   operational event store   temporal relationships
          |                          |                          |
          +------------------- Operational Graph ----------------+
                                     |
              impact / anomaly / constraint / recommendation
                                     |
        +-------------+--------------+--------------+-------------+
        |             |              |              |             |
       NOW      Operational Flow    Replay         Search   Shift Intelligence
        |             |              |              |             |
        +------------- Mission Control APIs + authorized stream --+
                                     |
                   React shell / 3D / Flow / timeline / inspector
                                     |
                    AI tools over canonical APIs and evidence
```

## Product and technical vocabulary

- **Operational Flow** is the user-facing representation.
- **Operational Graph** is the technical domain and API/storage contract.
- **Operational Event** is a meaningful mine condition with durable lifecycle and evidence.
- **System/Data Condition** is a software, connector or freshness problem and is never styled as a mine event.
- **Replay** reconstructs NORTHMINE state from its own normalized storage. It never queries Wenco per frame.

## Proposed bounded contexts

| Context | Responsibility | Explicit non-responsibility |
|---|---|---|
| Connectors | Read source records with least privilege and bounded windows. | Business meaning, UI models, AI explanations. |
| Ingestion/Staging | Envelope, watermark, deduplicate, quarantine and retain source lineage. | Canonical equipment state. |
| Identity/Normalization | Resolve site/entity identities and normalize units/codes/time. | Hypotheses or recommendations. |
| Operational State | Return the known state and quality of entity X at T. | Lifecycle workflow. |
| Events | Detect/persist meaningful conditions and lifecycle transitions. | Conversational agent events. |
| Operational Graph | Temporal entities/relationships and impacted subgraph. | Visual layout coordinates. |
| Anomalies/Constraints | Deterministic deviation/bottleneck rules and evidence. | Unreviewed autonomous ML. |
| Recommendations | Advisory options, evidence, objective, limitations and confidence. | FMS mutation. |
| Replay | Reconstruct snapshots and ordered changes for a time window. | Live source queries during playback. |
| Search | Scoped entity/event/shift/time discovery. | Direct unrestricted DB search. |
| Shift Intelligence | Evidence-grounded live/final narrative and carryover. | Invented explanations. |
| AI Systems | Explain, compare, navigate and draft from canonical APIs. | Operational source of truth. |
| Audit/Security | Actor, scope, action, correlation, policy and evidence trail. | Mine-event lifecycle itself. |

The existing FastAPI monolith can host these boundaries initially as modules. A service decomposition is not justified until volume, failure isolation or team topology demonstrates the need.

## Canonical contracts

### Provenance

Every meaningful value must carry or inherit:

- `provenance_kind`: `FACT | DERIVED | HYPOTHESIS`
- `source_system` and source record/reference
- `observed_at` or effective interval
- `ingested_at`
- `quality`: `FRESH | STALE | INCOMPLETE | CONFLICTING | UNAVAILABLE`
- for derived/hypothesis values: rule/model identifier and version
- tenant/site scope

Derived tonnage overrides, prefix-based status categories and statistical anomalies must not be stored or presented as source facts.

### Time

- Persist instants in UTC where applicable.
- Store the IANA timezone per site.
- Compute shift membership with a versioned site calendar, not browser locale.
- Distinguish event time, source processing time, NORTHMINE ingestion time and replay cursor time.
- Support late arrivals, duplicates and out-of-order records deterministically.
- Use stable tie-breaking: effective time, source sequence/record id, ingestion sequence.

### Operational state

Candidate conceptual records:

- `entity` and `entity_alias`
- `state_observation`
- `state_interval` or materialized current state
- `data_quality_assessment`
- `assignment_interval`
- `relationship_interval`

The API must answer current state and `state at T`, including uncertainty/quality and the evidence used.

### Operational events

Use an append-friendly aggregate with separate transition history:

- stable event identity and correlation key;
- site/shift scope;
- event type, severity and current status;
- primary and affected entities;
- evidence references and derived measurements;
- recommendations and recorded human/system actions;
- recovery assessment;
- immutable lifecycle transitions with actor/reason/time.

Allowed transitions require a versioned state machine. Closing an event changes current status; it never deletes evidence or history.

### Operational Graph

The graph is temporal and semantic:

- nodes reference canonical entities; they do not duplicate source truth;
- edges include relationship type, direction, validity interval, provenance and quality;
- impacted subgraphs are computed from the snapshot at the event time;
- API responses aggregate by semantic zoom level;
- layout metadata is a presentation concern and does not become domain truth.

## API surface proposal

Do not finalize paths or payloads before ADR/contract review. Candidate capability groups:

```text
/api/mission-control/context
/api/mission-control/now
/api/mission-control/entities/{id}
/api/mission-control/entities/{id}/state?at=
/api/mission-control/events
/api/mission-control/events/{id}
/api/mission-control/events/{id}/transitions
/api/mission-control/graph/snapshot?at=&focus=&level=
/api/mission-control/replay/window
/api/mission-control/search
/api/mission-control/shifts/{id}/intelligence
/api/mission-control/stream
```

All calls require tenant/site scope server-side. Client-provided scope is a requested scope, not proof of authorization.

## Real-time architecture

Create an operational stream separate from `/api/ai-agent/ws`.

Requirements:

- authenticate without long-lived tokens in query strings;
- validate origin and scope;
- authorize subscriptions by tenant/site/role/capability;
- monotonic sequence or cursor, replay window and idempotent client application;
- heartbeat, backpressure, reconnect and resync contract;
- multi-worker/distributed session state;
- observability for connected clients, lag, dropped messages and resyncs;
- stream changes or invalidation hints, not full-page payloads.

React Query remains server-state/cache. A new operational context/store coordinates selected site, shift, temporal mode, timestamp, entity, event and representation. It does not duplicate all backend truth.

## Frontend architecture

```text
MissionControlShell
  TopContextBar
    site/pit | shift | time | LIVE/HISTORICAL | data condition | search
  OperationalWorkspace
    NOW | OPERATION | HISTORY | SEARCH
  ContextDock
  EntityInspector
  Optional AI presence
```

Recommended feature boundaries:

```text
features/mission-control-shell
features/now
features/operation
features/events
features/entities
features/history
features/replay
features/search
features/shift-intelligence
```

Use one typed route manifest and a real routing layer. Preserve old URLs through adapters until parity. Essential context should be shareable in the URL where safe.

3D and Flow consume the same graph snapshot, timestamp and selection. The current R3F constellation remains a legacy/technical representation until it consumes canonical graph contracts. Do not call it geospatial.

## Graph rendering ADR gate

Do not select React Flow, Cytoscape, Sigma or custom Canvas/WebGL yet. First approve:

- maximum and typical node/edge count at each semantic zoom;
- update rate and affected-subgraph size;
- layout requirements and whether layout is server/client/stable;
- clustering and cross-lane semantics;
- selection, keyboard, screen-reader and non-canvas equivalent;
- mobile simplification;
- animation/reduced-motion behavior;
- export/print needs;
- bundle and frame-time budgets.

The likely starting point is a bounded 2D operational subgraph with an accessible synchronized list, not the whole mine graph.

## Persistence and migration

PostgreSQL is a candidate because it is already used for durable demo-access, but it is not approved by this document. The persistence ADR must cover volume, retention, HA, backup, restore, RPO/RTO, indexing, partitioning and deployment topology.

Before Phase 5, establish:

- versioned migrations;
- schema version table;
- upgrade validation and dry run;
- downgrade or compensating migration policy;
- backup before destructive migrations;
- restore rehearsal;
- migration lock and multi-instance safety.

## Security model and trust boundaries

```text
Untrusted/limited source zone: Wenco/FMS read-only endpoint
Connector boundary: allowlisted SELECT contract + bounded workload
NORTHMINE data zone: staging, normalized state, events, graph, replay
Application boundary: scoped APIs and operational stream
User boundary: browser by authenticated role/site
AI boundary: allowlisted tools over canonical APIs only
Public demo boundary: synthetic adapter, no real credentials or data
```

Immediate security prerequisites:

- fix object-level authorization for direct investigation/work-product IDs;
- normalize tenant/site IDs and enforce them in repositories;
- prove DB account/read replica read-only and add `ApplicationIntent=ReadOnly` where supported;
- formal STRIDE review;
- authorization tests for REST and WebSocket;
- parameterized/query allowlist connector tests;
- secrets, dependencies, SAST, SBOM and audit-retention policy.

## Observability and LIVE truth

The LIVE label is a computed system condition requiring:

- source connection healthy;
- last successful ingestion within an approved threshold;
- event processing lag within budget;
- no unresolved conflict that invalidates the view;
- operational stream synchronized or explicit polling fallback;
- site/shift context valid.

Expose structured logs and metrics for API latency, connector/ingestion failures, last source success, stale age, event lag, graph/replay/search latency, recommendation failures, WebSocket health, auth failures and frontend errors. Add correlation IDs across source envelope, processing, API/stream and audit.

## Architecture Decision Records required before implementation

1. ADR-001 Source repository and promotion boundary.
2. ADR-002 Tenant/site identity and authorization model.
3. ADR-003 Time, timezone and shift calendar.
4. ADR-004 Operational persistence and migrations.
5. ADR-005 Wenco read-only ingestion/staging strategy.
6. ADR-006 Canonical entity/state/provenance contracts.
7. ADR-007 Operational event lifecycle and evidence.
8. ADR-008 Operational Graph temporal model.
9. ADR-009 Operational stream protocol and scaling.
10. ADR-010 Graph rendering technology after scale budgets.
11. ADR-011 Replay snapshots/deltas and retention.
12. ADR-012 Recommendation authority and human action audit.

# STOP

This target architecture is proposed for review. It authorizes no Phase 1 implementation.
