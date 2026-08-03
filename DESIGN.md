# NORTHMINE Public Experience Design

## Direction

Premium industrial mining origin story: precise, sober, technical, and
personal. The real trajectory from plant and pit to dispatch and software is
the visual subject; the interface is evidence of that experience.

## Typography

- IBM Plex Sans for narrative and controls.
- IBM Plex Mono for operational labels and values.
- Display type may scale responsively with `clamp()` up to 6.6rem.
- Display tracking may tighten to -0.04em; body and control tracking stays at
  zero.

## Color

- Near-black graphite page backgrounds.
- Neutral steel surfaces with thin borders.
- Warm safety amber for primary commercial actions.
- Muted green for verified/available status.
- Red only for genuine error or risk.
- Cyan is limited to existing product evidence and never dominates the page.

## Layout

- Full-bleed open-pit hero with text directly over the image.
- Editorial bands rather than a grid of identical cards.
- Public narrative reads: first line, equipment, dispatch, questions,
  inflection point, NORTHMINE.
- Operational product flow reads: state, gap, cause, risk, decision, result.
- Product evidence uses real screenshots when available and honest preview
  frames otherwise.
- Corners stay at 8px or less.
- No cards nested inside cards.

## Motion

- One restrained GSAP scroll-linked hero movement and discrete section
  reveals are allowed when they support the chronology.
- No automatic carousel, looping ambient animation, or particles.
- `prefers-reduced-motion` removes nonessential motion.

## Accessibility

- One `h1` and complete landmark structure.
- Visible labels and focus states.
- WCAG AA contrast.
- Touch targets are at least 44px on compact screens.
- Form errors use a summary, field associations, and focus management.

## Responsive Rules

- Desktop navigation condenses into a menu under 900px.
- Hero leaves the next section visible in the first viewport.
- Product evidence remains legible without horizontal page overflow.
- Forms use one column on mobile and two columns only where labels and inputs
  remain readable.
