# Operational Graph Temporal Model

Operational Graph is the technical temporal relationship model; Operational Flow is its user-facing representation.

Each directed relationship has `relationship_id`, tenant/site, typed source/target entity IDs, relationship type, half-open `effective_from/to`, provenance/evidence, assertion type (`FACT|DERIVED|HYPOTHESIS`), optional confidence for hypotheses, quality, source record ID and audit timestamps.

Examples: `ASSIGNED_TO` truck→loading unit, `TRAVELS_VIA` truck/group→route, `DELIVERS_TO` route/equipment→destination, `LOCATED_AT`, `OPERATED_BY`. Direction has domain meaning and is not chosen for drawing convenience.

At 10:31, “trucks assigned to PH03” selects authorized `ASSIGNED_TO` edges where `effective_from <= T < effective_to`, then applies deterministic correction/order rules. Current edges are merely the query at now. Overlapping exclusive assignments are retained but marked `CONFLICTING`; unknown endpoints do not create guessed edges.

Changing an assignment closes the prior interval and appends the next edge. Replay reads persisted NORTHMINE intervals, not Wenco per frame. Aggregation/clustering is a view projection and cannot change graph truth.
