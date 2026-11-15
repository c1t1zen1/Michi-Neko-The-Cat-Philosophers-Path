# a1-village handoff (Phase 7, the Kyoto village)

Patches for files this lane may not edit (hot files, guide §4.5). Each is
exact; apply as written.

## 1. Summit kit sounds reach the sink (R62): `src/mountaintop.js`

The one sink is installed in `src/main.js` (granted block). Valley kit
instances get `env.audio` from `Game.assetEnv()`; the summit's own
`SummitManager.assetEnv(sky)` builds a separate env without it, so the
summit fūrin (`summit-furin`, garden `buildWindChime`) and the summit toro
(`summit-entry`, lanterns `lampUpdate`) emit nothing. One line in
`assetEnv(sky)`, after `env.lanternOn = …`:

```js
    env.lanternOn = 1 - Math.max(0, sunY) * 5 > 0.5;
    // the kit sound hook (src/kit/audio.js): the summit's fūrin and toro play through the game's one sink (a1-village, R62)
    env.audio = (this.assets && this.assets.runtime && this.assets.runtime.audio) || null;
    return env;
```

`this.assets` there is the `scopeAssets()` view (its `runtime` is the
AssetRuntime). Classic: `scopeAssets` of the classic pass-through has no
`runtime`, so `env.audio` is null and no summit instance exists anyway.
The sink fades each event with distance from the cat, and the summit sits
1.2 km below the valley (`src/summit/common.js` ORIGIN), so valley and summit
never hear each other.

## 2. World build (R66): two hot-file patches, measured in a scratch worktree

**Status (fix round 1, ruling R71): §2a and §2b are applied in-lane** (commit
96ca23f), not by the Integrator. They are tested by `tools/a1_village_test.mjs`
(the runtime: side-by-side imports, generated registration order, warnings,
a failing materials import still fails the preload) and
`tools/a1_village_browser_test.mjs` (the prefetch: saved modular + high fetches
the kit index and all 24 families before preload's kit-overrides.json; classic
and saved low fetch none). The text below is kept as the record of what they
change; it is no longer a patch to apply.

The lane's own changes (families only) make the modular first builds cheaper
with the same output (status file, R66). What is left of the gap is outside
the families. Both patches below were applied in a scratch worktree on top of
the lane head and measured with the perf_gv3 command (status file, R66
table "rt"). Neither changes what is built, in what order, or what classic
loads.

### 2a. `src/kit/runtime.js` `_doPreload()`: import the families side by side

Today every family is `await`ed in turn, so their module graphs download one
waterfall after another (about 90 to 135 ms of the modular world build is the
main thread waiting, `ctor → assembleWorld` in a CPU profile, against 15 ms on
classic). Request them all at once, register in the generated order:

```diff
     if (!this.needsKit()) return;
+    // Every family (and the kit materials) is requested at once, so their module
+    // graphs download side by side instead of one waterfall after another
+    // (a1-village, ruling R66: ~100 ms of the modular world build was waiting);
+    // they are registered in the generated order afterwards, so the registry,
+    // the first-registered rule and the warnings are exactly as before.
+    const materials = this.kitMaterials ? null : Promise.resolve().then(() => (this._createMaterials ? this._createMaterials() : defaultMaterials()));
+    if (materials) materials.catch(() => {});        // awaited below; never an unhandled rejection meanwhile
     const families = await (this._loadFamilies ? this._loadFamilies() : defaultFamilies());
-    for (const [family, load] of Object.entries(families || {})) {
+    const entries = Object.entries(families || {});
+    const loaded = await Promise.all(entries.map(([, load]) => Promise.resolve().then(load).then((mod) => ({ mod }), (error) => ({ error }))));
+    entries.forEach(([family], i) => {
       try {
-        const mod = await load();
+        if (loaded[i].error) throw loaded[i].error;
+        const mod = loaded[i].mod;
         const list = mod && mod.assets;
         if (!Array.isArray(list)) throw new Error('index.js must export `assets` (an array of defineAsset records)');
         for (const def of list) this.register(def, family);
       } catch (error) {
         this.warnOnce('family:' + family, `family '${family}' failed to load, its assets stay classic: ${error && error.message || error}`);
       }
-    }
+    });
     if (!this.kitMaterials) {
-      this.kitMaterials = await (this._createMaterials ? this._createMaterials() : defaultMaterials());
+      this.kitMaterials = await materials;
       this._bindMaterials();
     }
```

Checked in the scratch worktree: `node --test tools/kit_test.mjs` 36/36,
`node tools/verify.mjs` all passed.

### 2b. `src/bootstrap.js`: start the kit downloads with main.js

When the URL says `?assets=modular`, or the saved settings say
`assetSet: 'modular'` on a saved medium/high quality, start importing the kit
index, `materials.js` and every family as soon as `main.js` is requested, so
the downloads overlap the engine's own and `preload()` finds them in the
module map. Never on classic, never on `auto` (the GPU tier decides that
later) or a low/auto saved quality, so the low promise holds:

