# Gate G-V1 review — wave 2.1 props merged — Reviewer: Fable

Checkout reviewed: `/Users/c1t1zen/Documents/GitHub/michi-wt/review-gv1` (detached, HEAD `6e23ffa`, `fable/integration` after the G-V1 chores), read-only.
Last main merge: `414225f` (gate G-F). Hot-file diffs judged with `git diff 414225f..6e23ffa -- src/*.js index.html` (77 commits: s1-summit-split, the eight wave-2.1 lanes, v-pagoda, G-F fixes, G-V1 chores).
Integrator rulings committed after this HEAD and read from `michi-wt/integration`: R51 `d54e804` (bamboo-fence mid exception), R52 `a4d1f7f` (material-cap rule). Judged below (§4); the checkout itself does not contain them.
Scratch: `/Users/c1t1zen/Documents/GitHub/michi-wt/_scratch/gate-v1/` (`g1.log` static checks, `g2.log` goldens + contract, `shots.log` classic pair, `shots2.log` + `shots/` my dusk captures, `perf_review.json/.log`, `footprint_modular.json`, `base414225f/` a `git archive` of the last main merge).

### Verdict: PASS (tick G-V1) — 0 Critical, 2 Important (both pipeline rules for wave 2.2, neither touches the classic path), 7 Minor.

A player on `main` with default settings sees no change: the valley, systems, summit and cat goldens are EQUAL, a classic `game_shot` pair against a build of `414225f` diffs at `maxDelta 0`, and the classic boot is console-clean apart from the pre-existing `cad-overrides.json` 404. G1, G2 and G3 are green on this HEAD; the scene budgets hold on modular at medium and high in my own same-session re-measure (§3). Both spot-checked lanes (fences, alley) meet AAA-1…10 on the evidence. The two Important findings are rule/enforcement gaps that every wave-2.2 lane will read or trip on; they are fixes on `fable/integration`, not reasons to hold the gate.

---

## 1. Classic safety (default flags, default settings)

### Critical
None.

### Important
None on the classic path.

### What changed on the hot files since `414225f`, and why it is inert on classic

- `src/countryside.js` (+9/−3): `TEX`, `MAT` exported; new `export const KIT_TABLES = { MAT, textures: TEX }`. Exports only; no builder, no `this.random()` call touched (valley rng probe: 49,233 draws, unchanged; footprint golden EQUAL).
- `src/vegetation.js`, `src/hidden_places.js`, `src/particles.js`, `src/ambient_life.js` (+5/−3 each): `scopeAssets(assets, KIT_TABLES)` instead of `scopeAssets(assets, {})`. On classic `scopeAssets(CLASSIC_ASSETS | null, …)` returns `CLASSIC_ASSETS` regardless of the table (runtime.js), so the second argument is dead on the classic path. No circular import: `countryside.js` imports none of the four.
- `src/main.js` (+9/−4, G-F fix I1): `init()` now sets `this.resolvedQuality = this.settings.resolveQuality()` and `assets.setQuality()` before `preload()`; `Player` receives `resolvedQuality` instead of `initialQuality`. `Player` uses that value only inside `michiIsModular(assets, quality)` (`src/characters/defs/michi.js:28`), which is false whenever `assets.setFor('michi') !== 'modular'`, i.e. always on classic. The renderer/pixel-cap/MSAA choices still read `initialQuality` (`main.js:154-183`), unchanged.
- `src/mountaintop.js` (−3,249/+205): the s1-summit-split facade. The summit golden (recorded from the unchanged code at `41eb25a`; since then only the GLB URL tag strip `01c745e` and new `summit_test.txt` lines `2ae5b88`) is EQUAL, routing self-test 32/32, `summit_test` 83/83.
- `index.html`: no diff.
- `tools/golden/valley_classic.json`, `systems_classic.json`, `cat` golden: not modified since `414225f` (so EQUAL means equal to the G-F state).
- Cache tag: `20261113a` on all 178 import lines (src, kit, summit, index.html, labs/shared/game.js, rooftops) — no bump since G-F, as R44 requires for a non-main gate.

