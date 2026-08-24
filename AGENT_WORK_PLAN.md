# Work Plan

Forward-looking backlog for whoever picks up work on this repo next
(Claude Code, Codex, or the user directly) — see `AGENT_LOG.md` for what
already happened and why. This file is the plan; that one is the diary.

There is no live coordination between Claude Code and Codex sessions — if
you're Codex reading this because the user pointed you at it, welcome;
update this file when you finish something, same as `AGENT_LOG.md`.

## How to use this

Each item states what it is, why it matters, and — most importantly —
what kind of work it needs, because that determines who can safely pick
it up:

- **Verifiable**: has a clear pass/fail signal (a test, a reproducible
  error). Any agent can pick this up, fix it, verify it, ship it.
- **Needs live session**: requires an authenticated browser session
  against the real running app to reproduce or confirm. Do not guess a
  fix from code reading alone — verify first, exactly like the Simulator
  crash fix in `AGENT_LOG.md` did.
- **Needs human judgment**: an architecture or product decision, not a
  bug. Don't resolve this unilaterally — surface the tradeoffs and ask.

## Done

**Prediction API returns 410 — RESOLVED 2026-08-23, commit `ec3ebdf`.**
Root cause: `/api/ml/prediction` was unconditionally 410 (no demo-mode
guard, permanent), and the frontend `Prediction.tsx` page was never
updated to stop calling it — every visit to `/prediccion` errored, for
every user. Rewired the page to `/api/cockpit`'s real forecast (OLS
regression over actual hourly progress, `forecast_service.py`) instead
of resurrecting the old fake ML model. Verified `/api/cockpit` actually
serves data on the live demo site (`ENVIRONMENT=demo` special-cases past
`build_cockpit_response`'s own real-data-only guard) before committing
to this approach. Old `/api/ml/prediction` route and `mlService.ts`
removed (fully dead once the frontend stopped calling them).

**Ranking methodology modal accessibility — RESOLVED 2026-08-23.**
Live production reproduction established the exact focus, Escape and hidden
content defects before implementation. The modal now has named dialog
semantics, focus containment and restoration, keyboard dismissal, explicit
opener state and a 44 px close target. Focused Playwright passes on Pixel 7
and desktop 1440; see the newest `AGENT_LOG.md` entry for evidence. Same
fix extended to two sibling drawers with the identical bug
(`OperatorAuditDrawer.tsx`, `OperatorRankingDrawer.tsx`) via a shared
`useModalA11y` hook — commit `8956d49`.

**Operator detail and KPI audit drawer accessibility — RESOLVED 2026-08-23.**
Live Seenode reproduction confirmed both drawers lacked dialog semantics,
focus containment/return and Escape dismissal. They now share the verified
dialog-focus primitive and expose their relationships from every DOM opener.
Focused responsive coverage passes on mobile and desktop; see `AGENT_LOG.md`.

**Dead frontend code removal — RESOLVED 2026-08-23, commit `932d073`.**
29 confirmed-zero-reference files removed (abandoned `dashboard/`
folder, abandoned third landing-page prototype subtree under
`brand-prototype/`, `FilterDrawer.tsx` + orphaned i18n keys, a handful
of orphaned effects/canvas components). See `AGENT_LOG.md` for the full
per-file rationale and verification. Honest finding: this is a
maintainability cleanup, not a bundle-size win — Rollup was already
tree-shaking these out of the shipped build.

**Dead public brand/equipment image assets removed — RESOLVED 2026-08-23.**
9 zero-reference files under `public/assets/` (~4.4MB) that, unlike
`src/`, ship byte-for-byte to the deployed build with no tree-shaking.
User approved the deletion after the environment blocked the first
`git rm` attempt on binary brand assets. See `AGENT_LOG.md`.

**Heavy referenced PNGs losslessly recompressed — RESOLVED 2026-08-23.**
The 13 largest actually-referenced PNGs (login background, brand logo,
origin-story photos, equipment cutouts) were 19.43MB combined. Two
earlier same-day attempts using `sharp`'s decode/re-encode pipeline
looked lossless (up to 70% smaller) but were proven NOT pixel-identical
via raw-decode diffing and reverted both times — see `AGENT_LOG.md` for
the full trail. Third attempt with `oxipng` (stream-level recompression,
doesn't decode-and-redraw pixels) verified genuinely pixel-identical on
all 13 (alpha-normalized comparison against git HEAD). 19.43MB ->
16.06MB (~17.4%), including `fondo_login.png` (every `/login` visit)
3921KB -> 2861KB. `tsc`/`vitest`/`build` all pass unchanged.

**Login page no longer blocks on three.js — RESOLVED 2026-08-23.**
Every authenticated page is `React.lazy()`-loaded except `Login` itself
(correctly, since it's the eager entry point) — but `Login.tsx`
statically imported the purely-decorative `PitShellVisual` 3D background,
dragging `vendor-three` (1MB/282KB gzip) into the critical path of the
highest-traffic page. `PitShellVisual` is now its own `React.lazy`
boundary with a matching-color `Suspense` fallback (no flash). Verified
with a live production-build browser session, not just bundle analysis:
`vendor-three`/`PitShellVisual` chunks now fetch after `App.js`, every
other lazy chunk, both CSS bundles and the `/api/auth/refresh` call —
genuinely deferred, not just cosmetically split. See `AGENT_LOG.md`.

**Agent perception no longer blocks on html2canvas-pro — RESOLVED
2026-08-24.** `visualCapture.ts` (used by the AI agent's on-demand
visual capture, "never automatic, never periodic" per its own design
brief) statically imported `html2canvas-pro` (~246KB/62KB gzip),
loading it for every authenticated page via the always-mounted
`AgentPresence` even though capture only ever fires on an explicit
call. The import moved inside the one function that already awaits it,
same zero-behavior-change pattern as the three.js fix above. See
`AGENT_LOG.md` for the coordination note (this one touches the
ai-copilot/agentPerception cluster, flagged even though the change
itself carries none of that cluster's usual risk).

**Redundant Google Fonts requests trimmed — RESOLVED 2026-08-24.**
`OperationalFontLoader` (every authenticated page + `/login`) fired 5
separate Google Fonts stylesheet requests; verified via grep that 5 of
the requested font families were used nowhere in the app and one
duplicated `tokens.css`'s own `@import`. Trimmed to the two real gaps
(IBM Plex Sans/Mono weight 700, not covered by the self-hosted local
files) plus Cairo (genuinely used for Arabic locale). Live browser
verification: 6 Google Fonts requests down to 3 per page load, smaller
payloads, visually identical. Possible follow-up not attempted: load
Cairo only for `lang="ar"` sessions instead of unconditionally. See
`AGENT_LOG.md`.

## P1 — needs human judgment

**`main` and `integration/agent-consolidated` (in the sibling checkout
`NORTHMINE_agent_planner`) have deeply diverged AI-agent-runtime code
that can't be merged mechanically.** See `project_northmine_seenode_repo_quirks.md`
(Claude's persistent memory) for the full map. The entangled files are
`runtime.py`, `command_router.py`, `AgentWorkspace.tsx`, `aiCopilot.ts`,
and the investigation/report model (`conclusion.py`,
`investigation_schemas.py`, `work_products/reports.py`). Both branches
changed these for different, sometimes incompatible reasons (e.g. two
different speech-chunking systems). A real reconciliation, like the
original R2 effort, needs someone to actually read both versions and
decide which behavior wins — not a script. Everything mechanically safe
to port already has been (see `AGENT_LOG.md`, commits `71ba9a7` through
`5b780ab`).

## P2 — verifiable, not yet attempted

**Backend test-order state isolation — COMPLETE (Codex).**
The full backend suite reproducibly ends with 380 passed and 13 setup errors,
while the same runtime/audit tests pass in isolation. Every error is a demo-user
login returning 401 because the fixture updated rows in an implicit persistent
database but never created them in a clean checkout. Tests now use a per-process
temporary user database and idempotently create/restore the authorized demo
seeds. The CI production build also runs before backend tests so the SPA route
contract receives its required artifact. A second clean-run dependency in the
agent proactivity store is also isolated per pytest process and initialized for
direct domain tests. Local backend result: 393/393; the external runtime DB
sentinel remains untouched. The public Linux gate retains bounded failure
annotations for future diagnosis without exposing credentials. Public run
`32684926842` passed every gate on Ubuntu in 1m52s.

**GitHub Actions Node 24 migration — COMPLETE (Codex).**
The successful Linux gate still warned that checkout v4, setup-node v4 and
setup-python v5 used deprecated Node 20 internals. All three official actions
now use their documented v7 Node 24 line; NORTHMINE's tested application Node
version remains explicitly pinned to 22 and Python remains pinned to 3.12.

**Backend HTTP/UTC deprecation cleanup — COMPLETE (Codex).**
Mission Control and Agent Demo now use the framework's current HTTP 422 name,
and operator-ranking timestamps are created as timezone-aware UTC before being
serialized with the existing `Z` contract. Focused endpoint/service coverage
passes 6/6; the former 422 and `datetime.utcnow()` warnings are absent.

**FastAPI lifespan migration — COMPLETE (Codex).**
The API's deprecated startup/shutdown decorators are replaced by one
`asynccontextmanager` lifespan while retaining the established initialization
order and event-monitor teardown. A dedicated contract test proves startup and
shutdown ordering; full backend result is 395/395 with only two third-party
dependency warnings remaining.

**Starlette TestClient httpx2 migration — COMPLETE (Codex).**
Starlette's supported `httpx2` client is now a dev-only dependency; production
`httpx` remains unchanged. `idna` is advanced to its compatible 3.19 patch.
Dependency resolution and `pip check` pass, focused TestClient coverage passes
4/4 without the warning, and the full backend suite passes 395/395. The lone
PySocks warning seen once was not reproducible in a warning-as-error full run
and is classified environmental/flaky rather than a product dependency.

**ECharts/DOMPurify security update and authenticated analysis navigation — COMPLETE (Codex).**
The frontend now resolves the two moderate production dependency advisories by
using ECharts 6.1 and DOMPurify 3.4.14. ECharts 6 can invoke axis tooltip
formatters with an object, an array or no usable item during pointer transitions,
so shared parameter normalization protects all affected operational charts.
Sidebar analysis/admin links now use the application's client navigation path
instead of a document reload that discarded the in-memory authenticated session.
Regression coverage verifies chart mounting, pointer interaction and navigation
on Pixel 7 and desktop 1440. Final evidence: unit 126/126, focused browser 8/8,
production build PASS, npm production audit 0 vulnerabilities, detector `[]`.

**Vite 8 React plugin compatibility — COMPLETE (Codex).**
The frontend still paired Vite 8.1 with `@vitejs/plugin-react` 4.3, which caused
the official plugin to emit deprecated Babel/esbuild and Rolldown-option
warnings on every build. The plugin is now on its Vite-8-compatible 6.1 line.
No React Compiler experiment or unsupported `plugin-react-oxc` package was
introduced. The lockfile drops 31 obsolete tooling packages; clean build output
contains neither warning. Validation: lint PASS, unit 126/126, browser 8/8,
production audit 0 vulnerabilities, build PASS.

**Unused Leaflet dependency surface — COMPLETE (Codex).**
Repository-wide reference inspection confirmed that `leaflet`, `react-leaflet`
and `@types/leaflet` had no application or test imports; Vista Aérea remains an
orthomosaic viewer and Operational Flow does not consume them. The three unused
packages and their two orphaned popup rules are removed. This is dependency
surface cleanup, not a claim of geospatial capability. Build/lint/unit remain
green and the production dependency audit remains at zero vulnerabilities.

**Unused Radix wrapper surface — COMPLETE (Codex).**
Three generated UI wrappers (`scroll-area`, `separator`, `tooltip`) had no
consumer outside their own files, leaving three Radix packages and 13 transitive
packages installed for unreachable code. The wrappers and direct dependencies
are removed. Live Radix Tabs and Slot/Button primitives remain untouched.
Build/lint/unit and production dependency audit remain green.

**Excluded legacy UI barrel — COMPLETE (Codex).**
The excluded `components/ui/index.tsx` barrel and standalone Card/Skeleton
wrappers had zero imports across source and tests. The barrel duplicated live UI
primitives, contained 443 lines hidden from the normal TypeScript root, and was
explicitly excluded in `tsconfig.json`. All three unreachable files and the stale
exclusion are removed. No rendered component or dependency changed.

**Excluded legacy API facade — COMPLETE (Codex).**
`src/services/api.ts` was an excluded, zero-consumer facade over four old demo
paths and duplicated the typed service layer used by every current page. It and
its stale tsconfig exclusion are removed. Canonical `lib/api.ts` and all live
domain services remain unchanged.

**Canonical authenticated route contract and Operational Flow agent context — COMPLETE (Codex).**
The manual router previously split path ownership between AppShell, App literal
checks, Sidebar literals and an Agent Registry `EXTRA_ROUTES` copy. A typed
`appRoutes.ts` contract now owns all authenticated section, analysis, admin and
Mission Control paths while preserving the existing router and legacy dashboard
alias. Operational Flow is registered as a read-only operational module for the
agent, with honest non-instrumented status and no fabricated entity handlers.
Unit contracts cover uniqueness/mapping/registry membership; browser history,
trailing-slash rendering and authenticated navigation pass on mobile/desktop.

**Operational Flow discoverability — COMPLETE (Codex).**
Operational Flow no longer requires a hidden URL: it is a first-class item in
the existing operational navigation compatibility layer, immediately after
Decision Cockpit, with a restrained relationship icon and impact/propagation
caption. This does not endorse the permanent sidebar as the Mission Control
target shell; it makes the implemented intelligence surface reachable during
migration. Active state, session retention and mobile drawer behavior are
protected by responsive browser tests.

**Operational Flow human presentation boundary — COMPLETE (Codex).**
Operational contracts retain canonical enum values, but the rendered Flow and
inspector no longer expose implementation codes such as `LOADING_UNIT`, `FEEDS`,
`FACT`, `FRESH`, `SYNTHETIC`, lifecycle enums or scenario IDs. One tested
presentation adapter translates known values and uses safe human fallbacks for
unknown future values. Facts, derivations, hypotheses, quality and provenance
remain visible in operational language rather than being hidden.

**Operational Flow SVG pointer stability — COMPLETE (Codex).**
The generic HTML affordance for `[role="button"]` also matched interactive SVG
groups and replaced each graph node's positional `transform` on hover/active.
The affordance now excludes SVG `<g>` primitives, so connected nodes remain in
their segments while retaining their own fill/stroke feedback. Responsive
browser coverage protects hover geometry, keyboard selection and inspector
context for PH03, Ruta Norte and Tonelaje.

**Mobile navigation focus restoration — COMPLETE (Codex).**
The sidebar regression claimed Escape restored focus but only asserted visual
closure. The drawer now returns focus to its menu opener, exposes its expanded
state and relationship, and uses an accurate open/close accessible name. The
responsive test asserts behavior rather than only a CSS class.

**Public analytics/CSP mismatch — COMPLETE (Codex).**
The deployed landing includes GoatCounter from `gc.zgo.at`, while the enforced
Content Security Policy blocks that origin and produces a browser console
error. Analytics now loads from the public route tree only; it is absent from
the demo-access and operational application boundaries. CSP authorizes only
the exact script/count origins and only for the allowlisted public request
paths. API and Operational Flow policies remain closed to GoatCounter. Focused
security tests pass 4/4 and public browser coverage passes 26/26.

**Shared responsive visual harness — COMPLETE (Codex).**
Mission Control and responsive Playwright suites now share one isolated
synthetic-demo backend/Vite lifecycle. The browser-only ASGI entrypoint is
guarded to demo/testing and disables rate limiting only for the ephemeral test
process, so the 5/minute production login boundary is unchanged. Authenticated
tests navigate through the application's current manual router without losing
the in-memory session. Pixel 7 + desktop 1440 improved from 50 passed, 6
skipped, 3 failed and 3 flaky to 55 passed, 7 expected skips, 0 failed and 0
flaky; Mission Control remains 4/4. No product UI or operational contract was
changed.

**Landing `fetchPriority` React warning — COMPLETE (Codex).**
The clean responsive matrix consistently reports that `SaaSHero` passes the
camel-case `fetchPriority` prop to a DOM image under the current React runtime.
Both critical landing images now emit the standard lowercase HTML attribute
while retaining high network priority under React 18.3. Focused coverage
asserts the two priority hints and rejects the React DOM warning on mobile and
desktop; the complete public matrix passes 24/24. Landing presentation and
assets are unchanged.

**Self-contained Mission Control visual harness — COMPLETE (Codex).**
`npm run test:mission-control` now owns both an isolated synthetic-demo backend
and Vite, including readiness and teardown. It uses disposable databases,
runtime-only encryption material and the current demo identity, with no Wenco or
production dependency. The desktop/mobile/tablet/reduced-motion catalog passes
4/4 from clean processes; current visual baselines were inspected before their
desktop/tablet evidence was renewed. Product UI/contracts were not changed.

**Shared equipment detail drawer accessibility — COMPLETE (Codex).**
The portal drawer used by Fleet, Performance, Alerts, Reports and Compare now
has a named dialog surface, deterministic focus entry/containment/return,
scoped Escape handling, semantic loading/error announcements, touch-safe close
action and explicit opener relationships. Focused authenticated regression
coverage protects desktop and mobile behavior. Equipment data and Mission
Control contracts were not changed.

**Confirmed already fine, no action needed:** `/admin/audit-log` RBAC
(already `RequireAdmin` + redaction) and refresh-token rotation (already
race-guarded via conditional `UPDATE`) — see `AGENT_LOG.md` for detail.
Don't re-investigate these without new evidence of an actual failure.

## Outside this repo's code — user's own action

**Create the real (non-demo) admin account on the live Seenode
deployment**, via `NORTHMINE_BOOTSTRAP_ADMIN_USER` /
`NORTHMINE_BOOTSTRAP_ADMIN_PASSWORD` env vars in Seenode's dashboard. The
code side of this (tenant-scope bug that would have blocked it) is
already fixed — see commit `43585ba`. Nobody else can do this step; it
requires the Seenode dashboard.

**Formal close-out of the R4 Human Physical Acceptance walkthrough** —
started earlier this project, left informally open. Needs the user
actively driving alongside an agent, screen by screen — not something
either agent can do unattended.
