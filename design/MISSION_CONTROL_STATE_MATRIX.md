# Mission Control State Matrix

| State | Top context | NOW | OPERATION | Inspector | Required behavior |
|---|---|---|---|---|---|
| Stable/fresh | LIVE, data fresh | `Operation stable`; recovered collapsed | quiet complete context | entity current state | no filler or invented activity |
| Active critical | LIVE | highest-impact event dominant | affected path dominant | Level 1 open, Level 2 available | unrelated operation subdued |
| Attention | LIVE | below critical, impact ordered | affected relationship visible | evidence and limitations | not ordered only by chronology |
| Recovering | LIVE | explicit recovering status | path settles progressively | recovery evidence and actions | event remains active/history retained |
| Normalized/closed | LIVE | Recently recovered | normal context | lifecycle remains inspectable | CLOSED != DELETED |
| Data stale | DATA DELAYED, last sync | system banner above situations | stale snapshot qualified | quality disclosure | stale never labeled live |
| Data unavailable | UNAVAILABLE | no operational normal claim | historical/last-known only if safe | source failure context | Unknown != Normal |
| Incomplete/conflicting | qualified mode | only supported claims | uncertain edges/entities identified | conflicting evidence at Level 3 | recommendations limited/withheld |
| Historical/replay | HISTORICAL + timestamp | not used as live landing | synchronized snapshot | event/entity at cursor | impossible to confuse with LIVE |
| Software error | system error semantics | preserve last safe UI | affected surface fallback | retry/correlation ID | never styled as mine event |
| Unauthorized ID | unchanged safe context | no disclosure | no disclosure | not found | no existence leak |
| Empty search/history | current mode retained | n/a | n/a | clear empty state | no fake results |

## Operational priority order

1. Safety/critical operational impact supported by evidence.
2. Production-flow impact and number/criticality of affected dependencies.
3. Persistence and recovery trajectory.
4. Data quality sufficient to support the claim.
5. Chronology only as a tie-breaker.

The exact scoring formula belongs to the Event/Impact domain and is not invented by the frontend.
