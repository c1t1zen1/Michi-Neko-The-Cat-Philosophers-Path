# Gate G-F fixes review r1 (BASE 414225f, HEAD f425782)

Verdict: APPROVED. No Critical or Important findings. Two Minor notes.

## Scope vs brief
- I1: src/main.js init() sets this.resolvedQuality = settings.resolveQuality() and assets.setQuality() before preload() and assembleWorld(); Player gets resolvedQuality. Two verify.mjs wiring checks added (regex on order and on Player); no check removed. OK.
- I2: countryside.js exports TEX, MAT, KIT_TABLES = { MAT, textures: TEX }; Vegetation, HiddenPlaces, Particles, AmbientLife scope with it. Guide 3.3 and f3 handoff updated. No new materials, no rng. OK.
- M7: runtime.js problems = [] and swap problems arrive only via the existing warnOnce() loop (which dedups and pushes into problems), so no double entry. OK.
- Deferred minors listed in the report. Cache tags not bumped (imports use existing ?v=20261113a). ASSET_COVERAGE.md is regenerated output only.

## Named risk 1 - I1 early quality resolve
Checked main.js, settings.js resolveQuality, runtime.js setQuality.
- init() runs after the constructor, so the renderer and settings exist. resolveQuality() only reads settings values, navigator, devicePixelRatio, and the cached once-only isDiscreteGPU() probe. applyQuality() (via applySettings) calls the same function later anyway, so the probe happens once either way, now just a little earlier and after the renderer exists (the constructor comment's concern about a third context before the renderer does not apply). Nothing needs state that is not ready; no throw path beyond what applyQuality already has.
- Renderer setup, composer samples, pixel caps, shadows and governor keep using initialQuality / applyQuality unchanged; the diff touches none of them. Settings application order is untouched.
- initialQuality and resolveQuality agree on 'low' (mobile<6 cores) and on explicit settings, so only auto-desktop medium becomes high. On classic, AssetRuntime resolves classic regardless of tier and classic Player ignores quality (michiIsModular false), so classic output is unchanged. setQuality before preload only influences the modular/auto decision and tier, which is the intended fix. If preload throws, the quality is already set; harmless.
- No Math.random / this.random / this.rng added or reordered in main.js.

## Named risk 2 - I2 exports and imports
Checked countryside.js imports, importers of the four modules, and runtime scope()/KitMaterials.bind.
- Circularity: countryside.js imports only three, textures.js, foliage.js, kit/runtime.js. None of those import vegetation, hidden_places, particles or ambient_life, so no cycle.
- Evaluation order in the game: main.js imports Countryside (line 9) before Vegetation/Particles/AmbientLife/HiddenPlaces (lines 11-13, 35), and no earlier import in main's chain (player, cat, sky, postfx) imports those four, so countryside.js already evaluates first; order unchanged. countryside.js has no module-scope Math.random (only inside methods), so eager evaluation elsewhere cannot shift a random stream.
- Shared-material mutation: scope() adds MAT to a Set (dedup) and KitMaterials.bind skips already-bound tables, so repeated scoping with the same MAT is idempotent. Countryside constructs first in assembleWorld, so the table is already bound. Only modular kit builders see the change (ctx.MAT/textures now populated instead of empty); classic path never reads the scope.
- Not a gating issue: kit meshes from those four owners are not merged by Countryside (they are not in its instance list), so the shared MAT is only a lookup.

## Minor
1. Tool/lab pages that import vegetation.js, particles.js, ambient_life.js or hidden_places.js (labs/grass/js/types_*.js, tools/*_preview.js, catalog) now also load countryside.js and build its full texture set at import. No correctness effect (no module-scope randomness), only added load time and memory on pages that previously skipped it. Consider exporting KIT_TABLES from a smaller module later.
2. The verify.mjs wiring regex for I1 is whitespace/ordering sensitive (good as a guard, but it will fail on harmless refactors); acceptable.

I did not run any checks myself; checks in the report are unverified claims, but the diff matches them and I found nothing contradicting them.
