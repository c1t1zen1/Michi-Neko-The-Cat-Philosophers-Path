# b1-build-budget report (ruling R83: close R66)

- Worker: Claude Opus 5.5. Worktree `michi-wt/b1-build-budget`, branch `fable/b1-build-budget`, base ef6adad.
- Commits: 2ee8b22 (claim), 745fdb3 (lever 1), 75dae12 (lever 2), dd7ffcc (helper), 7b9734e (re-measure, handoff,
  budgets §2), 9d6a464 (handoff paths). PR #57 into fable/integration:
  https://github.com/c1t1zen1/Michi-Neko-The-Cat-Philosophers-Path/pull/57.
  The branch is behind `origin/fable/integration` (865ca20: h1-hero and a3-rooftops). `git merge-tree` reports a clean merge.
- Status: **DONE_WITH_CONCERNS.** The rule holds on medium. It does not hold yet on high, so R66 stays open for high.
  The boot rule holds on both tiers. What would close high is ranked, with measured shares, in the handoff.

## What was built

All changes are in granted files, and the modular pixels are unchanged.

1. **Lever 1, `src/kit/materials.js` (`deferredTextured`).**
   - Which materials: the textured KitMaterials (stone, wood, bark, lacquer, bronze, straw, plaster, tile).
   - What changed: each material is made at once. Its textures.js canvases are painted on the first read or write of a map.
   - When three reads the map: when it builds the program for a drawn mesh, or in the shadow pass's
     `getDepthMaterial`. Painting therefore happens in the first frame that draws the material. A material that is
     not drawn at boot is not painted at boot.
   - Why the output is the same: the resolved maps are copied from `texturedMaterial(set, opts)` itself. They are the
     same cached Texture objects and the same normalScale as before.
2. **Lever 2, `src/kit/ground/layers.js`.**
   - The two layer DataArrayTextures are made at once.
   - `image.data` is painted and packed on its first read, which is three's first upload.
   - `packLayers()` is the old pack loop, cut out verbatim.
   - I tried exact micro-speedups of the pack (index masks, row fills) in a bench. They gained nothing on a cold run
     (15–24 ms either way, because JIT warm-up dominates), so I did not keep them.
3. **Helper, `paintOnFirstUpload(texture, paint)` in materials.js.**
   - It is used by the handoff §2 patches for three family textures: the corral sign face, the Moon Pool caustics
     and the sky's cloud field.
   - It is unused in-lane.
4. **Tests, `tools/b1_build_budget_test.mjs`.** Nine Node tests, using a three stub; there is no DOM, so any paint
   attempt throws. They cover:
   - the deferral mechanics: no paint at creation, one paint on the first read or write, equality with the eager
     material, and a retry after a failing paint;
   - every textured factory: it is made without a DOM, and a map read paints;
   - `packLayers` byte for byte against the ef6adad loop as an oracle (3 seeds, painted and flat layers);
   - lazy `groundLayers`;
   - `paintOnFirstUpload`.

   Mutation check: making the deferral eager and changing the cavity factor fails 5 of the 8 tests.

## The numbers

