# v-ground report (Worker L, Claude Opus 5.5)

- Status: DONE_WITH_CONCERNS (concerns at the end)
- Branch `fable/v-ground`, worktree `/Users/c1t1zen/Documents/GitHub/michi-wt/v-ground`, base `5575aee`,
  merged with `origin/fable/integration` at `31661bb`.
- PR: https://github.com/c1t1zen1/Michi-Neko-The-Cat-Philosophers-Path/pull/40
- Status file: `docs/fable/status/v-ground.md` (all check output); handoff: `docs/fable/handoff/v-ground.md`.

## Commits
- `af5dc77` L1: claim the lane (status file; grant recorded: single writer of `src/kit/budgets.js`)
- `9e3491e` L5: ground kit family (valley-ground, path, path-shoulders, path-slabs)
- `bc4ec30` L5: cheaper ground shader in clear weather; nobedan POM and mossy joints
- `841020f` L5/L7: faster first build; valley-ground budget exception
- `10b5304` L6 fixes: tobi-ishi sides take arc-length UVs; milder cool shade
- `60b7f57` L6-L9: compare pairs, checks, self-review, handoff
- `31661bb` Merge fable/integration into fable/v-ground (budgets.js both sides kept; index.js regenerated)
- `880bd69` status: post-merge re-checks

## What was built (`src/kit/ground/`, 8 files, ~1,980 lines)
- `field.js`: the lab's GroundField (8 splat channels, Helbing wear G with standing G0, wetness, snow, paving style,
  puddle relief), plus the game's additions: a dynamic-wear box so regrowth and uploads touch only what paws changed,
  `wearGrassMask()` (thins the baked BiomeMask meadow by dynamic wear only; lawn texels never), snapshots for cached
  painted fields.
- `glsl.js`: the lab's PCG/noise, hex-tiling, anti-tiling sampler, six Kyoto pavings, rain rings (groove decoder not
  promoted); a height-only nobedan `pavingH`; per-stone value variation.
- `layers.js`: the lab's Canvas2D painter (seven 256 px tiles → two DataArrayTextures); the meadow floor is the
  classic `groundTextures(6)`; only the layers the valley uses are painted (earth, meadow, moss, gravel), the others
  are flat fills; shared per kit set.
- `material.js`: the one ground material (MeshStandardMaterial + onBeforeCompile): no vertex displacement (walk
  heights unchanged), normals perturbed around the mesh normal, classic vertex tint on the meadow, outside-field fade,
  tier defines (mid: no POM/puddles; far: 2-tap sampler), weather branches; `GroundWeather` (the lab's schedule from
  `env.wet/snow/mist`, starts at the current weather); `sunDirAt(hour)`.
