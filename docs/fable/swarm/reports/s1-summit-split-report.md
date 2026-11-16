# Report: s1-summit-split (Phase 4, S1.1 to S1.5)

- Worker: Claude Opus 5.5 (claude-opus-5-5)
- Worktree / branch: `/Users/c1t1zen/Documents/GitHub/michi-wt/s1-summit-split`, `fable/s1-summit-split`
- Base: `fable/integration` @ 5dc924a; merged 619aab7 (Phase 0 + f1-runtime) and 5297f2d (f2, f3, c1, G-F chores); head 6afac2a
- Status: DONE (with the notes under "Open concerns")

## What was built

**D2 pre-check.** After `git fetch origin`, no non-`fable/*` remote branch has an unmerged change to
`src/mountaintop.js` or `src/ui.js`. The only `index.html` hit is `9cbddf2` on `origin/graphics-overhaul`
(ignored by D6), whose one hunk is the `main.js?v=` tag, not the summit UI. Local `feat/rooftops-downtown`:
nothing. First commit (409afe4) updated the AGENTS.md `src/mountaintop.js` row (D2, single writer lane s1).

**S1.1 — summit golden** (`tools/summit_golden.html/.js/.mjs`, `tools/golden/summit_classic.json`,
`tools/golden/summit_test.txt`), recorded from the unchanged code before any move. It builds `SummitManager`
on a stub game (scene, sky, player mesh) in the game configuration and the preview configuration, twice each
(A/B ambient seeds and clocks), awaits the GLB roofscape, and digests: summit-stream draws counted through an
accessor on `SummitManager.prototype` (no game edit; 51,267 game / 48,694 preview, probe ok), per-builder
attribution (advisory), the prototype API (a removed method is a difference, an added one advisory), colliders
and platforms, lattices of `terrainHeightAt` (1.5 m near, 20 m far), `perchSightlineAt` over the perch's view
window (the protected view), `approachSupportAt`, `groundAt`, `constrain()`, `vistaRiverX`, the three
`setQuality` tiers, every instance field (typed-array stats, materials, textures, object refs), every named
object (world transform, geometry with colour/uv means, material, flags, userData, instance stats) and
unnamed aggregates; the preview build as a delta. Canvas textures are identified by a hash of their 2D
drawing commands rather than pixels (pixels differed between Metal and SwiftShader); Metal and SwiftShader
digests are byte-identical. The CLI also compares `node tools/summit_test.mjs` output line for line.

