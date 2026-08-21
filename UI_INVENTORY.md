# NORTHMINE UI Inventory — Phase 0

## Shell and navigation

- `App.tsx`: authentication bootstrap, manual path dispatch, lazy modules, stale/backend banners.
- `AppShell.tsx`: sidebar/topbar/workspace composition and manual history changes.
- `Sidebar.tsx`: 14 primary operational entries plus analysis/admin routes.
- `Topbar.tsx`: product, shift/user/system controls.
- `SettingsPanel`: theme/effect preferences.
- Public router remains independent of the authenticated operational shell.

## Operational pages

| Surface | Current purpose | Mission Control relevance |
|---|---|---|
| DecisionCockpit | decision-oriented shift/month reading | strongest NOW precursor |
| Dashboard | broad operational summary | source blocks for NOW/detail; not target landing |
| CurrentShiftPage | shift cycles, anomalies, narrative, snapshots/reports | NOW + History + Shift Intelligence |
| OperationalMindMap3D | aggregate data constellation | reusable renderer/inspector; not canonical/geospatial graph |
| Production | production and targets | Level 3 evidence/history |
| Performance | equipment performance | entity/event evidence |
| FleetPage | fleet condition and drill-down | Operation/Search/Entity Inspector |
| LoadingUnitsPage | loading-unit performance/routes | Operation/relationships/entity detail |
| AveriasPage | imported/derived breakdown history | event source/evidence/history |
| Alerts | prioritized calculated alerts | migration input for durable events |
| AerialPage | orthomosaic/image evidence | contextual Operation evidence, not live map |
| Reports | reports/exports | unified History support |
| Compare | comparisons | History/entity comparison |
| ExpertAnalysisPage | technical analysis | Level 3/history |
| Prediction | model predictions | hypothesis-only technical depth |
| Simulator | what-if/demo | isolated lab tool |
| OperatorRanking | restricted operator view | scoped history/search detail |

## Reusable components

- equipment detail drawer and equipment status panels;
- Loading/Empty/Error states and stale/system banners;
- Decision Cockpit view model and audit/advisor panels;
- charts and chart frames, subject to dependency consolidation;
- 3D scene, search/filter/inspector and WebGL fallback;
- AI command palette, evidence, context, transcript, guidance and presence;
- common status pills, tooltips, tabs and focus styles;
- i18n module organization.

## Systemic UX debt

- permanent navigation defines the product instead of operational context;
- manual routing has multiple sources of truth;
- page-local selection/time prevents cross-representation continuity;
- large overlapping `tokens.css`/`northmine-tokens.css` and multiple theme worlds;
- copper sometimes substitutes an informational semantic color;
- repeated card/left-stripe patterns and some layout-property animation;
- canvas graph needs an equivalent semantic outline during normal WebGL use;
- several custom drawers/dialogs need focus trap/return-focus verification;
- mobile controls include 40–42 px targets below the 44 px design requirement.

## Code-level audit score

Accessibility 2/4; performance 2/4; responsive 3/4; theming 2/4; implementation integrity 2/4. Total **11/20**. Live browser validation is still required before Phase 1 acceptance.

See `MISSION_CONTROL_MIGRATION_MATRIX.md` and `MISSION_CONTROL_LOW_FIDELITY_IA.md`.
