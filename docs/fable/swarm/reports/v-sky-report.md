# v-sky report (Worker G, Claude Opus 5.5)

Status: **DONE_WITH_CONCERNS** (concerns at the end: none block the merge).
Worktree /Users/c1t1zen/Documents/GitHub/michi-wt/v-sky, branch fable/v-sky,
base 489b923, fable/integration merged in up to 1e74cf3 (head 6cfe0a9).
PR: https://github.com/c1t1zen1/Michi-Neko-The-Cat-Philosophers-Path/pull/35
Session note: work paused at the usage limit after L6 began and resumed from
the committed state (`git status` / `git log` checked first, as instructed).

## What was built

**Kit family `src/kit/sky/`** (3 assets promoted, 6 deferred):

| id | from (labs/sky) | parts | tiers | notes |
|---|---|---|---|---|
| `clouds` | `cloud-field` + `cloud-painted` slab idea + `shade-soft` | `deck` | hero 3 slices + cirrus veil + pigment, 5-tap shade, shafts through gaps / mid 2 slices, 1-tap shade / far 1 flat slice, no shade | one 256² periodic four-genus field (R cumulus puffs, G cirrus, B altocumulus, A stratus), histogram-equalised so `cover` = share of sky; weather crossfades the genera; curved deck 170 m above the cat; colours from the Sky's own palette |
| `stars` | `night-stars` (new) | `points`, `band` | 1,600 / 960 / 420 | magnitude-weighted, B−V coloured, horizon extinction and scintillation; Amanogawa strip on hero and mid |
| `moon` | `night-moon` (new) | `disc`, `halo`, `ring` | 3 / 2 / 1 parts | painted phase (default 0.2 crescent), seas, earthshine, glow; 22° ring only under a cloudy/misty veil |

Files: `index.js` (defineAsset ×3), `field.js` (field + shared GLSL),
`state.js` (sky state from `env.sky`, or from `env.hour` without a Sky),
`clouds.js` (deck + atmosphere hook), `night.js` (stars, band, moon).

**Lab (L4)**: `labs/sky/js/night.js` (studies `night-stars`, `night-moon`,
new gallery family "After the lanterns go out.", Night selector),
data.js / main.js / sky.js / index.html wiring, research.md and
verification.md sections. Drawing code identical to the kit copy.

**System files (single writer, R31)**
- `src/sky.js`: `Sky(scene, { assets })` (falls back to
  `globalThis.game.assets`, else classic). `buildClouds/Stars/Moon` calls go
  through `placeSkyAsset()`: classic path calls the untouched builders; the
  kit path builds through the runtime, burns the classic builder's
  Math.random draws (26 / 2,100) so `?shot=1` streams stay aligned, and hands
  the classic handles (`starMat`, `moonMat`, `stars`, `moon`) to the kit so
  the unchanged `updateDayNight` keeps driving them. `updateKit()` (one call
  added to `update()`), `kitPostHook()`, `dropKit()` (quality → low reverts
  live). Quality low is classic always, whatever the flags.
- `src/postfx.js`: `AtmospherePass.syncKit()` (one call at the end of
  `updateFromSky`, one dispose line): when a kit deck exists and the tier is
  not low, not on the summit, not indoors, the pass renders with a copy of
  the classic shader with the deck's chunks inserted at three asserted
  markers, sharing every classic uniform object. Cloud shade composited
  before the height fog; hero shafts sample sky through the deck's gaps;
  the deck covering the sun dims shafts and sun glow. No new pass. AO and
  grade untouched.

## Checks (real output, final tree unless noted)

```
node tools/check_syntax.mjs                         All 137 modules OK
node tools/kit_check.mjs                            All kit checks OK (307 passed)
node --test tools/kit_test.mjs                      pass 36, fail 0
node tools/cad_overrides_test.mjs                   27 passed, 0 failed   (before the last merge)
node tools/verify.mjs                               All checks passed
node tools/labs_check.mjs                           All labs checks OK
node tools/kit_index.mjs --check                    in sync (19 families)
git diff --check origin/fable/integration...HEAD    clean
node tools/kit_contract_test.mjs --family sky       3 assets, 9 asset×tier builds, 325 checks, 0 failed — PASS
node tools/footprint_golden.mjs                     footprint golden: EQUAL
node tools/footprint_golden.mjs --systems           footprint golden: EQUAL
node tools/footprint_golden.mjs [--systems] --query "?swap=clouds,stars,moon"   EQUAL / EQUAL (seam ok)
node tools/summit_golden.mjs                        summit golden: EQUAL (summit_test 83 passed)
```