### Evidence
```
node tools/game_shot.mjs --query "hour=10.5&cam=0,4,-6,0,1,0&nohud=1&shot=1&assets=classic"   (at 414225f export, then at 6e23ffa)
  both: calls 449, triangles 5,102,973, set classic, loaded false, instances 0, problems []
  errors: only "404 (/cad-overrides.json)"; warnings: none
--diff → {"maxDelta":0,"meanDelta":0,"pixelsOver8":0}
node tools/footprint_golden.mjs            → footprint golden: EQUAL
node tools/footprint_golden.mjs --systems  → footprint golden: EQUAL
node tools/summit_golden.mjs               → summit golden: EQUAL (routing 32 ids, single swaps 32/32)
node tools/cat_golden.mjs                  → cat golden: EQUAL, checks 40 passed, 0 failed
```

## 2. Lane spot-checks (AAA-1…AAA-10)

I picked **v-fences** and **v-alley**: fences because it is the family with the only per-asset budget overrun on a real layout (R51), the family most touched by the G-V1 material reconciliation (sign post, sign board, shared cord/bamboo), and the one whose footprint carries progression gameplay (fence colliders are jump gates, the `fenceWalk` platform, Larry's patrol bounds); alley because the climb crates are the one wave-2.1 prop whose collider tops are gameplay the cat stands on, and its meshes are entirely rebuilt (slatted crates and a lathe barrel instead of boxes and a cylinder).

### 2.1 v-fences (`src/kit/fences/`: fence.js, corral.js, sign.js, culm.js; classic `countryside.js:3243-3425`)

| AAA | Finding |
|---|---|
| 1 | L6 pairs (`docs/fable/status/v-fences/`, 24 JPGs, every pair differs by `cmp`) and my own dusk captures (§2.3): node-swollen culms, straw tone with per-culm variation, cord lashings at each rail crossing, corner posts, a capped and framed sign. Reads as bamboo at 2 m; no box tells. Met. |
| 2 | Contract bearing raycasts pass (300 checks, 0 failed); verticals stand on y=0, rails and knots lie on the verticals. Met. |
| 3 | Parts `culms`, `knots` / `corner_posts`, `lashings` / `post`, `board`, `face`, `cap`, `lashing`; `legacyName` 'Takegaki Fence' / 'Corral Warning Sign' (quest/sign lookups keep working). Met. |
| 4 | Three tiers (`craft.js TIER_CULM` 5/4/0 nodes, 7/5/4 radial; knots dropped on far; far sign uses the dark wood). Tier chosen once at build (§3.3), so no pop by construction. Met. |
| 5 | Kit materials carry the shared wet/snow uniforms (`KitMaterials._paint`), Lambert-lit with the valley; the sign face is lit paper (the classic one was an unlit `MeshBasicMaterial`). At 18 h the modular fence reads lighter than the classic dark-timber verticals (the lane recorded this). Met; see M6. |
| 6 | Every instance's footprint is `layout.footprint` (R12): `layoutBambooFence` collider, the `fenceWalk` oriented platform, the `bambooFences` list entry, the corral exclusion and Larry's `bounds` are built by the layout step, which the kit never touches. Modular digest: colliders 518, platforms 65, exclusions 4, anchors 25, water rects 5 = classic. Met. |
| 7 | Contract (3.4 m sample): hero 7,504 / mid 4,200 / far 192 tris ≤ 25k/6k/1k. The valley's six village-gap runs (`Takegaki Fence 1–6`, x≈±4.1, up to 11.0 m) build **12,660 at mid** (hand-checked from the code: 71 culms × 120 + 138 knots × 30), over the 6,000 cap and under R51's 13,000; hero 22,638 ≤ 25,000; far 568 ≤ 1,000. Scene budgets hold (§3). Met under R51; see **I1**. |
| 8 | Two builds hash equal; tilts come from the layout; `rng` only for culm tints and knot spin. Met. |
| 9 | Params `finish`, `thickness`, `lean`, `lashing` / `post_height`, `post_radius`, `finish` / `height`, `cap` round-trip; dispose leak check clean (the sign face map is a module-level shared texture, by design). Met. |
| 10 | Inventory rows present (`corral-sign` gained a direct `fences/corral-sign` study); production adapter ids recorded in `docs/fable/handoff/_production_adapters.md:7`; catalog_check and labs_coverage OK. Met. |

Materials: fence/corral/sign post on `KIT_SHARED.bamboo` (straw) with colour in vertex colour (`tintToward`), knots and lashings on `KIT_SHARED.cord`, sign cap/far sign on `darkWood`, board on classic `MAT.timberLight` (loses kit wetness/snow — M4), face on a private `paper` map. All merge-able (plain indexed meshes from `bake()`), no InstancedMesh (R36). The `cord` material carries 58,688 triangles valley-wide at high — the knots are a third of every fence's triangles.

### 2.2 v-alley (`src/kit/alley/index.js`; classic `countryside.js:2062-2144`)

| AAA | Finding |
|---|---|
| 1 | Slatted crates with dark cores, lid boards, corner posts and hero battens; the barrel is a lathe with hoops and a crest. L6 pairs (16 JPGs, all differ) and my dusk capture (§2.3) read as crates at 2 m. Met; see M2 for the barrel pair's framing. |
| 2 | Bearing passes (153 checks); every crate's outer box equals the classic one, so the stack bears exactly as before. Met. |
| 3 | Parts `stack` / `barrel`; group named 'Climb Crates' through `legacyName`. Met. |
| 4 | Courses 4/3/1 by tier, barrel segments 24/14/8, hoops dropped on far. Met. |
| 5 | `KIT_SHARED.crate` (`bag` with grime at the foot) carries wet/snow; lit by the valley. Met. |
| 6 | `STACK` sizes and offsets are identical to `layoutClimbCrates` (0.9/0.65/0.9 at ±0.5; 0.85 at −0.45,0.975; 0.75 at −0.4,1.625,−0.3); the platforms (tops 0.70/1.33/1.98, shrunk 0.05) come from the layout step. Barrel belly ≤ r 0.38, h 0.75 like the classic cylinder; no collider (as classic). Platforms 65 = classic. Met. |
| 7 | Contract within caps (crate material valley-wide 7,840 / 4,824 tris); 1 mesh per instance at every tier; no new material. Met. |
| 8 | Only `ctx.rng` (tints, slat heights). Met. |
| 9 | `wear` (+ `crest`) round-trip; dispose clean. Met. |
| 10 | Inventory rows present; adapters in `_production_adapters.md:9`. Met. |

### 2.3 My own captures (headless Metal, 1280×720, hour 18, cat height 0.45 m, 2–3 m from the asset)

Booted with ONLY the lane's ids swapped (`?swap=<ids>:modular`, set left at the classic default; the runtime reports `set: classic`, `instances: 12` for fences, `4` for alley), plus a classic twin from the same camera. Files in `_scratch/gate-v1/shots/`; boot errors in every run were only the `cad-overrides.json` 404, `problems: []`.

| Capture | Query | What it shows |
|---|---|---|
| `fence4_18_mod.png` / `fence4_18_classic.png` | `cam=1.7,0.45,15.2,4.1,0.8,15.6` (Takegaki Fence 4, an ~11 m village-gap run on the right side of the street, hero tier on high) | Modular: node-swollen straw culms with per-culm tint, two rails with knots at every crossing reading as dark lashings, end posts; the dusk sky shows through the same gaps as classic (same n, same tilts, same rails). Classic: flat dark cylinders and green rails. Same draw calls at this camera (261 / 261; +162 k triangles, the hero run plus its shadow). AAA-1 and AAA-5 met; the modular run is lighter in tone against the sunset (M6). |
| `fence1_18_mod.png` | `cam=-1.8,0.45,19.3,-4.1,0.8,19.7` (Fence 1, left side, behind a street bush) | The run from its street end: end post, the two rails with knots, the house wall it enters. AAA-1 met; no gap at the house join. |
| `corral_sign_18_mod.png` | `cam=-30.2,0.45,3.3,-31,1.0,5.6` (the corral's north run with the sign) | Sign with rain cap, framed board, lit painted face reading from −z, bamboo post with vertex-colour brown; the north fence and corner posts behind it; the Jade-Paw bed and Larry's pen visible through the culms. AAA-1/3/5 met. |
| `crates_18_mod.png` / `crates_18_classic.png` | `cam=-7.3,0.45,-5.0,-9.2,0.9,-6.9` (tea-house climb stack) | Modular: four slatted crates with dark cores, lid boards and corner posts, the barrel's hoops and belly beside the bottom step; the stack's outline is the classic one (platform tops unchanged). Classic: three grained boxes and a cylinder. `--diff`: maxDelta 196, mean 3.4, 113 k px > 8 — the crates and barrel only. Calls 295 vs 294. AAA-1/5/6 met. |

A first fence attempt from an oblique camera (`fence_run_18_*`) landed inside a street bush and shows no fence (diff maxDelta 74, 9 px); kept for the record only.

### 2.4 Contract tests
```
node tools/kit_contract_test.mjs --json      → 28 assets, 84 asset×tier builds, 2500 checks, 0 failed; merge OK; self-test 14/14 (incl. the new InstancedBufferGeometry knob)
node tools/kit_contract_test.mjs --family fences → 3 assets, 9 builds, 300 checks, 0 failed
node tools/kit_contract_test.mjs --family alley  → 2 assets, 6 builds, 153 checks, 0 failed
```

## 3. Budgets (perf_spots, same session, classic vs `?assets=modular`)

```
node tools/perf_spots.mjs --tiers medium,high --spots street,shrine --boots 3 --url-suffix "" --url-suffix "?assets=modular" --out perf_review.json
```
Apple M5 Max, headless Metal, 1200×750, hour 10.5, 12 boots interleaved, 2026-11-14. **The machine was heavily loaded** (1-min load 6.0–10.0 at boot starts; other lanes running), worse than the chores' run (2.8–5.8). Draw calls and triangles are load-insensitive; frame ms and build ms below are read as same-session ratios only, and the absolute values are 2–3× the quiet-machine numbers in `budgets.md`.

Per-frame means over the shadow cycle (median boot), amortised frame ms:

| Spot | Tier | Classic calls / tris / ms | Modular calls / tris / ms | Rule | Result | perf_gv1.md (chores) |
|---|---|---|---|---|---|---|
| street | medium | 585 / 6.00 M / 16.98 | **543 / 6.02 M / 17.95** | ≤ classic high (764 / 8.09 M / 24.30) | holds | 555 / 6.08 M (≤ 765 / 8.12 M) |
| shrine | medium | 311 / 5.03 M / 14.23 | **304 / 5.11 M / 14.85** | ≤ classic high (451 / 7.07 M / 19.70) | holds | 305 / 5.13 M (≤ 449 / 7.06 M) |
| street | high | 764 / 8.09 M / 24.30 | **702 / 8.73 M / 22.95** | ≤ 1.2× / 1.3× / 1.2× | 0.919 / 1.078 / 0.944 holds | 0.911 / 1.073 / 1.041 |
| shrine | high | 451 / 7.07 M / 19.70 | **440 / 7.59 M / 23.10** | ≤ 1.2× / 1.3× / 1.2× | 0.976 / 1.073 / **1.173** holds | 0.971 / 1.068 / 0.960 |

Calls and triangles reproduce the chores' numbers within 2 % (street high 702 vs 697, shrine high 440 vs 436; triangles 8.73 vs 8.71 M, 7.59 vs 7.54 M), so the per-spot draw and triangle verdicts in `perf_gv1.md` stand: draw calls fall at both spots on both tiers (−42 / −7 medium, −62 / −11 high), triangles rise 7–8 % on high (merged statics are not culled) and 0.3–1.6 % on medium. Peak (shadow-refresh) frames are also below classic on calls at every row (682 vs 760, 438 vs 450, 703 vs 761, 440 vs 449).

Frame time: medium modular is 2.5–5 ms under classic high at both spots. On high, the shrine's modular frame is 1.17 × classic (23.10 vs 19.70 ms) — the closest any rule came, and the chores measured 0.96 × at the same spot. The render-only column shows why: modular shrine 22.70 ms median with a boot range of 11.15–25.40 against classic 10.40 (9.34–16.53); the minimum boot matches, the median is a loaded-machine outlier (that set's boots started at load 7.8–10.0, the classic high set's at 6.0–8.2). I read this as noise, not a budget trend (M7), but it is a rule within 3 % on a loaded box and it must be re-read idle before G-V3.

World build (median of 3, same session): medium modular ready 3,723 vs classic 3,588 ms (1.04 ×), build 2,611 vs 2,503 (1.04 ×), boot total +74 ms; high ready 4,111 vs 3,452 (1.19 × ≤ 1.25), build 3,049 vs 2,486 (**1.23 × ≤ 1.25**), boot total 5,413 vs 4,571 (**+842 ≤ +1,000 ms**). High holds with little room; the modular high boots carried the run's highest load (9.2 median vs 7.8 for classic high). The chores saw the reverse (medium tightest, 1.23 ×). Either way the world-build rule is the one wave 2.2 will press first: each new merged family adds first-build time, and the margin is already load-sized.

**Verdict on D1: the scene budgets hold at both spots on medium and high; no family needs swapping out.**

## 4. Pipeline rules (§3.3, §5, §9) and the two rulings

Present in the guide at this HEAD: §3.3 rule 6 (merge-able statics, R36), rule 7 (instances counted, enforced by `craft.js instancesOf` + two self-test knobs), rule 8 (KIT_SHARED), §4.6 (tag bump only at main gates, R44), §9 L5 (merge-able statics, material reuse, contract sample = largest real layout, exception request), L6 (one framed pair per id, not byte-identical), L7 (perf_spots modular high AND medium vs classic high). Enforced where it can be: Math.random/Date.now/this.random (kit_check), determinism, bearing, per-tier triangles with instances, meshes, distinct materials, warm build, param round trip, dispose, footprint drift (contract test), `KIT_LIMITS` numbers match budgets.md (kit_check:172).

**R51 (bamboo-fence mid 13,000):** I agree the exception is the right call for this gate (scene budgets hold with the long runs in; the alternative, fewer mid rings, is a1-village tuning). I disagree with landing it alone: see I1.

**R52 (replace the 11-material cap):** I agree with the principle — the cap was a worst-case proxy and the measured per-spot draws are the real gate. Two gaps: the recipe and budgets.md still carry the old wording in places the lanes read, and nothing mechanical reports "+N merged materials" on a PR, so the only enforcement is a 19-minute perf_spots run. See I2.

### Important

**I1 — R51 grants the bamboo-fence exception but the contract still samples a 3.4 m run, so the exception is never exercised by a test.** `src/kit/fences/fence.js:31` (`sample: len = 3.4`), `src/kit/budgets.js` at `d54e804` (`mid: { triangles: 13000 }`). Guide §9 L5 (added by these very chores) says the sample is the LARGEST real layout; the real 11.0 m run is 12,660 at mid — 2.6 % under the new cap with no test holding it there, and its hero count (22,638) sits 9 % under 25,000, also untested. A future culm/knot tweak can cross either cap silently. Also untested at 11 m: `buildMs` (warm ≤ 6 / 3 / 1.5 ms) and the merge/`materials` rows. Fix (one line in the kit, Integrator glue or v-fences): `sample` `len = 11.0` (n = 68, tilts 69) — then run the family contract and record the four numbers in budgets.md §4 and perf_gv1.md, whose "needs a ruling" paragraphs are now stale.

**I2 — After R52 the material rule is stated three different ways, and the new rule has no mechanical check.** At `a4d1f7f`: §3.3 rule 8 says the cap is replaced; §9 L5 line 887 still says "the kit has no material left to add without a ruling"; `docs/fable/baseline/budgets.md:154` still says "at most **11** … for the whole kit"; `src/kit/budgets.js KIT_LIMITS.newMergedMaterials: 11` and `tools/kit_check.mjs:172` still assert that number; `briefs/_village.md` (R26 "one per family") is still what the running wave-2.2 lanes were given (chores concern 2). Every wave-2.2 lane reads L5 and budgets.md §3 before §3.3. Fix: one wording in all five places (R52's text), retire or rename `KIT_LIMITS.newMergedMaterials` (e.g. `mergedMaterialsAfterWave21: 11`, informational) and the kit_check assertion with it; and add the cheap census the chores already wrote (`_scratch/gate-v1-chores/census.mjs`) as `tools/kit_materials_census.mjs` (or a `kitMaterials` line in the footprint digest's `baked` section) so a PR shows "+1 merged material, N baked groups" without a perf run. The per-spot draw rule itself stays judged by perf_spots at L7.

### Minor

**M1 — `docs/fable/handoff/v-fences.md` Parts table still says `culms`/`knots`/`corner_posts` are InstancedMesh.** Stale since fix round 1 (`14582ee` baked them). Part names are right; the description misleads the next lane that copies the pattern (R36 says the opposite).

**M2 — The sake-barrel L6 pairs are shot from inside the crate stack.** `docs/fable/status/v-alley/sake-barrel-*-{classic,modular}.jpg`: the foreground is a crate board at a few centimetres and the barrel sits in its shadow. §9 L6 asks for cat height at 2–3 m framed on the asset. The barrel's hoops and crest are still legible, so AAA-1 is judged on my own capture (§2.3); re-shoot when the lane is next touched.

**M3 — Docs stale after R51/R52:** `perf_gv1.md` "Known per-asset overrun… needs an Integrator ruling", `budgets.md` §4 last paragraph (same), `budgets.md:154`, guide §9:887. Fold into I1/I2.

**M4 — Corral-sign board on classic `MAT.timberLight` no longer gets kit wetness/snow** (chores concern 3, R39 dedupe). Visible only on the board's 7 cm rim in rain; accepted; note it in the fences status so v-weather does not chase it.

**M5 — Pool tōrō: 5 unmerged meshes on `KIT_SHARED.stone`** because `HiddenPlaces` has no merge pass (chores concern 5). 5 draws today; v-hidden should add `_mergeStatics` or hand its statics to Countryside's merge.

**M6 — Modular fence reads lighter at dusk than classic** (straw 0xd2b87c culms where classic had dark `timberMedium` verticals; L6 `bamboo-fence-18` pair and my `fence_run_18` pair). Within AAA-5 (lit with the scene, dims at night), but the silhouette against the sky is weaker; an a1-village polish candidate (the `weathered` finish 0x9c8056 exists as a param and would need no new material).

**M7 — Frame-ms and build-ms rows of both perf runs were taken on a loaded machine** (chores: load 2.8–5.8; mine: 6.0–10.0). Calls and triangles are load-insensitive and are what the verdict leans on; the frame-ms rule holds on amortised medians in both runs, but my shrine-high modular frame came in at 1.17 × classic (the chores: 0.96 ×) and the high world-build at 1.23 × (the chores: medium at 1.23 ×), each on the set that happened to boot under the heaviest load. One idle perf_spots run (all four spots, medium and high) before the first wave-2.2 family merges would turn these from "holds under noise" into a real margin; it is also the baseline wave 2.2's own L7 comparisons need.

### Judged and found clean
- `catalog/tests/model.test.mjs` change (`5575aee`): a state change, not a loosening — jade-paw gained a direct lab-17 study in `cb8ff3f`; the new assertion `deepEqual(levels, ['direct','related'])` is stricter than the old single-equality.
- Contract count fix (`b04bb32`): `instancesOf()` counts `InstancedMesh.count` or `instanceCount` capped by the shortest instanced attribute; two new self-test knobs prove the old count would have passed an over-budget instanced fixture; `fixtureBuilds = 0` per case removes an order dependence (not a weakening). Only bamboo-groves' numbers changed (inside R40).
- Helper moves (`489b923`): re-exports keep sibling-lane imports working; 84/84 build hashes equal before/after (chores evidence; the contract's AAA-8 hash would also catch a drift).
- Material reconciliation (`0b3cdae`): geometry hashes unchanged except the three colour-attribute cases; the modular footprint digest I took matches the chores' counts exactly (49 changed / 280 added / 90 removed; 518 colliders, 65 platforms, 4 exclusions, 25 anchors, 5 water rects; the one anchor delta is the recorded shishiRocker 0.18 m waiver).
- Whitespace: `git diff --check 414225f..HEAD` exit 0; working tree clean.
- Low never loads the kit (§3.6): verified by the chores on the setting path; unchanged code since (runtime.js), and my classic boots report `loaded:false, instances:0`.

## 5. Evidence (command → result), this checkout, 2026-11-13/14

G1
```
node tools/check_syntax.mjs              → All 86 modules OK
node tools/verify.mjs                    → 86 modules, 8 summit modules OK; summit 83 passed; kit 122 passed; kit_test 36/36; All checks passed (exit 0)
node tools/kit_check.mjs                 → All kit checks OK (122 passed)
node tools/kit_index.mjs --check         → exit 0 (in sync)
node --test tools/kit_test.mjs           → fail 0 (36)
node tools/labs_check.mjs                → All labs checks OK
node tools/cad_overrides_test.mjs        → 27 passed, 0 failed
git diff --check 414225f..HEAD           → exit 0; git status --short → clean
```
G2
```
node tools/footprint_golden.mjs                       → EQUAL
node tools/footprint_golden.mjs --systems             → EQUAL
node tools/footprint_golden.mjs --query "?assets=modular" → DIFFERENT (49 changed, 280 added, 90 removed): anchors 1 (shishiRocker waiver), objects/aggregates/baked/counts/volatile only
node tools/kit_contract_test.mjs                      → 28 assets, 84 builds, 2500 checks, 0 failed, merge OK, self-test OK
node tools/summit_golden.mjs                          → EQUAL;  node tools/summit_test.mjs → 83 passed, 0 failed
node tools/rooftop_test.mjs                           → 40 passed, 0 failed
node tools/cat_golden.mjs                             → EQUAL, 40 passed, 0 failed
```
G3
```
node tools/catalog_check.mjs             → OK Asset Library: 17 modules, 190 records, 126 evidence targets, 134 pictured, 386 WebP
node tools/labs_coverage.mjs             → OK 37 source modules, 112 construction methods, 190 inventory rows, 126 evidence targets
node --test tools/labs_coverage_test.mjs → fail 0 (11);  node --test catalog/tests/*.test.mjs → fail 0 (37)
node tools/interiors_test.mjs → 28 passed;  node tools/ranges_test.mjs → 19 passed;  node tools/fable_swap_matrix.mjs → OK 186 rows
```
Classic pair, boots and perf: §1, §2.3, §3.

## 6. Deferred-minor triage

| # | Owner | When |
|---|---|---|
| M1 handoff wording | Integrator glue (one table cell) | with I1 |
| M2 barrel L6 re-shoot | v-alley / a1-village | next touch of the family |
| M3 stale docs | Integrator glue | with I1/I2, before wave 2.2 lanes read them |
| M4 sign board wetness | record in v-fences status; no code | now (doc) |
| M5 pool tōrō merge | v-hidden | its PR |
| M6 fence dusk tone | a1-village (param `finish`) | Phase 7 |
| M7 idle perf re-measure (frame p90, world build) | Integrator | before the first wave-2.2 family merges, and again at G-V3 |
