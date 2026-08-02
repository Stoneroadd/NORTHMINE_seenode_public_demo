---
name: northmine-brand-experience
description: Use whenever working on NORTHMINE's public experience (/, /solicitar-demo, /solicitud-recibida, /privacy, /acceso-demo) — landing redesigns, brand identity, hero/section composition, motion, or copy. Combines Anthropic's frontend-design methodology with a generic brand-guidelines structure, specialized for NORTHMINE's mining-operations reality. Carries an explicit anti-genericism checklist so the public site never regresses into a generic SaaS/AI-startup template.
---

# NORTHMINE Brand Experience

This skill exists because the public landing has been rebuilt multiple times
across parallel branches (`claude/landing-visual-upgrade`,
`codex/demo-access-landing`, `codex/immersive-brand-story`, and this one).
Without a durable, project-attached reference, each new session re-derives
direction from scratch and drifts toward generic patterns. Read this before
proposing or building anything visual for the public site.

## What NORTHMINE is

- **Product**: NORTHMINE Intelligence — an operational control and decision
  system for open-pit mining. Connects shift production, fleet condition,
  loading units, risk, and plan variance so a decision can be made with
  evidence and later traced to its result.
- **Audience**: mine operations leaders, dispatch/control-room teams,
  production and maintenance planners, technology/data teams evaluating
  integration. Not consumer, not developer-tool, not general-business SaaS.
- **The narrative spine**: Terreno → Equipos → Datos → Brecha → Decisión →
  Resultado. Every structural decision on the public site (section order,
  navigation labels, hero content) should be traceable to this chain — it is
  NORTHMINE's actual operational logic, not a marketing device invented for
  the page.
- **Public demo vs. real product**: the public site runs on synthetic,
  representative data with no connection to operational SQL databases; real
  integrations exist only in private environments; access is reviewed
  manually. This must stay visibly true in the UI (labels, disclosures) —
  never present synthetic data as if it were real, never fabricate customers,
  sites, metrics, or testimonials.
- **Personality**: precise, secure, industrial, technical, sober, confident,
  specialized. NORTHMINE is an instrument, not a decoration. It should feel
  like a serious industrial mining system a control-room operator would
  trust — not a startup pitching itself.

## Method (from frontend-design, applied to NORTHMINE)

1. **Ground every design decision in mining, not in generic SaaS habit.**
   The subject's own world — benches, strata, haul roads, DXF/pit-shell
   geometry, CAEX/shovel cycles, shift/turno structure, coordinates, tonnage
   — is where distinctive choices come from. If a design choice would look
   identical on a fintech or AI-tool landing page, it is not grounded enough.
2. **The hero is a thesis.** It should open with the most characteristic
   thing in NORTHMINE's world — terrain, geometry, or the state→decision
   chain — not a generic "big headline + floating card" template.
3. **Work in two passes.** Brainstorm a compact token system (4–6 named
   hex colors, 2–3 type roles, a layout concept in prose + ASCII wireframe,
   one signature element) before writing code. Review that plan against the
   "AI-generated design clusters" checklist below and revise anything that
   reads as a generic default. Only then build.
4. **Spend boldness in one place.** One signature element per direction,
   everything else quiet and disciplined. Build to the quality floor
   (responsive, visible focus, reduced motion) without announcing it.
