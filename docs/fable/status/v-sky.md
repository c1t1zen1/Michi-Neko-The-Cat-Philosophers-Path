# v-sky

- Worker / model:     Claude Opus 5.5 (Worker G)
- Claimed:            2026-11-13 22:08 PST (resumed 2026-11-14 after the usage-limit pause)
- Branch:             fable/v-sky
- Base commit:        489b923 (fable/integration); integration merged in during the lane (latest merge noted in the report)
- State:              ready for review
- Grant:              single writer of `src/sky.js` and `src/postfx.js` for this lane (Integrator ruling R31)

## Assets
| Inventory id | Promoted from (lab/specimen) | Parts | Tiers | Footprint | State |
|---|---|---|---|---|---|
| `clouds` | `sky/cloud-field` (thickness painting) + the `cloud-painted` slab idea + `shade-soft` | `deck` | hero 3 slices + cirrus veil + pigment, 5-tap shade, shafts through gaps / mid 2 slices, 1-tap shade / far 1 flat slice, no shade | empty (classic sky registers none) | promoted |
| `stars` | `sky/night-stars` (new, L4) | `points`, `band` | 1,600 / 960 / 420 stars; Amanogawa on hero, mid | empty | promoted |
| `moon` | `sky/night-moon` (new, L4) | `disc`, `halo`, `ring` | disc+halo+ring / disc+halo / disc | empty | promoted |
| `sky-dome` | — | | | | deferred |
| `sky-light` | — | | | | deferred |
| `god-rays` | — | | | | deferred (kit-only) |
| `ao` | — | | | | deferred |
| `atmosphere` | — | | | | deferred (the cloud shade rides inside it, under `clouds`) |
| `grade` | — | | | | deferred |

## Steps
- [x] L1 Claim (b5db8e1, pushed = claim; grant recorded in the commit message)
- [x] L2 Read: labs/sky research, data, field, sky, shadows, original, world; ASSET_COVERAGE rows; src/sky.js, src/postfx.js, src/kit/runtime.js, contract.js, f3 handoff, decisions, progress rulings (R31 grant, god-rays → v-sky kit only, R36, R39/R52)
- [x] L3 Choose: `cloud-field` over `cloud-painted` (no CPU re-bake as the sun moves: the painted study re-bakes 65k px on every light change) and over `cloud-volume` (24-step march + 3D texture: too heavy for medium); the painted slab's height slices are kept for depth. `shade-soft` over `shade-beer`/`hard` (a soft 5-tap penumbra reads as cloud shade at cat height; Beer needs per-material light hooks)
- [x] L4 Close gaps: `night-stars`, `night-moon` studies in labs/sky (bd63379) before kit code; the other five gap ids get no study this pass → deferred
- [x] L5 Promote (d153efb, b6453c0): src/kit/sky/{index,field,state,clouds,night}.js; src/sky.js + src/postfx.js modular path; src/kit/index.js regenerated
- [x] L6 Compare: 14 pairs, 28 JPGs in docs/fable/status/v-sky/ (all pairs differ under cmp); read and judged below
- [x] L7 Check (below)
- [x] L8 Self-review (below)
- [x] L9 Handoff docs/fable/handoff/v-sky.md
- [x] L10 PR

## How the modular path is wired (single-writer files)
- `src/sky.js`: `new Sky(scene, { assets })` (no runtime handed in → classic; main.js passes it, pre-review grant). The three classic builder calls go through `placeSkyAsset(id, classicFn)`: classic → `classicFn()` unchanged; modular (runtime `setFor(id) === 'modular'`, registered, quality ≠ low) → `assets.build()`, burn the classic builder's Math.random draws (26 / 2,100 / 0), and hand the classic handles to the kit (`this.clouds = []` and the deck under the dome; `this.stars`/`this.starMat`, `this.moon`/`this.moonMat` = the kit objects, which the unchanged updateDayNight keeps driving). `update()` gains one line: `if (this.kit) this.updateKit(dt, playerPos)`. `dropKit()` reverts a live session to classic when quality drops to low. No classic line inside the builders, palettes, weather or updateDayNight changed.
- `src/postfx.js`: one line at the end of `AtmospherePass.updateFromSky()` → `syncKit(sky, environment)`, plus one dispose line. When the sky has a kit deck hook and the tier is not low, the summit is not active (no `environment`) and the cat is outdoors, the pass renders with a kit copy of the classic shader (chunks inserted at three asserted markers) that shares every classic uniform object; otherwise the classic material and classic uniform values, untouched. No new pass, no new render target. AO and grade untouched.

