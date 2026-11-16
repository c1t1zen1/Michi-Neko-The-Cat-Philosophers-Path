# R88 — the Roof Road pocket is disposed on exit

Integrator task (ruling R88), worktree `michi-wt/integration`, branch `fable/integration`, base 9c7f490.
Model: Claude Opus 5.5. Date 2026-11-16. Status: **DONE**.

Ruling R88 overturns the kept pocket (G-R review I3). Leaving the Roof Road now disposes the pocket
(`src/rooftops/pocket.js`, run by `src/rooftops/manager.js`), and the next entry rebuilds it behind
the noren veil, as the first entry does. The operator may overturn this (note in `BUILD_GUIDE_FABLE.md` §6, G-R).

## 1. What changed

| File | Change |
|---|---|
| `src/rooftops/pocket.js` | `dispose()` frees the run. A small `GpuSet` collects GPU resources from object trees: geometries, materials and the textures they hold (maps and shader uniforms), skeletons, instanced meshes, lights, and a scene's environment and background. Disposal frees every geometry, material, texture, skeleton bone texture, instance buffer and shadow map under the run's scene. That covers the world, sky, hills and fires, atmosphere, Chidori and the lantern. It also frees the PMREM target, the `PMREMGenerator`, and the `RoomEnvironment` the target was rendered from (these two are now kept in `this._room` / `this.envTarget` so they can be freed; rendering is unchanged). The run's `AssetRuntime` goes too: each kit instance's own `dispose()`, its own `KitMaterials` (with their textures), and its audio sink. Then every reference is dropped (scene, root, level, runner, world, sky, atmosphere, view, assets, cam, lantern). **Anything the game's scene still holds is never disposed** (the `keep` set): Michi (handed back first if still attached), the cats' shared sculpts, outline materials and blob shadow, and `src/textures.js` sets the valley also paints with. `dispose()` is safe on a half-built pocket and when called twice, and it returns `{ geometries, materials, textures }` freed. Once disposed, `_bus()` returns null, so no tone starts; `update()` and `render()` do nothing. Doc comments updated (header, `setReduceMotion`). |
| `src/rooftops/manager.js` | `releasePocket()` takes the built pocket and disposes it (`_disposePocket`: a throwing `dispose()` is logged once and the pocket is dropped all the same). It is called by `exit()` behind the veil (after `setActive(false)` and `placeOnBridge()`, before the veil parts) and by `exitImmediate()`. When an enter that was cancelled (quit to title) finds a build that landed for nobody, it calls `releasePocket()` too, unless a newer enter is already waiting for that build. `ensurePocket()` disposes a pocket whose `init()` throws half-way, then rethrows into the existing no-soft-lock path, and starts building only after `_afterPaint()` (see 2.2). Header comment updated. |
| `tools/rooftop_manager_test.mjs` | The stub pocket counts builds and disposals, records detach/dispose order, the most pockets alive at once, and whether the noren was down at each build and disposal. The old check "a second visit reuses the pocket" became "a second visit rebuilds the pocket behind the veil". New: dispose on exit (once, behind the veil, after detach), no pocket held afterwards, dispose on `exitImmediate`, and a new section "the pocket is put away (ruling R88)" covering a half-built pocket, quit to title mid-build, quit and walk back in mid-build, a throwing `dispose()`, and six visits in a row. **81 → 98 checks.** |
| `tools/rooftop_pocket_test.mjs` | Runs with `--js-flags=--expose-gc --enable-precise-memory-info`. Two old checks changed: "turned off while away: the kept pocket hears it" → "no pocket to reach (disposed)", and "back in: the same pocket (kept, not rebuilt)" → "a new pocket, rebuilt behind the veil". New: the manager holds no pocket after leaving; the old pocket freed its run and let go of its scene; **a WeakRef to the old pocket is cleared by a full GC** (nothing holds it); a reduce-motion value set after the build read the setting but before the swap reaches it through `attach()`. Memory after each of 5 exits vs. the valley before the first visit: geometries and textures ≤ +12, programs ≤ +30, heap ≤ +30 MB after GC, no growth between visits. Every entry's build starts only after a frame with the noren down was on screen, and every frame until the run is drawn shows the noren down. Entry times are printed, not judged. **17 → 29 checks.** |
| `BUILD_GUIDE_FABLE.md` §6 | G-R sub-bullet: "R88: the pocket is disposed on exit (memory back to valley levels); operator may overturn." It also gives the numbers below. |

