# NORTHMINE Mission Control — Phase 0 Risk Register

| ID | Priority | Risk | Evidence/impact | Owner proposal | Exit condition |
|---|---|---|---|---|---|
| R-01 | P0 | Implementation source ambiguous | feature checkout ahead 1 while derivative policy deploys from main/canonical product is elsewhere | Product + Architect | repo/branch/SHA ADR approved |
| R-02 | P0 | Synthetic data mislabeled REAL/WENCO | `cockpit_service.py:85-99`; destroys provenance trust | Backend + QA | contract test proves DEMO/REAL/CACHE truth |
| R-03 | P0 | No canonical state/event/graph/replay store | all Mission Control views could disagree | Architect + Data | Phase 4/5 domain gates pass |
| R-04 | P0 | Tenant/site isolation and direct-ID IDOR gaps | agent artifact endpoints can bypass list scope; Wenco queries are unscoped | Security + Backend | object/site isolation tests pass |
| R-05 | P0 | Wenco read-only boundary not proven | SELECT-only code is not an account/read-replica guarantee | Data/FMS + Security | least-privilege account and load contract verified |
| R-06 | P0 | LIVE label not tied to source freshness/event lag | stale data may look live | SRE + Data | operational readiness/SLO implemented |
| R-07 | P0 | No versioned migration/rollback framework | event/replay history at data-loss risk | Backend + SRE | migration/restore/rollback rehearsal passes |
| R-08 | P1 | Current baseline not green | frontend 97/98, backend 354/368 | QA + domain owners | clean isolated baseline classified and accepted |
| R-09 | P1 | Current 3D mistaken for mine spatial truth | aggregate non-georeferenced constellation | 3D + Product | representation label/ADR and canonical data contract |
| R-10 | P1 | Agent WS reused for operational state | process-local conversational transport cannot guarantee mine truth | Backend + AI | separate authorized operational stream |
| R-11 | P1 | Legacy capability lost in redesign | many unique modules/exports/RBAC behaviors | Product + QA | per-module parity and rollback gates |
| R-12 | P1 | Visual-system duplication | multiple themes/token files/card patterns obscure semantics | UX/UI + Frontend | Design System 2.0 gate |
| R-13 | P1 | Mutable build/start and unproven deploy | dependency install/repair occurs during build/start | SRE | immutable artifact + release manifest + rollback |
| R-14 | P1 | Harness appears stronger than it is | fault/security/latency checks are partly static | QA | S01–S12 execute end-to-end |
| R-15 | P1 | Time model is naive/incomplete | site timezone, DST, shift calendar and late data unresolved | Mining + Data | Time ADR/property tests pass |
| R-16 | P1 | AI/ML may elevate inference to truth | legacy prediction/NLP/recommendation surfaces | AI + Product | provenance labels and grounding tests |
| R-17 | P2 | Premature graph library choice | scale/accessibility/mobile inputs unknown | Graph + Architect | rendering ADR after budgets |
| R-18 | P2 | Dependency and bundle debt | duplicate chart stacks, >1 MB 3D/chart chunks, large CSS | Frontend + SRE | approved budgets and dependency ADR |
| R-19 | P2 | Observability is local and unstructured | weak multi-worker diagnosis and no event/replay metrics | SRE | structured logs/traces/metrics/runbooks |
| R-20 | P2 | Untracked Vosk model/settings and unreadable temp dirs | accidental commit or incomplete freeze | Architect + Repository owner | disposition/ignore policy approved |

No risk is accepted by this document. P0 risks block the relevant implementation/release gate until explicitly resolved.
