# Lane brief: b1-build-budget (closes Ruling R66 — the modular world-build budget; precondition of the default flip)

Worktree: /Users/c1t1zen/Documents/GitHub/michi-wt/b1-build-budget   Branch: fable/b1-build-budget (from fable/integration; the dispatch names the base)
Report: /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/reports/b1-build-budget-report.md
Read: briefs/_common.md (same folder as this file), AGENTS.md, BUILD_GUIDE_FABLE.md §0 (R66 item), §2, §3, §16;
docs/fable/baseline/budgets.md §2 (the rule, the G-V3 and a1 numbers, the exact measuring command), docs/fable/baseline/perf_gv3.md,
docs/fable/handoff/a1-village.md §2 (§2a/§2b applied in a1, §2c the ranked levers left), docs/fable/status/a1-village.md (R66 notes),
and `grep -nE "R66|R71|world build|buildMs" /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/progress.md`.

## Goal
On `?assets=modular`, medium and high: world build ≤ 1.25 × classic and boot total ≤ classic + 1,000 ms (budgets.md §2), measured with
the same command a1 used (`node tools/perf_spots.mjs --tiers medium,high --spots street --rounds 1 --frames 20 --warmup 200 --boots 3`,
classic and modular in the same session), two runs, every boot start at `uptime` 1-min load < 3 (R54: wait for quiet; other agents may be
running; record the load beside every number). When it holds, tick the budgets.md §2 open item with the numbers and write the closing
note for R66 in your status file. If it cannot hold without a visible change, stop at the best honest result and rank what is left.

## Levers (a1 handoff §2c, plus one new) — pixels must not change
1. `src/kit/materials.js` (`KitMaterials`): paint stone / wood / lacquer textures lazily (first compile or first use by a drawn mesh), not
   at the first `km.stone()/wood()/lacquer()` call inside the world build (~60–80 ms).
2. `src/kit/ground/layers.js` `paintLayers` / `groundLayers()`: exact speedups (index tables instead of modulo in the cavity blur, row fills
   for flat layers), or paint while the kit modules download (~55 ms).
3. Family `trees`: the hero leaf-spray placement on high (`sakura` ~52 ms) — exact speedups in the kit's use of the shared foliage code, or
   a cached spray template; the same sprays.
4. The summit's kit families (`clearing`, `vista`, `summitlife`) build at boot though nothing of the summit draws before the tenth bell
   (~45–60 ms). `src/mountaintop.js` is GRANTED for this one change (idle-time build of the kit content after the first frame, or on unlock),
   provided `node tools/summit_golden.mjs` (incl. the placeAsset routing test and summit_test 83) and `tools/summit_kit_parity` stay EQUAL;
   never add, remove or reorder a summit `this.rng` draw.
5. NEW since a1: the game's runtime now also imports the Roof Road families (`roof*`) at boot on modular, though they are only needed when the
   pocket opens (r6, `src/rooftops/`). Measure their share; if it counts, import them on pocket entry (the r6 pocket already awaits a
   build). `src/kit/runtime.js` is GRANTED for a generic family filter / lazy family import (unit tests in tools/kit_test.mjs);
   `src/rooftops/**` GRANTED only for the call that requests the roof families on entry. The G-R chores may already have added a
   `families`/`loadFamilies` filter for the sandbox — reuse it.
Hot files beyond these grants → an exact patch in docs/fable/handoff/b1-build-budget.md.

## Proof (every change)
- Classic untouched: footprint golden (and `--systems`) EQUAL, cat golden EQUAL, summit golden EQUAL, rooftop golden classic EQUAL.
- Modular pixels unchanged: `node tools/game_shot.mjs` on `?assets=modular` at street noon, shrine dusk, river night, meadow rain and the
  meditation seat (summit) — `--diff` against the same shots taken at your base commit: maxDelta 0 (or explain a non-zero delta as
  pre-existing nondeterminism by shooting the base twice).
- Contract tests of every touched family (`node tools/kit_contract_test.mjs --family <f>`), kit_test, G1 (check_syntax, verify, kit_check,
  labs_check), `cd cadJS && npm run check` and `cd catalog && npm test` (R67: kit modules must still load in Node without a DOM).
- Both game boots clean (classic + modular), and the pocket on modular enters and exits clean (the r6 drill) if you touch lever 5.
Push, PR into fable/integration (title "b1-build-budget: close R66"), report per _common.md.

## Watch list handed to you (G-R chores + R85)
The contract's AAA-7 warm build is now the median of 3 (R85b). Still flaky on a quiet machine once in five all-family runs:
`summit-pagoda` mid (3.9 / 3 ms; reads 3.9 / 5.0 / 1.5). Also watched: `valley-ground` far (2.2 / 2 once), `summit-bay` mid (3.4 / 3
once). If your summit change (lever 4) or an exact speedup fixes the cause, good; never raise a number from a loaded reading (R54). At the
end, run the all-families contract three times at load < 3 and report each run's failures.
