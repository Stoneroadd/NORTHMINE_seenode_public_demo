# NORTHMINE Mission Control — Low-Fidelity Information Architecture

**Status:** Phase 1 structural prototype — EN VALIDACIÓN. Visual styling and production code remain deferred.

These wireframes define hierarchy and interaction, not visual styling. Copper, typography, surfaces and motion are deliberately deferred until the information architecture is approved.

## Shared shell

```text
┌ NORTHMINE ─ Site/Pit ─ Shift ─ 14:31 ─ LIVE ● ─ Data fresh ─ [Search] ┐
│                                                                        │
│                         ACTIVE WORKSPACE                               │
│                                                                        │
├─────────────── NOW ─ OPERATION ─ HISTORY ─ SEARCH ─────────────────────┤
```

- Top context answers where, which shift, when and whether data is live/historical/delayed.
- Context dock changes workspace, not product modules.
- AI is optional/global and visually secondary.
- Entity/event inspector stays contextual rather than forcing module navigation.

## NOW

Stable state:

```text
┌ Operation stable ───────────────────────────────────────────────────────┐
│ No relevant operational conditions require attention.                  │
└─────────────────────────────────────────────────────────────────────────┘

Recently recovered                                        [Show 2]
```

Active conditions:

```text
CRITICAL
┌ [shape + label] PH03 stopped                                      14 min ┐
│ 6 trucks affected                                      [Inspect]         │
└───────────────────────────────────────────────────────────────────────────┘

ATTENTION
┌ [shape + label] North haul route slower than normal                8 min ┐
│ 7 trucks affected                                      [Inspect]         │
└───────────────────────────────────────────────────────────────────────────┘

Recently recovered                                        [Show 2]
```

Rules:

- prioritize operational impact, not raw chronology;
- no KPI filler in stable state;
- data delay is a system/data condition above the list, never a mine event;
- opening Inspect reveals Level 2 in place and the shared inspector.

## OPERATION 3D

```text
[3D | FLOW]        Layers [essential]          Focus: PH03        [Reset]
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│                    spatial/3D operational surface                       │
│                                                                         │
│            normal context quiet; affected entities dominant             │
│                                                                         │
├ PH03 — CRITICAL — 6 affected ─────────────────────────────── [Inspect] ┤
└─────────────────────────────────────────────────────────────────────────┘
```

- Switching 3D/Flow preserves site, shift, timestamp, entity and event.
- In historical mode, a replay controller appears; in LIVE it does not.
- Until geospatial contracts exist, the current constellation must be labeled as a relationship/technical view.
- Mobile uses a simplified spatial snapshot plus prioritized entity/event list.

## OPERATIONAL FLOW

```text
[3D | FLOW]              Scope: affected operation              [Overview]

     LOADING                  TRANSPORT                 DESTINATION
        │                         │                           │
   PH01 normal ───── assigned group A ───────────── Crusher normal
        │
   PH03 CRITICAL ════ 6 TRUCKS AFFECTED ═══════ alternative paths
        │                      │
     [select]              [select group]

Selected: PH03   stopped · source FACT · event started 10:31    [Inspect]
```

- semantic zoom changes aggregation and detail;
- no percentages/mini-charts on every node;
- propagation may animate briefly, then settle; reduced motion preserves shape/label/path emphasis;
- provide synchronized accessible outline/list for keyboard and screen-reader use.

## EVENT DETAIL

```text
┌ [CRITICAL shape] PH03 stopped                    ACKNOWLEDGED ┐
│ Started 10:31 · 14 min · 6 trucks affected                    │  Level 1
├───────────────────────────────────────────────────────────────┤
│ Affected operation                                             │
│ 6 trucks require attention                                    │  Level 2
│                                                               │
│ Suggested options                                             │
│ T01 → PH01  [reason] [limitations]                             │
│ T02 → Fuel  [reason] [limitations]                             │
│ ...                                                           │
│                                                               │
│ Recorded actions                            [Add/ack by role]  │
├───────────────────────────────────────────────────────────────┤
│ ▸ Evidence  ▸ Timeline  ▸ Derived metrics  ▸ Hypotheses       │  Level 3
│ ▸ Audit     ▸ Technical source details                         │
└───────────────────────────────────────────────────────────────┘
```

