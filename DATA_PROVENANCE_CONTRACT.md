# Data Provenance Contract

## Decision

Provenance is backend-owned and orthogonal:

- `origin`: `REAL | SYNTHETIC | SIMULATED | REPLAY | UNKNOWN`
- `representation`: `SOURCE | DERIVED`
- `source_system`: system that supplied the evidence
- `source_id`: connector/dataset identifier
- `demo_context`: explicit boolean derived from origin

`DERIVED` is not an origin: a deterministic result can be derived from real, synthetic, simulated or replay evidence. Hypotheses are separately typed and never change provenance.

## Invariants

1. Synthetic markers override a conflicting `REAL` legacy label.
2. `UNKNOWN` never defaults to `REAL` or `NORMAL`.
3. Backend connector/normalization attaches provenance; frontend labels never establish truth.
4. Derived payloads retain parent evidence provenance. Mixed provenance is represented as an evidence set, never flattened to REAL.
5. Events persist provenance per evidence item. Closure cannot rewrite it.
6. Replay uses persisted evidence and emits origin `REPLAY` plus original evidence origin.
7. Reports snapshot provenance with citations. AI context receives the canonical object and must state demo/unknown limitations when material.
8. Legacy `data_source`, `source_system`, `source`, and `is_demo` remain compatibility fields but are generated from the canonical object.

## Implemented P0 closure

`data_provenance.py` resolves and stamps datasets. `data_provider.py` stamps both synthetic demo and Wenco/cache results. `cockpit_service.py` no longer hardcodes REAL/WENCO and marks its output `DERIVED`. Regression tests prove a source named synthetic cannot be promoted by `data_source=REAL`.

`build_shift_report` now uses one supplied dataset throughout alert derivation, removing an implicit Wenco re-query that could mix origins. Full propagation into every legacy service remains migration work and is a Phase 1 input contract, not permission to relabel unconverted payloads.

## API example

```json
{
  "provenance": {
    "origin": "SYNTHETIC",
    "representation": "DERIVED",
    "source_system": "NORTHMINE",
    "source_id": "northmine-demo-synthetic",
    "demo_context": true
  }
}
```

Missing or invalid provenance fails closed to `UNKNOWN`. Production ingestion must reject/quarantine `UNKNOWN` where operational truth is required.
