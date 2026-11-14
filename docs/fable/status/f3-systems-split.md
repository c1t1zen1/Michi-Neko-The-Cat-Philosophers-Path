# f3-systems-split

- Worker / model:     Claude Opus 5.5 (claude-opus-5-5)
- Claimed:            2026-11-13 04:06 PST
- Branch:             fable/f3-systems-split
- Base commit:        5dc924a at claim; rebased onto 4bac869 (f1-runtime merged), then 619aab7 (p0-browser merged)
- State:              ready for review

Lane: guide §8 "Lane f3-systems-split" (F3.1–F3.4). Layout / mesh split and
`placeAsset` routing for the 21 builders in `src/vegetation.js`,
`src/interior.js`, `src/hidden_places.js`, `src/ambient_life.js`,
`src/particles.js`; the footprint golden extended to the interior, the hidden
places, vegetation, ambient life and particles, with a modular-path seam check.

## Assets
| Inventory id | Promoted from (lab/specimen) | Parts | Tiers | Footprint | State |
|---|---|---|---|---|---|
| (none: Phase 1 split lane, no kit assets) | | | | | |

## Builders → inventory ids (F3.1)

Each routed builder runs `layoutX()` (every seeded / random draw in the
original order, recorded as plain data) and hands `meshXClassic(layout)` to
the module's `placeAsset(id, layout, classicFn, parent)`. 18 of the 21
builders route; 50 inventory ids are reachable (the seam check counts them).

