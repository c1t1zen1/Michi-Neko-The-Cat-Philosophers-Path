# b1-build-budget

- Worker / model:     Claude Opus 5.5
- Claimed:            2026-11-16 02:53 PST
- Branch:             fable/b1-build-budget
- Base commit:        ef6adad (fable/integration, G-R chores done, tag 20261116a)
- State:              ready for review (R66: medium holds, high does not yet: still OPEN for high, ranked in the handoff)

Closes ruling R66: on `?assets=modular`, medium and high, world build
≤ 1.25 × classic and boot total ≤ classic + 1,000 ms (budgets.md §2). Brief:
`.superpowers/sdd/BUILD_GUIDE_FABLE/briefs/b1-build-budget.md` (ruling R83).

## Assets
| Inventory id | Promoted from (lab/specimen) | Parts | Tiers | Footprint | State |
|---|---|---|---|---|---|
| (none: build-time work only, no asset changes its output) | | | | | |

## Steps
- [x] L1 Claim
- [x] L2 Read (brief, budgets §2, perf_gv3, a1 handoff §2, a1 status R66)
- [x] B.0 Baseline at ef6adad (perf_spots build command, classic + modular, same session, load < 3)
- [x] B.1 Profile the modular build and rank the levers (CPU profiles, below)
- [x] B.2 Levers (pixels unchanged): 1 (745fdb3), 2 (75dae12); 3, 4, 5 measured and not changed (reasons below); dd7ffcc helper for the handoff patches
- [x] B.3 Proofs (goldens, game_shot maxDelta 0, contracts, G1, cadJS, catalog, boots)
- [x] B.4 Re-measure: two runs at load < 3 (+ 12-boot gated A/B); budgets.md §2 not ticked (high), the b1 numbers added under the open item, the rest ranked in the handoff
- [ ] L10 PR

## R66: the measurement

