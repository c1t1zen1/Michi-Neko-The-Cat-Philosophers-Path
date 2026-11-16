# Gate G-F review — Phase 1 foundation (+ c1/c2/c3) — Reviewer: Fable

Checkout reviewed: `/Users/c1t1zen/Documents/GitHub/michi-wt/review-gf` (detached, HEAD `4273c90`), read-only.
Live site: `main` @ `955209d` (already merged into `4273c90`). Project base: `ed9f5b9`.
Hot-file diffs judged with `git diff 955209d..4273c90 -- <hot files>`; refactors skimmed with `git diff 955209d..4273c90 -- src/…`.
Lane s1-summit-split is not in this HEAD and was ignored. Scratch: `/Users/c1t1zen/Documents/GitHub/michi-wt/_scratch/gate-f/` (logs `node_checks.log`, `goldens.log`, `boots.log`, `browser2.log`, `browser3.log`, shots, `perf_cmp.json`).

### Verdict: GO (merge to main) — 0 Critical, 2 Important (both kit-lane contract, neither touches the classic path), 9 Minor.

With no URL flags and default settings a player loading `main` after this merge gets the same game: every golden is byte-identical (valley, systems, cat), two classic captures diff at `maxDelta 0`, the full-game boot is console-clean apart from the pre-existing `cad-overrides.json` 404, the §3.6 low-quality promise holds in a real boot, and the per-frame classic path gained only empty-registry early returns. The two Important findings must be fixed on `fable/integration` before wave 2.x lanes rely on the tier policy, but they do not block main.

---

## 1. Live-site safety findings (default flags, default settings)

### Critical
None.

### Important
None on the classic path.

### Minor

**M1 — Classic boot now statically downloads 21 more modules (+218 KB uncompressed, +19.5 %) on every tier, including `low`.**
`src/main.js:1,31`, `src/player.js:3`, `src/npc.js:3-5`, `src/countryside.js:11` (and 5 other owners) statically import `src/kit/{runtime,contract,rng}.js` (43.7 KB) and the `Cat` facade pulls all 18 `src/characters/**` files (89.5 KB). Measured in a real boot (`browser3.log`, `performance.getEntriesByType('resource')`): on classic default and on saved `quality: low` exactly these 21 files are fetched; `src/kit/index.js`, `materials.js` and `kit-overrides.json` are not (they appear only with `assetSet: modular` + non-low quality). So §3.6 "the kit is never downloaded on low" holds for families/materials/overrides; the infrastructure is now part of the static closure. Several of the character files are modular-only (`defs/*`, `michi_extras.js`, `grooming.js`, `dusk.js`) and could become dynamic imports later. Not a blocker: GitHub Pages serves them gzipped over HTTP/2, and the game already loads ~1.1 MB of own code plus three.js.

**M2 — `saveGame()` gained a `saveSuspended` guard (`src/main.js:1279`).** On classic, `saveSuspended` is only set in `startNewGame()` (`src/main.js:1068`) immediately before `location.reload()`, so the only behaviour change is that the `#btn-gl-reload` handler (`:511`) and direct `saveGame()` callers can no longer resurrect a just-cleared save during that reload tick — a latent race closed, in the player's favour. No save schema change; `src/save.js` and `src/menus.js` are untouched since `955209d`. Capture flags set `saveSuspended` only when a flag is present (`:540`), and `parseCaptureFlags('')` yields `active=false` (verified in the classic boot: `capture:false`).

**M3 — `cad_overrides.js` `arrayType()` now knows `Uint16Array` (`src/cad_overrides.js:13-17`).** A published `cad-overrides.json` carrying a Uint16 index that previously decoded as Float32 (and drew nothing) will now draw. The live site has no `cad-overrides.json` (every boot logs the 404), so it is inert today; `tools/cad_overrides_test.mjs` proves the existing fixture applies exactly as before (27/27). The `applied` count now requires at least one node hit — only the `console.info` line changes.

**M4 — `git diff --check ed9f5b9..4273c90` flags `index.html:947` "trailing whitespace".** That is the file's pre-existing CRLF (913 of 957 lines end in `\r`; the line already ended in `\r` at `955209d`); only the `?v=` tag changed on it. Not whitespace damage; normalising `index.html`'s line endings belongs to a docs/chores pass, not this gate.

