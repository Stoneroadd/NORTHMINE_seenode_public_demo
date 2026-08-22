# NORTHMINE Mission Control Design System 2.0

## Status and boundary

**IMPLEMENTED / EN VALIDACIÓN.** This is the visual and interaction foundation for Mission Control. It does not replace the application shell, introduce NOW/OPERATION/HISTORY/SEARCH navigation, or claim live Wenco state. The authenticated preview at `/mission-control/design-system` deliberately runs inside the legacy shell until Phase 3.

## Direction

The visual direction is a matte mineral control surface: graphite background, charcoal working surfaces, restrained separators, IBM Plex typography and copper used only for NORTHMINE identity, focus and primary action. Operational meaning is independent from the brand color.

The system is intentionally quiet when normal. It increases visual dominance only for an operational condition, its propagation or its recovery. It prohibits ornamental gradients, glass effects, permanent glow, decorative KPI walls and color-only state communication.

## Token contract

Mission Control tokens are scoped by `.mc-surface` in `frontend/src/styles/mission-control.css` so they can coexist with the legacy product during migration.

- Surfaces: background, base, raised and active layers.
- Text: primary, secondary and tertiary hierarchy.
- Brand: copper tokens; neither represents warning.
- Operational semantics: normal, attention, critical, informational, unknown and recovering.
- Interaction: high-contrast focus, 44 px minimum actions and explicit disabled state.
- Typography: IBM Plex Sans for interface language; IBM Plex Mono for timestamps, lifecycle and evidence labels.
- Motion: short state transitions only; durations collapse under `prefers-reduced-motion`.

Font declarations are centralized in `frontend/src/styles/northmine-fonts.css`; duplicate declarations were removed from the demo brand stylesheet.

## Implemented primitives

- `StatusIndicator`: icon, label and semantic tone; never color alone.
- `DataConditionBanner`: fresh/delayed/incomplete/conflicting/unavailable data conditions kept distinct from mine events.
- `OperationalEventCard`: Level 1 identity, impact and elapsed time with lifecycle and inspect action.
- `DetailDisclosure`: native disclosure for Level 3 evidence and hypotheses.
- `OperationalTimeline`: event/action/recovery/system chronology with icon and text semantics.
- `MissionState`: stable, empty, loading, error and connection surface.

Exports live under `frontend/src/mission-control/design-system/index.ts`. Semantic labels and LIVE eligibility are centralized in `semantics.ts`; icon maps remain local to their typed components.

## Progressive disclosure

The catalog demonstrates the required order:

1. Understand: `PH03 detenido`, six trucks affected and elapsed time.
2. Decide: the inspector explains that attention is required and no action is executed automatically.
3. Investigate: evidence, deterministic derivation, data quality and hypotheses appear on request.

Facts, derived information and hypotheses are visibly separated. Synthetic provenance is explicit in the validation catalog.

## Accessibility and responsive behavior

- Native buttons, details/summary, headings, regions, lists and time elements.
- Visible focus ring and 44 px action target.
- Icons are supplementary; labels carry meaning.
- Desktop uses a two-column situation/timeline composition.
- Below 920 px, the timeline follows the event in reading order.
- At 430 px, actions remain usable and the page has no horizontal overflow.
- Reduced motion is covered by a runtime test.

## Evidence

- Unit: 111/111 frontend unit tests passed.
- Typecheck/lint and production build passed.
- Impeccable detector: no findings.
- Runtime visual assertions passed at desktop 1440x900, tablet 1024x768, mobile 430x932 and reduced motion. The Windows Playwright-owned Vite process required manual cleanup after all four successful results; this is a harness cleanup issue.
- Visual baselines: `frontend/tests/visual/__screenshots__/mission-control-design-system.spec.ts/`.

## Migration rule

Legacy themes and effects are not deleted in Phase 2. Mission Control components use this scoped contract; Phase 3 decides how the new shell activates it and preserves legacy routes. No component in this layer may infer live status, provenance or authorization from frontend state alone.
