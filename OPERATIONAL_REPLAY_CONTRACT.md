# Operational Replay Contract

Input is authorized `(tenant, site, shift, timestamp)` plus an optional knowledge cutoff. Output is a versioned snapshot of known entities, canonical states, effective relationships, active/transitioning events, evidence references, quality and provenance.

Default corrected replay uses all accepted records known to NORTHMINE now, projected at event time. “As known then” additionally limits `ingested_at <= knowledge_cutoff`. The UI must label which mode is active.

Replay extracts a bounded window from NORTHMINE persistence, builds checkpoints plus ordered deltas and advances locally/server-streamed between them. It never queries Wenco per animation frame. Seek returns the nearest checkpoint plus deltas. 3D, Operational Flow, timeline and inspector share one snapshot ID, replay timestamp and selected entity.

Determinism requires schema/rule/calendar versions, stable ordering, idempotent inputs and scenario seed. Missing/conflicting data remains visible as quality; replay does not interpolate operational truth unless an explicit derived method is identified. Authorization is evaluated for every replay request/export and evidence link.
