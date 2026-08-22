# ADR-012: Mission Control visual and semantic contract

- Status: Accepted
- Date: 2026-08-21

## Context

The current frontend contains multiple themes, duplicated CSS and effects whose brand colors can overlap operational meaning. Mission Control must coexist with those screens during migration while keeping copper separate from warning and distinguishing mine conditions from software/data conditions.

## Decision

Mission Control uses a scoped `.mc-surface` token namespace and one matte graphite/mineral direction. Copper is reserved for brand, focus and primary action. Operational tones are independent semantic tokens and every state combines icon or shape with a visible label.

IBM Plex Sans and IBM Plex Mono are the Mission Control typography pair, loaded once globally from repository assets. Motion is brief and state-driven, with a reduced-motion override. Interactive actions have a 44 px minimum target and visible keyboard focus.

Core primitives remain presentational and typed. Backend provenance, event lifecycle, authorization and data quality remain authoritative; frontend components only render supplied contracts.

## Consequences

- Mission Control can migrate incrementally without rewriting legacy CSS first.
- Legacy themes remain available until their routes are absorbed or retired.
- Copper cannot be reused as attention or critical semantics in new Mission Control surfaces.
- System/data degradation and operational events require separate components and language.
- The Phase 2 catalog is validation evidence, not the Phase 3 application shell.

## Rollback

Remove the catalog route and its two global stylesheet imports. Because tokens are scoped and existing module styles are unchanged, legacy routes continue to render with their prior design system.