**M5 — `.DS_Store` is tracked.** Present at `955209d` already (outside effort), so not introduced here; remove and `.gitignore` it in a chores pass.

### Judged and found clean (evidence in §2)

- **Boot ordering.** `startGame()` is now `async` (`src/main.js:2069-2075`): the constructor stops after the composer and `new AssetRuntime(...)` (`:212-218`); `init()` awaits `assets.preload()` then `assembleWorld()` (`:222-227`), which is the old constructor tail in the original order (Sky → Countryside → HiddenPlaces → InteriorManager → Vegetation → chunking → Particles → AmbientLife → … → `applySettings()` → `loop()`). On classic, `preload()` imports nothing and fetches nothing (`_doPreload` returns before any import; unit-tested and confirmed by the resource list), so the only difference is one microtask between constructor and world build, during which no listener is yet registered (resize/visibility/contextlost handlers are added in `assembleWorld()`). `bootstrap.js:62` awaits `startGame()`; the WebGL2 gate path (`renderer` unset → no `init()`) still dissolves the boot screen (`bootstrap.js:66-69`). `tools/verify.mjs` asserts this wiring.
- **Error paths.** `preload()` wraps `_doPreload` in a catch that warns once and leaves `loaded=false` (`src/kit/runtime.js:290-297`); per-family import failures are caught individually (`:308-314`); `kit-overrides.json` 404/network/invalid → `null`/one warning (`:320-336`); a throwing or malformed kit builder falls back to `classicFn()` with one warning per id and disposes the half-built tree (`:433-450`); a throwing `update()` is switched off once (`:487-493`). All exercised by `kit_test` (36/36) and `kit_contract_test --broken-family` (fails as designed). Bad `?swap=` entries warn once and are ignored (boot with `bogus:weird` verified).
- **WebGL context loss.** `onContextLost`/`onContextRestored` (`src/main.js:…`) are unchanged since `955209d`; neither constructs world objects, so the async split does not touch them.
- **Capture flags.** `parseCaptureFlags` only reads `?hour ?cam ?nohud ?shot ?weather ?hold`; with none present `applyCaptureFlags()` does nothing, `applyCaptureCamera()` returns at once, the governor/probe/resolution ladder run as before, title audio starts, and `this.elapsed` is `clock.elapsedTime` read right after `getDelta()` (same value the title orbit and `uTime` read before).
- **Per-frame classic path.** Added per-frame work: `assets.update()` returns on an empty registry (`runtime.js:481`); `assetEnv()` reuses one object and reads `sky.weatherAmount()` ×2 (`main.js:581-588`); `player.cat.setEyeShine` is undefined on classic (the classic def has collar + bell only, `src/characters/character.js:266-270`) so the dusk driver is a property test; NPC `this.modular` is false on classic (`src/npc.js:58-60`, `villagers_check` 18/18 "classic stays classic"). In the refactored modules every added `new THREE.*` allocation sits in a `layout*`/`mesh*Classic`/`registerFootprint`/`attach` (build-time) function — none in an `update()` path (`alloc.mjs` attribution, `countryside.js` 51, `hidden_places.js` 11, `interior.js` 8, `ambient_life.js` 3, `vegetation.js` 1, `particles.js` 0). `_mergeStatics()` on classic has an empty `assetInstances` list (`countryside.js:503-506`, `interior.js:158`). Render order: `placeAsset()` on classic is `classicFn()` + one `isAssetInstance` check (`countryside.js:362-366`).
- **Villager temperaments.** `PERSONALITIES` is now derived from `VILLAGER_DEFS` (`src/npc.js:23-26`); the values in `defs/{luna,mochi,kuro}.js` equal the removed literal field for field (scale, stripes, notice, idle weights/interval, greeting, startle). `villagers_check`: "classic NPC cat == def cat (palette, face, scale, mesh count)" ×3.
- **Interior anchors.** `context_actions.js:154-165, 822-827` read `interior.eatFishAnchor/napAnchor/exitZone` with the old literals as fallback; `src/interior.js:356-359` sets exactly those literals in the classic layout.
- **Signatures.** `Player(scene, camera, audio, {assets, quality} = {})`, `HiddenPlaces(scene, city, {assets} = {})`, `AmbientLife(…, {assets} = {})`, `Countryside(scene, options)`, `Vegetation/Particles` option bags — every tool/lab/catalog caller found (`tools/*_preview.js`, `cat_golden.js`, `catalog/js/asset-loader.mjs`, `labs/weather/js/recipes.js`) passes the old arity and gets `CLASSIC_ASSETS`.
- **`mountaintop.js`.** 8 changed lines, all `?v=` tags (import lines and the GLB URL) — the one permitted exception.
- **Tags.** No stale `?v=` anywhere in `src/`, `index.html`, `labs/shared/game.js`, `rooftops/js`, `tools/*.html|js` (grep empty); `kit_check` verifies the kit's.