**Command.** The brief's (`node tools/perf_spots.mjs --tiers medium,high --spots
street --rounds 1 --frames 20 --warmup 200`), classic and `?assets=modular`, but
one boot per invocation, each started only when the 1-minute load was under 2.6
(scratch `michi-wt/_scratch/b1-build-budget/gated_ab.sh`): two other agents ran
browsers the whole time, and a perf_spots run of 12 boots raised the load past 3
by itself by its fourth or fifth boot, so the modular boots (always later in a
round) ran on a busier machine than the classic ones. The driver alternates
the order of sets and roots every round and runs the lane head and the base
(ef6adad, a scratch worktree) side by side, so both see the same machine. Every
boot's start load is in the JSON (`gab/`, `gab2/`); all are 1.97–2.84.

**The noise.** On this machine, today, one boot's world build moves by ±300 ms
at the same load (classic, the same code: 1,253 to 2,074 ms). Three-boot runs
therefore swing by ±0.2 in the ratio (the base alone read 1.16 and 1.68 on
medium in two of them). The rule is judged below on the medians of 12 boots
per cell (the four 3-boot runs are listed too).

**Baseline at ef6adad** (same sessions as the lane, 12 boots per cell, load 2.05–2.59):

| Tier | Classic build / ready / boot (ms) | Modular build / ready / boot | Build × | Ready × | Boot Δ |
|---|---|---|---:|---:|---:|
| medium | 1,414 / 2,032 / 2,775 | 2,011 / 2,836 / 3,662 | **1.42** | 1.40 | +887 |
| high | 1,447 / 2,138 / 2,862 | 2,093 / 2,883 / 3,693 | **1.45** | 1.35 | +830 |

(An earlier perf_spots run at ef6adad, 3 boots, all twelve boots in one go, load
1.82–3.48, read 1.43 / 1.39 and +886 / +820 ms: the same picture.)

**Lane head dd7ffcc** (levers 1 and 2; 12 boots per cell, load 1.97–2.84):

| Tier | Classic build / ready / boot (ms) | Modular build / ready / boot | Build × | Ready × | Boot Δ |
|---|---|---|---:|---:|---:|
| medium | 1,423 / 2,050 / 2,797 | 1,753 / 2,726 / 3,518 | **1.23** | 1.33 | +721 |
| high | 1,341 / 1,966 / 2,642 | 1,661 / 2,553 / 3,254 | **1.24** | 1.30 | +612 |

The four 3-boot runs (rounds 1–3 and 4–6 of each session), build × medium / high:
1.19 / 0.89, 1.40 / 1.21, 1.12 / 1.20, 1.06 / 1.31. With a speed covariate
(each boot scaled by its own engine-start → constructor time, which is the same
code for both roots: `gnorm.mjs`), the 12-boot ratios read 1.19 / 1.29 (lane)
against 1.38 / 1.43 (base).

**The brief's exact command, twice, in a quiet spell** (`--boots 3`, both sets
in one run, 04:56–04:59, load 1.29–2.84 at every boot start; scratch
`final_run1.json`, `final_run2.json`):

| Run | Tier | Classic build / ready / boot (ms) | Modular build / ready / boot | Build × | Ready × | Boot Δ |
|---|---|---|---|---:|---:|---:|
| 1 | medium | 1,338 / 1,921 / 2,629 | 1,600 / 2,473 / 3,309 | **1.20** | 1.29 | +680 |
| 1 | high | 1,394 / 1,984 / 2,806 | 1,812 / 2,798 / 3,622 | **1.30** | 1.41 | +816 |
| 2 | medium | 1,364 / 1,948 / 2,680 | 1,672 / 2,636 / 3,449 | **1.23** | 1.35 | +769 |
| 2 | high | 1,398 / 1,990 / 2,850 | 1,833 / 2,823 / 3,634 | **1.31** | 1.42 | +785 |

Classic was steady in that spell (1,227–1,398 ms over all twelve classic
boots), which makes this pair the cleanest reading: **medium holds (1.20, 1.23),
high does not (1.30, 1.31)**; the boot rule holds on both (+680 to +816 ms).

**What moved where.** Modular world build −258 ms (medium) and −432 ms (high),
first frame +196 / +115 ms (the ground layers and the materials drawn in the
first frame paint there now), world ready −110 / −330 ms and boot total −144 /
−439 ms: more came out than went into the first frame, because what is not
drawn at boot (the summit's stone and timber, the tea room's woods, anything
off-screen) is not painted at all now.

## R66: the levers

Where the modular build went at ef6adad (CPU profiles of one classic and one
modular boot, medium, `bootprof.mjs`, load ~3.9, so shares): `preload()` is
~16 ms (the a1 prefetch works), and everything else is inside
`assembleWorld`: Countryside +385 ms, Sky +41, HiddenPlaces +33, Interior +9.
The kit's own first builds summed 1,015 ms, led by `valley-ground` 295 (its
painted layer tiles 153, of which the meadow tile — `groundTextures(6)`, which
the classic ground paints too — is 103, the pack loop 47, the terrain arrays
50, the GroundField 24) and the `KitMaterials` textures (108 ms: stone 59,
wood 29, lacquer 18, painted inside whichever instance asked first: `toro`,
`shishi`, `torii`, `summit-entry`, `corral-sign`).

| Lever | What was done | Result |
|---|---|---|
| 1 `KitMaterials` | stone, wood, bark, lacquer, bronze, straw, plaster, tile make their material at once and paint on the first map read (745fdb3) | out of the build: ~108 ms profiled; paints in the first frame's shadow pass (`getDepthMaterial` reads `material.map`) or, for what nothing draws at boot, not at all. In a modular boot after 120 frames at the street, the census below lists which stayed unpainted |
| 2 ground layers | `paintLayers` makes the two DataArrayTextures at once; tiles painted and packed on the first `image.data` read, three's first upload (75dae12). The pack loop is cut into `packLayers`, verbatim; exact speedups of it were tried in a scratch bench (index masks, row fills) and gained nothing cold (JIT warm-up dominates: 15–24 ms either way), so none were kept | out of the build: ~200 ms profiled (the three tiles, the meadow tile, the pack); paints in the first frame |
| 3 trees | measured, not changed. `sakura` is 44 ms (medium) / 110 ms (high) profiled; ~95 % of it is `buildLeafCanopy` in `src/foliage.js` (twig and sprig tubes: `flexTube` → TubeGeometry per twig, then `mergeGeometries`). The kit's own part (`addCanopy`'s translate and `joinWood`) is ~12 ms at load 6. No exact speedup is reachable from the trees family without forking the shared foliage code; ranked in the handoff | — |
| 4 summit kit | measured, not changed. The 24 summit kit instances build in 32 ms (medium) / 60–66 ms (high) profiled. Deferring them is not a local change: the summit builders draw `this.rng` in their layout steps and use what `placeAsset()` returns synchronously (the vista assembly is the parent, by name, of the layers built after it; `layout.bind` fields and anchors are read by the next builder), so a deferred build either reorders nothing and still runs at boot, or changes the summit's structure and parity. Ranked in the handoff | — |
| 5 Roof Road families | measured, not changed. Their module top levels cost ~1–2 ms in a modular boot (all `src/kit/roof*`/`rooftops/` frames: 10 ms, 8 of them the r6 valley pieces both sets build); `preload()` takes ~16 ms because the prefetch has already downloaded them. The exact patch to keep them out of the game's runtime anyway (main.js, bootstrap.js; hot) is handoff §1 | — |
| helper | `paintOnFirstUpload(texture, paint)` in materials.js (dd7ffcc), for the three family textures in the handoff §2 patches | unused in-lane |

## Checks run (command → real result)

At 75dae12 (levers 1 + 2), 03:21–03:35:
- `node tools/check_syntax.mjs` → `All 192 modules OK`
- `node tools/kit_check.mjs` → `All kit checks OK (534 passed)`
- `node --test tools/kit_test.mjs` → `tests 37, pass 37, fail 0`
- `node --test tools/b1_build_budget_test.mjs` → `tests 8, pass 8, fail 0`; mutation check: making
  `deferredTextured` resolve at once and `paintLayers` paint at once, and changing the cavity
  factor in `packLayers` (3 → 3.01), fails 5 of the 8 (restored, 8/8 again)
- `node tools/verify.mjs` → `All checks passed` (incl. `a1_village_test: tests 6, pass 6, fail 0`)
- `node tools/labs_check.mjs` → `All labs checks OK`
- `cd cadJS && npm run check` → `server/catalog/agent/asset modules: ok`, `15/15`, `kit assets read: 187 from 28 families`, `16/16`
- `cd catalog && npm test` → `tests 50, pass 50, fail 0`
- `node tools/footprint_golden.mjs` → `footprint golden: EQUAL` (byte-identical); `--systems` → `EQUAL`
- `node tools/cat_golden.mjs` → `cat golden: EQUAL`, `checks 40 passed, 0 failed`
- `node tools/summit_golden.mjs` → `summit golden: EQUAL`; routing `ok: 32 summit ids … single swaps 32/32 ok`;
  `summit_test.mjs "83 passed, 0 failed"`, identical to the golden (the 9 advisory entries are the same at ef6adad)
- `node tools/summit_kit_parity.mjs` → `summit kit parity: EQUAL`
- `node tools/rooftop_golden.mjs` → `rooftop golden: EQUAL`
- `node tools/kit_contract_test.mjs --family ground` → `4 assets, 12 asset×tier builds, 433 checks, 0 failed` (load 3.9, informational for timing)
- Modular pixels, `?assets=modular`, ef6adad against 75dae12, six frames (scratch `shots.sh`: the
  game_shot capture rules, `?shot=1`, frame 120; the summit two from a save that resumes on the summit):
  street noon, shrine dusk (18.3), river night (22), meadow rain (10.5), summit seat (from the perch toward
  the bay), summit arrival (under the torii) → `maxDelta 0, pixelsOver8 0` on all six

At dd7ffcc (head), 04:23–05:15:
- `node tools/check_syntax.mjs` → `All 192 modules OK`; `node tools/verify.mjs` → `All checks passed`;
  `node tools/kit_check.mjs` → `All kit checks OK (534 passed)`; `node tools/labs_check.mjs` → `All labs checks OK`;
  `node --test tools/kit_test.mjs` → `tests 37 … fail 0`; `node --test tools/b1_build_budget_test.mjs` → `tests 9 … fail 0`;
  `git diff --check` clean
- `cd cadJS && npm run check` → `modules: ok`, `15/15`, `kit assets read: 187 from 28 families`, `16/16`;
  `cd catalog && npm test` → `tests 50 … fail 0` (R67)
- Modular pixels, ef6adad against dd7ffcc, eight frames (the six above plus the corral sign at noon from
  3 m and the Moon Pool at noon from above the rim) → `maxDelta 0, pixelsOver8 0` on all eight
- Boots clean: `node tools/headless.mjs "/__boot.html" --local 'catwalk_settings_v1={"quality":"medium|high"}' … --fail-on-error --ignore cad-overrides`
  (classic) and `"/index.html?assets=modular" --session catwalk_autostart=new …` (modular): `errors: [], warnings: []`
  on all four; modular `instances 261, problems 0` (the optional `/cad-overrides.json` 404 is the only message, ignored)
- Material census after 124 frames at the spawn, modular high: 9 textured kit materials, 7 painted in the first
  frames (mostly through the shadow pass), 2 still unpainted (`stone#29`, `lacquer#30`)
