# Gate G-V1 chores — report (Integrator delegate)

Status: **DONE_WITH_CONCERNS** (every item-7 check green, budgets hold, G-V1 ticked; one per-asset overrun on a real layout needs an Integrator ruling, and the kit is at its 11-material cap).
Model: Claude Opus 5.5. Worktree `michi-wt/integration`, branch `fable/integration`, base `15a5271`, final `6e23ffa` (pushed, no force).
Scratch (outside the repo): `/Users/c1t1zen/Documents/GitHub/michi-wt/_scratch/gate-v1-chores/` (instrumented game copy, census and hash pages, L6 PNGs, perf JSON, every check's raw output under `gate/`).

## Commits (one per item)

| SHA | Item |
|---|---|
| `489b923` | 1 helper moves (craft.js / materials.js) |
| `0b3cdae` | 2 material reconciliation (R39): 15 → 11 merged, `KIT_SHARED` |
| — | 3 nothing to apply: the only requested exception (v-greenery `bamboo-groves`, R40) was already applied verbatim at the greenery merge (`2bd963d`); re-checked equal to the handoff text |
| `b04bb32` | 3b contract counts every instance of an instanced draw + self-tests |
| `a964169` | 5 whitespace damage (no tag bump, R44) |
| `5575aee` | 7 glue: stale catalog test expectation (was red at the base) |
| `2379b3c` | 4 `docs/fable/baseline/perf_gv1.md` (new) |
| `6e23ffa` | 6 guide §3.3 / §4.6 / §9 recipe, G-V1 ticked |

## 1. Helper moves (`489b923`)

From `_production_adapters.md` "Pending helper moves":
- `lanterns/light.js` `nightnessAt`, `washiTexture`, `haloTexture`, `litWashi` (+ the texture cache) → `src/kit/materials.js`; `light.js` re-exports them. Sibling lanes import them from `../lanterns/light.js` (v-hidden `common.js`/`glade.js`, v-interiors-a `common.js`, v-shrine `altar.js`: grep of their worktrees), so the re-export is required, not cosmetic.
- `fences/culm.js` `culmGeometry`, `knotGeometry` → `src/kit/craft.js`; `culm.js` re-exports (FINISHES, `bake` stay).
- pagoda `CBag` → `src/kit/craft.js` as an exported class. `Bag` internals NOT replaced: Bag's index type and missing-normal handling differ, so swapping them would change every Bag family's geometry.

Proof: contract-test AAA-8 hashes for all 84 asset × tier builds before vs after → `84/84` identical (`hashes_before.json` vs `hashes_item1.json`, `cmp` equal); modular footprint digest identical (whole JSON); classic and systems goldens EQUAL; kit_check 119 OK; contract 2500/0.

## 2. Material reconciliation, ruling R39 (`0b3cdae`)

Census method: `KitMaterials._once` instrumented in a scratch copy (stack trace → calling family), headless full boot `?assets=modular` on high and medium, then every scene object on a kit material counted (baked / instanced / plain, casters, triangles); per-spot draws with the camera and the sun's shadow frustum at perf_spots' four spots.

| | before | after |
|---|---:|---:|
| kit materials created (high = medium) | 21 | 16 |
| on static meshes (merged or single static) | 15 | **11** (cap 11) |
| only on pickups / live / instanced | 6 | 5 |
| kit-material draws high, main + shadow: street / shrine / river / meadow | 53 / 39 / 38 / 51 | 50 / 37 / 36 / 48 |

Dedupes: pagoda `bag(0.78,0.05)` → nest's `bag(0.9,0.1)`; shishi stake/feed bamboo → fences' straw bamboo with green in vertex colour (merges into the fence bake: baked groups 61 → 60); corral-sign post bamboo → same (exact in linear space); corral-sign board kit wood → the classic sign's own `MAT.timberLight`; grove lower culms bamboo → straw bamboo with green in instance colour (R38 assumed greenery already shared fences' material; it did not — fences default to straw, greenery used the `fresh` colour). New API in `src/kit/materials.js`: `KIT_SHARED` (10 named merged materials: bamboo, matte, crate, cord, darkWood, stone, basinStone, rock, rockDark, moss; the 11th is the sign's painted face), `KitMaterials.shared(name)`, `tintToward(hex, base)`, `tintGeometry(geo, rgb)`.

No visible change, checked three ways:
- Geometry-only hash (scratch `geohash.html`, all 84 builds with the game MAT bound): unchanged for alley, keepsakes, lanterns, nest, rocks, bamboo-fence, corral, wind-chime, bushes, moss; pagoda geometry unchanged (material only); changed only corral-sign, shishi, bamboo-groves (colour attributes).
- Modular footprint digest: only those 11 objects and one fewer baked group differ; colliders 518, platforms 65, exclusions 4, anchors 25, water rects 5 unchanged.
- L6 re-shoots (classic / modular before / modular after, hours 12 and 18, 960×600) in `docs/fable/baseline/gv1-materials/` (24 JPGs). Before→after `--diff`: shishi max Δ 1 / 8, 0 px > 8; bamboo-groves 7 / 7, 0 px > 8; pagoda 20 (3,170 px > 8, 10 m from the tower) / 16 (33 px); corral-sign 33 / 64 (3,947 / 5,859 px > 8) — all on the board's 7 cm rim (wood grain of timberLight vs the kit wood; base colours within 1 %); the post region alone max Δ 4. Read the crops: indistinguishable at play distance; the board rim is the one honest, small difference and now matches the classic board material.

Recorded in `budgets.md` section 4 (census, dedupes with diff numbers, the 11 materials with triangles, per-spot draws, the rule for wave 2.2 on).

## 3b. Contract test triangle count (`b04bb32`)

Real gap: `craft.js countScene` already multiplied `InstancedMesh` by `count`, but counted a plain Mesh on an `InstancedBufferGeometry` once (the grove's upper culms and leaves). Now `instancesOf(o)` = InstancedMesh.count, or `instanceCount` capped by the shortest instanced attribute (three's own rule). Shadow pass unchanged. Self-test: two new knobs (2,500 × 12-triangle box as InstancedMesh and as InstancedBufferGeometry) must fail `triangles ≤`; mutation run with the old count → `FAIL overBudgetInstancedGeometry → nothing failed`, self-test FAIL (so the test bites). `fixtureBuilds` now resets per self-test case (the extra cases made the `nondeterministic` knob's cap drift far enough to also trip bearing — an order dependence, not a weakening). All families re-run: 2500 checks, 0 failed. Only change in counts: bamboo-groves 17,074 / 638 / 474 → **89,856 / 12,480 / 4,680**, inside R40 (92,000 / 13,000 / 5,000). No family newly exceeds a cap.

## 4. Budgets on modular (`2379b3c`, `docs/fable/baseline/perf_gv1.md`)

`node tools/perf_spots.mjs --url-suffix "" --url-suffix "?assets=modular" --out perf_gv1.json` — 19.2 min, 18 boots interleaved, code `a964169`, load 2.79–5.83 (other lanes running). The pagoda (wave 2.2, merged) is inside every modular row; said so in the file.

| Spot | medium modular vs classic high (calls / tris / ms) | high modular ÷ classic high (calls / tris / ms) |
|---|---|---|
| street | 555 ≤ 765 / 6.08 ≤ 8.12 M / 9.85 ≤ 11.00 | 0.911 / 1.073 / 1.041 |
| shrine | 305 ≤ 449 / 5.13 ≤ 7.06 M / 7.73 ≤ 10.10 | 0.971 / 1.068 / 0.960 |
| river | 399 ≤ 653 / 5.17 ≤ 6.93 M / 8.50 ≤ 10.50 | 0.914 / 1.072 / 0.990 |
| meadow | 518 ≤ 731 / 5.71 ≤ 7.53 M / 9.15 ≤ 10.40 | 0.902 / 1.073 / 0.962 |

All hold (rules ≤ 1.2 / 1.3 / 1.2); `BREACHES: []`, so no family needed swapping out. Draw calls fall at every spot on every tier (−3 to −72). World build, same session: medium ready 1.23 × / build 1.19 × (≤ 1.25 — the tightest margin), high 1.08 × / 1.07 ×. Low: the setting path (`{"quality":"low","assetSet":"modular"}`) → `{"set":"classic","loaded":false,"instances":0,"kitScripts":[]}`; the low rows with `?assets=modular` are a forced developer override, reported as info. High-tier frame p90 is higher on modular at street/river/meadow (13.8 / 12.8 / 14.0 vs 12.3 / 11.7 / 11.7 ms) on a loaded machine; amortised values are within 4 %; flagged for an idle re-measure.

## 5. Whitespace (`a964169`)

`git diff --check 414225f..HEAD` flagged blank lines at EOF in `labs/keepsakes/js/shapes.js`, `src/kit/keepsakes/shapes.js` and a trailing space in `docs/fable/status/v-lanterns.md:58`; trimmed. After: `git diff --check 414225f..HEAD` → exit 0. No cache-tag bump (R44).

## 6. Guide (`6e23ffa`)

§3.3 rule 6 (merge-able statics, R36), rule 7 (instances counted), new rule 8 (KIT_SHARED, cap reached, how to reuse, what a new material needs); §4.6 cache tag only at main-merging gates (R44); §9 recipe L5 (merge-able statics, material reuse, contract sample = largest real layout + exception request), L6 (one framed pair per id, not byte-identical, read them), L7 (perf_spots modular high AND medium vs classic high). Board: the eight wave-2.1 lanes were already `[x]`; **G-V1 ticked** with a pointer to perf_gv1.md.

## 7. Gate checks (real output; code `a964169`/`5575aee`, docs-only after)

G1
- `node tools/check_syntax.mjs` → `All 86 modules OK`
- `node tools/verify.mjs` → summit `83 passed, 0 failed`, kit `All kit checks OK (122 passed)`, `All checks passed` (exit 0)
- `node tools/kit_check.mjs` → `All kit checks OK (122 passed)`; `node tools/kit_index.mjs --check` → `in sync (9 families, tag 20261113a)`
- `node --test tools/kit_test.mjs` → `tests 36, pass 36, fail 0`; `node tools/cad_overrides_test.mjs` → `27 passed, 0 failed`
- `node tools/labs_check.mjs` → `All labs checks OK`
- `git diff --check 15a5271..HEAD` → exit 0 (all my commits); `git diff --check 414225f..HEAD` → exit 0

G2
- `node tools/footprint_golden.mjs` → `footprint golden: EQUAL`; `--systems` → `EQUAL`
- `--query "?assets=modular"` → `DIFFERENT (49 changed, 280 added, 90 removed)`, sections: anchors 1 (the recorded v-garden `shishiRocker` waiver, 0.18 m), objects / aggregates / baked / counts / volatile only; colliders 518, platforms 65, water rects 5, exclusions 4, anchors 25 — same counts as classic
- `node tools/kit_contract_test.mjs` → `28 assets, 84 asset×tier builds, 2500 checks, 0 failed`, `merge: OK`, `self-test: OK` (14 cases), `PASS: kit contract`; `--broken-family` → exit 1 (as it must)
- labs_geometry_test via headless → `"32/32"`, exit 0 with `--fail-on-error`
- `node tools/rooftop_test.mjs` → `40 passed, 0 failed`
- `node tools/summit_test.mjs` → `83 passed, 0 failed`; `node tools/summit_golden.mjs` → `summit golden: EQUAL`, routing 32 ids, single swaps 32/32 ok
- `node tools/cat_golden.mjs` → `checks 40 passed, 0 failed`

G3
- `node tools/catalog_check.mjs` → `OK Asset Library: 17 modules, 190 records, 126 evidence targets …`
- `node tools/labs_coverage.mjs` → `OK … direct=94, review=41, embedded=25, related=18, missing=8`; `node --test tools/labs_coverage_test.mjs` → `tests 11, pass 11`
- `node --test catalog/tests/*.test.mjs` → **was `37 tests, 36 pass, 1 fail` at the base** (`model.test.mjs:14` expected jade-paw `'related'`; v-keepsakes `cb8ff3f` gave it a direct study, and `396d219` updated only `labs_coverage_test.mjs` for that state change). Fixed as glue in `5575aee` (expectation follows the inventory, plus a new assertion that the related entry stays) → `tests 37, pass 37, fail 0`. Reviewer: please confirm this is a state change, not a loosening.
- `node tools/interiors_test.mjs` → `28 interiors checks passed`; `node tools/ranges_test.mjs` → `19 ranges checks passed`; `node tools/fable_swap_matrix.mjs` → `OK swap matrix: 186 rows = 186 active inventory rows …`

Boots (headless, Metal, `--session catwalk_autostart=new`, settle 5 s)
- `/index.html?assets=classic` → `{"quality":"high","set":"classic","loaded":false,"instances":0}`; errors: only the known `404 (/cad-overrides.json)`; warnings: none
- `/index.html?assets=modular` → `{"set":"modular","loaded":true,"assets":28,"instances":69,"problems":0}`; errors: only the known cad-overrides 404; warnings: none

## Concerns / for the Integrator

1. **bamboo-fence real layouts over the mid cap (needs a ruling).** The contract samples a 3.4 m run; the valley's longest runs (~11 m) measure hero 22,638 / **mid 12,660** / far 568 against 25,000 / 6,000 / 1,000 (scratch `fence_count.html`, real lengths 7.3–11.0 m). Mid is what every valley fence builds at on quality medium. Scene budgets hold with it. Options: `BUDGET_EXCEPTIONS['bamboo-fence']` mid ≈ 13,000 (like R40) or fewer mid rings (a1-village, as the v-fences review deferred); either way the sample should become the longest run (new §9 L5 rule). I did not add an exception (none was requested in a handoff). Recorded in perf_gv1.md and budgets.md §4.
2. **Kit materials at the cap: 11 of 11** after wave 2.1 + pagoda. v-shrine's handoff reports one new material (black lacquer); machiya/interiors/hidden will want more. Ruling R26's "one per family without asking" in `briefs/_village.md` is now superseded in practice (budgets.md §4, guide §3.3 rule 8); please update `_village.md` and the running wave-2.2 lanes' instructions (I do not edit briefs). Recommendation recorded: judge by measured draws per spot (the cap is a worst-case proxy) rather than raising the cap by fiat.
3. The corral-sign board now uses classic `MAT.timberLight` (merges with classic timber), so it no longer gets kit wetness/snow. Small; visible only on its rim.
4. Medium world-ready is 1.23 × classic in the same session (rule ≤ 1.25) and above the absolute 1,573 ms of budgets.md on this loaded machine — the tightest margin as wave 2.2 adds families. Frame p90 on high was higher on modular at three spots; re-measure on an idle machine.
5. Pool tōrō (lanterns in `hidden_places.js`) puts 5 unmerged meshes on the kit `stone` material — HiddenPlaces has no merge pass. Not a budget problem today (5 draws); worth a merge pass when v-hidden lands.

Files changed (all on `fable/integration`): `src/kit/craft.js`, `src/kit/materials.js`, `src/kit/budgets.js` (comment), `src/kit/lanterns/light.js`, `src/kit/fences/culm.js`, `src/kit/fences/sign.js`, `src/kit/garden/build.js`, `src/kit/greenery/bamboo.js`, `src/kit/nest/build.js`, `src/kit/pagoda/build.js`, `src/kit/pagoda/index.js`, `src/kit/keepsakes/shapes.js`, `labs/keepsakes/js/shapes.js`, `tools/kit_contract_test.js`, `catalog/tests/model.test.mjs`, `docs/fable/baseline/budgets.md`, `docs/fable/baseline/perf_gv1.md` (new), `docs/fable/baseline/gv1-materials/*.jpg` (24, new), `docs/fable/handoff/_production_adapters.md`, `docs/fable/status/v-lanterns.md`, `BUILD_GUIDE_FABLE.md`. No `?v=` tag changed; nothing under `dawCAT/`/`cadJS/`; no sibling worktree touched.