All runs use the brief's command (`perf_spots.mjs --tiers medium,high --spots street --rounds 1 --frames 20
--warmup 200`) with classic and `?assets=modular`. Every boot started at a 1-minute load < 3; the load is recorded
per boot in the scratch JSON.

**Two quiet runs of the exact command at the lane head** (`--boots 3`, 04:56–04:59, load 1.29–2.84):

| Run | Tier | Classic build / ready / boot (ms) | Modular build / ready / boot | Build × | Boot Δ |
|---|---|---|---|---:|---:|
| 1 | medium | 1,338 / 1,921 / 2,629 | 1,600 / 2,473 / 3,309 | **1.20** | +680 |
| 1 | high | 1,394 / 1,984 / 2,806 | 1,812 / 2,798 / 3,622 | **1.30** | +816 |
| 2 | medium | 1,364 / 1,948 / 2,680 | 1,672 / 2,636 / 3,449 | **1.23** | +769 |
| 2 | high | 1,398 / 1,990 / 2,850 | 1,833 / 2,823 / 3,634 | **1.31** | +785 |

**12 boots per cell, lane and ef6adad interleaved** (one boot per perf_spots invocation, each gated at load < 2.6,
sets and roots alternated; load 1.97–2.84):

| Root | Tier | Build × | Ready × | Boot Δ |
|---|---|---:|---:|---:|
| ef6adad | medium / high | 1.42 / 1.45 | 1.40 / 1.35 | +887 / +830 |
| lane | medium / high | 1.23 / 1.24 | 1.33 / 1.30 | +721 / +612 |

Lane against base on those medians:
- modular build −258 ms (medium) / −432 ms (high);
- first frame +196 / +115 ms;
- world ready −110 / −330 ms.

The 3-boot runs swung by ±0.2, because one boot's world build moved by ±300 ms at the same load on this machine.
The baseline at ef6adad was also measured on its own (`--boots 3`, load 1.8–3.5): 1.43 / 1.39×, +886 / +820 ms.

**Verdict.**
- Medium holds: 1.20–1.23× in every reading.
- High sits at 1.24× (12-boot medians) to 1.30 / 1.31× (the clean quiet pair) against the 1.25× limit, so I did not
  tick budgets.md §2. The b1 numbers are now under its open item.
- The modular high overhead is ~420 ms and needs to be under ~350.

## Levers measured but not changed

- **3 (trees).** About 95 % of `sakura` is in `src/foliage.js` `buildLeafCanopy` (the twig `flexTube` TubeGeometry
  and the merges). No exact speedup is reachable from the trees family without forking that shared code.
- **4 (summit kit).**
  - Cost: 32 ms (medium) / ~60 ms (high), profiled.
  - Why not: the summit builders draw `this.rng` in their layout steps and use `placeAsset()` results synchronously
    (the vista assembly is a parent by name; `bind` fields are read later). A deferral would either still run at boot
    or change the summit's structure and parity.
- **5 (Roof Road families).**
  - Cost: ~1–2 ms of module top level, because the prefetch already downloads them and `preload()` takes ~16 ms.
  - The optional main.js/bootstrap.js patch is in handoff §1. I tried it in scratch: 24 families, no roof requests,
    street frame `maxDelta 0`. I did not drill the pocket entry with it.

**New finding, ranked first in the handoff.** On modular, `Vegetation.layoutTree()` still builds every valley tree's
classic canopy only to advance the stream. The kit tree then builds its own canopy and the classic one is disposed.
- Cost: 98 of the 236 ms the trees take in a quiet high profile.
- Fix: a draw-only canopy in foliage.js, plus a draw tape in layoutTree so the classic fallback stays exact. The handoff
  §4 design has the tests to run.
- Estimated saving: ~60–70 ms of real work at both tiers.
- Effect with the §2 patches: I estimate the two together would bring the high overhead to ~300–320 ms. This is an
  estimate, not a measurement.

## Checks run (real output, trimmed)

- **G1 at dd7ffcc.**
  - `check_syntax` → `All 192 modules OK`
  - `verify` → `All checks passed` (`a1_village_test: tests 6, pass 6, fail 0`)
  - `kit_check` → `All kit checks OK (534 passed)`
  - `labs_check` → `All labs checks OK`
  - `kit_test` → `tests 37 … fail 0`
  - `b1_build_budget_test` → `tests 9 … fail 0`
  - `git diff --check` clean
- **R67.**
  - `cd cadJS && npm run check` → `server/catalog/agent/asset modules: ok`, `15/15`,
    `kit assets read: 187 from 28 families`, `16/16`
  - `cd catalog && npm test` → `tests 50 … fail 0`
- **Classic untouched.**
  - `footprint_golden` → `footprint golden: EQUAL` (byte-identical); `--systems` → `EQUAL`
  - `cat_golden` → `cat golden: EQUAL`, `checks 40 passed, 0 failed`
  - `summit_golden` → `summit golden: EQUAL`, routing `ok … single swaps 32/32 ok`,
    `summit_test.mjs "83 passed, 0 failed"` identical to the golden. The 9 advisory entries are the same at ef6adad.
  - `summit_kit_parity` → `EQUAL`
  - `rooftop_golden` → `rooftop golden: EQUAL`
- **Modular pixels.**
  - `?assets=modular`, ef6adad against the head, using the game_shot capture rules (`?shot=1`, frame 120). The
    summit frames come from a save that resumes there.
  - Frames: street noon, shrine dusk, river night, meadow rain, summit seat, summit arrival, corral sign, Moon Pool.
  - Result: `maxDelta 0, pixelsOver8 0` on all eight.
  - With the handoff §2 patches applied: the same eight frames are `maxDelta 0` too.
- **Boots.** Classic and modular, medium and high, booted with `--fail-on-error`: `errors: [], warnings: []`.
  Modular: `instances 261, problems 0`. The optional `/cad-overrides.json` 404 is ignored.
- **Census after 124 frames, modular high.** Of 9 textured kit materials, 7 painted (mostly through the shadow pass)
  and 2 not painted at all.
- **Contract, `--family ground`.** `433 checks, 0 failed`.
- **Watch list: all-families contract, five runs, start load < 3** (187 assets, 561 builds, 14,875 checks):

  | Run | Load (start → end) | Failed |
  |---|---|---|
  | 1 | 2.41 → 3.45 | 23 |
  | 2 | 2.77 → 4.40 | 27 |
  | 3 | 2.75 → 2.88 | **0** |
  | 4 | 2.59 → 2.73 | 1: `roof-machiya` hero 18.0 / 15 |
  | 5 | 2.11 → 2.02 | 2: `roof-okuribi` mid 4.4 / 4, `roof-machiya` hero 15.5 / 15 |

  - Every failure is the AAA-7 warm build. Runs 1 and 2 count as loaded under R54, because the load climbed during
    the run.
  - `roof-machiya` hero also fails on ef6adad (17.7 / 15 at load 1.43, `--family roofstreets`), so it is not from this
    lane.
  - `summit-pagoda` mid, `valley-ground` far and `summit-bay` mid passed in runs 3–5.
  - No cap was changed.

## Files changed

- `src/kit/materials.js`
- `src/kit/ground/layers.js`
- `tools/b1_build_budget_test.mjs` (new)
- `docs/fable/status/b1-build-budget.md` (new)
- `docs/fable/handoff/b1-build-budget.md` (new)
- `docs/fable/baseline/budgets.md` (§2: the b1 bullet under the open item)

No hot file was edited, and no cache tag was changed.

## Assets and footprint

- Assets promoted or deferred: none. This lane is build time only.
- Footprint waivers: none.

## Self-review against the brief

| Requirement | Result |
|---|---|
| Goal (≤ 1.25×, boot ≤ +1,000 ms) | Medium yes; high no (1.24–1.31×). Boot yes everywhere. |
| Levers | 1 and 2 done; 3, 4 and 5 measured and explained; extra patches prepared. |
| Pixels unchanged | Yes (maxDelta 0 at eight frames). |
| Classic goldens | All EQUAL. |
| Contracts, G1, cadJS, catalog | Green, apart from the timing-only warm-build flakes listed above. |
| Boots | Clean. |
| Lever 5 pocket drill | Not needed: lever 5 was not touched in-lane. |
| Watch list | Reported. |

## Open concerns

1. **R66 is still open for high.** It blocks the default flip until handoff §4 items 1 and 2 (or similar) land.
2. **World ready.** The world-ready column of the §2 table (≤ 1.25×) reads 1.30–1.42× on the lane (1.35–1.40 at
   ef6adad). Part of what left the build now runs in the first frame. The R66 item itself names only build and boot.
3. **A one-off summit hitch.** The summit's kit stone and timber now paint on the summit's first draw, inside the
   ascent veil: 10–25 ms per texture, once.
4. **This machine cannot settle a ±0.05 ratio with 3-boot runs.** Two other agents' browsers, a GPU-resident
   llama-server and Spotlight indexing were running throughout. The gated, interleaved driver (`gated_ab.sh`) and
   the speed-normalised summary (`gnorm.mjs`) are in `michi-wt/_scratch/b1-build-budget/` for the next re-measure.
5. **The family patches are not applied.** The handoff §2 patches live in files outside the grant (sky, hidden,
   fences) and wait for an owner or the Integrator.