- `node tools/kit_contract_test.mjs` (all 28 families, 187 assets, 561 asset × tier builds, 14,875 checks), five runs,
  load at start → end: 2.41 → 3.45: 23 failed; 2.77 → 4.40: 27 failed; 2.75 → 2.88: **0 failed**; 2.59 → 2.73: 1 failed
  (`roof-machiya` hero warm 18.0 / 15 ms); 2.11 → 2.02: 2 failed (`roof-okuribi` mid 4.4 / 4, `roof-machiya` hero 15.5 / 15).
  Every failure is the AAA-7 warm build. `--family roofstreets` at load 1.43–1.47: ef6adad 0 then 1 failed
  (`roof-machiya` hero 17.7 / 15), lane 0 and 0

## Deferred assets and why

None (no asset ids in scope).

## Footprint waivers requested

None.

## Notes for the Integrator

1. **R66 is not closed for high.** Medium holds in every reading (1.20–1.23 ×);
   high reads 1.24 × on 12-boot medians and 1.30 / 1.31 × on the two quiet runs
   of the exact command, against 1.25 ×. The boot rule holds everywhere (+612 to
   +816 ms). budgets.md §2 keeps its open item unticked; the b1 numbers are
   added under it. What would close high is ranked in
   `docs/fable/handoff/b1-build-budget.md` §4; the first two (the valley trees'
   classic canopy still built in the layout step on modular, ~98 ms profiled;
   the three family textures, exact patches ready in §2) are estimated to bring
   the high overhead from ~420 to ~300–320 ms against ~350 allowed.
