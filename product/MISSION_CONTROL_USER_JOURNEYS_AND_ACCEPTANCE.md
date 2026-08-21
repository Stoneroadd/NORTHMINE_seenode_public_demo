# Mission Control User Journeys and Acceptance

Status: **EN VALIDACIÓN** against mining users. Repository evidence validates feasibility; it does not replace field usability testing.

## Role-aware default depth

| Role | Default experience | Additional depth | Proposed event authority |
|---|---|---|---|
| Manager/viewer | situation, impact, recovery, history | shift comparison and supporting evidence | read only |
| Operador/dispatch | situation, affected assignments, recommendations and timeline | entity/cycle evidence | acknowledge and record a human action |
| Supervisor | situation, propagation, action and carryover | full operational evidence | confirm, acknowledge, record action, normalize and close |
| Admin/technical | same product with technical disclosure | data quality, source and audit | lifecycle authority subject to site policy; no FMS control |
| Demo/viewer | synthetic scenario with explicit demo context | read-only evidence and replay | read only |

This authority matrix is a product proposal, not an implemented permission grant. Backend policy and security approval are required before lifecycle actions exist.

## Critical journeys

### J01 — Stable operation

User lands in NOW, sees `Operation stable` and data freshness, and may inspect recently recovered conditions or open OPERATION.

Acceptance: stable state is understood within 5 seconds; no fabricated activity or KPI filler appears.

### J02 — PH03 mechanical stop

NOW prioritizes `PH03 stopped`; Level 1 states six affected trucks and elapsed time; Inspect opens Level 2 without losing context; OPERATION highlights only the affected subgraph; Event Detail exposes evidence and limitations on demand.

Acceptance: a new user identifies condition and affected equipment within 10 seconds and reaches evidence in one interaction.

### J03 — Recovery

The condition changes to recovering without disappearing. After normalization it moves to Recently recovered while HISTORY retains lifecycle and actions.

Acceptance: the user can state whether recovery is underway or complete; CLOSED never means deleted.

### J04 — Data delay

LIVE eligibility fails; top context shows `Operational data delayed` and last synchronization; last-known state is qualified as stale; the connector condition remains distinct from mine events.

Acceptance: no participant describes stale state as live or the connector failure as a mine event.

### J05 — Historical investigation

Search finds PH03 and its closed event; Replay opens at 10:31; HISTORICAL is explicit; Flow/3D, timeline and inspector share timestamp and selection.

Acceptance: switching representation preserves entity/time and never queries Wenco per animation frame.

## Five-to-ten-second validation script

Test each desktop prototype with at least one manager/supervisor and one operations/dispatch participant. Present each state for ten seconds without explanation, then ask:

1. Is the operation stable?
2. What deserves attention first?
3. What is affected?
4. Is this live, delayed or historical?
5. Where would you inspect evidence or recovery?

Gate metrics:

- 90% correctly identify stability and primary condition.
- 90% correctly distinguish operational event from data/system failure.
- 80% reach Event Detail or Replay without coaching.
- Median comprehension time ≤10 seconds.
- No critical task depends on color or animation alone.

Until these are measured with mining users, Phase 1 is **CONDITIONAL**, not fully accepted.