## Checks run (command → real result)
- `node tools/check_syntax.mjs` → `All 117 modules OK`
- `node tools/kit_check.mjs` → `All kit checks OK (246 passed)`
- `node --test tools/kit_test.mjs` → `tests 36, pass 36, fail 0`
- `node tools/cad_overrides_test.mjs` → `27 passed, 0 failed`
- `node tools/verify.mjs` → `All checks passed`
- `node tools/labs_check.mjs` → `All labs checks OK` (labs/ASSET_COVERAGE.md regenerated for the shifted src/sky.js / src/postfx.js line links)
- `node tools/kit_contract_test.mjs --family sky` → `3 assets, 9 asset×tier builds, 325 checks, 0 failed`, `PASS: kit contract` (tris max 1,152 (stars hero), warm builds ≤ 0.6 ms)
- `node tools/kit_contract_test.mjs` (all families; machine load avg 8–10 from other workers) → `77 assets, 231 builds, 6545 checks, 14 failed`, rerun `8 failed`: every failure is a *warm build ms* check in other families (moon-pool, kawara-roof, engawa, distant-pagoda, bamboo-fence), varying with load; 0 sky failures
- `node tools/footprint_golden.mjs` → `footprint golden: EQUAL`; `--systems` → `EQUAL`
- `node tools/footprint_golden.mjs --query "?swap=clouds,stars,moon"` → `EQUAL`; `--systems --query …` → `EQUAL`, seam ok (expected: neither digest builds a runtime-driven Sky; the sky registers no footprint)
- `node tools/summit_golden.mjs` → `summit golden: EQUAL`, summit_test 83 passed (its 9 advisory diffs, `_tree gone` / `state.assets`, are identical on integration 2978c74 without this lane)
- Classic byte-identity, `game_shot` `?assets=classic&shot=1`, cat-height camera on sky and street, 960×600, this branch vs an export of fable/integration (489b923, and 0e7a2cc after merging it): hours 6 / 12 / 18 / 22 → `maxDelta 0, meanDelta 0, pixelsOver8 0`, all four, both times
- Quality low with `?assets=modular`: `set modular`, `game.sky.kit` false, 26 classic cloud sprites, classic atmosphere material
- Live switch to low on a swap boot (`settings.values.quality = 'low'; applyQuality()`) → kit disposed, classic clouds 26 / Stars Points / Moon Sprite, post classic, no errors
- Full boots, headless Metal: `/__boot.html` (classic) → errors [], warnings []; `/index.html?swap=clouds,stars,moon` → kit clouds/stars/moon, post `AtmospherePass.kit:clouds-hero`, errors [], warnings [], runtime problems []; `/index.html?assets=modular` (every family) → same, clean (`cad-overrides.json` 404 ignored on all three: pre-existing, the file is optional)
- Medium swap: tiers `clouds:mid, stars:mid, moon:mid`, post `kit:clouds-mid` (`KIT_SHADE_TAPS 1, KIT_CLOUD_RAYS 0`), no errors
- Draw calls, deterministic (`?shot=1` frame, the four perf_spots spots, scene pass, 1200×750), classic → swap: high day street 450→444, shrine 159→156, river 340→331, meadow 444→438; high night 450→448, 159→160, 340→335, 444→442; medium the same deltas (449→443, 159→156, 337→328, 443→437; night 449→447, 159→160, 337→332, 443→441). Triangles +748 day / +1,904 night; whole-frame deltas equal (no new pass)
- GPU cost in one page (same boot, kit on vs kit off, 11 interleaved A/B pairs, median, composer render-only, 1200×750): high street +0.08 ms day / +0.05 night, sky view +0.12 / +0.18; medium +0.22 / −0.03, +0.03 / +0.28 (frame ≈ 7.3–8.3 ms)
- `node tools/perf_spots.mjs --tiers medium,high --boots 1 --rounds 2` (hour 10.5 and `--hour 22`), classic vs swap: draw-call means within the classic boot spread; frame ms unusable this session (load avg 5–10 from parallel workers: swap measured *faster* by day and slower by night, p90 100–146 ms) — the in-page A/B above is the GPU figure
- `git diff --check fable/integration...HEAD` → clean

