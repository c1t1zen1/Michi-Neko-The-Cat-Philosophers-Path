# c1-rig-split — report

- Lane: `c1-rig-split` (BUILD_GUIDE_FABLE.md §10, Phase 3 step C1, serial)
- Worker / model: Claude Opus 5.5 (claude-opus-5-5)
- Worktree / branch: `/Users/c1t1zen/Documents/GitHub/michi-wt/c1-rig-split`, `fable/c1-rig-split`
- Base: 5dc924a at claim; `origin/fable/integration` merged in at 4bac869 (f1-runtime) and 619aab7 (Phase 0)
- PR: https://github.com/c1t1zen1/Michi-Neko-The-Cat-Philosophers-Path/pull/9 (into `fable/integration`)
- Status: **DONE_WITH_CONCERNS** (the concerns are process notes, not defects: see the last section)

## What was built

The `Cat` class (1158 lines) is now a 250-line facade over `src/characters/`:

| Module | Moved out of `Cat` (verbatim, `this.` → `host.`) |
|---|---|
| `rig.js` | body-type lookup (`resolveBuild`, `anatomyFor` + `sculptStats`), `buildSkeleton` (bones, rest landmarks, leg rigs = the IK wiring, tail segments), `applyPose` (girdles, neck, head, leg IK solve, tail), `layTailOnGround` |
| `parts/coat.js` | palette block of the constructor (`coatPalette`, `STRIPE_Z`), the four fur materials (`coatMaterials`), `buildCoat` (skinned coat + tail, head, outline hulls) |
| `parts/face.js` | face-uniform block of `buildMaterials` (`faceFrame`), inner-ear and nose materials (`faceMaterials`), `buildFace` (muzzle, nose, whiskers, eye markers, ears) + the whisker material singleton |
| `parts/collar.js` | ribbon and bell materials, `buildCollar` split at the bell mount (`buildCollarCord`, `buildBell`), the Master Cat body (`goldBell`) and its reverse; the accessory part records `kumihimo` (collar), `suzu`, `suzu-master` (bell) |
| `parts/shadow.js` | `buildShadowBlob`, `updateShadow` + the blob texture singleton |
| `behaviour/locomotion.js` | gait phase tables, `computeLocomotion`, `onJump`, `onLand`, `onSprint`, `setProwling` |
| `behaviour/poses.js` | `makeNeutralPose`, `placeBody`, `poseSit`, `getActionPose`, `applyLook`, `setLookTarget`, `setDrinking`, `rollIdleInterval`, `startIdleAction`, `beginIdleAction`, `endIdleAction` |
| `behaviour/mood.js` | `getMoodConfig`, `setMood`, `canPlaySound`, `triggerMeow`, `applyMood` |
| `character.js` | the constructor's state block (`initCharacterState`), `update` (`updateCharacter`), plus everything new below |

New in `character.js` (C1.3):

- **CharacterDef** `{ id, build, palette: { fur, belly, accent, stripes }, face: { eyes, nose }, accessories: [{ slot, part, ...params }], scale, personality }` — `validateCharacterDef` (→ `{ ok, errors }`), `defineCharacter` (defaults, frozen; accessories omitted = classic collar + bell, `[]` = none), `MICHI` (the player), `catDefFromOptions` (the legacy constructor options, read exactly as before, lenient), `characterDefFor`.
- **Accessory slots** `collar`, `bell`, `head`, `back`; part registry (`registerCharacterPart`, `characterPart(s)`); `setAccessory(host, slot, part | entry | null)` swaps in place when the part has `swapTo`, else removes (with dependents: the bell goes with the collar; owned geometry/materials/textures disposed; host fields cleared) and builds on the slot's mount (neck, bell mount, head bone, chest bone). Refuses unknown slots/parts, wrong-slot parts, and a part with nothing to hang on — before making anything.
- **`setMasterCat()` is a slot swap**: the bell slot goes to its part's `master` (`suzu` → `suzu-master`, in place: same bell mesh, gold material, the twin added — the exact original object operations). Once per cat, as before.
- **Assembly** (`assembleCharacter`) in the classic Cat's exact call order (it matters: three.js draws four `Math.random` per uuid and the collar/bell textures draw their noise from `Math.random`, which the seeded review sheets depend on). Empty slots and tier machinery create nothing at construction.
- **Tiers**: `hero` = today's character; `mid` and `far` hide the outline hulls (`host.outlines`) and whiskers; `far` waits for an `onCharacterTier(fn)` hook (c2/c3) to supply the merged mesh; part-level `setTier` hooks; `quality: 'low'` locks the classic hero; `characterTierFor({ quality, set, distance })` = hero on low and on the classic set, else by `TIER_DISTANCE { mid: 12, far: 32 }` (provisional). Nothing in the game calls it yet, so no visible change.

