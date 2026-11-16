# Report: f3-systems-split (Phase 1, F3.1–F3.4)

- Model: Claude Opus 5.5 · Branch `fable/f3-systems-split` · base 619aab7 (fable/integration after p0-browser) · head 188d6ec
- Status: DONE · PR https://github.com/c1t1zen1/Michi-Neko-The-Cat-Philosophers-Path/pull/7

## What was built

**F3.1 layout / mesh split, all five modules.** Every routed builder now runs
`layoutX()` (every seeded or random draw, in the original order, kept as plain
data) and hands `meshXClassic(layout)` to the module's
`placeAsset(id, layout, classicFn, parent)`. 18 of the 21 builders route; 50
inventory ids are reachable. The three that do not: `buildSakuraGrove` and
`buildPetalDrifts` are retired no-ops (inactive rows), and
`buildMaplesAndPines` is a placement list whose trees route one by one.

| Module | Routed ids (granularity) |
|---|---|
| hidden_places | `moon-pool` (whole) → `pool-apron`, `pool-water`, `pool-moon`, `pool-rim`, `lily-pads` ×9, `lotus` ×3, `pool-seat`, `pool-toro`, `pool-motes`; `lantern-glade` (whole) → `glade-floor`, `glade-bamboo`, `glade-lanterns` ×11, `glade-seat`, `glade-fireflies` |
| interior | `tea-interior` (whole) → `tatami`, `interior-frame`, `tokonoma` (→ `scroll`, `bonsai`), `chabudai` (→ `teaware`, `interior-fish`), `zabuton`, `andon`, `courtyard-gravel`, `courtyard-toro`, `courtyard-wall`, `shoji-doors`; `knockables` |
| vegetation | `sakura` / `maples` / `pines` per hero tree, `rim-trees` per rim tree (25), `bamboo-groves` ×2, `dappled-light`, `meadow-system` |
| ambient_life | `sparrows` ×14, `guardian-crows` ×3, `butterflies`, `koi` ×18 |
| particles | `god-rays` ×12, `rain`, `river-petals`, `falling-petals`, `fireflies`, `dust-motes`, `snow` |

Not routed, with reasons (status file): the interior's two room lights and the
engawa board (no inventory row), `tree-trunks` (part of each tree's classic
mesh step).

Footprints follow R12/R18: `layout.footprint` mirrors every registry the
classic builder pushes into (colliders, exclusions, water rects, platforms,
anchors, knockables, bird / crow / koi and god-ray records), and one
`registerFootprint()` per module is the path for both sets, in the classic
order. Anchors land on owner fields (`HiddenPlaces.poolRestPos`,
`gladeRestPos`; `InteriorManager.eatFishAnchor`, `napAnchor`, `enterAnchor`,
`exitZone`). Gameplay handles bind from kit parts (`fish`, `cup`/`bowl`/`ball`,
`wing_l`/`wing_r`, `tail`/`pectoral_l`/`pectoral_r`, `points`, `lines`).
The five modules import `CLASSIC_ASSETS`, `isAssetInstance`, `scopeAssets`
from `src/kit/runtime.js` (the local fallbacks were swapped out after the
f1-runtime merge); the interior scopes with its own `MAT`.