## L6 compare (docs/fable/status/v-sky/, every pair differs under cmp)
`clouds-{6,12,18,22}` cat-eye (0.35 m) looking up past the street; `clouds-shade-{9,12,18}` elevated over the valley; `clouds-{rain,mist,snow}-12`; `stars-{20,22}`; `moon-22`, `moon-22-cloudy`. Swap = all three ids.
Judgement (read): dawn/noon/dusk read as painted wata-gumo — separate lobed puffs with satellite cells, cream crowns and cool bellies, warm on the sun side at dusk (the classic sprites' golden-hour rule, per pixel); far clouds sink into the horizon haze. Night: dim moonlit silhouettes with a silver edge near the moon, stars between them. Rain closes the sky into slate overcast (classic kept sunny puffs under rain), mist veils, snow is a pale sheet. Stars: many faint, few bright, coloured, horizon-dimmed; the Amanogawa is faint by design. Moon: painted crescent with earthshine and glow; a faint 22° ring only under a cloudy or misty veil. Cloud shade: cool patches on the forest ring and fields; visible but subtle from 50 m up, strongest on sunlit surfaces.

## L8 self-review (AAA)
- AAA-1 cat-eye read: met for clouds (puffs, not blurred billboards), stars, moon. Weak spot: faint stacked rims at cloud bases from the slab slices (painterly, deliberate).
- AAA-2 bearing: sky objects float by nature; `floating` lists every part. Contract passes.
- AAA-3 parts: `asset:<id>/<part>`; groups `asset:clouds`, `Stars`, `Moon`.
- AAA-4 tiers: three per asset; tier fixed at boot (medium = mid); one instance around the cat, no in-scene handover.
- AAA-5 world: time of day through the Sky palette and sun path, weather genera crossfade (cloudy, rain, snow, mist), wind drift, night dimming, moonlight on clouds. Lantern light: n/a.
- AAA-6 footprint: empty = classic; goldens EQUAL, classic and swapped.
- AAA-7 budgets: clouds 760 / 480 / 264 tris, stars 1,152 / 512 / 0, moon sprites 0; ≤ 3 meshes, ≤ 2 materials, warm build ≤ 0.6 ms. Draws fewer than classic by day at all four spots on both tiers; +1 at the shrine at night.
- AAA-8 determinism: ctx.rng only; field and moon textures cached per seed / phase; contract hashes equal; no Math.random in a build (the Sky's burn loop lives outside the kit, on purpose).
- AAA-9 editable: params with ranges (clouds shape/coverage/altitude/drift/shade, stars count/milky_way/warmth, moon phase/size/halo); update-only params declare `visual: false`; dispose frees private materials (cached textures are shared and never freed — documented).
- AAA-10 catalogued: inventory and production rows in the handoff (validated on a scratch copy: labs_coverage OK, labs_coverage_test 11/11).

## Deferred assets and why
- `sky-dome`: a modular dome needs a palette reconciliation — the lab's pigment/Preetham domes use their own hour table, while Sky.resolvePalette() feeds seven systems (fog, foliage, grass, river, ridges, cat rim, atmosphere). Swapping the dome alone breaks that colour chain; it is a whole-sky regrade, not a part swap. The kit deck sits on the classic dome.
- `sky-light`: no focused study (the lab hides the game's lights and uses its own rig); the sun/hemi/fill/bounce rig lights every surface, and the summit relies on it. Cloud shade reaches the light through the post composite instead.
- `god-rays`: kit-only per ruling, but the only evidence (`air-rays`) is sky-space rays, a different technique from the valley's ground cards, and no card study exists. With the deck, the existing screen-space shafts already pass only through gaps (hero). Needs a card specimen first.
- `ao`: no lab evidence at all (missing); the classic SSAO is already tier-scaled.
- `atmosphere`: related evidence only (summit haze cards); no study of the height-fog/aerial pass itself. This lane only inserts the cloud shade (and the hero gap test for the shafts) into it, under `clouds`.
- `grade`: related evidence only (Kuwahara finish); the painted finishes of labs/shared/finish.js are a post pass needing their own study at game resolution.

## Footprint waivers requested
None.

## Notes for the Integrator
- main.js `new Sky(this.scene, { assets: this.assets })`: applied in-lane under the pre-review grant (handoff §1).
- Inventory targets/coverage rows (handoff §2), production row (§3), registry study count (§6).
- 0 new merged materials (R52); live meshes 1 + 2 + 3.
- The kit sky also runs on the summit (dome child) and indoors (driven by the Sky, not by `assets.update()`); the cloud shade is off on the summit and indoors.

## Pre-review: assets wiring (Integrator grant, R47 pattern: src/main.js in-lane)
- `src/main.js`: `this.sky = new Sky(this.scene, { assets: this.assets });` (the one line). `src/sky.js`: the `globalThis.game.assets` read is gone; `skyAssets()` accepts only a runtime handed in, else classic.
- `node tools/check_syntax.mjs` → `All 137 modules OK`; `node tools/verify.mjs` → exit 0, `All checks passed` (summit_test 83 passed, kit_test 36/36); `node tools/labs_check.mjs` → `All labs checks OK`; `node tools/kit_check.mjs` → `All kit checks OK (307 passed)`; `git diff --check` clean
- Classic game_shot vs fable/integration 1e74cf3 (`?assets=classic&shot=1`, cat-height sky + street camera, 960×600): hours 6 / 12 / 18 / 22 → `maxDelta 0, meanDelta 0, pixelsOver8 0` ×4
- `node tools/footprint_golden.mjs` → `EQUAL`; `--systems` → `EQUAL`; `node tools/summit_golden.mjs` → `EQUAL` (summit_test 83 passed, output identical); `node tools/kit_contract_test.mjs --family sky` → 325 checks, 0 failed
- Boots (headless Metal, nothing ignored): `/__boot.html` → set classic, `sky.assets` set, kit [], post classic, problems []; `?swap=clouds,stars,moon` → kit clouds/stars/moon, post `AtmospherePass.kit:clouds-hero`, problems []; `?assets=modular` → same, problems []. Each run's only console error is `404 /cad-overrides.json`, which the fable/integration 1e74cf3 classic boot logs identically (the optional file is absent from the repo); warnings [] everywhere
- Labs importing Sky through labs/shared/game.js, headless `--fail-on-error`: `/labs/sky/` → errors [], Sky `assets null`, `kit null`, 26 classic clouds; `/labs/ground/` → errors [], Sky `assets null`, `kit null`, 26 clouds; `/labs/moonpool/` (labs/shared/world.js path) → errors [], warnings []