`src/cat.js` keeps all 33 methods with the same arity, all fields as plain own properties, the `Cat` and `catRimUniforms` exports; adds `setAccessory`, `setTier`, constructor options `def`/`tier`/`quality`, and re-exports `MICHI`, `defineCharacter`, `validateCharacterDef`, `CHARACTER_SLOTS`, `CHARACTER_TIERS`, `characterTierFor`. `src/npc.js` and `src/player.js` are unchanged.

**Tooling:** `tools/cat_golden.html/.js/.mjs` + `tools/golden/cat_classic.json` (627 KB). Generated from the unchanged code and committed before any move. The page seeds and counts `Math.random`, steps `performance.now`, and digests: the class surface and exports; 11 cats built as each caller builds them (player, three villagers, Chidori, cadJS, catalog, defaults, nose + unknown build, a custom build object, Master Cat twice) with their full scene graph (types, names, parents, transforms, flags, userData, uuids = construction order), geometry/material/texture/skeleton tables (attribute hashes, uniforms, canvas hashes), every own field; all 29 distinct review-sheet poses (cat_preview's `pose()` verbatim); 280 behaviour samples (a scripted player day with audio stub, and the three villagers driven through the real `npc.js`: notice, greet, startle, wander, night sleep, wake); `player.js` mounting. The CLI allows only additions (new fields, methods, statics, exports) and lists them. After the digest it runs 35 contract checks.

## Every check run (real output, trimmed)

Golden and contract checks:
```
$ node tools/cat_golden.mjs
cat golden: EQUAL
  counts   11 cats · 29 poses · 280 samples · 141 geometries · 147 materials · 40 textures · 13 skeletons · 5 sculpts · Math.random 3334971
  allowed  … additions: exports CHARACTER_SLOTS, CHARACTER_TIERS, MICHI, characterTierFor, defineCharacter, validateCharacterDef;
           prototype.setAccessory, prototype.setTier; fields def, outlines, slots, tier, tierLock, whiskers
  checks   35 passed, 0 failed
```
- After each of the 9 module moves (rig, coat, face, collar, shadow, locomotion, poses, mood, character + facade): `EQUAL`.
- Final page against a scratch copy of `src/` @ 5dc924a (`--root`): `EQUAL … byte-identical to this build` (the edited checks section did not move the digest).
- Determinism: two Metal runs byte-identical (sha256 `c251c0ae…` twice before the golden was written). SwiftShader differs only in 38 canvas-texture hashes (2D rasterisation), all else equal.
- Sensitivity, on scratch copies of the unchanged code: whisker opacity 0.7→0.71 → `DIFFERENT (1 differences)`; one extra `new THREE.Object3D()` in buildFace → `DIFFERENT (4747 differences)`; trot rate 4→4.01 → `DIFFERENT (1002)`; sleepy blinkBase 1.8→1.81 → `DIFFERENT (1260)`; all exit 1. A Luna def with ribbon 0x2b3d63→0x2b3d64 makes the def-equivalence check FAIL.
- The 35 checks include: `new Cat({ def: MICHI })` ≡ the player and a Luna def ≡ npc.js's Luna from the same seed (uuids, graph, fields, materials and canvas textures by value); 12 invalid defs rejected; sculpt cache (second Mochi `requests +2, sculpts +0`; a new body type `sculpts 5 → 6 → 6`); `setMasterCat` in place (`suzu-master`, bell mount children 6 → 7, same bell mesh); reverse swap; collar removal (`outlines 6 → 5, geometries disposed 6`); re-added collar/bell at the classic position; head/back slots on test parts; 0 sculpts and 0 lookups across every swap; a swapped cat animates 600 frames; tiers, hooks, part tier hooks, low lock, tier at construction, `characterTierFor`.

C1.4 sheets (Phase 0's own tool):
```
$ node tools/capture_baseline.mjs --masters <scratch> --previews none --only cat --compare /…/michi-wt/_baseline
| cat | anatomy … | `8515ec81…` | 0 / 0 / 0 (identical) | 0 / 0 / 0 |      (all 18 rows: anatomy, face, coat, gait, stride,
…                                                                                poses, sleep, closeup, npcs, each ±golden)
```
Every master SHA-256 equals the one in `docs/fable/baseline/captures.md`; rerun on the final commit: 18 × `0 / 0 / 0`.
`&raw=1` (not captured by Phase 0): 9 sheets before vs after, rows 25–725 (the bottom-left label prints the sculpt time) → `maxDelta 0` × 9.

C1.4 perf, 10 interleaved runs each, unsplit snapshot vs split, `?sheet=anatomy&perf=1` (medians, min–max):
```
                        base            split
michi first (ms)        93 (93–95)      94 (92–96)
  sculpt (ms)           69 (68–70)      69 (68–70)
luna / mochi / kuro     48 / 45 / 42    47 / 45 / 42
michi cached (ms)       3.5 (3–4)       3.0 (3–4)
update ms/frame, 4 cats 0.022           0.022
tris  body 32640 head 19972 tail 1232 (both)
```

Node checks:
```
node tools/rooftop_test.mjs        → 38 passed, 0 failed
node tools/check_syntax.mjs        → All 44 modules OK   (+ node --input-type=module --check × 9 src/characters/** → OK)
node tools/verify.mjs              → All checks passed
node tools/kit_check.mjs           → All kit checks OK (27 passed)
node tools/summit_test.mjs         → 70 passed, 0 failed
node tools/labs_coverage.mjs       → FAIL coverage report is stale (line links) → --write → OK 37 source modules, 112 construction methods, 190 inventory rows
node --test tools/labs_coverage_test.mjs → 11/11
node tools/labs_check.mjs          → All labs checks OK
node --test catalog/tests/*.test.mjs → 37/37
git diff --check origin/fable/integration...HEAD → clean
```

Browser:
- `/__boot.html` (Metal): boots and plays in ~10 s; `{"quality":"high","set":"classic","catTier":"hero","slots":["collar","bell"],"npcs":["Luna:cat:idle","Mochi:cat:idle","Kuro:cat:walk"],"fps":60}`; only console line the optional `cad-overrides.json` 404 (same as Phase 0). A second boot ran `setMasterCat()` in game → `suzu-master`, twin, the cat keeps animating. (`?assets=modular` is dropped by the `__boot.html` redirect, so that run was classic too.)
- Catalog suites against `cadJS/server.mjs` on a free port: adapters `195/195 … 0 browser errors` (all nine cat adapters PASS: michi, luna, mochi, kuro, cat-coat, cat-face, cat-collar, master-bells, cat-shadow), smoke `17/17`, cad handoff `12/12`; worktree unchanged.
- Smoke, 0 errors each: `kyoto-rooftops.html?mouth=3` and `?auto=1` (cat + Chidori), `labs/grass`, `labs/villagers`, `labs/water`, `labs/pagoda`, `labs/machiya`, `labs/ground?village=1`, `tools/summit_preview.html?view=meditation`.

## Files changed (vs `origin/fable/integration`)

```
src/cat.js                              facade (1082 lines changed)
src/characters/character.js             +615
src/characters/rig.js                   +201
src/characters/parts/{coat,face,collar,shadow}.js   +82 +125 +215 +44
src/characters/behaviour/{locomotion,poses,mood}.js +169 +239 +159
tools/cat_golden.html / .js / .mjs      +44 +889 +229
tools/golden/cat_classic.json           +16545 (627,475 bytes)
labs/ASSET_COVERAGE.md                  16 lines (line links)
docs/fable/status/c1-rig-split.md, docs/fable/handoff/c1-rig-split.md
```

Commits (oldest first): c6172c8 claim · c34a4be golden from the unchanged Cat · d4a588b merge 4bac869 · 17f3c0f rig.js · 0ec1f09 coat.js · 571140d face.js · 4418e6a collar.js · e3bebe5 shadow.js · 1cee06c locomotion.js · f4ad945 poses.js · ce58180 mood.js · 35bd832 character.js + facade · 5af7d88 contract checks · 75bb16e merge 619aab7 · 25a6164 coverage report · 66880ce status, handoff, literal tagged imports · 22fd814 setAccessory guard.

## Assets promoted / deferred
None promoted (structural lane). Classic parts registered: `kumihimo`, `suzu`, `suzu-master`. Deferred by design to c2/c3/c4: modular parts, villager defs, the far-tier merged mesh, wiring tier switches into the game, non-cat rigs.

## Footprint waivers
None. Scene graph (names, child order, transforms) identical, so cadJS paths and the catalog's `cat[part]` adapters keep resolving.

## Self-review against the lane card

- C1.1 modules exactly as named — yes, nine files, no extras.
- C1.2 moved without behaviour change; `Cat` keeps every public method/property and delegates — yes: golden EQUAL (fields, arity, exports), sheets byte-identical; moved functions were extracted mechanically (`this.` → `host.`) and the two hand-moved blocks (`update`, constructor state) were diffed against the originals (identical except the two parameterised option reads).
- C1.3 CharacterDef with the frozen field names, slots `collar`/`bell`/`head`/`back`, `setMasterCat()` as a slot swap, tier mechanism with hero/mid/far hooks and the quality-low rule — yes, with 35 checks.
- C1.4 every sheet (+ golden variants, + raw) vs Phase 0, perf within noise, Roof Road test — yes.
- C1.5 sculpt cache per body type works; part swaps never re-sculpt — proven with `sculptStats` (0 sculpts, 0 lookups per swap) and anatomy/geometry identity.
- Hard rules: only lane files touched (plus the brief-sanctioned `labs_coverage --write`); no tag bumps; no new deps; BOM of `src/cat.js` preserved, LF endings; scratch outside the repo; no `git add -A`; nothing under `dawCAT/` or `cadJS/` staged; no subagents.

## Open concerns / notes for the Integrator

1. **Merged, not rebased.** Asked twice to `git rebase fable/integration`; the claim commit was already pushed, so a rebase needs a force-push, which the common rules forbid. I merged `origin/fable/integration` instead (two merge commits). The untracked `tools/headless.mjs` was deleted before the Phase 0 merge; the tracked one is used.
2. **`tools/check_syntax.mjs` does not walk `src/characters/`** (hot-ish tool, not mine): exact patch in the handoff §2.1. Until then G1's syntax check misses the nine modules (I checked them by hand).
3. **AGENTS.md** still says gait and poses live in `src/cat.js`: replacement text and a Layout row in the handoff §2.3.
4. **`labs_coverage.mjs` classifies only `src/*.js`**, so cat-component inventory rows keep pointing at the facade methods in `src/cat.js`; repointing them to `src/characters/parts/*.js` needs that tool to walk `src/characters/` (handoff §4).
5. `tools/cat_preview.js` and `rooftops/js/game.js` import `cat.js?v=20261106a` (stale before this lane); harmless, fix at the next tag bump. `tools/cat_golden.html/.js` carry `?v=20261107a` literally and need bumping with the rest.
6. The golden is for Metal (default on macOS); under SwiftShader 38 canvas-texture hashes differ.
7. c4's non-cat rigs are not supported by `build` yet (a contract extension for the Integrator; suggestion in the handoff).

## Review fix round 1

Commit 846fd1f (pushed to `fable/c1-rig-split`, PR #9). `fable/integration` is still 619aab7, so no new merge was needed.

**IMPORTANT 1, fixed: changing the collar no longer drops the bell, and a Master Cat stays one.**
- `kumihimo` now has a `swapTo`. A same-part recolour repaints the ribbon texture in place and disposes the old one. Nothing else is rebuilt and the bell is untouched.
- Any other collar swap remembers the parts hung on the old collar (`dependents()`). After the new collar is built, they are hung again on its mount when it has one; if it has none, a warning names the part that was left off.
- `setAccessory` swaps any bell part for its `master` part once `host._masterCat` is set. So the gold bell and twin survive collar changes, and a bell added later to a Master Cat is the gold one.
- New golden checks:
  - Recolour on a Master Cat: same bell mesh, gold material, twin present, old ribbon texture disposed.
  - A different collar part on a Master Cat (a test part with its own bell mount), then back to `kumihimo`: the bell is re-hung both times, still gold with its twin.
  - Empty the collar, re-add it, then add `suzu`: you get `suzu-master`.
  - The same entry with its keys in another order: same handle, no rebuild, 0 `Math.random` draws.

**Integrator rulings, applied:**
- `sameEntry` compares entries by sorted keys.
- `validateCharacterDef` rejects unknown `build` names, listing the known `BODY_TYPES`. Legacy constructor options stay lenient (an unknown name still sculpts Michi). New check: "rejects a def with unknown body type".
- `characterTierFor` imports `TIER_POLICY` and `BAND_RADII` from `src/kit/contract.js`. The band comes from camera distance (near < 39 m, rim < 80 m). Low quality and the classic set stay `hero`. `TIER_DISTANCE` is removed.
  - The check prints `high@2=hero high@50=mid high@120=far medium@2=mid medium@50=far medium@120=far`.
  - Note: the kit policy puts `medium` at `mid` even near the camera.
- `delete host[f]` becomes `host[f] = undefined` (character.js `removeAccessory`, collar.js `brassBell`).
- The `src/cat.js` doc now says what `quality: 'low'` does: it locks the tier at `hero` (`options.tier` and `setTier()` are ignored). It does not choose the def: a modular def is built as given, just never stepped down, and choosing the classic def on low quality is the caller's job. The same wording is in the character.js header and the handoff.
- The status file notes the cat golden is Metal-only for canvas textures: 38 hashes differ under SwiftShader, so G-C runs it on Metal.

**Covering checks (real output):**
```
node tools/cat_golden.mjs        → cat golden: EQUAL · checks 40 passed, 0 failed
node tools/capture_baseline.mjs --only cat --no-repeat --compare …/_baseline → 18 × "0 / 0 / 0"
node tools/rooftop_test.mjs      → 38 passed, 0 failed
node tools/check_syntax.mjs      → All 44 modules OK   (+ node --input-type=module --check × 9 src/characters/** → OK)
node tools/verify.mjs            → All checks passed
node tools/labs_check.mjs        → coverage report stale (the cat.js doc grew 4 lines) → labs_coverage --write (only #L links) → All labs checks OK
node tools/kit_check.mjs         → All kit checks OK (27 passed)
git diff --check                 → clean
```
I did not touch the `check_syntax` change for `src/characters/`, as instructed; the Integrator applies it.