- `valley.js`: `valley-ground`: the classic heights and tint via the valley's own code on a bare
  `Countryside.prototype`; the valley field (meadow, kawara pebbles + damp bank + moss at the river, moss beds under
  the shrine's pillows); `surfaceAt`, `bindWorld({ grass, player, npcs })` live wear.
- `road.js`: `path` (nobedan by default, 6 pavings by param) and `path-shoulders` (standing wear, kicked gravel, ruts)
  painted into the valley field when the ground is modular; standalone ribbons on the same material otherwise.
- `slabs.js`: `path-slabs`, tobi-ishi (12/6/4-sided, bedded 4 cm, arc-length side UVs) on KIT_SHARED stone,
  basinStone, rock.
- `index.js`: four `defineAsset` records with params, samples (the real valley layouts; the catalog's walkway).
- Outside the family: `src/kit/budgets.js` (`BUDGET_EXCEPTIONS['valley-ground']`, granted), `src/kit/index.js`
  (generated), status file + 64 JPGs, handoff.

## Checks (real output, trimmed; full in the status file)
- `node tools/kit_check.mjs` → `All kit checks OK (361 passed)` (after the merge; 146 before)
- `node tools/kit_contract_test.mjs --family ground` → `4 assets, 12 asset×tier builds, 433 checks, 0 failed`, `PASS: kit contract`
- `node tools/footprint_golden.mjs` → `EQUAL`; `--systems` → `EQUAL`
- `--query "?swap=valley-ground:modular,path:modular,path-shoulders:modular,path-slabs:modular"` → `DIFFERENT (4 changed,
  3 added, 0 removed)` = the three replaced objects + object count; `518 colliders · 65 platforms · 5 water rects ·
  4 exclusions · 25 anchors`, `rng valley 49233 draws (probe ok)`; `--systems` with the same swap → `EQUAL`
- check_syntax `All 148 modules OK`; verify `kit_test 36/36`, `All checks passed`; labs_check OK; cad_overrides
  `27 passed`; catalog_check OK; summit_test `83 passed`; rooftop_test `40 passed`; `git diff --check` clean
- boots (classic / my swaps / `?assets=modular`, 235 kit instances): `warnings: []`, kit `problems: []` (only the
  pre-existing optional cad-overrides.json 404); two modular boots `maxDelta 0`
- draw calls, deterministic (frame 120, 4 perf-spot cameras, high + medium): −2 draws, −302 tris at every spot/tier
- perf_spots (boots 2 × rounds 3): modular medium 11.4-13.8 ms ≤ classic high 15.0-17.6 ms; modular high within ±1 ms
  of classic high
- live wear (scratch eval of the handoff line): trail thins meadow 255 → 0, lawn stays 255, heals back to the baked
  mask exactly (0 texels differ)

## Assets promoted / deferred
All four promoted. Not promoted from the lab: GPU prints/grooves (need a renderer pass with `autoClear = false`; no
renderer in ctx), eave dry rects/amaochi, walkers/litter/raking. No footprint waivers.

## Self-review (AAA)
AAA-2/3/6/7(with exception)/8/9 by the contract and goldens; AAA-4 three tiers, same vertices hero/mid; AAA-5 dawn,
noon, dusk, night, rain, snow, mist captured; AAA-1 judged in the status file (road, river bank, slabs clearly better;
shoulders a subtle change); AAA-10 via the handoff's production rows.

## Concerns
1. **Boot cost**: first modular ground build ~390 ms in the game under sibling load (~200 ms on a quiet page) vs the
   classic ground's ~40 ms (+ the `groundTextures(6)` both pay). Mostly the Canvas2D layer painting; recorded in the
   exception's `why`.
2. **Perf numbers are from a loaded machine** (several lanes on the GPU): the first perf run read modular render 2-3x
   classic under load average 7-14; the second (load ~5) shows parity. The deterministic draw-call table is solid;
   frame times should be re-measured at G-V3.
3. **Live wear is off until the Integrator applies the one main.js line** (handoff §1); everything else works without it.
4. **New material** (R52): `kit-ground`, justified with net −2 draws; needs the Integrator's acceptance.
5. PR is ~2,000 lines of kit code (≈900 ported lab code) + 64 JPGs, over the ~1,500-line guide.
6. Look: at 2-3 m the noon road is paler/cleaner than the classic cobble texture; shoulders are subtle because the
   baked grass mask (which must not change) still grows blades over the verge.

## Pre-review: bindWorld

Rulings applied: (a) `src/main.js` granted in-lane (R47 pattern) for the handoff's one `bindWorld` loop; (b) R52:
`kit-ground` accepted.

Commits (after the first report):
- `2d79fa3` pre-review: bind the valley ground's live wear in main.js (+ `labs/ASSET_COVERAGE.md` regenerated: only
  `src/main.js` line anchors moved, e.g. `buildJournalUI` L1709 → L1716)
- `ce8e332` merge fable/integration (v-sky; main.js auto-merged, index.js regenerated, 22 families)
- `21c95bf` warm-build headroom under load; slab outlines cached; post-merge re-checks
- `981af94` merge fable/integration (v-interiors-b)
- `0168582` merge fable/integration (G-V1 I1; budgets.js auto-merged)

The main.js change (after the `grassContext` line):
```js
for (const inst of this.city.assetInstances || []) {
  if (inst.id === 'valley-ground' && typeof inst.bindWorld === 'function') {
    inst.bindWorld({ grass: this.vegetation.grass, player: this.player, npcs: this.npcs });
  }
}
```

Classic-neutral (no `valley-ground` instance exists on classic):
- `node tools/footprint_golden.mjs` → `footprint golden: EQUAL`; `--systems` → `footprint golden: EQUAL` (re-run after
  each merge, last on 981af94/0168582)
- classic boot `?assets=classic` → `{"kit":0,"problems":[]}`, `"warnings":[]` (the only error line is the
  pre-existing optional `/cad-overrides.json` 404)
- modular boot `?assets=modular` → `{"kit":238,"problems":[],"ground":1}`, `"warnings":[]`

Modular wear test with main.js doing the binding (no manual `bindWorld` call; scratch
`michi-wt/_scratch/v-ground/wear_eval_main.js`: 60 laps along a meadow line and across the shrine's west lawn,
driven through the instance's per-frame `update()`, then 400 s of regrowth at T 60 s):
```
{"bound":"by main.js (no manual bindWorld call)",
 "mid":{"lawnWear":0.737,"wear":0.694,"maskR":0,"bakedR":255,"lawnG":255,"lawnBakedG":255},
 "after":{"wear":0,"maskR":255,"bakedR":255,"live":null},"maskTexelsDifferentFromBaked":0}
```
Meadow thins (mask meadow 255 → 0 on the worn texel), the lawn stays (g 255 despite wear 0.737), and it heals back to
the baked mask exactly (0 texels differ).

Re-checks on the final head (0168582): kit_check `All kit checks OK (388 passed)`; kit_index `in sync (22 families)`;
check_syntax `All 155 modules OK`; verify `All checks passed`; labs_check `All labs checks OK`;
`node --test tools/labs_coverage_test.mjs` `pass 11, fail 0` (on 2d79fa3); contract `--family ground` `433 checks,
0 failed`; swap golden the same 3 replaced objects (518 colliders, rng 49233), `--systems` swap EQUAL (on ce8e332);
`git diff --check origin/fable/integration...HEAD` clean.

Contract flake under sibling load (load average 7-9) and its fix: valley-ground hero warm build read 7.1 ms once
(2-3 ms quiet) → its exception's warm allowance was raised to hero 10 / mid 8 / far 6 ms (reverted under R54; final
values in "Fix round 1": hero and mid at the defaults, far 2 ms);
path-slabs hero read 6.1-6.7 ms twice → superellipse outlines cached per segment count, no exception; then repeated
`--family ground` runs all `433 checks, 0 failed`.

## Pre-review fix (R54) + integration merge (2026-11-14, resumed lane, Claude Opus 5.5)

Commits (pushed to `fable/v-ground`, head `0264040`):
- `e035f5f` v-ground pre-review fix (R54): restore valley-ground warm-build allowances
- `df8da72` Merge fable/integration into fable/v-ground (v-water, s3-vista, G-V2/G-C chores)
- `0264040` v-ground status/handoff: R54 budget revert and post-merge re-checks

**R54 fix.** `git log -p -- src/kit/budgets.js`: 841020f added `BUDGET_EXCEPTIONS['valley-ground']` with
`hero { triangles: 45000 }, mid { triangles: 45000, buildMs: 5 }, far { triangles: 5000, buildMs: 4 }`; 21c95bf raised
the warm allowances to hero 10 / mid 8 / far 6 ms from one 7.1 ms reading under sibling load. `e035f5f` restores the
841020f values (hero no buildMs key, so the default 6 ms applies; mid 5; far 4), keeps the triangle allowances, and
rewrites the `why`: warm builds 2-3 ms on a quiet machine, warm-build timing re-measured on a quiet machine at G-V3
(R54); no loaded-machine numbers. The path-slabs outline cache (21c95bf) stays. The 21c95bf note in the status file is
marked reverted; handoff §2 states the allowances and the G-V3 re-measure. (Superseded by "Fix round 1": mid back to
the default, far 2 ms, the `why` carries load-recorded numbers.)

**Merge.** `origin/fable/integration` 2f78865 (27 commits). Conflicts: `src/kit/budgets.js` (kept both: valley-ground
and the s3-vista `kyoto-city` / `summit-pagoda` / `summit-bay` / `horizon` entries), `src/kit/index.js` (regenerated by
`node tools/kit_index.mjs`: `24 families`), `labs/ASSET_COVERAGE.md` (regenerated by `node tools/labs_coverage.mjs
--write`: `Active coverage: direct=152, review=19, embedded=2, related=10, missing=3`). `src/main.js` auto-merged (the
bindWorld loop plus integration's env.sunDir/palette lines).

Checks on df8da72 (real output):
- `node tools/check_syntax.mjs` → `All 170 modules OK`
- `node tools/verify.mjs` → `kit_test: tests 36, pass 36, fail 0` · `All checks passed`
- `node tools/kit_check.mjs` → `All kit checks OK (446 passed)`
- `node tools/kit_index.mjs --check` → `OK   src/kit/index.js in sync (24 families, tag 20261113a)`
- `node tools/labs_check.mjs` → `All labs checks OK`; `node --test tools/labs_coverage_test.mjs` → `tests 11 · pass 11 · fail 0`
- `uptime` → `load averages: 3.88 2.48 2.36`; `node tools/kit_contract_test.mjs --family ground` →
  `4 assets, 12 asset×tier builds, 433 checks, 0 failed` · `merge: OK — valley 237 calls; +48 kit meshes → 285; after
  _mergeInto → 240 (3 baked kit meshes)` · self-test all PASS · `PASS: kit contract` — passes with the restored caps.
- Warm builds read from the contract page (two runs, `uptime` 3.38 / 3.35): valley-ground hero 1.9 / 3.7 ms (cap 6),
  mid 1.5 / 1.9 (cap 5), far 1.4 / 1.5 (cap 4); path 0.4-0.5 / 0.4 / 0.4-0.5; path-shoulders 0.5 / 0.4-0.5 / 0.4-0.5;
  path-slabs 2.0 / 0.5-0.8 / 0.2-0.3 ms. 1-min load was 3.4-3.9 (> 3), so these are load-affected numbers for the
  G-V3 quiet re-measure; nothing failed and no cap was raised.
- `node tools/footprint_golden.mjs` → `footprint golden: EQUAL`; `--systems` → `footprint golden: EQUAL`
- swap golden `--query "?swap=valley-ground:modular,path:modular,path-shoulders:modular,path-slabs:modular"` →
  `DIFFERENT (4 changed, 3 added, 0 removed)`, unchanged from before: only `Village Ground`, `Earthen Shoulders`,
  `Cobbled Path` become groups with `asset:<id>/<part>` children, `counts.objects 312 → 315`; `518 colliders · 65
  platforms · 5 water rects · 4 exclusions · 25 anchors`, `rng valley 49233 draws (probe ok)`; same swap `--systems` → EQUAL
- `node tools/kit_material_census.mjs` → `quality high: 30 kit materials, 28 on static (baked or plain) draws, 1 not in
  the scene; page errors 2`. The two page errors are 404s for `/docs/images/title-screen.jpg` and `/cad-overrides.json`
  (booted its `--keep` temp copy: the census copies only src/, assets/ and index.html). `kit-ground` is a private
  material (not a KitMaterials `_once` entry), so it is not in this list; path-slabs is never built by the game.
- Boots (`node tools/headless.mjs /index.html?…`, autostart, playing + 5 s, Metal):
  `?assets=classic` → `{"kit":0,"problems":[],"ground":0}`;
  `?assets=modular` → `{"kit":261,"city":160,"problems":[],"ground":1}` (all runtime instances / countryside's);
  `?swap=<my 4 ids>` → city instances `valley-ground, path-shoulders, path`, `problems: []`.
  All three `"warnings":[]`; the only error line is the pre-existing optional `/cad-overrides.json` 404.
- `git diff --check origin/fable/integration...HEAD` → clean

Concerns: none new. Note for G-V3: at 1-min load ~3.4 the valley-ground mid/far warm builds (1.5-1.9 / 1.4-1.5 ms) sit
inside the default mid cap (3 ms) and at the default far cap (1.5 ms); the quiet re-measure can decide whether the
mid 5 / far 4 allowances are still needed. (Resolved in "Fix round 1": mid dropped; far 2 ms on load < 3 readings.)

## Fix round 1 (review r1, 2026-11-14)

Commit (pushed, PR head `a03d256`): `a03d256` v-ground fix round 1: R54 budget evidence, road-edge style, wear
regression test.

**Important 1 — R54 evidence (`src/kit/budgets.js`).** `uptime` first: 1-min load 1.83. Dropped mid `buildMs` (the
default 3 ms covers every reading). Far: with the default 1.5 ms the contract page read, per run,
- 1-min load 2.95 → 2.72 (family runs): far 1.5 / 1.5 / **1.6 ms** (the third run failed `warm build ≤ 1.5 ms`), hero
  3.4 / 3.6 / 3.1, mid 1.7 / 1.7 / 1.6;
- load 3.19 (asset runs): far 1.4 / 1.4 / 1.4, hero 3.2-3.3, mid 1.6-1.8;
- load 1.55 → 1.51: far 1.4 / **1.7 / 1.6 ms**, hero 3.2 / 3.2 / 3.5, mid 1.6 / 1.7 / 1.8.

Far exceeds the default below load 3, so it keeps an allowance, set to **2 ms** (was 4). Final entry:
`hero { triangles: 45000 }, mid { triangles: 45000 }, far { triangles: 5000, buildMs: 2 }`. The `why` carries the numbers
with their loads and the first build in the game with its load (197 ms on `?assets=modular` at 1-min load 2.7; 165 ms
on the swap at 2.6). It drops the "quiet" claim and names the G-V3 (R54) re-measure.

Contract after the change (`node tools/kit_contract_test.mjs --family ground`), two runs:
- run 1, load 1.75 → 1.69: `4 assets, 12 asset×tier builds, 433 checks, 0 failed` · `merge: OK — valley 237 calls; +48 kit
  meshes → 285; after _mergeInto → 240 (3 baked kit meshes)` · `self-test: OK` · `PASS: kit contract`
- run 2, load 1.69: identical summary, `PASS: kit contract`

**Minor 7 — stale docs.** Status: "Notes for the Integrator" now says handoff §1 is already applied; the budget lines give
the final values; the standalone ribbon heights are stated. Handoff: §2 has the final entry and load-recorded numbers;
§9 now says `labs_coverage --write` IS needed at merge (main.js changed). `road.js` header: the standalone ribbons sit
1 cm (road, y 0.02) and 0.6 cm (shoulders, y 0.012) under the classic 0.03 / 0.018. I tried the classic heights first,
and they fail AAA-2 (`floating: road` on all three tiers: the contract's bearing epsilon is 2 cm), so the code heights
stay and only the comment changed. Earlier sections of this report now point to the final budgets.

**Minor 8 — wear regression test (granted).** New `tools/ground_wear_test.mjs` (two headless boots through
`tools/headless.mjs`, `?shot=1` so both bake the same mask; ~12 s on Metal). The row for Appendix C is in handoff §10.
Real output:
```
OK   classic: no kit valley ground instance
OK   classic: the probe texels are meadow (-12, 12) and lawn (-4.7, -27.2) — meadow r 255, lawn r 0 g 255
OK   classic: walking the meadow leaves the grass mask untouched — 785d5d95:262144 → 785d5d95:262144
OK   classic: no page errors
OK   modular: healed to rest, the mask equals the classic boot's mask — 785d5d95:262144 vs classic 785d5d95:262144
OK   modular: at rest the field has no live wear — null
OK   modular: paws wear the meadow (bound by main.js) — wear 0.694 at (-12, 12)
OK   modular: the meadow thins where paws passed — meadow r 255 → 0
OK   modular: only texels near the walked lines change — 18 changed, 0 away from the lines
OK   modular: the lawn is worn as hard but stays — lawn wear 0.737, g 255 → 255
OK   modular: no lawn texel (baked meadow 0) changes anywhere — 0 lawn texels changed
OK   modular: after regrowth no live wear is left — wear 0.0000, live null
OK   modular: the mask heals back to the baked mask exactly — 0 bytes differ
OK   modular: no page errors

ground wear: 14 passed, 0 failed
```
The test never calls `bindWorld`: if main.js stops binding, "paws wear the meadow" fails.

**Minor 1 — style flips at the road edges, fixed in-family (`src/kit/ground/road.js`).** `paintRoad` now writes the
paving style for every texel of the road frame (REACH 4.8 m from the centreline, gap texels included), not only where
paving weight > 0.2. The bilinear `int(F.a*8.)` lookup can no longer step nobedan → slabs → setts in the fringe.
Before/after at `hour=12&cam=3.2,1.3,9.5,1.6,0,6.2,55&shot=1&assets=modular`: `--diff` gives `maxDelta 132, meanDelta
0.2376, pixelsOver8 5030`, and the diff image is red only along the two road edges. In crops, "before" shows rectangular
slab stones in the fringe and "after" shows nobedan stones fading out. Scratch:
`michi-wt/_scratch/v-ground/edge_before.png`, `edge_after.png`, `edge_diff.png`. The committed L6 JPGs predate the
fix; it only changes the fringe.

Minors 2-6 and 9: deferred to a1-village, as review r1 directs.

**Covering checks on a03d256's tree** (real output):
- `node tools/check_syntax.mjs` → `All 170 modules OK`; `node --check tools/ground_wear_test.mjs` OK
- `node tools/verify.mjs` → `kit_test: tests 36, pass 36, fail 0` · `All checks passed`
- `node tools/kit_check.mjs` → `All kit checks OK (446 passed)`; `node tools/kit_index.mjs --check` → `in sync (24 families, tag 20261113a)`
- `node tools/labs_check.mjs` → `All labs checks OK`; `node --test tools/labs_coverage_test.mjs` → `pass 11`, `fail 0`
- goldens (load 1.96): `node tools/footprint_golden.mjs` → `EQUAL`; `--systems` → `EQUAL`; swap of the four ids →
  `DIFFERENT (4 changed, 3 added, 0 removed)`: the same 3 replaced objects, `518 colliders · 65 platforms · 5 water rects
  · 4 exclusions · 25 anchors`, `rng valley 49233 draws (probe ok)`; swap `--systems` → `EQUAL`
- `node tools/ground_wear_test.mjs` (load 2.16) → `ground wear: 14 passed, 0 failed`
- boots (autostart, playing + 5 s, Metal):
  - `?assets=classic` (load 2.71) → `{"kit":0,"city":0,"problems":[]}`
  - `?assets=modular` (load 2.68) → `{"kit":261,"city":160,"problems":[]}`, valley-ground first build 196.5 ms
  - swap of my 4 ids (load 2.57) → `{"kit":3,"city":3,"problems":[]}`, valley-ground 165.3 ms
  - all three `warnings: []`; the only error is the optional `/cad-overrides.json` 404
- `git diff --check origin/fable/integration...HEAD` → clean

Concerns: none blocking. Far's 2 ms allowance and the hero/mid defaults go to the G-V3 quiet re-measure (R54).
