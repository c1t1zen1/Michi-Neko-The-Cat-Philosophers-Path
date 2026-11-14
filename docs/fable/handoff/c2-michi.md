# Handoff: c2-michi

## 1. main.js (hot) — APPLIED IN-LANE (Integrator grant): Player gets `{assets, quality: this.initialQuality}` and the dusk driver calls `player.cat.setEyeShine?.(k)` from `sky.dayTime` (k ramps 17.3h to 19.5h, falls 4.8h to 6.8h). Nothing else in main.js touched. Original patch kept below:
```diff
-    this.player = new Player(this.scene, this.camera, this.audio);
+    this.player = new Player(this.scene, this.camera, this.audio, { assets: this.assets, quality: <the game's quality tier string> });
```
Without it (or on classic / quality low) Player builds today's Cat. Test: `?swap=michi:modular`.

## 2. Dusk eye shine driver (applied in-lane, see 1)
Modular Michi has `player.cat.setEyeShine(k)` (k 0..1, absent on classic). Call each frame with the dusk/night factor, e.g. `player.cat.setEyeShine?.(duskFactor)`. It is hero-tier only and starts at 0.

## 3. labs/shared/game.js (HOT-FILE CHANGE, accepted and ledgered by the Integrator)
Added one export: `loadMichiModule` (src/characters/defs/michi.js). Needed because only that bridge may import src/ (labs_check). Deviation from "own files only"; additive.

## 4. labs/registry.js
`labs/cat/` is not registered (registry must stay 22 per labs_check). Suggested extra/row: slug `cat`, href `cat/`. Needs a poster and research.md (there is a short one).

## 5. Coverage
`labs_coverage.mjs --write` run (player.js lines moved). Rows cat-coat/cat-face/cat-collar/master-bells/cat-shadow still point at cat.js facade methods; pointing them at src/characters/parts/* needs sourceFiles() to walk src/characters/.

## 6. Notes
- Collar swap kumihimo -> kumihimo-indigo rebuilds the cord and re-hangs the bell (c1 contract); same-part recolour repaints in place.
- Coat/face/shadow parts are c1's non-slot parts; modular Michi shares them (no re-sculpt).
- Not run: full headless boot with Player wired (needs patch 1).
