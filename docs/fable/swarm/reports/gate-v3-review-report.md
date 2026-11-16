# Gate G-V3 review — the whole village merged → first merge to `main` since G-F — Reviewer: Fable

Checkout reviewed: `/Users/c1t1zen/Documents/GitHub/michi-wt/review-gv3` (detached, HEAD `98c3a61`, `fable/integration` after the G-V3 chores `ff8e8e7` and the R67 fixes `4f17ccd`), read-only; `git status --short` clean before and after.
MAIN: `a3221d4` (origin/main = G-F `414225f` + the operator's Shinkansen commit). `git merge-base --is-ancestor a3221d4 98c3a61` → true (fast-forward possible). 249 commits, 1,596 files, +32,710/−4,184 lines between them.
MAIN-side builds: scratch detached worktree `/Users/c1t1zen/Documents/GitHub/michi-wt/_scratch/gate-v3-review/main-wt` (`a3221d4`, created by me; the `tools/game_shot.mjs`, `headless.mjs` and `perf_spots.mjs` there are byte-identical to the review commit's, so both sides were captured by the same harness).
Scratch (outside the repo): `/Users/c1t1zen/Documents/GitHub/michi-wt/_scratch/gate-v3-review/` — `g1.log`, `g2.log`, `shots.log`/`shots2.log` + `shots/` (the four classic pairs, the lane captures), `main_save.json`/`save_payload.json`/`load_classic.json`/`load_modular.json`, `walk.mjs`/`walk_modular.json`/`walk_classic.json`, `walk2.mjs`/`walk2.log`, `chain.log`, `perf_review.json`.
Machine: Apple M5 Max, headless Chromium on Metal. **Never quiet**: `uptime` 1-min load 2.9–5.7 throughout (resident `llama-server`, Devin, RDP, Blender outside the swarm; the brief asked for < 3). Every perf number below carries the load at its boot; frame-ms and build-ms are read as same-session ratios only. Draw calls and triangles are load-insensitive.
Rulings read: R64 (Roof Road sandbox keeps `20261113a` until G-R), R66 (§2 world-build rule binds modular only), R67 (kit modules load in Node without a DOM). Judged in §4.

### Verdict: GO (merge to main) — 0 Critical, 1 Important (I1: the budgets.md §2 world-build rule fails on the opt-in modular set, 1.7 × classic; R66 scopes it to the default flip and I agree, players on `main` are classic), 6 Minor.

A player on `main` with default settings runs the same code and sees the same frame: the four classic `game_shot` pairs MAIN vs review commit (street noon, shrine dusk, river night, meadow rain) diff at `maxDelta 0, meanDelta 0, pixelsOver8 0` with identical draw counts; the classic footprint golden, `--systems`, summit, summit-kit-parity and cat goldens are EQUAL; the classic boot console carries only the pre-existing optional `/cad-overrides.json` 404; the cache tag is `20261114a` on every game import (the only `20261113a` left are the two Roof Road sandbox lines R64 reserves for G-R). A save written on MAIN loads on the review commit on both sets with no new key. G1, G2, G3 (including the R67 cadJS check) and G4 are green on this HEAD. The §1 scene budgets and R52 hold at street and meadow on medium and high in my own same-session re-measure (§3); the §2 world-build rule fails on modular, as the chores found (I1).

---

## 1. Classic safety (default flags, default settings)

### Critical
None.

### Important
None on the classic path.

### What changed on the hot files since `a3221d4`, and why it is inert on classic

`git diff --stat a3221d4 98c3a61 -- <§4.5 hot files>`: 25 files. Judged hunk by hunk (tag-only lines filtered):

- `index.html` (1 line), `src/bootstrap.js` (1 line), `src/npc.js`, `src/player.js`, `src/cat.js`: cache-tag lines only (`cat.js` also re-exports the character kit's names; no code path change). `index.html:947` is the one `git diff --check` note: that line ends in CRLF at MAIN and at the review commit alike (`od -c` → `; \r \n` both), the same pre-existing CRLF the G-F and G-V3 chores recorded; not damage.
- `src/main.js` (+66/−36): (a) `init()` resolves the real quality before `preload()` (the G-F I1 fix, already judged at G-V1); (b) `assets.audio?.setSink(...)` maps two kit audio events to today's sounds — on classic the runtime has no instances, so nothing ever emits; (c) `new Sky(scene, { assets })`; (d) the v-ground `bindWorld` loop runs over `city.assetInstances`, empty on classic; (e) `assetEnv()` now also copies `mist`, `sunDir` and the four palette colours — it runs every frame on classic too (`main.js:1536`), but `Sky.resolvePalette()` is cached per frame (`sky.js:575`) and the copy is five small objects, no allocation after the first frame; `assets.update()` returns at once on an empty list (`runtime.js:424`); (f) indoors, `interior.assets.update(...)` — the classic scoped view's `update` iterates an empty list. Frame identity proven by the four pairs below.
- `src/sky.js` (+103/−4): the three classic builder calls go through `placeSkyAsset(id, classicFn)`, which returns `classicFn()` unless the runtime resolves the id modular (`assets.setFor(id) === 'modular'`), quality is not low, and the kit is loaded; `update()` gains `if (this.kit) ...`. On classic `this.kit` is never set. Labs and sheets that construct `new Sky(scene)` get `assets = null` → classic.
- `src/postfx.js` (+72): `AtmospherePass.syncKit()` is called from `updateFromSky()`; with no hook (`sky.kitPostHook()` → null on classic) it compares `fsQuad.material` with the classic material and does nothing. The kit shader is assembled only when a hook exists and the three markers are each found exactly once (null otherwise → classic, with one warning).
- `src/particles.js` (+32/−10): `kitHandles` is empty on classic, so `motionScale()` returns 1 and every `dt*` expression is the original `dt`; the reduce-motion damping touches kit systems only.
- `src/countryside.js` (+9/−3): `TEX`, `MAT` exported; new `export const KIT_TABLES`. Exports only; no builder or `this.random()` touched (valley rng 49,233 draws, hidden 7,810, Math.random 92: unchanged; footprint golden byte-identical).
- `src/vegetation.js`, `src/hidden_places.js`, `src/ambient_life.js`, `src/interior.js`: `scopeAssets(assets, KIT_TABLES)` instead of `{}` (the table is dead on classic); vegetation's kit-tree bake step is behind `isAssetInstance(out)`; interior's `setLightsActive` loops over `assetInstances` (empty); ambient life hands the player/sky to a kit swarm only when `this.butterflies` is null (never on classic). `hidden_places.js` now imports `countryside.js` for `KIT_TABLES`: no cycle (countryside imports none of the four).
- `src/kit/runtime.js` (+10/−8): swap problems routed through `warnOnce`; `createKitAudio()` on construction (`src/kit/audio.js` creates no AudioContext at load; it is a sink registry). `src/kit/materials.js` (+145): helpers for families (`shared`, `tintToward`, `washiTexture`, `litWashi`, …), never imported by classic code.
- `src/mountaintop.js` (−3,249/+209 since MAIN; the s1 facade plus s2/s3/s4/a2 behind it): summit golden EQUAL, routing 32/32, `summit_test` 83/0 output identical to the golden text; `summit_kit_parity` EQUAL (24 colliders, 8 platforms, rng draw equal). The golden still lists the same 9 advisory diffs the lanes recorded (`_tree` gone, `state.assets`) — see M6.
- `labs/shared/game.js`, `labs/registry.js`, `labs/asset_inventory.json`, `catalog/*`, `src/kit/index.js`, the three guide/AGENTS files: not on the player's path.
- Cache tag: `20261114a` on every `src/**`, `index.html`, `labs/shared/game.js`, the preview sheets and `KIT_TAG` (`kit_index --check` in sync, 24 families). Left behind on purpose (R64): `rooftops/js/game.js:90` and `rooftops/js/build.js:17` (`20261113a`) and the archived social-post harness (`20261022e`). `kyoto-rooftops.html` is not linked from the game (M3).
- `settings.js:24`: `assetSet: 'classic'` (default unchanged); `kit-overrides.json` as committed (`edge-forest` classic, R49).

### Evidence (classic pairs, MAIN `a3221d4` worktree vs review commit, same harness, 1280×720, frame 120, `?shot=1&nohud=1&assets=classic`)

| Pair | Query | MAIN calls / tris | Review calls / tris | `--diff` |
|---|---|---|---|---|
| street noon | `hour=12&cam=0,2.4,18.2,0,1,14` | 476 / 5,840,317 | 476 / 5,840,317 | maxDelta 0, mean 0, px>8 0 |
| shrine dusk | `hour=18&cam=0,2.4,-14.8,0,1,-19` | 140 / 4,080,374 | 140 / 4,080,374 | maxDelta 0, mean 0, px>8 0 |
| river night | `hour=22&cam=13.05,2.4,27.08,9,1,28.2` | 325 / 4,427,265 | 325 / 4,427,265 | maxDelta 0, mean 0, px>8 0 |
| meadow rain | `hour=10.5&weather=rain&cam=-14.65,2.4,15.26,-12,1,12` | 458 / 5,505,011 | 458 / 5,505,011 | maxDelta 0, mean 0, px>8 0 (captured twice, both 0) |

Every one of the eight boots: `set classic, loaded false, instances 0, problems []`, `warnings []`, errors only `404 (/cad-overrides.json)`. Cameras are the `perf_spots` follow-camera positions for the four spots (4.2 m behind, 2.4 m up).

```
node tools/footprint_golden.mjs            → EQUAL (179.4 kB byte-identical; 518 colliders · 65 platforms · 5 water rects · 4 exclusions · 25 anchors; valley 49233 draws)
node tools/footprint_golden.mjs --systems  → EQUAL (283.4 kB byte-identical; seam ok, 50 ids routed, classic updates 5/5)
node tools/summit_golden.mjs               → EQUAL (summit_test 83 passed, output identical; 9 advisory entries, M6)
node tools/summit_kit_parity.mjs           → EQUAL (classic and modular: 24 colliders, 8 platforms, rng 0.8436442203819752)
node tools/cat_golden.mjs                  → EQUAL, 40 passed, 0 failed
classic boot (walk.mjs, autostart new, 1,323 frames, 19 s of input): errors = [cad-overrides.json 404], warnings = []
```

## 2. Saves (the G-C drill on the final tree)

`boot.mjs` (the chores' script, copied to scratch) on the MAIN worktree: autostart new, set pos (5.5, 0, −8.25), heading 1.25, yaw 0.5, xp 137 rank 1, score 7, collected [probe-a, probe-b], dayTime 15.5, `saveGame()`, dump `localStorage.catwalk_save_v2`. Payload keys (31): `x,y,z,safeX,safeY,safeZ,heading,yaw,score,collected,xp,rank,quest,completed,npcGreeted,dayTime,weather,hasSecretKey,isSecretHouseUnlocked,fishEaten,nestInteracted,corralRewardCollected,toriiMessageSeen,drinkCount,freshWaterAchievement,journal,worldFlags,restVisited,slowBlinked,gifted,version`.

| Load on the review commit | Result |
|---|---|
| `?assets=classic`, autostart continue | pos [5.5, 0, −8.25], heading 1.25, yaw 0.5, score 7, xp 137, rank 1, collected [probe-a, probe-b], dayTime 15.50, weather clear; set classic, instances 0; warnings []; errors only the 404 |
| `?assets=modular`, autostart continue | the same state; set modular, loaded, **261 instances**; warnings []; errors only the 404 |

No new key is required (the MAIN payload restores everything on both sets). **Green.**

## 3. Performance (same session, `perf_spots`, classic vs `?assets=modular`)

```
node tools/perf_spots.mjs --tiers medium,high --spots street,meadow --boots 2 --rounds 3 --url-suffix "" --url-suffix "?assets=modular" --out perf_review.json
```
Spots: **street** (the chores' worst frame regression on both tiers) and **meadow** (their second, +1.75 ms on high, and the spot where the ground family and the grass meet). Apple M5 Max, Metal, 1200×750, hour 10.5, 8 boots interleaved, 2026-11-15 00:30–00:35. **Load at boot starts 4.2–8.8** (1-min; the classic medium boot 2 started at 8.83 — the heaviest of the run — which flatters the classic/modular build ratio on medium). `uptime` before 4.55 / after 5.34. Not the quiet machine the brief asked for (M4): draws and triangles are the hard evidence; frame and build ms are same-session ratios.

Per-frame means and amortised frame ms (medians of two boots):

| Spot | Tier | Classic calls / tris / ms | Modular calls / tris / ms | Rule | Result | perf_gv3.md (chores) |
|---|---|---|---|---|---|---|
| street | medium | 577 / 5.96 M / 11.80 | **432 / 5.69 M / 12.57** | ≤ classic high (776 / 8.15 M / 17.50) | holds | 442 / 5.75 M / 13.10 ≤ 768 / 8.12 M / 15.85 |
| meadow | medium | 558 / 5.64 M / 11.32 | **434 / 5.39 M / 11.93** | ≤ classic high (732 / 7.53 M / 16.85) | holds | 433 / 5.39 M / 11.57 ≤ 732 / 7.53 M / 15.75 |
| street | high | 776 / 8.15 M / 17.50 | **586 / 8.83 M / 18.85** | ≤ 1.2× / 1.3× / 1.2× | 0.755 / 1.083 / 1.077 holds | 0.76 / 1.085 / 1.10 |
| meadow | high | 732 / 7.53 M / 16.85 | **581 / 8.24 M / 18.45** | ≤ 1.2× / 1.3× / 1.2× | 0.794 / 1.094 / 1.095 holds | 0.79 / 1.094 / 1.11 |

R52 (modular draws ≤ classic on the same tier): street 432/577 medium, 586/776 high; meadow 434/558, 581/732 → **holds**, −145 / −190 and −124 / −151 calls a frame. Frame deltas modular − classic: street +0.77 medium / +1.35 high, meadow +0.61 / +1.60 ms (chores: +1.67 / +1.65, +0.55 / +1.75): same sign and size, inside the boot spread. Render-only (GPU) modular − classic: street +1.35 / +1.64, meadow +0.99 / +1.62 ms, consistent with the chores' attribution (ground ≈1, water ≈0.6, fences ≈0.6 at street high). Calls and triangles reproduce `perf_gv3.md` within 2 % on every row (e.g. modular street high 586 vs 583, 8.83 vs 8.81 M; classic 776 vs 768). **Section 1 and R52: every rule holds at both spots on both tiers. Per-asset triangles: contract 0 failed (§8).**

World build (same session, 2 boots per set and tier):

| Tier | Classic ready / build / boot total | Modular ready / build / boot total | Ratio build (rule ≤ 1.25 ×) | Boot total Δ (rule ≤ +1,000 ms) | perf_gv3.md |
|---|---|---|---|---|---|
| medium | 2,116 / 1,477 / 2,889 ms | 2,846 / 2,124 / 3,612 ms | **1.44 ×** fails | +723 holds | 1.72 ×, +1,202 |
| high | 2,045 / 1,444 / 2,813 ms | 3,326 / 2,511 / 4,119 ms | **1.74 ×** fails | **+1,306** fails | 1.74 ×, +1,219 |

The §2 rule fails on modular in my session too (medium looks better than the chores' only because that classic set booted under the run's worst load, 8.8). High reproduces the chores' 1.74 × exactly. Classic's own build (1,444–1,477 ms) is in the range the chores measured for integration classic (1,316–1,389 at lower load) and under MAIN classic at comparable load (1,744). → **I1**; owner a1-village (R66).

**Verdict on the brief's item 3: the numbers match `perf_gv3.md`; the scene budgets and R52 hold; the world-build rule fails on modular (Important, scoped by R66).**

## 4. Lane spot-checks (AAA-1…AAA-10) and the three rulings

I picked **v-ground** (the brief's fixed one) and **v-sky**. Sky because it is the wave-2.3 lane with the largest footprint on hot files that every classic player executes every frame (`src/sky.js` +103, `src/postfx.js` +72: a new material-swap seam inside the atmosphere pass), because its R67 fix (`night.js` module-level maths) is one of the two cadJS-breaking causes, and because the v-water/v-weather cost is already attributed in `perf_gv3.md` while the sky's own frame cost was only ever measured in-page by the lane.

### 4.1 v-ground (`src/kit/ground/`: field, glsl, layers, material, valley, road, slabs, index — 3,176 lines with sky; classic `countryside.js` ground/path/shoulders)

| AAA | Finding |
|---|---|
| 1 | L6 pairs (64 JPGs, `docs/fable/status/v-ground/`; read `valley-ground-low-18`, `path-low-18`) and my dusk captures (§4.3): at 0.35 m the nobedan reads as cut and natural stones with a lit rim and a painted joint, the meadow floor keeps the classic vertex tint under the grass (the `valley-ground` pairs are near-identical by design), the shoulders are worn earth with kicked gravel. No box tells. Met; tone note in M1. |
| 2 | Contract bearing passes (ground family inside the full run: 11,894 checks, 0 failed); swapped-alone road and shoulders sit 1 cm / 0.6 cm under the classic ribbons so the 2 cm bearing test holds (status file). Met. |
| 3 | Parts `terrain` / `road` / `shoulders` / `stones_light|dark|warm`; legacy group names kept (`Village Ground`, `Cobbled Path`, `Earthen Shoulders`). Met. |
| 4 | `TIER_DEFINES`: hero all; mid drops POM, puddles, rain rings; far drops the hex sampler; `setTier` re-defines the live material. Chosen once at build (medium → mid). Met. |
| 5 | `update(env)`: `env.wet` → wet / spec / water level, `env.snow` → cover, `env.mist` → dew (main.js now sends mist), sun from `env.hour`. Lantern light through the Lambert/Standard chain. Met; see M1. |
| 6 | Heights and walk heights unchanged: the terrain mesh record is string-equal to the classic one in the modular digest (status), walk heights come from `Countryside.groundAt`, never the mesh. My own proof: the modular and classic walks (§5) put the cat at the same heights on the same inputs (street y 0, bridge deck y 1.08 at z 27–34, river y −0.3), and the footprint counts are classic (518 / 65 / 5 / 4 / 25, rng 49,233) on `?assets=modular`. Live wear: `ground_wear_test` 14/0 (classic mask untouched by walking; modular meadow 255 → 0 near walked lines, lawns never, heals byte-exact). Met. |
| 7 | `BUDGET_EXCEPTIONS['valley-ground']` hero/mid 45,000 (= the classic 150×150 plane), far 5,000, far warm build 2 ms, with the measured `why`. Contract 0 failed at load 4.4–5.3 (so the far 2 ms watch in the ledger did not trip here). Draws −2 / −302 tris at every spot (status table; my dusk capture 372 → 370 calls, 4,202,769 → 4,202,467 tris). Met. |
| 8 | Two builds hash equal; heights/field cached per segment count; no `Math.random` (kit_check). Met. |
| 9 | Params `paving` etc. round-trip; dispose clean (contract). R67: `valley.js:31` imports `countryside.js` only where `document` exists (top-level `await import`), `material.js:263` patches `lights_fragment_begin` inside its own shader string (not the global chunk) on first compile. `cd cadJS && npm run check` → 15/15 + 16/16. Met. |
| 10 | Inventory rows, coverage (`labs_check` direct 152), catalog 50/0. Met. |

### 4.2 v-sky (`src/kit/sky/`: clouds, field, night, state, index; classic `src/sky.js`, `src/postfx.js`)

| AAA | Finding |
|---|---|
| 1 | L6 pairs (28 JPGs; read `clouds-18`, `stars-22`, `moon-22`) and my dusk/night captures (§4.3): lobed wata-gumo with cream crowns and cool bellies, warm on the sun side at 18 h; at night dim silhouettes, stars gone behind the thick bodies, a painted crescent with earthshine and glow. The classic sprites are blurred billboards by comparison. Met. |
| 2 | Sky objects float by nature; `floating: ['deck'] / ['points','band'] / ['disc']` declared. Contract passes. Met. |
| 3 | `asset:clouds/deck`, `Stars/points|band`, `Moon/disc`; `legacyName` 'Stars' / 'Moon'. Met. |
| 4 | Three tiers per asset (hero 3 slices + veil + 5-tap shade + shafts through gaps; mid 2 slices 1-tap; far 1 slice no shade; stars 1,600/960/420; moon ring/glow/glow). One instance around the cat, no in-scene handover. Met. |
| 5 | Weather genera crossfade (cloudy, rain, snow, mist), wind drift, moonlight on clouds, the deck dims the shafts and the sun haze when it covers the sun (`post.sunOcclusion`), the cloud shade rides inside the atmosphere pass with no new pass or target. Met. |
| 6 | Empty footprint (the classic sky registers none); goldens EQUAL classic and swapped; the Sky burns the classic builders' `Math.random` draws (26 / 2,100 / 0) so `?shot=1` streams stay aligned on both sets. Met. |
| 7 | clouds 760 / 480 / 264 tris, stars 1,152 / 512 / 0, moon 2; ≤ 2 meshes; warm ≤ 0.6 ms; draws ≤ classic at the four spots both tiers, day and night (status). My captures: sky-only swap 560 → 547 calls at dusk, 327 → 317 at night (+734 / +1,888 tris). Met. |
| 8 | `ctx.rng` only; field and moon textures cached per seed/phase; contract hashes equal. Met. |
| 9 | Params with ranges (`visual: false` on the update-only ones); dispose frees private materials; `dropKit()` reverts a live session to classic when quality drops to low and the post pass frees its kit shader. R67: `night.js:47 bandAxes()` memoised, no module-level THREE maths. Met. |
| 10 | Inventory + production rows; the six deferred ids (`sky-dome`, `sky-light`, `god-rays`, `ao`, `atmosphere`, `grade`) are listed with reasons in the status file and in the §6 board notes. Met. |

### 4.3 My own captures (headless Metal, 1280×720, `?shot=1&nohud=1`, cat height 0.35 m, only the lane's ids swapped; classic twin from the same camera)

| Capture | Query | What it shows |
|---|---|---|
| `ground_dusk_swap.png` / `_classic.png` | `hour=18&cam=0.6,0.35,6,0,0.3,14&swap=valley-ground:modular,path:modular,path-shoulders:modular,path-slabs:modular` | Modular: nobedan stones with a warm lit rim and dark joints running to the bridge gap, shoulders painted into the same ground (no ribbon edge), the meadow floor unchanged. Classic: the warm-brown cobble texture and the separate shoulder strip. `--diff` maxDelta 182, mean 17.5, 345,575 px > 8 — the road and shoulders only. Calls 372 → 370, tris −302. `set classic, instances 4, problems []`, warnings []. AAA-1/5/6/7 met; the modular paving reads lavender-grey at dusk where classic reads warm (M1). |
| `ground_dusk2_swap.png` | `hour=18&cam=-3.2,0.35,10,-1.2,0.2,16&swap=<same>` | The meadow edge at cat height: grass and flowers on the kept classic tint, the lane's road beyond, the lantern post. No seam between meadow and road paint. |
| `sky_dusk_swap.png` / `_classic.png` | `hour=18&cam=0,0.35,8,0,6,-30,70&swap=clouds:modular,stars:modular,moon:modular` | Lobed painted clouds over the street, warm sun side, far ones sinking into the haze; the street itself identical to classic (the classic twin shows the soft sprite clouds). Calls 560 → 547, tris +734; `--diff` maxDelta 115, mean 8.0, 165,574 px > 8 — the sky only. |
| `sky_night_swap.png` / `_classic.png` | `hour=22&cam=0,0.35,-10,0,8,-40,70&swap=<same>` | Night deck silhouettes with a silver edge, stars between them and none through the thick bodies, the shrine lanterns lit below (classic lanterns: only the sky is swapped). |

### 4.4 The rulings

- **R66 (§2 world-build rule binds modular only; blocks the default flip, not G-V3).** Agreed. Players on `main` run classic (`settings.js:24`), `low` never loads the kit, and classic's own build time is not slower than MAIN's (the chores measured MAIN classic 1,744 ms vs integration classic 1,316–1,389 ms under similar load). The only player who pays the +1.2 s is one who opts into modular in the settings menu. It stays a failing budget rule, so it is recorded here as I1 with the owner the ruling names.
- **R67 (kit modules load in Node without a DOM; fix in the families).** Agreed and verified: `cd cadJS && npm run check` → modules ok, 15/15, 16/16; `cd catalog && npm test` → 50/0; the ground family still builds (contract 0 failed; `ground_wear_test` 14/0; the modular boot has 261 instances). The fix pattern (`valley.js:31` top-level `await import` guarded on `document`) is sound in the browser because `countryside.js` is already in the module map when the kit loads; I note it makes every browser page that imports `src/kit/index.js` (catalog, labs kit page) evaluate `countryside.js` — which the static import did before too, so nothing new.
- **R64 (Roof Road sandbox keeps `20261113a` until G-R).** Agreed with the ledger's own cost line, restated as M3: the game never links `kyoto-rooftops.html`, so no player of `main` is affected; a returning visitor of the sandbox may load a cached `src/cat.js?v=20261113a` whose own imports resolve to cached `20261113a` modules (a consistent old cat) or, if partly evicted, to the new files under the old query — a sandbox-only mixed load until G-R. Leaving players no worse off.

## 5. Modular as a whole (`?assets=modular`, autostart new, keyboard input through Playwright)

`walk.mjs` (scratch): boot, 60 frames, then W 7.5 s, S 4.5 s, A/D 9 s, sampling the position every 1.5 s; then `interior.transitionToInterior()` / `transitionToExterior()`; then `sky.dayTime = 21.2` and 5 s.

| | modular | classic (same script, same session) |
|---|---|---|
| boot | 4,533 ms; set modular, loaded, 261 instances, 24 families, quality high, problems [] | 3,187 ms; classic, 0 instances |
| street → bridge | z 0 → 6.8 → 13.6 → 20.3 → 27.1 (y 1.08, on the deck) → 33.9 (y 1.08) | 0 → 6.75 → 13.5 → 20.2 → 27.0 (1.08) → 33.8 (1.08) |
| off the far end, into the river | y 0.83 → −0.3, `inWater`, swimming at x ±1.2, z 32–33.6 | the same, within 0.1 m |
| frames rendered during the 21 s of input | 1,322 | 1,323 |
| console after the walk | warnings 0; errors 1 (the `cad-overrides.json` 404) | the same |
| interior | kit room instances 2 (1 with `setLightsActive`) — see the note below | 0 |
| night (hour 21.2) | `city._lanternsLit` true; 25 kit lantern instances; 11 lit materials, `uGlow` max 2.30 (noon base 0.12), halo opacity max 0.55; 4 point lights on; kit sky clouds/stars/moon present | lanterns lit; 4 point lights on; no kit |
| end | 261 instances, problems [], no update disabled | — |

The two traces are the same path to within 0.1 m with identical heights: the modular ground, bridge and water keep the classic walk geometry (AAA-6 for ground and water). The runtime warned about nothing: **no missing-bound-part lines** on the whole 261-instance boot, and `problems: []` before and after. Night lanterns kindle on the kit (`lampUpdate`, `src/kit/lanterns/light.js:60`, reads `env.hour` and `env.lanternOn`).

Interior note: calling `transitionToInterior()` from the console places the cat on the enter anchor, and the exit-zone latch in `context_actions.js:818-825` (`!_doorLatch && localZ > exitZone.minZ`) fires `transitionToExterior()` on the next update because the latch was never set by a door approach — so the first run read `isInside false` 4 s later, standing at the exterior door spawn (18.28, 0, 5.28), on classic and modular alike. That is the game's door logic, not a regression; the second run samples the flags over time:

`walk2.mjs` (`?assets=modular`, 261 instances, quality high; load 5.0–6.3): W 7 s → the bridge deck (0, 1.08, 31.5); fourteen A-then-W taps to turn the follow camera → off the deck into the river (x 3–5, y −0.3, swimming), out onto the east bank (y 0, z 25.9), back along the street (z 15.5–26) and onto the west verge (x −3.0, z 17.8–22.8: the meadow's edge, not the open meadow at (−12, 12) — a held key turns the cat with the camera, so the keyboard alone cannot be aimed at a point; the three zones street, bridge and river/meadow-edge were crossed). 1,804 frames, **0 warnings**, errors only the 404, `problems []` before and after. Tea house sampled: at 300 ms transitioning; at 700 ms `isInside true` at the room (0, 100, 2.6), the 2 kit room instances present; at 1,200 ms outside at the door spawn (18.28, 0, 5.28) — the exit-zone latch, as read in the code (M5). Night: lanterns lit, 25 kit lantern instances, 11 lit materials `uGlow` 2.30, halo 0.55, 4 point lights. **Modular boots, walks, swims, climbs out, enters and leaves the room and kindles its lanterns with a clean console.**

## 6. Deferred work is recorded where the next lanes will see it

- §6 board notes (G-V2 and G-V3): every id-level deferral with its reason (`village-street`, `tree-trunks`/`tree-canopies`, `scent`/`splash`/`landing-dust`, `summit-wildlife`, the six v-sky ids, c2 `bow` + shadow, offering bells, `edge-forest` pinned classic), lab features not promoted by choice (v-ground, v-water), the two G-V3 reds with owners and the R66/R67 text. Checked against the lane status files' "Deferred assets" sections (v-weather, v-water, v-sky, v-ground, v-trees handoff §DEFERRED): nothing silently dropped.
- `budgets.md` §2: the open world-build item with owner `a1-village` and the six first builds; §5 "Known over-budget build times": method, watch list, the flakes, and the proposals (exceptions no longer needed) — not applied, correctly left to a1.
- `perf_gv3.md`: the attribution (ground ≈1 ms GPU, water ≈0.6, fences ≈0.6).
- `briefs/a1-village.md` "Integrator additions": R66 ownership, frame-time polish, R62 summit audio, the v-ground minors (heap, upload churn, palette copy, sun path, interpolation), §5 exception drops, R67 constraints; the v-trees maple/wind minors and the v-critters night butterflies in "Area specifics". The one v-trees doc minor from the ledger (handoff wording) is not in the brief (M2).
- Ledger: R51 (fence mid exception) → a1; R62 → a1; `valley-ground` far 2 ms watch → a1.

## 7. Findings

### Critical
None.

### Important

**I1 — The budgets.md §2 world-build rule fails on the modular set (1.72 × / 1.74 × classic; rule 1.25 ×, boot ≤ +1.0 s).** Measured by the chores (`perf_gv3.md`, 4 boots per set) and re-read in my session (§3). Classic and `low` are unaffected, so it does not touch what `main` ships — R66 is right to scope it to the default flip — but a budget rule is failing on a tree that goes to `main` with the modular set reachable from the settings menu, so it stays an Important with an owner, not a note. Owner `a1-village` (already briefed: `valley-ground` ≈200 ms, `clouds`, `moon-pool`, `corral-sign`, `street-bushes`, `moon`; ≈420 ms of first builds on medium). Must close before G-FINAL.

### Minor

**M1 — The modular paving reads lavender-grey at dusk where the classic cobbles read warm brown** (`path-low-18` L6 pair; my `ground_dusk_swap` vs `_classic`). The nobedan takes the dusk sky's cool light through its wetness/spec terms more than the classic texture did; at noon the pair is close. Inside AAA-5 (it responds to the sky), but the street's warmth at golden hour is part of the game's look. Owner: `a1-village` (the `paving` param and the lane's palette copy, which a1 already owns as a minor).

**M2 — `docs/fable/handoff/v-trees.md:23` still says `tree-trunks` / `tree-canopies` "are promoted and pass the contract", while line 72 and the §6 notes say DEFERRED.** Ledger line 236 deferred this wording fix to a1-village, but the a1 brief does not carry it. Doc-only; one sentence. Owner: Integrator glue or a1.

**M3 — R64 leaves `rooftops/js/game.js:90` and `build.js:17` on `20261113a` on `main`.** Sandbox-only exposure (see §4.4). Owner: G-R chores (the bump is already assigned there).

**M4 — My perf re-measure ran at load 4–5, not the quiet machine the brief asked for.** The same-session ratios (§3) match `perf_gv3.md`'s within the boot spread, and the chores' own run was at 1.5–5.5, so the verdict rests on draws/triangles (load-insensitive) and on ratios, not on absolute ms. A truly idle run (load < 2) still does not exist for G-V3; a1-village's R66 proof should be it. Owner: a1-village (already told to record load).

**M5 — Entering the tea house from the console (or any test) without the door approach exits again on the next update** (`context_actions.js:818`: the exit-zone latch is armed only by a door approach). Not a regression and not player-visible (players arrive through the door), but the G4 "interiors enter/exit" check in the gate briefs needs the door approach or a latch reset to be meaningful; worth a line in the next gate brief. Owner: Integrator (brief text).

**M6 — `tools/summit_golden.mjs` still prints 9 advisory differences** (`builders.calls._tree` gone, `state.assets`, two `api[]` entries) that have been there since the s1 split and were never refreshed with `--write`. Verdict-neutral by design, but every reader has to re-learn that. Owner: the next summit lane (`a2-hilltop` is complete; `z-final` otherwise), one `--write` with the reason in the commit.

### Judged and found clean
- `assetEnv()` on classic every frame (main.js:597-614): per-frame cached palette, five copies, no allocation after frame one; the pairs are pixel-identical and the classic draw counts match MAIN at all four spots.
- `Particles.motionScale()` reads `document.body.classList` inside try/catch and only when a kit handle exists; classic `dt` paths are the original expressions.
- `Sky.placeSkyAsset` burns the classic `Math.random` draws only on the modular path, after the kit build, so the `?shot=1` streams stay aligned (modular footprint digest: `Math.random 92` = classic).
- `InteriorManager.setLightsActive` and the per-frame `interior.assets.update` indoors: empty lists on classic.
- `hidden_places.js` → `countryside.js` import: no cycle; evaluation order unchanged (countryside is imported first by main.js).
- The modular footprint digest: `DIFFERENT (60 changed, 657 added, 403 removed)` with colliders 518, platforms 65, water rects 5, exclusions 4, anchors 25 and the valley rng at 49,233 draws — the same counts the chores recorded; first changed builders `buildRipplePool` (24 → 25 objects) and `buildMoonPool` (48 → 28), the recorded v-water/v-hidden swaps.
- Contract: 140 assets, 420 asset×tier builds, 11,894 checks, **0 failed** at load 4.4–5.3 (11.6 s); merge OK (237 → 285 → 240); self-test OK (12 fixtures each fail as they should). The warm-build flakes the chores saw under load did not appear.
- `git diff --check a3221d4 HEAD`: only `index.html:947` (CR, pre-existing). Working tree clean before and after the review; no tracked file touched; one scratch worktree created (`_scratch/gate-v3-review/main-wt`), none removed.

## 8. Evidence (command → result), this checkout, 2026-11-15 00:19–00:5x, load 2.9–5.7

G1 (`g1.log`)
```
node tools/check_syntax.mjs              → All 170 modules OK
node tools/verify.mjs                    → kit 446 passed; kit_test 36/36; All checks passed
node tools/kit_check.mjs                 → All kit checks OK (446 passed)
node tools/kit_index.mjs --check         → OK src/kit/index.js in sync (24 families, tag 20261114a)
node --test tools/kit_test.mjs           → pass 36, fail 0
node tools/labs_check.mjs                → All labs checks OK (direct 152, review 19, embedded 2, related 10, missing 3)
node tools/cad_overrides_test.mjs        → 27 passed, 0 failed
cd cadJS && npm run check                → server/catalog/agent/asset modules: ok; 15/15 tests passed; 16/16 tests passed   (R67)
cd catalog && npm test                   → pass 50, fail 0
git diff --check a3221d4 HEAD            → index.html:947 trailing whitespace (the CRLF line, identical at MAIN)
grep -rn '?v=2026' … | grep -v 20261114a → rooftops/js/game.js:90, rooftops/js/build.js:17 (R64), docs/social/…/capture.js:16 (archived)
```
G2 (`g2.log`, `shots.log`)
```
node tools/footprint_golden.mjs                             → EQUAL
node tools/footprint_golden.mjs --systems                   → EQUAL
node tools/footprint_golden.mjs --query "?assets=modular"   → DIFFERENT (60 changed, 657 added, 403 removed); 518/65/5/4/25; valley 49233 draws
node tools/summit_golden.mjs                                → EQUAL (summit_test 83 passed, output identical)
node tools/summit_test.mjs                                  → 83 passed, 0 failed
node tools/summit_kit_parity.mjs                            → EQUAL
node tools/cat_golden.mjs                                   → EQUAL, 40 passed, 0 failed
node tools/ground_wear_test.mjs                             → 14 passed, 0 failed
node tools/rooftop_test.mjs                                 → 40 passed, 0 failed
node tools/kit_contract_test.mjs                            → 140 assets, 420 builds, 11894 checks, 0 failed; merge OK; self-test OK
node tools/game_shot.mjs … (8 classic boots, MAIN vs review) → four pairs maxDelta 0 (§1)
```
G3: catalog 50/0, cadJS 15/15 + 16/16 (above); the chores' catalog_check / labs_coverage / dawCAT / interiors / ranges / swap-matrix results at `ff8e8e7` stand (no file they read changed in `4f17ccd`/`98c3a61` except `night.js`, `valley.js`, `material.js`, which the contract, wear test and boots above cover).
G4: classic and modular boots with 21 s of keyboard input (§5), both console-clean apart from the 404; save drill (§2); lane captures (§4.3).

## 9. Deferred-minor triage

| # | Owner | When |
|---|---|---|
| I1 world build on modular | `a1-village` (R66) | before G-FINAL; proof = `perf_gv3.md`'s command on a quiet machine with load recorded |
| M1 dusk paving tone | `a1-village` | with the ground frame-time/palette work |
| M2 v-trees handoff wording | Integrator glue or `a1-village` | next touch of `docs/fable/handoff/v-trees.md` |
| M3 Roof Road sandbox tag | G-R chores (R64) | at G-R |
| M4 quiet-machine perf | `a1-village` | the R66 proof run doubles as it |
| M5 interior check needs the door approach | Integrator | next gate brief (G-R/G-A) |
| M6 summit golden advisory refresh | `z-final` (or any summit lane) | one `--write` with the reason |
