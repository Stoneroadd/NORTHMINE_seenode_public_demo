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

**Confirmed already fine, no action needed:** `/admin/audit-log` RBAC
(already `RequireAdmin` + redaction) and refresh-token rotation (already
race-guarded via conditional `UPDATE`) — see `AGENT_LOG.md` for detail.
Don't re-investigate these without new evidence of an actual failure.

**Minor, low-priority a11y polish left on the table:** `OperatorAuditDrawer.tsx`
and `OperatorRankingDrawer.tsx` (fixed 2026-08-23, see above) don't have
the `aria-haspopup="dialog"`/`aria-expanded`/`aria-controls` opener
relationship that `OperatorMethodologyModal.tsx`'s trigger button has,
because both open from table rows via a shared `onSelect`/`onAudit`
callback rather than one fixed button — adding it means threading
per-row `aria-expanded` state through `OperatorRankingTable.tsx` and
`OperatorPriorityBoard.tsx` (not yet reviewed). The core fix (dialog
semantics, focus trap, Escape, focus restoration) is done; this is a
genuine but smaller remaining gap, not a blocker.

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
