# c1-rig-split

- Worker / model:     Claude Opus 5.5 (claude-opus-5-5)
- Claimed:            2026-11-13 04:12 PST
- Branch:             fable/c1-rig-split
- Base commit:        5dc924a at claim; `fable/integration` merged in twice since (4bac869 f1-runtime, 619aab7 Phase 0) — merged, not rebased, because the claim commit was already pushed and the common rules forbid a force-push
- State:              ready for review

Lane: guide §10, Phase 3 step C1 (serial). The `Cat` class split into
`src/characters/` (rig, parts, behaviour, `CharacterDef`), with `Cat` kept
as the facade. No visible or behavioural change: proven numerically
(`tools/cat_golden.mjs`) and by pixels (18 review sheets byte-identical to
the Phase 0 masters).

## Assets
| Inventory id | Promoted from (lab/specimen) | Parts | Tiers | Footprint | State |
|---|---|---|---|---|---|
| (none: structural split, no promotion) | | collar slot `kumihimo`; bell slot `suzu`, `suzu-master` | hero (classic); mid/far mechanism + hooks | unchanged | split |

## Steps
- [x] C0 Claim, read, API contract (callers + public surface, below)
- [x] C0.1 Numeric golden from the UNCHANGED code (`tools/cat_golden.html/.js/.mjs`, `tools/golden/cat_classic.json`), committed (c34a4be) before any move
- [x] C1.1 `src/characters/`: `rig.js`, `parts/coat.js`, `parts/face.js`, `parts/collar.js`, `parts/shadow.js`, `behaviour/locomotion.js`, `behaviour/poses.js`, `behaviour/mood.js`, `character.js`
- [x] C1.2 Code moved out of `Cat`, one module per commit, golden EQUAL after each; `Cat` keeps all 33 methods (same arity) and every field, and delegates
- [x] C1.3 `CharacterDef` `{ id, build, palette, face, accessories, scale, personality }`, slots `collar`/`bell`/`head`/`back`, `setMasterCat()` = bell slot swap, tier mechanism (hero / mid / far + hooks, quality `low` lock, `characterTierFor`)
- [x] C1.4 Proof of no change: 18 cat sheets byte-identical to the Phase 0 masters (same SHA-256), `&raw=1` identical outside the build-time label, `&perf=1` A/B within noise, `rooftop_test.mjs` 38/38
- [x] C1.5 Sculpt cache per body type kept (`getCatAnatomy` cache, same module instance); `sculptStats` counter proves 0 sculpts and 0 lookups per part swap
- [x] Checks, handoff (`docs/fable/handoff/c1-rig-split.md`), report, PR

## API contract (who calls `Cat`, and what they use)

Every one of these keeps working unchanged (checked: golden, sheets, boot, labs smoke, catalog suites).