**F3.2.** The interior's colliders, table platform, gameplay anchors (eat-fish,
nap, enter spawn / heading / camera, exit zone) and the knockables' physics
(`KNOCK_PHYSICS`: kick, spin, reach, table zone, gravity, bounce, friction,
settle) live in the layout; `update()` and `transitionToInterior()` read them,
so a kit interior inherits them. context_actions.js (not this lane's file)
still hard-codes three of them; the handoff has the exact patch.

**F3.3.** `tools/golden/systems_digest.js` (new) + `tools/golden/systems_classic.json`
(new, generated from the unchanged code and committed before any split),
hooked into the page with one import and one call (`?systems=1`) and into the
CLI with `--systems`. It digests the five systems built in main.js order:
named objects and unnamed members with exact hashes of every geometry
attribute and world matrix, canvas textures by their 2D drawing commands,
the interior's merged statics, colliders and platforms, the gameplay anchors
probed through the real code (ContextActionManager targets and exit zone,
the enter / exit spawns, a simulated knock-off), tree placements, groves, the
baked biome mask and grass layers, particle seeds and creature spawn
records; Math.random is re-seeded per system so draw-order changes show. It
also runs a **seam check**: the modular path of every `placeAsset()` with a
stub kit runtime (every id modular; every part modular inside classic
wholes), asserting the streams, every registry and the anchors match classic
and each `update()` runs. The seam check found two real bugs, both fixed: a
kit `chabudai` / `tokonoma` swallowed its nested parts (the gameplay fish was
never built), and `updateGodRays()` assumed a classic card material.

**F3.4.** `sky.js`, `postfx.js`, `grass.js` (and `countryside.js`, `main.js`)
untouched.

## Checks (real output, trimmed)

| Command | Result |
|---|---|
| `node tools/footprint_golden.mjs` | `EQUAL`, byte-identical (after every commit) |
| `node tools/footprint_golden.mjs --systems` | `EQUAL`, byte-identical (after every commit); `seam ok · 50 ids routed · wholes 87 instances (registries 12/12) · parts 132 instances (registries 12/12)` |
| `… --systems --query "?assets=modular"` | `EQUAL` |
| systems golden determinism | 3 Metal runs + 1 SwiftShader run share SHA-256 `9f4019c7…53e`; `volatile 0 leaves` |
| perturbation (temporary, reverted) | `DIFFERENT (13 changed, 1 added, 1 removed)`, exit 1 |
| `node tools/check_syntax.mjs` | `All 44 modules OK` |
| `node tools/verify.mjs` | exit 0, `All checks passed` |
| `node tools/interiors_test.mjs` | `28 interiors checks passed.` |
| `node tools/labs_check.mjs` | `All labs checks OK` |
| `node tools/kit_check.mjs`; `node --test tools/kit_test.mjs` | `All kit checks OK (27 passed)`; 36 pass, 0 fail |
| `node tools/cad_overrides_test.mjs` | `27 passed, 0 failed` |
| `node tools/labs_coverage.mjs`; `node --test tools/labs_coverage_test.mjs` | `OK 37 source modules, 112 construction methods, 190 inventory rows, 120 evidence targets`; 11 pass, 0 fail |
| `node tools/summit_test.mjs`; `node tools/rooftop_test.mjs` | `70 passed, 0 failed`; `38 passed, 0 failed` |
| `git diff --check origin/fable/integration...HEAD` | clean |
| `capture_baseline.mjs --compare _baseline --only hidden,tree,grass` | hidden 3/3, tree 14/14 `0 / 0 / 0` (byte-identical, the masters' SHA-256); grass `197 / 0.0686 / 1429` and `207 / 0.1331 / 2432` (within the grass floor `207 / 0.1496 / 2662`) |
| `/__boot.html` headless (Metal) | plays; set classic; 14 birds, 18 koi, 11 lanterns, 3 knockables, fish, 12 rays; only the Phase 0 `cad-overrides.json` 404 |
| `/index.html?assets=modular` headless | plays; set modular, families loaded, 0 instances, no problems; same single 404 |
| `game_shot.mjs` Moon Pool, `assets=classic` vs `modular` | `maxDelta 0`; two classic boots `maxDelta 0` |
| `catalog/tests/adapters-browser.mjs` | `195/195 runtime asset cases passed; 0 browser errors` |

## Files changed

`src/hidden_places.js`, `src/interior.js`, `src/vegetation.js`,
`src/ambient_life.js` (BOM kept), `src/particles.js` (BOM kept);
`tools/golden/systems_digest.js` (new), `tools/golden/systems_classic.json`
(new), `tools/footprint_golden.js` (+1 import, +1 call), `tools/footprint_golden.mjs`
(`--systems`, the seam line and verdict); `labs/ASSET_COVERAGE.md`
(regenerated line links only); `docs/fable/status/f3-systems-split.md`,
`docs/fable/handoff/f3-systems-split.md`. `labs/asset_inventory.json` untouched.

## Assets promoted / deferred, waivers

None promoted (Phase 1). No deferrals, no footprint waivers.

## Self-review against the lane card

- F3.1 21 builders split and routed, draws never reordered: done (18 routed, 3 explained); goldens prove the streams, registries and geometry are byte-identical.
- hidden_places still built before Vegetation and attached after ContextActionManager: unchanged (main.js untouched); the systems golden's baked biome mask would show any change.
- F3.2 knockable physics and anchors in layout data: done; the golden probes them through the real code.
- F3.3 golden extended to interior and hidden places (plus vegetation, particles, ambient life): done, committed from unchanged code first.
- F3.4: untouched.

## Concerns

1. Pre-existing bug, preserved: the three knick-knacks render about 100 m above
   the tea-house table (origin added twice). Handoff §3 has the fix outline;
   it is an intended visible change for v-interiors or the Integrator to decide.
2. context_actions.js still hard-codes the interior's eat / nap / exit anchors
   (not this lane's file). Handoff §2 has the exact patch; no value changes.
3. In the modular set a kit tree's `instance.layout` keeps the classic canopy
   geometry alive (built in the layout step because its draws belong to the
   stream). Kit trees should dispose it (handoff §4).
4. Process: commits are per module, not strictly per builder (goldens EQUAL
   at every commit); the two coordinator-requested rebases were published
   with `--force-with-lease` to this lane's own branch only; one pushed
   commit message lost a word to shell backtick expansion.
5. Texture identity in the systems golden is by 2D drawing commands; textures
   that textures.js computes from a `getImageData` read-back are told apart by
   their calls and materials, not their pixels (GPU-independent by design).

## Review fix round 1

Commit bcc6962 (plain push, 188d6ec..bcc6962).

- **Important 1 (seam never ran Vegetation.update()):** the seam check now drives every
  `update()` under the game's own `Sky` (`new Sky(scene)`, dusk sun), which has
  `resolvePalette()` and the weather fields foliage and grass read, so the vegetation
  update (updateFoliage + grass) runs. Any update error now fails the seam, on the
  classic world too (before, an error shared by the classic and stub runs passed).
- **Ruling 3 (enterAnchor fallback):** `registerFootprint()` in interior.js and
  hidden_places.js fills every anchor a kit footprint leaves out from the layout's
  footprint. A new third stub run, `bare` (every id modular, kit footprints without
  anchors), reproduced the bug before the fix (`bare: interior differs from classic
  (anchors [...] → [null,null,null,null])`, `bare: hiddenAnchors differs`) and passes after.
- **Ruling 4 (kit trees keep the canopy alive):** `canopyTree()` disposes
  `layout.canopy.{branches,cards,tufts}` once when a kit tree comes back and sets
  `layout.canopy = null`; the seam asserts it (canopies freed 25/25 per run).
- Important 2 (context_actions anchors): not this lane's file; handoff §2 patch stands.

Checks (real output):

| Command | Result |
|---|---|
| `node tools/footprint_golden.mjs` | exit 0, `EQUAL` |
| `node tools/footprint_golden.mjs --systems` | exit 0, `EQUAL` byte-identical |
| `… --systems --query "?assets=modular"` | exit 0, `EQUAL` |
| seam (from the systems run) | ok · 50 ids routed · classic updates 5/5 (hidden, interior, vegetation, particles, ambient) |
| | wholes: 87 instances · registries 12/12 · updates 5/5 · canopies freed 25/25 |
| | parts: 132 instances · registries 12/12 · updates 5/5 · canopies freed 25/25 |
| | bare: 87 instances · registries 12/12 · updates 5/5 · canopies freed 25/25 |
| proof: `throw` added to `Vegetation.update()` (reverted) | exit 1, `SEAM FAILED`: `classic: vegetation.update() threw — deliberate classic update error` (+ wholes, parts, bare); `classic updates 4/5` |
| proof: canopy dispose removed (reverted) | exit 1, `SEAM FAILED`: `wholes / parts / bare: 25 of 25 kit trees still hold the classic canopy` |
| `node tools/interiors_test.mjs` | `28 interiors checks passed.` |
| `node tools/check_syntax.mjs` | `All 44 modules OK` |
| `node tools/verify.mjs` | exit 0 |
| `node tools/labs_coverage.mjs` (+ `--write`), `node --test tools/labs_coverage_test.mjs` | OK; 11 pass, 0 fail |
| `node tools/labs_check.mjs`; `node tools/kit_check.mjs` | `All labs checks OK`; `All kit checks OK (27 passed)` |
| `git diff --check` | clean |

Files: src/interior.js, src/hidden_places.js, src/vegetation.js, tools/golden/systems_digest.js,
tools/footprint_golden.mjs (seam lines per run), labs/ASSET_COVERAGE.md (line links),
docs/fable/handoff/f3-systems-split.md (tree and anchor notes).
