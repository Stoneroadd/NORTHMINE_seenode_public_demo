# Operational Event Contract

An event is a durable operational condition, not a UI alert and not a software error.

Core record: immutable `event_id`, tenant/site/shift, type, severity, current status, primary and affected entity references, first/last detection times, provenance-aware evidence IDs, impact, recommendations, actions, quality, rule/version, correlation/idempotency keys and audit timestamps. Lifecycle transitions are append-only records with actor (`system|human`), reason and evidence.

Allowed transitions:

```text
DETECTED -> CONFIRMED | NORMALIZED | CLOSED
CONFIRMED -> ACKNOWLEDGED | ACTIONED | RECOVERING | NORMALIZED | CLOSED
ACKNOWLEDGED -> ACTIONED | RECOVERING | NORMALIZED | CLOSED
ACTIONED -> RECOVERING | NORMALIZED | CLOSED
RECOVERING -> CONFIRMED | NORMALIZED | CLOSED
NORMALIZED -> CLOSED | CONFIRMED
CLOSED -> (terminal; a recurrence creates/correlates a new event)
```

Skipping states requires a recorded reason. Acknowledgement and action require identity/permission. Recommendation is decision support and cannot imply FMS execution. Normalization records recovery evidence; closing records workflow completion. **CLOSED != DELETED**: events, transitions, evidence and actions are immutable/retained according to policy. Corrections append compensating records.

Severity is operational impact, independent from software/data-quality severity. Facts, derived evidence and hypotheses are typed separately. Events cannot become NORMAL solely because data went unavailable.