| Module | Builder | Routed as | Granularity | Why / notes |
|---|---|---|---|---|
| hidden_places | buildMoonPool | `moon-pool` | whole | inside: `pool-apron`, `pool-water` (water + caustic layer), `pool-moon`, `pool-rim`, `lily-pads` (per pad ×9), `lotus` (per bloom ×3), `pool-seat`, `pool-toro` (toro + halo), `pool-motes` |
| hidden_places | buildLanternGlade | `lantern-glade` | whole | inside: `glade-floor`, `glade-bamboo` (stalks, leaves, stalk colliders), `glade-lanterns` (per lantern ×11), `glade-seat` (seat, boulder, its collider), `glade-fireflies` |
| interior | buildInterior | `tea-interior` | whole | inside: `tatami`, `interior-frame` (border, walls, ceiling, beams, posts), `tokonoma` → `scroll`, `bonsai` (pot + tree) placed into the alcove, `chabudai` → `teaware`, `interior-fish` (platter + fish) placed into the table, `zabuton`, `andon`, `courtyard-gravel`, `courtyard-toro`, `courtyard-wall`, `shoji-doors`. Not routed: the two room lights and the engawa veranda board (no inventory row; part of `tea-interior`'s own body) |
| interior | buildKnockables | `knockables` | whole (parts `cup`, `bowl`, `ball`) | knockable physics in the layout (F3.2) |
| vegetation | sakuraTree / mapleTree / pineTree → canopyTree | `sakura` / `maples` / `pines`; rim trees `rim-trees` | per tree (25) | `tree-trunks`: each trunk is part of its tree's classic mesh step (baked into the per-material merge), not a separate seam |
| vegetation | buildMaplesAndPines | — | placement list | its trees route per tree |
| vegetation | buildDappledLight | `dappled-light` | whole | texture blobs (only when first painted) + 14 pools |
| vegetation | buildBambooGrove | `bamboo-groves` | per grove (2) | per-culm colliders in the footprint |
| vegetation | buildMeadow | `meadow-system` | whole | grass.js itself is not split (F3.4) |
| vegetation | buildSakuraGrove | — | not routed | retired no-op (`old-sakura-grove`, inactive) |
| vegetation | buildPetalDrifts | — | not routed | retired no-op (`old-petal-drifts`, inactive) |
| ambient_life | buildBirds | `sparrows` | per bird (14) | parts `wing_l`, `wing_r` |
| ambient_life | buildGuardianBirds | `guardian-crows` | per crow (3) | parts `wing_l`, `wing_r` |
| ambient_life | buildButterflies | `butterflies` | whole | |
| ambient_life | buildKoi | `koi` | per fish (18) | parts `tail`, `pectoral_l`, `pectoral_r` |
| particles | buildGodRays | `god-rays` | per card (12) | records registered from the footprint (`godRays`) |
| particles | buildRain | `rain` | whole | binds part `lines` |
| particles | buildRiverPetals, buildPetals, buildFireflies, buildMotes, buildSnow | `river-petals`, `falling-petals`, `fireflies`, `dust-motes`, `snow` | whole | each binds part `points` |

Seams that needed care (no draw was reordered):
- Canvas textures painted with seeded draws (apron, caustics, leaf litter, dapple blobs): the draws move into the layout as recorded marks and the painting replays them.
- `buildCanopy()` draws from the stream while foliage.js grows the geometry, so it runs in the tree's layout step and its geometry rides along as `layout.canopy` (classic data; the stream advances the same on both sets).
- The glade's shared `Euler` switches from XYZ to YXZ after the first leaf: kept exactly, so the first stalk still uses XYZ.
- Bamboo culms stay doubles in the layout (the static lower culm matrix is built from them); the leaf numbers go straight into the shader's Float32 arrays, as before.

## Steps
- [x] F0 Claim (status file, pushed)
- [x] F3.3a Systems golden from the UNCHANGED code (`tools/golden/systems_classic.json`), committed before any split
- [x] F3.1 hidden_places.js: buildMoonPool, buildLanternGlade
- [x] F3.1 / F3.2 interior.js: buildInterior, buildKnockables (anchors and knockable physics in the layout)
- [x] Rebase onto f1-runtime (4bac869): runtime imports, R18 anchors on owner fields, golden hook after `assets.preload()`
- [x] F3.1 vegetation.js: trees, dappled light, bamboo, meadow (two retired no-ops left as they are)
- [x] F3.1 ambient_life.js: sparrows, crows, butterflies, koi
- [x] F3.1 particles.js: seven systems
- [x] Seam check for the modular path (found and fixed two bugs)
- [x] Rebase onto p0-browser (619aab7); the untracked headless.mjs removed first
- [x] F3.4 sky.js / postfx.js / grass.js untouched (and countryside.js, main.js)
- [x] Checks, review sheets, headless boots, handoff, report, PR

## Checks run (command → real result)

### Systems golden (F3.3), generated from the unchanged code @ dbd2626
- `node tools/footprint_golden.mjs --systems --out …/sysN.json` ×3 (Metal) + `--gpu swiftshader` → the four digests share
  SHA-256 `9f4019c71bc072abbf25bd122aac8c86c17a83de63f407ab6ed72f0b7f3ae53e`; `volatile 0 leaves` (two same-seed builds per run agree)
- `node tools/footprint_golden.mjs --systems --write` → `WROTE`, 283,433 bytes; then `--systems` → `EQUAL … byte-identical`, `--systems --gpu swiftshader` → `EQUAL`
- counts: 156 objects · 376 members under 48 anchors · 10 baked · 135 colliders (8 interior + 127 vegetation) · 1 platform · 42 textures · 25 trees;
  rng: vegetation 249,867 draws (probe ok) · hidden 7,810 · Math.random particles 15,534, ambient 648
- `node tools/footprint_golden.mjs` (valley) → `EQUAL`, byte-identical (the hook does not touch the valley run)
- Perturbation (temporary edits, reverted): apron speckle width `rand() * 4` → `* 4.001` and god-ray phase `6.28` → `6.2801` →
  `DIFFERENT (13 changed, 1 added, 1 removed)`, exit 1: `particles.godRays[0..11]` exact hashes, the apron texture id, the apron member
- The first Metal vs SwiftShader run differed only in textures.js plaster pixels (a `getImageData` read-back of rasterized cracks);
  ImageData arguments are now hashed by size only (documented in the module header)

### After every split commit (each: valley + systems)
- hidden_places → valley `EQUAL` byte-identical, systems `EQUAL` byte-identical
- interior → valley `EQUAL`, systems `EQUAL` byte-identical (incl. the probed eatFish / cozyNap targets, exit zone, enter / exit spawns, simulated knock-off)
- after the f1-runtime rebase + runtime imports → valley `EQUAL`, systems `EQUAL`, `--systems --query "?assets=modular"` `EQUAL`
- vegetation, ambient_life, particles → valley `EQUAL`, systems `EQUAL` byte-identical, `?assets=modular` `EQUAL`
- seam check → `seam ok · 50 ids routed · wholes 87 instances (registries 12/12) · parts 132 instances (registries 12/12)`
- after the p0-browser rebase (619aab7) → valley `EQUAL`, systems `EQUAL` byte-identical, seam ok

### Static and unit checks (final, ae008a7 on 619aab7)
- `node tools/check_syntax.mjs` → `All 44 modules OK`
- `node tools/verify.mjs` → exit 0, `All checks passed`
- `node tools/interiors_test.mjs` → `28 interiors checks passed.`
- `node tools/labs_check.mjs` → `All labs checks OK`
- `node tools/kit_check.mjs` → `All kit checks OK (27 passed)`; `node --test tools/kit_test.mjs` → 36 pass, 0 fail
- `node tools/cad_overrides_test.mjs` → `27 passed, 0 failed`
- `node tools/labs_coverage.mjs` → `OK 37 source modules, 112 construction methods, 190 inventory rows, 120 evidence targets`;
  `node --test tools/labs_coverage_test.mjs` → 11 pass, 0 fail (report regenerated after each batch; no inventory anchor needed editing)
- `node tools/summit_test.mjs` → `70 passed, 0 failed`; `node tools/rooftop_test.mjs` → `38 passed, 0 failed`
- `git diff --check origin/fable/integration...HEAD` → clean

### Browser
- `node tools/capture_baseline.mjs --masters …/captures --previews none --no-repeat --compare …/_baseline --only hidden,tree,grass` →
  hidden 3/3 and tree 14/14 `0 / 0 / 0` (byte-identical, the Phase 0 masters' SHA-256); grass sheet-a `197 / 0.0686 / 1429`,
  sheet-b `207 / 0.1331 / 2432` (within the grass noise floor `207 / 0.1496 / 2662`; unseeded cats, the goldens cover grass)
- Full-game boot `node tools/headless.mjs /__boot.html …` (Metal) → plays; quality high, set classic, 14 birds, 18 koi, 11 glade lanterns,
  3 knockables, the fish, 12 god rays; the only console line is the optional `cad-overrides.json` 404 (as in Phase 0)
- `/index.html?assets=modular` boot → plays; set modular, families loaded, 0 instances, no kit problems; the same single 404 line
- `node tools/game_shot.mjs --query "?shot=1&nohud=1&hour=17&cam=-24,3,-18,-20,0.5,-27&assets=classic|modular"` (the Moon Pool) →
  classic vs modular `maxDelta 0`; two classic boots `maxDelta 0`
- `node catalog/tests/adapters-browser.mjs` (temporary local server) → `195/195 runtime asset cases passed; 0 browser errors`
  (the catalog builds these classes through bare `Object.create` kits)

## Deferred assets and why
None (no kit assets in Phase 1).

## Footprint waivers requested
None.

## Notes for the Integrator
See `docs/fable/handoff/f3-systems-split.md`: the cache-tag files, a context_actions.js patch for the interior anchors,
a pre-existing knick-knack placement bug (100 m above the table), and notes for the kit lanes.

Integrator, gate G-F: the interior-anchor patch (handoff section 2) is applied to `src/context_actions.js` (no value changes; goldens EQUAL). The knick-knack height bug (handoff section 3) is DEFERRED to lane v-interiors: fixing it changes the classic picture, so it needs its own `--systems --write` with a reason.
