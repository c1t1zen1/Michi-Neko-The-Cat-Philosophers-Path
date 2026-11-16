### Spec Compliance
- ✅ Spec compliant (shishi, wind-chime promoted; bells correctly deferred; no gap ids; bound names rocker/windChime/chimeClapperMat kept; no audio.js import; no labs import; no Math.random/Date.now in geometry, rng via ctx).
- ⚠️ Cannot verify from diff: that the kit rocker group still resolves the golden handle key (classic names it 'Shishi Rocker', countryside.js:2905; kit build.js:316 sets no name). Report says only `p` moved; controller should confirm the swap golden diff lists no key change.
- ⚠️ Live-mesh count is now 2/asset hero/mid, 1-2 far: within KIT_LIMITS.liveMeshes (hero 2), the earlier overage is fixed.

### Strengths
- Pour follows the live mouth: mouth recomputed from rocker.rotation.z each update (build.js:355), feed stream dips to mouth when under the tip (359-362). Game-driven and standalone (self-cycle, ext detection 347-351) both work.
- Single stream mesh with vertex rewrite, chime as bell+clapper: good live-draw discipline. Statics merge by km material (R36). Private materials disposed.
- L6 pairs present (32), shishi near shows hollow basin, diagonal-cut culm, feeder, anvil; chime shows grain + vermilion mark.

### Named risks
1. Perf. Instances in the valley: exactly 1 wind chime (countryside.js:338) and 1 shishi (layout at :2321). Max added draws per instance: shishi tube + stream (+ tube shadow) ~3; chime bell + clapper (+ clapper has castShadow false, bell false) ~2; statics merge into existing material batches. Whole swap can add at most ~5-6 draws and ~0 in views that do not frame the props. Reported +13/+20/+10 exceed that ceiling, and street went DOWN 9 with the same code, so the rise is camera/cat/NPC noise (1 boot, 2 rounds), not real. Fits R36 (no InstancedMesh, plain merged statics, delta recorded). Suggest, but not require, a spot that frames both props if the controller wants proof.
2. shishiRocker. Readers: context_actions.js:265-266 (world position, range check dist² < 3.2, i.e. 1.79 m; 0.18 m y shift is negligible), countryside.js:497 (merge-skip list), :5063-5081 (writes rotation.z only; pivot independent), tools/footprint_golden.js:599 and golden/valley_classic.json:894 (classic golden, unchanged), tools/place_asset_test.js:59 (name list). No audio or animation reads the pivot position. Waiver acceptable.
3. Clack. Classic: `grep clack` in audio.js, countryside.js finds no cycle-driven sound; the only sound is the cat-triggered tipClacker (context_actions.js:643-647: playSplash/playBell), untouched. Kit onClack hooks (build.js:357) fire on return to rest and are null by default, so classic sound path is unchanged. Claim verified.

### Issues
#### Critical
none
#### Important
none
#### Minor
- build.js:378-391 washi CanvasTexture cached in a WeakMap and never disposed (dispose() at 441 only frees `priv`); small GPU leak per km. Also relies on `document` inside a builder (fine in browser/kit tests).
- build.js:283-284 dead expression `.rotateZ(-Math.atan2(d.x, d.y) * 0 + 0)` and `.add(V3(0,0,0))`; remove.
- build.js:346-364 relies on game writing rocker.rotation.z before kit update; a one-frame lag in the pour is possible, harmless.
- Chime near shot is small/dark (acknowledged in report); shishi cat-height shot not captured (grass), acknowledged.

### Assessment
**Task quality:** Approved
**Reasoning:** Requirements met, live-mesh and R36 budgets respected, the perf rise is above the physical ceiling of two props and is noise, and the rocker waiver touches no gameplay beyond a negligible range shift.