```diff
 function loadEngineModule() {
-  if (!engineModule) engineModule = import('./main.js?v=20261114a');
+  if (!engineModule) {
+    engineModule = import('./main.js?v=20261114a');
+    prefetchKit();
+  }
   return engineModule;
 }
+
+/**
+ * When this boot will build the modular set (the URL asks for it, or the saved
+ * setting does on a medium/high saved quality), fetch the kit's modules while
+ * main.js and its graph download, so AssetRuntime.preload() finds them in the
+ * module map instead of waiting on them inside the world build (a1-village,
+ * ruling R66). Never on the classic set, never on a low-locked device: the
+ * runtime's own rules decide what is built; this only starts downloads early.
+ */
+function prefetchKit() {
+  try {
+    const q = new URLSearchParams(location.search);
+    const flag = q.get('assets');
+    let set = flag, quality = null;
+    if (!flag) {
+      const saved = JSON.parse(localStorage.getItem('catwalk_settings_v1') || 'null') || {};
+      set = saved.assetSet; quality = saved.quality;
+      if (quality !== 'medium' && quality !== 'high') return;   // auto or low: let the runtime decide, no early fetch
+    }
+    if (set !== 'modular') return;   // 'auto' resolves by the GPU tier later: no early fetch
+    import('./kit/index.js?v=20261114a')
+      .then((m) => Promise.all([import('./kit/materials.js?v=20261114a'), ...Object.values(m.FAMILIES || {}).map((load) => load())]))
+      .catch(() => {});   // the runtime imports (and reports) for real
+  } catch { /* storage blocked: the runtime fetches as before */ }
+}
```

(The tag in both import strings follows the bump like every other.)

### 2c. Not patched, ranked for whoever closes R66 (all hot files)

1. `KitMaterials` (`src/kit/materials.js`) paints its stone, wood and lacquer
   textures on the first `km.stone()/wood()/lacquer()` call: about 60 to 80 ms
   of `textures.js` noise inside the world build. Painting each one in its
   material's `onBeforeCompile` (the first draw that needs it) keeps the
   pixels and moves the summit's stone (and any material not drawn in the
   first frame) out of the boot.
2. The summit's kit families (`clearing`, `vista`, `summitlife`) build at
   boot although nothing of the summit is drawn until the tenth bell (about
   45 to 60 ms of kit builds plus their textures). `SummitManager` could build
   its kit content in idle time after the first frame (mountaintop.js).
3. The first frame (shader compiles) is 140 to 200 ms longer on modular; it
   counts in world ready and boot total, not world build.
4. **The ground's painted layer tiles and their pack loop (~55 ms, family
   `ground`).** `groundLayers()` paints earth, moss and gravel on Canvas2D and
   packs albedo, height, slope and cavity per texel (`src/kit/ground/layers.js`
   `paintLayers`, the hottest kit-own function at ~21 ms self); the classic
   ground paints only its meadow tile. Exact speedups (index tables instead of
   modulo in the cavity blur, row fills for the flat layers) or painting the
   tiles while the kit modules download would cut it without a visible change.
5. **The hero trees' leaf sprays (~50 ms on high, family `trees`).** `sakura`
   was 52 ms in a profiled high boot (13:36): `buildCanopy` leaf-spray placement
   through the shared foliage code; medium builds the mid tier and is cheaper.

(Fix round 1 re-measure, both patches in-lane: build 1.26/1.28 × medium,
1.42/1.40 × high, boot +297 to +461 ms, load 2.7 to 4.5; the modular overhead
is ~270 / ~380 ms and needs to come under ~240 ms. Items 1, 4 and 5 together
are about 150 ms.)

## 3. Requests and rulings (fix round 1)

1. **Nest egg material (R26/R52).** The kit eggs now use
   `km.bag({ rough: 0.4, metal: 0.1 })` for the classic `MAT.birdEgg` gloss with
   their speckle vertex colours: a second nest-owned merged material (the first
   is `matte`). Request: register it in `KIT_SHARED` (`src/kit/materials.js`,
   hot), e.g. `gloss: { base: 0xffffff, from: 'nest', use: 'vertex-coloured
   glossy small props: bird eggs', make: (km) => km.bag({ rough: 0.4, metal: 0.1 }) }`.
   Draw cost: one small merged draw, as the classic eggs' own material; A.6
   shows modular calls below classic at every spot and tier.
2. **`water.stones.flow` pacing (R50).** The river plays one burble every 2.2 to
   3.4 s while the cat is within 7 m of a bridge post in the water: a
   proximity-paced sound, not a single edge. Ruling requested; the
   alternative is one burble on entering the 7 m ring.
3. **budgets.md §5.** The dropped exceptions (bamboo-fence `buildMs` 14/14,
   tea-house and residence hero `buildMs` 12) were measured at load 1.9 to 4.7
   (three full contract runs), not on a quiet machine; §5's table should say so
   and list them as dropped. `bamboo-fence` mid triangles 13,000 stays (reason
   in budgets.js).
4. **Appendix C.** Add to G1: `node --test tools/a1_village_test.mjs` (verify.mjs
   step 5 runs it already); to G2: `node tools/a1_village_browser_test.mjs`
   (needs `PLAYWRIGHT_MODULE`, ~1 min on Metal; 15 checks).
5. **Shishi-odoshi voiced twice when the cat bats it** (open; the fix-round-1
   rule was reverted in fix round 2, ruling R74). For a later lane: treat a
   one-frame tilt jump (the bat adds ~+0.7 in one frame; the natural rise is at
   most ~0.006 a frame) as the bat, mute only a clack within ~1.5 s of it, and
   test with the game's real cycle plus `clackerBoost`
   (`src/countryside.js` 5068–5086), not a synthetic swing.
