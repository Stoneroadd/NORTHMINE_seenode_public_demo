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

## prototype/materials/terrain-*.webp — real freely licensed photography

Sourced from Wikimedia Commons via its public search API (not guessed URLs),
selecting only files with a clear public-domain or CC BY / CC BY-SA license.
Visible credit lines with links back to the source page are rendered on
`/brand-prototype` itself (`TerrainMaterials.tsx`), in addition to this
record, to satisfy CC BY / BY-SA's on-page attribution requirement.

- **terrain-openpit-kennecott(.webp/-900.webp)** — "Kennecott Smelter and
  Mine" aerial, Bruce McAllister, U.S. National Archives (NARA). Public
  domain. https://commons.wikimedia.org/wiki/File:KENNECOTT_SMELTER_AND_MINE_-_THE_LARGEST_OPEN-PIT_COPPER_MINE_IN_THE_WORLD_-_NARA_-_544792.jpg
  — used as the hero backdrop (Save-Data aware, parallax on scroll).
- **terrain-caex-real(.webp/-500.webp)** — "Coal Haul Truck at North
  Antelope Rochelle", Peabody Energy. CC BY 3.0.
  https://commons.wikimedia.org/wiki/File:Coal_Haul_Truck_at_North_Antelope_Rochelle.png
- **terrain-pala-real(.webp/-500.webp)** — "P&H 4100XPB Shovel-4",
  Sansumaria (en.wikipedia). CC BY-SA 3.0.
  https://commons.wikimedia.org/wiki/File:P%26H_4100XPB_Shovel-4.jpg
- **terrain-cobre-real(.webp/-500.webp)**, cropped — "Natural Copper Ore
  Macro 1", Jon Zander (Digon3). CC BY-SA 3.0.
  https://commons.wikimedia.org/wiki/File:Natural_Copper_Ore_Macro_1.JPG
- **terrain-oro-real(.webp/-500.webp)**, cropped — "Gold-quartz hydrothermal
  vein (Eagles Nest Mine, Placer County, California, USA)", James St. John.
  CC BY 2.0. https://commons.wikimedia.org/wiki/File:Gold-quartz_hydrothermal_vein_(Eagles_Nest_Mine,_Placer_County,_California,_USA)_(17035851812).jpg
- **terrain-topografia-real(.webp/-700.webp)**, cropped to the contour-map
  panel — "Geological Map of the Knoxville District", U.S. Geological
  Survey, Monograph XIII. Public domain.
  https://commons.wikimedia.org/wiki/File:Geological_Map_of_the_Knoxville_District._U.S._Geological_Survey._Monograph_XIII,_Atlas_Sheet_V._Topography_by_J.D._Hoffman_(IA_dr_geological-map-of-the-knoxville-district-us-geological-survey-monograph-4580003).jpg

All six are given a shared dark/copper duotone filter (`.ns-terrain__photo`
+ `.ns-terrain__frame::after` in `northmine-saas-layout.css`) specifically
because they come from very different original sources (a 1970s NARA aerial,
a museum specimen on white background, a 19th-century survey scan) and
would otherwise look like an unrelated stock-photo grab-bag rather than one
consistent visual system.

**Disclosed gaps** (searched, not found, not faked):
- No close-up photograph of a mine worker/operator was found on Commons
  with an adequate resolution and a clear free license after several search
  attempts (English and Spanish terms). Rather than use a generic/uncertain
  photo, the human/operational dimension is represented indirectly through
  the operated-equipment photos (truck, shovel) and the real product
  captures. This gap is intentional, not an oversight.
- Two aerial photos of the Anaconda Copper Mine (Yerington, NV, CC BY-SA
  2.0, Ken Lund) were downloaded and reviewed but **not used** — at normal
  viewing size they read as a general aerial landscape (town + farmland)
  rather than legibly "a mine," so they would have undercut rather than
  supported the section.
- No suitable short, on-topic, lightweight CC-licensed mining video was
  found. The one on-topic video candidate ("Faith in the Future" —
  Fruehauf Trailers trucking-industry history, public domain, 93 MB, 480p)
  was rejected: it's an old general trucking-industry documentary, not
  mining footage, and too heavy for a background loop. No video was added;
  motion on `/brand-prototype` is CSS/JS (parallax, scroll reveals, count-up
  numbers) rather than a stock video loop.
- Ortomosaico continues to use the previously documented synthetic image
  (`open-pit-orthomosaic-synthetic.webp`, above) — no real top-down
  orthophoto (as opposed to oblique aerial photography) with a free license
  turned up in this search pass.

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
