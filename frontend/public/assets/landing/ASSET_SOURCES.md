# NORTHMINE landing assets

These assets were created specifically for the NORTHMINE public demo. They do
not contain imagery from a customer, an operational mine, a satellite provider,
or a third-party stock library.

## open-pit-blue-hour-synthetic.webp

- Type: synthetic illustrative image
- Created: 2026-07-31
- Tool: OpenAI image generation
- Intended use: public landing hero
- Content: fictional open-pit mine at blue hour
- Restrictions: do not present as a real mine, customer site, or operational
  record

## open-pit-orthomosaic-synthetic.webp

- Type: synthetic illustrative image
- Created: 2026-07-31
- Tool: OpenAI image generation
- Intended use: orthomosaic-style background for the public map preview
- Content: fictional top-down open-pit mine
- Restrictions: do not present as survey evidence, a georeferenced raster, a
  real customer orthomosaic, or operational data

## caex-haul-road-synthetic.webp

- Type: synthetic illustrative image
- Created: 2026-08-01
- Tool: OpenAI image generation
- Intended use: public landing equipment context
- Content: fictional, unbranded CAEX operating on an open-pit haul road
- Restrictions: do not present as a real equipment record, customer asset, or
  operational mine

## electric-shovel-loading-synthetic.webp

- Type: synthetic illustrative image
- Created: 2026-08-01
- Tool: OpenAI image generation
- Intended use: public landing equipment context
- Content: fictional, unbranded electric rope shovel loading a CAEX
- Restrictions: do not present as a real equipment record, customer asset, or
  operational mine

## DXF-style overlay

The contour overlay is rendered by `PitContourField.tsx` from geometry already
included in this repository. It was not downloaded from an external image
provider. The public page labels it as a demo/reference layer.

---

# `prototype/` subfolder (NORTHMINE — Operational Archive prototype)

Assets specific to the isolated `/brand-prototype` route
(`claude/northmine-brand-experience`, not published, not linked from the
public landing). No new photography or generated imagery was created for
this prototype — see "Capability disclosure" below.

## prototype/product/cockpit-operational-demo-capture.webp (+ -900.webp)

- Type: sanitized product screenshot (real, not synthetic)
- Captured: 2026-08-02
- Tool: automated browser capture (Playwright) against the public demo
  deployment (`https://northmine-seenode-public-demo-3.seenode.app/cockpit`),
  authenticated with the public demo credentials, synthetic/demo data only
- Intended use: Momento 5 (Evidencia) and as contextual imagery for three
  Archivo Operacional chapters (Producción, Riesgo, Decisión) that read data
  literally shown on this same screen
- Content: the real Decision Cockpit interface, visibly labeled "MODO DEMO"
  / "Datos sinteticos" / "Backend DEMO LOCAL" in the capture itself
- Restrictions: demo data only; must be recaptured if the interface changes
  materially; do not crop out the demo-mode badges

## prototype/product/module-{production,fleet,loading,breakdowns,alerts,map3d,aerial}.webp (+ -600.webp)

- Type: sanitized product screenshots (real, not synthetic)
- Captured: 2026-08-02
- Tool: automated browser capture (Playwright) against the public demo
  deployment (`https://northmine-seenode-public-demo-3.seenode.app`),
  authenticated with the public demo credentials, navigating to
  `/produccion`, `/flota`, `/carguio`, `/averias`, `/alertas`,
  `/operational-map-3d` and `/aerea` respectively — synthetic/demo data only
- Intended use: SaaS-direction module gallery (`ModuleGallery.tsx`) on the
  isolated `/brand-prototype` route
- Content: the real corresponding module interface, visibly labeled
  "MODO DEMO" / "Datos sinteticos" / "Backend DEMO LOCAL" in each capture
- Restrictions: demo data only; must be recaptured if the interface changes
  materially; do not crop out the demo-mode badges. No "Plan Mensual"
  capture exists — there is no standalone route for it (it only appears as a
  category label inside the Mapa Operacional 3D module), so it was left out
  of the gallery rather than fabricated.

## prototype/brand/*.svg (symbol-nm, symbol-nm-mono, wordmark-monumental, favicon)

- Type: original vector artwork
- Created: 2026-08-02
- Tool: hand-authored SVG (coordinate geometry), no image-generation tool
  involved; the wordmark uses IBM Plex Sans (already licensed and
  self-hosted in `frontend/public/fonts/`) rendered as real SVG `<text>`,
  not traced/modified letterforms
- Content: the NORTHMINE symbol (two chamfered posts + a stepped diagonal —
  a mine-bench cross-section that also reads as the letter N) and its
  monumental wordmark treatment
- Restrictions: none beyond standard project brand use

## Capability disclosure

No image or video generation tool was available for this prototype. Section
13's imagery requirement ("vista aérea, operación pala–CAEX, vídeo") is
satisfied by reusing the already-documented synthetic images above
(`open-pit-blue-hour-synthetic.webp`, `caex-haul-road-synthetic.webp`,
`electric-shovel-loading-synthetic.webp`, `open-pit-orthomosaic-synthetic.webp`)
plus the one real capture documented above. No video was produced — Momento
1's hero uses a static image with the same treatment a video poster would
get; there is no video element to provide a reduced-motion/Save-Data
fallback for, because no video was added in the first place. If a licensed
video becomes available later, `MiningHero.tsx` is the single place to wire
it in.
