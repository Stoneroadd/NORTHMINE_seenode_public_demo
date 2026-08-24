# Agent Log

Running, append-only coordination log for AI coding sessions working on this
repo (Claude Code, Codex, or any other agent) when they run in parallel and
can't talk to each other directly. There is no live channel between agents —
this file is the only thing both sides reliably read (via `git pull`) and
write (via a commit), so it has to carry the context a live conversation
would otherwise cover: what you're about to touch, why, and what you found
that the other side should know before touching the same area.

A narrower precedent already exists for one finished feature:
`CODEX_DEMO_ACCESS_COORDINATION.md` (worktree-integration notes for the demo
access landing page, now historical — the worktree it describes is gone).
This file is the general, ongoing version of that idea, not a replacement.

See `AGENT_WORK_PLAN.md` for the forward-looking, prioritized backlog —
this file is the diary of what already happened, that one is the plan.

## How to use this

**Before starting non-trivial work, `git pull` and read the newest
entries here AND in `AGENT_WORK_PLAN.md` -- then commit and push a short
"starting: X" entry of your own before you write any real code**, not
just after you finish. A pull-and-read at the start of your session
isn't enough by itself: on 2026-08-23, Claude Code independently picked
up the operator-ranking methodology-modal accessibility item, worked it
for several minutes (live reproduction, root-cause read), and only then
discovered via a routine mid-work re-check that Codex had already
finished and pushed the exact same fix minutes earlier. No commits
collided and nothing was duplicated in the repo -- but that was caught
by a lucky-timed re-check, not prevented. A pushed "starting" entry is
the only thing that actually closes that gap: if Claude Code's entry had
existed before Codex started, or vice versa, the second agent would have
seen it on their own pre-work pull and picked something else instead of
racing to the same finish line. If you're not sure whether something
overlaps with in-progress work, check the most recent entries first --
if someone's mid-way through touching the same area, coordinate (wait,
or scope around it) rather than guessing.

**When you finish**, update your entry's status and note anything the next
session needs to know: what you deliberately did NOT do and why, what's
still broken, what to check before building on top of it.

**Keep entries short.** This is a coordination log, not a design doc or a
commit message — link to the actual commit/PR for detail.

---

## 2026-08-23 — Codex — branch `test/backend-state-isolation` — complete

**Scope:** reproduce and eliminate the 13 order-dependent backend setup errors
caused by shared demo-user/authentication state across the full pytest suite.

**Coordination:** backend test fixtures and the minimum verified repository
reset boundary only; no production credentials, auth weakening, AI behavior,
Mission Control contracts, Wenco or frontend changes.

**Result:** `conftest.py` now assigns `NORTHMINE_USERS_DB` to a temporary path
unique to the pytest process and creates missing demo seeds before restoring
password/active/role state. This removes the hidden dependency on an untracked
developer database without changing application authentication. The clean
suite then exposed one separate prerequisite: the SPA contract needs
`frontend/dist`, while CI built it only after pytest. The existing production
build step now runs before backend tests, with no command duplication.

**Evidence:** `test_agent_runtime.py` improved from 31 passed + 12 setup errors
to 43/43. Full backend after the required frontend build improved from 380
passed + 13 errors to 393/393. Frontend production build passes; no product
source, credentials, Mission Control or Wenco behavior changed.

## 2026-08-23 — Codex — branch `feat/goatcounter-csp` — complete

**Scope:** resolve the deployed landing's GoatCounter/CSP mismatch discovered
through a real Seenode browser console inspection after `cbf9ff4`.

**Coordination:** public analytics tag, security-header allowlist and focused
browser/security regression only; no Mission Control UI, product visuals,
operational contracts, AI runtime, Wenco or production credentials.

**Result:** removed the global analytics tag from `index.html` and added a
route-tree component that loads GoatCounter only for public pages. The backend
CSP now authorizes the exact `gc.zgo.at` script and
`northmine.goatcounter.com` count endpoint only on an explicit public-path
allowlist; `/acceso-demo`, `/operational-flow` and `/api` remain outside the
analytics boundary. No wildcard or global CSP relaxation was introduced.

