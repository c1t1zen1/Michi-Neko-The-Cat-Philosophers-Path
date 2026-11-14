# v-pagoda status
Model: Claude Sonnet 5.5. Base: fable/integration 39aa5c1. Family: src/kit/pagoda, lab 08 (labs/pagoda).

- [x] L1 status file
- [x] L2-L3 family `pagoda`: asset `distant-pagoda` (hero/mid/far, params preset/height_scale/storeys/roof/paint/age); `buildTower(ctx, layout, p)` and `buildPagoda(opts, {detail, material})` exported for s3-vista and r4-festival (any of the 9 measured presets, e.g. `yasaka`)
- [x] L4 gap specimens: none required
- [x] L5 `node tools/kit_index.mjs` (src/kit/index.js regenerated, 5 families)
- [x] L6 compare JPGs: docs/fable/status/v-pagoda/ (valley 6/12/18/22, close 6/12/18/22, path 12/18; classic vs modular, all differ under cmp)
- [x] L7 checks (below)
- [x] L9 handoff docs/fable/handoff/v-pagoda.md
- [x] L10 push + PR

## Checks
- kit_check: All kit checks OK (83 passed)
- kit_contract_test --family pagoda: 1 asset, 3 asset x tier builds, 171 checks, 0 failed; merge OK (valley 237 calls, +48 kit meshes -> 285, after _mergeInto 240)
- footprint_golden classic: EQUAL
- footprint_golden `?assets=classic&swap=distant-pagoda:modular`: DIFFERENT only by the replaced pagoda meshes (12 added, 1 aggregate removed); 518 colliders, 65 platforms, 25 anchors and rng (valley 49233) unchanged
- check_syntax: All 78 modules OK; verify.mjs: All checks passed; labs_check: All OK; kit_index --check: in sync; git diff --check fable/integration...HEAD: clean

## Judgement
- Construction: one vertex-colour material (`km.bag`) for everything (R26: 1 new merged material, 0 shaders, 0 InstancedMesh, 0 live meshes), so the whole tower merges into the valley statics. Hero = 7 meshes (podium, 5 storeys, sorin), mid = 7, far = 3 (podium, tower, sorin). Kumimono clusters (storey 1), futanoki rafters (storey 1), koran rails, fūtaku bells (storey 1) are hero-only and baked as plain geometry. Build is deterministic (no randomness at all).
- The valley instance is at band `rim`, so high quality builds MID and medium/low builds FAR; hero is for s3-vista / r4-festival.
- AAA-1: the modular tower is a clear step up: lofted hipped roofs with measured corner lift (sori), a real kidan, five distinct storeys, gold nine-ring sorin with suien sheets. The classic is a stack of boxes under flat cones.
- Silhouette honesty (AAA-5): height matches (19.4 m at the classic position/orientation, geometry is divided by layout.scale 1.232 so the world height is the preset H). But the lab's valley preset has deeper eaves than the classic: first-roof span ~8.5 m vs ~6.5 m, so the modular tower reads broader and its roofs overlap more. Colour: roofs are the game's dark tile, walls vermilion/maroon; at 57 m in dusk fog it reads as a warmer, softer shape; at 22 h both are silhouettes and match well. From the three viewpoints it stays legible above the canopy, the sorin catches the light.
- Draw/triangle delta: boot render calls 346 (classic) -> 286 (swap) in the valley view; triangles 3.999M -> 4.004M. Not a perf_spots measurement.
- Impostor: NOT promoted (see handoff). The lab's 16-view impostor needs a WebGLRenderer to bake into a render target and a custom shader for camera-facing; ctx has no renderer, the frozen ctx cannot gain one in this lane, and a ShaderMaterial would escape _mergeStatics and the game's fog. The far tier is instead a mergeable low-poly silhouette (3 meshes, under 1000 triangles).
- Waivers: none (footprint = classic empty footprint; budgets all met).

## Fix round 1
- Merged origin/fable/integration (src/kit/index.js regenerated: 7 families). kit valley preset overhang 0.62 -> 0.42 (first roof ~6.5 m, like classic); other presets untouched; drift note in presets.js. Valley 6/12/18/22 modular re-shot and Read: tower now sits narrower under the canopy, matching the classic footprint.
- Minors: removed `|| true`, the duplicate colour ternary, `dims.W1 * 1`; PAINTS is used. Module-level CYL6/SPH/CONE are template geometries copied into the accumulators, never attached to a mesh, so dispose() frees all per-instance geometry.
- perf_spots street, classic vs swap (1 boot, 2 rounds): medium frame 7.25 ms (swap); draw calls mean 599 -> 569, triangles mean 6,080,648 -> 6,075,762; high frame 14.30 ms (swap), draw calls 770 -> 700, triangles 8,149,174 -> 8,053,906. (classic frame-ms rows scrolled out of my tail; call/triangle deltas are real.)
- kit_contract_test --family pagoda: 171 checks, 0 failed; footprint_golden classic EQUAL; swap: 518 colliders, 25 anchors, rng 49233 unchanged; verify: All checks passed; kit_check: 97 passed.
