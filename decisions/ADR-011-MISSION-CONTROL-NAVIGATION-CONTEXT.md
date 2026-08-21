# ADR-011 — Mission Control Navigation and Shared Context

Status: Proposed for Phase 1 approval

## Context

The current application has a permanent sidebar, manual route dispatch and page-local selections. Mission Control requires NOW → OPERATION → EVENT → HISTORY continuity across Flow, 3D, Search and Replay.

## Decision

Adopt a workspace model with four primary contexts: NOW, OPERATION, HISTORY and SEARCH. Use a compact TopContextBar and ContextDock rather than a permanent module sidebar. Maintain one typed operational context for site, shift, temporal mode, timestamp, selected entity, active event and representation.

Essential safe references may be serialized in the URL. All resource and site references are reauthorized server-side; URL values never establish tenant, role or permission.

Legacy modules and URLs remain available through an explicit compatibility manifest until capability parity and retirement approval.

## Consequences

- A later shell implementation requires a real routing layer or equivalent single source of route truth.
- 3D and Operational Flow must consume the same selection/time contract.
- Search becomes navigation infrastructure rather than a page-local filter.
- Back/forward and deep-link behavior become acceptance requirements.
- Admin and public routes remain outside operational workspace navigation.

## Rejected alternatives

- Permanent or renamed sidebar: preserves module-first mental model.
- One giant dashboard landing: fails prioritization and calm stable state.
- Page-local selection/time stores: breaks cross-representation continuity.
- Encoding authorization claims in URL state: insecure and non-authoritative.

## Rollback

The future shell must ship behind a feature flag with legacy route adapters. Disabling the flag restores the current shell without removing legacy routes or data contracts.