**Evidence:** security-header tests 4/4; focused browser 2/2; full public matrix
26/26; frontend unit 124/124; lint/typecheck and production build pass;
Impeccable detector `[]`. Full backend remains at the documented order-dependent
baseline: 380 passed + the same 13 login-fixture errors (two new CSP tests
explain the increase from 378 to 380); the affected runtime/audit tests are
unchanged and the CSP file passes independently.

## 2026-08-23 — Codex — branch `feat/fetch-priority-warning` — complete

**Scope:** reproduce and remove the React DOM-property warning emitted by the
live SaaS landing hero while preserving the image's eager/high-priority loading
behavior and visual output.

**Coordination:** `SaaSHero` plus focused regression coverage only; no landing
layout/style/assets, Mission Control UI, operational contracts, AI runtime,
Wenco, backend or production configuration.

**Result:** React 18.3's types accept camel-case `fetchPriority`, but its
development runtime warns when that prop reaches the DOM. Both the hero and
product-stage critical images now emit the standard lowercase
`fetchpriority="high"` through a typed JSX spread, preserving browser priority
without broad React type augmentation or visual changes. Added browser coverage
that asserts both hints and rejects the warning.

**Evidence:** focused Pixel 7 + desktop 1440 regression 2/2; full public matrix
24/24; frontend unit 124/124; lint/typecheck and production build pass;
Impeccable detector `[]`; `git diff --check` clean.

## 2026-08-23 — Claude Code — branch `main` — dead-code cleanup, complete

