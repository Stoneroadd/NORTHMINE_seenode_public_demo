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
