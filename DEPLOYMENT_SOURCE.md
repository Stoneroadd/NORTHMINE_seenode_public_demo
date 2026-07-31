# Seenode public demo role

This repository is the deployable public derivative of the canonical
`Stoneroadd/NORTHREACT` product repository.

## Source hierarchy

- Canonical product source: `NORTHREACT_actualizado`.
- Public Seenode derivative: this repository.
- Archived snapshot: `NORTHREACT-NORTHMINE_DEMO` from 2026-07-28.

## Files owned by this derivative

Do not overwrite these files during a source synchronization:

- `frontend/src/demo/fastDemo.ts`
- `scripts/build_public_demo.mjs`
- `scripts/start_public_demo.mjs`
- `frontend/server.mjs`
- public authentication and single-service deployment configuration

The public derivative may use local synthetic data for speed, but the UI must
label it as DEMO. It must not claim WENCO or a real database connection.

Shared product improvements should be committed first in `NORTHREACT`, then
ported here with a separate validated commit.

## Deploy note (2026-07-30)

Commit `8ec02fe` (KpiHero/StatRow density fix for Decision Cockpit) was pushed
to `main` but the live `northmine-seenode-public-demo-3` service kept serving
an older bundle (`DecisionCockpit-DBohM2su.js`, confirmed via direct bundle
inspection to predate this port — 0 occurrences of the `progressbar` marker
this fix introduces). This commit exists to force a fresh push/build signal;
if the service is still stale after this, the block is on Seenode's build
pipeline itself and needs a manual clean rebuild from the dashboard.

## Deploy note (2026-07-31)

Commit `d5cfffe` (3D map IBM Plex font, Cockpit card tone refinement, ported
from NORTHREACT `f278963`) was pushed to `main`. The live service kept
serving `index-CaOGKLYR.js` / `DecisionCockpit-CExi8D7G.js` for 3.75 minutes
across 15 polls with no change. This commit exists to force a fresh
push/build signal, same as the note above.

## Deploy note (2026-07-31, second)

Commits `f536972`/`479e5d7`/`2ab7865` (collapsible sidebar, larger equipment
imagery + fallback, hour/timestamp formatting consolidation and H+N fix)
were pushed to `main`. The live service kept serving `index-CY_WCvIM.js`
for 3.3 minutes across 10 polls with no change. This commit exists to force
a fresh push/build signal, same as the notes above.

## Deploy note (2026-07-31, third)

After forcing commit `1b42f4a`, the live service was still serving
`index-CY_WCvIM.js` after a further ~13 minutes of polling (well beyond
the 3-4 minute delay seen in the notes above). This is a second forcing
commit. If the bundle is still stale after this, the stall is on Seenode's
build pipeline itself and needs a manual clean rebuild from the dashboard
(the app-level changes are confirmed correct via local build/typecheck
and via the identical fix validated live on the laboratorio's demo data).
