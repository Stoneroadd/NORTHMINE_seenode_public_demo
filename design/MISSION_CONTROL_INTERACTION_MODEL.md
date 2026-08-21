# Mission Control Interaction and Context Model

## Spatial topology

```text
TopContextBar
  site/pit · shift · operational time · LIVE/HISTORICAL/data condition · search

OperationalWorkspace
  NOW | OPERATION(3D/FLOW) | HISTORY | SEARCH

ContextDock
  workspace switcher; never a module catalogue

EntityInspector / EventInspector
  contextual, persistent selection, progressive disclosure
```

The inspector is a non-modal side sheet on desktop, an anchored sheet on tablet and a full-height navigable surface on mobile. It preserves workspace context and returns focus to the invoking entity.

## Canonical client context

```text
siteId
shiftId
temporalMode: LIVE | HISTORICAL
timestamp
selectedEntityId
activeEventId
representation: 3D | FLOW
workspace: NOW | OPERATION | HISTORY | SEARCH
roleDepth
```

React Query remains server-state cache. This context contains references and presentation state, never duplicated operational truth.

## Context-preserving transitions

| From | Action | To | Preserved | Changed |
|---|---|---|---|---|
| NOW | Inspect event | NOW + Event Inspector | site, shift, LIVE, event, entity | disclosure Level 2 |
| NOW | Show in operation | OPERATION/FLOW | site, shift, time, event, entity | workspace/representation |
| OPERATION/3D | Switch to Flow | OPERATION/FLOW | all canonical context | representation only |
| Event Detail | Replay | OPERATION or HISTORY/Replay | site, shift, event, entity | mode=HISTORICAL, timestamp=event time |
| HISTORY | Open event | HISTORY + Event Inspector | site, shift, historical range | event/entity selection |
| SEARCH | Open | prior workspace + inspector | site/shift/time unless result explicitly changes them | selected resource |
| SEARCH | Replay result | Replay | result site/shift/time after authorization | mode and cursor |
| Replay | Return live | NOW or OPERATION | site, selected entity when valid | mode=LIVE, current shift/time |

Browser Back restores the previous workspace/context snapshot. Deep links never grant access: unauthorized or cross-site resources resolve as not found.

## Progressive disclosure

- Level 1 — Understand: identity, condition, impact count and elapsed/recovery state.
- Level 2 — Decide: affected groups/entities, evidence-based recommendations, reasons, limitations and recorded actions.
- Level 3 — Investigate: source facts, timestamps, cycles, assignments, production, derived metrics, hypotheses, provenance, quality and audit.

FACT, DERIVED and HYPOTHESIS are explicit labels. Recommendations use advisory verbs and never imply automatic FMS execution.

## Responsive behavior

- Desktop: full workspace, dock, persistent side inspector and bounded Flow/3D canvas.
- Tablet: simplified Flow clusters, overlay inspector, touch-first controls and reduced simultaneous detail.
- Mobile: NOW/event list, search, event/entity detail and shift summary. OPERATION becomes a simplified affected-path/list representation; full 3D is optional and never merely shrunk.

All targets are at least 44 px. Keyboard order follows visual hierarchy. Canvas views have a synchronized semantic outline/list. Critical meaning uses label + shape/icon + color; reduced motion removes propagation animation without losing state.