- FACT, DERIVED and HYPOTHESIS have explicit labels and distinct semantics.
- Recommendations never imply execution.
- Lifecycle actions are visible only when authorized.

## HISTORY

```text
[Current shift ▼] [20 Aug 2026] [Entity/event search]

SHIFT RESULT
Short evidence-grounded statement.

WHAT HAPPENED            WHAT AFFECTED PRODUCTION
most relevant events     primary constraints

WHAT WAS DONE            WHAT RECOVERED            WHAT REMAINS OPEN
recorded actions         resolved conditions        carryover

EVENT TIMELINE
10:31 PH03 stopped ─ 10:32 trucks affected ─ 10:38 action ─ 10:52 stable
                                                      [Open] [Replay]
```

- detailed KPI tables remain supporting evidence;
- entity history, comparisons, reports and replay are reachable from the same context;
- current shift narrative becomes persistent at shift close.

## REPLAY

```text
HISTORICAL — SHIFT DAY — 20 AUG — site timezone

07:00 ────────────────●──────────────────────────── 19:00
                    10:31
[◀] [▶] [1x] [5x] [20x] [NEXT EVENT]

[3D | FLOW]                                      Selected: PH03
┌──────────────────────────────────────────────────────────────┐
│ synchronized historical workspace                            │
└──────────────────────────────────────────────────────────────┘

10:31 PH03 stopped
10:32 6 trucks affected
```

- one replay cursor drives every representation;
- seeking requests bounded NORTHMINE windows/snapshots, never source queries per frame;
- LIVE and HISTORICAL labels are impossible to confuse.

## SEARCH

```text
┌ Search equipment, operator, route, event, shift or time... ───────────┐
│ PH03                                                                   │
├────────────────────────────────────────────────────────────────────────┤
│ EQUIPMENT                                                              │
│ PH03 · Current state Normal · data fresh              [Open] [History] │
│                                                                        │
│ EVENTS                                                                 │
│ PH03 stopped · 10:31–10:52 · Closed                         [Replay]   │
│                                                                        │
│ SHIFTS / TIMES                                                         │
│ Day shift · 20 Aug · 3 relevant PH03 events                [Open]     │
└────────────────────────────────────────────────────────────────────────┘
```

- results are grouped by entity type and scoped by current site by default;
- current versus historical state and data quality are explicit;
- Open/History/Replay preserve current context unless the user intentionally changes it;
- keyboard-first command-palette behavior with visible focus and announced result count.

## Responsive priority

Desktop owns full spatial/graph work. Tablet retains Flow with simplified grouping. Mobile prioritizes:

1. live/data condition;
2. active/recent events;
3. search;
4. event/entity detail;
5. shift summary;
6. simplified operation snapshot.

Mobile must not shrink the complete desktop graph or 3D scene into an unusable canvas.

## Decisions encoded by the Phase 1 brief

- Shared shell hierarchy is the proposed Phase 1 direction; explicit user approval remains the gate.
- Stable NOW shows no shift-objective filler; recently recovered conditions remain collapsed unless relevant.
- Event authority follows the proposed role matrix and requires backend/security approval before implementation.
- True geospatial 3D is not required for the first public-demo Mission Control slice; the current constellation remains labeled technical/legacy.
- Only opaque site/shift/time/entity/event/view references may be serialized; authorization claims and personal data may not.
- Mobile uses the simplified task-prioritized representation defined in the interaction model.

# STOP

These low-fidelity structures require explicit review before Phase 2 or visual-system implementation.
