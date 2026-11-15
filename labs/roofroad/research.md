# The Roof Road — piece shelf (屋根道)

A review shelf, not a study. Every tile in `labs/roofroad/` is the Roof Road's
own classic builder (`rooftops/js/pieces/`, through the `PIECES` table in
`rooftops/js/pieces/index.js`) run read-only on the real level from
`buildLevel()`: the first piece of each type on the route, built with the same
`ctx` that `buildWorld()` hands it, then turned into its rail frame (local x
along the rail, z toward the camera, ground at y = 0; `pieceLayout()` in
`rooftops/js/build.js`). The skyline (distant city, pagodas) and the pickups
(Shōki, treats) are built by the same functions `buildWorld()` calls.

Built for BUILD_GUIDE_FABLE.md section 12, step R1.5, by lane `r1-roof-split`,
so every Roof Road row in `labs/asset_inventory.json` has a page the Asset
Library can open (`labs/roofroad/?specimen=<type>`). The inventory records
these as `review` evidence: the shelf shows what exists and makes no new
recipe. Lanes `r2`–`r5` add their studies here (or in the labs they reuse)
before they promote a kit piece.

## What the run is built from

- The design: `docs/superpowers/specs/2026-10-24-rooftop-road-design.md`
  (seven mouths from the Sanjō bridge to the top of a hoko float, the five
  Okuribi fires as the finale).
- The research behind it: `docs/ROOFTOPS_RESEARCH_2026-10-24.md`.
- The downtown and alley-agility passes: `docs/ROOFTOPS_DOWNTOWN_2026-11-13.md`,
  `docs/ROOFTOPS_AGILITY_2026-11-13.md` (crates, casks, zushi tunnels, alley
  pockets and routes, poles, trellises, willows, culverts, the Tenmangū gate,
  the yama float, the villagers).

## Rules every replacement keeps

- The run's geometry is gameplay. Platforms, walls and ceilings belong to
  `rooftops/js/level.js`; a kit piece draws the surfaces its level record
  names and registers no collision (`pieceLayout().footprint` is empty).
- One inventory id per piece type, routed through `assets.build(id, layout,
  classic)` in `buildWorld()`. The Roof Road page builds its own
  `AssetRuntime` (classic by default; `?assets=` and `?swap=` honoured).
- `node tools/rooftop_test.mjs` and `node tools/rooftop_golden.mjs` gate every
  change: the numeric golden must stay EQUAL on `classic`.

## Page flags

`?specimen=<type>` (or `#specimen-<type>`) reveals one tile, as the Asset
Library links it. `?hour=`, `?spin=0`, `?shelf=photo`, `?shot=1&nohud=1` as in
the other workshop labs.