- All-family contract (`node tools/kit_contract_test.mjs`, load avg 8–10):
  `77 assets, 231 builds, 6545 checks, 14 failed`, rerun `8 failed` — all
  *warm build ms* in other families (moon-pool, kawara-roof, engawa,
  distant-pagoda, bamboo-fence), varying with load. 0 sky failures.
- Summit golden's 9 advisory diffs are identical on integration 2978c74
  without this lane.
- Classic byte-identity: `game_shot ?assets=classic&shot=1`, cat-height
  camera on sky + street, branch vs an export of fable/integration, hours
  6/12/18/22 → `maxDelta 0, meanDelta 0, pixelsOver8 0` ×4 — run three
  times (vs 489b923, 0e7a2cc and the final 1e74cf3).
- Low tier + `?assets=modular`: Sky classic (26 sprites), classic post.
  Live switch to low on a swap boot: kit disposed, classic Stars/Moon/26
  clouds, classic post, no errors.
- Full boots (headless Metal): `/__boot.html` errors [] warnings [];
  `?swap=clouds,stars,moon` errors [] warnings [] problems [] (post
  `AtmospherePass.kit:clouds-hero`, rerun after the final merge too);
  `?assets=modular` clean. `cad-overrides.json` 404 ignored (optional file,
  also on classic).
- Medium swap: tiers mid, post `kit:clouds-mid` (1 tap, no gap rays).
- Draw calls, deterministic `?shot=1` frame at the four perf spots (scene
  pass), classic → swap, high: day street 450→444, shrine 159→156, river
  340→331, meadow 444→438; night 450→448, 159→160, 340→335, 444→442. Medium:
  same deltas. Triangles +748 day, +1,904 night.
- GPU cost, in-page interleaved A/B (11 pairs, median, composer render-only,
  1200×750): high +0.05…+0.18 ms, medium −0.03…+0.28 ms on a ~7.3–8.3 ms frame.
- `perf_spots --tiers medium,high` day and `--hour 22`: draw means within
  the classic boot spread; frame ms not usable (load 5–10, swap faster by day,
  slower by night, p90 100–146 ms) — the A/B above is the honest GPU figure.

## L6 compare
28 JPGs (14 pairs, all differ under cmp) in `docs/fable/status/v-sky/`:
`clouds-{6,12,18,22}`, `clouds-shade-{9,12,18}`, `clouds-{rain,mist,snow}-12`,
`stars-{20,22}`, `moon-22`, `moon-22-cloudy`. Read: painted, lobed wata-gumo
with cool bellies and dusk-warm sun sides; moody moonlit night clouds; rain
closes the sky (classic left sunny puffs in rain); stars varied and coloured;
painted crescent with earthshine; cloud shade visible but subtle from 50 m up.