---

## 2. Evidence run (command → real result)

All in `review-gf` @ `4273c90`, `PLAYWRIGHT_MODULE` set, Metal (`ANGLE Metal Renderer: Apple M5 Max`). Machine was shared with three other lanes (load 6–8 during perf).

| Command | Result |
|---|---|
| `node tools/check_syntax.mjs` | **All 62 modules OK** (src/*.js + src/kit/** + src/characters/**) |
| `node tools/verify.mjs` | **All checks passed** — main.js wiring 17/17 incl. "kit preload awaited before the world is built", "startGame is async and awaits init"; summit state machine 70/70; index.html 11/11; kit checks 29 + kit_test 36/36 |
| `node tools/kit_check.mjs` | **All kit checks OK (29 passed)**; 0 families, index in sync, tags `20261113a`, budgets match budgets.md §3, `kit-overrides.json` valid (0 entries) |
| `node --test tools/kit_test.mjs` | **36 pass, 0 fail** (incl. "preload: classic default imports nothing and fetches nothing", "low quality without ?assets=: a NON-empty overrides file naming modular neither fetches nor downloads the kit", "a throwing builder falls back to classic with ONE warning") |
| `node tools/cad_overrides_test.mjs` | **27 passed, 0 failed** (fixture applies as before; kit part names first; rel never descends into a kit group) |
| `node tools/labs_check.mjs` | **All labs checks OK**; 37 source modules, 112 construction methods, 190 inventory rows |
| `git diff --check ed9f5b9..4273c90` | 1 line: `index.html:947` — pre-existing CRLF (M4), not damage |
| `node tools/footprint_golden.mjs` | **EQUAL** — golden `valley_classic.json` byte-identical; 312 objects · 518 colliders · 65 platforms · 5 water rects · 4 exclusions · 25 anchors; rng probe ok; 1.7 s |
| `node tools/footprint_golden.mjs --query "?assets=modular"` | **EQUAL**, byte-identical (0 families → same valley) |
| `node tools/footprint_golden.mjs --systems` | **EQUAL** — `systems_classic.json` byte-identical; seam ok, 50 ids routed, classic updates 5/5, wholes/parts/bare 87/132/87 instances, registries 12/12, canopies freed 25/25 |
| `node tools/footprint_golden.mjs --systems --query "?assets=modular"` | **EQUAL**, byte-identical |
| `node tools/cat_golden.mjs` | **EQUAL** — 11 cats · 29 poses · 280 samples; 40 checks passed; 74 allowed additions (new exports/fields only) |
| `node tools/kit_contract_test.mjs` | **PASS** — 0 assets; merge check: valley 237 calls, +48 kit meshes → 285, after `_mergeInto` → 240 (3 baked); self-test 12/12 perturbations caught |
| `node tools/kit_contract_test.mjs --broken-family` | **FAIL as designed** (GATE 1 load problem reported for the fixture family) |
| `node tools/rooftop_test.mjs` | **40 passed, 0 failed** (autopilot reaches the perch on real physics) |
| `node tools/rooftop_companion_test.mjs` | **5 passed** |
| `node tools/summit_test.mjs` | **70 passed, 0 failed** |
| `node tools/labs_coverage.mjs` / `node --test tools/labs_coverage_test.mjs` | OK (direct 89 / review 41 / embedded 27 / related 19 / missing 10) / **11 pass** |
| `node tools/catalog_check.mjs`, `node --test catalog/tests/*.test.mjs` | OK (190 records, 386 WebP) / **37 pass** |
| `node tools/interiors_test.mjs`, `node tools/ranges_test.mjs` | **28** / **19** checks passed |
| `tools/labs_geometry_test.html` via `headless.mjs --eval` | **32 checks, 0 failed** |
| `tools/place_asset_test.html` via `headless.mjs --eval` | **PASS** — 162 placements of 67 ids, 0 footprint problems, colliders 479/479 bit-exact; all-fake-ids run: registrations equal the classic valley |
| `node tools/villagers_check.mjs` | **18 passed, 0 failed** |
| Full boot `/__boot.html` (classic default) `headless.mjs --console --fail-on-error --ignore AudioContext` | **boots and plays** in 6.7 s; the only console line is the pre-existing `404 /cad-overrides.json`; `assets.summary()` = `{chosen:classic,set:classic,loaded:false,assets:[],instances:0,problems:[]}`; `initialQuality: medium`, resolved `high` after `applySettings()`; 645 colliders, chunking ran |
| Full boot `/index.html?assets=modular` (`--session catwalk_autostart=new`) | **boots and plays**, same single 404; `set:modular, loaded:true, families:{}, assets:[]`; `luna.modular:true`, `player.cat.def.id:'michi'` |
| Full boot `/index.html?assets=modular&swap=torii,toro:classic,bogus:weird` | boots; one `[kit] swap 'bogus': set must be classic or modular` warning; `swaps:{torii:modular,toro:classic}` |
| Resource list, saved `{"quality":"low"}` (no flags) | `set:classic`; only the 21 static modules (M1); **no** `kit/index.js`, `materials.js`, `kit-overrides.json` |
| Resource list, saved `{"quality":"low","assetSet":"modular"}` (no flags) | `chosen:modular, set:classic`, `luna.modular:false`, `player.cat.def.id:'cat'`; **no kit downloads** — §3.6 promise holds end to end |
| Resource list, saved `{"assetSet":"modular"}`, quality auto | `set:modular`; `kit-overrides.json`, `kit/index.js`, `kit/materials.js` fetched; Michi and villagers modular |
| `game_shot --query "hour=10.5&cam=8,3.5,-9,0,1.2,4&nohud=1&shot=1&assets=classic"` ×2 → `--diff` | `{"maxDelta":0,"meanDelta":0,"pixelsOver8":0}`; both `render: {calls:535, triangles:5254988, geometries:426, textures:116}` |
| same, classic vs `?assets=modular` → `--diff` | `{"maxDelta":15,"meanDelta":0.0008,"pixelsOver8":5}`; same render counts; the 291 differing pixels (d ≤ 6 for all but 5) lie in rows 0–13 of the sky band (x 220–940), not on the cats — see M6 |
| `perf_spots.mjs --tiers medium --spots river,street --boots 1 --rounds 2 --url-suffix "" --url-suffix "?assets=modular"` (same session, load 6–8) | classic / modular — river: 15.65 / 16.70 ms amortised, calls mean 469 / 467, tris 5.087 / 5.087 M; street: 18.5 / 12.9 ms (rounds 8.5–17.4, contention), calls 593 / 577, tris 6.05 / 5.96 M. World build 3219 / 3499 ms. Against `budgets.md` medium (≤ classic high: river 589 calls / 6.93 M, street 774 / 8.12 M; build ≤ 1.25×): **calls, triangles and build within budget**; frame-ms rows are not comparable on this loaded machine (classic itself measured ~2× its quiet baseline), as `budgets.md` warns |

---

## 3. Contract findings for the kit lanes (guide §3 as reconciled; fix on `fable/integration` before wave 2.x relies on them)

### Important

**I1 — The kit's tier policy is keyed to `initialQuality`, which is `medium` for every `auto` desktop, so merged statics are built one tier too low on exactly the machines the `hero` tier targets.**
`src/main.js:212-218` constructs `AssetRuntime({ quality: this.initialQuality })` (and `:255` the Player's `quality`); `assembleWorld()` builds the valley at `:233` and only at `:413` does `applySettings()` → `applyQuality()` → `assets.setQuality(resolveQuality())` (`:851-855`). `initialQuality` is `'medium'` whenever the setting is `auto` on desktop (`:122-125`, by design: no GPU probe before the renderer), while `resolveQuality()` returns `'high'` on discrete GPUs (`src/settings.js:56-66`). Confirmed in the boot: `initial:'medium'`, `rtQuality:'high'` after the valley was built. `TIER_POLICY.medium.near = 'mid'` (`src/kit/contract.js:74-78`), and merged geometry cannot re-tier ("Tiers vs `_mergeStatics`", `runtime.js:23-41`), so on the default `auto` setting no play-field kit asset is ever built at `hero` on a high-tier desktop; `setQuality()` only re-tiers `live` instances. Every wave-2 lane's hero work would be invisible to the default-settings player once the flip happens, and the L6 compares (which run at `quality: high` via `game_shot`'s saved tier? — no: `game_shot` boots with default settings too, so lanes would be comparing `mid`) would under-report it. **Fix (small, main.js only):** `this.renderer` exists before the runtime is constructed, and `isDiscreteGPU()` uses its own probe context anyway, so pass `this.settings.resolveQuality()` to `AssetRuntime` and `Player`, or call `this.assets.setQuality(this.settings.resolveQuality())` at the top of `init()` before `assembleWorld()`. Re-run `verify`, the two goldens and a classic `game_shot` pair afterwards (classic is unaffected: `low`/`medium`/`high` only gate the kit).

**I2 — Owners without a `MAT` table scope with `{}`, so kit builders for their 50 routed ids receive `ctx.MAT = {}` and `ctx.textures = {}`, and the contract text does not say so.**
`src/vegetation.js:46`, `src/hidden_places.js:89`, `src/particles.js:16`, `src/ambient_life.js:73` call `scopeAssets(assets, {})`; `makeContext()` then falls back to `ctxBase.MAT`, which stays `{}` because no owner calls `setContext()` (`runtime.js:368-378`; only `Countryside`/`InteriorManager` scope with a real `MAT`). Guide §3.3 says "`MAT` and `textures` are the owning module's own tables" and `_village.md` says "Materials through `ctx.kitMaterials` / `ctx.MAT`"; a v-greenery / v-hidden / v-critters / v-weather / v-trees builder that reads `ctx.MAT.wood` will throw and silently fall back to classic (one warning), and `kit_contract_test` (which supplies its own ctx) will not catch it. **Fix:** one sentence in §3.3 and in `docs/fable/handoff/f3-systems-split.md` ("ids owned by Vegetation, HiddenPlaces, Particles, AmbientLife get `ctx.MAT = {}` / `ctx.textures = {}`: use `ctx.kitMaterials` and `ctx.textures`-free painters; their meshes are not merged"), or have those four owners scope with Countryside's `MAT` if merging into the valley's statics is wanted (a design decision; today their meshes stay unmerged, which is what `live`-heavy systems want).

### Minor

**M6 — Character ids bypass resolution rule 5, so "`?assets=modular` with nothing swapped" is no longer the classic frame.** `src/npc.js:58-60` and `src/characters/defs/michi.js:28-30` decide modular by `assets.setFor(id) === 'modular'` without a registered builder (by c2/c3 design — characters are `CharacterDef`s, not kit assets). Hence the modular Michi (eye-shine discs, `visible=false` by day, `depthWrite:false`, `src/characters/parts/michi_extras.js:40-56`) and three modular villagers exist on `?assets=modular` already, and the G2 row "same frame on both sets where nothing is swapped (`maxDelta 0`)" measures `maxDelta 15 / 5 px over 8 / 291 px differing by ≤ 6`, all in the top sky band — sub-noise, and not on the cats. Lanes are unaffected (L6 uses `?swap=<id>:modular` vs `?assets=classic`). Reconcile Appendix C G2 wording: compare `?assets=classic` with `?assets=modular&swap=michi:classic,luna:classic,mochi:classic,kuro:classic` (swaps are honoured for characters, `setFor` reads them first), or accept characters as always-swapped and state it.

**M7 — Swap problems are recorded twice.** `src/kit/runtime.js:157` copies `swap.problems` into `this.problems`, then `:173` `warnOnce()` pushes each again (boot evidence: `problems:[…, …]` duplicated). Drop the copy at `:157`.

**M8 — `labs_coverage` audits `src/*.js` only** (`tools/labs_coverage.mjs:16`): construction methods in `src/characters/**` and `src/kit/**` escape the inventory audit (c1 handoff §2 noted it). `kit_check` covers kit ids against the inventory, so nothing is lost for Phase 2; fix with the docs/tools pass.

**M9 — `ctx.quality` and the tier the Player gets also follow `initialQuality`** (same root as I1); listed so the fix for I1 covers `src/main.js:255` too.

### Judged coherent and enforced
`defineAsset` validates id/family/params (ranges, defaults, enum options), `tiers`, `floating`, `footprintWaiver`, `sample`, `legacyName` and freezes the record (`contract.js:238-276`); `ctx` is exactly the seven frozen fields (`runtime.js:76`, kit_check "ctx fields frozen"); part names `asset:<id>/<part>` are applied by the runtime from the keys (`runtime.js:457-460`); `footprint` defaults to `layout.footprint` (R12 §3, `:467`) and `placeAsset`/`placeInstance` registers every footprint key in classic order and binds `layout.bind` parts with one warning per missing part (`countryside.js:362-405`, `place_asset_test` 479/479 bit-exact, 8 warnings one per id and part); `_mergeStatics()` merges kit meshes except `live` (`countryside.js:503-537`, `interior.js:153-161`; contract test 48 → 3 draws); tier chosen once at build from quality × band (`contract.js:61-100`); `kit_check` enforces inventory ids, `index.js` sync, no `labs/` imports, no `Math.random`/`Date.now`, tags, budgets twin; `kit_contract_test` enforces AAA-2/3/7/8/9 + footprint drift per asset × tier with a self-test that catches 12 perturbations. `src/kit/index.js` is generated and in sync (0 families). `kit-overrides.json` (empty, valid) is committed; a missing one is unit-tested. `_village.md` and the f2/f3 handoffs name the ids, part names, `layout.bind` fields, budgets (25k/6k/1k, ≤ 11 new merged materials, R26) and the real CLI flags. Nothing else found that would make every lane stumble.

---

## 4. Deferred-minor triage (from `progress.md`)

**Must fix before main:** none. Every parked item is a tool, doc or modular-path nit; none changes the classic game.

**Fold into the I1/I2 fix on integration (before wave 2.x lanes compare tiers):** f3 "interior scope `{MAT}` only noted" (= I2 documentation); c2 "silent def registration" (registration order of `MICHI_EXTRA_PARTS` in `villager.js:5` — fine today, document).

**Later (docs/tools pass, no player impact):**
- p0-checks parked: swap-matrix basis labels; `decisions.md:59` ui.js not in §4.5; `decisions.md:103` wording; generator BOM/CRLF robustness; checks.md "verbatim" label.
- f1-golden parked: `--golden` default-path guard; stale exit-code text; premerge warning exit 1 vs 2; isInWater/wadeDepth lattice; anchors sweep; order-weighted instStats; selftest.
- f1-runtime deferred: pin throwing ids; warn `?swap` on unregistered id (would also help M6); `?hour=` empty; verify step order; kit_test title; `scope().update` semantics (a scoped `update` only runs the owner's instances; `Game` calls the root, so it is unused today — document or drop); spy restore early-return.
- p0-browser deferred: seeded repeatability for summit/rooftops/grass sheets (G4 now says "not pixel-repeatable", so the guide is honest); headless nits; capture per-item try/catch. R25 tree-sheet re-baseline stands.
- f3 deferred: runtime-animation probe in the systems digest; commit-message typo. Pre-existing bug "knick-knacks render ~100 m above the table" is on the live site today (not a regression) — v-interiors, fix outline in the f3 handoff.
- c2 deferred: `shineTexture` canvas guard for Node (only called from `build`, so Node imports of `michi_extras.js` are safe today); dusk ramp constants tied to the sky; bow (no nape mount); contact-shadow upgrade.
- c1 handoff: `labs_coverage` scanning (M8); AGENTS.md cat text (present at `AGENTS.md:77`).
- New from this review: M1 (lazy-import modular-only character modules), M4/M5 (CRLF in `index.html`, tracked `.DS_Store`), M7.

**Pending-Integrator items checked as applied:** f1-golden page patch (`docs/fable/handoff/f1-golden.md:39` "applied at gate G-F"); c1 `check_syntax` patch (62 modules incl. `src/characters/**`); `src/kit/budgets.js` from `budgets.md` (kit_check "numbers match budgets.md §3"); tag `20261113a` everywhere; f3 context_actions anchor patch (`context_actions.js:154-165, 822-827`); c2/c3 hot-file grants (`main.js` Player hook + NPC options; `labs/shared/game.js` `loadMichiModule`, tags bumped).
