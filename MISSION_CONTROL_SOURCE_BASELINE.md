# NORTHMINE Mission Control — Source Baseline

Captured: 2026-08-21, America/Santiago. This file records the immutable input to Phase 0.1; the Phase 0.1 working tree is intentionally not committed.

## Repository identity

- Working copy: `C:\Users\maste\Downloads\NORTHMINE_seenode_public_demo`
- Remote: `https://github.com/Stoneroadd/NORTHMINE_seenode_public_demo.git`
- Branch: `feature/operational-agent-hardening`
- Baseline HEAD: `b54329e2b6ff3f1f18cc2cbc612a526decf74efa`
- Baseline commit: `docs(mission-control): add phase zero architecture audit`
- Commit time: `2026-08-20T23:42:45-04:00`
- Tracking ref: `origin/feature/operational-agent-hardening`
- Tracking SHA at capture: `b54329e2b6ff3f1f18cc2cbc612a526decf74efa`
- Ahead/behind at capture: `0/0`

Reproduce the source with `git fetch origin`, then create a new isolated worktree at the full SHA. Do not reuse ignored databases, secrets, models, build outputs or test artifacts as source inputs.

## Working-tree boundary at capture

Before Phase 0.1 edits there were no tracked modifications. Protected, pre-existing untracked paths were:

- `.claude/settings.local.json`
- `backend/models/` (local Vosk model)

They are not owned by Phase 0.1 and must not be staged, deleted or packaged. Relevant ignored runtime state includes `.audit_encryption_key.local`, `.venv/`, `backend/.venv/`, `data/`, local SQLite databases, `.runtime/`, `frontend/node_modules/`, `frontend/dist/`, `frontend/test-results/`, logs, pytest temporary trees, and `agent-harness/artifacts|traces`. Several old pytest directories are ACL-inaccessible; no cleanup was attempted.

## Baseline decision

This SHA is the accepted discovery and Phase 0.1 design baseline for the **public-demo derivative**. It is not yet approved as the production Mission Control implementation repository or as a real-Wenco release baseline. That promotion requires human confirmation of repository/environment ownership and the persistence ADR. Phase 1 remains blocked.

## Verification commands

```powershell
git rev-parse --show-toplevel
git branch --show-current
git rev-parse HEAD
git rev-parse origin/feature/operational-agent-hardening
git rev-list --left-right --count HEAD...origin/feature/operational-agent-hardening
git status --short
git status --ignored --short
```

Network drift after capture does not alter this baseline; compare against the recorded full SHAs.
