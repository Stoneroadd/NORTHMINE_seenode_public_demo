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

## How to use this

**Before starting non-trivial work**, add an entry at the top (newest
first) with: date, agent/session, branch, what you're about to touch, and
why. If you're not sure whether it overlaps with something in progress,
check the most recent entries first — if someone's mid-way through touching
the same files, coordinate (wait, or scope around it) rather than guessing.

**When you finish**, update your entry's status and note anything the next
session needs to know: what you deliberately did NOT do and why, what's
still broken, what to check before building on top of it.

**Keep entries short.** This is a coordination log, not a design doc or a
commit message — link to the actual commit/PR for detail.

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
