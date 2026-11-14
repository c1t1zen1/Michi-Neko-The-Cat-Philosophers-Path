# v-hidden status
Model: Claude Sonnet 5.5. Base: fable/integration 2bd963d. Family: src/kit/hidden, lab 07 (moonpool). Started 2026-11-13.

- [x] L1 status file
- [x] L2-L3 family `hidden`: all 15 ids (moon-pool, pool-apron, pool-water, pool-moon, pool-rim, pool-seat, lily-pads, lotus, pool-motes, lantern-glade, glade-floor, glade-bamboo, glade-lanterns, glade-seat, glade-fireflies), hero/mid/far, params. `pool-toro` stays v-lanterns' and is composed into the kit moon-pool.
- [x] L4 gap specimens: `labs/moonpool/js/ground.js` (8 tiles, 3 new shelves): game-ground (original), apron-moss, rim-chisel, seat-slab, glade-litter, bamboo-nodes, boulder-moss, glade-whole
- [x] L5 `node tools/kit_index.mjs` (src/kit/index.js regenerated, 8 families)
- [x] L6 compare JPGs: 29 classic/modular pairs in docs/fable/status/v-hidden/ (see below)
- [x] L7 checks (below)
- [x] L9 handoff docs/fable/handoff/v-hidden.md
- [x] L10 push + PR

## What was built
- Every id builds as a part (a classic parent places the kit parts it asks for) and the two wholes compose the same parts (`compose()` in common.js), the pool with the lanterns-family toro, so a kit parent registers one footprint and no child registers twice.
- pool-apron / glade-floor: 256 px paintings from the layout's own marks (moss clumps, pebbles, a wet band at the water, a worn south trail; pointed fallen blades, moss and a worn clearing). One shared texture per layout.
- pool-water: depth in vertex colour (dark centre, turquoise over the stones); caustics are the Voronoi cell edges of the layout's ring centres (four sites per ring), drifting and slowly turning; emissive and caustic follow the hour from `env`.
- pool-moon: the sprite plus (hero) 18 glints that pulse on their own timers along the path to the seat.
- pool-rim / pool-seat / glade-seat: chiselled stones from the rocks family helpers and its materials (zero new materials); the seat is a dished slab with the classic 9 cm top; the boulder is fitted to the collider's half extents.
- lily-pads: notched polar disc, curled rim, vein stripes in vertex colour. lotus: three rows of petals pink at the tip, a seed head, a stem, and (hero) a standing leaf.
- pool-motes / glade-fireflies: one Points each, per-point fade in the vertex colour (motes fade in and out along their rise; fireflies pulse each on its own phase), hidden when the strength is zero.
- glade-bamboo: the greenery family's noded culm on the classic ring and lean, slim drooping blades in place of cones.
- glade-lanterns: a chochin-shaped paper body; ONE merged paper mesh lights all lanterns of a set from a vertex attribute (own onset and flicker each), one frame mesh (caps, tassel, cord to the stalk), one billboard mesh for all halos (a Points size would be clamped near the camera; a Sprite is a draw each). 3 draws for 11 lanterns, classic is ~44.
- Footprint: no waiver, `layout.footprint` for every id.

## Checks (real output)
- kit_check: `All kit checks OK (131 passed)`; kit_index --check: in sync
- kit_contract_test --family hidden (with the BUDGET_EXCEPTIONS of handoff §1 applied locally, 3 runs): `15 assets, 45 asset×tier builds, 1232 checks, 0 failed`, merge OK, self-test all PASS. WITHOUT the exceptions it fails 14 rows, all meshes / materials / far-triangle rows of moon-pool, lantern-glade (and glade-lanterns far materials): the PR needs the Integrator to apply handoff §1.
- footprint_golden classic: `EQUAL`; `--systems` classic: `EQUAL` (hidden 7810 draws unchanged, textures 42)
- footprint_golden `--systems --query "?assets=modular"`: DIFFERENT only by replaced objects and the classic handles (poolWaterMat, causticMat, moonMat, poolToroMat, poolMoteMat, gladeFlyMat, lanterns[] become null); colliders 135, water rects 5, exclusions 4, anchors 5 and the rng counts are unchanged.
- check_syntax: `All 86 modules OK`; verify: `All checks passed`; labs_check: `All labs checks OK`; `git diff --check fable/integration...HEAD` clean.
- Lab loads: `node tools/headless.mjs "/labs/moonpool/?shot=1" --fail-on-error` ok:true, no errors.

## Perf (game_shot render info at the pool and glade cams, hour 22, all 15 ids swapped, Metal, 1 boot)
| spot | classic high | modular high | modular medium |
|---|---|---|---|
| pool | 118 calls / 1.186M tris | 92 / 1.194M | 91 / 1.135M |
| glade | 125 calls / 1.487M | 108 / 1.502M | 107 / 1.385M |
Draw calls fall by 26 and 17 (pad and lotus meshes merge into one, the glade's 44 lantern draws become 3, the rim, seat and boulder merge by material); triangles +0.7% and +1.0%. Modular medium <= classic high for both. (perf_spots has no pool/glade spot; these are the real game scene at the two landmark cameras.) The kit parents each add 1 merged material (`leafMaterial`); see handoff §2.

## Judgement (L6, looked at the JPGs)
- Light by hour: the 6/12/18/22 pairs for both wholes at 2-3 m and at cat height 0.35 m, plus one pair per child id at its most telling hour (night for lights, noon for the rest). No pair is byte-identical (`cmp`), all <= 150 KB, 960x600.
- AAA-1 moon-pool: yes by day (dappled caustics instead of ring outlines, pads with curled rims, lotus on stems with a standing leaf, mossy chiselled stones); at night the pool reads about as before with a quiet glint path (subtle at 960 px, honest).
- AAA-1 lantern-glade: clearly yes at dusk and night (paper lanterns with ribs and a warm bloom instead of flat orange discs), by day slim blades and a mossy boulder instead of fat cones and a dodecahedron.
- AAA-1 weak: pool-motes, glade-fireflies, pool-moon (animated points; stills cannot show the per-point fade). AAA-1 pool-apron: the apron is mostly under grass in the shots.
- AAA-5: legible at 0.35 m and at 2-3 m at every hour; the pool rim is a little darker at pre-dawn than classic's pale stones (the rocks family's default colours).
- Known deviation: `env` has no mist, so mist alone no longer quiets the pool (rain does).

## Concerns
- Size: about 1.4k source lines (src/kit/hidden 5 files) plus the lab tiles; within the ~1500 guide.
- 14 contract rows fail until handoff §1 is applied (budget exceptions for the two wholes).

## Fix round 1
- Merged origin/fable/integration (kit index regenerated, 10 families). Committed budgets.js exceptions; added `env.mist` (main.js assetEnv, runtime.js initial env); `calmAt` uses max(wet, mist).
- Pool toro now built from the lanterns family's `pool-toro` asset def (defaultParams); classic does not rotate it by `angle` (only positions it), so no ry.
- Lotus standing leaf: lowered (12-18 cm), cupped, tilted, lighter; moon-pool-12/22-cat-modular re-shot and Read.
- Checks: kit_contract_test --family hidden 1232 checks 0 failed (committed tree); footprint_golden classic EQUAL; --systems EQUAL; kit_check 153 OK; check_syntax 91 OK; classic boot: errors [] warnings [].
- Known: lantern sway dropped; rim colours are the rocks default.
