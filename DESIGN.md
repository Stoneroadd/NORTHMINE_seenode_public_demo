# NORTHMINE Public Experience Design

## Direction

Premium industrial SaaS for open-pit mining. The public homepage sells the
platform through operational evidence, cinematic mining scale and a restrained
decision narrative. The founder story remains available at `/origen`, but it
does not dominate the commercial homepage.

## Typography

- IBM Plex Sans for narrative, product explanation and controls.
- IBM Plex Mono only for operational labels, data and coordinates.
- Display type scales responsively up to 6rem with tracking no tighter than
  -0.04em.

## Color

- Near-black graphite fields reflect control-room use.
- Copper and amber identify the NORTHMINE brand and primary actions.
- Green, red, blue and teal remain semantic data colors.
- Large photographic fields carry geological blue, steel and mineral tones.

## Layout

- The first viewport is a full-scale product proposition over real mining
  imagery, with one primary commercial action.
- Product evidence appears early and at substantial scale.
- Sections alternate cinematic imagery, operational UI and quiet explanatory
  passages; the page never becomes a grid of identical cards.
- The public narrative reads: problem, connected operation, evidence,
  capabilities, decision flow, security and demo request.

## Motion

- GSAP coordinates the hero reveal, DXF drawing, scroll-linked image depth and
  one cinematic mining transition.
- Pointer light and scroll progress respond to the visitor without looping
  ambient animation.
- `prefers-reduced-motion` reveals all content immediately and removes parallax.

## Imagery

- Use project-owner photographs, verified licensed material and clearly
  documented original generated assets.
- Mining geometry, equipment and geology must remain plausible.
- Product screenshots always identify demo or synthetic data where applicable.

## Accessibility and responsive rules

- One `h1`, complete landmarks, visible focus and touch targets of at least
  44px.
- Mobile removes parallax and preserves the equipment focal point behind
  readable copy.
- No horizontal page overflow from 320px through wide desktop.
