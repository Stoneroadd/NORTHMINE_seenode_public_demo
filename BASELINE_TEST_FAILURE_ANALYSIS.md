# Baseline Test Failure Analysis

Baseline SHA: `b54329e2b6ff3f1f18cc2cbc612a526decf74efa`.

## Exact baseline

- Frontend: `97 passed / 98`, one timeout in `ConversationTurnManager.test.ts:209`; the same test timed out when repeated alone (5 s test timeout, observed suite duration about 8 s).
- Backend: `354 passed / 368`, 14 failures, 9 warnings, 128.55 s.
- Backend command: `.\.venv\Scripts\python.exe -m pytest backend\tests -q --tb=short --basetemp=.pytest_tmp_phase01_before -p no:cacheprovider`.
- Pytest also reports unknown `timeout` and `timeout_method`, proving `pytest-timeout` is absent from this environment.

## Failure-by-failure classification

| Test(s) | Classification | Evidence and risk |
|---|---|---|
| `ConversationTurnManager...un turno completo` | FLAKY / TEST DEFECT | Deterministic fake-timer unit has a real 5 s wall timeout and passes seven sibling cases. No operational truth impact. Frontend gate blocker until its async/fake-timer contract is corrected. |
| `test_decision_audit_endpoint_contract` | TEST DEFECT with robustness gap | Test replaces settings with `SimpleNamespace(demo_mode=False)` while route required `environment` and `mode`. Defensive `getattr` closes the gap. No security/data-integrity risk. |
| `test_dashboard_endpoint_speed` | TEST DEFECT | Calls retired `/api/demo/summary`; correct response is 410. Not a performance measurement. |
| `test_fleet_endpoint_speed` | EXPECTED LOCAL CONFIGURATION / TEST DEFECT | Test does not inject a dataset and attempts real Wenco; local runtime has no `pyodbc`/credentials. |
| `test_production_shift_endpoint_speed` | EXPECTED LOCAL CONFIGURATION / TEST DEFECT | Same uncontrolled real-Wenco dependency. |
| `test_alerts_endpoint_speed` | EXPECTED LOCAL CONFIGURATION / TEST DEFECT | Same uncontrolled real-Wenco dependency. |
| `test_cache_speeds_up_repeated_calls` | TEST DEFECT / FLAKY | Uses retired route and a timing ratio (`< 50%`) rather than controlled work or a budget. |
| `test_cache_stats_track_hits_and_misses` | TEST DEFECT | Uses retired route, so it does not exercise the intended cache contract. |
| `test_concurrent_audit_writes` | TEST DEFECT / EXPECTED LOCAL CONFIGURATION | Loop is sequential, not concurrent; endpoint also reaches unmocked Wenco. Focused runs without lifespan show missing local audit/MFA tables. |
| `test_revoke_user_tokens` | TEST DEFECT | Revocation mechanism is not reached because pre-check calls retired `/api/demo/summary` and expects 200 instead of 410. Security-relevant coverage gap, not evidence that revocation is broken. |
| `test_export_shift_xlsx_caex_sheet_lists_real_trucks` | TEST DEFECT | Expected header omits three currently exported provenance/context columns, including `origen`. Exact-list assertion is stale. |
| `test_export_shift_xlsx_loading_sheet_lists_real_loaders` | TEST DEFECT | Expected header omits current `destino` and another context column. Exact-list assertion is stale. |
| Three remaining shift export/report failures | PREEXISTING PRODUCT DEFECT | `build_shift_report(dataset)` passed its dataset to production/loading/fleet, but `build_alerts` silently called provider-backed builders. This could mix supplied/replay/synthetic evidence with live Wenco and is a data-integrity, provenance and replay blocker. Fixed by threading the same dataset/shift through alert derivation. |

The baseline five report/export failures overlap: after the data-mixing fix, the three provider/Wenco failures pass and two stale XLSX header assertions remain.

## Before/after interpretation

The P0 fix must not be credited with making unrelated tests green. The performance module, retired-route revocation pre-check, stale export headers and frontend timeout remain classified debt. A green Phase 1 gate requires repairing those test contracts with explicit fixtures—not loosening product behavior or installing production connector dependencies into unit tests.

Final Phase 0.1 full run: frontend `98/98`; backend `366 passed / 376` with the same ten classified failures (seven performance-contract tests, one retired-route revocation pre-check, two stale export-header assertions). Eight new P0 tests are included, so comparison against the original suite is: four original failures closed, no new product-test regression, ten original failures remain.