Not changed: `rooftops/js/runview.js`. RunView needs no `dispose()`: it owns no GPU state of its own (its lazily made `clayLit`
material is on the Shōki meshes and is freed with the scene), adds no listeners, and only holds references the pocket drops.
`src/main.js` is not changed either: its one call site (`applyComfort` → `pocket.setReduceMotion`) is already guarded on `pocket`.

### 2.1 Audit of what the pocket holds (why each item is or is not disposed)

- **Listeners:** the pocket, RunView, build.js, sky.js, atmosphere.js and companion.js add no DOM or window listeners (grep). The
  renderer's own `dispose` listeners on geometries, materials and textures are released by the disposals. A probe that tracked every
  object given a renderer listener during a visit found, after exit, **zero pocket materials or geometries still registered**
  (`$S/probe.mjs`).
- **Audio nodes:** the chimes, drums and steps are one-shot oscillators that stop themselves (≤ 3.6 s) on the game's sfx bus. None
  persists, and none starts after `dispose()`. The kit audio sink is cleared.
- **Render targets:** the PMREM cube-UV target (`envTarget.dispose()`) and the sun's shadow map (`DirectionalLight.dispose()` →
  `shadow.dispose()`). PMREM's ping-pong target is freed by three.js itself after `fromScene`.
- **AssetRuntime:** `assets.dispose()` runs each kit instance's own `dispose()` and frees its geometry. The pocket's `KitMaterials`
  belong to the pocket alone (a separate instance from the valley's), and their materials and textures are freed through the guarded sets.
- **Chidori:** a second `Cat` in `guideRoot`. Its meshes, materials and skeleton go with the tree, except the sculpt geometry it
  shares with Michi (cached per body type), which is in the valley scene and so stays.
- **Module caches shared by every build** (`src/textures.js` `cached()`, `people.js` `ball`, `downtown.js` unit geometries,
  `pieces/common.js` `paperCapMaterial`): the objects stay (their keys are fixed, so nothing accumulates). Only their GPU copies are
  freed, and the next build uploads them again.

### 2.2 A bug the rebuild exposed, fixed: the veil was not painted before a rebuild

The first entry imports `pocket.js` over the network, so at least one frame with the noren's `.show` is painted before the build's
~1–2 s synchronous part. On a rebuild the import is cached, so the build started 1 ms after `enter()` and blocked the main thread
before the veil had ever been painted (`$S/gaps.mjs`, before the fix):

| entry | first frame after `enter()` | build long task | veil parts at |
|---|---|---|---|
| 1st (import over HTTP) | 7 ms | 67 ms → 1,908 ms | ~2,060 ms |
| 2nd (cached import) | **1,022 ms** | 1 ms → 1,018 ms | ~1,116 ms |
| 3rd | **1,188 ms** | 1 ms → 1,183 ms | ~1,276 ms |

So the valley froze for a second, then the panels started to drop and parted ~0.1 s later, half-way down. Fix:
`ensurePocket()` awaits `_afterPaint()` (two animation frames; immediate where there is no `requestAnimationFrame`) before it
constructs and builds the pocket. Every entry now behaves like the first: after the fix, the first frames come at 13 and 30 ms and
the build starts at ~26–34 ms. The noren's `transform` transition (0.85 s + 0.06 s) runs on the compositor over the blocked main
thread. The pocket test checks it on every entry: the build starts after ≥ 1 frame (classic and modular: 5–6 frames on the first
entry, 2 on every rebuild), and every frame until the run is drawn has the noren down (`.show`, not `.out`, not `.hidden`).

## 3. Memory (the game, Metal, quality medium, `$S/mem.mjs`)

Valley at the return spot, drawn for 2 s, then a full GC (`gc()` ×5 over 40 frames). Each visit tours every checkpoint to the
finale perch before leaving. Heap is `performance.memory.usedJSHeapSize`; geometries and textures are `renderer.info.memory`;
programs is `renderer.info.programs.length`.

| set | when | heap MB | geometries | textures | programs |
|---|---|---|---|---|---|
| classic | before the first entry | 59.5 | 434 | 118 | 108 |
| classic | after exit 1 | 62.8 | 434 | 122 | 126 |
| classic | after exit 2 | 63.3 | 434 | 122 | 126 |
| classic | after exit 3 | 63.5 | 434 | 122 | 126 |
| modular | before the first entry | 105.7 | 371 | 123 | 113 |
| modular | after exit 1 | 109.8 | 372 | 126 | 132 |
| modular | after exit 2 | 110.9 | 372 | 126 | 132 |
| modular | after exit 3 | 111.2 | 372 | 126 | 132 |

For comparison, the same harness on the kept pocket (9c7f490, before this change): classic 59.5 → 327.9 / 328.2 / 328.4 MB,
geometries 434 → 1,911 / 1,922 / 1,922, textures 120 → 191, programs 108 → 167; modular 105.7 → 251.9 / 252.8 / 252.9 MB,
371 → 1,415 / 1,420 / 1,420, 122 → 188, 113 → 173. Inside the run the new code is the same as before (classic ~465–473 MB, 1,911
geometries), so the run itself is unchanged.

Freed per visit (the old pocket's `freed`): classic 3,136 geometries, 157 materials, 90 textures; modular 1,661 / 143 / 80.
The geometry count includes geometry that was built but never drawn. The WeakRef to every old pocket was cleared after the GC on
both sets, every time.

**What stays after exit, and why** (attributed object by object, `$S/probe.mjs`, both sets):
- **Programs (+18 classic / +18–19 modular):** 13 belong to Michi's own materials (MeshToon ×6, MeshBasic ×5, MeshStandard ×2;
  the outline and collar `LineBasic` share one). three.js caches one program per material per lighting setup, and the run's
  lights, FogExp2 and PMREM environment differ from the valley's. The other 5 are depth variants of the renderer's shared
  shadow-map depth material, with no material owner in the scene. All 18 are reused on every visit (flat over 3–5 exits).
  Freeing them would mean disposing Michi's materials, which would force a recompile on the first valley frame.
- **Textures (+4 classic / +3 modular):** valley textures that were first uploaded during the visit. On classic these are 4
  `src/textures.js` canvases (map, roughnessMap, normalMap) used by the valley's own `Baked Statics` meshes. On modular, 2 are
  valley kit maps (`asset:lock-plate`, `asset:key`) and 1 geometry is a valley one. The valley owns them, and they would be
  uploaded whenever the valley drew them anyway.
- **Heap (+3.3–4.0 MB classic, +4.1–5.5 MB modular, then ~+0.3 MB per visit):** the valley alone drifts +0.06–0.1 MB per 10 s
  (`$S/drift.mjs`). A heap-snapshot diff between exit 2 and exit 5 (`$S/snap.mjs`) is +0.87 MB, of which **0.79 MB is V8
  `(code)`**: the JIT tiering up the build functions on repeated runs. The rest is < 0.1 MB (browser performance entries,
  shapes). No run objects are retained (the WeakRef check).

## 4. Entry time (`enter()`: veil down → run drawn → playable), quality medium, `$S/mem.mjs`

Indicative only (R86: no timing verdicts). Metal, Apple M5 Max, load average 2.9–3.1 (classic run) and 2.6–2.9 (modular run).
"Drawn" is when the run is swapped in behind the noren (`active`, and the veil starts to part); "playable" is when the veil has
cleared and input is back.

| set | entry | build done | run drawn | playable | kept pocket (9c7f490): drawn / playable |
|---|---|---|---|---|---|
| classic | 1st | 1,685 ms | 1,685 ms | 2,528 ms | 2,343 / 3,147 ms |
| classic | 2nd (rebuild) | 1,748 ms | 1,748 ms | 2,589 ms | 956 / 1,873 ms (reused) |
| classic | 3rd (rebuild) | 1,912 ms | 1,912 ms | 2,739 ms | 959 / 1,875 ms (reused) |
| modular | 1st | 1,375 ms | 1,375 ms | 2,242 ms | 1,913 / 2,770 ms |
| modular | 2nd (rebuild) | 1,421 ms | 1,421 ms | 2,270 ms | 957 / 1,858 ms (reused) |
| modular | 3rd (rebuild) | 1,894 ms | 1,894 ms | 2,704 ms | 965 / 1,866 ms (reused) |

On a second visit the noren stays down ~0.5–0.9 s longer than with the kept pocket, because the build outlasts the 950 ms
veil-in. The first visit is unchanged in kind (the 1st-entry numbers differ between runs by load). The pocket test (quality
auto, which is high on this machine) printed similar rebuild numbers: classic drawn at 1,356–1,917 ms and playable at
2,192–2,728 ms; modular drawn at 1,341–1,841 ms and playable at 2,191–2,673 ms.

## 5. Checks run (in `michi-wt/integration`, after the change)

```
node tools/rooftop_test.mjs                     40 passed, 0 failed
node tools/rooftop_companion_test.mjs           7 companion/ceiling checks passed
node tools/rooftop_alley_test.mjs               PASS six alleys: both entrances, jumps, exits, guide following, reversal and lane isolation
node tools/rooftop_manager_test.mjs             98 passed, 0 failed        (was 81; on the old manager.js: 86 passed, 12 failed)
node tools/rooftop_pocket_test.mjs              29 passed, 0 failed (61.9 s)
node tools/rooftop_pocket_test.mjs --query assets=modular   29 passed, 0 failed (60.3 s)
   (on the old code, 9c7f490 exported with git archive + the new test: 16 passed, 13 failed — every R88 check:
    holds no pocket, freed, let go, WeakRef, the two rebuild checks, attach-while-building, the five memory checks
    [geometries +230…+747, textures +41…+73, programs +58, heap 325–327 MB], the build-after-paint check)
node tools/check_syntax.mjs                     All 192 modules OK
node tools/verify.mjs                           All checks passed (192 modules; 10 Roof Road game modules; summit_test 83/0;
                                                rooftop_manager_test 98/0; kit 534 OK; kit_test 37/37; a1_village_test 6/6)
node tools/kit_check.mjs                        All kit checks OK (534 passed)
node tools/labs_check.mjs                       All labs checks OK (69 Roof Road modules; coverage in sync, no regeneration:
                                                main.js / countryside.js untouched)
node tools/footprint_golden.mjs                 footprint golden: EQUAL (byte-identical; valley rng 49233, probe ok)
node tools/footprint_golden.mjs --systems       footprint golden: EQUAL (byte-identical)
node tools/rooftop_golden.mjs                   rooftop golden: EQUAL (byte-identical; routing 41/41)
cd cadJS && npm run check                       server/catalog/agent/asset modules: ok; 15/15 and 16/16 tests passed
cd catalog && npm test                          tests 50, pass 50, fail 0
```

Game boots clean: the pocket test boots `/index.html` (autostart new) on both sets and runs five visits each. Its console
checks pass: no page errors, no warnings (only the optional `/cad-overrides.json` 404 is ignored, as before).

### The G-R drill, extended (`$S/r88_drill.mjs`)

This is the G-R chores drill (`_scratch/gate-r/gr_drill.mjs`, itself from r6), unchanged, plus three things: "pocket disposed" at
each return home, and a re-entry after the lantern home (a rebuilt run on the bridge at mouth 1, fires out, the greeted Shōki kept,
then home again with the pocket disposed). The full path is: new save, real-key walk, Seven Posts, a simulated failed build, the
veil, a Shōki, leave mid-run, back in, the autopilot over the whole route to the finale, five fires, the lantern home, re-enter,
home, save, reload.

**Classic: 25/25 (591 s). Modular: 25/25 (595 s).** That is the 21 G-R checks plus 4 for R88: home from mid-run with the
pocket disposed; home after the finale with the pocket disposed; re-enter after the finale gives a rebuilt run at s 1, mouth 1,
fires out, greeted Shōki [1, 2, 3, 5, 6] kept, `disposed: false`; then home again at z 35.2 with `pocket: null`. The autopilot ran
the whole route on both sets, s 1 → 1673.08 (mouths 1–11 and 13) in 510 s, with five fires and the lantern home to (−1, 0.87, 35.2).
After reload: unlocked, mask 55, finished, Odoi open, cat in the valley. Console: the optional `/cad-overrides.json` 404 (boot and
reload) and the drill's own simulated build failure, as at G-R; no warnings. Logs: `$S/drill2/{classic,modular}.log`. The first run
of my extension had a harness slip in the new re-entry check (it read `game` in Node); the 21 original and 2 R88 checks before it
had passed, and it was fixed and rerun in full: `$S/drill/`, `$S/drill2/`.

Disposal cost behind the veil (`releasePocket()` timed in the page, medium, 3 exits): classic 8 / 5 / 5 ms, modular 10 / 8 / 6 ms.

## 6. Requirements, one by one

- Re-entry any number of times: the manager's six visits in a row (one pocket alive at a time); the pocket test's 5 visits on both
  sets; the drill's 3 visits plus the cancelled build.
- Save flags and Shōki state unaffected: `rooftopsUnlocked`, `rooftopShoki` and `rooftopFinished` live on the manager, not the
  pocket. Every start gets the mask (manager test; drill: "greeted Shōki kept" after a rebuild; save/reload restored).
- Return spot unchanged: `placeOnBridge()` runs before the release (manager test, drill: z 35.2).
- No soft-lock (r6 I1): a build that fails half-way is disposed and the cat goes back on the bridge with input; a `dispose()` that
  throws still lands the cat home with the veil cleared and input on; quit to title mid-build leaves nothing behind. The existing
  "a pocket that never builds" section passes unchanged.
- Reduce-motion fix (45c0b54) after a rebuild: every flag follows `applyComfort` in the rebuilt pocket. A value set without
  `applyComfort` is taken on entry. A value that reaches the game after the build read the setting is applied by `attach()`.
- Memory near the valley after exit: section 3.
- Classic valley untouched: footprint, `--systems` and rooftop goldens EQUAL (byte-identical). Nothing outside `src/rooftops/` and
  the two tools changed in code.
- The veil covers the rebuild: section 2.2, checked on every entry by the pocket test, on both sets.

## 7. Open notes for the Integrator

1. **Stale wording outside my grants** (not changed): `src/main.js:935`, "The Roof Road pocket is kept after the first visit: it
   reads this live" (the guarded call is still right; only the comment is stale), and `docs/fable/handoff/r6-game-wiring.md` R6.3,
   "built on the first enter … and kept". Suggested: "The Roof Road pocket reads this live while it is up (src/rooftops/pocket.js)".
2. `_afterPaint()` waits for animation frames. In a hidden tab (no frames) a build waits until the tab is visible again; the veil
   holds meanwhile. Before this change the build ran in the background tab.
3. A texture or geometry shared with a valley object that is *not* in `game.scene` when the cat leaves (for example a summit or
   interior object detached at that moment) would have its GPU copy freed and uploaded again on next use. That is correct, at
   worst a small hitch behind that object's own transition. The probe found no such case at the bridge.
4. If the Integrator wants the re-entry back to ~1.9 s, the build would need to get cheaper (it is ~1.4–1.9 s on medium). R88's
   trade (memory over a longer veil on re-entry) is as the ruling asks.

`$S` = `/Users/c1t1zen/Documents/GitHub/michi-wt/_scratch/r88-pocket-dispose/` (harnesses, logs, the before/after JSON, the
old-code pocket-test output; the 466 MB HEAD export it ran in was deleted afterwards, `git archive 9c7f490` recreates it).

## 8. Commits (pushed to `fable/integration`, not `main`)

- `713967a` Roof Road pocket: dispose on exit, rebuild behind the noren (R88)
- `0eefee9` BUILD_GUIDE_FABLE §6 G-R: R88 note (the pocket is disposed on exit)

HEAD: `0eefee9`.
