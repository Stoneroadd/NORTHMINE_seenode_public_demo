# NORTHMINE Public Experience Design

## Direction

Premium industrial mining control room: precise, sober, technical, and
specialized. The operation is the visual subject; the interface is the
instrument.

## Typography

- IBM Plex Sans for narrative and controls.
- IBM Plex Mono for operational labels and values.
- No viewport-scaled font sizes.
- Letter spacing stays at zero.

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
- Operational flow reads: state, gap, cause, risk, decision, result.
- Product evidence uses real screenshots when available and honest preview
  frames otherwise.
- Corners stay at 8px or less.
- No cards nested inside cards.

## Motion

- Short opacity and transform transitions on direct interaction only.
- No parallax, automatic carousel, continuous scroll animation, or ambient
  particles.
- `prefers-reduced-motion` removes nonessential motion.

## Accessibility

- One `h1`, complete landmark structure, and a skip link.
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