| Caller | Builds with | Uses |
|---|---|---|
| `src/player.js` | `new Cat({ fur, belly, accent, audio })` | `group`, `update(dt, speed, grounded, sprint, turning, inWater, nearObject)`, `onSprint`, `onJump`, `onLand`, `updateShadow`, `triggerMeow`, `setProwling`, `jumpTime`, `landTime` |
| `src/npc.js` | `new Cat({ stripeAmount, idleProfile, fur, belly, accent, eyeColor, ribbonColor, build, audio })` | `group.scale`, `setMood`, `slowBlinkTimer` (r/w), `idleAction`, `startIdleAction`, `endIdleAction`, `setLookTarget`, `update` |
| `src/main.js` | — | `catRimUniforms` (import); `player.cat` / `npc.cat`: `setMood`, `setMasterCat`, `setDrinking` |
| `src/context_actions.js` | — | writes `idleAction`, `idleActionTimer`, `idleActionDuration`, `idleTimer`, `yawnOpen`, `blink`, `blinkTimer`; reads `isDrinking`; `endIdleAction`, `setMood` |
| `src/mountaintop.js` | — | `idleAction`, `idleActionTimer`, `idleActionDuration`, `idleTimer` (r/w), `state`, `endIdleAction`, `setMood` |
| `src/ambient_life.js` | — | `mood`, `setMood` |
| `src/grass.js` (via `vegetation.js`, `mountaintop.js`) | — | `chest`, `hips`, `legs[i].paw` (world positions for the grass stamps) |
| `rooftops/js/game.js` (`cat.js?v=20261106a`) | `new Cat({ fur, belly, accent })`; Chidori `{ fur, belly, accent, eyeColor, stripeAmount, ribbonColor }` | `catRimUniforms`, `group` (position, rotation, scale), `update`, `updateShadow`, `onJump`, `onLand`, `setLookTarget`, `setMood`, `setProwling`, `startIdleAction`, `endIdleAction`, `idleAction` |
| `labs/shared/catwalk.js` (via `labs/shared/game.js`) | `new Cat(coat)` | `catRimUniforms`, `group`, `update`, `setProwling`, `chest`, `hips`, `legs` |
| `labs/water/js/cat.js` | (CatWalker) | `palette.fur/belly/stripe` (Colors mutated live; bound by reference to the fur uniforms), `time`, `blob.visible`, `group.traverse`, `updateShadow`, `onJump`, `onLand`, `startIdleAction`, `endIdleAction`, `setLookTarget`, `update`, `chest`, `hips`, `legs` |
| `labs/grass`, `labs/pagoda`, `labs/machiya` heroes | (CatWalker / `new Cat`) | `update`, `setLookTarget`, `setMood`, `startIdleAction`, `setProwling`, `group`, `chest`, `hips`, `legs` |
| `labs/villagers/js/*` | `new Cat({ ...o, stripeAmount })` | `update`, `startIdleAction`, `setMood`, `group.scale/rotation`, `eyes`, `head` |
| `tools/cat_preview.js` (`cat.js?v=20261106a`) | `new Cat({ ...PALETTES[name], build })` | `update`, `phase` (w), `setProwling`, `onJump`, `setDrinking`, `setMood`, `idleAction*` (w), `group`, `bones`, `head`, `nose`, `chest`, `hips`, `legs[i].paw`, `anatomy` (`timings`, `buildMs`, `body`, `head`, `tail`) |
| `tools/grass_preview.js`, `tools/summit_preview.js` | via `new Player()` | as the player |
| `catalog/js/asset-loader.mjs` | `new Cat({ fur, belly, accent, eyeColor, ribbonColor, stripes, build })` (`stripes` is ignored, as always) | `group`, `update`, `setMasterCat`, `cat.collar`, `cat.blob` (parts `cat-collar`, `master-bells`, `cat-shadow`) |
| `cadJS/src/app.mjs` | `new Cat({ fur, belly, accent, eyeColor, ribbonColor })` | `group` (scene-graph paths: kept identical) |

Public surface kept (Cat.prototype, name → arity): applyLook 1, applyMood 3, applyPose 1, beginIdleAction 0,
buildCoat 0, buildCollar 0, buildFace 0, buildMaterials 3, buildShadowBlob 0, buildSkeleton 0, canPlaySound 1,
computeLocomotion 3, endIdleAction 0, getActionPose 2, getMoodConfig 0, layTailOnGround 1, makeNeutralPose 0,
onJump 0, onLand 0, onSprint 1, placeBody 4, poseSit 1, rollIdleInterval 0, setDrinking 1, setLookTarget 1,
setMasterCat 0, setMood 1, setProwling 1, startIdleAction 1, triggerMeow 0, update 1, updateShadow 1;
module exports `Cat`, `catRimUniforms`. All fields are still plain own properties of the Cat.
Added (allowed, listed by the golden): methods `setAccessory`, `setTier`; fields `def`, `slots`, `tier`,
`tierLock`, `outlines`, `whiskers`; exports `MICHI`, `defineCharacter`, `validateCharacterDef`,
`CHARACTER_SLOTS`, `CHARACTER_TIERS`, `characterTierFor`; constructor options `def`, `tier`, `quality`.