5. **Copy is design material.** Write from the operator's side of the
   screen — name things by what a dispatcher or shift lead recognizes, not
   by how the system is built. No inflated claims ("revolucionamos la
   industria") without evidence; no invented metrics, clients, or
   testimonials.
6. **Critique with real screenshots**, not assumption. Never conclude
   something works because it compiled — render it and look. Never present a
   non-scrolled screenshot as proof that scroll-reveal content works (see
   Motion section — `fullPage` screenshots do not fire `IntersectionObserver`
   on their own; scroll through manually before capturing).

## Anti-genericism checklist (hard prohibitions)

Reject any direction, in concept or in code, that includes:

- Blue/cyan generic SaaS dashboard aesthetic.
- Conventional hero: title left, floating card right.
- Repetitive grids of identical cards.
- Indiscriminate glassmorphism.
- Space/galaxy/particle backgrounds unrelated to mining.
- Blue-violet gradients typical of generic AI products.
- Corporate stock photography.
- Generic icon sets used as if they were identity.
- Permanent neon glow.
- Inflated claims without evidence ("revolucionamos la industria").
- Animating every element independently/scattered (prefer one orchestrated
  moment per section over scattered micro-effects).
- Scroll-jacking (scroll must stay native; pin/scrub only where it aids
  comprehension, never to trap the user).
- Mandatory heavy video.
- Effects that impede reading or navigation.
- Oversized components carrying little real information.
- Repeating the same tonnage/goal/benefit claim across multiple sections.
- Inventing clients, sites, results, testimonials, or metrics.
- Presenting synthetic demo data as if it were real operational data.
- Cyberpunk/Matrix/neon-grid treatments (this has been tried and reverted
  before on `/acceso-demo` — see git history of `demo-access-entry.css`).
- Any of the three AI-generated-design defaults from frontend-design's own
  calibration: (1) warm cream bg + high-contrast serif + terracotta accent,
  (2) near-black bg + single acid-green/vermilion accent, (3) broadsheet
  hairline-rule newspaper columns — unless the brief explicitly asks for one
  of these, none should appear "by default."

## Never modify (hard scope boundary)

Backend/FastAPI, PostgreSQL, demo-access request logic, authentication,
RBAC, rate limiting, API contracts, persistence, secrets, Seenode
deployment config, the internal Decision Cockpit, the internal 3D
operational map, admin panels, or code reserved by other in-flight
branches. Presentation of public pages may change; their behavior may not.

## Technical rules

**React/Vite/TypeScript**: functional components, typed props, no `any`
escape hatches without reason. Keep the public landing's own chunk free of
Three.js, ECharts, and the Decision Cockpit — verify via `npm run build` and
inspect `dist/assets` chunk membership, don't assume code-splitting works.

**Motion (GSAP where used)**: `useGSAP` + refs + scope + proper cleanup, one
coordinated timeline per section rather than dozens of scattered triggers,
animate `transform`/`opacity` (not `width`/`height`/`top`/`left` — those
force layout reflow; a project design-detector will flag this, see
`c8aedc5` in `codex/demo-access-landing` for a real example that was fixed).
Desktop may pin/scrub when it aids comprehension; mobile gets fluid
editorial scroll, no long pins. `prefers-reduced-motion` gets a fully static,
complete, legible fallback — not just `animation-duration: 0.01ms`. Respect
`navigator.connection?.saveData`. No ScrollTrigger left alive after
unmount. Critical content must exist in the DOM regardless of animation
state — never gate essential information behind an IntersectionObserver
callback that might not fire.

**Accessibility**: one `h1`, full landmark structure, skip link, visible
focus-visible states, WCAG AA contrast, 44×44 touch targets, keyboard
navigation, alt text, no information conveyed by color alone.

**Performance**: explicit image dimensions (avoid CLS), lazy-load outside
the hero, self-hosted fonts only (no external font CDN calls), no new heavy
dependency without checking what's already installed in `frontend/package.json`
first.

**CSS duplication trap (project-specific)**: `demo-landing.css`,
`demo-landing-strata.css`, `demo-brand-system.css`, `demo-brand-identity.css`,
and others define overlapping selectors for the same public components.
Whichever file is imported *last* in `PublicPageShell.tsx` (or `Login.tsx`
for the shared login) wins for equal-specificity rules — this has caused
real, silent bugs before (wordmark rendering in the wrong font, a mobile
layout that silently stopped collapsing to one column). Check the actual
import order before assuming a CSS edit will take effect, and prefer
removing/neutralizing the losing declaration over relying on cascade order.

## Verification habits (from real bugs found this project)

- A `fullPage` Playwright screenshot does not trigger scroll-based reveal
  animations — scroll through manually (`window.scrollTo` in a loop with
  small delays) before capturing, or the capture will show false-blank
  sections.
- `position: sticky` can silently fail to stick if any ancestor
  (`body`/`#root`/etc.) has non-`visible` `overflow` — check computed styles
  after applying, don't assume the CSS property alone worked.
- Before claiming an image/format optimization helped, measure actual file
  sizes before/after, not estimates.
- Before recommending or reusing anything documented in project memory or
  an older skill/plan, verify the referenced file/selector/component still
  exists — branches move fast here.

## Brand documentation structure (from brand-guidelines-community)

When formalizing a chosen direction into `BRAND_GUIDELINES.md`, use this
shape (adapted from the community `brand-guidelines-community` skill, filled
with NORTHMINE-specific content, never left as placeholders):

1. Brand Overview (mission, personality, audience — see "What NORTHMINE is"
   above)
2. Logo Usage (variants, clear space, minimum size, do's/don'ts)
3. Color Palette (named tokens, hex, WCAG AA contrast pairs verified)
4. Typography (roles, weights, scale, licensing note — fonts must be
   self-hosted, see `frontend/public/fonts/`)
5. Imagery (synthetic mining photography direction, DXF/orthomosaic
   treatment, what's forbidden — see anti-genericism checklist)
6. Voice & Tone (operator-facing, active voice, no inflated claims,
   examples in Spanish matching the site's actual language)
7. Applications (header, hero, form, confirmation, login, footer, favicon,
   Open Graph — enumerate every public surface, not just the homepage)
8. Do's and Don'ts (a compact checklist a future session can scan in
   seconds)

## Relationship to other in-repo work

Check `git branch -a` and `git worktree list` before starting — this
project has had simultaneous work on landing visuals
(`claude/landing-visual-upgrade`), a brand symbol/wordmark system
(`codex/demo-access-landing`), and a GSAP scroll-story
(`codex/immersive-brand-story`). Inventory what already exists (symbol,
wordmark, tokens) before proposing a competing one — NORTHMINE should end
up with one brand system, not several drifting in parallel.