## Files changed
src/kit/sky/{index,field,state,clouds,night}.js (new), src/sky.js,
src/postfx.js, src/kit/index.js (generated), labs/sky/js/{night.js (new),
data.js, main.js, sky.js}, labs/sky/{index.html, research.md,
verification.md}, labs/ASSET_COVERAGE.md (regenerated),
docs/fable/status/v-sky.md + v-sky/*.jpg, docs/fable/handoff/v-sky.md.
Diff vs integration: 1,670 lines in src/ + labs/ (≈1,500 in new files), over
the ~1,500 guideline; not split because the kit, the two system hooks and the
lab studies only make sense together.

## Promoted / deferred
Promoted: `clouds`, `stars`, `moon`. Deferred: `sky-dome` (palette chain
feeds seven systems; lab domes use a separate hour table), `sky-light` (no
study; whole-game and summit lighting), `god-rays` (no card study; sky-space
rays are a different technique; shafts already pass through deck gaps),
`ao` (no evidence), `atmosphere` (related evidence only; the shade rides in
it under `clouds`), `grade` (related evidence only).

## Footprint waivers
None (sky registers no footprint).

## Handoff (docs/fable/handoff/v-sky.md)
Optional main.js line `new Sky(this.scene, { assets: this.assets })`;
inventory targets `sky/night-stars`, `sky/night-moon`, `sky/cloud-field` +
coverage rows (validated on a scratch copy: labs_coverage OK,
labs_coverage_test 11/11; stars/moon embedded → direct); production row;
labs/registry.js study count 24 → 26. 0 new merged materials (R52).

## Self-review (AAA-1…10)
Met: 1 (cat-eye sky reads as painted cumulus), 2 (floating parts declared),
3, 4 (three tiers, boot-time), 5 (time, weather, wind, night), 6, 7, 8, 9,
10 (via handoff). Details in the status file.

## Open concerns
1. The Sky finds the runtime through `globalThis.game.assets` until the
   main.js line in the handoff lands (owner-side fallback, not kit code;
   pages without a Game stay classic).
2. Night draw calls at the shrine spot are +1 vs classic (day −3); R52's
   "≤ classic" holds at the default perf hour on both tiers.
3. Cloud shade is a screen-space composite weighted to bright pixels, not a
   true direct-light removal; it can slightly cool sunlit emissive surfaces
   in daylight (lanterns are off then).
4. Frame-ms perf numbers from perf_spots were unusable under the shared
   machine load; the GPU figure is the in-page A/B.

## Pre-review: assets wiring

Grant (Integrator, R47 pattern): src/main.js in-lane for the one-line
handoff patch. Commit 2fcf4c7 (pushed).

- `src/main.js`: `this.sky = new Sky(this.scene, { assets: this.assets });`
- `src/sky.js`: the `globalThis.game.assets` fallback is removed; `skyAssets()`
  accepts only a runtime handed in, so a Sky built without one (labs, review
  sheets, the systems digest) is classic, with no warning. This resolves open
  concern 1 above.

Real output:
```
node tools/check_syntax.mjs     All 137 modules OK
node tools/verify.mjs           exit 0 — All checks passed (summit_test 83 passed, kit_test 36/36)
node tools/labs_check.mjs       All labs checks OK
node tools/kit_check.mjs        All kit checks OK (307 passed)
git diff --check                clean
classic game_shot vs fable/integration 1e74cf3 (?assets=classic&shot=1, 960x600):
  hour 6:  maxDelta 0, meanDelta 0, pixelsOver8 0
  hour 12: maxDelta 0, meanDelta 0, pixelsOver8 0
  hour 18: maxDelta 0, meanDelta 0, pixelsOver8 0
  hour 22: maxDelta 0, meanDelta 0, pixelsOver8 0
node tools/footprint_golden.mjs            footprint golden: EQUAL
node tools/footprint_golden.mjs --systems  footprint golden: EQUAL
node tools/summit_golden.mjs               summit golden: EQUAL (summit_test "83 passed, 0 failed", output identical)
node tools/kit_contract_test.mjs --family sky   3 assets, 9 builds, 325 checks, 0 failed — PASS
```
Boots (headless Metal, nothing ignored):
- `/__boot.html` → `{"set":"classic","skyAssets":true,"kit":[],"post":"classic","problems":[]}`
- `/index.html?swap=clouds,stars,moon` → `{"set":"classic","kit":["clouds","stars","moon"],"post":"AtmospherePass.kit:clouds-hero","problems":[]}`
- `/index.html?assets=modular` → `{"set":"modular","kit":["clouds","stars","moon"],"post":"AtmospherePass.kit:clouds-hero","problems":[]}`
- Each boot logged one console error, `404 /cad-overrides.json`, and no
  warnings. The fable/integration 1e74cf3 classic boot logs the same 404: the
  optional file is not in the repo.

Labs that import Sky through labs/shared/game.js (headless, `--fail-on-error`):
- `/labs/sky/` → errors [], warnings []; Sky `assets: null, kit: null, clouds: 26`
- `/labs/ground/` → errors [], warnings []; Sky `assets: null, kit: null, clouds: 26`
- `/labs/moonpool/` (labs/shared/world.js path) → errors [], warnings []

## Fix round 1

Review: reviews/v-sky-review-r1.md (approved quality, three items to land).
Commits: 4dac783 (fixes), 2b0ad4c (merge fable/integration 8702cc7), f9cfa15 (status/handoff); pushed.

1. **Lab ↔ kit duplication (R56).** `labs/shared/game.js` (granted in-lane) gains one
   cache-tagged re-export, `loadKitSkyNightModule = () => import('../../src/kit/sky/night.js?v=20261113a')`.
   `labs/sky/js/night.js` now builds the studies with the kit's `buildStars` / `buildMoon`
   (80 lines, no drawing code of its own). The 258-line copy is gone.
2. **Stars through thick cloud.** A star linked to the kit deck (`linkClouds(shared, deckAlpha)`,
   called by the Sky right after building) reads the deck's field, cover and drift in its vertex
   shader: `vAlpha *= 1 - clamp(cover * deckAlpha * 1.3)`. The moon dims by the deck density in
   front of it (CPU `coverAlong`, `env.moonCover`). In the re-shot `stars-22-modular.jpg` the
   cloud bodies hold no stars; only thin edges let a few through.
3. **R52 at night.** The moon is one camera-facing draw: one shader paints the disc, the glow and
   the 22° ring. The quad grows to fit the ring only while the ring shows. Night scene draws are
   now equal to classic at the shrine in clear, cloudy and misty weather, and lower at the other
   three spots, on high and medium (numbers below).

Minors done:
- Post-pass field reads take an explicit mip 0 (`texture2DLodEXT`): no implicit derivatives in the
  shade branch or the shaft loop.
- The shade floor on dark (shadowed) pixels drops from 0.4 to 0.15.
- The deck reference height is smoothed and snaps on a teleport, so a jump no longer slides the shade.
- No per-frame allocation in the genus mix or `field.raw`.
- postfx reads the public `sky.envPaused` and frees its kit shader after `dropKit`.
- The night shaders gained tone-map and colour-space includes. In the game they are no-ops (the
  scene renders into a linear target; a re-shot moon frame shows maxDelta 0). In the lab they
  correct the output to the screen.
- Lab page now says "26 live recipes" and has a `#night` nav link. research.md now says the shade
  promotes `shade-soft`'s projection and penumbra, not its light model.

Not done:
- `setTier` re-tiering (Minor 6).
- Art-direction notes (Minor 7), left for the operator.

Real output, after merging fable/integration 8702cc7:
```
node tools/check_syntax.mjs                 All 145 modules OK
node tools/kit_check.mjs                    All kit checks OK (349 passed)
node tools/labs_check.mjs                   All labs checks OK
node tools/verify.mjs                       exit 0 — All checks passed
node --test tools/kit_test.mjs              pass 36, fail 0
node tools/cad_overrides_test.mjs           27 passed, 0 failed
git diff --check origin/fable/integration...HEAD   clean
node tools/kit_contract_test.mjs --family sky      3 assets, 9 asset×tier builds, 325 checks, 0 failed — PASS
classic game_shot vs fable/integration 8702cc7 (?assets=classic&shot=1):
  hour 6 / 12 / 18 / 22: maxDelta 0, meanDelta 0, pixelsOver8 0 (×4)
node tools/footprint_golden.mjs             footprint golden: EQUAL
node tools/footprint_golden.mjs --systems   footprint golden: EQUAL
node tools/summit_golden.mjs                summit golden: EQUAL (summit_test 83 passed, output identical)
```

Boots: each run's only console error is `404 /cad-overrides.json`, which integration logs identically; warnings [] in all three.
- `/__boot.html` → `{"set":"classic","kit":[],"starsLinked":false,"post":"classic","problems":[]}`
- `?swap=clouds,stars,moon` → kit clouds/stars/moon, `starsLinked: true`, post `kit:clouds-hero`, problems []
- `?assets=modular` → same as the swap boot

Live switch to low on a swap boot: kit null, 26 classic clouds, classic Points/Sprite, post classic, `kitMaterial` null.

Labs reading Sky or the kit through labs/shared/game.js, run with `--fail-on-error`, all errors [] and warnings []:
- `/labs/sky/`
- `/labs/sky/?night=both…`, aimed at the moon: the crescent, glow and ring render
- `/labs/ground/`
- `/labs/moonpool/`

Night scene draws, classic → swap (deterministic `?shot=1`, the four perf spots).

High:

| Weather | Street | Shrine | River | Meadow |
|---|---|---|---|---|
| clear | 450 → 447 | 159 → 159 | 340 → 334 | 444 → 441 |
| cloudy | 451 → 448 | 160 → 160 | 341 → 335 | 445 → 442 |
| mist | 459 → 456 | 165 → 165 | 348 → 342 | 452 → 449 |

Medium:

| Weather | Street | Shrine | River | Meadow |
|---|---|---|---|---|
| clear | 449 → 446 | 159 → 159 | 337 → 331 | 443 → 440 |
| cloudy | 450 → 447 | 160 → 160 | 338 → 332 | 444 → 441 |
| mist | 458 → 455 | 165 → 165 | 345 → 339 | 451 → 448 |

- Day draws are −6 / −3 / −9 / −6 on both tiers in every weather.
- The ring was awake during the night runs: `uRing` 0.072 (cloudy) and 0.12 (mist), with the quad
  half-size at 13.4 disc radii; 0 when clear.

Re-shot pairs (all differ under cmp): `stars-20`, `stars-22`, `moon-22`, `moon-22-cloudy`, `clouds-22`, plus a new `moon-22-mist`.
