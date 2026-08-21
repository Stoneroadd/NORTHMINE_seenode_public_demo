# NORTHMINE Mission Control — Phase 1 Product Brief

Status: **EN VALIDACIÓN**. This brief authorizes information-architecture review only, not production UI implementation.

## Job and audience

Mission Control is an **Operate** surface for open-pit mine managers, supervisors, dispatchers/operators and technical administrators. A user arrives during a live shift or an investigation and must understand the primary operational condition within 5–10 seconds, identify what it affects, inspect trustworthy evidence and determine whether recovery occurred.

The public-demo implementation uses deterministic synthetic evidence. It is not a production Wenco integration and must never imply otherwise.

## Outcome and proof

The primary journey is:

```text
NOW → OPERATION → EVENT DETAIL → RECOVERY → HISTORY / REPLAY
```

Success means the user can answer, without visiting several legacy modules:

1. Is the operation stable?
2. What is the main condition?
3. Which entities are affected?
4. What evidence or action should be inspected?
5. Has the operation recovered?

Proof comes from canonical backend facts, deterministic derivations, explicit hypotheses, provenance and data quality. More visible data is not proof of comprehension.

## Selected interaction direction

- A compact contextual shell replaces module-first navigation: top operational context, maximized workspace and a contextual dock for NOW, OPERATION, HISTORY and SEARCH.
- NOW is the default landing and contains only prioritized operational situations, recent recovery and material system/data conditions. A stable shift remains visually calm; no KPI filler is added.
- OPERATION has two synchronized representations: 3D answers **where** and Operational Flow answers **what affects what**. Selection and timestamp survive switching.
- Event Detail is an inspector, not a route maze: Level 1 understand, Level 2 decide, Level 3 investigate.
- HISTORY unifies narrative, event timeline, entity history and Replay. Search is global and preserves operational context.

The focal moment is a critical condition becoming dominant while unrelated operation remains subdued: `PH03 stopped → 6 trucks affected`.

## Scope and boundaries

Included in Phase 1:

- role journeys and operational questions;
- workspace/context topology;
- event inspector and progressive disclosure;
- stable, active, recovering, delayed-data and software-error states;
- route/context transition rules;
- low-fidelity desktop/tablet/mobile structures;
- acceptance and usability-test protocol.

Untouched: React routing, shell, CSS, design tokens, backend event/graph/replay engines, legacy-route removal, graph-library selection and Wenco credentials/schemas.

Anti-goals: permanent sidebar, card/KPI wall, full graph exposure, decorative telemetry, AI-first navigation, hidden uncertainty, mobile desktop shrink, or representing synthetic values as real.

## States and realistic ranges

| Dimension | Minimum | Typical | Maximum before aggregation |
|---|---:|---:|---:|
| Active relevant situations in NOW | 0 | 1–4 | 8 |
| Directly affected entities shown at Level 2 | 0 | 1–12 | 25 |
| Event evidence items initially disclosed | 0 | 3–8 | virtualized/filtered |
| Search results per group | 0 | 3–10 | paginated/virtualized |
| Timeline events in viewport | 0 | 10–40 | virtualized |

Material states: stable, detected, acknowledged, actioned, recovering, normalized, closed, data delayed, data unavailable, incomplete/conflicting evidence, authorization denied, empty history, reconnecting stream and replay boundary reached.

Unknown never becomes Normal. A connector failure is a system/data condition and never appears as a mine operational event.

## Constraints and decisions builders must not invent

- Current roles are `admin`, `supervisor`, `operador` and limited `viewer/demo`; role depth adapts disclosure, not product identity.
- Copper is brand identity, never warning semantics.
- Site timezone drives operational display; persisted timestamps follow the temporal contract.
- URL context may contain opaque `site`, `shift`, `mode`, `at`, `entity`, `event` and `view` references, but never credentials, role claims, tenant authority or personal operator details. The server reauthorizes every reference.
- AI remains optional and secondary, consuming the same canonical context and evidence.
- Existing 3D constellation remains a technical/legacy relationship view until canonical spatial semantics exist.