2. **World ready.** The textures now paint in the first frame that draws them, so
   part of what left the build is in the first frame: on the 12-boot medians the
   modular first frame is +196 / +115 ms and the world build −258 / −432 ms
   against ef6adad, and world ready still came down (−110 / −330 ms). The §2
   table's world-ready column (≤ 1.25 ×) reads 1.30–1.42 × on the lane (1.35–1.40
   at ef6adad); the R66 item names build and boot only.
3. **A hitch on the summit's first draw.** The summit's kit stone and timber
   (and any kit material nothing in the valley draws) now paint when the summit
   is first drawn, inside the ascent veil: a one-off 10–25 ms per texture.
4. **Measuring on this machine.** Two other agents ran headless browsers all
   session, a resident llama-server held the GPU, and Spotlight indexed the
   new worktrees. One boot's world build moved by ±300 ms at the same load, and
   a 12-boot perf_spots run raised the 1-minute load past 3 by itself, which
   puts the modular boots (always second in a perf_spots round) on a busier
   machine than the classic ones. `michi-wt/_scratch/b1-build-budget/gated_ab.sh`
   (one boot per invocation, gated at load < 2.6, sets and roots alternated)
   and `gnorm.mjs` (each boot scaled by its own engine-start → constructor time)
   are there for the next re-measure.
5. **Watch list (G-R chores, R85).** Five all-families contract runs at a start
   load < 3 (below). Runs 1 and 2 had the load climb to 3.45 / 4.40 during the
   run and failed 23 / 27 warm builds (every one AAA-7 timing; R54: loaded); runs
   3–5 (load ≤ 2.88 throughout): 0, 1 (`roof-machiya` hero 18.0 / 15) and 2
   (`roof-okuribi` mid 4.4 / 4, `roof-machiya` hero 15.5 / 15). `roof-machiya`
   hero fails on ef6adad too (17.7 / 15 at load 1.43, `--family roofstreets`);
   `summit-pagoda` mid, `valley-ground` far and `summit-bay` mid passed in runs
   3–5. No cap was changed.
6. **Lever 5 (Roof Road families)** does not count (~1–2 ms); the optional
   main.js/bootstrap.js patch is handoff §1.
7. **Appendix C.** `node --test tools/b1_build_budget_test.mjs` (9 tests: the
   deferral mechanics, the factories under Node, `packLayers` against the
   ef6adad loop, `paintOnFirstUpload`) could join G1 beside a1_village_test.

## Paused mid fix round 1 (2026-11-16, usage limit)
Fix round 1 (ruling R89) was cut off by the session usage limit. Done and pushed: 3cc67e7 (three family textures paint on first
upload, handoff §2) and 74a87a5 (draw-only classic canopy for kit-built valley trees, handoff §4.1, with
tools/b1_build_budget_browser_test.mjs: valley stream 25, 480 seeded buildCanopy/drawCanopy runs, sakura-throwing fallback boot
whose 13 canopies equal classic; ASSET_COVERAGE regenerated). The handoff now marks both levers applied.
Not yet done: the full proof re-run on the merged head (footprint + `--systems` on both sets with the `valley 49233 draws (probe ok)`
line, classic game_shot pairs and the 8 modular frames maxDelta 0, cat/summit/rooftop goldens, contracts of the touched families,
`cd cadJS && npm run check`, `cd catalog && npm test`), the 12-boots-per-cell interleaved re-measure vs ef6adad on medium and high
(world build, world ready, boot total; every boot start at load < 3), the budgets.md §2 tick if both tiers pass, and the
"Fix round 1" section of the report.