**S1.2 — the split.** `src/mountaintop.js` (4,127 lines) is now the 1,034-line `SummitManager` facade:
constructor, world shims, `setQuality`, `placeAsset`, the sky keep-list, unlock and transitions, the scenic
camera and the per-frame update, plus one "Builders by concern (src/summit/)" block of one-line delegators,
grouped per module. The builders moved byte for byte (scripted moves; a checker against
`git show 5dc924a:src/mountaintop.js` reported `53 methods and 30 top-level declarations compared, 0 differ`)
into `src/summit/common.js` (constants, mulberry32, box, easing, approach profile, weather amount, footprint
helpers), `light.js`, `terrain.js`, `clearing.js`, `planting.js`, `vista.js`, `weather.js`, `wildlife.js`,
each exporting a methods object called with `this` = the manager. One commit per module, golden EQUAL after
each. The prototype keeps every method name (the Summit Lab's `Object.create(SM.prototype)` kit still works),
and 26 of 32 inventory anchors still match the facade verbatim.

**S1.3 — layout/mesh split and routing.** The facade imports `CLASSIC_ASSETS`, `isAssetInstance`,
`scopeAssets` from `src/kit/runtime.js`; the owner line is
`this.assets = scopeAssets(game.assets, { MAT: this.MAT, textures: TEX })`. `placeAsset(id, layout, classicFn)`
follows R12/R18 (parent by summit object name or `space: 'valley'`, footprint through
`addColliderBox`/`addPlatformBox` in order, anchors, `layout.bind` parts). Every one of the 32 summit
inventory ids is routed (34 calls: meditation-stone and harbour route two parts each), every `this.rng()` draw
sits in a layout step in its original order (including data-dependent ones: the cloud shade pick, the brush
gap `continue`, the canopy grown by `buildCanopy(this.rng)`), and the classic mesh steps (`mesh*Classic`) build
exactly what they did. The summit grass still draws nothing from the stream. `update()` runs the summit's own
kit instances while the summit is active. A routing self-test in the golden page builds the summit through the
real `AssetRuntime` with a stand-in kit asset for every id, all modular and then each id alone: same stream
position, same colliders and platforms, parents and binds correct. It fails on a 5 cm footprint drift while
the classic digest stays EQUAL.

**S1.4.** `tools/summit_test.mjs` evaluates the facade and each real module in its own function scope, with
import statements rewritten to a registry (three, addons, textures, foliage, grass: the same stubs; kit
runtime: the real module, imported natively). No check changed; output identical (70 passed).

**S1.5.** `tools/verify.mjs`: the card-set check reads `src/summit/planting.js`; the three vista checks read
`src/summit/vista.js` (the "not the painted cyclorama" half reads every summit source). Added: a syntax pass
over `src/summit/*.js`, and checks for the scoped runtime, `placeAsset` routing and the cache tag of every
summit import. None removed.

## Checks (real output, final merged tree 915fd33 unless noted)

```
node tools/summit_golden.mjs
  summit golden: EQUAL
  rng      summit 51267 draws (probe ok) · Math.random 0 · volatile 0 leaves, 0 members
  routing  ok: 32 summit ids, 34 classic placeAsset() calls; all modular 34/34 stand-ins, 51267 draws (probe ok); single swaps 32/32 ok (6.2 s)
  test     summit_test.mjs "70 passed, 0 failed", output identical to tools/golden/summit_test.txt (75 lines)
  (advisory, not the verdict: +api placeAsset/assetEnv, +state.assets, _tree no longer called internally)
node tools/summit_test.mjs                  → 70 passed, 0 failed (same 70 checks, before and after)
node tools/verify.mjs                       → All checks passed; 53 PASS lines (50 on the merged base, all still present) + "All 8 summit modules OK (src/summit/)"
node tools/check_syntax.mjs                 → All 53 modules OK
node tools/labs_check.mjs                   → All labs checks OK
node tools/labs_coverage.mjs                → OK 37 source modules, 112 construction methods, 190 inventory rows, 120 evidence targets (regenerated --write)
node --test tools/labs_coverage_test.mjs    → pass 11, fail 0
node tools/kit_check.mjs                    → All kit checks OK (29 passed)
node tools/fable_swap_matrix.mjs            → OK swap matrix: 186 rows = 186 active inventory rows …
node tools/footprint_golden.mjs             → footprint golden: EQUAL
git diff --check origin/fable/integration...HEAD → (no output), exit 0
```

Golden determinism and proofs (S1.1, scratch copies only): 3 Metal runs byte-identical; Metal vs SwiftShader
byte-identical after the command-hash change. Perturbations: extra draw in `buildPollen` → DIFFERENT,
"first summit builder to change: buildPollen (draws 270 → 271)", exit 1; tree collider pad → DIFFERENT; land
texture seed → DIFFERENT; perch rim radius → DIFFERENT (44 sightline rows); removed method → DIFFERENT
(`- api makeVistaTextureLegacy`); extra Object3D → EQUAL.

Boots (Metal, `tools/headless.mjs`, entering the summit in the live game for 4 s):

```
/__boot.html                                        → plays (6.2 s); summit {"set":"classic","scoped":true,"kit":0,"active":true,"colliders":24,"platforms":8}
/index.html?assets=modular --session catwalk_autostart=new → plays; summit {"set":"modular","scoped":true,"kit":0,"active":true,"colliders":24,"platforms":8}
errors in both: only the optional /cad-overrides.json 404 (as in Phase 0)
```

Previews vs the Phase 0 masters (`tools/capture_baseline.mjs --only summit --compare _baseline`), with a control
capture of the unchanged code taken in the same session. meanΔ vs masters, split / control: meditation
10.75 / 11.35, arrival 0.78 / 0.89, approach-front 0.21 / 0.13, approach-side 0.77 / 0.76, meadow-gate
14.12 / 14.04, edge-left 4.12 / 4.30, edge-right 3.84 / 3.44, edge-sheet 1.29 / 1.38. Split vs control
directly: meanΔ 0.12–1.98, within the repeat noise (0.05–1.31 here; Phase 0: up to 10.6). The meditation
frames, inspected side by side, differ only in grass sway; the city and the sea are open from the seat.

## Files changed (vs fable/integration)

`src/mountaintop.js` (facade), new `src/summit/{common,light,terrain,clearing,planting,vista,weather,wildlife}.js`,
`tools/summit_golden.{html,js,mjs}`, `tools/golden/summit_classic.json`, `tools/golden/summit_test.txt`,
`tools/summit_test.mjs`, `tools/verify.mjs`, `AGENTS.md` (the summit row and the summit paragraph's references),
`labs/asset_inventory.json` (six anchor strings only), `labs/ASSET_COVERAGE.md` (regenerated),
`docs/fable/status/s1-summit-split.md`, `docs/fable/handoff/s1-summit-split.md`. 21 files, +7,190 / −3,316.
Untouched: `src/main.js`, `index.html`, `src/ui.js`, every other `src/` module.

## Assets promoted / deferred, waivers

None promoted (serial split lane); all 32 summit rows are routed and ready for `s2`–`s4`. No footprint waivers.

## Self-review against the lane's acceptance list

- Golden EQUAL after every commit: yes (the gate ran before each of the 20 lane commits; final EQUAL).
- `summit_test.mjs` identical check count and all pass: 70 / 70, output byte-identical to the pre-change run.
- `verify.mjs` all pass, no check removed: 50 → 53 PASS lines, every earlier name present.
- `check_syntax`, `labs_check`, `labs_coverage` (+`--write`), `git diff --check`: all pass.
- Inventory anchors: 26 verbatim; 6 anchor strings edited (only those), listed in the handoff.
- Previews vs Phase 0 masters: within the noise floor (control capture proves it); meditation view first.
- Full headless boot clean: yes, classic and `?assets=modular`.
- No new `this.rng()` draws, none reordered or removed: draw count 51,267 / 48,694 unchanged, probe ok; the
  routing test proves the same position with every id swapped in. The grass draws nothing from it.
- No cache tag bumped; new files import with `20261107a`.

## Open concerns

1. **Merged, not rebased.** The coordinator asked for `git rebase fable/integration`; the claim commit was
   already pushed, and a rebase would need a force-push (forbidden). I merged 619aab7 and later 5297f2d
   instead; the second merge's only conflict, the generated `labs/ASSET_COVERAGE.md`, was regenerated.
2. **Cache tag bump** must include `src/summit/*.js` (the AGENTS.md `sed` form does not list it; the Node
   form walks `src/`) and `tools/summit_golden.html/.js`. `verify.mjs` now fails if a summit module is left
   behind. `check_syntax.mjs` does not walk `src/summit/` (verify step 1 covers it).
3. **Summit Lab code panel** (`labs/summit`, "The city, today") now shows the one-line delegator for
   `buildKyotoCity`; the tile still builds. Suggested fix in the handoff (lane `s3`).
4. **Kit lanes must supply handles** that the facade's per-frame code reads without a guard: `_rays`
   (shrine-rays), `summitClouds`, `butterflyMat`, `summitBirds`. The handoff tables every id's binds and
   fields. Otherwise a kit for those ids needs a small facade guard (an Integrator edit).
5. **Layout data that is not plain:** `summit-trees` layouts carry each tree's canopy geometry, because
   `buildCanopy` draws from `this.rng` and must run in the layout step to keep the stream identical.
6. `summit-wildlife` is an umbrella row (butterflies + birds have their own rows): its classic step adds
   nothing, so a kit can add visitors there.
7. The golden JSON is kept as recorded from the unchanged code; its advisory sections (API additions,
   `state.assets`, `_tree` attribution) differ from the current build by design. `--write` would refresh
   them; I did not, so the file stays the "before".
8. `summit_preview` captures are not repeatable (real-time clock); they were used as a sanity check against a
   same-session control capture, not as a gate.

PR: https://github.com/c1t1zen1/Michi-Neko-The-Cat-Philosophers-Path/pull/12

## Fix round 1 (review: Needs fixes)

Resumed after the previous worker's session died at 01c745e. Merged
`origin/fable/integration` 4273c90 (c3 + the outside Roof Road downtown merge)
as 8bcec2a: no conflicts; `labs_coverage --write` regenerated
`labs/ASSET_COVERAGE.md` byte-identically. Baseline after the merge: golden
EQUAL, summit_test 70/70, verify all passed (53 PASS lines).

Commits: `01c745e` (Important 1, previous worker: the golden records the GLB URL
without `?v=`, one golden line changed), `8bcec2a` (merge), `2ae5b88` (Important 2
and the minors). Pushed fast-forward (`git push --no-thin`: a plain push was
refused by GitHub with "missing necessary objects"; no force).

### Important 2: unguarded update handles

Audited every per-frame, animation and state path in `src/mountaintop.js` and
`src/summit/**` (`update`, `setQuality`, `setUnlocked`, `setActive`,
`updateAmbientWildlife`, `startBirdFlyby`, `resetAmbientWildlife`,
`updateMeditationAtmosphere`, `updateSakuraPetals`, `updateVistaEnvironment`,
`reseedSnow`, `reseedRain`) and the build-time reads of a sibling's handle. Each
read of a routed handle is now bound through `layout.bind` (warned once when the
kit lacks the part) or null-guarded:

- `update()`, valley side: the thicket, the reveal and the portal no longer sit
  under `this.raysGroup` (the reviewer's example); `_rays` is pulsed when set.
- `update()`, summit side: `summitClouds` and the pollen positions are skipped
  when absent (`pointsPosition()`, new in `src/summit/common.js`).
- `setQuality()`: the rain/snow budgets read `pointsPosition()` (a plain-part
  kit `drops`/`flakes` threw on `geometry.attributes`).
- `src/summit/wildlife.js`: no bird pool flies nobody; without the classic
  `butterflyMat` a kit swarm shows for each visit; points move only when there
  are points, never past the layout's seeds.
- `src/summit/clearing.js`: the fūrin's sail and clapper are optional; the
  chime's proximity uses the bell's summit-local position (classic: its own
  position, unchanged; a kit bell inside its instance group is converted), so a
  kit bell rings at the layout's spot. Without this the golden's drive shows
  the kit bell never ringing (fūrin 0, expected 1).
- `src/summit/vista.js`: a kit `summit-vista` without a `layers` part holds the
  classic layers in its instance group (the classic layers threw on
  `this.vista.add`); a `sky_fill` part without `groundColor` is fine.
- `src/summit/weather.js`: `reseedSnow` / `reseedRain` skip a part without geometry.

Per-entry guards on classic-only arrays (that a kit could only supply through
`footprint.anchors`, owning the shape) were tried and removed again: a mutation
pass showed no test could reach them, and they protect no missing handle.

Classic is unchanged: golden EQUAL, the 70 original summit_test lines
byte-identical, 51,267 summit draws (probe ok), no `this.rng()` draw added,
removed or reordered (the runtime draws in `startBirdFlyby` etc. are the same
on classic; only a kit with no bird pool skips the per-bird draws).

### Tests added (none removed)

`tools/summit_test.mjs`, 70 → 83 checks. Every summit inventory id is built from
a kit stand-in through the real `AssetRuntime` (imported natively), three ways:
bare (no bound parts), first-part only (a bell without sail and clapper, a sky
fill without the warm fill, a pool without motes), plain parts (every bound part
an Object3D with only a colour). Each is driven through `setQuality` (3 tiers),
the unlock, the valley beacon, the portal, 5 weathers × 3 sun heights × 3 spots
with wildlife forced, the perch, the direct calls and leaving. Plus: one warning
per unresolved bind through the runtime (25/25), no repeat on a re-bind, an
unknown parent warned once, a kit vista without `layers` holding the classic
layers, a `?swap` of an unregistered id warned once. The stub got a
`getObjectByName` (placeAsset's parent lookup). `tools/golden/summit_test.txt`
regenerated: lines 1–74 unchanged, the section and 13 checks added, the summary
line changed; three runs identical (`910b124d…`).

`tools/summit_golden.js` routing self-test: `driveSummit()` runs the same drive
with real three.js on a classic control, the all-modular plain-part build and an
all-modular bare build; nothing may throw, the portal must open, the perch must
engage the scenic camera, the fūrin must ring once where a bell exists and never
without one, and the bare build must warn once per unresolved bound field.

Proof the tests bite:

```
summit_test.mjs on the pre-fix sources (git stash of src/):  73 passed, 8 failed
  FAIL bare stand-ins: ... never throw  -> update (clear, sun 1): Cannot read properties of undefined (reading 'length') | ...
  FAIL bare stand-ins: the portal behind the shrine opens with no beacon handle
  FAIL bare stand-ins: each missing bound part is warned once, through the runtime  -> 0 warnings for 25 bound fields
  FAIL plain-part stand-ins: ... never throw  -> setQuality: Cannot read properties of undefined (reading 'attributes') | valley beacon: this._rays is not iterable | ...
  FAIL a kit vista without a layers part still holds the classic layers  -> Cannot read properties of null (reading 'add')
  ...
summit_golden.mjs --no-test on the pre-fix sources:  summit golden: EQUAL, ROUTING FAILED  (exit 1)
  drive    ... classic 0 throws, portal ok, perch ok, fūrin 1; modular 21 throws, portal SHUT, perch NO VIEW, fūrin 0; bare 1 throws, portal SHUT, perch NO VIEW, fūrin 0; bind warnings 0/25 (bare)
fūrin conversion alone undone (const at = this.furin.position):  EQUAL, ROUTING FAILED
  routing  drive all modular: the fūrin rang 0 time(s), expected 1
scratch mutation pass (each of the 21 new guards undone alone, summit_test.mjs):  21 of 21 mutations caught
```

### Minors

- Routing self-test "not run" exits 2: `summit_golden.mjs` returns 2 when
  `routing` is missing or `ran: false` (headline `ROUTING NOT RUN`, usage text
  updated). Checked by forcing the page's routing test off (restored after):
  `summit golden: EQUAL, ROUTING NOT RUN` / `routing  not run: forced off for the exit-code check` / exit 2.
- Warn-once: `SummitManager.placeAsset()` warns through the runtime's
  `warnOnce` (so it lands in `assets.summary().problems`; a module-level set
  and `console.warn` when the assets object has no runtime) for a `layout.bind`
  part the instance lacks, a `layout.parent` not in the summit, and a
  `?swap=<id>:modular` for an id with no kit registered. Live:
  `/index.html?swap=summit-furin:modular` → problems
  `["summit-furin: ?swap asks for the kit, but no kit asset is registered under that id; it builds classic"]`, one `[kit]` console warning.
- Status and handoff made accurate: tag `20261113a` (was `20261107a`), both
  AGENTS.md tag-bump forms already walk `src/summit/` (the `sed` advice was
  stale), the valley runtime visiting summit instances described plainly (not
  "harmlessly"), the handle table has no "unguarded" rows left and explains
  what a kit may leave out, four integration merges (not two), the regenerated
  `summit_test.txt`, the one-line change to `summit_classic.json`, `main.js`
  line ~356, state "review fix round 1 done; ready for re-review".

### Checks (real output, committed tree 2ae5b88)

```
node tools/summit_golden.mjs                       → exit 0
  summit golden: EQUAL
  rng      summit 51267 draws (probe ok) · Math.random 0 · volatile 0 leaves, 0 members
  routing  ok: 32 summit ids, 34 classic placeAsset() calls; all modular 34/34 stand-ins, 51267 draws (probe ok); single swaps 32/32 ok (10.2 s)
  drive    update() on classic and kit stand-ins: classic 0 throws, portal ok, perch ok, fūrin 1; modular 0 throws, portal ok, perch ok, fūrin 1; bare 0 throws, portal ok, perch ok, fūrin 0; bind warnings 25/25 (bare)
  test     summit_test.mjs "83 passed, 0 failed", output identical to tools/golden/summit_test.txt (91 lines)
  (advisory notes: the same 9 entries as before this round)
node tools/summit_test.mjs                         → 83 passed, 0 failed (exit 0)
node tools/verify.mjs                              → All checks passed (exit 0); 53 PASS lines (53 before, none removed); "All 8 summit modules OK (src/summit/)", "83 passed, 0 failed", "All kit checks OK (29 passed)", "kit_test: tests 36, pass 36, fail 0"
node tools/check_syntax.mjs                        → All 62 modules OK
node tools/kit_check.mjs                           → All kit checks OK (29 passed)
node tools/labs_check.mjs                          → All labs checks OK (after labs_coverage --write: line links only)
node tools/labs_coverage.mjs                       → OK 37 source modules, 112 construction methods, 190 inventory rows, 120 evidence targets
node --test tools/labs_coverage_test.mjs           → pass 11, fail 0
node tools/fable_swap_matrix.mjs                   → OK swap matrix: 186 rows = 186 active inventory rows …
node tools/footprint_golden.mjs                    → footprint golden: EQUAL (valley_classic.json byte-identical)
git diff --check origin/fable/integration...HEAD   → no output, exit 0
Boots (Metal, tools/headless.mjs, summit unlocked then entered for 4 s):
  /__boot.html                                     → {"set":"classic","scoped":true,"kit":0,"active":true,"colliders":24,"platforms":8,"problems":[]}; only the cad-overrides.json 404
  /index.html?assets=modular (autostart new)       → {"set":"modular","scoped":true,"kit":0,"active":true,"colliders":24,"platforms":8,"problems":[]}; only the cad-overrides.json 404
```

### Files changed this round

`src/mountaintop.js`, `src/summit/{common,clearing,vista,weather,wildlife}.js`,
`tools/summit_test.mjs`, `tools/golden/summit_test.txt`, `tools/summit_golden.js`,
`tools/summit_golden.mjs`, `labs/ASSET_COVERAGE.md` (regenerated),
`docs/fable/status/s1-summit-split.md`, `docs/fable/handoff/s1-summit-split.md`
(plus 01c745e: `tools/summit_golden.js`, `tools/golden/summit_classic.json`).

### Open concerns after this round

1. A kit that wants the facade to drive a classic-only field (`summitClouds`,
   `summitBirds`, `_rays`, the weather materials) sets it through
   `footprint.anchors` with the classic shape and owns that shape; the facade
   does not validate anchor-supplied structures (documented in the handoff).
2. The global runtime's `update()` (valley) also walks the summit's kit
   instances while the summit is hidden; zero cost today (no summit kits), an
   Integrator call if a heavy animated summit kit lands.
3. Open concerns 1–3, 5–8 of the first report stand; concern 4 (unguarded
   handles) is resolved by this round.