**Scope:** user broadened the mandate beyond backlog items to general
frontend/product optimization ("toma la iniciativa... UX/UI, velocidad,
un infinito etc, hazlo"). Evaluated and explicitly declined the two
highest-theoretical-value performance ideas first — echarts tree-shaking
(14 files import the full bundle, not the `echarts/core` + explicit
registration pattern) and recharts/echarts consolidation — both too high
silent-failure risk with zero visual regression tooling in this repo.
Picked dead-code removal instead: lower risk, still real value, and
mechanically verifiable per file.

**Result:** removed 29 files confirmed dead via zero-reference grep
across `src` plus exclusive-sub-dependency checks (CSS/data files only
imported by the file being removed) — an entire abandoned dashboard/
folder (9 files, superseded by `ExecutiveInsightCard.tsx`), an entire
abandoned third landing-page prototype subtree under `brand-prototype/`
(9 components + 4 CSS files, `BrandPrototypePage.tsx` only ever imported
`brand-prototype/saas/SaaSPrototypePage`), two more files inside the
*live* `saas/` folder that turned out to be unreferenced even from
within it, `FilterDrawer.tsx` + its 2 orphaned i18n keys, and a small
cascade of orphaned effects/login canvas components. Full list and
per-file rationale in commit `932d073`.

**Verification:** `tsc --noEmit` clean, `vitest run` 124/124, `npm run
build` green. Explicitly confirmed and noted for honesty: shipped bundle
size for `BrandPrototypePage-*.js` is unchanged (89.71 kB before/after)
— Rollup already tree-shook these out of the real build, so this is a
maintainability win, not a runtime/bundle-size win. Backend full suite
run separately as a discipline check (no backend files touched): 378
passed / 13 errors in the full run, but the same 13 tests pass clean
both in isolation and grouped together — confirmed as pre-existing
test-order/shared-state pollution in `test_agent_runtime.py` +
`test_decision_audit.py`, not a regression from this change. Worth
someone eventually running with `-p no:randomly` or `--forked` to find
the actual shared-state leak, but out of scope for a frontend-only
change.

**Coordination:** touched only frontend dead files; nothing in
`feat/responsive-test-harness`, `feat/mission-control-test-harness` or
any other in-flight Codex branch overlapped.

## 2026-08-23 — Claude Code — branch `main` — image weight investigated, recompression declined

**Scope:** continuing the same optimization mandate, looked at page-weight
next: `public/` (18.53MB across 13 files checked) ships byte-for-byte to
production with no tree-shaking, unlike `src/`. `fondo_login.png` (3.8MB,
loaded on every visit to `/login`) and `northmine-logo-master.png` (2.8MB,
loaded on every page via `NorthmineLogo.tsx` + `index.html`'s OG tags) are
the two highest-value targets.

**Tried and reverted:** re-encoded the 13 largest referenced PNGs with
`sharp`'s PNG encoder at `compressionLevel: 9, effort: 10` (no palette
quantization) expecting a genuinely lossless win (18.53MB -> 5.82MB, 68%).
Verified empirically rather than trusting the "lossless" label — decoded
both versions back to raw RGBA and diffed byte-for-byte against the
original blob in git HEAD. Result: NOT byte-identical on any of the 13.
Traced one (`aljibe.png`) down to real per-pixel cause: sharp's encoder
rewrites the RGB channel under low-but-nonzero alpha (semi-transparent
edge pixels, alpha 1-18/255) to different values than the source PNG's.
That has a small but real visual effect on anti-aliased cutout edges
(equipment PNGs against a transparent background), not just invisible
alpha=0 padding. With no visual regression tooling in this repo (same
constraint that blocked the echarts/recharts work below), shipping that
blind isn't safe. Reverted all 13 files, removed the throwaway scripts
and the temporary `sharp` devDependency (`npm uninstall --no-save`, never
touched `package.json`/lockfile).

**Also found, not acted on:** 9 files under `public/assets/` are
confirmed zero-reference (checked against literal filename greps across
`src` + `index.html` + CSS, and ruled out dynamic path construction the
way the `aerial/` folder uses it) — `northmine-logo-chroma-source.png`,
`northmine-logo-transparent.png`, `northmine-logo-horizontal-transparent.png`,
`northmine-header-logo.png`, `northmine-intelligence-hub.png`,
`northmine-app-icon.png`, `Logo moderno de NORTHMINE.png`,
`pala_1_chromakey.png`, `rajo-operacion.jpg` (~4.4MB). Attempted `git rm`;
the environment's own permission layer blocked deleting this batch of
brand/binary assets specifically (unlike the `src/*.tsx` dead-code
removal above, which went through). Left in place and flagged to the
user directly rather than retried — some of these read like raw/source
design files (e.g. `chroma-source`) that may be intentionally kept
outside the app's own reference graph. Not this agent's call.

**Next step for whoever picks this up:** the win is real (up to ~70%
smaller) if redone with actual visual verification — e.g. a live-browser
side-by-side on `/login` and an equipment card, or converting to WebP
with an `<picture>`/fallback pattern instead of re-encoding PNG-to-PNG.
Don't reuse the `sharp` default PNG pipeline as-is; it changes edge pixel
color under semi-transparent alpha.

**Follow-up same day, re-attempted narrower and still declined.**
Re-checked which of the 13 have zero real transparency (`hasAlpha:
false`, or `hasAlpha: true` with alpha uniformly 255 everywhere —
verified by scanning every pixel, not trusting the metadata flag alone):
`fondo_login.png`, `simon-despacho.png`, `planta-concentradora.png`,
`simon-operador.png`. Reasoned the alpha-edge bug above couldn't apply
to these (no semi-transparent pixels exist), re-ran the same
`compressionLevel: 9, effort: 10` re-encode on just those 4 (9.49MB ->
3.01MB), and re-verified with the same raw-pixel-diff-against-git-HEAD
method. Still not pixel-identical: `fondo_login.png` (channels=3, no
alpha at all, so the earlier theory is ruled out as the cause here)
came back with **80.70% of bytes differing**, mostly by 1-3/255 but with
at least one outlier delta of 72/255. So the earlier root-cause guess
(RGB-under-transparent-alpha) was only one symptom, not the real
explanation — something in sharp/libvips' PNG decode+encode round trip
in this environment shifts pixel values pervasively even with no alpha
channel involved at all (both images report identical `space: "srgb"`,
`hasProfile: false`, `isProgressive: false`, so it isn't an obvious ICC
or interlacing mismatch — gamma-chunk reinterpretation is the leading
guess, not confirmed). **Conclusion: don't trust this `sharp` pipeline
to be lossless for PNG-to-PNG re-encoding in this repo at all, alpha or
not.** Reverted again, same cleanup (scripts + temporary devDependency
removed). A real attempt needs either a different, verified-lossless
tool (e.g. `oxipng`/`pngcrush` specifically, checked the same
pixel-diff-vs-git-HEAD way) or a lossy-but-verified path (WebP/JPEG with
an actual before/after screenshot comparison in a live browser — this
environment has browser automation tools that weren't used for this
attempt and should be for the next one).

**Third attempt same day, succeeded with `oxipng` instead of `sharp`.**
Took the "different, verified-lossless tool" option above. `oxipng` (npm
package wrapping the real Rust `oxipng` CLI, v4.0.3) doesn't decode to
raw pixels and re-encode through libvips like `sharp` does — it rewrites
the DEFLATE stream and does a small set of provably-lossless PNG-level
reductions (color-type/bit-depth/palette reduction when the pixel data
already only uses that reduced range) directly against the existing IDAT
data. Ran `oxipng -o max` on all 13 candidates. Verified the same way as
both earlier attempts, but stricter this time: decoded both sides with
`sharp` and additionally called `.ensureAlpha()` on both before
comparing, so a legitimate opaque-alpha-channel drop (`oxipng` did this
for `simon-despacho.png`/`planta-concentradora.png`, printed as
"Reducing image to 3x8 bits/pixel, RGB" in its own output) compares by
composited color instead of registering as a fake mismatch from channel
count alone. Result: **all 13 pixel-identical**, confirmed. `tsc
--noEmit`, `vitest run` 124/124 and `npm run build` all pass unchanged.

**Numbers:** 19.43MB -> 16.06MB across the 13 files (~17.4%, far more
modest than the fake 66-70% `sharp` reported, because `sharp`'s number
included the color shift this doesn't). Biggest single wins:
`aljibe.png` 681KB->402KB (41%, real transparency so more redundant
data to compress), `simon-despacho.png` 3097KB->2073KB (33%, opaque
alpha drop), `planta-concentradora.png` 2466KB->1836KB (25.5%),
`fondo_login.png` (the highest-traffic one, every `/login` visit)
3921KB->2861KB (27%), `northmine-symbol-transparent.png`
141KB->97KB (31%). The equipment truck/loader PNGs (already
reasonably compressed) only moved 0.3-1.5%. Commit follows this entry.

**Lesson for next time, in one line:** for "lossless" PNG work, reach
for `oxipng`/`pngcrush`/`optipng` (stream-level, provably lossless) over
any pixel-decode-and-re-encode pipeline (`sharp`, `imagemagick -quality`,
etc.) — the latter can silently shift pixel values even with no quality
loss requested, and the shift can be large enough to matter (this
session measured a 72/255 outlier delta on a fully opaque image with no
alpha channel at all, not just a transparent-edge rounding artifact).

## 2026-08-23 — Codex — branch `feat/responsive-test-harness` — complete

**Scope:** make the responsive Playwright suite self-contained by reusing the
authorized synthetic backend lifecycle already proven for Mission Control. A
single desktop Decision Cockpit regression was reproduced failing on both
attempts with auth `ECONNREFUSED` when run from clean processes.

**Coordination:** harness/configuration only; no responsive CSS, product UI,
visual baselines, backend domain code, AI runtime, Wenco or production settings.

**Result:** extracted the Mission Control backend/Vite lifecycle into one
shared Playwright server factory and applied it to both configs. The first full
responsive run exposed two independent harness defects: the real 5/minute
login limiter was exhausted by the matrix, and authenticated tests discarded
their in-memory token through full reloads. A guarded demo/testing-only ASGI
entrypoint now disables SlowAPI only in Playwright's ephemeral backend; normal
`app.main:app` security remains unchanged. Authenticated routes now use the
application's existing `pushState`/`popstate` router contract.

**Evidence:** clean baseline Decision Cockpit failed 2/2 with backend
`ECONNREFUSED`. After the shared server extraction, the first Pixel 7 + desktop
1440 matrix exposed 50 passed, 6 skipped, 3 failed and 3 flaky; all failures
were login/session setup rather than drawer assertions. Final matrix: 55
passed, 7 expected skips, 0 failed, 0 flaky. Focused drawer: 4/4. Mission
Control: 4/4. Frontend unit: 124/124; lint/typecheck and production build pass.
The run also exposed a pre-existing React `fetchPriority` warning in `SaaSHero`,
recorded separately in the work plan rather than mixed into this change.

## 2026-08-23 — Codex — branch `feat/mission-control-test-harness` — complete

**Scope:** make `npm run test:mission-control` reproducible from a clean local
checkout by having Playwright start and health-check the authorized demo backend
as well as Vite. The current command was reproduced failing on
`/api/auth/{refresh,login}` with `ECONNREFUSED` because port 8001 is an implicit
external prerequisite.

**Coordination:** test infrastructure only; no Mission Control UI, unreviewed
snapshot regeneration, operational contracts, AI runtime, Wenco connector or
production configuration.

**Result:** Playwright now starts/health-checks/stops the real FastAPI app in an
explicit synthetic demo boundary plus Vite, using disposable temp databases and
a runtime-generated audit encryption key. The shared login helper now uses the
current `demo/demo` seed instead of the retired `admin/admin` pair. Once the
harness reached the catalog it exposed two stale visual baselines; expected vs
actual vs diff were inspected, confirmed as the current demo identity/control
state rather than a layout regression, and only desktop/tablet evidence was
renewed.

**Evidence:** before, 4/4 tests failed on auth `ECONNREFUSED`; after backend
ownership but before the identity fix, 4/4 reached auth and correctly rejected
the stale credentials; final Mission Control suite 4/4 PASS. Frontend unit tests
124/124, lint/typecheck, production build and `git diff --check` PASS. No process
remained listening on test ports 8001 or 5206 after teardown.

## 2026-08-23 — Codex — branch `feat/equipment-detail-drawer-a11y` — complete

**Scope:** live-audit and, only if reproduced, harden the shared
`EquipmentDetailDrawer` used by Fleet, Performance, Alerts, Reports and Compare:
dialog naming, keyboard entry/containment/return, Escape, responsive overflow
and opener relationships. This is the next autonomous, test-verifiable item.

**Coordination:** no equipment KPI calculations, APIs, AI runtime, Mission
Control architecture or route migration changes.

**Result:** the shared equipment drawer now reuses `useModalA11y`, moves the
dialog contract onto the actual panel, keeps the backdrop out of keyboard and
screen-reader navigation, focuses the close action after async detail loading,
contains Tab/Shift+Tab, restores the opener and exposes dialog relationships on
shared cards plus Fleet/Performance/Alerts activators. The close action is at
least 44px and the narrow panel remains inside the viewport.

**Evidence:** lint/typecheck and production build pass; unit suite 124/124 with
one worker; focused Playwright 4/4 on Pixel 7 + desktop 1440. The broader device
attempt was interrupted after Vite intermittently failed dynamic-module imports
on iPhone SE; the trace stayed on Cockpit and never reached the target route, so
this is recorded as local dev-server environmental evidence, not hidden as a
green result. Impeccable findings were pre-existing debt in the monolithic token
file, not introduced by this change.

## 2026-08-23 — Claude Code — branch `main` — extended the a11y fix to two sibling drawers, complete

Re-checked this file before starting (see the entry right below): found
Codex's methodology-modal fix already complete, so did NOT redo it.
Instead grepped for the same `aria-hidden={!open}` anti-pattern
elsewhere and found it live, unfixed, in two siblings sharing the same
markup family: `OperatorAuditDrawer.tsx` and `OperatorRankingDrawer.tsx`
(same `.operator-drawer-close` class, same always-mounted CSS toggle).
Extracted Codex's focus-trap/Escape/restore logic into
`frontend/src/hooks/useModalA11y.ts` and applied it to both, refactoring
`OperatorMethodologyModal.tsx` onto the same hook so the logic exists
once, not three times. Did not extend the `aria-haspopup`/`aria-expanded`/
`aria-controls` opener relationship to these two -- they open from table
rows via a shared callback, not one fixed trigger button, so that needs
its own change to `OperatorRankingTable.tsx`/`OperatorPriorityBoard.tsx`,
out of scope here. Commit `8956d49`. Full suite green.

## 2026-08-23 — Codex — branch `feat/operator-drawers-a11y` — complete

**Scope:** independently reproduced the same two drawer defects before seeing
Claude's concurrent `8956d49`. After fetching, discarded the duplicate
implementation and retained only the missing opener relationships, nested
dialog keyboard hardening and focused responsive regression coverage.

**Result:** every DOM opener now identifies its detail/audit target; both
drawers have responsive keyboard regression coverage alongside Methodology.
The shared hook ignores inactive underlying dialogs and stops Escape at the
active overlay. Impeccable detector `[]`; focused Playwright 8/8 on Pixel 7 +
desktop 1440; lint/typecheck and production build pass.

**Baseline note:** the default parallel unit command twice timed out only the
known `ConversationTurnManager.test.ts:209`; that file passes 8/8 alone and the
complete suite passes 124/124 with one worker. No AI runtime was changed.

**Coordination:** no ranking calculations, API contracts, AI runtime, Mission
Control domain or `OperationalFlowOverview` changes.

## 2026-08-23 — Codex — branch `feat/operator-ranking-methodology-a11y` — complete

**Scope:** reproduce and close the P0 live-session accessibility gap in the
`/operator-ranking` methodology modal: keyboard entry/order, focus containment
and return, Escape, dialog naming/state, touch targets and narrow viewport.

**Result:** production reproduction confirmed that the closed surface remained
in the accessibility tree, focus stayed on the opener, Tab escaped into the KPI
audit drawer and Escape did not close. The modal now has dialog semantics,
initial/contained/restored focus, Escape dismissal, live loading/error states,
an explicit opener relationship and a 44 px close target. Focused Playwright is
4/4 on Pixel 7 + desktop 1440; frontend lint/typecheck, 124/124 unit tests and
production build pass. The responsive runner now reuses an already verified
local server outside CI while CI still starts cleanly.

**Coordination:** no AI runtime, Mission Control architecture, Prediction API or
`OperationalFlowOverview` changes. Public demo was used for BEFORE evidence;
candidate behavior was validated against the isolated local branch.

## 2026-08-23 — Codex — branch `feat/frontend-product-sanitization` — complete

**Scope:** remove user-visible implementation traces from the frontend
(raw API paths/versions, internal identifiers, provider/runtime names,
technical errors and infrastructure metadata) while preserving mining-domain
evidence such as Wenco provenance and FMS operational state codes.

**Coordination:** rebasing the isolated commit onto `origin/main` at `5b780ab`.
The three first-generation `AI*.tsx` files deleted by `23bd4ad` will remain
deleted. `AgentWorkspace.tsx` changes are presentation-only; no runtime,
investigation-model or architecture reconciliation is being attempted.
`OperationalFlowOverview` is not in scope and will not be touched.

**Result:** isolated commit rebased onto final `origin/main` at `ff85668`.
Expected modify/delete conflicts were resolved by retaining the deliberate
deletion of the three first-generation AI components; the Simulator
pointer-move fix was preserved. No Agent runtime/domain contract or
`OperationalFlowOverview` code was changed.

**Validation after rebase:** frontend typecheck PASS; focused presentation-
safety tests 7/7 PASS; full frontend unit suite 120/120 PASS; production build
PASS; `git diff --check` PASS. The Mission Control Playwright command remains
blocked before tests by the existing Vite webServer configuration warning and
30 s startup timeout; no browser assertion failed because none started.

## 2026-08-23 — Claude Code — branch `main` — autonomous loop, in progress

User authorized an unattended loop: work through the known backlog, push
to `main` automatically whenever the full test suite is green, no
per-step confirmation, until they say stop. Scope boundary I'm holding
myself to: concrete, test-verifiable changes only — no unilateral
architecture decisions (the deep `runtime.py`/`AgentWorkspace.tsx`/
investigation-model reconciliation stays out, per the entry below).

**Done this session:** ported the two `runtime.py` bug fixes flagged
below as pending (stuck-in-speaking, duplicate-cancel WS crash) — see
commit `9fee1bd`. Added `test_runtime_state_recovery.py`, confirmed both
tests actually fail without the fix before shipping it. Full suite green
(414 passed), pushed.

**Also done:** re-checked the rest of `integration/agent-consolidated`
for further safe ports. Found and shipped one more: the first-generation
AI copilot chat (`app/ai/{orchestrator,repository,router,schemas}.py`
backend + 8 `AI*.tsx` frontend components) was confirmed genuinely dead
on `main` — mounted at `/api/ai-copilot/*` but zero reachable UI entry
point — and removed, matching `integration/agent-consolidated`'s own
`57bed59` cleanup but re-verified fresh against this repo's current
import graph rather than cherry-picked (two test files needed manual
fixing after removal: `test_ai_copilot.py` deleted outright,
`test_phase01_foundations.py` lost one test that exercised the same dead
path). `app/ai/policies.py` and `useVoiceSession.ts` looked related but
are both live — not touched. Commits `9fee1bd`, `e82ca86`, `23bd4ad`.

Everything else surveyed in `integration/agent-consolidated` (human
decision authority, evidence lineage, confidence semantics) touches the
same entangled cluster (`AgentWorkspace.tsx`, `conclusion.py`,
`investigation_schemas.py`) flagged in the entry below — still not safe
to port mechanically. Considering that branch's easily-portable content
exhausted for now.

**Also done:** found and fixed the H1 backlog's "P0 Simulador ECharts
crash" fresh in this repo (previous diagnosis in the other repo never
found the root cause, only confirmed it didn't leak a stack trace).
`buildCrossoverOption`'s tooltip formatter assumed `params[0]` always
exists; ECharts genuinely calls it with an empty array on some
pointer-move edge cases even for a single-series axis trigger. Exported
the previously-private function, added `Simulator.test.ts`, confirmed
the exact production `TypeError` by temporarily reverting the guard
before shipping the fix. Commit `ba16d16`.

**Checked, found no evidence of a bug (not "fixed" — nothing to fix):**
- `/admin/auditoria` RBAC: `/admin/audit-log` already uses `RequireAdmin`
  (excludes `is_demo` accounts, per this session's earlier security fix)
  plus `_protect_demo_audit_rows()` redaction. Looks correctly scoped.
- Refresh-token race condition: `rotate_refresh_session()` in
  `app/core/audit.py` already does a conditional `UPDATE ... WHERE
  revoked_at IS NULL` and checks `rowcount != 1` to detect a losing
  concurrent request — a real, documented single-use-rotation guard, not
  a naive read-then-write. No reproduction attempted (would need actual
  concurrent-load testing to disprove), but the code shows deliberate
  protection already in place, not an obvious gap.

**Not investigated — needs a live authenticated session, not just code
reading:** Prediction API 410 root cause, ranking methodology modal
accessibility. Stopping this loop here rather than guessing at fixes for
scenarios I can't reproduce or verify.

---

## 2026-08-23 — Claude Code — branch `main` — loop resumed, Prediction fixed

User authorized resuming. Investigated "Prediction API 410" properly
this time (local dev servers + demo API credentials, not the live
production login form). Real finding: not a transient error, `/api/ml/
prediction` is permanently, unconditionally disabled, and the whole
`Prediction.tsx` page (reachable from the sidebar) had been silently
broken for every user since whenever that endpoint was killed. Asked the
user whether to delete the page or reconnect it to real data — this is
a product decision, not a bug fix, so didn't decide it alone. They chose
reconnect. Rewired the page to `/api/cockpit`'s real forecast, verified
that endpoint actually serves data in the live demo's `ENVIRONMENT=demo`
mode before committing to the approach, dropped the two chart/table
sections that had no real data backing them (feature importance,
predicted-vs-actual history) rather than fabricate placeholder data for
them. Full detail in `AGENT_WORK_PLAN.md`. Commit `ec3ebdf`, full suite
green (backend 391, frontend 124 + build).

Remaining: ranking methodology modal accessibility (still needs a live
session). Pausing here again.

---

## 2026-08-22/23 — Claude Code — branch `main`

**Touched:** Reflected 8 commits from `integration/agent-consolidated` onto
`main` (code-footprint cleanup, RequireAdmin/is_demo security fix, admin
password change, `fastScrollEnd` motion fix), fixed a bootstrap-admin
tenant-scope bug (`empresa` mismatch against `require_resource_scope`), and
selectively ported a small safe subset of further work from
`integration/agent-consolidated` (RBAC gap fix in `planner.py` for
`ui_action` capabilities, new `execution_trace.py` module + pruned tests,
`pytest-asyncio` version bump).

**Also:** briefly removed `OperationalFlowOverview` (the homepage section
under `frontend/src/components/brand-prototype/saas/`) believing it was an
unreviewed regression against `DESIGN.md` — reverted immediately once told
it's active, intentional Codex work. Leaving the note here so nobody
repeats that mistake: **that section is Codex's, don't touch it without
checking with Codex/the user first.**

**Did NOT do — real, valuable work left on the table:** `runtime.py` on
`integration/agent-consolidated` has two genuine bug fixes not yet on
`main` — (1) a successful investigation gets stuck in the `speaking` state
forever instead of returning to `idle`; (2) a duplicate/late `agent.cancel`
raises an uncaught `InvalidStateTransition` that crashes the WS connection.
Both are bundled in the same diff as a `speech_policy`→`speech_segmenter`
swap that would revert `main`'s own independently-built speech-chunking
system, so a straight cherry-pick isn't safe — whoever picks this up needs
to manually reapply just the two state-machine fixes against `main`'s
current `runtime.py`.

**Found, not resolved:** `main` and `integration/agent-consolidated` have
both continued evolving the AI agent runtime independently since their
common ancestor (49 commits only on `main`, 22 only on the other branch as
of this writing). The deeply divergent files — `runtime.py`,
`command_router.py`, `AgentWorkspace.tsx`, `aiCopilot.ts`, the
investigation/report model (`conclusion.py`, `investigation_schemas.py`,
`work_products/reports.py`) — are NOT mergeable mechanically; both sides
changed them for different, sometimes incompatible reasons. A real
reconciliation (like the original R2 effort) would need to happen again
from scratch against today's state of both branches. Not attempted here.

Full detail: commits `f6a6d69`..`71ba9a7` on `main`, plus
`project_northmine_seenode_repo_quirks.md` in Claude's persistent memory.

---

## 2026-08-23 — Codex — Linux backend gate follow-up

Local isolation is green at 393/393, but the public Ubuntu job still exits in
the backend-test step after roughly 19 seconds. GitHub hides raw logs for
anonymous viewers, so the workflow now captures pytest output and emits only a
bounded failure annotation on failure. This is diagnostic hardening, not a test
relaxation: `pipefail` preserves the pytest exit code and no assertion, test or
security gate is skipped. Next action is to consume that annotation, reproduce
the Linux-specific defect and return the public gate to green.

**Resolved locally:** the public annotation exposed the sole Ubuntu failure:
`test_demo_watch_can_remain_a_non_active_draft` reached a clean SQLite file
before application startup and therefore had no `agent_watches` table. The
test harness now overrides `NORTHMINE_AGENT_RUNTIME_DB` before importing the
application and initializes the proactivity schema once per pytest session,
matching the schema guarantee provided by production startup while preserving
process isolation. The formerly failing test passes from a clean store; a
caller-supplied sentinel path remained absent; full backend result is 393/393.
Public Ubuntu run `32684926842` then passed the complete workflow in 1m52s.
The only remaining annotation was the runner's Node 20 deprecation warning for
the three official setup actions. Their official v7 manifests/documentation
use Node 24, so checkout, setup-node and setup-python were moved to v7 without
changing the application runtime pins (Node 22 and Python 3.12).

The next warning cleanup replaced only deprecated aliases: Mission Control and
Agent Demo retain HTTP status 422 via `HTTP_422_UNPROCESSABLE_CONTENT`, while
operator-ranking timestamps now originate from timezone-aware UTC and preserve
their existing `...Z` wire representation. A regression parses the service
timestamp and proves a zero UTC offset. Focused result: 6/6; neither app-owned
warning appears in that run. FastAPI lifespan and TestClient/httpx2 warnings
remain separate migration work.

FastAPI's official lifespan contract then replaced the deprecated `on_event`
decorators without moving or weakening any initialization step. The lifespan
awaits the existing startup routine and always awaits shutdown after a
successful entry, so `event_monitor.stop()` remains guaranteed. A dedicated
TestClient regression proves `startup → active app → shutdown`; full backend
result is 395/395. Four framework deprecation warnings disappeared, leaving
only the separate TestClient/httpx2 and optional PySocks dependency warnings.
