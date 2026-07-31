# Codex Demo Access Coordination

## Worktree

- Branch: `codex/demo-access-landing`
- Worktree: `C:\Users\maste\Downloads\NORTHMINE_seenode_public_demo_codex_demo_access`
- Base commit: `6f7a763`
- Status: Listo para integracion, sin push ni merge

## Objective

Build the public NORTHMINE commercial landing, demo access request flow,
privacy notice, and isolated FastAPI request API. Keep the current operational
application protected and preserve its internal route contracts.

## Reserved By Codex

New frontend files under:

- `frontend/src/components/landing/`
- `frontend/src/pages/DemoLandingPage.tsx`
- `frontend/src/pages/DemoRequestPage.tsx`
- `frontend/src/pages/DemoRequestSuccessPage.tsx`
- `frontend/src/pages/DemoPrivacyPage.tsx`
- `frontend/src/pages/DemoAccessAdminPage.tsx`
- `frontend/src/PublicRouter.tsx`
- `frontend/src/services/demoAccessService.ts`
- `frontend/src/types/demoAccess.ts`
- `frontend/src/styles/demo-landing.css`
- `frontend/src/styles/demo-access-admin.css`

New backend files under:

- `backend/app/api/demo_access.py`
- `backend/app/schemas/demo_access.py`
- `backend/app/services/demo_access_service.py`
- `backend/app/repositories/demo_access_repository.py`
- `backend/tests/test_demo_access.py`

Minimal integration changes, kept in a separate commit:

- `frontend/src/App.tsx`
- `frontend/src/main.tsx`
- `backend/app/main.py`
- `backend/app/core/config.py`
- `backend/app/core/rate_limit.py`
- `scripts/start_public_demo.mjs`
- `frontend/index.html`

## Preserved Concurrent Work

The original working tree contains Claude changes in cockpit, navigation,
equipment, charts, operational insights, store, tokens, and time utilities.
This worktree was created from the clean base commit and does not modify or
stage those changes.

Codex will not touch:

- `DecisionCockpit.tsx`
- `KpiCard.tsx`
- `LoadingEquipmentCard.tsx`
- `mindmap3d`
- operational chart components
- `Sidebar.tsx`
- `tokens.css`

## Route Contract

- `/` becomes the public landing.
- `/solicitar-demo`, `/solicitud-recibida`, and `/privacy` are public.
- `/acceso-demo` uses the existing login.
- `/app` is a compatibility entry that resolves to `/cockpit`.
- Existing internal module routes remain unchanged and protected.
- `/health` and `/api/*` remain backend routes.

## Data Contract

- Public content states that demo operational data is synthetic.
- Demo access requests are isolated from operational databases and users.
- No automatic user creation, email delivery, or invitation issuance.
- Existing authentication, refresh token, operational services, and demo
  datasets remain unchanged.

## Validation

- Frontend TypeScript: passed.
- Frontend production build: passed.
- Full Seenode build script: passed.
- Demo access API tests: 10 passed.
- Static Impeccable detector: 0 findings.
- Local FastAPI health, SPA fallback, login, submit, list, and approve: passed.
- Full backend suite: 123 passed, 14 unrelated failures in existing
  WENCO/audit/security tests that require unavailable real SQL configuration
  or fail in pre-existing code paths.

## Integration Notes

- `main` advanced from `6f7a763` to `1b42f4a` while this worktree was active.
  Rebase this branch after Claude finishes before merging.
- The later main commits do not modify the Codex landing, router, FastAPI
  registration, or demo access files, but the rebase and build must still be
  repeated.
- No suitable Cockpit or Map 3D captures were present in the repository.
  Honest placeholders remain until verified captures are supplied.
- The connected browser was unavailable, so screenshot and human visual
  validation remain blocked. No alternate browser surface was used.
- Seenode filesystem durability is not documented. Local SQLite remains a
  development fallback and must not be presented as reliable lead storage.
