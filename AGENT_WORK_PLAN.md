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
