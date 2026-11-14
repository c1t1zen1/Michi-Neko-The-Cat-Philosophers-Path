# v-ground handoff

Family `src/kit/ground/` (lab 01, Ground, path & shoulders). Four ids, all promoted: `valley-ground`, `path`,
`path-shoulders`, `path-slabs`. No change to `countryside.js`; layouts and footprints untouched (no waiver).

## 1. Hot file: `src/main.js` — live wear (APPLIED IN-LANE under the pre-review grant, R47 pattern; commit below)

The valley ground's field wears where paws pass and thins the grass BiomeMask there (lawns never: lawn texels have
meadow 0 in the baked mask and are skipped). The kit instance cannot see the player or the grass (ctx and env do
not carry them), so main.js binds it once, right after `grassContext` is set (`Game.init`, after line
`this.vegetation.grassContext = { … };`):

```diff
     this.vegetation.grassContext = { renderer: this.renderer, camera: this.camera, player: this.player, npcs: this.npcs };
+    // v-ground: the kit valley ground (modular set only) wears where the cat and the
+    // villagers walk and thins the meadow there; the classic set has no such instance.
+    for (const inst of this.city.assetInstances || []) {
+      if (inst.id === 'valley-ground' && typeof inst.bindWorld === 'function') {
+        inst.bindWorld({ grass: this.vegetation.grass, player: this.player, npcs: this.npcs });
+      }
+    }
```

Applied verbatim in this branch (`src/main.js`, after the `grassContext` line; `labs/ASSET_COVERAGE.md`
regenerated with `node tools/labs_coverage.mjs --write` for the shifted line anchors). Unbound, the modular ground still renders, wets, puddles and snows; only paw wear is off. The patch
changes nothing on the classic set (no `valley-ground` instance exists) and nothing at build time (the systems
golden digests the mask as baked; the first write happens after a paw lands). Proof that the hook works: status
file, "Live wear".

## 2. Budget exception (granted in-lane, committed in `src/kit/budgets.js`)

`valley-ground` is the whole 260 m valley height field, not a prop. Committed entry:

```js
'valley-ground': {
  hero: { triangles: 45000 }, mid: { triangles: 45000, buildMs: 5 }, far: { triangles: 5000, buildMs: 4 },
  why: '… classic is 45,000 tris … modular keeps every classic vertex at hero/mid (45,000) and every third at far (5,000) …'
}
```

Measured: classic 45,000 tris (150 x 150 plane); modular 45,000 / 45,000 / 5,000. Warm builds 2-3 ms; first build in
the game ~390 ms (classic ground ~35-43 ms warm, plus the same `groundTextures(6)` both sets generate once).

## 3. Materials (ruling R52): one new kit material, net -2 draws — ACCEPTED at pre-review

- `kit-ground` (src/kit/ground/material.js `createGroundMaterial`): one private, unmerged MeshStandardMaterial
  with onBeforeCompile per ground surface. **Justification:** the ground is one height-blended splat over a
  field (eight layers, pavings, POM, puddles, snow); no shared kit material can draw it. **Draw cost:** with
  all three ids modular the valley ground, the road and the shoulders are ONE draw (the classic ground, cobble
  ribbon and transparent shoulder strip were three): net **-2 draws** at every spot where the road is in view,
  0 elsewhere. None of the three cast shadows (as classic), so no shadow draws change. Swapped alone, `path` /
  `path-shoulders` are one draw each, as classic. Measured (deterministic, frame 120 of `?shot=1`, the four
  perf-spot cameras, high and medium): **-2 draws and -302 triangles at every spot and tier** (e.g. street high
  418 → 416, medium 417 → 415). perf_spots: modular medium 11.4-13.8 ms ≤ classic high 15.0-17.6 ms.
- `path-slabs` uses `KIT_SHARED` `stone`, `basinStone`, `rock` (no new material).
- Live meshes: 0. Textures: two shared 256 px `DataArrayTexture`s (7 painted layers, painted once per kit set,
  `userData.kit`) and four field textures per ground surface (512² RGBA8 x3 + one half-float).

## 4. Inventory / catalog (labs/asset_inventory.json, catalog adapters)

Same shape as the v-pagoda handoff. For each row set `production`:

```json
"valley-ground":  { "family": "ground", "adapter": "valley-ground",  "status": "kit" }
"path":           { "family": "ground", "adapter": "path",           "status": "kit" }
"path-shoulders": { "family": "ground", "adapter": "path-shoulders", "status": "kit" }
"path-slabs":     { "family": "ground", "adapter": "path-slabs",     "status": "kit" }
```

Coverage rows stay as they are (`ground/height`, `ground/setts`, `ground/pom`, `ground/slabs`). Catalog note: a
production `path` / `path-shoulders` built alone (no valley ground in the kit set) builds its own ribbon on the
ground material, so the catalog shows it on its own.

## 5. Part names (public interface, new)

| id | parts | notes |
|---|---|---|
| `valley-ground` | `terrain` | group named `Village Ground` (bind `groundMesh: '.'` resolves to it) |
| `path` | `road` | an empty anchor when painted into the valley field; the ribbon mesh when standalone |
| `path-shoulders` | `shoulders` | as `path` |
| `path-slabs` | `stones_light`, `stones_dark`, `stones_warm` | one merged mesh per shared material; far: `stones_light` only |

Instance extras on `valley-ground`: `field` (GroundField), `material`, `surfaceAt(x, z)` → `{ mat, wear, wet, snow }`
(for footstep sounds: an audio lane may use it), `bindWorld({ grass, player, npcs })`.

## 6. Params (cadJS / AI, AAA-9)

- `valley-ground`: `hex_cell` 0.6–2.5 (1.25), `blend` 0.05–0.5 (0.2), `macro` 0–1.5 (1), `fringe` 0–1.5 (1),
  `regrow_minutes` 2–240 (30, `visual: false`).
- `path`: `paving` setts | slabs | nobedan | arare | uroko | araidashi (nobedan), `width` 3–4.6 (3.8), `moss` 0–0.5 (0.2).
- `path-shoulders`: `width` 5–8 (6.4), `wear` 0.3–1 (0.75), `gravel` 0–0.8 (0.35).
- `path-slabs`: `proud` 0.6–1.6 (1), `round` 0–1 (0.5), `irregular` 0–1 (0.5).

## 7. Helpers to move into shared kit code

None requested. `field.js`, `glsl.js`, `layers.js`, `material.js` are self-contained; a later lane that wants the
GroundField (v-water paddy bunds, v-weather wet ground, the summit) can import them from `src/kit/ground/` with the
cache tag.

## 8. Not promoted (deferred, with reason)

- Paw prints and rake/broom grooves (lab `marks.js`): GPU mark buffers need a renderer and a per-frame pass
  (`renderer.autoClear = false` while drawing them); ctx carries no renderer and the game has no rake. Field wear
  (25 cm texels) is the trace paws leave instead. If wanted later: expose the renderer to the instance in the
  same `bindWorld` call and port `marks.js` with `autoClear = false` around its passes.
- Eave dry rects / amaochi drip lines: the houses are built after the ground and the layout carries no eave list.
- Kemonomichi walkers, litter, karesansui raking: lab interactions, not valley systems.

## 9. Integrator chores

- `node tools/kit_index.mjs` (already committed here; regenerate at merge).
- `node tools/labs_coverage.mjs --write` is not needed (no change to main.js/countryside.js in this PR).
