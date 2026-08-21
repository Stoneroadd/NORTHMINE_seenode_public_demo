# Canonical Operational State Model

`state(entity, T)` means: the deterministic projection of all authorized records whose event/effective time is at or before site timestamp `T`, ordered by the temporal contract and not superseded before `T`.

## Layers

- **SOURCE FACT**: immutable source assertion (state code, assignment, operator, origin/destination, position, cycle fact) with source event time, ingestion time, provenance and quality.
- **DERIVED STATE**: deterministic rule output referencing input evidence IDs, algorithm/rule version and calculation time.
- **HYPOTHESIS**: inference with evidence, method, confidence and limitations. Never overwrites a fact or derived state.

A state snapshot may contain operational condition, assignment, operator, origin, destination, position if available, active cycle, provenance and quality. Fields can independently be unknown; absence is not NORMAL.

Conflicting facts remain preserved. Resolution uses configured source priority plus event time and emits `CONFLICTING` quality. Late/out-of-order inputs recompute the affected interval and produce a correction record rather than mutating historical evidence. Every projection exposes `as_of`, `known_at`, rule version and evidence references.