## Checks run (command → real result)
- `node tools/cat_golden.mjs` → `cat golden: EQUAL`, `checks 40 passed, 0 failed` (11 cats · 29 poses · 280 samples · 141 geometries · 147 materials · 40 textures · 13 skeletons · 5 sculpts · Math.random 3334971)
- `node tools/cat_golden.mjs --root <scratch copy of src @ 5dc924a + final page>` → `EQUAL ... byte-identical to this build` (the final page reproduces the golden from the unsplit code)
- golden after each module move (rig, coat, face, collar, shadow, locomotion, poses, mood, character + facade) → `EQUAL` every time
- perturbations of the unsplit code in a scratch copy (whisker opacity 0.7→0.71; an extra `Object3D` in buildFace; trot rate 4→4.01; sleepy blinkBase 1.8→1.81) → `DIFFERENT`, exit 1 each; a Luna def with ribbon 0x2b3d63→0x2b3d64 → the def-equivalence check FAILs
- `node tools/capture_baseline.mjs --masters <scratch> --previews none --only cat --compare /…/michi-wt/_baseline` → 18/18 sheets `0 / 0 / 0` vs the Phase 0 masters, every master SHA-256 equal to `captures.md`, repeat `identical`
- `&raw=1` × 9 sheets, before vs after, rows 25–725 (the bottom-left label prints the sculpt time) → `maxDelta 0` × 9
- `&perf=1`, 10 interleaved A/B runs (unsplit snapshot vs split): michi first 93 vs 94 ms (sculpt 69 vs 69), luna 48/47, mochi 45/45, kuro 42/42, cached michi 3.5/3.0 ms, update 0.022/0.022 ms/frame for 4 cats (medians); tris identical
- `node tools/rooftop_test.mjs` → `38 passed, 0 failed`
- `node tools/check_syntax.mjs` → `All 44 modules OK`; `node --input-type=module --check` × 9 `src/characters/**` → OK (check_syntax does not walk `src/characters/` yet: handoff)
- `node tools/verify.mjs` → `All checks passed`; `node tools/kit_check.mjs` → `All kit checks OK (27 passed)`; `node tools/summit_test.mjs` → `70 passed, 0 failed`
- `node tools/labs_coverage.mjs --write` (line links only) → `node tools/labs_coverage.mjs` OK; `node --test tools/labs_coverage_test.mjs` 11/11; `node tools/labs_check.mjs` → `All labs checks OK`
- `node --test catalog/tests/*.test.mjs` → 37/37
- catalog browser suites against `cadJS/server.mjs` on a free port → adapters 195/195 (all nine cat adapters PASS), smoke 17/17, cad handoff 12/12; worktree unchanged
- `/__boot.html` (Metal) → boots and plays in ~10 s; only console line the optional `cad-overrides.json` 404 (same as Phase 0); player cat `tier hero`, slots `collar, bell`; in-game `setMasterCat()` → `suzu-master` + twin
- labs smoke (grass, villagers, water, pagoda, machiya, ground village) and `summit_preview.html?view=meditation`, `kyoto-rooftops.html?mouth=3` / `?auto=1` → ok, 0 errors
- `git diff --check origin/fable/integration...HEAD` → clean

## Review fix round 1
- Collar changes keep the bell: `kumihimo` recolours in place (`swapTo`); any other collar swap hangs the removed bell (and anything else hung on the collar) again on the new part's mount; on a Master Cat any bell put on is its `master` part. Checks added: recolour on a Master Cat (same bell mesh, gold, twin, old ribbon texture disposed), a different collar part and back (bell re-hung, still gold + twin), bell added after a bare-neck spell is the master bell, same entry in another key order = no rebuild and no `Math.random` draw.
- `sameEntry` compares sorted keys; `validateCharacterDef` rejects unknown `build` names (legacy options stay lenient); `characterTierFor` imports the kit's `TIER_POLICY` / `BAND_RADII` (src/kit/contract.js); `delete host[f]` → `host[f] = undefined` (character.js, collar.js); `src/cat.js` doc says exactly what `quality: 'low'` does.
- `node tools/cat_golden.mjs` → `EQUAL`, `checks 40 passed, 0 failed`; 18 cat sheets `0 / 0 / 0` vs the Phase 0 masters; `rooftop_test` 38/38; `check_syntax` 44 OK (+ 9 characters modules by hand); `verify` all passed; `labs_coverage --write` (cat.js line links +4) then `labs_check` OK; `kit_check` 27 OK; `git diff --check` clean.
- **The cat golden is Metal-only for canvas textures:** under `--gpu swiftshader` the 38 canvas-texture hashes (collar, bell, ear, toon ramp, blob) differ by 2D rasterisation; everything else is equal. Gate G-C runs it on Metal (the default on macOS).

## Deferred assets and why
None (structural lane).

## Footprint waivers requested
None.

## Notes for the Integrator
See `docs/fable/handoff/c1-rig-split.md`: cache-tag bumps must include `src/characters/**`, `check_syntax.mjs` should walk it,
AGENTS.md text for the new layout, and how c2/c3/c4 build on the contract.
