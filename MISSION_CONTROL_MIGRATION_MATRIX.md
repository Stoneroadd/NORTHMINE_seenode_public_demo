# NORTHMINE Mission Control — Legacy Migration Matrix

**Rule:** no capability is removed until its unique behavior, authorization, evidence and route compatibility have passed parity tests.

| Existing capability | Decision | Mission Control destination | Preserve before migration | Retirement gate |
|---|---|---|---|---|
| Decision Cockpit | MERGE | NOW + Shift Intelligence | calculations, recommendation evidence, decision audit | NOW reproduces decisions/evidence and passes acceptance |
| Dashboard / Resumen | REPLACE progressively | NOW | monthly plan/deviation and unique summaries | every unique block mapped to NOW, History or detail |
| Turno Actual | MERGE | NOW + HISTORY | anomaly logic, deterministic narrative, snapshots, reports | shift narrative/event/history parity |
| Mapa Operacional 3D | CONTEXTUALIZE / PARTIAL REPLACE | OPERATION 3D or technical relationship view | R3F renderer, search, filters, inspector, fallback, perf controls | canonical graph/state drives it; geospatial claim separately validated |
| Producción | CONTEXTUALIZE | entity/event evidence + HISTORY Level 3 | shift/hourly detail, targets, exports | inspector/history parity |
| Rendimiento | CONTEXTUALIZE | entity/event evidence Level 3 | comparisons and equipment performance | parity plus performance methodology review |
| Flota | CONTEXTUALIZE | OPERATION + Entity Inspector + SEARCH | status table, filters, equipment drill-down | entity/search/operation parity; legacy URL adapter retained |
| Carguío | CONTEXTUALIZE | OPERATION + Entity Inspector | routes, hourly/loading ranking and details | loading entity/relationship parity |
| Averías | MERGE | Operational Events + HISTORY + entity evidence | XLS/mail import, maintenance analysis and history | event source/evidence/recovery parity |
| Alertas | REPLACE progressively | persisted Operational Events | priority rules and entity drill-down | durable lifecycle/evidence/audit parity |
| Vista Aérea | KEEP + CONTEXTUALIZE | OPERATION geospatial evidence | orthomosaic viewer and date evidence | never relabel as live/georeferenced map without proof |
| Análisis Experto | CONTEXTUALIZE | HISTORY / Shift Intelligence technical depth | evidence-based analysis | provenance and uncertainty contract |
| Reportes | MERGE | HISTORY / shift summary | PDF/XLSX and detailed evidence | unified history export parity |
| Comparativa | MERGE | HISTORY entity/shift comparison | filters and comparison logic | scoped search/history comparison parity |
| Predicción ML | CONTEXTUALIZE / REVIEW | hypothesis/forecast detail | validated model outputs only | model/evidence/value review; explicit hypothesis labels |
| Simulador | KEEP | separate lab/what-if tool | scenario behavior and isolation | never mixed with LIVE truth |
| Ranking Operadores | CONTEXTUALIZE | restricted SEARCH/HISTORY/entity detail | methodology, responsible-use and audit | RBAC/PII/domain approval |
| Admin Users/System/Audit | KEEP | non-operational administration | auth, health, audit and system status | out of Mission Control navigation; direct secure access |
| Demo Access Admin | KEEP | public-demo administration | durable request workflow | remains isolated from operational data |
| Public landing/origin/access/privacy | KEEP | public surface outside shell | current routes, claims and synthetic disclosure | not part of Mission Control migration |
| NORTHMINE AI | KEEP, reduce prominence | global contextual assistant | planner/executor/verifier, registry, audit, memory, WS | tools read canonical state/events/graph/replay only |
| Agent events/replay | KEEP SEPARATE | conversational runtime | delivery/reconnect/session audit | never renamed or persisted as mine operational events |
| Wenco direct request-path provider | REPLACE GRADUALLY | ingestion/staging/normalized store | verified SELECT contracts and fixtures | canonical store parity and source-load validation |
| Synthetic data provider | KEEP AS ADAPTER | deterministic Mission Control demo | seed determinism and DEMO provenance | impossible to label synthetic data REAL/WENCO |

## Cross-cutting migration conditions

- Preserve `/acceso-demo`, authentication, refresh cookies, SPA fallback and health routes throughout.
- Establish a typed route manifest before changing navigation.
- Apply feature flags to new shell, events, graph, replay and stream.
- For every module, document unique API fields, authorization, exports, empty/loading/error/stale behavior and analytics usage before retirement.
- Old and new views must consume the same canonical contract during the parity window; do not duplicate business rules in the frontend.
- Any route retirement requires a redirect/adapter period approved by the user.

# STOP

The matrix is a proposal. No module is approved for deletion or retirement.
