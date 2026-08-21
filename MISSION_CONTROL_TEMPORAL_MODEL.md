# Mission Control Temporal Model

All persisted instants use UTC with an offset-aware representation. Each site owns an IANA timezone and versioned shift calendar; browser locale is presentation only.

## Timestamps

- `event_time`: when the operational fact occurred in source semantics.
- `observed_at`: source observation timestamp; may equal event time.
- `ingested_at`: arrival at NORTHMINE staging.
- `processed_at`: deterministic processing completion.
- `effective_from/to`: validity interval in the operational projection; half-open `[from,to)`.
- `shift_id`: resolved using site calendar at event time, not ingestion time.
- `replay_time`: user-selected historical event-time cursor.

Ordering key: `(event_time, source_sequence_or_id, ingested_at, immutable_record_id)`. Deduplication uses source-system/site/business key plus payload hash. An exact duplicate is idempotent; a changed payload is a correction, not silent replacement.

Late/out-of-order records trigger bounded interval reprojection. Missing event time is quarantined for live truth; it may be retained as evidence using ingestion time but cannot establish operational state. Clock-skew thresholds downgrade quality and alert observability.

Ambiguous/nonexistent local DST times are rejected unless source offset resolves them. Shift crossings are assigned by event time and calendar version. Therefore `state(entity,T)` is deterministic for a specified projection version and knowledge cutoff; replay can offer “as known then” (ingestion cutoff) separately from corrected history.
