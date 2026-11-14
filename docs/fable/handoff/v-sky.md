# v-sky handoff

Lane v-sky (wave 2.3, system lane): sky family `src/kit/sky/` (lab 05), single
writer of `src/sky.js` and `src/postfx.js` (ruling R31, granted in b5db8e1).
Promoted: `clouds` (deck + projected cloud shade), `stars`, `moon`. Deferred:
`sky-dome`, `sky-light`, `god-rays`, `ao`, `atmosphere`, `grade` (reasons in
docs/fable/status/v-sky.md).

## 1. main.js (hot file) — DONE in-lane (pre-review grant, R47 pattern)

Applied in this branch under the Integrator's pre-review grant:

```diff
--- a/src/main.js
+++ b/src/main.js
@@ assembleWorld()
-    this.sky = new Sky(this.scene);
+    this.sky = new Sky(this.scene, { assets: this.assets });
```

The Sky no longer reads `globalThis.game`: without `{ assets }` (labs and
review sheets construct `new Sky(scene)`) or with CLASSIC_ASSETS it is
classic, quietly. No other main.js change is needed: the Sky drives its kit
instances itself (also on the summit and indoors, where `assets.update()` is
skipped), and the runtime's generic `assets.update()` call is ignored by them
(`attach(sky)`).

## 2. Inventory (labs/asset_inventory.json) — then `node tools/labs_coverage.mjs --write`

New evidence targets (specimens added to `labs/sky/js/data.js`, family `night`):

```json
"sky/night-stars": { "lab": "sky", "selector": "night-stars", "kind": "specimen", "file": "labs/sky/js/data.js", "anchor": "study('night-stars'" },
"sky/night-moon":  { "lab": "sky", "selector": "night-moon",  "kind": "specimen", "file": "labs/sky/js/data.js", "anchor": "study('night-moon'" },
"sky/cloud-field": { "lab": "sky", "selector": "cloud-field", "kind": "specimen", "file": "labs/sky/js/data.js", "anchor": "study('cloud-field'" }
```

Coverage rows (append to each asset's `coverage` array; keep the existing entries):

```json
"stars":  { "target": "sky/night-stars", "level": "direct" }
"moon":   { "target": "sky/night-moon",  "level": "direct" }
"clouds": { "target": "sky/cloud-field", "level": "direct", "note": "The kit deck promotes this thickness painting (slab slices, four-genus field) and the shade-soft projection." }
```

Effect: `stars` and `moon` move from embedded to direct (active totals
direct +2, embedded −2); `clouds` stays direct. The three source anchors of
these rows (`  buildClouds(`, `  buildStars(`, `  buildMoon(` …) are unchanged.

## 3. Catalog production adapters (_production_adapters.md)

`| v-sky | clouds, stars, moon | src/kit/sky/index.js assets (production: "sky") |`

Thumbnail note for t1: these are sky-space objects (a 600 m hemisphere, a
225 m star sphere, a sprite moon). A catalog thumbnail needs a camera at the
origin looking up, and `update(dt, t, { hour: 22 })` (night) or
`{ hour: 12 }` before rendering: without a Sky the instances derive their
state from `env.hour` / `env.wet` / `env.snow`.

## 4. Part names (public interface)

- `clouds`: `deck` (the hemisphere; live). Instance extras read by the Sky and
  the post chain: `post` (atmosphere hook, null on far), `shared` (field
  uniforms), `field`, `cover`, `veil`, `attach(sky)`.
- `stars`: `points`, `band` (hero, mid; the Amanogawa). `material` = the
  points' ShaderMaterial (`uniforms.uOpacity`, `uniforms.uTime`, as the
  classic `starMat`). Group name `Stars` (legacyName).
- `moon`: `disc`, `halo` (mid, hero), `ring` (hero; the 22° tsukigasa).
  `material` = the disc's SpriteMaterial (classic `moonMat` handle). Group
  name `Moon` (legacyName).

## 5. Materials, draws, budgets

- New merged materials: **0** (R52). Every sky mesh is live and private
  (ShaderMaterials / SpriteMaterials outside MAT), none reaches `_mergeStatics`.
- Live meshes: clouds 1, stars 2 (hero/mid) or 1, moon 3/2/1. They replace 26
  cloud sprites + 1 star Points + 1 moon sprite; stars and moon stop drawing
  in daylight (`visible = false` below opacity 0.002).
- Draw calls, deterministic (`?shot=1`, same frame, scene pass, 1200×750),
  classic → swap: day (10.5) street 450 → 444, shrine 159 → 156, river
  340 → 331, meadow 444 → 438 on high, the same deltas on medium; night (22)
  street −2, shrine **+1**, river −5, meadow −2 (the shrine view frames few
  classic sprites; the kit night adds band + halo). Full frame (shadow + post)
  deltas are identical: the cloud shade is composited inside the existing
  atmosphere pass, no new pass or render target.
- Triangles: +748 day, +1,904 night (deck 760, band 1,152) per frame.
- Budgets: no exceptions requested (contract: 9 builds, max 1,152 tris,
  warm builds ≤ 0.6 ms).

## 6. labs/registry.js (hot file) — study count

```diff
-  … question: '24 live sky studies: paint cloud cover, move the sun, compare volume and painted clouds, and follow their shade through our original Kyoto houses.', …
+  … question: '26 live sky studies: paint cloud cover, move the sun, compare volume and painted clouds, follow their shade through our original Kyoto houses, and look up at stars and a painted moon.', …
```

(The lab's own copy in `labs/sky/research.md` already says 24 + the two night
studies. No new lab, no new specimen ids beyond `night-stars`, `night-moon`.)

## 7. Behaviour the Integrator should know

- Classic: `?assets=classic`, the classic default and **quality low always**
  run today's code: placeSkyAsset() calls the classic builders, updateKit()
  never runs, AtmospherePass.syncKit() keeps the classic material and does not
  touch a uniform. A live switch to low mid-session (`applyQuality()`) disposes
  the kit sky and builds the classic clouds, stars and moon at once
  (`Sky.dropKit()`, verified headless: 26 sprites, classic Points and Sprite,
  classic post, no errors). Going back up re-tiers at the next boot.
- Seeded captures: a kit build burns the classic builder's Math.random()
  draws (clouds 26, stars 2,100) so the `?shot=1` world stream is unchanged.
- Summit: the deck is a child of the classic dome, so it is one of the
  summit's sky keepers; the summit's lights and palettes are untouched and the
  cloud shade is off whenever the atmosphere gets the summit's `environment`.
  Indoors (`sky._interiorShadow`) the shade is off too.
- god-rays (kit-only per ruling): deferred, no particles.js hook needed.

## 8. Helpers

None to move. `src/kit/sky/state.js` (`sunFromHour`, `moonFromSun`, `readSky`)
duplicates the classic sun path for pages without a Sky; keep it in step if
Sky.updateDayNight's sun path ever changes. `labs/sky/js/night.js` and
`src/kit/sky/night.js` share their drawing code verbatim (keep in step).
